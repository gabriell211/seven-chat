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

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthThrottleIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired AuthThrottle throttle;
    @Autowired AuthService auth;

    @Test
    void repeatedIncorrectPasswordsAreRejectedUsingRealPostgresql() throws Exception {
        String handle = "lock_" + UUID.randomUUID().toString().substring(0, 8);
        String email = handle + "@seven.test";
        auth.register(new ApiDto.Register(email, handle,
                "Pessoa Teste", "senha-segura-para-homologacao"));
        String ip = "192.0.2." + (10 + (Math.abs(handle.hashCode()) % 200));
        String payload = "{\"email\":\"" + email + "\",\"password\":\"senha-errada\"}";

        for (int i = 1; i <= 7; i++) {
            mvc.perform(post("/api/v1/auth/login").with(request -> {
                        request.setRemoteAddr(ip);
                        return request;
                    }).contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/v1/auth/login").with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                }).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "900"))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        // Counter must remain committed even though the previous response was HTTP 429.
        mvc.perform(post("/api/v1/auth/login").with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                }).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void validCredentialsClearEmailAttemptsAfterSuccess() {
        String handle = "clear_" + UUID.randomUUID().toString().substring(0, 8);
        String email = handle + "@seven.test";
        auth.register(new ApiDto.Register(email, handle,
                "Pessoa Teste", "senha-segura-para-homologacao"));
        String ip = "198.51.100." + (10 + (Math.abs(handle.hashCode()) % 200));

        for (int i = 0; i < 3; i++) throttle.loginAttempt(email, ip);
        assertNotNull(auth.login(new ApiDto.Login(email, "senha-segura-para-homologacao")));
        throttle.clearSuccessfulLogin(email);
        for (int i = 0; i < 7; i++) {
            assertDoesNotThrow(() -> throttle.loginAttempt(email, ip));
        }
        assertThrows(ApiExceptions.TooManyRequests.class,
                () -> throttle.loginAttempt(email, ip));
    }

    @Test
    void registrationQuotaIsSharedByAllCallsToTheDatabase() {
        String ip = "203.0.113." + (10 + UUID.randomUUID().toString().charAt(0) % 40);
        for (int i = 0; i < 14; i++) assertDoesNotThrow(() -> throttle.registrationAttempt(ip));
        assertThrows(ApiExceptions.TooManyRequests.class,
                () -> throttle.registrationAttempt(ip));
        assertThrows(ApiExceptions.TooManyRequests.class,
                () -> throttle.registrationAttempt(ip));
    }
}
