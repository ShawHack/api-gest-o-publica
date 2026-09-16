#!/bin/bash
set -e
python3 /tmp/patch_sidebar_logo_size.py
echo ===BRANDING===
grep -n 'uiLogoHeight: 48' /home/semit/Documentos/sd_docs/apps/web/src/lib/branding.ts
echo ===CSS_LOGO===
sed -n '239,255p' /home/semit/Documentos/sd_docs/apps/web/src/app/globals.css
echo ===CSS_BRAND===
sed -n '138,152p' /home/semit/Documentos/sd_docs/apps/web/src/app/globals.css
echo ===DB===
docker exec sd_docs-postgres psql -U postgres -d sd_docs -c 'UPDATE "OrganizationBranding" SET "uiLogoHeight" = 48 WHERE "uiLogoHeight" IS NULL OR "uiLogoHeight" <= 35; SELECT "productName", "uiLogoHeight", "uiLogoWidth" FROM "OrganizationBranding";'
