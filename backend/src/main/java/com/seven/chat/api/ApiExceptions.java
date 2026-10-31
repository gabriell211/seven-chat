package com.seven.chat.api;

import org.springframework.http.HttpStatus;

public final class ApiExceptions {
    private ApiExceptions() {}

    public static final class Unauthorized extends RuntimeException {
        public Unauthorized() { super("Credenciais inválidas."); }
    }

    public static final class Conflict extends RuntimeException {
        public Conflict() { super("E-mail ou usuário já cadastrado."); }
    }

    public static final class Forbidden extends RuntimeException {
        public Forbidden() { super("Você não tem acesso a este recurso."); }
    }

    public static final class NotFound extends RuntimeException {
        public NotFound() { super("Recurso não encontrado."); }
    }

    public static final class InvalidInput extends RuntimeException {
        public InvalidInput(String message) { super(message); }
    }
}
