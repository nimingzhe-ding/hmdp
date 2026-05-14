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
 * 视频弹幕服务实现。
 * 前端不展示用户和创建时间，只按 videoSecond 在播放时触发。
 */
@Service
public class VideoDanmakuServiceImpl extends ServiceImpl<VideoDanmakuMapper, VideoDanmaku> implements IVideoDanmakuService {

    @Resource
    private IBlogService blogService;

    @Override
    public Result listByBlog(Long blogId) {
        if (blogId == null) {
            return Result.fail("视频ID不能为空");
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
        if (danmaku == null || danmaku.getBlogId() == null) {
            return Result.fail("视频ID不能为空");
        }
        if (StrUtil.isBlank(danmaku.getContent())) {
            return Result.fail("弹幕内容不能为空");
        }
        Blog blog = blogService.getById(danmaku.getBlogId());
        if (blog == null || StrUtil.isBlank(blog.getVideoUrl())) {
            return Result.fail("视频不存在");
        }
        UserDTO user = UserHolder.getUser();
        danmaku.setId(null);
        danmaku.setUserId(user == null ? null : user.getId());
        danmaku.setContent(StrUtil.sub(danmaku.getContent().trim(), 0, 40));
        danmaku.setVideoSecond(Math.max(0, danmaku.getVideoSecond() == null ? 0 : danmaku.getVideoSecond()));
        danmaku.setLane(danmaku.getLane() == null ? null : Math.floorMod(danmaku.getLane(), 5));
        danmaku.setStatus(false);
        save(danmaku);
        return Result.ok(toView(danmaku));
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
