#!/usr/bin/env python3
import os

PATHS = [
    "/home/semit/Documentos/api-semit/backend/public/iluminacao/main.dart.js",
]

transparent_tile = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

for path in PATHS:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        content = content.replace(
            "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        )
        content = content.replace(
            "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
            transparent_tile
        )

        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated:", path)

print("Iluminacao tiles patched successfully.")
