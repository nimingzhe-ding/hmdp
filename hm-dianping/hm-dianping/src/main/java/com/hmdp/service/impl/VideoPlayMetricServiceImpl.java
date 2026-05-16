package com.hmdp.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.Blog;
import com.hmdp.entity.VideoPlayMetric;
import com.hmdp.enums.ContentType;
import com.hmdp.mapper.VideoPlayMetricMapper;
import com.hmdp.service.IBlogService;
import com.hmdp.service.IVideoPlayMetricService;
import com.hmdp.utils.UserHolder;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 视频播放指标服务。
 * 前端在暂停、结束和进度变化时上报，后端保留为推荐排序特征。
 */
@Service
public class VideoPlayMetricServiceImpl extends ServiceImpl<VideoPlayMetricMapper, VideoPlayMetric> implements IVideoPlayMetricService {

    @Resource
    private IBlogService blogService;

    @Override
    public Result report(VideoPlayMetric metric) {
        if (metric == null || metric.getBlogId() == null) {
            return Result.fail("视频ID不能为空");
        }
        Blog blog = blogService.getById(metric.getBlogId());
        if (blog == null || !ContentType.supportsDanmaku(blog.getContentType(), blog.getVideoUrl())) {
            return Result.fail("视频内容不存在");
        }
        UserDTO user = UserHolder.getUser();
        int duration = positive(metric.getDurationSecond());
        int watched = positive(metric.getWatchedSecond());
        int progress = Math.max(0, Math.min(100, metric.getMaxProgress() == null ? 0 : metric.getMaxProgress()));
        boolean completed = Boolean.TRUE.equals(metric.getCompleted()) || progress >= 95;
        VideoPlayMetric saved = new VideoPlayMetric()
                .setBlogId(metric.getBlogId())
                .setUserId(user == null ? null : user.getId())
                .setDurationSecond(duration)
                .setWatchedSecond(watched)
                .setMaxProgress(progress)
                .setCompleted(completed)
                .setCreateTime(LocalDateTime.now());
        save(saved);
        return Result.ok();
    }

    private int positive(Integer value) {
        return Math.max(0, value == null ? 0 : value);
    }
}
