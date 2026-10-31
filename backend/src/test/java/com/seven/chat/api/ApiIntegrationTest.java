package com.seven.chat.api;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ApiIntegrationTest {
    @Autowired private AuthService auth;
    @Autowired private PostService posts;

    private ApiDto.Register account(String email, String handle) {
        return new ApiDto.Register(email, handle, "Pessoa Seven", "uma-senha-de-testes-123");
    }

    @Test
    void registrationLoginAndLogout() {
        ApiDto.Session created = auth.register(account("first@seven.test", "firstone"));
        assertEquals("Bearer", created.tokenType());
        assertEquals("firstone", created.user().handle());
        assertTrue(auth.authenticate(created.accessToken()).isPresent());

        ApiDto.Session logged = auth.login(new ApiDto.Login(" FIRST@SEVEN.TEST ", "uma-senha-de-testes-123"));
        assertNotEquals(created.accessToken(), logged.accessToken());

        auth.logout(created.accessToken());
        assertTrue(auth.authenticate(created.accessToken()).isEmpty());
        assertTrue(auth.authenticate(logged.accessToken()).isPresent());
    }

    @Test
    void rejectsDuplicateEmailAndReservedHandle() {
        auth.register(account("second@seven.test", "secondone"));
        assertThrows(ApiExceptions.Conflict.class,
                () -> auth.register(account("SECOND@seven.test", "otherone")));
        assertThrows(ApiExceptions.InvalidInput.class,
                () -> auth.register(account("other@seven.test", "admin")));
    }

    @Test
    void invalidCredentialsNeverStartASession() {
        auth.register(account("third@seven.test", "thirdone"));
        assertThrows(ApiExceptions.Unauthorized.class,
                () -> auth.login(new ApiDto.Login("third@seven.test", "wrong")));
        assertTrue(auth.authenticate("not-a-valid-token").isEmpty());
    }

    @Test
    void twoAccountsSeeOneFeedWithCursorAndIdempotentWrites() {
        ApiDto.Session one = auth.register(account("fourth@seven.test", "fourthone"));
        ApiDto.Session two = auth.register(account("fifth@seven.test", "fifthone"));
        UUID request = UUID.randomUUID();
        ApiDto.Post post1 = posts.publish(one.user().id(), new ApiDto.CreatePost(request, "Olá, mundo"));
        ApiDto.Post retry = posts.publish(one.user().id(), new ApiDto.CreatePost(request, "Olá, mundo"));
        assertEquals(post1.id(), retry.id());

        ApiDto.Post post2 = posts.publish(two.user().id(),
                new ApiDto.CreatePost(UUID.randomUUID(), "Outro post"));
        ApiDto.Feed firstPage = posts.feed(null, 1);
        assertEquals(1, firstPage.data().size());
        assertEquals(post2.id(), firstPage.data().get(0).id());
        assertNotNull(firstPage.nextCursor());
        assertEquals(post1.id(), posts.feed(firstPage.nextCursor(), 1).data().get(0).id());
    }

    @Test
    void invalidInputCannotPublish() {
        ApiDto.Session user = auth.register(account("sixth@seven.test", "sixthone"));
        assertThrows(ApiExceptions.InvalidInput.class,
                () -> posts.publish(user.user().id(),
                        new ApiDto.CreatePost(UUID.randomUUID(), "     ")));
        assertThrows(ApiExceptions.InvalidInput.class, () -> posts.feed(-1L, 20));
        assertThrows(ApiExceptions.InvalidInput.class, () -> posts.feed(null, 1000));
    }
}
