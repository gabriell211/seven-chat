package com.seven.chat.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApiHttpSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired AuthService auth;

    @Test
    void anonymousCannotReadPrivateAccountOrFeed() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/posts"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/posts").contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registrationReturnsNoStoreAndProtectsPrivateRoutes() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"email":"http@seven.test","handle":"http_user",
                         "displayName":"Pessoa HTTP","password":"uma-senha-bastante-longa"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(jsonPath("$.user.handle").value("http_user"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());

        String token = auth.login(new ApiDto.Login("http@seven.test",
                "uma-senha-bastante-longa")).accessToken();
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.handle").value("http_user"));

        mvc.perform(get("/api/v1/posts").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void postRequiresAuthorizationValidPayloadAndIncludesOnlyPublicAuthor() throws Exception {
        String token = auth.register(new ApiDto.Register(
                "http2@seven.test", "http_second", "Pessoa HTTP", "outra-senha-bastante-longa"))
                .accessToken();

        mvc.perform(post("/api/v1/posts").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"clientMutationId":"00000000-0000-4000-8000-000000000001","body":"  "}
                                """))
                .andExpect(status().isUnprocessableEntity());

        mvc.perform(post("/api/v1/posts").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"clientMutationId":"00000000-0000-4000-8000-000000000002","body":"Oi API"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.handle").value("http_second"))
                .andExpect(jsonPath("$.body").value("Oi API"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        mvc.perform(get("/api/v1/posts?limit=1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].body").value("Oi API"));

        mvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthQueriesDatabaseAndBadRegistrationIsRejected() throws Exception {
        mvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"invalid","handle":"ad","displayName":"","password":"123"}
                        """))
                .andExpect(status().isUnprocessableEntity());
    }
}
