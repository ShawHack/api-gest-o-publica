#!/usr/bin/env bash
# Deploy UX mobile Memorial (CemeterySearchPage) — rodar no servidor após upload via pscp,
# ou usar o script PowerShell deploy-memorial-mobile-ux.ps1 a partir do Windows.
set -euo pipefail
APP="${HOME}/Documentos/api-semit"
FRONT="${APP}/frontend"
cd "${FRONT}"
cp -f src/App.server.js src/App.js
npm run build
echo "Build OK. Nginx serve frontend/build — hard refresh no celular (Ctrl+Shift+R / limpar cache)."
