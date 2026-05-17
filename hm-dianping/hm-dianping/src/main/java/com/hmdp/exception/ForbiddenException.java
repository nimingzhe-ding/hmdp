package com.hmdp.exception;

import com.hmdp.enums.ErrorCode;

/**
 * 无权限异常，对应 HTTP 403。
 */
public class ForbiddenException extends BusinessException {
    public ForbiddenException() {
        super(ErrorCode.FORBIDDEN);
    }
}
