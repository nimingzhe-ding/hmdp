package com.hmdp.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hmdp.dto.Result;
import com.hmdp.entity.VideoDanmaku;

/**
 * 视频弹幕服务。
 */
public interface IVideoDanmakuService extends IService<VideoDanmaku> {
    Result listByBlog(Long blogId);

    Result send(VideoDanmaku danmaku);
}
