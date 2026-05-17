package com.hmdp.service.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.InputStream;

/**
 * 对象存储实现（桩）。
 * 启用方式：在 application.yaml 中设置 hmdp.storage.type=oss
 * 并配置 hmdp.storage.oss.endpoint / bucket / access-key / secret-key。
 *
 * TODO: 接入阿里云 OSS SDK 或其他对象存储 SDK。
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "hmdp.storage.type", havingValue = "oss")
public class OssStorageService implements FileStorageService {

    @Value("${hmdp.storage.oss.endpoint:}")
    private String endpoint;

    @Value("${hmdp.storage.oss.bucket:}")
    private String bucket;

    @Value("${hmdp.storage.oss.access-key:}")
    private String accessKey;

    @Value("${hmdp.storage.oss.secret-key:}")
    private String secretKey;

    @Override
    public String upload(String objectName, InputStream inputStream, long size) {
        // TODO: 实现 OSS 上传
        // 1. 创建 OSSClient
        // 2. client.putObject(bucket, objectName, inputStream)
        // 3. 返回访问 URL
        log.warn("OSS 存储尚未实现，objectName={}", objectName);
        throw new UnsupportedOperationException("OSS 存储尚未实现，请配置 hmdp.storage.type=local 或接入 OSS SDK");
    }

    @Override
    public void delete(String objectName) {
        log.warn("OSS 存储尚未实现，objectName={}", objectName);
        throw new UnsupportedOperationException("OSS 存储尚未实现");
    }

    @Override
    public String getUrl(String objectName) {
        return "https://" + bucket + "." + endpoint + "/" + objectName;
    }
}
