#!/usr/bin/env bash
# Remove audit logs antigos (LGPD — retenção). Cron: domingo 03:45 (install-fase4-ops.sh).
set -euo pipefail
ROOT="${REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
echo "[$(date -Iseconds)] audit-log-retention (tiers por tipo)"
cd "$ROOT"
docker compose exec -T api node -e "
require('dotenv').config({ path: '/app/.env' });
const mongoose = require('mongoose');
const { purgeOldAuditLogs } = require('./helpers/audit-log-retention');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const r = await purgeOldAuditLogs();
  console.log(JSON.stringify(r));
  await mongoose.connection.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
"
