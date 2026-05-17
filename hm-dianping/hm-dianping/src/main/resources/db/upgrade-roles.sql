-- ============================================================
-- 为 tb_user 添加角色字段
-- 执行方式：mysql -u root -p hmdp < upgrade-roles.sql
-- ============================================================

SET @column_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tb_user'
    AND COLUMN_NAME = 'role'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE `tb_user` ADD COLUMN `role` TINYINT NOT NULL DEFAULT 1 COMMENT ''用户角色：0游客 1用户 2商家 3管理员'' AFTER `icon`',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE;

UPDATE `tb_user` SET `role` = 1 WHERE `role` = 0;
