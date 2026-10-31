package com.seven.chat.api;

import java.util.List;
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
class SocialIntegrationTest {
    @Autowired AuthService auth;
    @Autowired PostService posts;
    @Autowired SocialService social;

    private ApiDto.Session user(String handle) {
        return auth.register(new ApiDto.Register(handle + "@seven.test",
                handle, "Pessoa " + handle, "senha-longa-segura-12345"));
    }

    @Test
    void searchAndProfilesComeFromDatabaseAndCanBeUpdated() {
        ApiDto.Session first = user("person_one");
        ApiDto.Session second = user("person_two");
        assertTrue(social.search(first.user().id(), "person_two").stream()
                .anyMatch(p -> p.id().equals(second.user().id())));
        assertEquals("Pessoa person_one",
                social.profile(first.user().id(), "person_one").displayName());
        SocialDto.Profile edited = social.updateProfile(first.user().id(),
                new SocialDto.EditProfile("Nome editado", "Bio real"));
        assertEquals("Nome editado", edited.displayName());
        assertEquals("Bio real", edited.bio());
    }

    @Test
    void followUnfollowAndBlockAreEnforcedAcrossFeed() {
        ApiDto.Session one = user("one_block");
        ApiDto.Session two = user("two_block");
        social.follow(one.user().id(), two.user().id());
        assertTrue(social.profile(one.user().id(), "two_block").followedByMe());
        assertEquals(1, social.notifications(two.user().id()).size());
        ApiDto.Post publicPost = posts.publish(two.user().id(),
                new ApiDto.CreatePost(UUID.randomUUID(), "Post do segundo"));
        assertEquals(publicPost.id(), posts.feed(one.user().id(), null, 20).data().get(0).id());
        social.block(one.user().id(), two.user().id());
        assertTrue(posts.feed(one.user().id(), null, 20).data().isEmpty());
        assertTrue(social.search(one.user().id(), "two_block").isEmpty());
        assertThrows(ApiExceptions.NotFound.class,
                () -> social.profile(one.user().id(), "two_block"));
        assertThrows(ApiExceptions.Forbidden.class,
                () -> social.engage(one.user().id(), publicPost.id(), true, true));
        assertThrows(ApiExceptions.Forbidden.class,
                () -> social.send(two.user().id(), one.user().id(),
                        new SocialDto.CreateMessage(UUID.randomUUID(), "Não deve chegar")));
        social.unblock(one.user().id(), two.user().id());
        assertFalse(posts.feed(one.user().id(), null, 20).data().isEmpty());
        assertFalse(social.profile(one.user().id(), "two_block").followedByMe());
    }

    @Test
    void likesSavedCommentsAndNotificationsAreRealRows() {
        ApiDto.Session author = user("post_owner");
        ApiDto.Session reader = user("post_reader");
        ApiDto.Post post = posts.publish(author.user().id(),
                new ApiDto.CreatePost(UUID.randomUUID(), "Nova publicação"));
        assertTrue(social.saved(reader.user().id(), null, 10).data().isEmpty());
        SocialDto.Engagement liked = social.engage(reader.user().id(), post.id(), true, true);
        assertEquals(1, liked.likes());
        social.engage(reader.user().id(), post.id(), false, true);
        assertEquals(post.id(), social.saved(reader.user().id(), null, 10).data().get(0).id());
        SocialDto.Comment comment = social.comment(reader.user().id(), post.id(),
                new SocialDto.CreateComment("Comentário de verdade"));
        assertEquals(1, social.comments(reader.user().id(), post.id()).size());
        assertEquals(1, social.engagement(reader.user().id(), post.id()).comments());
        assertEquals(2, social.notifications(author.user().id()).size());
        social.deleteComment(reader.user().id(), comment.id());
        assertTrue(social.comments(reader.user().id(), post.id()).isEmpty());
        social.engage(reader.user().id(), post.id(), true, false);
        social.engage(reader.user().id(), post.id(), false, false);
        assertEquals(0, social.engagement(reader.user().id(), post.id()).likes());
        assertTrue(social.saved(reader.user().id(), null, 10).data().isEmpty());
    }

    @Test
    void directMessagesAndInboxRequireAuthorization() {
        ApiDto.Session first = user("msg_first");
        ApiDto.Session second = user("msg_second");
        ApiDto.Session stranger = user("msg_stranger");
        UUID key = UUID.randomUUID();
        SocialDto.Message sent = social.send(first.user().id(), second.user().id(),
                new SocialDto.CreateMessage(key, "Olá!"));
        assertEquals(sent.id(), social.send(first.user().id(), second.user().id(),
                new SocialDto.CreateMessage(key, "Olá!")).id());
        assertThrows(ApiExceptions.Conflict.class,
                () -> social.send(first.user().id(), second.user().id(),
                        new SocialDto.CreateMessage(key, "Troca inválida")));
        assertEquals(1, social.messages(first.user().id(), second.user().id(), null, 20).data().size());
        assertEquals(1, social.messages(second.user().id(), first.user().id(), null, 20).data().size());
        assertEquals(1, social.conversations(first.user().id()).size());
        assertEquals(second.user().id(), social.conversations(first.user().id()).get(0).peerId());
        assertTrue(social.conversations(stranger.user().id()).isEmpty());
        assertThrows(ApiExceptions.InvalidInput.class,
                () -> social.send(first.user().id(), first.user().id(),
                        new SocialDto.CreateMessage(UUID.randomUUID(), "Auto mensagem")));
        assertEquals("message", social.notifications(second.user().id()).get(0).eventType());
    }

    @Test
    void onlyOwnerCanDeleteOwnPostAndNotifications() {
        ApiDto.Session first = user("del_first");
        ApiDto.Session second = user("del_second");
        ApiDto.Post post = posts.publish(first.user().id(),
                new ApiDto.CreatePost(UUID.randomUUID(), "Post protegido"));
        assertThrows(ApiExceptions.NotFound.class,
                () -> social.deletePost(second.user().id(), post.id()));
        social.follow(second.user().id(), first.user().id());
        SocialDto.Notification notice = social.notifications(first.user().id()).get(0);
        assertThrows(ApiExceptions.NotFound.class,
                () -> social.markRead(second.user().id(), notice.id()));
        social.markRead(first.user().id(), notice.id());
        assertTrue(social.notifications(first.user().id()).get(0).seen());
        social.deletePost(first.user().id(), post.id());
        assertTrue(posts.feed(first.user().id(), null, 20).data().isEmpty());
    }
}
