package com.hmdp.config;

import com.hmdp.utils.LoginInterceptor;
import com.hmdp.utils.RefreshTokenInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import jakarta.annotation.Resource;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class MvcConfig implements WebMvcConfigurer {
    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Resource
    private RequestLoggingInterceptor requestLoggingInterceptor;
    @Resource
    private RateLimitInterceptor rateLimitInterceptor;

    @Value("${hmdp.upload.image-dir}")
    private String imageUploadDir;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        //请求日志拦截器（最先执行）
        registry.addInterceptor(requestLoggingInterceptor)
                .addPathPatterns("/**").order(-1);
        //限流拦截器
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/user/code", "/user/login", "/upload/**").order(0);
        //登录拦截器
        registry.addInterceptor(new LoginInterceptor()).
                excludePathPatterns(
                        "/",
                        "/index.html",
                        "/assets/**",
                        "/favicon.ico",
                        "/error",
                        "/imgs/**",
                        "/user/code",
                        "/user/login",
                        "/shop/**",
                        "/shop-type/**",
                        "/voucher/**",
                        "/notes/feed",
                        "/notes/search",
                        "/notes/trends",
                        "/notes/suggestions",
                        "/notes/*",
                        "/notes/user/**",
                        "/notes/comments/of/blog",
                        "/profiles/*",
                        "/ai/flow/search",
                        "/ai/flow/shopping-guide",
                        "/ai/flow/note-summary",
                        "/ai/flow/customer-service",
                        "/ai/customer-service/chat",
                        "/mall/products/**",
                        "/content/**",
                        "/live/public/**",
                        "/note-event",
                        "/video-danmaku/public/**",
                        "/blog-comments/of/blog",
                        "/blog-collect/or/not/**",
                        "/blog/hot"
                ).addPathPatterns("/**").order(1);
        //刷新token拦截器
        registry.addInterceptor(new RefreshTokenInterceptor(stringRedisTemplate))
                .addPathPatterns("/**").order(0);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path imageRoot = Paths.get(imageUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/imgs/**")
                .addResourceLocations(imageRoot.toUri().toString() + "/");
    }

}
