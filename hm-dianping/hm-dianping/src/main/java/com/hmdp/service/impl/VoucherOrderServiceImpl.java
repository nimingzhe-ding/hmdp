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
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
@Slf4j
public class VoucherOrderServiceImpl extends ServiceImpl<VoucherOrderMapper, VoucherOrder> implements IVoucherOrderService {

    private static final int ORDER_QUEUE_CAPACITY = 1024 * 1024;

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

    private final BlockingQueue<VoucherOrder> orderTasks = new ArrayBlockingQueue<>(ORDER_QUEUE_CAPACITY);
    private final ExecutorService seckillOrderExecutor = Executors.newSingleThreadExecutor();

    @PostConstruct
    private void init() {
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
        Long result = stringRedisTemplate.execute(
                SECKILL_SCRIPT,
                Collections.emptyList(),
                voucherId.toString(),
                userId.toString()
        );
        if (result == null) {
            return Result.fail("秒杀服务繁忙，请稍后重试");
        }

        int code = result.intValue();
        if (code != 0) {
            return Result.fail(code == 1 ? "库存不足" : "不能重复下单");
        }

        long orderId = redisIdWorker.nextId("order");
        VoucherOrder voucherOrder = new VoucherOrder();
        voucherOrder.setId(orderId);
        voucherOrder.setUserId(userId);
        voucherOrder.setVoucherId(voucherId);

        boolean queued = orderTasks.offer(voucherOrder);
        if (!queued) {
            rollbackSeckill(voucherId, userId);
            return Result.fail("系统繁忙，请稍后重试");
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

    private class VoucherOrderHandler implements Runnable {
        @Override
        public void run() {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    VoucherOrder voucherOrder = orderTasks.take();
                    handleVoucherOrder(voucherOrder);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    log.error("处理订单异常", e);
                }
            }
        }
    }
}
