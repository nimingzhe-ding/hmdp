package com.hmdp.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hmdp.dto.MallCartRequest;
import com.hmdp.dto.Result;
import com.hmdp.entity.MallCartItem;

/**
 * 商城购物车服务。
 */
public interface IMallCartService extends IService<MallCartItem> {
    Result add(MallCartRequest request);

    Result listMine();

    Result removeItem(Long id);
}
