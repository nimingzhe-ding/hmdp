package com.hmdp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.dto.MerchantProductRequest;
import com.hmdp.dto.MerchantRequest;
import com.hmdp.dto.MerchantVoucherRequest;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.MallOrder;
import com.hmdp.entity.MallProduct;
import com.hmdp.entity.Merchant;
import com.hmdp.entity.Voucher;
import com.hmdp.mapper.MerchantMapper;
import com.hmdp.service.IMallOrderService;
import com.hmdp.service.IMallProductService;
import com.hmdp.service.IMerchantService;
import com.hmdp.service.IVoucherService;
import com.hmdp.utils.UserHolder;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

/**
 * 商家中心第一版实现。
 * 目标是先打通“申请开店-发布商品-处理订单”的最小平台闭环。
 */
@Service
public class MerchantServiceImpl extends ServiceImpl<MerchantMapper, Merchant> implements IMerchantService {

    @Resource
    private IMallProductService productService;

    @Resource
    private IMallOrderService orderService;

    @Resource
    private IVoucherService voucherService;

    @Override
    public Result mine() {
        Merchant merchant = currentMerchant();
        return Result.ok(merchant);
    }

    @Override
    public Result apply(MerchantRequest request) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        if (request == null || StrUtil.isBlank(request.getName())) {
            return Result.fail("店铺名称不能为空");
        }
        Merchant merchant = query().eq("user_id", user.getId()).one();
        if (merchant == null) {
            merchant = new Merchant()
                    .setUserId(user.getId())
                    .setStatus(1)
                    .setAuditStatus(2);
        }
        fillMerchant(merchant, request);
        saveOrUpdate(merchant);
        return Result.ok(merchant);
    }

    @Override
    public Result saveProduct(MerchantProductRequest request) {
        Merchant merchant = currentMerchant();
        if (merchant == null) {
            return Result.fail("请先开通商家中心");
        }
        Result check = checkProduct(request);
        if (!Boolean.TRUE.equals(check.getSuccess())) {
            return check;
        }
        MallProduct product = new MallProduct()
                .setMerchantId(merchant.getId())
                .setTitle(request.getTitle())
                .setSubTitle(request.getSubTitle())
                .setImages(request.getImages())
                .setPrice(request.getPrice())
                .setOriginPrice(request.getOriginPrice())
                .setStock(request.getStock())
                .setSold(0)
                .setCategory(StrUtil.blankToDefault(request.getCategory(), "all"))
                .setStatus(request.getStatus() == null ? 1 : request.getStatus());
        productService.save(product);
        return Result.ok(product);
    }

    @Override
    public Result updateProduct(Long productId, MerchantProductRequest request) {
        Merchant merchant = currentMerchant();
        if (merchant == null) {
            return Result.fail("请先开通商家中心");
        }
        MallProduct product = productService.getById(productId);
        if (product == null || !merchant.getId().equals(product.getMerchantId())) {
            return Result.fail("商品不存在");
        }
        if (request == null) {
            return Result.fail("商品参数不能为空");
        }
        if (StrUtil.isNotBlank(request.getTitle())) product.setTitle(request.getTitle());
        if (request.getSubTitle() != null) product.setSubTitle(request.getSubTitle());
        if (request.getImages() != null) product.setImages(request.getImages());
        if (request.getPrice() != null && request.getPrice() > 0) product.setPrice(request.getPrice());
        if (request.getOriginPrice() != null) product.setOriginPrice(request.getOriginPrice());
        if (request.getStock() != null && request.getStock() >= 0) product.setStock(request.getStock());
        if (StrUtil.isNotBlank(request.getCategory())) product.setCategory(request.getCategory());
        if (request.getStatus() != null) product.setStatus(request.getStatus());
        productService.updateById(product);
        return Result.ok(product);
    }

    @Override
    public Result myProducts() {
        Merchant merchant = currentMerchant();
        if (merchant == null) {
            return Result.fail("请先开通商家中心");
        }
        return Result.ok(productService.query()
                .eq("merchant_id", merchant.getId())
                .orderByDesc("create_time")
                .list());
    }

    @Override
    public Result myOrders() {
        Merchant merchant = currentMerchant();
        if (merchant == null) {
            return Result.fail("请先开通商家中心");
        }
        return Result.ok(orderService.query()
                .eq("merchant_id", merchant.getId())
                .orderByDesc("create_time")
                .list());
    }

    @Override
    public Result shipOrder(Long orderId) {
        Merchant merchant = currentMerchant();
        if (merchant == null) {
            return Result.fail("请先开通商家中心");
        }
        MallOrder order = orderService.getById(orderId);
        if (order == null || !merchant.getId().equals(order.getMerchantId())) {
            return Result.fail("订单不存在");
        }
        boolean updated = orderService.update()
                .set("status", 3)
                .eq("id", orderId)
                .eq("merchant_id", merchant.getId())
                .in("status", 2, 3)
                .update();
        if (!updated) {
            return Result.fail("当前订单还不能发货");
        }
        order.setStatus(3);
        return Result.ok(order);
    }

    @Override
    public Result createVoucher(MerchantVoucherRequest request) {
        Merchant merchant = currentMerchant();
        if (merchant == null) {
            return Result.fail("请先开通商家中心");
        }
        if (request == null || StrUtil.isBlank(request.getTitle())) {
            return Result.fail("优惠券标题不能为空");
        }
        if (request.getPayValue() == null || request.getPayValue() < 0
                || request.getActualValue() == null || request.getActualValue() <= 0) {
            return Result.fail("优惠金额不正确");
        }
        if (request.getProductId() != null) {
            MallProduct product = productService.getById(request.getProductId());
            if (product == null || !merchant.getId().equals(product.getMerchantId())) {
                return Result.fail("只能给自己的商品发券");
            }
        }
        Voucher voucher = new Voucher()
                .setMerchantId(merchant.getId())
                .setProductId(request.getProductId())
                .setTitle(request.getTitle())
                .setSubTitle(request.getSubTitle())
                .setRules(request.getRules())
                .setPayValue(request.getPayValue())
                .setActualValue(request.getActualValue())
                .setType(0)
                .setStatus(1);
        voucherService.save(voucher);
        return Result.ok(voucher);
    }

    private Result checkProduct(MerchantProductRequest request) {
        if (request == null) {
            return Result.fail("商品参数不能为空");
        }
        if (StrUtil.isBlank(request.getTitle())) {
            return Result.fail("商品标题不能为空");
        }
        if (request.getPrice() == null || request.getPrice() <= 0) {
            return Result.fail("商品价格必须大于0");
        }
        if (request.getStock() == null || request.getStock() < 0) {
            return Result.fail("库存不能小于0");
        }
        return Result.ok();
    }

    private Merchant currentMerchant() {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return null;
        }
        return query().eq("user_id", user.getId()).one();
    }

    private void fillMerchant(Merchant merchant, MerchantRequest request) {
        merchant.setName(request.getName());
        merchant.setAvatar(request.getAvatar());
        merchant.setDescription(request.getDescription());
        merchant.setPhone(request.getPhone());
        merchant.setAddress(request.getAddress());
    }
}
