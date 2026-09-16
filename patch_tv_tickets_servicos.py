#!/usr/bin/env python3
"""Corrige /api/tickets para enviar ?servicos= como a web do painel."""
import subprocess
from pathlib import Path

src = subprocess.check_output(["docker", "exec", "tv-semit", "cat", "/app/server.js"], text=True)
Path("/tmp/server.js.bak-tickets2").write_text(src, encoding="utf-8")

# Remove rota antiga se existir (entre o comentario CTIR e o app.listen)
start = src.find("// CTIR/fix: APK painel chama /tv/api/tickets")
listen = src.find("app.listen(PORT")
if start >= 0 and listen > start:
    src = src[:start] + src[listen:]
    print("removed old tickets route")

ROUTE = r'''
// CTIR/fix: APK painel chama /tv/api/tickets?unitId=N (igual web: token + servicos)
app.get('/api/tickets', async (req, res) => {
  try {
    const unitId = Number(req.query.unitId || 0);
    if (!Number.isFinite(unitId) || unitId <= 0) {
      return res.status(400).json({ message: 'unitId obrigatorio' });
    }
    const slugMap = { 4: 'sedetur', 5: 'semads', 6: 'semit', 7: 'saae' };
    const slug = slugMap[unitId] || 'semit';

    let token = '';
    let servicos = '';
    try {
      const panelsRes = await fetch('http://10.15.25.31:8088/api/panels');
      if (panelsRes.ok) {
        const panels = await panelsRes.json();
        const panel = (panels || []).find((p) => p.slug === slug) || null;
        if (panel && Array.isArray(panel.units)) {
          const ids = [];
          for (const u of panel.units) {
            if (Number(u.id) === unitId && Array.isArray(u.serviceIds)) {
              ids.push(...u.serviceIds);
            }
          }
          if (!ids.length) {
            for (const u of panel.units) {
              if (Array.isArray(u.serviceIds)) ids.push(...u.serviceIds);
            }
          }
          servicos = [...new Set(ids.map(Number).filter((n) => n > 0))].join(',');
        }
      }
    } catch (_e) {}

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
    const qs = servicos ? `?servicos=${encodeURIComponent(servicos)}` : '?servicos=';
    const novosgaRes = await fetch(`http://10.15.25.31/api/unidades/${unitId}/painel${qs}`, { headers });
    if (!novosgaRes.ok) {
      console.error('[api/tickets] novosga status', novosgaRes.status, 'unit', unitId, 'servicos', servicos);
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

listen = src.find("app.listen(PORT")
if listen < 0:
    raise SystemExit("app.listen nao encontrado")
new_src = src[:listen] + ROUTE + "\n" + src[listen:]
Path("/tmp/server.js.tickets2").write_text(new_src, encoding="utf-8")
subprocess.check_call(["docker", "cp", "/tmp/server.js.tickets2", "tv-semit:/app/server.js"])
subprocess.check_call(["docker", "restart", "tv-semit"])
print("patched ok")
