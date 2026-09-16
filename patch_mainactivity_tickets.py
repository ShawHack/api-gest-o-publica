#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime

p = Path("/home/semit/Documentos/semit_painel_native/app/src/main/java/br/gov/sp/garca/painelsenhas/MainActivity.java")
s = p.read_text(encoding="utf-8")
bak = p.with_name(f"MainActivity.java.bak-tickets-{datetime.now().strftime('%Y%m%d%H%M%S')}")
bak.write_text(s, encoding="utf-8")
print("backup", bak)

old = """            // 1. Senha atual (item 0)
            JSONObject latest = arr.getJSONObject(0);
            String latestId = latest.optString(\"id\", \"\");
            if (latestId.isEmpty()) {
                latestId = latest.optString(\"senha\", \"\") + \"_\" + latest.optInt(\"numeroLocal\", 1);
            }

            boolean isNewCall = !latestId.equals(lastTicketId);
            
            if (isNewCall || isFirstLoad) {
                lastTicketId = latestId;
                displayCurrentTicket(latest, !isFirstLoad);"""

# file has normal quotes not escaped
old = """            // 1. Senha atual (item 0)
            JSONObject latest = arr.getJSONObject(0);
            String latestId = latest.optString("id", "");
            if (latestId.isEmpty()) {
                latestId = latest.optString("senha", "") + "_" + latest.optInt("numeroLocal", 1);
            }

            boolean isNewCall = !latestId.equals(lastTicketId);
            
            if (isNewCall || isFirstLoad) {
                lastTicketId = latestId;
                displayCurrentTicket(latest, !isFirstLoad);"""

new = """            // 1. Senha atual (item 0)
            JSONObject latest = arr.getJSONObject(0);
            // id no NovoSGA vem numerico; optString em alguns Android retorna vazio
            Object idObj = latest.opt("id");
            String latestId = (idObj == null || idObj == JSONObject.NULL) ? "" : String.valueOf(idObj);
            if (latestId.isEmpty() || "null".equals(latestId)) {
                latestId = latest.optString("senha", "") + "_" + latest.optInt("numeroLocal", 1);
            }

            boolean isNewCall = !latestId.equals(lastTicketId);
            // Sempre atualiza UI quando ha senhas (evita ficar em --- se o primeiro poll falhou)
            if (isNewCall || isFirstLoad || "---".contentEquals(txtSenhaNumero.getText())) {
                lastTicketId = latestId;
                displayCurrentTicket(latest, isNewCall && !isFirstLoad);"""

if old not in s:
    # show nearby context
    idx = s.find("processTicketsList")
    print(repr(s[idx:idx+600]))
    raise SystemExit("bloco nao encontrado")

p.write_text(s.replace(old, new, 1), encoding="utf-8")
print("patched ok")

# also harden localStr against empty local
s2 = p.read_text(encoding="utf-8")
old2 = """        String local = ticket.optString("local", "Guichê");
        int numLocal = ticket.optInt("numeroLocal", ticket.optInt("numeroGuiche", 1));
        String localStr = local.substring(0, 1).toUpperCase() + local.substring(1).toLowerCase() + " " + String.format(Locale.getDefault(), "%02d", numLocal);"""
new2 = """        String local = ticket.optString("local", "Guichê");
        if (local == null || local.trim().isEmpty()) local = "Guichê";
        int numLocal = ticket.optInt("numeroLocal", ticket.optInt("numeroGuiche", 1));
        String localStr = local.substring(0, 1).toUpperCase() + local.substring(1).toLowerCase() + " " + String.format(Locale.getDefault(), "%02d", numLocal);"""
if old2 in s2:
    p.write_text(s2.replace(old2, new2, 1), encoding="utf-8")
    print("localStr hardened")
else:
    print("localStr already ok or different")
