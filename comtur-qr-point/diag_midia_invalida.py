#!/usr/bin/env python3
"""Diagnose 'Mídia inválida' for gastronomy media payload."""
from pathlib import Path
import re, subprocess, json

# helper normalize media validation
for path in [
    Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-content.js"),
]:
    t = path.read_text(encoding="utf-8")
    print("FILE", path)
    for m in re.finditer(r".{0,80}[Mm]ídia inválida.{0,200}|.{0,80}media invalida.{0,200}|invalid.?media", t, re.I):
        print("HIT", m.group(0).replace("\n"," ")[:240])
    # find media normalize function
    for pat in [r"function normalizeMedia[\s\S]{0,1200}", r"media[\s\S]{0,40}kind[\s\S]{0,400}", r"normalize\(.*media"]:
        ms = list(re.finditer(pat, t))
        print(pat[:30], len(ms))
    i = t.find("Mídia inválida")
    if i < 0:
        i = t.find("midia invalida")
    print("CTX", t[max(0,i-500):i+300] if i>=0 else "not in helper")

# container helper
c = subprocess.check_output(["docker","exec","api","cat","/app/helpers/comtur-content.js"], text=True, errors="replace")
i = c.find("Mídia inválida")
print("\nCONTAINER", c[max(0,i-600):i+400] if i>=0 else "not in container")

# admin gastroMedia push / upload
admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
print("\nMídia inválida in admin", admin.count("Mídia inválida"))
for needle in ["gastroMedia.push", "function renderGastroGallery", "uploadGastro", "gastroCover"]:
    print(needle, admin.find(needle))
idx = admin.find("gastroMedia.push")
print("PUSH", admin[idx-200:idx+600])
idx2 = admin.find("async function uploadGastro")
if idx2 < 0:
    idx2 = admin.find("gastroMedia")
# find upload handler
for m in re.finditer(r"async function [a-zA-Z]*[Gg]astro[a-zA-Z]*", admin):
    print("FN", m.group(0))
i = admin.find("function addGastro")
print(admin[admin.find("gastroMedia ="):admin.find("gastroMedia =")+200])

# sample media object construction
for m in re.finditer(r"gastroMedia\.push\((\{[\s\S]{0,500}?\})\)", admin):
    print("OBJ", m.group(1)[:500])

# model media schema
model = Path("/home/semit/Documentos/api-semit/backend/models/ComturContent.js").read_text(encoding="utf-8")
print("\nMODEL MEDIA", re.search(r"media: \[\{[\s\S]{0,400}\}\]", model).group(0) if re.search(r"media: \[\{[\s\S]{0,400}\}\]", model) else "?")
