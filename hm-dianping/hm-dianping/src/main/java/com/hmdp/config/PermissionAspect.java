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
import org.springframework.stereotype.Component;

/**
 * 权限校验切面：拦截 @RequireRole 注解的方法。
 */
@Aspect
@Component
public class PermissionAspect {

    @Around("@annotation(requireRole)")
    public Object checkPermission(ProceedingJoinPoint pjp, RequireRole requireRole) throws Throwable {
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
}
