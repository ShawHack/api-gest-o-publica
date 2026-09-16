#!/usr/bin/env python3
import os

PATHS = [
    "/home/semit/Documentos/api-semit/mapaturistico/public/index.html",
    "/home/semit/Documentos/api-semit/mapaturistico/public/admin.html",
    "/home/semit/Documentos/api-gestao-publica/mapaturistico/public/index.html",
    "/home/semit/Documentos/api-gestao-publica/mapaturistico/public/admin.html",
]

DARK_CSS = """
    /* Clean Dark Mode filter for OpenStreetMap Tiles (No API key / No watermark) */
    .map-tiles-dark .leaflet-tile {
      filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
    }
"""

for path in PATHS:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        if ".map-tiles-dark .leaflet-tile" not in content:
            content = content.replace("</style>", DARK_CSS + "\n  </style>", 1)

        content = content.replace(
            "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        )
        content = content.replace(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        )

        if "className: 'map-tiles-dark'" not in content:
            content = content.replace("maxZoom: 19", "maxZoom: 19,\n      className: 'map-tiles-dark'")
            content = content.replace("maxZoom:19", "maxZoom:19, className: 'map-tiles-dark'")

        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated:", path)

print("All mapaturistico files updated successfully.")
