package com.hmdp.controller;

import com.hmdp.dto.ContentProfileUpdateRequest;
import com.hmdp.dto.Result;
import com.hmdp.service.IContentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.Resource;

/**
 * 小红书式用户主页入口。
 */
@RestController
@RequestMapping("/profiles")
public class ProfilesController {

    @Resource
    private IContentService contentService;

    @GetMapping("/me")
    public Result me() {
        return contentService.profile(null);
    }

    @GetMapping("/{id}")
    public Result profile(@PathVariable("id") Long userId) {
        return contentService.profile(userId);
    }

    @PutMapping("/me")
    public Result updateMe(@RequestBody ContentProfileUpdateRequest request) {
        return contentService.updateProfile(request);
    }
}
