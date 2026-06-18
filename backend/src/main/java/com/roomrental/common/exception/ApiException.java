package com.roomrental.common.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends BaseException {

    public ApiException(HttpStatus status, String code, String message) {
        super(status, code, message);
    }
}
