package com.hmdp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.dto.MallOrderRequest;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.MallCartItem;
import com.hmdp.entity.MallOrder;
import com.hmdp.entity.MallProduct;
import com.hmdp.entity.MerchantNotification;
import com.hmdp.entity.Voucher;
import com.hmdp.mapper.MallOrderMapper;
import com.hmdp.mapper.MerchantNotificationMapper;
import com.hmdp.service.IMallCartService;
import com.hmdp.service.IMallOrderService;
import com.hmdp.service.IMallProductService;
import com.hmdp.service.IUserNotificationService;
import com.hmdp.service.IVoucherService;
import com.hmdp.utils.RedisIdWorker;
import com.hmdp.utils.UserHolder;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 商城订单服务实现。
 */
@Slf4j
@Service
public class MallOrderServiceImpl extends ServiceImpl<MallOrderMapper, MallOrder> implements IMallOrderService {

    public static final int STATUS_PENDING_PAY = 1;
    public static final int STATUS_PAID = 2;
    public static final int STATUS_PENDING_SHIP = 3;
    public static final int STATUS_SHIPPED = 4;
    public static final int STATUS_COMPLETED = 5;
    public static final int STATUS_CANCELLED = 6;
    public static final int STATUS_REFUNDING = 7;

    @Resource
    private IMallProductService productService;
    @Resource
    private IMallCartService cartService;
    @Resource
    private RedisIdWorker redisIdWorker;
    @Resource
    private IVoucherService voucherService;
    @Resource
    private MerchantNotificationMapper notificationMapper;
    @Resource
    private IUserNotificationService userNotificationService;

    @Override
    @Transactional
    public Result createOrder(MallOrderRequest request) {
        UserDTO user = UserHolder.getUser();
        if (user == null) return Result.fail("请先登录");
        if (request == null) return Result.fail("下单参数不能为空");

        MallCartItem cartItem = null;
        Long productId = request.getProductId();
        int quantity = request.getQuantity() == null || request.getQuantity() < 1 ? 1 : request.getQuantity();
        if (request.getCartItemId() != null) {
            cartItem = cartService.getById(request.getCartItemId());
            if (cartItem == null || !user.getId().equals(cartItem.getUserId())) {
                return Result.fail("购物车商品不存在");
            }
            productId = cartItem.getProductId();
            quantity = cartItem.getQuantity();
        }
        if (productId == null) return Result.fail("商品ID不能为空");

        MallProduct product = productService.getById(productId);
        if (product == null || product.getStatus() == null || product.getStatus() != 1) {
            return Result.fail("商品不存在或已下架");
        }
        if (product.getStock() == null || product.getStock() < quantity) {
            return Result.fail("库存不足");
        }

        long originalAmount = (product.getPrice() == null ? 0L : product.getPrice()) * quantity;
        Voucher voucher = resolveVoucher(request.getVoucherId(), product, originalAmount);
        long discountAmount = voucher == null ? 0L : Math.min(voucher.getActualValue(), originalAmount);
        LocalDateTime now = LocalDateTime.now();

        MallOrder order = new MallOrder();
        order.setId(redisIdWorker.nextId("mall_order"));
        order.setUserId(user.getId());
        order.setMerchantId(product.getMerchantId());
        order.setProductId(productId);
        order.setVoucherId(voucher == null ? null : voucher.getId());
        order.setProductTitle(product.getTitle());
        order.setProductImage(firstImage(product.getImages()));
        order.setPrice(product.getPrice());
        order.setQuantity(quantity);
        order.setDiscountAmount(discountAmount);
        order.setTotalAmount(Math.max(0, originalAmount - discountAmount));
        order.setStatus(STATUS_PENDING_PAY);
        order.setCreateTime(now);
        order.setUpdateTime(now);
        save(order);

        userNotificationService.notifyUser(user.getId(), null, "ORDER_CREATED", "订单已创建",
                "你购买的「" + order.getProductTitle() + "」已生成订单，等待支付。", null, order.getId());
        notifyMerchant(order.getMerchantId(), "order_created", order);
        if (cartItem != null) {
            cartService.removeById(cartItem.getId());
        }
        return Result.ok(order);
    }

    @Override
    public Result listMine(Integer status) {
        UserDTO user = UserHolder.getUser();
        if (user == null) return Result.fail("请先登录");
        LambdaQueryWrapper<MallOrder> wrapper = new LambdaQueryWrapper<MallOrder>()
                .eq(MallOrder::getUserId, user.getId())
                .orderByDesc(MallOrder::getCreateTime);
        if (status != null) {
            wrapper.eq(MallOrder::getStatus, status);
        }
        return Result.ok(list(wrapper));
    }

    @Override
    @Transactional
    public Result payOrder(Long orderId) {
        UserDTO user = UserHolder.getUser();
        if (user == null) return Result.fail("请先登录");
        MallOrder order = getOrderAndCheckOwner(orderId, user.getId());
        if (order == null) return Result.fail("订单不存在");

        boolean stockUpdated = productService.update()
                .setSql("stock = stock - " + order.getQuantity())
                .setSql("sold = IFNULL(sold, 0) + " + order.getQuantity())
                .eq("id", order.getProductId())
                .ge("stock", order.getQuantity())
                .update();
        if (!stockUpdated) return Result.fail("库存不足，支付失败");

        LocalDateTime now = LocalDateTime.now();
        boolean updated = update()
                .set("status", STATUS_PAID)
                .set("pay_time", now)
                .set("update_time", now)
                .eq("id", orderId)
                .eq("user_id", user.getId())
                .eq("status", STATUS_PENDING_PAY)
                .update();
        if (!updated) {
            productService.update()
                    .setSql("stock = stock + " + order.getQuantity())
                    .setSql("sold = GREATEST(IFNULL(sold, 0) - " + order.getQuantity() + ", 0)")
                    .eq("id", order.getProductId())
                    .update();
            return Result.fail("当前订单状态不能支付");
        }
        notifyMerchant(order.getMerchantId(), "order_paid", order);
        userNotificationService.notifyUser(order.getUserId(), null, "ORDER_PAID", "订单已支付",
                "你购买的「" + order.getProductTitle() + "」已支付成功，等待商家发货。", null, order.getId());
        return Result.ok(loadOrder(orderId));
    }

    @Override
    public Result shipOrder(Long orderId) {
        UserDTO user = UserHolder.getUser();
        if (user == null) return Result.fail("请先登录");
        MallOrder order = getById(orderId);
        if (order == null) return Result.fail("订单不存在");

        LocalDateTime now = LocalDateTime.now();
        boolean updated = update()
                .set("status", STATUS_SHIPPED)
                .set("ship_time", now)
                .set("update_time", now)
                .eq("id", orderId)
                .eq("status", STATUS_PENDING_SHIP)
                .update();
        if (!updated) return Result.fail("当前订单状态不能发货");
        userNotificationService.notifyUser(order.getUserId(), null, "ORDER_SHIPPED", "商家已发货",
                "你购买的「" + order.getProductTitle() + "」已发货。", null, order.getId());
        return Result.ok(loadOrder(orderId));
    }

    @Override
    public Result receiveOrder(Long orderId) {
        UserDTO user = UserHolder.getUser();
        if (user == null) return Result.fail("请先登录");

        LocalDateTime now = LocalDateTime.now();
        boolean updated = update()
                .set("status", STATUS_COMPLETED)
                .set("receive_time", now)
                .set("update_time", now)
                .eq("id", orderId)
                .eq("user_id", user.getId())
                .eq("status", STATUS_SHIPPED)
                .update();
        if (!updated) return Result.fail("当前订单状态不能确认收货");

        MallOrder order = loadOrder(orderId);
        userNotificationService.notifyUser(user.getId(), null, "ORDER_COMPLETED", "订单已完成",
                "订单「" + (order == null ? orderId : order.getProductTitle()) + "」已完成。", null, orderId);
        return Result.ok(order);
    }

    @Override
    public Result cancelOrder(Long orderId) {
        UserDTO user = UserHolder.getUser();
        if (user == null) return Result.fail("请先登录");
        MallOrder order = getOrderAndCheckOwner(orderId, user.getId());
        if (order == null) return Result.fail("订单不存在");
        if (order.getStatus() != STATUS_PENDING_PAY) {
            return Result.fail("只有待支付的订单才能取消");
        }

        LocalDateTime now = LocalDateTime.now();
        boolean updated = update()
                .set("status", STATUS_CANCELLED)
                .set("cancel_time", now)
                .set("update_time", now)
                .eq("id", orderId)
                .eq("user_id", user.getId())
                .eq("status", STATUS_PENDING_PAY)
                .update();
        if (!updated) return Result.fail("取消订单失败");
        userNotificationService.notifyUser(user.getId(), null, "ORDER_CANCELLED", "订单已取消",
                "你购买的「" + order.getProductTitle() + "」订单已取消。", null, orderId);
        return Result.ok(loadOrder(orderId));
    }

    @Override
    public Result refundOrder(Long orderId) {
        UserDTO user = UserHolder.getUser();
        if (user == null) return Result.fail("请先登录");
        MallOrder order = getOrderAndCheckOwner(orderId, user.getId());
        if (order == null) return Result.fail("订单不存在");
        if (order.getStatus() != STATUS_PAID && order.getStatus() != STATUS_PENDING_SHIP) {
            return Result.fail("当前订单状态不能申请退款");
        }

        LocalDateTime now = LocalDateTime.now();
        boolean updated = update()
                .set("status", STATUS_REFUNDING)
                .set("update_time", now)
                .eq("id", orderId)
                .eq("user_id", user.getId())
                .in("status", STATUS_PAID, STATUS_PENDING_SHIP)
                .update();
        if (!updated) return Result.fail("申请退款失败");
        userNotificationService.notifyUser(user.getId(), null, "ORDER_REFUNDING", "退款申请已提交",
                "你购买的「" + order.getProductTitle() + "」已提交退款申请。", null, orderId);
        return Result.ok(loadOrder(orderId));
    }

    private MallOrder getOrderAndCheckOwner(Long orderId, Long userId) {
        MallOrder order = getById(orderId);
        if (order == null || !userId.equals(order.getUserId())) {
            return null;
        }
        return order;
    }

    private MallOrder loadOrder(Long orderId) {
        return getById(orderId);
    }

    private Voucher resolveVoucher(Long voucherId, MallProduct product, long originalAmount) {
        if (voucherId == null) return null;
        Voucher voucher = voucherService.getById(voucherId);
        if (voucher == null || voucher.getStatus() == null || voucher.getStatus() != 1) {
            throw new IllegalArgumentException("优惠券不可用");
        }
        if (voucher.getMerchantId() == null || !voucher.getMerchantId().equals(product.getMerchantId())) {
            throw new IllegalArgumentException("优惠券不属于该商家");
        }
        if (voucher.getProductId() != null && !voucher.getProductId().equals(product.getId())) {
            throw new IllegalArgumentException("优惠券不适用于该商品");
        }
        if (voucher.getPayValue() != null && originalAmount < voucher.getPayValue()) {
            throw new IllegalArgumentException("订单金额未达到优惠券门槛");
        }
        if (voucher.getActualValue() == null || voucher.getActualValue() <= 0) {
            throw new IllegalArgumentException("优惠券金额异常");
        }
        return voucher;
    }

    private String firstImage(String images) {
        if (images == null || images.isBlank()) {
            return "";
        }
        return images.split(",")[0].trim();
    }

    private void notifyMerchant(Long merchantId, String type, MallOrder order) {
        if (merchantId == null) return;
        try {
            MerchantNotification notification = new MerchantNotification();
            notification.setMerchantId(merchantId);
            notification.setType(type);
            notification.setOrderId(order.getId());
            notification.setPayload("{\"orderId\":" + order.getId()
                    + ",\"productTitle\":\"" + order.getProductTitle()
                    + "\",\"quantity\":" + order.getQuantity()
                    + ",\"totalAmount\":" + order.getTotalAmount() + "}");
            notification.setReadFlag(false);
            notification.setCreateTime(LocalDateTime.now());
            notificationMapper.insert(notification);
        } catch (Exception e) {
            log.error("通知商家失败, merchantId={}, orderId={}", merchantId, order.getId(), e);
        }
    }
}
