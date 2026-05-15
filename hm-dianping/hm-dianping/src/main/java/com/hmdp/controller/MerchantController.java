package com.hmdp.controller;

import com.hmdp.dto.MerchantProductRequest;
import com.hmdp.dto.MerchantRequest;
import com.hmdp.dto.MerchantVoucherRequest;
import com.hmdp.dto.Result;
import com.hmdp.service.IMerchantService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 商家中心接口。
 * 用于承载商家入驻、商品管理和商家订单处理。
 */
@RestController
@RequestMapping("/merchant")
public class MerchantController {

    @Resource
    private IMerchantService merchantService;

    @GetMapping("/mine")
    public Result mine() {
        return merchantService.mine();
    }

    @PostMapping("/apply")
    public Result apply(@RequestBody MerchantRequest request) {
        return merchantService.apply(request);
    }

    @GetMapping("/products")
    public Result products() {
        return merchantService.myProducts();
    }

    @PostMapping("/products")
    public Result saveProduct(@RequestBody MerchantProductRequest request) {
        return merchantService.saveProduct(request);
    }

    @PutMapping("/products/{id}")
    public Result updateProduct(@PathVariable("id") Long id, @RequestBody MerchantProductRequest request) {
        return merchantService.updateProduct(id, request);
    }

    @GetMapping("/orders")
    public Result orders() {
        return merchantService.myOrders();
    }

    @PostMapping("/orders/{id}/ship")
    public Result ship(@PathVariable("id") Long id) {
        return merchantService.shipOrder(id);
    }

    @PostMapping("/vouchers")
    public Result createVoucher(@RequestBody MerchantVoucherRequest request) {
        return merchantService.createVoucher(request);
    }

    @GetMapping("/notifications")
    public Result notifications(@RequestParam(value = "readFlag", required = false) Integer readFlag) {
        return merchantService.notifications(readFlag);
    }
}
