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

    Result listMine(Integer status);

    Result payOrder(Long orderId);

    Result shipOrder(Long orderId);

    Result receiveOrder(Long orderId);

    Result cancelOrder(Long orderId);

    Result refundOrder(Long orderId);
}
