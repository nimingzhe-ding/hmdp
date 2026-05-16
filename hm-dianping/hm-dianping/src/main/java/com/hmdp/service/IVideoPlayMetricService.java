package com.hmdp.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hmdp.dto.Result;
import com.hmdp.entity.VideoPlayMetric;

public interface IVideoPlayMetricService extends IService<VideoPlayMetric> {
    Result report(VideoPlayMetric metric);
}
