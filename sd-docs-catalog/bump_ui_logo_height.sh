#!/bin/sh
set -e
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
UPDATE organization_brandings
SET ui_logo_height = 48
WHERE ui_logo_height IS NULL OR ui_logo_height <= 35;
SELECT product_name, ui_logo_height, ui_logo_width FROM organization_brandings;
SQL
