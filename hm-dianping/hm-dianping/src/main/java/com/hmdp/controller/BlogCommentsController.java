package com.hmdp.controller;


import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.BlogComments;
import com.hmdp.entity.User;
import com.hmdp.service.IBlogService;
import com.hmdp.service.IBlogCommentsService;
import com.hmdp.service.IUserService;
import com.hmdp.utils.UserHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.Resource;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * <p>
 *  前端控制器
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@RestController
@RequestMapping("/blog-comments")
public class BlogCommentsController {

    @Resource
    private IBlogCommentsService commentsService;

    @Resource
    private IUserService userService;

    @Resource
    private IBlogService blogService;

    /**
     * 笔记详情页评论流。
     * 只查询一级评论，并补充评论用户昵称和头像，方便前端直接渲染。
     */
    @GetMapping("/of/blog")
    public Result queryComments(
            @RequestParam("blogId") Long blogId,
            @RequestParam(value = "current", defaultValue = "1") Integer current) {
        Page<BlogComments> page = commentsService.query()
                .eq("blog_id", blogId)
                .eq("parent_id", 0)
                .orderByDesc("liked")
                .orderByDesc("create_time")
                .page(new Page<>(current, 20));
        List<Map<String, Object>> records = page.getRecords().stream()
                .map(comment -> {
                    User user = userService.getById(comment.getUserId());
                    return Map.<String, Object>of(
                            "id", comment.getId(),
                            "blogId", comment.getBlogId(),
                            "userId", comment.getUserId(),
                            "name", user == null ? "探店用户" : user.getNickName(),
                            "icon", user == null ? "" : Objects.toString(user.getIcon(), ""),
                            "content", comment.getContent(),
                            "liked", comment.getLiked() == null ? 0 : comment.getLiked(),
                            "createTime", comment.getCreateTime()
                    );
                })
                .toList();
        return Result.ok(records, page.getTotal());
    }

    /**
     * 发表评论。
     * 当前只支持一级评论；登录态来自拦截器写入的 UserHolder。
     */
    @PostMapping
    public Result saveComment(@RequestBody BlogComments comment) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("请先登录");
        }
        if (comment.getBlogId() == null) {
            return Result.fail("笔记ID不能为空");
        }
        if (comment.getContent() == null || comment.getContent().trim().isEmpty()) {
            return Result.fail("评论内容不能为空");
        }
        comment.setId(null);
        comment.setUserId(user.getId());
        comment.setParentId(0L);
        comment.setAnswerId(0L);
        comment.setLiked(0);
        comment.setStatus(false);
        commentsService.save(comment);
        blogService.update()
                .setSql("comments = IFNULL(comments, 0) + 1")
                .eq("id", comment.getBlogId())
                .update();
        return Result.ok(comment.getId());
    }

    /**
     * 评论点赞。
     * 当前实现为轻量版，只维护评论点赞数量，不额外记录用户点赞明细。
     */
    @PutMapping("/like/{id}")
    public Result likeComment(@PathVariable("id") Long commentId) {
        if (UserHolder.getUser() == null) {
            return Result.fail("请先登录");
        }
        if (commentId == null) {
            return Result.fail("评论ID不能为空");
        }
        boolean success = commentsService.update()
                .setSql("liked = IFNULL(liked, 0) + 1")
                .eq("id", commentId)
                .update();
        return success ? Result.ok() : Result.fail("评论不存在");
    }
}
