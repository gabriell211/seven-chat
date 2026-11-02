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

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SocialHttpContractTest {
    @Autowired MockMvc mvc;
    @Autowired AuthService auth;
    @Autowired PostService posts;

    private ApiDto.Session register(String handle) {
        return auth.register(new ApiDto.Register(handle + "@seven.test",
                handle, "Perfil " + handle, "senha-de-teste-com-mais-de-doze"));
    }

    private String bearer(ApiDto.Session session) {
        return "Bearer " + session.accessToken();
    }

    @Test
    void usersSearchProfileUpdateAndRelationshipRoutes() throws Exception {
        ApiDto.Session one = register("contract_one");
        ApiDto.Session two = register("contract_two");
        mvc.perform(get("/api/v1/users?query=contract")
                        .header("Authorization", bearer(one)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));

        mvc.perform(get("/api/v1/users/contract_two")
                        .header("Authorization", bearer(one)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.handle").value("contract_two"));

        mvc.perform(post("/api/v1/users/" + two.user().id() + "/follow")
                        .header("Authorization", bearer(one)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/users/" + two.user().id() + "/followers")
                        .header("Authorization", bearer(two)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].handle").value("contract_one"));

        mvc.perform(post("/api/v1/users/me")
                        .header("Authorization", bearer(one))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Atualizado\",\"bio\":\"No banco\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").value("No banco"));
    }

    @Test
    void interactionsRequireRealIdentityAndBlockRemovesVisibility() throws Exception {
        ApiDto.Session writer = register("contract_writer");
        ApiDto.Session reader = register("contract_reader");
        ApiDto.Post post = posts.publish(writer.user().id(),
                new ApiDto.CreatePost(UUID.randomUUID(), "Publicação para testar"));
        String path = "/api/v1/posts/" + post.id();

        mvc.perform(post(path + "/like").header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likes").value(1));
        mvc.perform(post(path + "/save").header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.savedByMe").value(true));
        mvc.perform(post(path + "/comments").header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"Comentário persistido\"}"))
                .andExpect(status().isCreated());

        mvc.perform(post(path + "/edit").header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"Tentando alterar post alheio\"}"))
                .andExpect(status().isNotFound());

        mvc.perform(post("/api/v1/users/" + reader.user().id() + "/block")
                        .header("Authorization", bearer(writer)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/posts?limit=20")
                        .header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        mvc.perform(post(path + "/like").header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());
    }

    @Test
    void messagesArePersistedAndUnauthorizedRequestsStayUnauthorized() throws Exception {
        ApiDto.Session a = register("contract_alice");
        ApiDto.Session b = register("contract_bruna");
        String route = "/api/v1/conversations/" + b.user().id() + "/messages";
        String mutation = UUID.randomUUID().toString();

        mvc.perform(post(route).header("Authorization", bearer(a))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clientMutationId\":\"" + mutation + "\",\"body\":\"Olá de verdade\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.body").value("Olá de verdade"));
        mvc.perform(get("/api/v1/conversations")
                        .header("Authorization", bearer(a)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].handle").value("contract_bruna"));

        mvc.perform(get("/api/v1/notifications")
                        .header("Authorization", bearer(b)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].eventType").value("message"));
        mvc.perform(get(route)).andExpect(status().isUnauthorized());
    }
}
