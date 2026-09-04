(() => {
  const V = window.VotingAdmin
  const { el, esc, fmtDate, localInputToISO, isoToLocalInput, statusBadge, api, apiForm, navigate, workspacePath } = V

  const CHART_COLORS = ['#1e3a8a', '#0f766e', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#65a30d', '#64748b']

  let detailCache = null
  let editingCandId = null

  function setMsg(html, isError) {
    const node = el('app-msg')
    if (!node) return
    node.innerHTML = html
      ? `<span class="${isError ? 'danger' : 'muted'}">${html}</span>`
      : ''
  }

  function pct(n, total) {
    if (!total) return 0
    return Math.round((n * 10000) / total) / 100
  }

  function donutStyle(segments) {
    if (!segments.length) return 'background:#e2e8f0'
    let acc = 0
    const parts = segments.map((s, i) => {
      const start = acc
      acc += s.pct
      return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${acc}%`
    })
    return `background:conic-gradient(${parts.join(', ')})`
  }

  function renderAuthShell() {
    return `
      <div class="card login-card" id="auth-card">
        <h1 style="margin-bottom:8px;">Administração — Votação</h1>
        <p class="muted">Acesso restrito a gestores SEMIT (<strong>admin</strong> / <strong>admin-votacao</strong>) ou <strong>auditores de pleito</strong>.</p>
        <div class="row">
          <div><label>E-mail</label><input id="adminEmail" type="email" autocomplete="username" /></div>
          <div><label>Senha</label><input id="adminPassword" type="password" autocomplete="current-password" /></div>
        </div>
        <div class="form-actions">
          <button type="button" id="btnLoginAdmin">Entrar</button>
        </div>
        <p id="authMsg" class="muted"></p>
      </div>
      <div id="panel" style="display:none;"></div>
    `
  }

  function showLoginOnly(message) {
    const root = el('app-root')
    root.innerHTML = renderAuthShell()
    bindAuth()
    if (message) el('authMsg').textContent = message
    el('panel').style.display = 'none'
  }

  function bindAuth() {
    el('btnLoginAdmin')?.addEventListener('click', async () => {
      const email = el('adminEmail').value.trim()
      const password = el('adminPassword').value
      if (!email || !password) {
        el('authMsg').textContent = 'Informe e-mail e senha.'
        return
      }
      el('authMsg').textContent = 'Autenticando...'
      try {
        await V.login(email, password)
        await bootAuthenticated()
      } catch (e) {
        el('authMsg').innerHTML = `<span class="danger">${esc(e.message)}</span>`
      }
    })
    el('adminPassword')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') el('btnLoginAdmin')?.click()
    })
  }

  function bindLogout() {
    el('btnLogoutAdmin')?.addEventListener('click', () => {
      V.logout()
      showLoginOnly('Sessão encerrada.')
    })
  }

  async function bootAuthenticated() {
    const root = el('app-root')
    root.innerHTML = '<div id="panel"></div>'
    try {
      const me = await api('/admin/me')
      V.setAccess(me.access || {})
      if (me.user) {
        V.setSessionLabel(
          { user: me.user, role: me.user.role },
          me.user.email,
        )
      }
      // Auditor com um único pleito: vai direto ao workspace
      if (!me.access?.globalAdmin && (me.access?.pleitoIds || []).length === 1) {
        const only = me.access.pleitoIds[0]
        if (!window.location.pathname.includes(`/pleitos/${only}`)) {
          navigate(workspacePath(only, 'resumo'))
          return
        }
      }
    } catch (e) {
      // acesso antigo ainda pode listar; segue
      console.warn(e)
      // Safety net: se /admin/me falhar (ex.: 404), admin global nao fica preso como auditor
      try {
        const raw = localStorage.getItem('votacao_admin_session') || '{}'
        const role = String(JSON.parse(raw).role || '').toLowerCase()
        if (role === 'admin' || role === 'admin-votacao') {
          V.setAccess({ canWrite: true, globalAdmin: true, scope: 'global_admin' })
        }
      } catch (_) {}
    }
    await renderRoute()
    bindLogout()
  }

  function topNav(active) {
    const who = V.getSessionLabel() || 'Administrador'
    const write = V.canWrite()
    return `
      <div class="topbar">
        <div>
          <h1>Administração — Votação</h1>
          <p class="muted session-line">
            Logado como <strong>${esc(who)}</strong>
            ${write ? '' : ' · <span class="badge badge-warn">Auditor — somente leitura</span>'}
          </p>
        </div>
        <div class="topbar-right">
          <nav class="topnav">
            <a class="${active === 'pleitos' ? 'active' : ''}" href="/votacao/admin/pleitos">Pleitos</a>
            ${write ? `<a class="${active === 'eleitores' ? 'active' : ''}" href="/votacao/admin/eleitores">Eleitores</a>` : ''}
          </nav>
          <button type="button" class="secondary" id="btnLogoutAdmin">Sair</button>
        </div>
      </div>
      <p id="app-msg" class="muted"></p>
    `
  }

  function workspaceNav(pleitoId, section, votation) {
    const write = V.canWrite()
    const items = write
      ? [
          ['resumo', 'Visão geral'],
          ['configuracoes', 'Configurações'],
          ['eleicoes', 'Eleições e cargos'],
          ['candidatos', 'Candidatos'],
          ['landing-page', 'Página pública'],
          ['votacao', 'Votação'],
          ['apuracao', 'Apuração'],
          ['resultados', 'Resultados'],
          ['equipe', 'Equipe / Auditores'],
        ]
      : [
          ['resumo', 'Visão geral'],
          ['eleicoes', 'Eleições e cargos'],
          ['candidatos', 'Candidatos'],
          ['apuracao', 'Apuração'],
          ['resultados', 'Resultados'],
          ['equipe', 'Equipe / Auditores'],
        ]
    const title = votation?.title || 'Pleito'
    return `
      ${topNav('pleitos')}
      <div class="breadcrumb">
        <a href="/votacao/admin/pleitos">Pleitos</a> ›
        <strong>${esc(title)}</strong> › ${esc(items.find((i) => i[0] === section)?.[1] || section)}
      </div>
      <div class="card pleito-header">
        <div>
          <h2>${esc(title)}</h2>
          <div class="meta-row">
            ${statusBadge(votation?.status)}
            <span>${fmtDate(votation?.startDate)} → ${fmtDate(votation?.endDate)}</span>
            ${votation?.slug ? `<a href="/votacao/p/${esc(votation.slug)}" target="_blank" rel="noopener">Abrir landing</a>` : ''}
          </div>
        </div>
        <div class="card-actions">
          <a class="secondary" href="/votacao/admin/pleitos" style="padding:8px 12px;border-radius:8px;border:1px solid var(--blue);text-decoration:none;color:var(--blue);">← Todos os pleitos</a>
        </div>
      </div>
      <div class="layout">
        <nav class="sidenav">
          <div class="section-label">Este pleito</div>
          ${items
            .map(
              ([id, label]) =>
                `<a class="${section === id ? 'active' : ''}" href="${workspacePath(pleitoId, id)}">${label}</a>`,
            )
            .join('')}
          ${write ? `<div class="section-label">Global</div><a href="/votacao/admin/eleitores">Eleitores (base)</a>` : ''}
        </nav>
        <div id="workspace-main"></div>
      </div>
    `
  }

  /* ---------- LISTA DE PLEITOS ---------- */
  async function viewPleitosList() {
    const panel = el('panel')
    const write = V.canWrite()
    panel.innerHTML = `
      ${topNav('pleitos')}
      ${
        write
          ? `<div class="card">
        <h2>Novo pleito</h2>
        <div class="row">
          <div><label>Título</label><input id="pTitle" /></div>
          <div><label>Início</label><input id="pStart" type="datetime-local" /></div>
          <div><label>Fim</label><input id="pEnd" type="datetime-local" /></div>
        </div>
        <div class="row"><div><label>Descrição</label><textarea id="pDesc" rows="2"></textarea></div></div>
        <button type="button" id="btnCreatePleito">Criar pleito</button>
      </div>`
          : `<div class="card"><p class="muted">Modo auditor: você visualiza apenas os pleitos aos quais foi designado, em caráter de fiscalização (somente leitura).</p></div>`
      }
      <div class="card">
        <h2>${write ? 'Pleitos' : 'Meus pleitos (auditoria)'}</h2>
        <div class="filters">
          <input id="filterQ" placeholder="Buscar por título..." />
          <select id="filterStatus">
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="closed">Encerrado</option>
          </select>
        </div>
        <div id="pleitosList" class="muted">Carregando...</div>
      </div>
    `

    let all = []
    const renderList = () => {
      const q = (el('filterQ').value || '').trim().toLowerCase()
      const st = el('filterStatus').value
      const list = all.filter((v) => {
        if (st && v.status !== st) return false
        if (q && !String(v.title || '').toLowerCase().includes(q)) return false
        return true
      })
      if (!list.length) {
        el('pleitosList').innerHTML = '<div class="empty">Nenhum pleito encontrado.</div>'
        return
      }
      el('pleitosList').innerHTML = list
        .map((v) => {
          const c = v.counts || {}
          const warn = v.incomplete
            ? '<span class="badge badge-warn">Configuração incompleta</span>'
            : ''
          return `
          <div class="pleito-card">
            <div>
              <h3>${esc(v.title)}</h3>
              <div class="meta-row">
                ${statusBadge(v.status)}
                ${warn}
                <span>${fmtDate(v.startDate)} → ${fmtDate(v.endDate)}</span>
              </div>
              ${v.description ? `<p class="muted" style="margin:6px 0 0;">${esc(v.description).slice(0, 160)}</p>` : ''}
              <div class="meta-row">
                <span>${c.categories || 0} cargo(s)</span>
                <span>${c.candidates || 0} candidato(s)</span>
                <span>${c.participants || 0} voto(s) · ${c.votes || 0} item(ns) de cédula</span>
                ${v.slug ? `<a href="/votacao/p/${esc(v.slug)}" target="_blank" rel="noopener">landing</a>` : ''}
              </div>
            </div>
            <div class="card-actions">
              <a class="btn-manage" href="${workspacePath(v._id, 'resumo')}" style="display:inline-block;padding:8px 14px;background:var(--blue);color:#fff;border-radius:8px;text-decoration:none;">${write ? 'Gerenciar pleito' : 'Auditar pleito'}</a>
            </div>
          </div>`
        })
        .join('')
    }

    if (write) {
      el('btnCreatePleito').addEventListener('click', async () => {
        const title = el('pTitle').value.trim()
        const startDate = el('pStart').value
        const endDate = el('pEnd').value
        const description = el('pDesc').value.trim()
        if (!title || !startDate || !endDate) return alert('Preencha título e datas.')
        try {
          const data = await api('/admin/votacoes', {
            method: 'POST',
            body: JSON.stringify({
              title,
              description,
              startDate: localInputToISO(startDate),
              endDate: localInputToISO(endDate),
              status: 'draft',
            }),
          })
          if (data.votation?._id) {
            navigate(workspacePath(data.votation._id, 'resumo'))
            return
          }
          await load()
        } catch (e) {
          alert(e.message)
        }
      })
    }
    el('filterQ').addEventListener('input', renderList)
    el('filterStatus').addEventListener('change', renderList)

    async function load() {
      try {
        const data = await api('/admin/votacoes')
        if (data.access) V.setAccess(data.access)
        all = data.votations || []
        renderList()
      } catch (e) {
        el('pleitosList').innerHTML = `<span class="danger">${esc(e.message)}</span>`
      }
    }
    await load()
  }

  /* ---------- ELEITORES (global) ---------- */
  async function viewEleitores() {
    if (!V.canWrite()) {
      el('panel').innerHTML = `${topNav('pleitos')}<div class="card"><p class="danger">Auditores não acessam a base global de eleitores.</p></div>`
      return
    }
    const panel = el('panel')
    panel.innerHTML = `
      ${topNav('eleitores')}
      <div class="card">
        <h2>Importar CSV (base global)</h2>
        <p class="muted">Colunas: Nome; Empresa; Departamento; Cargo; Matrícula; CPF (separador ;). Elegibilidade por pleito ainda é global nesta fase.</p>
        <textarea id="csvContent" rows="6" placeholder="Cole o conteúdo do CSV"></textarea>
        <div class="row" style="margin-top:8px;">
          <button type="button" id="btnImport">Importar eleitores</button>
        </div>
        <pre class="raw" id="importResult"></pre>
        <h3>Cadastrados</h3>
        <div id="servidoresList" class="muted">—</div>
      </div>
    `
    el('btnImport').addEventListener('click', async () => {
      try {
        const result = await api('/admin/servidores/import', {
          method: 'POST',
          body: JSON.stringify({ csv: el('csvContent').value }),
        })
        el('importResult').textContent = JSON.stringify(result, null, 2)
        await refreshServidores()
      } catch (e) {
        el('importResult').textContent = e.message
      }
    })
    async function refreshServidores() {
      const data = await api('/admin/servidores')
      el('servidoresList').textContent = `${(data.servidores || []).length} eleitor(es) cadastrado(s).`
    }
    try {
      await refreshServidores()
    } catch (e) {
      el('servidoresList').innerHTML = `<span class="danger">${esc(e.message)}</span>`
    }
  }

  /* ---------- WORKSPACE ---------- */
  async function loadDetail(pleitoId, force) {
    if (!force && detailCache && String(detailCache.votation?._id) === String(pleitoId)) {
      return detailCache
    }
    detailCache = await api(`/admin/votacoes/${pleitoId}/detail`)
    return detailCache
  }

  function categoryOptions(categories, selectedId) {
    return (categories || [])
      .map(
        (c) =>
          `<option value="${esc(c._id)}" ${String(c._id) === String(selectedId) ? 'selected' : ''}>${esc(c.name)}</option>`,
      )
      .join('')
  }

  function readiness(detail) {
    const v = detail.votation || {}
    const cats = detail.categories || []
    const cands = detail.candidates || []
    const items = [
      { ok: !!(v.title && v.startDate && v.endDate), label: 'Dados básicos e período preenchidos' },
      { ok: cats.length > 0, label: 'Ao menos um cargo/eleição cadastrado' },
      { ok: cands.length > 0, label: 'Ao menos um candidato vinculado' },
      { ok: !!v.slug, label: 'Landing page com slug público' },
      { ok: !!(v.voterInstructions || v.bannerUrl || v.themeColor), label: 'Identidade da página pública (opcional)' },
      {
        ok: (detail.stats?.eligible || 0) > 0,
        label: 'Eleitores na base global',
      },
    ]
    const criticalOk = items.slice(0, 3).every((i) => i.ok)
    return { items, criticalOk }
  }

  async function viewWorkspace(pleitoId, section) {
    let detail
    try {
      detail = await loadDetail(pleitoId, true)
    } catch (e) {
      el('panel').innerHTML = `
        ${topNav('pleitos')}
        <div class="card"><p class="danger">${esc(e.message)}</p>
        <a href="/votacao/admin/pleitos">Voltar à lista</a></div>`
      return
    }
    const v = detail.votation
    const write = V.canWrite()
    // Auditores não acessam telas de escrita — redireciona para resumo
    const writeOnly = new Set(['configuracoes', 'landing-page', 'votacao'])
    let sec = section
    if (!write && writeOnly.has(sec)) sec = 'resumo'

    el('panel').innerHTML = workspaceNav(pleitoId, sec, v)
    const main = el('workspace-main')

    if (sec === 'resumo') await renderResumo(main, pleitoId, detail)
    else if (sec === 'configuracoes' || sec === 'votacao') await renderConfig(main, pleitoId, detail, sec)
    else if (sec === 'eleicoes') await renderEleicoes(main, pleitoId, detail)
    else if (sec === 'candidatos') await renderCandidatos(main, pleitoId, detail)
    else if (sec === 'landing-page') await renderLanding(main, pleitoId, detail)
    else if (sec === 'apuracao') await renderApuracao(main, pleitoId, detail)
    else if (sec === 'resultados') await renderResultados(main, pleitoId, detail)
    else if (sec === 'equipe') await renderEquipe(main, pleitoId)
    else await renderResumo(main, pleitoId, detail)
  }

  async function renderResumo(main, pleitoId, detail) {
    const v = detail.votation
    const s = detail.stats || {}
    const ready = readiness(detail)
    const turnout = pct(s.participants || 0, s.eligible || 0)
    const write = V.canWrite()
    main.innerHTML = `
      <div class="card">
        <h2>Visão geral</h2>
        ${
          write
            ? ''
            : '<p class="muted">Modo auditor: consulta e fiscalização deste pleito. Alterações são bloqueadas no servidor.</p>'
        }
        <div class="stats-grid">
          <div class="stat-card"><strong>${(detail.categories || []).length}</strong><span>Cargos</span></div>
          <div class="stat-card"><strong>${(detail.candidates || []).length}</strong><span>Candidatos</span></div>
          <div class="stat-card"><strong>${s.eligible || 0}</strong><span>Eleitores aptos*</span></div>
          <div class="stat-card"><strong>${s.participants || 0}</strong><span>Comparecimento</span></div>
          <div class="stat-card"><strong>${turnout}%</strong><span>Participação</span></div>
        </div>
        <p class="muted">* Base global de eleitores (ainda não vinculada exclusivamente a este pleito).</p>
        <h3>Checklist de preparação</h3>
        <ul class="checklist">
          ${ready.items
            .map(
              (i) =>
                `<li><span class="mark ${i.ok ? 'ok-mark' : 'bad-mark'}">${i.ok ? '✓' : '!'}</span><span>${esc(i.label)}</span></li>`,
            )
            .join('')}
        </ul>
        ${
          !ready.criticalOk
            ? '<p class="danger">Pendências críticas: não abra a votação (status Ativo) até concluir cargos e candidatos.</p>'
            : '<p class="ok">Itens críticos ok — revise landing e eleitores antes de ativar.</p>'
        }
        <div class="row" style="margin-top:12px;">
          <a href="${workspacePath(pleitoId, 'eleicoes')}"><button type="button" class="secondary">Cargos</button></a>
          <a href="${workspacePath(pleitoId, 'candidatos')}"><button type="button" class="secondary">Candidatos</button></a>
          ${
            write
              ? `<a href="${workspacePath(pleitoId, 'landing-page')}"><button type="button" class="secondary">Landing</button></a>`
              : ''
          }
          <a href="${workspacePath(pleitoId, 'apuracao')}"><button type="button" class="secondary">Apuração</button></a>
        </div>
      </div>
    `
  }

  async function renderConfig(main, pleitoId, detail, section) {
    const v = detail.votation
    const title =
      section === 'votacao' ? 'Controles de votação' : 'Configurações do pleito'
    main.innerHTML = `
      <div class="card">
        <h2>${title}</h2>
        <div class="row">
          <div><label>Título</label><input id="cfgTitle" value="${esc(v.title)}" /></div>
          <div><label>Status</label>
            <select id="cfgStatus">
              <option value="draft" ${v.status === 'draft' ? 'selected' : ''}>Rascunho</option>
              <option value="active" ${v.status === 'active' ? 'selected' : ''}>Ativo (votação aberta se no período)</option>
              <option value="closed" ${v.status === 'closed' ? 'selected' : ''}>Encerrado</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div><label>Início</label><input id="cfgStart" type="datetime-local" /></div>
          <div><label>Fim</label><input id="cfgEnd" type="datetime-local" /></div>
        </div>
        <div class="row"><div><label>Descrição</label><textarea id="cfgDesc" rows="3">${esc(v.description || '')}</textarea></div></div>
        <div class="row">
          <div><label>Resultados parciais públicos</label>
            <select id="cfgPartial">
              <option value="false" ${!v.allowPartialResults ? 'selected' : ''}>Não</option>
              <option value="true" ${v.allowPartialResults ? 'selected' : ''}>Sim</option>
            </select>
          </div>
        </div>
        <button type="button" id="btnSaveCfg">Salvar</button>
        <p id="cfgMsg" class="muted"></p>
      </div>
    `
    el('cfgStart').value = isoToLocalInput(v.startDate)
    el('cfgEnd').value = isoToLocalInput(v.endDate)

    el('btnSaveCfg').addEventListener('click', async () => {
      try {
        const ready = readiness(detail)
        if (el('cfgStatus').value === 'active' && !ready.criticalOk) {
          if (
            !confirm(
              'Há pendências críticas (cargos/candidatos). Deseja ativar mesmo assim?',
            )
          ) {
            return
          }
        }
        const startIso = localInputToISO(el('cfgStart').value)
        const endIso = localInputToISO(el('cfgEnd').value)
        if (!startIso || !endIso) {
          el('cfgMsg').innerHTML = '<span class="danger">Informe início e fim válidos.</span>'
          return
        }
        await api(`/admin/votacoes/${pleitoId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: el('cfgTitle').value.trim(),
            description: el('cfgDesc').value.trim(),
            startDate: startIso,
            endDate: endIso,
            status: el('cfgStatus').value,
            allowPartialResults: el('cfgPartial').value === 'true',
          }),
        })
        el('cfgMsg').innerHTML = '<span class="ok">Salvo.</span>'
        detailCache = null
        await viewWorkspace(pleitoId, section)
      } catch (e) {
        el('cfgMsg').innerHTML = `<span class="danger">${esc(e.message)}</span>`
      }
    })
  }

  async function renderEleicoes(main, pleitoId, detail) {
    const cats = detail.categories || []
    const write = V.canWrite()
    main.innerHTML = `
      <div class="card">
        <h2>Eleições e cargos</h2>
        <p class="muted">Cada cargo vira uma seção na cédula deste pleito.${write ? '' : ' (somente leitura)'}</p>
        ${
          write
            ? `<div class="row">
          <div><label>Nome</label><input id="catName" /></div>
          <div><label>Ordem</label><input id="catOrder" type="number" value="0" /></div>
          <button type="button" id="btnAddCat">Adicionar</button>
        </div>`
            : ''
        }
        <div id="catsList"></div>
      </div>
    `
    const paint = () => {
      el('catsList').innerHTML = cats.length
        ? cats
            .map(
              (c) =>
                `<div class="cand-row"><div><strong>${esc(c.order)}. ${esc(c.name)}</strong>
                <div class="muted">${c.active === false ? 'inativa' : 'ativa'}</div></div></div>`,
            )
            .join('')
        : '<p class="muted">Nenhum cargo cadastrado.</p>'
    }
    paint()
    if (!write) return
    el('btnAddCat').addEventListener('click', async () => {
      const name = el('catName').value.trim()
      if (!name) return alert('Informe o nome do cargo.')
      try {
        await api(`/admin/votacoes/${pleitoId}/categories`, {
          method: 'POST',
          body: JSON.stringify({ name, order: Number(el('catOrder').value) || 0 }),
        })
        detailCache = null
        await viewWorkspace(pleitoId, 'eleicoes')
      } catch (e) {
        alert(e.message)
      }
    })
  }

  function renderCandidatesList(pleitoId, categories, candidates) {
    const host = el('candsList')
    if (!host) return
    const write = V.canWrite()
    host.innerHTML = candidates.length
      ? candidates
          .map((c) => {
            const cat = categories.find((x) => String(x._id) === String(c.categoryId))
            const thumb = c.photoUrl
              ? `<img class="cand-thumb" src="${esc(c.photoUrl)}" alt="" />`
              : '<span class="cand-thumb" style="display:inline-flex;align-items:center;justify-content:center;background:#f1f5f9;font-size:10px;color:#94a3b8;">sem foto</span>'
            const editing = write && editingCandId === String(c._id)
            const editPanel = editing
              ? `<div class="cand-edit">
              <div class="cand-form-grid">
                <div><label>Categoria</label><select id="editCat_${c._id}">${categoryOptions(categories, c.categoryId)}</select></div>
                <div><label>Matrícula</label><input id="editNum_${c._id}" type="number" min="1" value="${esc(c.number)}" /></div>
                <div><label>Nome</label><input id="editName_${c._id}" value="${esc(c.name)}" /></div>
                <div><label>Ativo</label><select id="editActive_${c._id}"><option value="true" ${c.active !== false ? 'selected' : ''}>Sim</option><option value="false" ${c.active === false ? 'selected' : ''}>Não</option></select></div>
                <div><label>Nova foto</label><input id="editPhoto_${c._id}" type="file" accept="image/*" /></div>
              </div>
              <div class="cand-form-actions">
                <button type="button" data-save-cand="${c._id}">Salvar</button>
                <button type="button" class="secondary" data-cancel-cand>Cancelar</button>
              </div>
            </div>`
              : ''
            return `<div class="cand-block">
            <div class="cand-row">
              ${thumb}
              <div>
                <div><strong>#${esc(c.number)} ${esc(c.name)}</strong></div>
                <div class="muted">${esc(cat?.name || 'Sem categoria')} · ${c.active !== false ? 'ativo' : 'inativo'}</div>
              </div>
              ${
                write
                  ? `<div class="cand-actions">
                <button type="button" class="link-btn" data-edit-cand="${c._id}">Editar</button>
                <button type="button" class="link-btn danger" data-del-cand="${c._id}">Excluir</button>
              </div>`
                  : ''
              }
            </div>
            ${editPanel}
          </div>`
          })
          .join('')
      : '<p class="muted">Nenhum candidato.</p>'

    if (!write) return
    host.querySelectorAll('[data-edit-cand]').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingCandId = String(btn.getAttribute('data-edit-cand'))
        renderCandidatesList(pleitoId, categories, candidates)
      })
    })
    host.querySelectorAll('[data-cancel-cand]').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingCandId = null
        renderCandidatesList(pleitoId, categories, candidates)
      })
    })
    host.querySelectorAll('[data-del-cand]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este candidato?')) return
        try {
          await api(`/admin/votacoes/${pleitoId}/candidates-v2/${btn.getAttribute('data-del-cand')}`, {
            method: 'DELETE',
          })
          editingCandId = null
          detailCache = null
          await viewWorkspace(pleitoId, 'candidatos')
        } catch (e) {
          alert(e.message)
        }
      })
    })
    host.querySelectorAll('[data-save-cand]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-save-cand')
        const payload = {
          categoryId: document.getElementById(`editCat_${id}`).value,
          number: Number(document.getElementById(`editNum_${id}`).value),
          name: document.getElementById(`editName_${id}`).value.trim(),
          active: document.getElementById(`editActive_${id}`).value === 'true',
        }
        if (!payload.name || !payload.number) return alert('Nome e matrícula são obrigatórios.')
        try {
          const photoFile = document.getElementById(`editPhoto_${id}`)?.files?.[0]
          if (photoFile) {
            const fd = new FormData()
            Object.entries(payload).forEach(([k, val]) => fd.append(k, String(val)))
            fd.append('photo', photoFile)
            await apiForm(`/admin/votacoes/${pleitoId}/candidates-v2/${id}`, fd, 'PATCH')
          } else {
            await api(`/admin/votacoes/${pleitoId}/candidates-v2/${id}`, {
              method: 'PATCH',
              body: JSON.stringify(payload),
            })
          }
          editingCandId = null
          detailCache = null
          await viewWorkspace(pleitoId, 'candidatos')
        } catch (e) {
          alert(e.message)
        }
      })
    })
  }

  async function renderCandidatos(main, pleitoId, detail) {
    const categories = detail.categories || []
    const candidates = detail.candidates || []
    const write = V.canWrite()
    main.innerHTML = `
      <div class="card">
        <h2>Candidatos</h2>
        <p class="muted">${
          write
            ? 'Informe a <strong>matrícula</strong> do servidor no campo Matrícula. Em empate de votos, vence a menor matrícula.'
            : 'Lista de candidatos do pleito (somente leitura). Em empate, vence a menor matrícula.'
        }</p>
        ${
          !categories.length
            ? `<p class="danger">Cadastre cargos em <a href="${workspacePath(pleitoId, 'eleicoes')}">Eleições e cargos</a> antes de adicionar candidatos.</p>`
            : ''
        }
        ${
          write
            ? `<div class="cand-form-grid">
          <div><label>Categoria</label><select id="candCat">${categoryOptions(categories, '')}</select></div>
          <div><label>Matrícula</label><input id="candNum" type="number" min="1" placeholder="Ex.: 12345" /></div>
          <div><label>Nome</label><input id="candName" /></div>
          <div><label>Foto</label><input id="candPhoto" type="file" accept="image/*" /></div>
        </div>
        <div class="cand-form-actions">
          <img id="candPhotoPreview" alt="Prévia" />
          <button type="button" id="btnAddCand" ${categories.length ? '' : 'disabled'}>Adicionar candidato</button>
        </div>`
            : ''
        }
        <div id="candsList" style="margin-top:12px;"></div>
      </div>
    `
    if (write) {
      el('candPhoto')?.addEventListener('change', () => {
        const file = el('candPhoto').files?.[0]
        const preview = el('candPhotoPreview')
        if (!file) {
          preview.style.display = 'none'
          preview.src = ''
          return
        }
        preview.src = URL.createObjectURL(file)
        preview.style.display = 'block'
      })
      el('btnAddCand')?.addEventListener('click', async () => {
        const photoFile = el('candPhoto').files?.[0]
        try {
          if (photoFile) {
            const fd = new FormData()
            fd.append('categoryId', el('candCat').value)
            fd.append('number', String(Number(el('candNum').value)))
            fd.append('name', el('candName').value.trim())
            fd.append('photo', photoFile)
            await apiForm(`/admin/votacoes/${pleitoId}/candidates-v2`, fd, 'POST')
          } else {
            await api(`/admin/votacoes/${pleitoId}/candidates-v2`, {
              method: 'POST',
              body: JSON.stringify({
                categoryId: el('candCat').value,
                number: Number(el('candNum').value),
                name: el('candName').value.trim(),
              }),
            })
          }
          editingCandId = null
          detailCache = null
          await viewWorkspace(pleitoId, 'candidatos')
        } catch (e) {
          alert(e.message)
        }
      })
    }
    renderCandidatesList(pleitoId, categories, candidates)
  }

  async function renderEquipe(main, pleitoId) {
    const write = V.canManageAuditors()
    main.innerHTML = `
      <div class="card">
        <h2>Equipe / Auditores do pleito</h2>
        <p class="muted">
          Auditores têm acesso <strong>somente leitura</strong> a este pleito, com vínculo registrado,
          justificativa institucional e trilha de auditoria. Não podem alterar configurações, candidatos nem status.
        </p>
        ${
          write
            ? `<h3>Designar auditor</h3>
        <div class="cand-form-grid">
          <div><label>E-mail</label><input id="audEmail" type="email" autocomplete="off" /></div>
          <div><label>Nome (se novo usuário)</label><input id="audName" /></div>
          <div><label>Telefone</label><input id="audPhone" placeholder="opcional" /></div>
        </div>
        <div class="row" style="margin-top:10px;">
          <div class="full"><label>Justificativa institucional (obrigatória)</label>
            <textarea id="audJust" rows="3" placeholder="Mín. 20 caracteres — motivo da designação, base normativa ou determinação da autoridade competente..."></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" id="btnInviteAud">Designar auditor</button>
        </div>
        <p id="audMsg" class="muted"></p>
        <pre class="raw" id="audTempPass" style="display:none;"></pre>`
            : '<p class="muted">Você pode consultar quem está designado para fiscalizar este pleito.</p>'
        }
        <h3>Designações</h3>
        <div id="audList" class="muted">Carregando...</div>
      </div>
    `

    async function loadAuditors() {
      try {
        const data = await api(`/admin/votacoes/${pleitoId}/auditores`)
        const items = data.items || []
        if (!items.length) {
          el('audList').innerHTML = '<p class="muted">Nenhum auditor designado.</p>'
          return
        }
        el('audList').innerHTML = items
          .map((m) => {
            const u = m.user || {}
            const st =
              m.status === 'active'
                ? '<span class="badge badge-active">Ativo</span>'
                : '<span class="badge badge-closed">Revogado</span>'
            return `<div class="pleito-card">
              <div>
                <h3>${esc(u.name || '—')} ${st}</h3>
                <div class="meta-row">
                  <span>${esc(u.email || '')}</span>
                  <span>desde ${fmtDate(m.invitedAt)}</span>
                  ${m.lastAccessAt ? `<span>último acesso ${fmtDate(m.lastAccessAt)}</span>` : ''}
                </div>
                <p class="muted" style="margin:6px 0 0;">Justificativa: ${esc(m.justification || '—')}</p>
                ${m.revokeReason ? `<p class="danger" style="margin:4px 0 0;">Revogação: ${esc(m.revokeReason)}</p>` : ''}
              </div>
              ${
                write && m.status === 'active'
                  ? `<div class="card-actions">
                  <button type="button" class="secondary" data-revoke="${esc(m.id)}">Revogar acesso</button>
                </div>`
                  : ''
              }
            </div>`
          })
          .join('')

        if (write) {
          el('audList').querySelectorAll('[data-revoke]').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const reason = prompt('Motivo da revogação (obrigatório, mín. 10 caracteres):')
              if (!reason || reason.trim().length < 10) {
                alert('Informe o motivo da revogação.')
                return
              }
              try {
                await api(`/admin/votacoes/${pleitoId}/auditores/${btn.getAttribute('data-revoke')}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ revokeReason: reason.trim() }),
                })
                await loadAuditors()
              } catch (e) {
                alert(e.message)
              }
            })
          })
        }
      } catch (e) {
        el('audList').innerHTML = `<span class="danger">${esc(e.message)}</span>`
      }
    }

    if (write) {
      el('btnInviteAud').addEventListener('click', async () => {
        const email = el('audEmail').value.trim()
        const name = el('audName').value.trim()
        const phone = el('audPhone').value.trim()
        const justification = el('audJust').value.trim()
        if (!email || !email.includes('@')) {
          el('audMsg').innerHTML = '<span class="danger">Informe um e-mail válido.</span>'
          return
        }
        if (justification.length < 20) {
          el('audMsg').innerHTML =
            '<span class="danger">A justificativa institucional deve ter pelo menos 20 caracteres (lisura / rastreabilidade).</span>'
          return
        }
        el('audMsg').textContent = 'Registrando...'
        el('audTempPass').style.display = 'none'
        try {
          const data = await api(`/admin/votacoes/${pleitoId}/auditores`, {
            method: 'POST',
            body: JSON.stringify({ email, name, phone, justification }),
          })
          el('audMsg').innerHTML = `<span class="ok">${esc(data.message)}</span>`
          if (data.temporaryPassword) {
            el('audTempPass').style.display = 'block'
            el('audTempPass').textContent =
              `SENHA TEMPORÁRIA (exibida uma única vez):\n${data.temporaryPassword}\n\nEntregue ao auditor por canal seguro e oriente a troca no primeiro acesso.`
          }
          el('audEmail').value = ''
          el('audName').value = ''
          el('audJust').value = ''
          await loadAuditors()
        } catch (e) {
          el('audMsg').innerHTML = `<span class="danger">${esc(e.message)}</span>`
        }
      })
    }
    await loadAuditors()
  }

  async function renderLanding(main, pleitoId, detail) {
    const v = detail.votation
    const url = v.slug ? `/votacao/p/${v.slug}` : ''
    main.innerHTML = `
      <div class="card">
        <h2>Página pública (landing)</h2>
        ${
          url
            ? `<p class="muted">URL: <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></p>`
            : '<p class="muted">O slug é gerado ao salvar o título do pleito.</p>'
        }
        <div class="row">
          <div><label>Instruções aos eleitores</label><textarea id="pInstructions" rows="4">${esc(v.voterInstructions || '')}</textarea></div>
        </div>
        <div class="row">
          <div><label>Cor do tema</label><input id="pTheme" type="color" value="${esc(v.themeColor || '#1e3a8a')}" /></div>
          <div><label>Banner (capa)</label><input id="pBanner" type="file" accept="image/*" />
            <p class="muted" style="margin:4px 0 0;">Recomendado: 1200×630 px, JPG ou PNG.</p></div>
        </div>
        <button type="button" id="btnSaveLanding">Salvar landing page</button>
        <p id="landingMsg" class="muted">${v.bannerUrl ? `Banner atual: ${esc(v.bannerUrl)}` : ''}</p>
        ${url ? `<p><a href="${esc(url)}" target="_blank" rel="noopener"><button type="button" class="secondary">Pré-visualizar</button></a></p>` : ''}
      </div>
    `
    el('btnSaveLanding').addEventListener('click', async () => {
      const fd = new FormData()
      fd.append('voterInstructions', el('pInstructions').value.trim())
      fd.append('themeColor', el('pTheme').value)
      const banner = el('pBanner').files?.[0]
      if (banner) fd.append('banner', banner)
      el('landingMsg').textContent = 'Salvando...'
      try {
        const data = await apiForm(`/admin/votacoes/${pleitoId}`, fd, 'PATCH')
        el('landingMsg').innerHTML = `<span class="ok">${data.landingUrl ? `Salvo. URL: ${esc(data.landingUrl)}` : 'Salvo.'}</span>`
        detailCache = null
        await viewWorkspace(pleitoId, 'landing-page')
      } catch (e) {
        el('landingMsg').innerHTML = `<span class="danger">${esc(e.message)}</span>`
      }
    })
  }

  function renderApuracaoDashboard(host, data) {
    const eligible = data.eligibleVoters || 0
    const participants = data.participants || 0
    const abstentions = data.abstentions || 0
    const turnout = pct(participants, eligible)
    const abstPct = pct(abstentions, eligible)
    let html = ''
    if (data.partial) {
      html += '<div class="badge-partial">Apuração parcial — pleito ainda em andamento</div>'
    }
    html += `<div class="stats-grid">
      <div class="stat-card"><strong>${eligible}</strong><span>Eleitores aptos</span></div>
      <div class="stat-card"><strong>${participants}</strong><span>Votaram</span></div>
      <div class="stat-card"><strong>${abstentions}</strong><span>Abstenções</span></div>
      <div class="stat-card"><strong>${turnout}%</strong><span>Comparecimento</span></div>
      <div class="stat-card"><strong>${abstPct}%</strong><span>Abstenção</span></div>
    </div>`

    const categories = data.categories || []
    if (!categories.length) {
      html += '<p class="muted">Nenhuma categoria configurada neste pleito.</p>'
      host.innerHTML = html
      return
    }

    categories.forEach((cat) => {
      const total = cat.totalVotes || 0
      const segments = []
      ;(cat.candidates || []).forEach((c) => {
        if (c.votes > 0) segments.push({ label: `${c.number} ${c.name}`, votes: c.votes, pct: pct(c.votes, total) })
      })
      if (cat.blank > 0) segments.push({ label: 'Branco', votes: cat.blank, pct: pct(cat.blank, total) })
      if (cat.null > 0) segments.push({ label: 'Nulo', votes: cat.null, pct: pct(cat.null, total) })

      html += `<div class="apur-cat">
        <h4>${esc(cat.name)} <span class="muted">(${total} voto${total === 1 ? '' : 's'})</span></h4>
        <div class="donut-wrap">
          <div class="donut" style="${donutStyle(segments)}"><div class="donut-hole"><strong>${total}</strong>votos</div></div>
          <div style="flex:1;min-width:200px;"><div class="stack-bar">`
      segments.forEach((s, i) => {
        html += `<div class="stack-seg" style="width:${s.pct}%;background:${CHART_COLORS[i % CHART_COLORS.length]}" title="${esc(s.label)}: ${s.votes}"></div>`
      })
      html += `</div><div class="stack-legend">`
      segments.forEach((s, i) => {
        html += `<span><span class="legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>${esc(s.label)}: ${s.votes} (${s.pct}%)</span>`
      })
      html += `</div></div></div>`

      const ranked = [...(cat.candidates || [])].sort((a, b) => {
        if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0)
        const na = Number(a.number)
        const nb = Number(b.number)
        const sa = Number.isFinite(na) ? na : Infinity
        const sb = Number.isFinite(nb) ? nb : Infinity
        return sa - sb
      })
      html += `<table class="rank-table"><thead><tr><th>#</th><th>Candidato</th><th>Votos</th><th>%</th><th>Distribuição</th></tr></thead><tbody>`
      ranked.forEach((c, idx) => {
        const p = pct(c.votes, total)
        const isLeader = idx === 0 && c.votes > 0
        const thumb = c.photoUrl
          ? `<img class="cand-thumb" src="${esc(c.photoUrl)}" alt="" />`
          : '<span class="cand-thumb" style="display:inline-flex;align-items:center;justify-content:center;background:#f1f5f9;font-size:9px;color:#94a3b8;">—</span>'
        html += `<tr class="${isLeader ? 'leader' : ''}">
          <td class="rank-pos">${idx + 1}º</td>
          <td><div class="cand-row" style="border:0;padding:0;">${thumb}<div><strong>${esc(c.number)} — ${esc(c.name)}</strong>${isLeader ? ' <span style="color:#0f766e;font-size:0.8rem;">▲ líder</span>' : ''}</div></div></td>
          <td><strong>${c.votes}</strong></td>
          <td>${p}%</td>
          <td><div class="rank-bar-wrap"><div class="rank-bar" style="width:${p}%"></div></div></td>
        </tr>`
      })
      if (cat.blank > 0) {
        const p = pct(cat.blank, total)
        html += `<tr><td class="rank-pos">—</td><td><em>Voto em branco</em></td><td>${cat.blank}</td><td>${p}%</td><td><div class="rank-bar-wrap"><div class="rank-bar" style="width:${p}%;background:#94a3b8"></div></div></td></tr>`
      }
      if (cat.null > 0) {
        const p = pct(cat.null, total)
        html += `<tr><td class="rank-pos">—</td><td><em>Voto nulo</em></td><td>${cat.null}</td><td>${p}%</td><td><div class="rank-bar-wrap"><div class="rank-bar" style="width:${p}%;background:#cbd5e1"></div></div></td></tr>`
      }
      html += `</tbody></table></div>`
    })
    host.innerHTML = html
  }

  async function downloadExport(pleitoId, pathSuffix, filename) {
    const url = `${V.API}/admin/votacoes/${pleitoId}/${pathSuffix}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${V.getToken()}` } })
    if (!r.ok) {
      alert('Erro ao exportar')
      return
    }
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }

  async function renderApuracao(main, pleitoId) {
    main.innerHTML = `
      <div class="card">
        <h2>Apuração</h2>
        <p class="muted">Resultados deste pleito apenas — sem seletor de outro processo.</p>
        <div class="row">
          <button type="button" id="btnApurar">Atualizar</button>
          <button type="button" class="secondary" id="btnExportVotos">Exportar votos</button>
          <button type="button" class="secondary" id="btnExportPresenca">Exportar comparecimento</button>
          <button type="button" class="secondary" id="btnExportApuracao">Exportar apuração (planilha)</button>
        </div>
        <p id="apurMsg" class="muted">Carregando...</p>
        <div id="apurDashboard"></div>
      </div>
    `
    const run = async () => {
      el('apurMsg').textContent = 'Carregando apuração...'
      el('apurDashboard').innerHTML = ''
      try {
        const data = await api(`/admin/votacoes/${pleitoId}/resultado-v2`)
        el('apurMsg').textContent = `${data.votation?.title || 'Pleito'} — ${new Date().toLocaleString('pt-BR')}`
        renderApuracaoDashboard(el('apurDashboard'), data)
      } catch (e) {
        el('apurMsg').innerHTML = `<span class="danger">${esc(e.message)}</span>`
      }
    }
    el('btnApurar').addEventListener('click', run)
    el('btnExportVotos').addEventListener('click', () =>
      downloadExport(pleitoId, 'export-votos-v2.csv', 'votos.csv'),
    )
    el('btnExportPresenca').addEventListener('click', () =>
      downloadExport(pleitoId, 'export-comparecimento.csv', 'comparecimento.csv'),
    )
    el('btnExportApuracao').addEventListener('click', () =>
      downloadExport(pleitoId, 'export-resultado-v2.csv', 'apuracao.csv'),
    )
    await run()
  }

  async function renderResultados(main, pleitoId, detail) {
    const v = detail.votation
    const write = V.canWrite()
    const statusLabel =
      v.status === 'active' ? 'Ativo' : v.status === 'closed' ? 'Encerrado' : 'Rascunho'
    main.innerHTML = `
      <div class="card">
        <h2>Publicação de resultados</h2>
        <p class="muted">${
          write
            ? 'Encerrar a votação e controlar se o público vê a apuração.'
            : 'Consulta do status de publicação (somente leitura).'
        }
          A apuração detalhada fica em
          <a href="${workspacePath(pleitoId, 'apuracao')}">Apuração</a>.</p>
        ${
          write
            ? `<div class="row">
          <div><label>Status do pleito</label>
            <select id="resStatus">
              <option value="draft" ${v.status === 'draft' ? 'selected' : ''}>Rascunho</option>
              <option value="active" ${v.status === 'active' ? 'selected' : ''}>Ativo</option>
              <option value="closed" ${v.status === 'closed' ? 'selected' : ''}>Encerrado</option>
            </select>
          </div>
          <div><label>Resultados parciais públicos</label>
            <select id="resPartial">
              <option value="false" ${!v.allowPartialResults ? 'selected' : ''}>Não</option>
              <option value="true" ${v.allowPartialResults ? 'selected' : ''}>Sim</option>
            </select>
          </div>
        </div>
        <button type="button" id="btnSaveRes">Salvar publicação</button>
        <p id="resMsg" class="muted"></p>`
            : `<div class="meta-row" style="margin:12px 0;">
          ${statusBadge(v.status)}
          <span>Parciais públicos: <strong>${v.allowPartialResults ? 'Sim' : 'Não'}</strong></span>
          <span>Status atual: <strong>${esc(statusLabel)}</strong></span>
        </div>`
        }
        <p class="muted">Endpoint público: <code>/api/votacao/votacoes/${esc(pleitoId)}/resultado-v2</code>
          (disponível se encerrado ou com parciais liberados).</p>
      </div>
    `
    if (write) {
      el('btnSaveRes').addEventListener('click', async () => {
        try {
          await api(`/admin/votacoes/${pleitoId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: el('resStatus').value,
              allowPartialResults: el('resPartial').value === 'true',
            }),
          })
          el('resMsg').innerHTML = '<span class="ok">Salvo.</span>'
          detailCache = null
          await viewWorkspace(pleitoId, 'resultados')
        } catch (e) {
          el('resMsg').innerHTML = `<span class="danger">${esc(e.message)}</span>`
        }
      })
    }
  }

  async function renderRoute() {
    const route = V.parseRoute()
    if (route.name === 'redirect-pleitos') {
      navigate('/votacao/admin/pleitos')
      return
    }
    if (!V.getToken()) {
      showLoginOnly()
      return
    }
    let panel = el('panel')
    if (!panel) {
      el('app-root').innerHTML = '<div id="panel"></div>'
      panel = el('panel')
    }
    panel.style.display = 'block'
    try {
      if (route.name === 'pleitos') await viewPleitosList()
      else if (route.name === 'eleitores') await viewEleitores()
      else if (route.name === 'workspace') await viewWorkspace(route.pleitoId, route.section)
      else await viewPleitosList()
    } catch (e) {
      setMsg(esc(e.message), true)
    }
    bindLogout()
  }

  function interceptLinks(e) {
    const a = e.target.closest('a')
    if (!a) return
    const href = a.getAttribute('href') || ''
    if (!href.startsWith('/votacao/admin')) return
    if (href.includes('admin-legacy') || href.includes('/assets/')) return
    e.preventDefault()
    navigate(href)
  }

  async function init() {
    document.addEventListener('click', interceptLinks)
    window.addEventListener('popstate', () => renderRoute())
    window.addEventListener('votacao-route', () => renderRoute())

    if (V.getToken()) {
      try {
        await api('/admin/dashboard')
        await bootAuthenticated()
        return
      } catch (e) {
        V.logout()
        showLoginOnly(e.message || 'Sessão inválida. Entre novamente.')
        return
      }
    }
    showLoginOnly()
  }

  document.addEventListener('DOMContentLoaded', init)
})()
