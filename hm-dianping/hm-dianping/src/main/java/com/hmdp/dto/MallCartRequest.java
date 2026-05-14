package com.hmdp.dto;

import lombok.Data;

/**
 * 加入购物车请求。
 */
@Data
public class MallCartRequest {
    private Long productId;
    private Integer quantity;
}
