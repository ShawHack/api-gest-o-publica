#!/bin/sh
set -eu

mkdir -p /home/semit/painel-desktop-artifacts

docker run --rm \
  -v /tmp/semit-painel-input-1.1.1.tar.gz:/input.tar.gz:ro \
  -v /home/semit/painel-desktop-artifacts:/out \
  debian:12 sh -lc '
    set -eu
    mkdir -p /tmp/pkg/DEBIAN /tmp/pkg/opt /tmp/pkg/usr/share/applications
    tar -xzf /input.tar.gz -C /tmp
    mv /tmp/painel-senhas-desktop-1.1.1 /tmp/pkg/opt/painel-tv-garca
    mkdir -p /tmp/pkg/usr/bin
    printf "Package: painel-senhas-desktop\nVersion: 1.1.1\nSection: utils\nPriority: optional\nArchitecture: amd64\nDepends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0\nMaintainer: SEMIT\nDescription: Painel de Senhas e TV Corporativa\n Cliente desktop da Prefeitura de Garça.\n" > /tmp/pkg/DEBIAN/control
    printf "[Desktop Entry]\nName=Painel TV Garça\nComment=Painel de Senhas e TV Corporativa SEMIT\nExec=/opt/painel-tv-garca/painel-tv-garca --no-sandbox\nTerminal=false\nType=Application\nCategories=Utility;\n" > /tmp/pkg/usr/share/applications/painel-tv-garca.desktop
    chmod 755 /tmp/pkg/opt/painel-tv-garca/painel-tv-garca
    ln -s /opt/painel-tv-garca/painel-tv-garca /tmp/pkg/usr/bin/painel-tv-garca
    dpkg-deb --build --root-owner-group /tmp/pkg /out/painel-senhas-desktop_1.1.1_amd64.deb
    dpkg-deb -I /out/painel-senhas-desktop_1.1.1_amd64.deb
  '
