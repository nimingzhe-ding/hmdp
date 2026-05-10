package com.hmdp.controller;

import cn.hutool.core.util.StrUtil;
import com.hmdp.dto.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("upload")
public class UploadController {

    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");

    @Value("${hmdp.upload.image-dir}")
    private String imageUploadDir;

    @PostMapping("blog")
    public Result uploadImage(@RequestParam("file") MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return Result.fail("上传文件不能为空");
        }
        if (image.getSize() > MAX_IMAGE_SIZE) {
            return Result.fail("图片大小不能超过5MB");
        }

        String suffix = getValidatedSuffix(image);
        if (suffix == null) {
            return Result.fail("只支持 jpg、jpeg、png、gif、webp 图片");
        }

        try {
            String fileName = createNewFileName(suffix);
            Path target = resolveUploadPath(fileName);
            Files.createDirectories(target.getParent());
            image.transferTo(target.toFile());
            log.debug("文件上传成功: {}", fileName);
            return Result.ok(fileName);
        } catch (IOException e) {
            throw new RuntimeException("文件上传失败", e);
        }
    }

    @RequestMapping(value = "/blog/delete", method = {RequestMethod.GET, RequestMethod.DELETE})
    public Result deleteBlogImg(@RequestParam("name") String filename) {
        if (StrUtil.isBlank(filename)) {
            return Result.fail("文件名不能为空");
        }
        try {
            Path target = resolveUploadPath(filename);
            Path root = uploadRoot();
            String relativePath = root.relativize(target).toString().replace("\\", "/");
            if (!relativePath.startsWith("blogs/")) {
                return Result.fail("错误的文件路径");
            }
            if (Files.isDirectory(target)) {
                return Result.fail("错误的文件名称");
            }
            Files.deleteIfExists(target);
            return Result.ok();
        } catch (IOException e) {
            throw new RuntimeException("文件删除失败", e);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    private String getValidatedSuffix(MultipartFile image) {
        String originalFilename = StrUtil.blankToDefault(image.getOriginalFilename(), "");
        String suffix = StrUtil.subAfter(originalFilename, ".", true).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(suffix)) {
            return null;
        }
        String contentType = StrUtil.blankToDefault(image.getContentType(), "").toLowerCase(Locale.ROOT);
        if (!contentType.startsWith("image/")) {
            return null;
        }
        return suffix;
    }

    private String createNewFileName(String suffix) {
        String name = UUID.randomUUID().toString();
        int hash = name.hashCode();
        int d1 = hash & 0xF;
        int d2 = (hash >> 4) & 0xF;
        return StrUtil.format("/blogs/{}/{}/{}.{}", d1, d2, name, suffix);
    }

    private Path resolveUploadPath(String filename) {
        String normalizedName = filename.replace("\\", "/");
        while (normalizedName.startsWith("/")) {
            normalizedName = normalizedName.substring(1);
        }
        Path root = uploadRoot();
        Path target = root.resolve(normalizedName).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("错误的文件路径");
        }
        return target;
    }

    private Path uploadRoot() {
        return Paths.get(imageUploadDir).toAbsolutePath().normalize();
    }
}
