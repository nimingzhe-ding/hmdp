package com.hmdp.controller;

import com.hmdp.annotation.RequireRole;
import com.hmdp.dto.ContentAiRequest;
import com.hmdp.dto.Result;
import com.hmdp.entity.Blog;
import com.hmdp.enums.UserRole;
import com.hmdp.service.IBlogCollectService;
import com.hmdp.service.IBlogService;
import com.hmdp.service.IContentService;
import org.springframework.web.bind.annotation.DeleteMapping;
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
 * 小红书式笔记入口。
 * 对外统一使用 note 语义，内部复用原有 Blog/Content 能力，旧接口继续兼容。
 */
@RestController
@RequestMapping("/notes")
public class NotesController {

    @Resource
    private IContentService contentService;

    @Resource
    private IBlogService blogService;

    @Resource
    private IBlogCollectService blogCollectService;

    @GetMapping("/feed")
    public Result feed(
            @RequestParam(value = "channel", defaultValue = "hot") String channel,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "current", defaultValue = "1") Integer current,
            @RequestParam(value = "x", required = false) Double x,
            @RequestParam(value = "y", required = false) Double y) {
        return contentService.feed(channel, query, current, x, y);
    }

    @GetMapping("/search")
    public Result search(
            @RequestParam("query") String query,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        return contentService.search(query, current);
    }

    @GetMapping("/{id}")
    public Result detail(@PathVariable("id") Long noteId) {
        return contentService.detail(noteId);
    }

    @PostMapping
    @RequireRole(UserRole.USER)
    public Result publish(@RequestBody Blog note) {
        return blogService.saveBlog(note);
    }

    @PutMapping("/{id}")
    public Result update(@PathVariable("id") Long noteId, @RequestBody Blog note) {
        return blogService.updateOwnBlog(noteId, note);
    }

    @DeleteMapping("/{id}")
    public Result delete(@PathVariable("id") Long noteId) {
        return blogService.deleteOwnBlog(noteId);
    }

    @PutMapping("/{id}/like")
    public Result like(@PathVariable("id") Long noteId) {
        return blogService.likeBlog(noteId);
    }

    @GetMapping("/{id}/likes")
    public Result likes(@PathVariable("id") Long noteId) {
        return blogService.queryBlogLikes(noteId);
    }

    @PutMapping("/{id}/collect/{collect}")
    public Result collect(@PathVariable("id") Long noteId, @PathVariable("collect") Boolean collect) {
        return blogCollectService.collectBlog(noteId, collect);
    }

    @GetMapping("/{id}/collect")
    public Result isCollected(@PathVariable("id") Long noteId) {
        return blogCollectService.isCollected(noteId);
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

    @GetMapping("/trends")
    public Result trends() {
        return contentService.trends();
    }

    @GetMapping("/suggestions")
    public Result suggestions(@RequestParam("prefix") String prefix) {
        return contentService.suggestions(prefix);
    }

    @GetMapping("/search-history")
    public Result searchHistory() {
        return contentService.searchHistory();
    }

    @DeleteMapping("/search-history")
    public Result deleteSearchHistory(@RequestParam("keyword") String keyword) {
        return contentService.deleteSearchHistory(keyword);
    }

    @DeleteMapping("/search-history/all")
    public Result clearSearchHistory() {
        return contentService.clearSearchHistory();
    }

    @GetMapping("/hot-search")
    public Result hotSearch() {
        return contentService.hotSearch();
    }

    @PostMapping("/ai/recommend")
    public Result aiRecommend(@RequestBody ContentAiRequest request) {
        return contentService.aiRecommend(request);
    }

    @PostMapping("/ai/summary")
    public Result aiNoteSummary(@RequestBody ContentAiRequest request) {
        return contentService.aiNoteSummary(request);
    }
}
