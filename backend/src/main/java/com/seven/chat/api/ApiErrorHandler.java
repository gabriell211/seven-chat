package com.seven.chat.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiErrorHandler {
    @ExceptionHandler(ApiExceptions.Unauthorized.class)
    ResponseEntity<ApiDto.Error> unauthorized() {
        return response(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Credenciais inválidas.");
    }


    @ExceptionHandler(ApiExceptions.Forbidden.class)
    ResponseEntity<ApiDto.Error> forbidden() {
        return response(HttpStatus.FORBIDDEN, "FORBIDDEN", "Acesso negado.");
    }

    @ExceptionHandler(ApiExceptions.NotFound.class)
    ResponseEntity<ApiDto.Error> notFound() {
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", "Recurso não encontrado.");
    }

    @ExceptionHandler(ApiExceptions.Conflict.class)
    ResponseEntity<ApiDto.Error> conflict() {
        return response(HttpStatus.CONFLICT, "CONFLICT", "E-mail ou usuário já cadastrado.");
    }

    @ExceptionHandler(ApiExceptions.TooManyRequests.class)
    ResponseEntity<ApiDto.Error> tooManyRequests() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", "900")
                .body(new ApiDto.Error("RATE_LIMITED", "Muitas tentativas. Tente novamente mais tarde."));
    }

    @ExceptionHandler(ApiExceptions.InvalidInput.class)
    ResponseEntity<ApiDto.Error> invalid(ApiExceptions.InvalidInput ex) {
        return response(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_INPUT", ex.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<ApiDto.Error> invalidRequest() {
        return response(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Dados inválidos.");
    }

    private static ResponseEntity<ApiDto.Error> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ApiDto.Error(code, message));
    }
}
