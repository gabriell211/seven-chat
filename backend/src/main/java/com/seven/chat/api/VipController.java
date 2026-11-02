package com.seven.chat.api;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only view of billing-attested VIP. Never grants access from a client request. */
@RestController
@RequestMapping("/api/v1/vip")
public class VipController {
    private final VipEntitlementService entitlements;

    public VipController(VipEntitlementService entitlements) {
        this.entitlements = entitlements;
    }

    @GetMapping("/me")
    public VipEntitlementService.Status myVip(Authentication principal) {
        return entitlements.status(UUID.fromString(principal.getName()));
    }
}
