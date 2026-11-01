package com.seven.chat.api;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CommunitySafetyHttpContractTest {
    @Autowired MockMvc mvc;
    @Autowired AuthService auth;
    @Autowired CommunityService community;
    @Autowired PostService posts;

    private ApiDto.Session account(String handle) {
        return auth.register(new ApiDto.Register(handle + "@seven.test", handle,
                "Nome " + handle, "senha-persistente-de-teste-2026"));
    }

    private static String bearer(ApiDto.Session session) {
        return "Bearer " + session.accessToken();
    }

    @Test
    void groupRequestsRejectAnonymousAndNonMembers() throws Exception {
        ApiDto.Session owner = account("http_group_owner");
        ApiDto.Session outsider = account("http_group_other");
        CommunityDto.Group group = community.create(owner.user().id(),
                new CommunityDto.CreateGroup("Equipe privada", "Teste"));
        String path = "/api/v1/groups/" + group.id();

        mvc.perform(get("/api/v1/groups")).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header("Authorization", bearer(outsider)))
                .andExpect(status().isNotFound());
        mvc.perform(get(path).header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberCount").value(1));
        mvc.perform(post(path + "/messages")
                        .header("Authorization", bearer(outsider))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clientMutationId\":\"" + UUID.randomUUID() +
                                "\",\"body\":\"Mensagem proibida\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post(path + "/invitations")
                        .header("Authorization", bearer(outsider))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"handle\":\"http_group_owner\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post(path + "/messages")
                        .header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clientMutationId\":\"" + UUID.randomUUID() +
                                "\",\"body\":\"Mensagem do proprietário\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.body").value("Mensagem do proprietário"));
    }

    @Test
    void reportsAndDataExportCannotLeakBetweenAccounts() throws Exception {
        ApiDto.Session author = account("http_safety_author");
        ApiDto.Session reader = account("http_safety_reader");
        ApiDto.Post post = posts.publish(author.user().id(),
                new ApiDto.CreatePost(UUID.randomUUID(), "Publicação com dados do autor"));
        String report = "{\"targetType\":\"post\",\"targetId\":\"" + post.id() +
                "\",\"category\":\"spam\",\"details\":\"Conteúdo denunciado\"}";

        mvc.perform(post("/api/v1/moderation/reports")
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content(report))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"));
        mvc.perform(get("/api/v1/moderation/reports/me")
                        .header("Authorization", bearer(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        mvc.perform(get("/api/v1/moderation/queue")
                        .header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/privacy/export"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/privacy/export")
                        .header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.account.handle").value("http_safety_reader"))
                .andExpect(jsonPath("$.posts.length()").value(0));
        mvc.perform(post("/api/v1/privacy/delete-account")
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"wrong\",\"confirmation\":\"DELETE MY ACCOUNT\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/privacy/consents")
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"consentType\":\"marketing\",\"documentVersion\":\"2026.11\",\"granted\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.granted").value(false));
    }
}
