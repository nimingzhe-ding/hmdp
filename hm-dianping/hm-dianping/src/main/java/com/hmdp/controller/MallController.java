package com.hmdp.controller;

import com.hmdp.dto.MallCartRequest;
import com.hmdp.dto.MallOrderRequest;
import com.hmdp.dto.Result;
import com.hmdp.service.IMallCartService;
import com.hmdp.service.IMallOrderService;
import com.hmdp.service.IMallProductService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 商城统一接口。
 * 第一版提供商品流、商品详情、购物车和下单能力，用于把原本的店铺交易扩展成电商购物。
 */
@RestController
@RequestMapping("/mall")
public class MallController {

    @Resource
    private IMallProductService productService;

    @Resource
    private IMallCartService cartService;

    @Resource
    private IMallOrderService orderService;

    @GetMapping("/products")
    public Result products(
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return productService.pageProducts(category, query, current);
    }

    @GetMapping("/products/{id}")
    public Result detail(@PathVariable("id") Long id) {
        return productService.detail(id);
    }

    @PostMapping("/cart")
    public Result addCart(@RequestBody MallCartRequest request) {
        return cartService.add(request);
    }

    @GetMapping("/cart")
    public Result cart() {
        return cartService.listMine();
    }

    @DeleteMapping("/cart/{id}")
    public Result removeCartItem(@PathVariable("id") Long id) {
        return cartService.removeItem(id);
    }

    @PostMapping("/orders")
    public Result createOrder(@RequestBody MallOrderRequest request) {
        return orderService.createOrder(request);
    }

    @PostMapping("/orders/{id}/pay")
    public Result payOrder(@PathVariable("id") Long id) {
        return orderService.payOrder(id);
    }

    @GetMapping("/orders")
    public Result orders() {
        return orderService.listMine();
    }
}
