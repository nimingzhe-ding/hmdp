-- 内容社区功能增量脚本
-- 用途：在已有 hmdp 数据库上补充小红书类内容社区需要的收藏表和评论字段默认值。

USE hmdp;

CREATE TABLE IF NOT EXISTS `tb_blog_collect` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint UNSIGNED NOT NULL COMMENT '用户id',
  `blog_id` bigint UNSIGNED NOT NULL COMMENT '笔记id',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_user_blog_collect` (`user_id`, `blog_id`) USING BTREE,
  KEY `idx_blog_id` (`blog_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记收藏关系表';

-- 兼容早期数据：评论数和评论点赞数为空时按 0 处理。
UPDATE `tb_blog` SET `comments` = 0 WHERE `comments` IS NULL;
UPDATE `tb_blog_comments` SET `liked` = 0 WHERE `liked` IS NULL;

CREATE TABLE IF NOT EXISTS `tb_note_event` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint UNSIGNED NULL COMMENT '用户id，未登录为空',
  `blog_id` bigint UNSIGNED NULL COMMENT '笔记id',
  `event_type` varchar(32) NOT NULL COMMENT '事件类型：impression/click/search/detail/like/collect/comment',
  `scene` varchar(64) NULL COMMENT '发生场景：feed/detail/search/ai',
  `keyword` varchar(128) NULL COMMENT '搜索词或推荐词',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_user_time` (`user_id`, `create_time`) USING BTREE,
  KEY `idx_blog_event` (`blog_id`, `event_type`) USING BTREE,
  KEY `idx_event_keyword` (`event_type`, `keyword`, `create_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记行为事件表';
