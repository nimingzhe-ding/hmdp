package com.hmdp.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hmdp.dto.Result;
import com.hmdp.entity.MallProduct;

/**
 * 商城商品服务。
 */
public interface IMallProductService extends IService<MallProduct> {
    Result pageProducts(String category, String query, Integer current);

    Result detail(Long id);
}
