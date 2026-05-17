package com.hmdp.config;

import com.hmdp.annotation.RequireRole;
import com.hmdp.dto.UserDTO;
import com.hmdp.enums.ErrorCode;
import com.hmdp.enums.UserRole;
import com.hmdp.exception.BusinessException;
import com.hmdp.exception.UnauthorizedException;
import com.hmdp.utils.UserHolder;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * 权限校验切面：拦截 @RequireRole 注解的方法。
 */
@Aspect
@Component
public class PermissionAspect {

    @Around("@annotation(com.hmdp.annotation.RequireRole) || @within(com.hmdp.annotation.RequireRole)")
    public Object checkPermission(ProceedingJoinPoint pjp) throws Throwable {
        RequireRole requireRole = resolveRequireRole(pjp);
        UserRole required = requireRole.value();
        UserDTO user = UserHolder.getUser();

        if (required == UserRole.GUEST) {
            return pjp.proceed();
        }

        if (user == null) {
            throw new UnauthorizedException();
        }

        UserRole currentRole = UserRole.of(user.getRole());
        if (!currentRole.isAtLeast(required)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "需要" + required.getDesc() + "权限");
        }

        return pjp.proceed();
    }

    private RequireRole resolveRequireRole(ProceedingJoinPoint pjp) {
        MethodSignature signature = (MethodSignature) pjp.getSignature();
        Method method = signature.getMethod();
        RequireRole methodRole = AnnotationUtils.findAnnotation(method, RequireRole.class);
        if (methodRole != null) {
            return methodRole;
        }
        return AnnotationUtils.findAnnotation(pjp.getTarget().getClass(), RequireRole.class);
    }
}
