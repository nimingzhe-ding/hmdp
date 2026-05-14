package com.hmdp.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 内容流笔记卡片 DTO。
 * 用于替代直接暴露 Blog 实体，让前端一次拿到作者、互动状态、统计数据等展示字段。
 */
@Data
public class ContentNoteDTO {
    private Long id;
    private Long shopId;
    private Long userId;
    private String title;
    private String images;
    private String videoUrl;
    private String content;
    private Integer liked;
    private Integer comments;
    private Long collects;
    private String name;
    private String icon;
    private Boolean isLike;
    private Boolean isCollect;
    private Boolean isFollow;
    private LocalDateTime createTime;
    private ContentShopDTO shop;
}
