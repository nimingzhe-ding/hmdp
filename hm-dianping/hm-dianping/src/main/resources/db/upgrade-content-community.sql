-- 内容社区增量脚本
-- 用途：补充收藏、点赞、评论状态、商品挂载、话题、内容标签和行为事件表。
USE hmdp;

DROP PROCEDURE IF EXISTS add_column_if_missing;
DELIMITER //
CREATE PROCEDURE add_column_if_missing(
  IN p_table_name varchar(64),
  IN p_column_name varchar(64),
  IN p_column_definition text
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = p_table_name
      AND column_name = p_column_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN `', p_column_name, '` ', p_column_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CREATE TABLE IF NOT EXISTS `tb_blog_collect` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint UNSIGNED NOT NULL COMMENT '用户id',
  `blog_id` bigint UNSIGNED NOT NULL COMMENT '笔记id',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_user_blog_collect` (`user_id`, `blog_id`) USING BTREE,
  KEY `idx_blog_id` (`blog_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记收藏关系表';

CREATE TABLE IF NOT EXISTS `tb_blog_like` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint UNSIGNED NOT NULL COMMENT '用户id',
  `blog_id` bigint UNSIGNED NOT NULL COMMENT '笔记id',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_user_blog_like` (`user_id`, `blog_id`) USING BTREE,
  KEY `idx_blog_id` (`blog_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记点赞关系表';

CREATE TABLE IF NOT EXISTS `tb_blog_product` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `blog_id` bigint UNSIGNED NOT NULL COMMENT '笔记id',
  `product_id` bigint UNSIGNED NOT NULL COMMENT '商品id',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_blog_product` (`blog_id`, `product_id`) USING BTREE,
  KEY `idx_product_id` (`product_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记挂载商品关系表';

CREATE TABLE IF NOT EXISTS `tb_content_topic` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `keyword` varchar(64) NOT NULL COMMENT '话题词，不带#',
  `heat` bigint UNSIGNED NOT NULL DEFAULT 0 COMMENT '热度',
  `note_count` bigint UNSIGNED NOT NULL DEFAULT 0 COMMENT '笔记数',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_topic_keyword` (`keyword`) USING BTREE,
  KEY `idx_topic_heat` (`heat`, `note_count`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容话题表';

CALL add_column_if_missing('tb_blog', 'content_type', 'varchar(32) NOT NULL DEFAULT ''IMAGE'' COMMENT ''内容类型：IMAGE/VIDEO/LIVE/PRODUCT_NOTE'' AFTER `video_url`');
CALL add_column_if_missing('tb_blog', 'tags', 'varchar(128) NULL COMMENT ''内容标签，多个标签用英文逗号分隔'' AFTER `content_type`');

UPDATE `tb_blog` SET `comments` = 0 WHERE `comments` IS NULL;
UPDATE `tb_blog_comments` SET `liked` = 0 WHERE `liked` IS NULL;
UPDATE `tb_blog_comments` SET `status` = 0 WHERE `status` IS NULL;
ALTER TABLE `tb_blog_comments`
  MODIFY COLUMN `liked` int UNSIGNED NOT NULL DEFAULT 0 COMMENT '点赞数',
  MODIFY COLUMN `status` tinyint UNSIGNED NOT NULL DEFAULT 0 COMMENT '状态：0正常，1被举报，2已删除/禁止查看';

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

INSERT INTO `tb_content_topic` (`keyword`, `heat`, `note_count`)
VALUES
  ('美食', 120, 0),
  ('穿搭', 90, 0),
  ('旅行', 88, 0),
  ('数码', 76, 0),
  ('好物', 72, 0),
  ('探店', 110, 0)
ON DUPLICATE KEY UPDATE `heat` = GREATEST(`heat`, VALUES(`heat`));
