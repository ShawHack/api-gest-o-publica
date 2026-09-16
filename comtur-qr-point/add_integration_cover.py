#!/usr/bin/env python3
"""Add cover image upload to COMTUR integration form."""
from pathlib import Path
from datetime import datetime

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
NAV = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")
DETAIL = Path("/home/semit/Documentos/api-semit/backend/public/turismo/integracoes/detalhe.html")

text = ADMIN.read_text(encoding="utf-8")
bak = ADMIN.with_name(f"comtur-content-admin.html.bak-intcover-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(ADMIN.read_bytes())
print("BAK", bak.name)

COVER_SECTION = r'''
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">4</span> Imagem de capa</div>
              <p class="comtur-hint" style="margin-bottom:12px;">Usada no portal (ex.: carrossel Em evidência). JPG, PNG ou WEBP · máx. 10 MB.</p>
              <div id="intCoverEmpty" class="comtur-upload-zone" onclick="$('intCoverFileInput').click()" style="cursor:pointer;">
                <input id="intCoverFileInput" type="file" accept="image/jpeg,image/png,image/webp" style="display:none">
                <div style="font-size:2.2rem; margin-bottom:6px;">📷</div>
                <div style="font-weight:700; color:var(--comtur-primary-dark);">Clique para selecionar a imagem de capa</div>
              </div>
              <div id="intCoverPreview" style="display:none; background:#f8fafc; border:1.5px solid var(--comtur-primary); border-radius:var(--comtur-radius-lg); padding:18px;">
                <div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap; justify-content:space-between;">
                  <div style="display:flex; gap:16px; align-items:center;">
                    <div style="width:140px; height:90px; border-radius:var(--comtur-radius-md); overflow:hidden; background:#e2e8f0;">
                      <img id="intCoverImgDisplay" src="" alt="Capa" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div>
                      <div id="intCoverFileNameDisplay" style="font-weight:800; color:var(--comtur-primary-dark);"></div>
                      <div style="font-size:0.82rem; color:var(--comtur-text-muted);">Tamanho: <strong id="intCoverSizeDisplay"></strong></div>
                    </div>
                  </div>
                  <div style="display:flex; gap:8px;">
                    <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="$('intCoverFileInput').click()">Trocar</button>
                    <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="intCoverFile=null; renderIntegrationCoverPreview();">Remover</button>
                  </div>
                </div>
              </div>
              <div id="intCoverProgress" class="comtur-hint" style="margin-top:8px; font-weight:600;"></div>
              <div class="comtur-grid-3" style="margin-top:16px;">
                <div class="comtur-field">
                  <label for="intPhotoCredit">Crédito</label>
                  <input id="intPhotoCredit" class="comtur-input" placeholder="Crédito da foto">
                </div>
                <div class="comtur-field">
                  <label for="intPhotoCaption">Legenda</label>
                  <input id="intPhotoCaption" class="comtur-input" placeholder="Legenda">
                </div>
                <div class="comtur-field">
                  <label for="intPhotoAlt">Texto alternativo</label>
                  <input id="intPhotoAlt" class="comtur-input" placeholder="Descrição acessível">
                </div>
              </div>
            </div>

'''

if 'id="intCoverFileInput"' not in text:
    # renumber publication section from 4 to 5
    old_pub = '''            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">4</span> Publicação</div>
              <div class="comtur-grid-2" style="margin-bottom:16px;">
                <div class="comtur-field">
                  <label for="intPublishDate">Data de publicação</label>'''
    new_pub = COVER_SECTION + '''            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">5</span> Publicação</div>
              <div class="comtur-grid-2" style="margin-bottom:16px;">
                <div class="comtur-field">
                  <label for="intPublishDate">Data de publicação</label>'''
    if old_pub not in text:
        raise SystemExit("integration publication section not found")
    text = text.replace(old_pub, new_pub, 1)
    print("COVER_SECTION_INSERTED")
else:
    print("COVER_SECTION_EXISTS")

JS = r'''
  let intCoverFile = null;

  function renderIntegrationCoverPreview() {
    const emptyEl = $('intCoverEmpty');
    const previewEl = $('intCoverPreview');
    if (intCoverFile && intCoverFile.url) {
      if (emptyEl) emptyEl.style.display = 'none';
      if (previewEl) previewEl.style.display = 'block';
      if ($('intCoverImgDisplay')) $('intCoverImgDisplay').src = intCoverFile.url;
      if ($('intCoverFileNameDisplay')) $('intCoverFileNameDisplay').textContent = intCoverFile.name || intCoverFile.originalName || 'capa.jpg';
      if ($('intCoverSizeDisplay')) $('intCoverSizeDisplay').textContent = intCoverFile.sizeFormatted || (intCoverFile.size ? formatBytes(intCoverFile.size) : 'Imagem');
    } else {
      if (emptyEl) emptyEl.style.display = 'block';
      if (previewEl) previewEl.style.display = 'none';
      if ($('intCoverImgDisplay')) $('intCoverImgDisplay').src = '';
    }
  }

  async function uploadIntegrationCover(file) {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { showNotice('Use JPG, PNG ou WEBP.', true); return; }
    if (file.size > 10 * 1024 * 1024) { showNotice('Imagem acima de 10 MB.', true); return; }
    const progressEl = $('intCoverProgress');
    if (progressEl) progressEl.textContent = 'Enviando imagem de capa...';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const send = (window.SemitSession && typeof SemitSession.fetchAuth === 'function') ? SemitSession.fetchAuth.bind(SemitSession) : fetch;
      const res = await send('/api/comtur/admin/media/upload', { method: 'POST', body: formData });
      const payload = await res.json().catch(() => ({}));
      const data = payload.data || payload;
      if (res.ok && data.url) {
        intCoverFile = {
          url: data.url,
          name: file.name,
          originalName: file.name,
          size: data.sizeBytes || file.size,
          sizeFormatted: formatBytes(data.sizeBytes || file.size),
          mimeType: data.mimeType || file.type
        };
        renderIntegrationCoverPreview();
        if (progressEl) progressEl.textContent = 'Capa enviada!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 2500);
      } else {
        showNotice((payload && (payload.error || payload.message)) || 'Falha no upload da capa.', true);
        if (progressEl) progressEl.textContent = '';
      }
    } catch (e) {
      showNotice('Erro de rede ao enviar capa.', true);
      if (progressEl) progressEl.textContent = '';
    }
  }

'''

if "let intCoverFile = null;" not in text:
    text = text.replace("  // --- SAVE ACTION ---", JS + "\n  // --- SAVE ACTION ---", 1)
    print("JS_INSERTED")

LISTENERS = r'''
  if ($('intCoverFileInput')) {
    $('intCoverFileInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) uploadIntegrationCover(e.target.files[0]);
      e.target.value = '';
    });
  }
'''

if "intCoverFileInput').addEventListener" not in text:
    if "if ($('intName') && $('intSlug')) {" in text:
        text = text.replace(
            "if ($('intName') && $('intSlug')) {",
            LISTENERS + "\n  if ($('intName') && $('intSlug')) {",
            1,
        )
    else:
        text = text.replace("window.uploadNewsCover = uploadNewsCover;", "window.uploadNewsCover = uploadNewsCover;\n" + LISTENERS, 1)
    print("LISTENERS")

# reset
RESET_EXTRA = """
      if ($('intPhotoCredit')) $('intPhotoCredit').value = '';
      if ($('intPhotoCaption')) $('intPhotoCaption').value = '';
      if ($('intPhotoAlt')) $('intPhotoAlt').value = '';
      intCoverFile = null;
      renderIntegrationCoverPreview();
"""

if "intCoverFile = null" not in text.split("if (currentType === 'integration')")[1][:2500]:
    text = text.replace(
        """      if ($('intFeatured')) $('intFeatured').checked = false;
      if ($('btnArchiveInt')) $('btnArchiveInt').style.display = 'none';
    }
""",
        """      if ($('intFeatured')) $('intFeatured').checked = false;
""" + RESET_EXTRA + """      if ($('btnArchiveInt')) $('btnArchiveInt').style.display = 'none';
    }
""",
        1,
    )
    print("RESET")

# load
LOAD_EXTRA = r'''
      if ($('intPhotoCredit')) $('intPhotoCredit').value = meta.photoCredit || '';
      if ($('intPhotoCaption')) $('intPhotoCaption').value = meta.photoCaption || '';
      if ($('intPhotoAlt')) $('intPhotoAlt').value = meta.photoAlt || '';
      const cover = (item.media || []).find(m => m.kind === 'image');
      if (meta.coverFile && meta.coverFile.url) intCoverFile = meta.coverFile;
      else if (meta.coverUrl) intCoverFile = { url: meta.coverUrl, name: 'capa.jpg', originalName: 'capa.jpg', size: 0, sizeFormatted: 'Imagem', mimeType: 'image/jpeg' };
      else if (cover && cover.url) intCoverFile = { url: cover.url, name: cover.title || 'capa.jpg', originalName: cover.title || 'capa.jpg', size: cover.size || 0, sizeFormatted: cover.size ? formatBytes(cover.size) : 'Imagem', mimeType: cover.mimeType || 'image/jpeg' };
      else intCoverFile = null;
      renderIntegrationCoverPreview();
'''

if "renderIntegrationCoverPreview()" not in text.split("item.type === 'integration'")[1][:3500]:
    text = text.replace(
        """      if ($('intFeatured')) $('intFeatured').checked = item.featured === true;
      if ($('btnArchiveInt')) $('btnArchiveInt').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
""",
        """      if ($('intFeatured')) $('intFeatured').checked = item.featured === true;
""" + LOAD_EXTRA + """      if ($('btnArchiveInt')) $('btnArchiveInt').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
""",
        1,
    )
    print("LOAD")

# buildPayload - replace media: [] and add cover fields in metadata
OLD_RETURN = """      return {
        type: 'integration',
        title,
        slug,
        summary: description,
        body: $('intNotes').value.trim(),
        location: org,
        featured: $('intFeatured').checked === true,
        publishedAt,
        status: statusToSave || 'draft',
        media: [],
        metadata: {
          description,
          kind,
          integrationType: kind,
          responsibleBody: org,
          system,
          platform: system,
          publicUrl,
          documentationUrl: publicUrl,
          integratesWhat,
          scope: integratesWhat,
          direction,
          periodicity,
          techStatus,
          lastSync: $('intLastSync').value || null,
          notes: $('intNotes').value.trim(),
          showOnPortal,
          // never store secrets here
          noSecrets: true
        }
      };
    }
"""

NEW_RETURN = """      const media = [];
      if (intCoverFile && intCoverFile.url) {
        media.push({
          kind: 'image',
          title: title,
          url: intCoverFile.url,
          mimeType: intCoverFile.mimeType || 'image/jpeg',
          size: intCoverFile.size,
          caption: ($('intPhotoCaption') && $('intPhotoCaption').value.trim()) || '',
          credit: ($('intPhotoCredit') && $('intPhotoCredit').value.trim()) || '',
          alt: ($('intPhotoAlt') && $('intPhotoAlt').value.trim()) || '',
          isAccessible: !!($('intPhotoAlt') && $('intPhotoAlt').value.trim())
        });
      }
      return {
        type: 'integration',
        title,
        slug,
        summary: description,
        body: $('intNotes').value.trim(),
        location: org,
        featured: $('intFeatured').checked === true,
        publishedAt,
        status: statusToSave || 'draft',
        media,
        metadata: {
          description,
          kind,
          integrationType: kind,
          responsibleBody: org,
          system,
          platform: system,
          publicUrl,
          documentationUrl: publicUrl,
          integratesWhat,
          scope: integratesWhat,
          direction,
          periodicity,
          techStatus,
          lastSync: $('intLastSync').value || null,
          notes: $('intNotes').value.trim(),
          showOnPortal,
          coverUrl: intCoverFile ? intCoverFile.url : '',
          coverFile: intCoverFile,
          photoCredit: ($('intPhotoCredit') && $('intPhotoCredit').value.trim()) || '',
          photoCaption: ($('intPhotoCaption') && $('intPhotoCaption').value.trim()) || '',
          photoAlt: ($('intPhotoAlt') && $('intPhotoAlt').value.trim()) || '',
          // never store secrets here
          noSecrets: true
        }
      };
    }
"""

if "coverUrl: intCoverFile" not in text:
    if OLD_RETURN not in text:
        raise SystemExit("integration build return block not found")
    text = text.replace(OLD_RETURN, NEW_RETURN, 1)
    print("BUILD")

ADMIN.write_text(text, encoding="utf-8")
print("ADMIN_SIZE", ADMIN.stat().st_size)

nt = NAV.read_text(encoding="utf-8")
nt2 = nt.replace("comtur-content-admin.html?v=19", "comtur-content-admin.html?v=20").replace("comtur-content-admin.html?v=18", "comtur-content-admin.html?v=20")
if nt2 != nt:
    NAV.write_text(nt2, encoding="utf-8")
    print("NAV_v20")

# public detail: show cover if present
if DETAIL.exists():
    dt = DETAIL.read_text(encoding="utf-8")
    if "cover" not in dt or "metadata.coverUrl" not in dt:
        old = "add('h1', p.title);"
        new = """const coverUrl = (p.media || []).find((m) => m.kind === 'image')?.url || meta.coverUrl;
        if (coverUrl) {
          const img = document.createElement('img');
          img.src = coverUrl;
          img.alt = meta.photoAlt || p.title || '';
          img.style.cssText = 'width:100%;max-height:360px;object-fit:cover;border-radius:14px;margin-bottom:18px;';
          box.append(img);
        }
        add('h1', p.title);"""
        if old in dt:
            DETAIL.write_text(dt.replace(old, new, 1), encoding="utf-8")
            print("DETAIL_COVER")

print("DONE")
