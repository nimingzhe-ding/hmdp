package com.hmdp.controller;

import com.hmdp.dto.Result;
import com.hmdp.service.IBlogCollectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.Resource;

/**
 * 笔记收藏接口。
 * 提供收藏、取消收藏、查询收藏状态三个前端高频操作。
 */
@RestController
@RequestMapping("/blog-collect")
public class BlogCollectController {

    @Resource
    private IBlogCollectService blogCollectService;

    @PutMapping("/{id}/{collect}")
    public Result collectBlog(@PathVariable("id") Long blogId, @PathVariable("collect") Boolean collect) {
        return blogCollectService.collectBlog(blogId, collect);
    }

    @GetMapping("/or/not/{id}")
    public Result isCollected(@PathVariable("id") Long blogId) {
        return blogCollectService.isCollected(blogId);
    }
}
