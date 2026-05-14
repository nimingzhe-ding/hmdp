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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

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
        List<BlogComments> comments = page.getRecords();
        List<Long> parentIds = comments.stream()
                .map(BlogComments::getId)
                .toList();
        List<BlogComments> replies = parentIds.isEmpty()
                ? List.of()
                : commentsService.query()
                .eq("blog_id", blogId)
                .in("parent_id", parentIds)
                .orderByAsc("create_time")
                .list();
        List<BlogComments> allComments = new ArrayList<>();
        allComments.addAll(comments);
        allComments.addAll(replies);
        List<Long> userIds = allComments.stream()
                .map(BlogComments::getUserId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        Map<Long, User> userMap = userIds.isEmpty()
                ? Map.of()
                : userService.listByIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (first, second) -> first));
        Map<Long, List<Map<String, Object>>> replyMap = replies.stream()
                .map(reply -> toCommentMap(reply, userMap, List.of()))
                .collect(Collectors.groupingBy(reply -> (Long) reply.get("parentId"), LinkedHashMap::new, Collectors.toList()));
        List<Map<String, Object>> records = comments.stream()
                .map(comment -> toCommentMap(comment, userMap, replyMap.getOrDefault(comment.getId(), List.of())))
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
        Long parentId = comment.getParentId() == null ? 0L : comment.getParentId();
        Long answerId = comment.getAnswerId() == null ? parentId : comment.getAnswerId();
        if (parentId > 0) {
            BlogComments parentComment = commentsService.getById(parentId);
            if (parentComment == null || !comment.getBlogId().equals(parentComment.getBlogId())) {
                return Result.fail("回复的评论不存在");
            }
        }
        comment.setParentId(parentId);
        comment.setAnswerId(answerId);
        comment.setLiked(0);
        comment.setStatus(false);
        commentsService.save(comment);
        blogService.update()
                .setSql("comments = IFNULL(comments, 0) + 1")
                .eq("id", comment.getBlogId())
                .update();
        return Result.ok(comment.getId());
    }

    private Map<String, Object> toCommentMap(BlogComments comment, Map<Long, User> userMap, List<Map<String, Object>> replies) {
        User user = userMap.get(comment.getUserId());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", comment.getId());
        result.put("blogId", comment.getBlogId());
        result.put("userId", comment.getUserId());
        result.put("parentId", comment.getParentId());
        result.put("answerId", comment.getAnswerId());
        result.put("name", user == null ? "探店用户" : user.getNickName());
        result.put("icon", user == null ? "" : Objects.toString(user.getIcon(), ""));
        result.put("content", comment.getContent());
        result.put("liked", comment.getLiked() == null ? 0 : comment.getLiked());
        result.put("createTime", comment.getCreateTime());
        result.put("replies", replies);
        return result;
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
