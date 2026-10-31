package com.seven.chat.domain;

public final class PostRules {
    public static final int MAX_CAPTION = 2000;
    public static final int MAX_COMMENT = 500;
    public static final int MAX_NAME = 60;
    public static final int MAX_BIO = 160;

    private PostRules() { }

    public static String caption(String value, boolean hasMedia) {
        String normalized = normalize(value);
        if (normalized.length() > MAX_CAPTION)
            throw new IllegalArgumentException("A legenda excede 2.000 caracteres.");
        if (normalized.isEmpty() && !hasMedia)
            throw new IllegalArgumentException("Escreva uma legenda ou selecione uma foto.");
        return normalized;
    }

    public static String comment(String value) {
        String normalized = normalize(value);
        if (normalized.isEmpty() || normalized.length() > MAX_COMMENT)
            throw new IllegalArgumentException("O comentário precisa ter entre 1 e 500 caracteres.");
        return normalized;
    }

    public static String name(String value) {
        String normalized = normalize(value);
        if (normalized.isEmpty() || normalized.length() > MAX_NAME)
            throw new IllegalArgumentException("O nome precisa ter entre 1 e 60 caracteres.");
        return normalized;
    }

    public static String bio(String value) {
        String normalized = normalize(value);
        if (normalized.length() > MAX_BIO)
            throw new IllegalArgumentException("A biografia excede 160 caracteres.");
        return normalized;
    }

    public static String normalize(String input) {
        return input == null ? "" : input.replace('\u0000', ' ').replace("\r\n", "\n").trim();
    }
}
