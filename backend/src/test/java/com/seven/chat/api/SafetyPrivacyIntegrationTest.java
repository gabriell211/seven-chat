package com.seven.chat.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SafetyPrivacyIntegrationTest {
    @Autowired AuthService auth;
    @Autowired SafetyService safety;
    @Autowired PrivacyService privacy;
    @Autowired CommunityService groups;
    @Autowired PostService posts;
    @Autowired NamedParameterJdbcTemplate sql;

    private ApiDto.Session account(String handle) {
        return auth.register(new ApiDto.Register(handle + "@seven.test",
                handle, "Pessoa " + handle, "senha-de-teste-segura-2026"));
    }

    @Test
    void reportsRequireRealTargetsAndOnlyModeratorsMayReview() {
        ApiDto.Session reporter = account("report_sender");
        ApiDto.Session author = account("report_author");
        ApiDto.Session reviewer = account("report_reviewer");
        ApiDto.Post post = posts.publish(author.user().id(),
                new ApiDto.CreatePost(UUID.randomUUID(), "Conteúdo para moderação"));

        SafetyDto.Report complaint = safety.report(reporter.user().id(),
                new SafetyDto.ReportInput("post", Long.toString(post.id()),
                        "harassment", "Conteúdo ofensivo"));
        assertEquals("OPEN", complaint.status());
        assertEquals(1, safety.mine(reporter.user().id()).size());
        assertTrue(safety.mine(author.user().id()).isEmpty());
        assertThrows(ApiExceptions.InvalidInput.class,
                () -> safety.report(reporter.user().id(),
                        new SafetyDto.ReportInput("post", Long.toString(post.id()),
                                "spam", "Denúncia duplicada")));
        assertThrows(ApiExceptions.NotFound.class,
                () -> safety.report(reporter.user().id(),
                        new SafetyDto.ReportInput("post", "99999999", "spam", "")));
        assertThrows(ApiExceptions.InvalidInput.class,
                () -> safety.report(author.user().id(),
                        new SafetyDto.ReportInput("account", author.user().id().toString(),
                                "other", "")));
        assertThrows(ApiExceptions.Forbidden.class,
                () -> safety.queue(reporter.user().id(), "OPEN"));
        assertThrows(ApiExceptions.Forbidden.class,
                () -> safety.review(author.user().id(), complaint.id(),
                        new SafetyDto.ReviewInput("RESOLVED", "Analisado")));

        // Moderator powers are assigned server-side, never through user-provided roles.
        sql.update("INSERT INTO moderation_roles (account_id) VALUES (:id)",
                Map.of("id", reviewer.user().id()));
        assertEquals(1, safety.queue(reviewer.user().id(), "OPEN").size());
        SafetyDto.Report handled = safety.review(reviewer.user().id(), complaint.id(),
                new SafetyDto.ReviewInput("REVIEWING", "Investigação aberta"));
        assertEquals("REVIEWING", handled.status());
        assertEquals(1, safety.queue(reviewer.user().id(), "REVIEWING").size());
        assertThrows(ApiExceptions.InvalidInput.class,
                () -> safety.queue(reviewer.user().id(), "BROKEN"));
    }

    @Test
    void groupMessagesRequireMembershipBeforeReports() {
        ApiDto.Session owner = account("abuse_gowner");
        ApiDto.Session outsider = account("abuse_outside");
        CommunityDto.Group group = groups.create(owner.user().id(),
                new CommunityDto.CreateGroup("Equipe segurança", ""));
        CommunityDto.Message message = groups.send(owner.user().id(), group.id(),
                new CommunityDto.SendMessage(UUID.randomUUID(), "Mensagem teste"));
        SafetyDto.ReportInput report = new SafetyDto.ReportInput(
                "group_message", Long.toString(message.id()), "spam", "Revisar conteúdo");
        assertThrows(ApiExceptions.NotFound.class,
                () -> safety.report(outsider.user().id(), report));
        // Self-reporting a message is permitted for emergency disclosure.
        assertEquals("OPEN", safety.report(owner.user().id(), report).status());
    }

    @Test
    void portableExportExcludesSecretsAndDeletionRequiresPasswordAndConfirmation() {
        ApiDto.Session owner = account("privacy_owner");
        ApiDto.Session other = account("privacy_other");
        UUID me = owner.user().id();
        posts.publish(me, new ApiDto.CreatePost(UUID.randomUUID(), "Meu post privado"));
        posts.publish(other.user().id(),
                new ApiDto.CreatePost(UUID.randomUUID(), "Post alheio secreto"));
        SafetyDto.Consent record = privacy.recordConsent(me,
                new SafetyDto.ConsentInput("marketing", "2026.11", true));
        assertTrue(record.granted());
        assertEquals(1, privacy.consents(me).size());
        privacy.recordConsent(me, new SafetyDto.ConsentInput("marketing", "2026.11", false));
        assertFalse(privacy.consents(me).get(0).granted());

        Map<String, Object> snapshot = privacy.export(me);
        String jsonish = snapshot.toString();
        assertTrue(jsonish.contains("Meu post privado"));
        assertFalse(jsonish.contains("Post alheio secreto"));
        assertFalse(jsonish.contains("senha-de-teste-segura-2026"));
        assertFalse(jsonish.contains(owner.accessToken()));
        assertFalse(jsonish.contains("password_hash"));
        assertFalse(jsonish.contains("token_hash"));

        assertThrows(ApiExceptions.InvalidInput.class,
                () -> privacy.erase(me,
                        new SafetyDto.DeleteAccountInput("senha-de-teste-segura-2026", "DELETE")));
        assertThrows(ApiExceptions.Forbidden.class,
                () -> privacy.erase(me,
                        new SafetyDto.DeleteAccountInput("senha-incorreta", "DELETE MY ACCOUNT")));

        privacy.erase(me, new SafetyDto.DeleteAccountInput(
                "senha-de-teste-segura-2026", "DELETE MY ACCOUNT"));
        assertTrue(auth.authenticate(owner.accessToken()).isEmpty());
        assertThrows(ApiExceptions.Unauthorized.class, () -> privacy.export(me));
        assertNotNull(auth.me(other.user().id()));
    }
}
