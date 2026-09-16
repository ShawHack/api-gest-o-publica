#!/usr/bin/env python3
"""Injeta rota /api/tickets no tv-semit (proxy NovoSGA interno 10.15.25.31)."""
import subprocess
from pathlib import Path

# Extrai server.js do container
src = subprocess.check_output(
    ["docker", "exec", "tv-semit", "cat", "/app/server.js"],
    text=True,
)
bak = Path("/tmp/server.js.bak-tickets")
bak.write_text(src, encoding="utf-8")
print("backup", bak, "bytes", len(src))

if "app.get('/api/tickets'" in src or 'app.get("/api/tickets"' in src:
    print("rota tickets ja existe")
    raise SystemExit(0)

ROUTE = r'''
// CTIR/fix: APK painel chama /tv/api/tickets?unitId=N (proxy NovoSGA interno)
app.get('/api/tickets', async (req, res) => {
  try {
    const unitId = Number(req.query.unitId || 0);
    if (!Number.isFinite(unitId) || unitId <= 0) {
      return res.status(400).json({ message: 'unitId obrigatorio' });
    }
    const slugMap = { 4: 'sedetur', 6: 'semit' };
    const slug = slugMap[unitId] || 'semit';
    let token = '';
    try {
      const tokenRes = await fetch(`http://10.15.25.31:8088/api/panels/${slug}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        token = tokenData.accessToken || '';
      }
    } catch (_e) {}
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const novosgaRes = await fetch(`http://10.15.25.31/api/unidades/${unitId}/painel`, { headers });
    if (!novosgaRes.ok) {
      return res.status(200).json([]);
    }
    const data = await novosgaRes.json();
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('[api/tickets]', e.message);
    return res.status(200).json([]);
  }
});

'''

# Inserir antes do app.listen
marker = "app.listen(PORT"
idx = src.find(marker)
if idx < 0:
    raise SystemExit("app.listen nao encontrado")

new_src = src[:idx] + ROUTE + "\n" + src[idx:]
Path("/tmp/server.js.tickets").write_text(new_src, encoding="utf-8")

# Copia para o container e reinicia processo
subprocess.check_call(["docker", "cp", "/tmp/server.js.tickets", "tv-semit:/app/server.js"])
subprocess.check_call(["docker", "restart", "tv-semit"])
print("patched + restarted")
