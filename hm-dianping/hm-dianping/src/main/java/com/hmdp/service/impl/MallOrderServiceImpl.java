package com.hmdp.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.dto.MallOrderRequest;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.MallCartItem;
import com.hmdp.entity.MallOrder;
import com.hmdp.entity.MallProduct;
import com.hmdp.mapper.MallOrderMapper;
import com.hmdp.service.IMallCartService;
import com.hmdp.service.IMallOrderService;
import com.hmdp.service.IMallProductService;
import com.hmdp.utils.RedisIdWorker;
import com.hmdp.utils.UserHolder;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 商城订单服务实现。
 */
@Service
public class MallOrderServiceImpl extends ServiceImpl<MallOrderMapper, MallOrder> implements IMallOrderService {

    @Resource
    private IMallProductService productService;

    @Resource
    private IMallCartService cartService;

    @Resource
    private RedisIdWorker redisIdWorker;

    @Override
    @Transactional
    public Result createOrder(MallOrderRequest request) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        if (request == null) {
            return Result.fail("下单参数不能为空");
        }
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
        if (productId == null) {
            return Result.fail("商品ID不能为空");
        }
        MallProduct product = productService.getById(productId);
        if (product == null || product.getStatus() == null || product.getStatus() != 1) {
            return Result.fail("商品不存在或已下架");
        }
        boolean stockUpdated = productService.update()
                .setSql("stock = stock - " + quantity)
                .setSql("sold = IFNULL(sold, 0) + " + quantity)
                .eq("id", productId)
                .ge("stock", quantity)
                .update();
        if (!stockUpdated) {
            return Result.fail("库存不足");
        }
        MallOrder order = new MallOrder();
        order.setId(redisIdWorker.nextId("mall_order"));
        order.setUserId(user.getId());
        order.setProductId(productId);
        order.setProductTitle(product.getTitle());
        order.setProductImage(firstImage(product.getImages()));
        order.setPrice(product.getPrice());
        order.setQuantity(quantity);
        order.setTotalAmount((product.getPrice() == null ? 0L : product.getPrice()) * quantity);
        order.setStatus(1);
        save(order);
        if (cartItem != null) {
            cartService.removeById(cartItem.getId());
        }
        return Result.ok(order);
    }

    @Override
    public Result listMine() {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        return Result.ok(query().eq("user_id", user.getId()).orderByDesc("create_time").list());
    }

    private String firstImage(String images) {
        if (images == null || images.isBlank()) {
            return "";
        }
        return images.split(",")[0].trim();
    }
}
