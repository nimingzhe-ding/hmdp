package com.hmdp.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hmdp.dto.MerchantProductRequest;
import com.hmdp.dto.MerchantRequest;
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

    Result myProducts();

    Result myOrders();

    Result shipOrder(Long orderId);
}
