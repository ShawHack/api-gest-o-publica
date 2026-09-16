#!/usr/bin/env python3
from pathlib import Path

admin = Path("/home/semit/Documentos/api-semit/mapaturistico/public/admin.html")
text = admin.read_text(encoding="utf-8")
if 'id="qrSection"' in text:
    print("ALREADY_PATCHED")
    raise SystemExit(0)

css = """
    .qr-box {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      align-items: flex-start;
      padding: 16px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--bg-surface, rgba(255,255,255,0.03));
    }
    .qr-box #qrCanvas {
      background: #fff;
      padding: 12px;
      border-radius: 12px;
      min-width: 180px;
      min-height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-box #qrCanvas img, .qr-box #qrCanvas canvas {
      display: block;
    }
    .qr-meta {
      flex: 1;
      min-width: 220px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .qr-meta p {
      margin: 0;
      color: var(--text-dim);
      font-size: 13px;
      line-height: 1.45;
    }
    .qr-meta input {
      width: 100%;
      font-size: 12px;
      font-family: ui-monospace, monospace;
    }
    .qr-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
"""

if css.strip() not in text:
    text = text.replace("  </style>", css + "  </style>", 1)

html = """
            <!-- QR Code -->
            <div class="form-group full" id="qrSection" style="display:none">
              <label>QR Code do ponto</label>
              <div class="qr-box">
                <div id="qrCanvas" aria-label="Pré-visualização do QR Code"></div>
                <div class="qr-meta">
                  <p>Gera o QR para a página pública deste local. Escaneie para abrir o card com fotos e detalhes.</p>
                  <input type="text" id="qrUrl" readonly onclick="this.select()" />
                  <div class="qr-actions">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="copyQrUrl()"><i class="fas fa-copy"></i> Copiar link</button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="downloadQrPng()"><i class="fas fa-download"></i> Baixar PNG</button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="printQr()"><i class="fas fa-print"></i> Imprimir</button>
                    <button type="button" class="btn btn-primary btn-sm" onclick="renderPointQr(true)"><i class="fas fa-qrcode"></i> Gerar / Atualizar</button>
                  </div>
                </div>
              </div>
            </div>

"""

marker = """            <!-- Toggles -->
            <div class="form-group">
              <label>Status</label>"""
if marker not in text:
    raise SystemExit("toggles marker not found")
text = text.replace(marker, html + marker, 1)

# CDN
cdn = '  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>\n'
if "qrcode.min.js" not in text:
    text = text.replace(
        '  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
        '  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>\n' + cdn,
        1,
    )

js = r"""
    // ---- QR Code (página pública do ponto) ----
    let qrWidget = null;

    function pointPublicUrl(id) {
      const base = `${location.origin}/mapaturistico/local.html?id=${encodeURIComponent(id)}`;
      return base;
    }

    function clearQrPreview() {
      const box = document.getElementById('qrCanvas');
      if (box) box.innerHTML = '';
      qrWidget = null;
      const urlInput = document.getElementById('qrUrl');
      if (urlInput) urlInput.value = '';
    }

    function hideQrSection() {
      const sec = document.getElementById('qrSection');
      if (sec) sec.style.display = 'none';
      clearQrPreview();
    }

    function showQrSection() {
      const sec = document.getElementById('qrSection');
      if (sec) sec.style.display = 'block';
    }

    function renderPointQr(showToastOk) {
      if (!currentId) {
        hideQrSection();
        if (showToastOk) showToast('Salve o ponto antes de gerar o QR Code.', 'error');
        return;
      }
      if (typeof QRCode === 'undefined') {
        showToast('Biblioteca de QR Code não carregou. Recarregue a página.', 'error');
        return;
      }
      showQrSection();
      const url = pointPublicUrl(currentId);
      const urlInput = document.getElementById('qrUrl');
      if (urlInput) urlInput.value = url;
      const box = document.getElementById('qrCanvas');
      if (!box) return;
      box.innerHTML = '';
      qrWidget = new QRCode(box, {
        text: url,
        width: 180,
        height: 180,
        colorDark: '#111828',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      if (showToastOk) showToast('QR Code gerado!');
    }

    async function copyQrUrl() {
      const url = document.getElementById('qrUrl')?.value || '';
      if (!url) { showToast('Gere o QR Code primeiro.', 'error'); return; }
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copiado!');
      } catch (_) {
        const input = document.getElementById('qrUrl');
        input.select();
        document.execCommand('copy');
        showToast('Link copiado!');
      }
    }

    function downloadQrPng() {
      const canvas = document.querySelector('#qrCanvas canvas');
      const img = document.querySelector('#qrCanvas img');
      let dataUrl = '';
      if (canvas) dataUrl = canvas.toDataURL('image/png');
      else if (img && img.src) dataUrl = img.src;
      if (!dataUrl) { showToast('Gere o QR Code primeiro.', 'error'); return; }
      const nome = (document.getElementById('fNome')?.value || 'ponto').trim().replace(/[^\w\-]+/g, '_').slice(0, 40);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `qr-${nome || currentId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function printQr() {
      const canvas = document.querySelector('#qrCanvas canvas');
      const img = document.querySelector('#qrCanvas img');
      let dataUrl = '';
      if (canvas) dataUrl = canvas.toDataURL('image/png');
      else if (img && img.src) dataUrl = img.src;
      if (!dataUrl) { showToast('Gere o QR Code primeiro.', 'error'); return; }
      const nome = document.getElementById('fNome')?.value || 'Ponto turístico';
      const url = document.getElementById('qrUrl')?.value || '';
      const w = window.open('', '_blank', 'width=480,height=640');
      if (!w) { showToast('Permita pop-ups para imprimir.', 'error'); return; }
      w.document.write(`<!doctype html><html><head><title>QR — ${nome}</title>
        <style>body{font-family:Arial,sans-serif;text-align:center;padding:32px;color:#111}
        img{width:260px;height:260px} h1{font-size:18px;margin:16px 0 8px} p{font-size:12px;word-break:break-all;color:#444}</style>
        </head><body onload="window.print()">
        <h1>${nome.replace(/</g,'&lt;')}</h1>
        <img src="${dataUrl}" alt="QR Code" />
        <p>${url.replace(/</g,'&lt;')}</p>
        </body></html>`);
      w.document.close();
    }

"""

if "function renderPointQr" not in text:
    text = text.replace(
        "    // ============================================================\n    async function loadPoints() {",
        js + "\n    // ============================================================\n    async function loadPoints() {",
        1,
    )

# After selectPoint photo gallery / map init - call renderPointQr
old_select_end = """      setTimeout(()=>{
        initAdminMap(); adminMap.invalidateSize();
        if (isValidLatLng(ponto.latitude, ponto.longitude)) {
          setMapMarker(ponto.latitude, ponto.longitude);
        } else {
          showToast('Este ponto tem coordenadas inválidas. Ajuste e salve novamente.','error');
          document.getElementById('fLat').value='';
          document.getElementById('fLng').value='';
          adminMap.setView(GARCA_CENTER,14);
          if(adminMarker){adminMap.removeLayer(adminMarker);adminMarker=null;}
        }
      },120);
    }"""

new_select_end = """      renderPointQr(false);
      setTimeout(()=>{
        initAdminMap(); adminMap.invalidateSize();
        if (isValidLatLng(ponto.latitude, ponto.longitude)) {
          setMapMarker(ponto.latitude, ponto.longitude);
        } else {
          showToast('Este ponto tem coordenadas inválidas. Ajuste e salve novamente.','error');
          document.getElementById('fLat').value='';
          document.getElementById('fLng').value='';
          adminMap.setView(GARCA_CENTER,14);
          if(adminMarker){adminMap.removeLayer(adminMarker);adminMarker=null;}
        }
      },120);
    }"""

if "renderPointQr(false);" not in text:
    if old_select_end not in text:
        raise SystemExit("selectPoint end not found")
    text = text.replace(old_select_end, new_select_end, 1)

# newPoint hide qr
if "hideQrSection();" not in text.split("function newPoint()")[1][:800]:
    text = text.replace(
        """    function newPoint() {
      currentId=null; photoFiles=[]; existingPhotos=[];
      resetPhotoPreviewObjectUrl();
      show('editForm'); hide('emptyState');""",
        """    function newPoint() {
      currentId=null; photoFiles=[]; existingPhotos=[];
      resetPhotoPreviewObjectUrl();
      hideQrSection();
      show('editForm'); hide('emptyState');""",
        1,
    )

# After save: open the point (so QR appears) instead of cancel on create
old_save_ok = """        showToast(currentId ? 'Ponto atualizado!' : 'Ponto criado com sucesso!');
        await loadPoints();
        if (!currentId) cancelEdit();
        else {
          currentId=json.data._id;
          existingPhotos = Array.isArray(json.data.fotos) ? [...json.data.fotos] : [];
          photoFiles = [];
          renderPhotoGallery();
          document.getElementById('formSubtitle').textContent=json.data.nome;
        }"""

new_save_ok = """        showToast(currentId ? 'Ponto atualizado!' : 'Ponto criado com sucesso!');
        await loadPoints();
        const savedId = json.data && json.data._id ? json.data._id : currentId;
        if (savedId) {
          selectPoint(savedId);
          renderPointQr(true);
        } else {
          cancelEdit();
        }"""

if "renderPointQr(true);" not in text.split("async function savePoint()")[1][:2500]:
    if old_save_ok not in text:
        raise SystemExit("savePoint success block not found")
    text = text.replace(old_save_ok, new_save_ok, 1)

admin.write_text(text, encoding="utf-8")
print("ADMIN_QR_PATCHED", admin.stat().st_size)
