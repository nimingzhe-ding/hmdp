-- ============================================================
-- 为 tb_user 添加角色字段
-- 执行方式：mysql -u root -p hmdp < upgrade-roles.sql
-- ============================================================

ALTER TABLE `tb_user` ADD COLUMN `role` TINYINT NOT NULL DEFAULT 0 COMMENT '用户角色：0游客 1用户 2商家 3管理员' AFTER `icon`;
