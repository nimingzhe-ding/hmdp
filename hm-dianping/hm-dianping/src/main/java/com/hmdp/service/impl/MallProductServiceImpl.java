package com.hmdp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.dto.Result;
import com.hmdp.entity.MallProduct;
import com.hmdp.mapper.MallProductMapper;
import com.hmdp.service.IMallProductService;
import com.hmdp.utils.SystemConstants;
import org.springframework.stereotype.Service;

/**
 * 商城商品服务实现。
 */
@Service
public class MallProductServiceImpl extends ServiceImpl<MallProductMapper, MallProduct> implements IMallProductService {

    @Override
    public Result pageProducts(String category, String query, Integer current) {
        int pageNo = current == null || current < 1 ? 1 : current;
        Page<MallProduct> page = query()
                .eq("status", 1)
                .eq(StrUtil.isNotBlank(category) && !"all".equals(category), "category", category)
                .and(StrUtil.isNotBlank(query), wrapper -> wrapper.like("title", query).or().like("sub_title", query))
                .orderByDesc("sold")
                .orderByDesc("create_time")
                .page(new Page<>(pageNo, SystemConstants.MAX_PAGE_SIZE));
        return Result.ok(page.getRecords(), page.getTotal());
    }

    @Override
    public Result detail(Long id) {
        if (id == null) {
            return Result.fail("商品ID不能为空");
        }
        MallProduct product = getById(id);
        return product == null ? Result.fail("商品不存在") : Result.ok(product);
    }
}
