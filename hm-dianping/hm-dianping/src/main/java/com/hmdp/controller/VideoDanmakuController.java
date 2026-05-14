package com.hmdp.controller;

import com.hmdp.dto.Result;
import com.hmdp.entity.VideoDanmaku;
import com.hmdp.service.IVideoDanmakuService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 视频弹幕接口。
 */
@RestController
@RequestMapping("/video-danmaku")
public class VideoDanmakuController {

    @Resource
    private IVideoDanmakuService danmakuService;

    @GetMapping("/{blogId}")
    public Result list(@PathVariable("blogId") Long blogId) {
        return danmakuService.listByBlog(blogId);
    }

    @PostMapping
    public Result send(@RequestBody VideoDanmaku danmaku) {
        return danmakuService.send(danmaku);
    }
}
