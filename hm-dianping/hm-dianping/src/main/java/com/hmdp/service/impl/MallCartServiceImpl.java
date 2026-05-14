package com.hmdp.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.dto.MallCartItemDTO;
import com.hmdp.dto.MallCartRequest;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.MallCartItem;
import com.hmdp.entity.MallProduct;
import com.hmdp.mapper.MallCartItemMapper;
import com.hmdp.service.IMallCartService;
import com.hmdp.service.IMallProductService;
import com.hmdp.utils.UserHolder;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 商城购物车服务实现。
 */
@Service
public class MallCartServiceImpl extends ServiceImpl<MallCartItemMapper, MallCartItem> implements IMallCartService {

    @Resource
    private IMallProductService productService;

    @Override
    public Result add(MallCartRequest request) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        if (request == null || request.getProductId() == null) {
            return Result.fail("商品ID不能为空");
        }
        int quantity = request.getQuantity() == null || request.getQuantity() < 1 ? 1 : request.getQuantity();
        MallProduct product = productService.getById(request.getProductId());
        if (product == null || product.getStatus() == null || product.getStatus() != 1) {
            return Result.fail("商品不存在或已下架");
        }
        if (product.getStock() != null && product.getStock() < quantity) {
            return Result.fail("库存不足");
        }
        MallCartItem existing = query()
                .eq("user_id", user.getId())
                .eq("product_id", request.getProductId())
                .one();
        if (existing == null) {
            MallCartItem item = new MallCartItem();
            item.setUserId(user.getId());
            item.setProductId(request.getProductId());
            item.setQuantity(quantity);
            save(item);
            return Result.ok(item.getId());
        }
        update()
                .setSql("quantity = quantity + " + quantity)
                .eq("id", existing.getId())
                .update();
        return Result.ok(existing.getId());
    }

    @Override
    public Result listMine() {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        List<MallCartItem> items = query().eq("user_id", user.getId()).orderByDesc("update_time").list();
        if (items.isEmpty()) {
            return Result.ok(List.of());
        }
        List<Long> productIds = items.stream().map(MallCartItem::getProductId).distinct().toList();
        Map<Long, MallProduct> productMap = productService.listByIds(productIds).stream()
                .collect(Collectors.toMap(MallProduct::getId, Function.identity(), (first, second) -> first));
        List<MallCartItemDTO> result = items.stream()
                .map(item -> toDTO(item, productMap.get(item.getProductId())))
                .toList();
        return Result.ok(result);
    }

    @Override
    public Result removeItem(Long id) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        remove(new QueryWrapper<MallCartItem>()
                .eq("id", id)
                .eq("user_id", user.getId()));
        return Result.ok();
    }

    private MallCartItemDTO toDTO(MallCartItem item, MallProduct product) {
        MallCartItemDTO dto = new MallCartItemDTO();
        dto.setId(item.getId());
        dto.setProductId(item.getProductId());
        dto.setQuantity(item.getQuantity());
        if (product != null) {
            dto.setTitle(product.getTitle());
            dto.setImage(firstImage(product.getImages()));
            dto.setPrice(product.getPrice());
            dto.setTotalAmount(product.getPrice() == null ? 0L : product.getPrice() * item.getQuantity());
        }
        return dto;
    }

    private String firstImage(String images) {
        if (images == null || images.isBlank()) {
            return "";
        }
        return images.split(",")[0].trim();
    }
}
