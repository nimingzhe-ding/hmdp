package com.hmdp.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hmdp.dto.MerchantProductRequest;
import com.hmdp.dto.MerchantRequest;
import com.hmdp.dto.MerchantVoucherRequest;
import com.hmdp.dto.Result;
import com.hmdp.entity.Merchant;

/**
 * 商家中心服务。
 */
public interface IMerchantService extends IService<Merchant> {
    Result mine();

    Result apply(MerchantRequest request);

    Result saveProduct(MerchantProductRequest request);

    Result updateProduct(Long productId, MerchantProductRequest request);

    Result updateProductStatus(Long productId, Integer status);

    Result adjustStock(Long productId, Integer delta);

    Result myProducts(Integer status);

    Result myOrders(Integer status);

    Result shipOrder(Long orderId);

    Result handleRefund(Long orderId, boolean approve);

    Result createVoucher(MerchantVoucherRequest request);

    Result updateVoucher(Long voucherId, MerchantVoucherRequest request);

    Result updateVoucherStatus(Long voucherId, Integer status);

    Result myVouchers(Integer status);

    Result notifications(Integer readFlag);

    Result markNotificationsRead();

    Result dashboard();
}
