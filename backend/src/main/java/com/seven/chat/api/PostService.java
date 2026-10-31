package com.seven.chat.api;

import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostService {
    private final PostStore posts;

    public PostService(PostStore posts) {
        this.posts = posts;
    }

    @Transactional
    public ApiDto.Post publish(UUID userId, ApiDto.CreatePost input) {
        if (input.body().trim().isEmpty()) {
            throw new ApiExceptions.InvalidInput("A publicação não pode estar vazia.");
        }
        String normalized = input.body().trim();
        if (normalized.length() > 2000) {
            throw new ApiExceptions.InvalidInput("A publicação excede 2.000 caracteres.");
        }
        ApiDto.CreatePost safe = new ApiDto.CreatePost(input.clientMutationId(), normalized);
        return posts.findMutation(userId, input.clientMutationId())
                .orElseGet(() -> posts.create(userId, safe));
    }

    @Transactional(readOnly = true)
    public ApiDto.Feed feed(Long before, int limit) {
        if (before != null && before <= 0) {
            throw new ApiExceptions.InvalidInput("Cursor inválido.");
        }
        if (limit < 1 || limit > 30) {
            throw new ApiExceptions.InvalidInput("O limite deve ficar entre 1 e 30.");
        }
        return posts.feed(before, limit);
    }
}
