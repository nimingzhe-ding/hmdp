-- 商城第一版增量脚本
-- 用途：新增商品、购物车、商城订单表，并插入示例商品。

USE hmdp;

CREATE TABLE IF NOT EXISTS `tb_merchant` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint UNSIGNED NOT NULL COMMENT '商家所属用户id',
  `name` varchar(80) NOT NULL COMMENT '店铺名称',
  `avatar` varchar(512) NULL COMMENT '店铺头像',
  `description` varchar(255) NULL COMMENT '店铺简介',
  `phone` varchar(32) NULL COMMENT '客服电话',
  `address` varchar(255) NULL COMMENT '发货/经营地址',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '营业状态：1正常，2休息，3关闭',
  `audit_status` tinyint NOT NULL DEFAULT 2 COMMENT '审核状态：1待审，2通过，3拒绝',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_user_id` (`user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商城商家表';

CREATE TABLE IF NOT EXISTS `tb_mall_product` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `merchant_id` bigint UNSIGNED NULL COMMENT '商家id',
  `title` varchar(128) NOT NULL COMMENT '商品标题',
  `sub_title` varchar(255) NULL COMMENT '商品副标题',
  `images` varchar(1024) NULL COMMENT '商品图片，多个用英文逗号分隔',
  `price` bigint NOT NULL COMMENT '现价，单位分',
  `origin_price` bigint NULL COMMENT '原价，单位分',
  `stock` int NOT NULL DEFAULT 0 COMMENT '库存',
  `sold` int NOT NULL DEFAULT 0 COMMENT '销量',
  `category` varchar(32) NULL COMMENT '类目',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1上架，0下架',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_merchant_status` (`merchant_id`, `status`) USING BTREE,
  KEY `idx_category_status` (`category`, `status`) USING BTREE,
  KEY `idx_sold` (`sold`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商城商品表';

CREATE TABLE IF NOT EXISTS `tb_mall_cart_item` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint UNSIGNED NOT NULL COMMENT '用户id',
  `product_id` bigint UNSIGNED NOT NULL COMMENT '商品id',
  `quantity` int NOT NULL DEFAULT 1 COMMENT '数量',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_user_product` (`user_id`, `product_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商城购物车表';

CREATE TABLE IF NOT EXISTS `tb_mall_order` (
  `id` bigint NOT NULL COMMENT '主键',
  `user_id` bigint UNSIGNED NOT NULL COMMENT '用户id',
  `merchant_id` bigint UNSIGNED NULL COMMENT '商家id',
  `product_id` bigint UNSIGNED NOT NULL COMMENT '商品id',
  `product_title` varchar(128) NOT NULL COMMENT '商品标题快照',
  `product_image` varchar(512) NULL COMMENT '商品图片快照',
  `price` bigint NOT NULL COMMENT '单价，单位分',
  `quantity` int NOT NULL COMMENT '数量',
  `total_amount` bigint NOT NULL COMMENT '总金额，单位分',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1待支付，2已支付，3已发货，4已完成，5已取消',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_merchant_time` (`merchant_id`, `create_time`) USING BTREE,
  KEY `idx_user_time` (`user_id`, `create_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商城订单表';

ALTER TABLE `tb_mall_product`
  ADD COLUMN IF NOT EXISTS `merchant_id` bigint UNSIGNED NULL COMMENT '商家id' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_merchant_status` (`merchant_id`, `status`);

ALTER TABLE `tb_mall_order`
  ADD COLUMN IF NOT EXISTS `merchant_id` bigint UNSIGNED NULL COMMENT '商家id' AFTER `user_id`,
  ADD INDEX IF NOT EXISTS `idx_merchant_time` (`merchant_id`, `create_time`);

INSERT INTO `tb_merchant`
(`id`, `user_id`, `name`, `avatar`, `description`, `phone`, `address`, `status`, `audit_status`)
SELECT 1, 1, '探店优选旗舰店',
       'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80',
       '内容同款、探店套餐和创作装备集合店',
       '400-100-1204',
       '杭州内容电商产业园',
       1, 2
WHERE NOT EXISTS (SELECT 1 FROM `tb_merchant` WHERE `id` = 1);

INSERT INTO `tb_mall_product`
(`merchant_id`, `title`, `sub_title`, `images`, `price`, `origin_price`, `stock`, `sold`, `category`, `status`)
SELECT 1, '城市露营咖啡礼盒', '挂耳咖啡 + 随行杯，适合周末出逃', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80', 9900, 12900, 80, 126, 'coffee', 1
WHERE NOT EXISTS (SELECT 1 FROM `tb_mall_product` WHERE `title` = '城市露营咖啡礼盒');

INSERT INTO `tb_mall_product`
(`merchant_id`, `title`, `sub_title`, `images`, `price`, `origin_price`, `stock`, `sold`, `category`, `status`)
SELECT 1, '港式茶餐厅双人套餐', '经典菠萝油、奶茶、主食组合', 'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=900&q=80', 6880, 9800, 60, 238, 'food', 1
WHERE NOT EXISTS (SELECT 1 FROM `tb_mall_product` WHERE `title` = '港式茶餐厅双人套餐');

INSERT INTO `tb_mall_product`
(`merchant_id`, `title`, `sub_title`, `images`, `price`, `origin_price`, `stock`, `sold`, `category`, `status`)
SELECT 1, '拍照探店补光灯', '轻便折叠，适合美食和穿搭笔记', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80', 5900, 7900, 120, 91, 'gear', 1
WHERE NOT EXISTS (SELECT 1 FROM `tb_mall_product` WHERE `title` = '拍照探店补光灯');

UPDATE `tb_mall_product` SET `merchant_id` = 1 WHERE `merchant_id` IS NULL;
