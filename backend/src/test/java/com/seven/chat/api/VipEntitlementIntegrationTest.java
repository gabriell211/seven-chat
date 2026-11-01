package com.seven.chat.api;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
class VipEntitlementIntegrationTest {
    @Autowired AuthService auth;
    @Autowired VipEntitlementService vip;
    @Autowired CommunityService groups;
    @Autowired NamedParameterJdbcTemplate sql;

    private UUID createAccount(String handle) {
        return auth.register(new ApiDto.Register(handle + "@seven.test", handle,
                "Perfil " + handle, "senha-de-teste-muito-segura-2026")).user().id();
    }

    private void trustedGrant(UUID accountId, Instant expiry) {
        sql.update("INSERT INTO vip_entitlements " +
                "(account_id,provider,source_reference,expires_at) " +
                "VALUES (:id,'manual_verified',:reference,:expiry)",
                Map.of("id", accountId, "reference", "qa-attested-" + UUID.randomUUID(),
                        "expiry", java.sql.Timestamp.from(expiry)));
    }

    @Test
    void noGrantCannotCreateVipGroupsButOrdinaryGroupsStillWork() {
        UUID owner = createAccount("vip_no_owner");
        assertFalse(vip.status(owner).active());
        assertNull(vip.status(owner).expiresAt());
        assertThrows(ApiExceptions.Forbidden.class,
                () -> groups.create(owner, new CommunityDto.CreateGroup("VIP Reservado", "", true)));
        CommunityDto.Group ordinary = groups.create(owner,
                new CommunityDto.CreateGroup("Grupo comum", ""));
        assertFalse(ordinary.vipOnly());
        assertEquals(1, groups.get(owner, ordinary.id()).memberCount());
    }

    @Test
    void trustedGrantControlsCreationInvitesAccessExpiryAndRevocation() {
        UUID owner = createAccount("vip_owner_a");
        UUID guest = createAccount("vip_guest_a");
        UUID outsider = createAccount("vip_other_a");
        Instant expiry = Instant.now().plus(5, ChronoUnit.DAYS);
        trustedGrant(owner, expiry);
        assertTrue(vip.status(owner).active());
        CommunityDto.Group group = groups.create(owner,
                new CommunityDto.CreateGroup("Grupo VIP fechado", "Restrito", true));
        assertTrue(group.vipOnly());
        assertEquals(1, group.memberCount());
        assertThrows(ApiExceptions.Forbidden.class,
                () -> groups.create(guest, new CommunityDto.CreateGroup("Outro VIP", "", true)));

        CommunityDto.Invitation invite = groups.invite(owner, group.id(),
                new CommunityDto.InviteUser("vip_guest_a"));
        assertThrows(ApiExceptions.Forbidden.class, () -> groups.accept(guest, invite.id()));
        // The rejected acceptance must roll back and remain pending.
        assertEquals(1, groups.invitations(guest).size());
        trustedGrant(guest, expiry);
        CommunityDto.Group accepted = groups.accept(guest, invite.id());
        assertEquals(2, accepted.memberCount());
        assertTrue(groups.mine(guest).get(0).vipOnly());

        CommunityDto.Message sent = groups.send(guest, group.id(),
                new CommunityDto.SendMessage(UUID.randomUUID(), "Mensagem VIP real"));
        assertEquals(1, groups.messages(owner, group.id(), null, 20).data().size());
        assertEquals(sent.id(), groups.messages(guest, group.id(), null, 20).data().get(0).id());

        sql.update("UPDATE vip_entitlements SET revoked_at=CURRENT_TIMESTAMP " +
                "WHERE account_id=:id", Map.of("id", guest));
        assertFalse(vip.status(guest).active());
        assertThrows(ApiExceptions.Forbidden.class, () -> groups.get(guest, group.id()));
        assertThrows(ApiExceptions.Forbidden.class,
                () -> groups.messages(guest, group.id(), null, 20));
        assertThrows(ApiExceptions.Forbidden.class,
                () -> groups.send(guest, group.id(),
                        new CommunityDto.SendMessage(UUID.randomUUID(), "Pós-revogação")));
        assertThrows(ApiExceptions.NotFound.class, () -> groups.get(outsider, group.id()));
        // A former VIP can still leave the group even after a revocation.
        groups.leave(guest, group.id());

        sql.update("UPDATE vip_entitlements SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 day' " +
                "WHERE account_id=:id", Map.of("id", owner));
        assertFalse(vip.active(owner));
        assertThrows(ApiExceptions.Forbidden.class, () -> groups.get(owner, group.id()));
        // Data deletion stays available to the owner when the subscription expires.
        groups.delete(owner, group.id());
        assertTrue(groups.mine(owner).isEmpty());
    }

    @Test
    void expiredGrantAlwaysDeniesAccess() {
        UUID account = createAccount("vip_expired_a");
        trustedGrant(account, Instant.now().minus(1, ChronoUnit.DAYS));
        assertFalse(vip.active(account));
        assertThrows(ApiExceptions.Forbidden.class,
                () -> groups.create(account, new CommunityDto.CreateGroup("VIP expirado", "", true)));
    }
}
