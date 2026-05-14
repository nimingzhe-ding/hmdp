package com.hmdp.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hmdp.dto.MallOrderRequest;
import com.hmdp.dto.Result;
import com.hmdp.entity.MallOrder;

/**
 * 商城订单服务。
 */
public interface IMallOrderService extends IService<MallOrder> {
    Result createOrder(MallOrderRequest request);

    Result listMine();

    Result payOrder(Long orderId);
}
