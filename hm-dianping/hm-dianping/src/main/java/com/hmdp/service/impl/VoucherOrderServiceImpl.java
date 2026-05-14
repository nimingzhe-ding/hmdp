package com.hmdp.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.SeckillVoucher;
import com.hmdp.entity.VoucherOrder;
import com.hmdp.mapper.VoucherOrderMapper;
import com.hmdp.service.ISeckillVoucherService;
import com.hmdp.service.IVoucherOrderService;
import com.hmdp.utils.RedisIdWorker;
import com.hmdp.utils.UserHolder;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.time.Duration;

@Service
@Slf4j
public class VoucherOrderServiceImpl extends ServiceImpl<VoucherOrderMapper, VoucherOrder> implements IVoucherOrderService {

    /**
     * 秒杀订单消息流。
     * Lua 脚本扣减 Redis 预库存成功后直接 XADD 到该 Stream，避免 JVM 内存队列宕机丢单。
     */
    private static final String ORDER_STREAM_KEY = "stream.orders";

    /**
     * 订单消费者组。
     * 消费成功后 ACK；异常未 ACK 的消息会留在 pending-list，后台线程会继续补偿处理。
     */
    private static final String ORDER_GROUP = "g1";
    private static final String ORDER_CONSUMER = "c1";

    private static final DefaultRedisScript<Long> SECKILL_SCRIPT;
    private static final DefaultRedisScript<Long> ROLLBACK_SECKILL_SCRIPT;

    static {
        SECKILL_SCRIPT = new DefaultRedisScript<>();
        SECKILL_SCRIPT.setLocation(new ClassPathResource("seckill.lua"));
        SECKILL_SCRIPT.setResultType(Long.class);

        ROLLBACK_SECKILL_SCRIPT = new DefaultRedisScript<>();
        ROLLBACK_SECKILL_SCRIPT.setLocation(new ClassPathResource("rollback-seckill.lua"));
        ROLLBACK_SECKILL_SCRIPT.setResultType(Long.class);
    }

    @Resource
    private ISeckillVoucherService seckillVoucherService;
    @Resource
    private RedisIdWorker redisIdWorker;
    @Resource
    private StringRedisTemplate stringRedisTemplate;
    @Resource
    private RedissonClient redissonClient;
    @Resource
    private TransactionTemplate transactionTemplate;

    private final ExecutorService seckillOrderExecutor = Executors.newSingleThreadExecutor();

    @PostConstruct
    private void init() {
        initOrderStreamGroup();
        seckillOrderExecutor.submit(new VoucherOrderHandler());
    }

    @PreDestroy
    private void destroy() {
        seckillOrderExecutor.shutdownNow();
    }

    @Override
    public Result seckillVoucher(Long voucherId) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        if (voucherId == null) {
            return Result.fail("优惠券ID不能为空");
        }

        SeckillVoucher voucher = seckillVoucherService.getById(voucherId);
        if (voucher == null) {
            return Result.fail("秒杀券不存在");
        }
        LocalDateTime now = LocalDateTime.now();
        if (voucher.getBeginTime() != null && voucher.getBeginTime().isAfter(now)) {
            return Result.fail("秒杀尚未开始");
        }
        if (voucher.getEndTime() != null && voucher.getEndTime().isBefore(now)) {
            return Result.fail("秒杀已经结束");
        }

        Long userId = user.getId();
        long orderId = redisIdWorker.nextId("order");
        Long result = stringRedisTemplate.execute(
                SECKILL_SCRIPT,
                Collections.emptyList(),
                voucherId.toString(),
                userId.toString(),
                String.valueOf(orderId)
        );
        if (result == null) {
            return Result.fail("秒杀服务繁忙，请稍后重试");
        }

        int code = result.intValue();
        if (code != 0) {
            return Result.fail(code == 1 ? "库存不足" : "不能重复下单");
        }

        return Result.ok(orderId);
    }

    @Override
    @Transactional
    public boolean createVoucherOrder(VoucherOrder voucherOrder) {
        Long userId = voucherOrder.getUserId();
        Long voucherId = voucherOrder.getVoucherId();

        long count = query().eq("user_id", userId).eq("voucher_id", voucherId).count();
        if (count > 0) {
            log.warn("用户重复下单, userId={}, voucherId={}", userId, voucherId);
            return false;
        }

        boolean stockUpdated = seckillVoucherService.update()
                .setSql("stock = stock - 1")
                .eq("voucher_id", voucherId)
                .gt("stock", 0)
                .update();
        if (!stockUpdated) {
            log.warn("库存扣减失败, userId={}, voucherId={}", userId, voucherId);
            return false;
        }

        try {
            return save(voucherOrder);
        } catch (DuplicateKeyException e) {
            log.warn("订单唯一约束冲突, userId={}, voucherId={}", userId, voucherId);
            throw e;
        }
    }

    private void handleVoucherOrder(VoucherOrder voucherOrder) {
        Long userId = voucherOrder.getUserId();
        RLock lock = redissonClient.getLock("lock:order:" + userId);
        boolean locked = lock.tryLock();
        if (!locked) {
            log.warn("用户重复下单, userId={}, voucherId={}", userId, voucherOrder.getVoucherId());
            rollbackSeckill(voucherOrder.getVoucherId(), userId);
            return;
        }

        try {
            Boolean created = transactionTemplate.execute(status -> createVoucherOrder(voucherOrder));
            if (!Boolean.TRUE.equals(created)) {
                rollbackSeckill(voucherOrder.getVoucherId(), userId);
            }
        } catch (Exception e) {
            rollbackSeckill(voucherOrder.getVoucherId(), userId);
            log.error("处理秒杀订单异常, orderId={}, userId={}, voucherId={}",
                    voucherOrder.getId(), userId, voucherOrder.getVoucherId(), e);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    private void rollbackSeckill(Long voucherId, Long userId) {
        try {
            stringRedisTemplate.execute(
                    ROLLBACK_SECKILL_SCRIPT,
                    Collections.emptyList(),
                    voucherId.toString(),
                    userId.toString()
            );
        } catch (Exception e) {
            log.error("回滚秒杀 Redis 状态失败, voucherId={}, userId={}", voucherId, userId, e);
        }
    }

    private void initOrderStreamGroup() {
        try {
            Boolean exists = stringRedisTemplate.hasKey(ORDER_STREAM_KEY);
            if (!Boolean.TRUE.equals(exists)) {
                // Redis Stream 必须先有 key 才能创建消费者组，这条 init 消息不会进入业务订单处理。
                stringRedisTemplate.opsForStream().add(ORDER_STREAM_KEY, Map.of("init", "1"));
            }
            stringRedisTemplate.opsForStream().createGroup(ORDER_STREAM_KEY, ReadOffset.latest(), ORDER_GROUP);
        } catch (RedisSystemException e) {
            if (e.getMessage() == null || !e.getMessage().contains("BUSYGROUP")) {
                throw e;
            }
        }
    }

    private VoucherOrder toVoucherOrder(MapRecord<String, Object, Object> record) {
        Map<Object, Object> values = record.getValue();
        VoucherOrder order = new VoucherOrder();
        order.setId(Long.valueOf(String.valueOf(values.get("orderId"))));
        order.setUserId(Long.valueOf(String.valueOf(values.get("userId"))));
        order.setVoucherId(Long.valueOf(String.valueOf(values.get("voucherId"))));
        return order;
    }

    private void ackOrder(MapRecord<String, Object, Object> record) {
        stringRedisTemplate.opsForStream().acknowledge(ORDER_STREAM_KEY, ORDER_GROUP, record.getId());
    }

    private class VoucherOrderHandler implements Runnable {
        @Override
        public void run() {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    List<MapRecord<String, Object, Object>> records = stringRedisTemplate.opsForStream().read(
                            Consumer.from(ORDER_GROUP, ORDER_CONSUMER),
                            StreamReadOptions.empty().count(1).block(Duration.ofSeconds(2)),
                            StreamOffset.create(ORDER_STREAM_KEY, ReadOffset.lastConsumed())
                    );
                    if (records == null || records.isEmpty()) {
                        handlePendingOrders();
                        continue;
                    }
                    for (MapRecord<String, Object, Object> record : records) {
                        handleVoucherOrder(toVoucherOrder(record));
                        ackOrder(record);
                    }
                } catch (Exception e) {
                    log.error("处理 Stream 订单异常，准备处理 pending-list", e);
                    handlePendingOrders();
                }
            }
        }

        private void handlePendingOrders() {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    List<MapRecord<String, Object, Object>> records = stringRedisTemplate.opsForStream().read(
                            Consumer.from(ORDER_GROUP, ORDER_CONSUMER),
                            StreamReadOptions.empty().count(1),
                            StreamOffset.create(ORDER_STREAM_KEY, ReadOffset.from("0"))
                    );
                    if (records == null || records.isEmpty()) {
                        break;
                    }
                    for (MapRecord<String, Object, Object> record : records) {
                        handleVoucherOrder(toVoucherOrder(record));
                        ackOrder(record);
                    }
                } catch (Exception e) {
                    log.error("处理 pending-list 订单异常，稍后重试", e);
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException interruptedException) {
                        Thread.currentThread().interrupt();
                    }
                    break;
                }
            }
        }
    }
}
