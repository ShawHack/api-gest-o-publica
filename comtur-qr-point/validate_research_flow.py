#!/usr/bin/env python3
"""Validate research dispatcher + create/publish via API if possible."""
from pathlib import Path
import json, re, subprocess, os

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")

# extract showFields / specialized usage
for needle in ["specializedMap", "standardFields", "Formulário especializado ainda não configurado", "showCategory", "applyType"]:
    idxs = [m.start() for m in re.finditer(re.escape(needle), admin)]
    print(needle, "count", len(idxs))
    for i in idxs[:3]:
        print(" ", repr(admin[i:i+220]))

# CATEGORIES entry for research
m = re.search(r"\{\s*id:\s*'research'[^}]+\}", admin)
print("CAT", m.group(0) if m else None)

# backend helper allowed types
helper = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-content.js")
ht = helper.read_text(encoding="utf-8") if helper.exists() else ""
print("helper research", "research" in ht)
for m in re.finditer(r".{0,60}research.{0,80}", ht):
    print("H", m.group(0).replace("\n"," ")[:160])

# controller status transition / types
ctrl = Path("/home/semit/Documentos/api-semit/backend/controllers/ComturContentController.js")
if not ctrl.exists():
    # find
    for p in Path("/home/semit/Documentos/api-semit/backend").rglob("*Comtur*Content*"):
        print("FOUND", p)
        ctrl = p
ct = ctrl.read_text(encoding="utf-8") if ctrl.exists() else ""
print("ctrl", ctrl, "research mentions", ct.count("research"))
for pat in ["ALLOWED_TYPES", "CONTENT_TYPES", "validTypes", "type ===", "status"]:
    if pat in ct:
        print("ctrl has", pat)

# Try create via node inside api container if available
print("--- docker ps api ---")
subprocess.run("docker ps --format '{{.Names}}' | head -40", shell=True)

# Check mount of pesquisas in nginx container
print("--- nginx mount ---")
subprocess.run("docker exec nginx ls -la /opt/backend-public/turismo/pesquisas", shell=True)

# Confirm specialized form shown for research: map has research and warning only when missing
warn_block = None
idx = admin.find("Formulário especializado ainda não configurado")
print("WARN_CTX", repr(admin[idx-200:idx+180]))
