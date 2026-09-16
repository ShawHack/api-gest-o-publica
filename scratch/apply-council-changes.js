const fs = require('fs');
const filePath = 'comtur-next/portal/comtur-content-admin.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Council Member helper functions (State + Avatar preview + Upload + Selects population)
const councilHelpers = `
  // --- COUNCIL MEMBER (MEMBROS DO CONSELHO) SPECIFIC LOGIC ---
  let councilPhotoUrl = '';

  function renderCouncilAvatarPreview(url) {
    const previewEl = $('councilAvatarPreview');
    const removeBtn = $('btnRemoveCouncilPhoto');
    const altInput = $('councilPhotoAlt');
    const nameVal = ($('councilDisplayName') ? $('councilDisplayName').value.trim() : '') || ($('councilName') ? $('councilName').value.trim() : '') || 'Conselheiro';

    if (!previewEl) return;

    if (url) {
      previewEl.innerHTML = \`<img src="\${url}" alt="\${(altInput && altInput.value) || 'Foto de ' + nameVal}" style="width: 100%; height: 100%; object-fit: cover;">\`;
      if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
      previewEl.innerHTML = \`<span style="font-size: 3.2rem;">👤</span>\`;
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }

  async function uploadCouncilPhoto(file) {
    if (!file) return;
    const progressEl = $('councilPhotoProgress');
    if (progressEl) progressEl.textContent = 'Enviando foto...';

    const formData = new FormData();
    formData.append('file', file);
    try {
      const send = (window.SemitSession && typeof window.SemitSession.fetchWithAuth === 'function')
        ? window.SemitSession.fetchWithAuth.bind(window.SemitSession)
        : ((window.SemitSession && typeof window.SemitSession.fetchAuth === 'function')
            ? window.SemitSession.fetchAuth.bind(window.SemitSession)
            : fetch);
      const res = await send('/api/comtur/admin/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        councilPhotoUrl = data.url;
        renderCouncilAvatarPreview(councilPhotoUrl);
        if (progressEl) progressEl.textContent = 'Foto enviada com sucesso!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);
      } else {
        showNotice(\`Erro ao enviar foto: \${data.error || 'Falha no upload'}\`, true);
        if (progressEl) progressEl.textContent = '';
      }
    } catch (err) {
      showNotice('Erro de conexão ao enviar foto.', true);
      if (progressEl) progressEl.textContent = '';
    }
  }

  function populateCouncilRelatedMemberSelect(selectedId = '') {
    const select = $('councilRelatedMemberSelect');
    if (!select) return;
    const currentMemberId = $('id').value;
    const councilMembers = allItems.filter(item => item.type === 'council_member' && item._id !== currentMemberId);
    
    let html = '<option value="">-- Nenhum membro vinculado --</option>';
    councilMembers.forEach(m => {
      const meta = m.metadata || {};
      const role = meta.councilRole || meta.role || 'Conselheiro(a)';
      const rep = meta.representationType ? \` (\${meta.representationType})\` : '';
      const isSel = (m._id === selectedId) ? 'selected' : '';
      html += \`<option value="\${m._id}" \${isSel}>\${m.title} - \${role}\${rep}</option>\`;
    });
    select.innerHTML = html;
  }

  function populateCouncilLegislationSelect(selectedId = '') {
    const select = $('councilLegislationSelect');
    if (!select) return;
    const legislationDocs = allItems.filter(item => item.type === 'legislation');
    
    let html = '<option value="">-- Selecionar da categoria Legislação --</option>';
    legislationDocs.forEach(doc => {
      const isSel = (doc._id === selectedId) ? 'selected' : '';
      html += \`<option value="\${doc._id}" \${isSel}>\${doc.title}</option>\`;
    });
    select.innerHTML = html;
  }
`;

// Insert helpers right before "// --- CONTENT TYPE SWITCHING & FORM REGISTRY ---"
if (!content.includes('// --- COUNCIL MEMBER (MEMBROS DO CONSELHO) SPECIFIC LOGIC ---')) {
  content = content.replace(
    '// --- CONTENT TYPE SWITCHING & FORM REGISTRY ---',
    councilHelpers + '\n  // --- CONTENT TYPE SWITCHING & FORM REGISTRY ---'
  );
}

// 2. onContentTypeChange - Add council_member handling
const targetOnContentType = `    } else if (currentType === 'service') {
      $('serviceFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else {`;

const replacementOnContentType = `    } else if (currentType === 'service') {
      $('serviceFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'council_member') {
      $('councilMemberFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else {`;

content = content.replace(targetOnContentType, replacementOnContentType);

// 3. resetForm - Add btnArchiveCouncil and council_member reset block
const targetBtnArchive = `if ($('btnArchiveService')) $('btnArchiveService').style.display = 'none';`;
const replacementBtnArchive = `if ($('btnArchiveService')) $('btnArchiveService').style.display = 'none';
    if ($('btnArchiveCouncil')) $('btnArchiveCouncil').style.display = 'none';`;

content = content.replace(targetBtnArchive, replacementBtnArchive);

const targetResetEnd = `if (clearSidebarActive) {
      document.querySelectorAll('.comtur-list-item').forEach(el => el.classList.remove('is-active'));
    }
  }`;

const councilResetBlock = `    if (currentType === 'council_member') {
      if ($('councilName')) $('councilName').value = '';
      if ($('councilDisplayName')) {
        $('councilDisplayName').value = '';
        delete $('councilDisplayName').dataset.manual;
      }
      if ($('councilRole')) $('councilRole').value = 'Conselheiro(a)';
      if ($('councilRepresentationType')) $('councilRepresentationType').value = 'Titular';
      if ($('councilSlug')) {
        $('councilSlug').value = '';
        delete $('councilSlug').dataset.manual;
      }
      if ($('councilOrganization')) $('councilOrganization').value = '';
      if ($('councilSegment')) $('councilSegment').value = 'Poder Público';
      if ($('councilOrganizationRole')) $('councilOrganizationRole').value = '';
      if ($('councilTermStart')) $('councilTermStart').value = '';
      if ($('councilTermEnd')) $('councilTermEnd').value = '';
      if ($('councilMemberStatus')) $('councilMemberStatus').value = 'Em exercício';
      if ($('councilIsCurrent')) $('councilIsCurrent').checked = true;
      if ($('councilBio')) $('councilBio').value = '';
      if ($('councilProfessionalArea')) $('councilProfessionalArea').value = '';
      if ($('councilTourismExperience')) $('councilTourismExperience').value = '';
      if ($('councilPublicEmail')) $('councilPublicEmail').value = '';
      if ($('councilPublicPhone')) $('councilPublicPhone').value = '';
      if ($('councilShowPublicContact')) $('councilShowPublicContact').checked = false;
      if ($('councilDisplayOrder')) $('councilDisplayOrder').value = '1';
      if ($('councilShowOnPortal')) $('councilShowOnPortal').checked = true;
      if ($('councilFeaturedTop')) $('councilFeaturedTop').checked = false;
      if ($('councilAppointmentAct')) $('councilAppointmentAct').value = '';
      if ($('councilAppointmentDate')) $('councilAppointmentDate').value = '';
      if ($('councilAppointmentDocUrl')) $('councilAppointmentDocUrl').value = '';
      if ($('councilPublishDate')) $('councilPublishDate').value = '';
      
      councilPhotoUrl = '';
      renderCouncilAvatarPreview('');
      if ($('councilPhotoAlt')) {
        $('councilPhotoAlt').value = '';
        delete $('councilPhotoAlt').dataset.manual;
      }
      if ($('councilPhotoProgress')) $('councilPhotoProgress').textContent = '';
      populateCouncilRelatedMemberSelect('');
      populateCouncilLegislationSelect('');
    }

    ${targetResetEnd}`;

content = content.replace(targetResetEnd, councilResetBlock);

// 4. renderList - Add council_member specialized card renderer
const targetRenderItem = `      return \`
        <button class="comtur-list-item \${isActive ? 'is-active' : ''}" type="button" data-id="\${item._id}">
          <div class="comtur-list-title">\${item.title || 'Sem título'}</div>
          <div class="comtur-list-meta">
            <span class="comtur-badge \${statusClass}">\${statusLabel}</span>
            <span>\${item.slug ? '/' + item.slug : ''}</span>
            \${item.featured ? '<span title="Em destaque">⭐</span>' : ''}
          </div>
        </button>
      \`;`;

const replacementRenderItem = `      if (item.type === 'council_member') {
        const meta = item.metadata || {};
        const role = meta.councilRole || meta.role || 'Conselheiro(a)';
        const org = meta.organization || meta.entity || meta.segment || 'COMTUR';
        const repType = meta.representationType || 'Titular';
        const memberStatus = meta.memberStatus || (item.status === 'published' ? 'Em exercício' : 'Rascunho');
        const photoUrl = (item.media && item.media.find(m => m.type === 'photo' || m.type === 'image' || m.type === 'avatar')?.url) || meta.photoUrl || (item.media && item.media[0]?.url) || '';
        
        return \`
          <button class="comtur-list-item \${isActive ? 'is-active' : ''}" type="button" data-id="\${item._id}" style="padding: 10px 12px;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1.5px solid var(--comtur-primary);">
                \${photoUrl ? \`<img src="\${photoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;">\` : \`<span style="font-size: 1.2rem;">👤</span>\`}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="comtur-list-title" style="margin-bottom: 2px; font-weight: 700; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${item.title || 'Conselheiro sem nome'}</div>
                <div style="font-size: 0.78rem; color: var(--comtur-primary); font-weight: 600; line-height: 1.2;">\${role} • \${repType}</div>
                <div style="font-size: 0.75rem; color: var(--comtur-text-muted); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${org}</div>
              </div>
            </div>
            <div class="comtur-list-meta" style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span class="comtur-badge \${statusClass}">\${statusLabel}</span>
              <span style="font-size: 0.72rem; font-weight: 600; color: #475569; text-transform: uppercase;">\${memberStatus}</span>
            </div>
          </button>
        \`;
      }

${targetRenderItem}`;

content = content.replace(targetRenderItem, replacementRenderItem);

// 5. loadItemForEdit - Add council_member data population
const targetLoadItemEnd = `      if ($('btnArchiveService')) $('btnArchiveService').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else {`;

const replacementLoadItemEnd = `      if ($('btnArchiveService')) $('btnArchiveService').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'council_member') {
      $('councilName').value = item.title || '';
      $('councilDisplayName').value = meta.displayName || item.title || '';
      $('councilRole').value = meta.councilRole || meta.role || 'Conselheiro(a)';
      $('councilRepresentationType').value = meta.representationType || 'Titular';
      $('councilSlug').value = item.slug || '';
      $('councilSlug').dataset.manual = 'true';
      $('councilDisplayName').dataset.manual = 'true';
      if (meta.photoAlt) $('councilPhotoAlt').dataset.manual = 'true';

      // Section 2: Representação Institucional
      $('councilOrganization').value = meta.organization || meta.entity || '';
      $('councilSegment').value = meta.segment || 'Poder Público';
      $('councilOrganizationRole').value = meta.organizationRole || '';

      // Section 3: Mandato
      $('councilTermStart').value = meta.termStart ? new Date(meta.termStart).toISOString().slice(0, 10) : (meta.termStart || '');
      $('councilTermEnd').value = meta.termEnd ? new Date(meta.termEnd).toISOString().slice(0, 10) : (meta.termEnd || '');
      $('councilMemberStatus').value = meta.memberStatus || (item.status === 'published' ? 'Em exercício' : 'Em exercício');
      populateCouncilRelatedMemberSelect(meta.relatedMemberId || '');
      $('councilIsCurrent').checked = meta.isCurrent !== false;

      // Section 4: Informações do Membro
      $('councilBio').value = item.summary || meta.bio || '';
      $('councilProfessionalArea').value = meta.professionalArea || '';
      $('councilTourismExperience').value = meta.tourismExperience || '';

      // Section 5: Contato
      $('councilPublicEmail').value = contact.email || meta.publicEmail || '';
      $('councilPublicPhone').value = contact.phone || meta.publicPhone || '';
      $('councilShowPublicContact').checked = meta.showPublicContact === true;

      // Section 6: Exibição no Portal
      $('councilDisplayOrder').value = meta.displayOrder !== undefined ? meta.displayOrder : 1;
      $('councilShowOnPortal').checked = meta.showOnPortal !== false;
      $('councilFeaturedTop').checked = item.featured === true || meta.featuredTop === true;

      // Section 7: Nomeação / Designação
      $('councilAppointmentAct').value = meta.appointmentAct || '';
      $('councilAppointmentDate').value = meta.appointmentDate ? new Date(meta.appointmentDate).toISOString().slice(0, 10) : (meta.appointmentDate || '');
      $('councilAppointmentDocUrl').value = meta.appointmentDocUrl || '';
      populateCouncilLegislationSelect(meta.appointmentDocumentId || meta.legislationId || '');

      // Section 1: Foto / Avatar & Alt
      const memberPhoto = (item.media && item.media.find(m => m.type === 'photo' || m.type === 'image' || m.type === 'avatar')) || (item.media && item.media[0]);
      councilPhotoUrl = memberPhoto?.url || meta.photoUrl || '';
      $('councilPhotoAlt').value = meta.photoAlt || (memberPhoto?.caption || \`Foto de \${item.title || 'Conselheiro'}\`);
      renderCouncilAvatarPreview(councilPhotoUrl);

      // Section 8: Publicação
      $('councilPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveCouncil')) $('btnArchiveCouncil').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else {`;

content = content.replace(targetLoadItemEnd, replacementLoadItemEnd);

// 6. buildPayload - Add council_member payload generation
const targetBuildPayloadEnd = `        media: svcMedia
      };
    }

    // Default / Standard`;

const councilPayloadBlock = `        media: svcMedia
      };
    }

    if (currentType === 'council_member') {
      const name = $('councilName').value.trim();
      const displayName = $('councilDisplayName').value.trim() || name;
      const slug = slugify($('councilSlug').value) || slugify(name);
      const role = $('councilRole').value;
      const repType = $('councilRepresentationType').value;
      const organization = $('councilOrganization').value.trim();
      const segment = $('councilSegment').value;
      const orgRole = $('councilOrganizationRole').value.trim();
      const termStart = $('councilTermStart').value || undefined;
      const termEnd = $('councilTermEnd').value || undefined;
      const memberStatus = $('councilMemberStatus').value;
      const relatedMemberId = $('councilRelatedMemberSelect').value || undefined;
      const isCurrent = $('councilIsCurrent').checked;
      const bio = $('councilBio').value.trim();
      const profArea = $('councilProfessionalArea').value.trim();
      const tourismExp = $('councilTourismExperience').value.trim();
      const publicEmail = $('councilPublicEmail').value.trim();
      const publicPhone = $('councilPublicPhone').value.trim();
      const showPublicContact = $('councilShowPublicContact').checked;
      const displayOrder = parseInt($('councilDisplayOrder').value, 10) || 1;
      const showOnPortal = $('councilShowOnPortal').checked;
      const featuredTop = $('councilFeaturedTop').checked;
      const appointmentAct = $('councilAppointmentAct').value.trim();
      const appointmentDate = $('councilAppointmentDate').value || undefined;
      const appointmentDocUrl = $('councilAppointmentDocUrl').value.trim();
      const appointmentDocumentId = $('councilLegislationSelect').value || undefined;
      const photoAlt = $('councilPhotoAlt').value.trim() || \`Foto de \${displayName}\`;
      const publishedAt = $('councilPublishDate').value ? new Date($('councilPublishDate').value).toISOString() : undefined;

      const media = [];
      if (councilPhotoUrl) {
        media.push({
          type: 'photo',
          url: councilPhotoUrl,
          caption: photoAlt,
          alt: photoAlt,
          order: 0
        });
      }

      return {
        type: 'council_member',
        title: name,
        slug,
        summary: bio,
        body: bio,
        featured: featuredTop,
        publishedAt,
        status: statusToSave || 'draft',
        contact: {
          email: publicEmail,
          phone: publicPhone,
          publicEmail,
          publicPhone
        },
        metadata: {
          name,
          displayName,
          councilRole: role,
          role,
          representationType: repType,
          organization,
          entity: organization,
          segment,
          organizationRole: orgRole,
          termStart,
          termEnd,
          memberStatus,
          relatedMemberId,
          isCurrent,
          bio,
          professionalArea: profArea,
          tourismExperience: tourismExp,
          publicEmail,
          publicPhone,
          showPublicContact,
          displayOrder,
          showOnPortal,
          featuredTop,
          appointmentAct,
          appointmentDate,
          appointmentDocUrl,
          appointmentDocumentId,
          legislationId: appointmentDocumentId,
          photoUrl: councilPhotoUrl || '',
          photoAlt
        },
        media
      };
    }

    // Default / Standard`;

content = content.replace(targetBuildPayloadEnd, councilPayloadBlock);

// 7. loadItems - Add council selects population
const targetLoadItemsSelects = `} else if (currentType === 'service') {
        renderRelatedEntities('svcRelatedEntitiesList', currentItem?.metadata?.relatedEntities || []);
      }`;

const replacementLoadItemsSelects = `} else if (currentType === 'service') {
        renderRelatedEntities('svcRelatedEntitiesList', currentItem?.metadata?.relatedEntities || []);
      } else if (currentType === 'council_member') {
        populateCouncilRelatedMemberSelect(currentItem?.metadata?.relatedMemberId || '');
        populateCouncilLegislationSelect(currentItem?.metadata?.appointmentDocumentId || currentItem?.metadata?.legislationId || '');
      }`;

content = content.replace(targetLoadItemsSelects, replacementLoadItemsSelects);

// 8. init() - Add event listeners for council member
const targetInitListeners = `    $('svcFileInput').addEventListener('change', (e) => {
      uploadMediaFiles(Array.from(e.target.files), svcMedia, 'svcUploadProgress', () => {
        if (!svcCoverUrl && svcMedia.length) svcCoverUrl = svcMedia[0].url;
        renderServiceGallery();
      });
      e.target.value = '';
    });`;

const councilListeners = `    $('svcFileInput').addEventListener('change', (e) => {
      uploadMediaFiles(Array.from(e.target.files), svcMedia, 'svcUploadProgress', () => {
        if (!svcCoverUrl && svcMedia.length) svcCoverUrl = svcMedia[0].url;
        renderServiceGallery();
      });
      e.target.value = '';
    });

    // 8. Listeners for Membros do Conselho
    $('councilName').addEventListener('input', () => {
      const val = $('councilName').value;
      if (!$('id').value && !$('councilSlug').dataset.manual) {
        $('councilSlug').value = slugify(val);
      }
      if (!$('councilDisplayName').dataset.manual) {
        $('councilDisplayName').value = val;
      }
      if (!$('councilPhotoAlt').dataset.manual) {
        $('councilPhotoAlt').value = val ? \`Foto de \${val}\` : '';
      }
    });

    $('councilDisplayName').addEventListener('input', () => {
      $('councilDisplayName').dataset.manual = 'true';
      if (!$('councilPhotoAlt').dataset.manual) {
        const val = $('councilDisplayName').value || $('councilName').value;
        $('councilPhotoAlt').value = val ? \`Foto de \${val}\` : '';
      }
    });

    $('councilSlug').addEventListener('input', () => {
      $('councilSlug').dataset.manual = 'true';
    });

    $('councilPhotoAlt').addEventListener('input', () => {
      $('councilPhotoAlt').dataset.manual = 'true';
    });

    $('councilPhotoInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        uploadCouncilPhoto(e.target.files[0]);
      }
      e.target.value = '';
    });

    $('btnRemoveCouncilPhoto').addEventListener('click', () => {
      councilPhotoUrl = '';
      renderCouncilAvatarPreview('');
    });`;

content = content.replace(targetInitListeners, councilListeners);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated comtur-content-admin.html for Council Member!');
