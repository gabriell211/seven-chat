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
class CommunityIntegrationTest {
    @Autowired AuthService auth;
    @Autowired CommunityService groups;
    @Autowired SocialService social;

    private UUID create(String handle) {
        return auth.register(new ApiDto.Register(handle + "@seven.test", handle,
                "Pessoa " + handle, "senha-muito-segura-12345")).user().id();
    }

    @Test
    void privateGroupRequiresExplicitInviteAndSupportsRealMessages() {
        UUID owner = create("group_owner_a");
        UUID guest = create("group_guest_a");
        UUID outsider = create("group_outsider_a");
        CommunityDto.Group group = groups.create(owner,
                new CommunityDto.CreateGroup("Equipe Seven", "Conversas da equipe"));
        assertEquals(1, group.memberCount());
        assertEquals(1, groups.mine(owner).size());
        assertTrue(groups.mine(guest).isEmpty());
        assertThrows(ApiExceptions.NotFound.class, () -> groups.get(guest, group.id()));
        assertThrows(ApiExceptions.NotFound.class,
                () -> groups.messages(outsider, group.id(), null, 10));

        CommunityDto.Invitation invitation = groups.invite(owner, group.id(),
                new CommunityDto.InviteUser("group_guest_a"));
        assertEquals("PENDING", invitation.status());
        assertEquals(1, groups.invitations(guest).size());
        assertThrows(ApiExceptions.NotFound.class,
                () -> groups.accept(outsider, invitation.id()));
        assertThrows(ApiExceptions.NotFound.class,
                () -> groups.invite(guest, group.id(), new CommunityDto.InviteUser("group_outsider_a")));

        CommunityDto.Group joined = groups.accept(guest, invitation.id());
        assertEquals(2, joined.memberCount());
        assertTrue(groups.invitations(guest).isEmpty());
        assertThrows(ApiExceptions.NotFound.class, () -> groups.accept(guest, invitation.id()));

        UUID mutation = UUID.randomUUID();
        CommunityDto.Message sent = groups.send(guest, group.id(),
                new CommunityDto.SendMessage(mutation, "Mensagem persistida no grupo"));
        assertEquals(sent.id(), groups.send(guest, group.id(),
                new CommunityDto.SendMessage(mutation, "Mensagem persistida no grupo")).id());
        assertThrows(ApiExceptions.Conflict.class, () -> groups.send(guest, group.id(),
                new CommunityDto.SendMessage(mutation, "Tentativa de alterar a mensagem")));
        assertEquals(1, groups.messages(owner, group.id(), null, 10).data().size());
        assertThrows(ApiExceptions.NotFound.class, () -> groups.send(outsider, group.id(),
                new CommunityDto.SendMessage(UUID.randomUUID(), "Não autorizado")));

        groups.leave(guest, group.id());
        assertEquals(1, groups.get(owner, group.id()).memberCount());
        assertThrows(ApiExceptions.NotFound.class,
                () -> groups.messages(guest, group.id(), null, 10));
        assertThrows(ApiExceptions.InvalidInput.class, () -> groups.leave(owner, group.id()));
        groups.delete(owner, group.id());
        assertTrue(groups.mine(owner).isEmpty());
    }

    @Test
    void invitationsHonorBlocksAndDeclines() {
        UUID owner = create("group_owner_b");
        UUID guest = create("group_guest_b");
        UUID stranger = create("group_stranger_b");
        CommunityDto.Group room = groups.create(owner,
                new CommunityDto.CreateGroup("Grupo seguro", ""));

        social.block(owner, guest);
        assertThrows(ApiExceptions.Forbidden.class, () ->
                groups.invite(owner, room.id(), new CommunityDto.InviteUser("group_guest_b")));
        social.unblock(owner, guest);

        CommunityDto.Invitation invited = groups.invite(owner, room.id(),
                new CommunityDto.InviteUser("group_guest_b"));
        groups.decline(guest, invited.id());
        assertTrue(groups.invitations(guest).isEmpty());
        assertThrows(ApiExceptions.NotFound.class, () -> groups.decline(guest, invited.id()));

        CommunityDto.Invitation newInvite = groups.invite(owner, room.id(),
                new CommunityDto.InviteUser("group_guest_b"));
        assertEquals(newInvite.id(), invited.id());
        social.block(guest, owner);
        assertThrows(ApiExceptions.Forbidden.class,
                () -> groups.accept(guest, newInvite.id()));
        assertTrue(groups.mine(stranger).isEmpty());
    }

    @Test
    void paginatesGroupMessagesAndPreventsCrossRoomMutationReuse() {
        UUID owner = create("group_owner_c");
        UUID other = create("group_other_c");
        CommunityDto.Group one = groups.create(owner,
                new CommunityDto.CreateGroup("Grupo Alpha", ""));
        CommunityDto.Group two = groups.create(owner,
                new CommunityDto.CreateGroup("Grupo Beta", ""));
        UUID mutation = UUID.randomUUID();
        groups.send(owner, one.id(), new CommunityDto.SendMessage(mutation, "primeira"));
        groups.send(owner, one.id(), new CommunityDto.SendMessage(UUID.randomUUID(), "segunda"));
        groups.send(owner, one.id(), new CommunityDto.SendMessage(UUID.randomUUID(), "terceira"));
        CommunityDto.Page<CommunityDto.Message> first = groups.messages(owner, one.id(), null, 2);
        assertEquals(2, first.data().size());
        assertNotNull(first.nextCursor());
        CommunityDto.Page<CommunityDto.Message> next =
                groups.messages(owner, one.id(), first.nextCursor(), 2);
        assertEquals(1, next.data().size());
        assertNull(next.nextCursor());
        assertThrows(ApiExceptions.InvalidInput.class,
                () -> groups.messages(owner, one.id(), null, 51));
        assertThrows(ApiExceptions.Conflict.class,
                () -> groups.send(owner, two.id(),
                        new CommunityDto.SendMessage(mutation, "primeira")));
        assertThrows(ApiExceptions.NotFound.class,
                () -> groups.get(other, one.id()));
    }
}
