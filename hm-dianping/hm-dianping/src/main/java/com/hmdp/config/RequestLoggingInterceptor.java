package com.hmdp.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 请求日志拦截器：记录 URI、参数、状态码、耗时。
 * 超过 500ms 的请求额外记入 slow.log。
 */
@Slf4j
@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    private static final Logger SLOW_LOG = LoggerFactory.getLogger("SLOW_API");
    private static final long SLOW_THRESHOLD_MS = 500;

    private static final String START_TIME_ATTR = "requestStartTime";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(START_TIME_ATTR, System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        long startTime = (long) request.getAttribute(START_TIME_ATTR);
        long duration = System.currentTimeMillis() - startTime;
        String uri = request.getRequestURI();
        String method = request.getMethod();
        int status = response.getStatus();
        String query = request.getQueryString();

        String logMsg = "{} {} {} status={} cost={}ms{}";
        String queryPart = query != null ? " query=" + query : "";

        if (duration > SLOW_THRESHOLD_MS) {
            SLOW_LOG.warn(logMsg, method, uri, request.getRemoteAddr(), status, duration, queryPart);
        } else {
            log.info(logMsg, method, uri, request.getRemoteAddr(), status, duration, queryPart);
        }

        if (ex != null) {
            log.error("请求异常: {} {}", method, uri, ex);
        }
    }
}
