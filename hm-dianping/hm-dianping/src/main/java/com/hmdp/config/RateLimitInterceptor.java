package com.hmdp.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.annotation.Resource;
import java.util.concurrent.TimeUnit;

/**
 * Redis 滑动窗口限流拦截器。
 * 基于 IP + URI 维度，默认 60 秒内最多 60 次请求。
 */
@Slf4j
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    private static final long WINDOW_SECONDS = 60;
    private static final long MAX_REQUESTS = 60;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String ip = getClientIp(request);
        String uri = request.getRequestURI();
        String key = "rate:" + ip + ":" + uri;

        stringRedisTemplate.opsForValue().setIfAbsent(key, "0", WINDOW_SECONDS, TimeUnit.SECONDS);
        Long count = stringRedisTemplate.opsForValue().increment(key);

        if (count != null && count > MAX_REQUESTS) {
            log.warn("限流触发: ip={}, uri={}, count={}", ip, uri, count);
            response.setStatus(429);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"code\":429,\"errorMsg\":\"请求过于频繁，请稍后重试\"}");
            return false;
        }
        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.split(",")[0].trim();
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
            return ip;
        }
        return request.getRemoteAddr();
    }
}
