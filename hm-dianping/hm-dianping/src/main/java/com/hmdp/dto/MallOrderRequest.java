package com.hmdp.dto;

import lombok.Data;

/**
 * 商城下单请求。
 * 第一版支持直接购买商品，也支持传购物车条目生成订单。
 */
@Data
public class MallOrderRequest {
    private Long productId;
    private Long cartItemId;
    private Long voucherId;
    private Integer quantity;
}
