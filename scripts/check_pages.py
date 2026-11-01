#!/usr/bin/env python3
"""Fail CI if an Android navigation route lacks a real page or an explicit feature gate."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
activity = (root / "app/src/main/java/com/seven/chat/OnlineActivity.java").read_text()
manifest = (root / "app/src/main/AndroidManifest.xml").read_text()
controller = (root / "backend/src/main/java/com/seven/chat/api/SocialController.java").read_text()
auth = (root / "backend/src/main/java/com/seven/chat/api/ApiController.java").read_text()

functional = {
    "feed", "explore", "compose", "chats", "profile", "notifications", "saved",
    "comments", "user", "thread", "settings", "followers", "following", "blocks",
    "server", "login", "register", "bootstrap", "groups", "group-invites", "group-thread",
}
gated = {"stories", "reels", "rooms", "live", "calls", "gifts", "wallet", "vip"}
required_navigation = {
    "feed", "explore", "compose", "chats", "profile", "notifications", "saved",
    "stories", "reels", "groups", "rooms", "live", "calls", "gifts", "wallet", "vip", "settings",
}
backend_routes = {
    '"/users"', '"/users/{handle}"', '"/users/me"',
    '"/conversations"', '"/conversations/{other}/messages"',
    '"/notifications"', '"/posts/{id}/comments"',
    '"/posts/{id}/like"', '"/posts/{id}/save"',
    '"/users/{id}/followers"', '"/users/{id}/following"',
    '"/users/me/blocks"', '"/users/{id}/block"', '"/features"',
}
auth_routes = {'"/auth/register"', '"/auth/login"', '"/auth/me"', '"/auth/logout"', '"/posts"'}
problems = []

match = re.search(r'String\[\]\s+routes\s*=\s*\{([^}]+)\}', activity, re.S)
if not match:
    problems.append("Menu central de páginas não foi encontrado")
    nav = []
else:
    nav = re.findall(r'"([a-z]+)"', match.group(1))
if len(set(nav)) != len(nav):
    problems.append("O menu contém páginas duplicadas")
if set(nav) != required_navigation:
    problems.append(f"Menu divergente: ausentes={required_navigation-set(nav)}, extras={set(nav)-required_navigation}")

page_switch = activity.split("switch (next) {", 1)
if len(page_switch) != 2:
    problems.append("Bloco central de roteamento não encontrado")
    cases = set()
else:
    page_section = page_switch[1].split("\n        }\n\n        if (api.isSignedIn()", 1)[0]
    cases = set(re.findall(r'case\s+"([a-z-]+)"\s*:\s*', page_section))
if not functional <= cases:
    problems.append(f"Páginas funcionais sem implementação: {functional-cases}")
if (set(nav) - cases) != gated:
    problems.append(f"Rotas sem implementação/gate explícito: {(set(nav)-cases)^gated}")
if not 'default: capabilityScreen(next);' in activity:
    problems.append("Faltou bloquear funcionalidades ainda não homologadas")
if not 'capabilities.optBoolean(flag, false)' in activity:
    problems.append("Funcionalidades não estão bloqueadas por padrão")
if not 'android.permission.INTERNET' in manifest:
    problems.append("AndroidManifest não solicita permissão de internet")
if not re.search(r'android:name="\.OnlineActivity"[\s\S]{0,400}android.intent.action.MAIN', manifest):
    problems.append("Atividade online não é o launcher Android")
if not backend_routes <= {f'"{x}"' for x in re.findall(r'@"?\w+Mapping\("([^"]+)"', controller)}:
    # RequestMapping for profile edits is supported separately.
    available = {f'"{x}"' for x in re.findall(r'@(?:Get|Post|Delete|Patch)Mapping\("([^"]+)"', controller)}
    available.add('"/users/me"') if 'path = "/users/me"' in controller else None
    problems.extend(f"Rota social não declarada: {x}" for x in sorted(backend_routes-available))
available_auth = {f'"{x}"' for x in re.findall(r'@(?:Get|Post|Delete|Patch)Mapping\("([^"]+)"', auth)}
problems.extend(f"Rota de autenticação não declarada: {x}" for x in sorted(auth_routes-available_auth))

if problems:
    print("FALHA NA AUDITORIA DE PÁGINAS")
    for problem in problems:
        print(" -", problem)
    sys.exit(1)
print(f"OK: {len(nav)} itens do menu, {len(functional)} rotas funcionais e {len(gated)} rotas bloqueadas.")
