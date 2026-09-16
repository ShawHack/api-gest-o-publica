#!/usr/bin/env python3
from pathlib import Path
t = Path("/home/semit/Documentos/api-semit/backend/public/turismo/assets/index-BsvdOgSz.js").read_text(encoding="utf-8")
print("Ver mapa", t.count("Ver mapa"))
needle = "Escolhas da gestão para quem chega agora."
i = t.find(needle)
print(t[i-80:i+160])
