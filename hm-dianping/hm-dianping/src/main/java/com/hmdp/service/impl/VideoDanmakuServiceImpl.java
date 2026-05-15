package com.hmdp.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.Blog;
import com.hmdp.entity.VideoDanmaku;
import com.hmdp.mapper.VideoDanmakuMapper;
import com.hmdp.service.IBlogService;
import com.hmdp.service.IVideoDanmakuService;
import com.hmdp.utils.UserHolder;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Video danmaku domain service.
 * Reads are anonymous; writes require a logged-in user and a video note.
 */
@Service
public class VideoDanmakuServiceImpl extends ServiceImpl<VideoDanmakuMapper, VideoDanmaku> implements IVideoDanmakuService {

    @Resource
    private IBlogService blogService;

    @Override
    public Result listByBlog(Long blogId) {
        if (blogId == null) {
            return Result.fail("\u89c6\u9891ID\u4e0d\u80fd\u4e3a\u7a7a");
        }
        if (!canUseDanmaku(blogId)) {
            return Result.ok(List.of());
        }
        List<Map<String, Object>> list = query()
                .eq("blog_id", blogId)
                .eq("status", false)
                .orderByAsc("video_second")
                .last("LIMIT 300")
                .list()
                .stream()
                .map(this::toView)
                .toList();
        return Result.ok(list);
    }

    @Override
    public Result send(VideoDanmaku danmaku) {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            return Result.fail("\u8bf7\u5148\u767b\u5f55\u540e\u518d\u53d1\u5f39\u5e55");
        }
        if (danmaku == null || danmaku.getBlogId() == null) {
            return Result.fail("\u89c6\u9891ID\u4e0d\u80fd\u4e3a\u7a7a");
        }
        if (StrUtil.isBlank(danmaku.getContent())) {
            return Result.fail("\u5f39\u5e55\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a");
        }
        if (!canUseDanmaku(danmaku.getBlogId())) {
            return Result.fail("\u53ea\u6709\u89c6\u9891\u548c\u76f4\u64ad\u5185\u5bb9\u53ef\u4ee5\u53d1\u9001\u5f39\u5e55");
        }

        // Store userId for moderation/audit, but do not expose it in public responses.
        danmaku.setId(null);
        danmaku.setUserId(user.getId());
        danmaku.setContent(StrUtil.sub(danmaku.getContent().trim(), 0, 40));
        danmaku.setVideoSecond(Math.max(0, danmaku.getVideoSecond() == null ? 0 : danmaku.getVideoSecond()));
        danmaku.setLane(danmaku.getLane() == null ? null : Math.floorMod(danmaku.getLane(), 5));
        danmaku.setStatus(false);
        save(danmaku);
        return Result.ok(toView(danmaku));
    }

    private boolean canUseDanmaku(Long blogId) {
        Blog blog = blogService.getById(blogId);
        return blog != null && StrUtil.isNotBlank(blog.getVideoUrl());
    }

    private Map<String, Object> toView(VideoDanmaku danmaku) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", danmaku.getId());
        view.put("blogId", danmaku.getBlogId());
        view.put("content", danmaku.getContent());
        view.put("videoSecond", danmaku.getVideoSecond() == null ? 0 : danmaku.getVideoSecond());
        view.put("lane", danmaku.getLane() == null ? 0 : danmaku.getLane());
        return view;
    }
}
