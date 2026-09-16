#!/usr/bin/env python3
"""Analyze how featured hero picks cover image + integration form hooks."""
from pathlib import Path
import re

admin = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html").read_text(encoding="utf-8")
print("integrationFields", 'id="integrationFields"' in admin)
print("int cover?", "intCover" in admin)
i = admin.find('id="integrationFields"')
print("FORM_HEAD", admin[i:i+500])
# publication section of integration
j = admin.find("btnArchiveInt")
print("NEAR_PUB", admin[j-800:j+200])

assets = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets")
f = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets/index-BsvdOgSz.js")
t = f.read_text(encoding="utf-8", errors="ignore")
# find featured image extraction near featured-hero-img
idx = t.find("featured-hero-img")
print("HERO_CTX", t[max(0,idx-500):idx+200])
# common helpers for cover
for pat in [r"function Xe\(", r"Xe=e=>", r"coverUrl", r"kind===\"image\"", r"media.find"]:
    ms=list(re.finditer(pat,t))
    print(pat, len(ms))
    for m in ms[:3]:
        print(" ", t[m.start():m.start()+180].replace("\n"," "))
