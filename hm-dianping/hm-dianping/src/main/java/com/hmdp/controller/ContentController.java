package com.hmdp.controller;

import com.hmdp.dto.ContentAiRequest;
import com.hmdp.dto.ContentProfileUpdateRequest;
import com.hmdp.dto.Result;
import com.hmdp.service.IContentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.Resource;

/**
 * 内容社区统一接口。
 * 前端首页、搜索、详情、个人主页优先调用这里，减少页面层对旧 Blog/Follow/Collect 接口的耦合。
 */
@RestController
@RequestMapping("/content")
public class ContentController {

    @Resource
    private IContentService contentService;

    @GetMapping("/feed")
    public Result feed(
            @RequestParam(value = "channel", defaultValue = "hot") String channel,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.feed(channel, query, current);
    }

    @GetMapping("/search")
    public Result search(
            @RequestParam("query") String query,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.search(query, current);
    }

    @GetMapping("/note/{id}")
    public Result detail(@PathVariable("id") Long blogId) {
        return contentService.detail(blogId);
    }

    @GetMapping("/mine")
    public Result mine(@RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.mine(current);
    }

    @GetMapping("/collections")
    public Result collections(@RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.collections(current);
    }

    @GetMapping("/liked")
    public Result liked(@RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.liked(current);
    }

    @GetMapping("/user/{id}")
    public Result userNotes(
            @PathVariable("id") Long userId,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.userNotes(userId, current);
    }

    @GetMapping("/user/{id}/collections")
    public Result userCollections(
            @PathVariable("id") Long userId,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.userCollections(userId, current);
    }

    @GetMapping("/user/{id}/liked")
    public Result userLiked(
            @PathVariable("id") Long userId,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.userLiked(userId, current);
    }

    @GetMapping("/user/{id}/following")
    public Result following(
            @PathVariable("id") Long userId,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.following(userId, current);
    }

    @GetMapping("/user/{id}/followers")
    public Result followers(
            @PathVariable("id") Long userId,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.followers(userId, current);
    }

    @GetMapping("/profile")
    public Result myProfile() {
        return contentService.profile(null);
    }

    @GetMapping("/profile/{id}")
    public Result profile(@PathVariable("id") Long userId) {
        return contentService.profile(userId);
    }

    @PutMapping("/profile")
    public Result updateProfile(@RequestBody ContentProfileUpdateRequest request) {
        return contentService.updateProfile(request);
    }

    @GetMapping("/trends")
    public Result trends() {
        return contentService.trends();
    }

    @PostMapping("/ai/recommend")
    public Result aiRecommend(@RequestBody ContentAiRequest request) {
        return contentService.aiRecommend(request);
    }

    @PostMapping("/ai/note-summary")
    public Result aiNoteSummary(@RequestBody ContentAiRequest request) {
        return contentService.aiNoteSummary(request);
    }
}
