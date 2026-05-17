package com.hmdp.service.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * 本地文件系统存储实现（默认）。
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "hmdp.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements FileStorageService {

    @Value("${hmdp.upload.image-dir}")
    private String uploadDir;

    @Override
    public String upload(String objectName, InputStream inputStream, long size) {
        try {
            Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
            String normalized = objectName.replace("\\", "/");
            while (normalized.startsWith("/")) {
                normalized = normalized.substring(1);
            }
            Path target = root.resolve(normalized).normalize();
            if (!target.startsWith(root)) {
                throw new IllegalArgumentException("非法文件路径");
            }
            Files.createDirectories(target.getParent());
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            log.debug("本地存储上传成功: {}", objectName);
            return objectName;
        } catch (IOException e) {
            throw new RuntimeException("文件上传失败", e);
        }
    }

    @Override
    public void delete(String objectName) {
        try {
            Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
            String normalized = objectName.replace("\\", "/");
            while (normalized.startsWith("/")) {
                normalized = normalized.substring(1);
            }
            Path target = root.resolve(normalized).normalize();
            if (!target.startsWith(root)) {
                throw new IllegalArgumentException("非法文件路径");
            }
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("本地文件删除失败: {}", objectName, e);
        }
    }

    @Override
    public String getUrl(String objectName) {
        return objectName;
    }
}
