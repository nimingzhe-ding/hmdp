package com.hmdp.service;

import com.hmdp.dto.Result;

/**
 * 内容社区聚合服务。
 * 把笔记、作者、关注、点赞、收藏、行为趋势等分散能力包装成前端友好的统一 API。
 */
public interface IContentService {

    /**
     * 查询首页内容流。
     *
     * @param channel 频道：hot/follow/nearby/search
     * @param query 搜索词，可为空
     * @param current 页码
     * @return 内容流卡片列表
     */
    Result feed(String channel, String query, Integer current);

    /**
     * 查询单篇笔记详情。
     */
    Result detail(Long blogId);

    /**
     * 查询当前登录用户发布的笔记。
     */
    Result mine(Integer current);

    /**
     * 查询当前登录用户收藏的笔记。
     */
    Result collections(Integer current);

    /**
     * 查询指定用户主页的笔记流。
     */
    Result userNotes(Long userId, Integer current);

    /**
     * 查询用户内容主页统计。
     */
    Result profile(Long userId);

    /**
     * 查询搜索和内容趋势词。
     */
    Result trends();
}
