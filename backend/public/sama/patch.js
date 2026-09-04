(function () {
    // Capturar erros nÃ£o tratados para evitar tela branca silenciosa
    function showErrorFallback(msg) {
        var root = document.getElementById('root');
        if (root && !root.querySelector('.sama-error-fallback')) {
            root.innerHTML = '<div class="sama-error-fallback" style="padding:2rem;font-family:sans-serif;max-width:500px;margin:2rem auto;">' +
                '<h2 style="color:#c53030;">Algo deu errado</h2>' +
                '<p>' + (msg || 'Ocorreu um erro. Atualize a pÃ¡gina (F5) ou tente novamente mais tarde.') + '</p>' +
                '<p style="font-size:0.9em;color:#666;">Abra o Console (F12) para mais detalhes.</p>' +
                '<div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">' +
                '<a href="/garcapet/login?redirect=' + encodeURIComponent('/garcapet/') + '" style="padding:0.5rem 1rem;background:#384D9C;color:white;border-radius:4px;text-decoration:none;">Ir para Login</a>' +
                '<button onclick="location.reload()" style="padding:0.5rem 1rem;cursor:pointer;">Atualizar</button></div></div>';
        }
    }
    window.addEventListener('error', function (e) {
        console.error('[SAMA] Erro:', e.message, e.filename, e.lineno);
        if (e.message && e.message.includes("null (reading 'isAdmin')")) {
            e.preventDefault();
            e.stopPropagation();
            setTimeout(function() {
                showErrorFallback('Erro ao carregar. Clique em "Ir para Login" para acessar o SAMA.');
            }, 0);
            return true;
        }
        if (e.message && (e.message.includes('Loading') || e.message.includes('fetch'))) showErrorFallback('Falha ao carregar dados. Verifique sua conexÃ£o.');
    });
    window.addEventListener('unhandledrejection', function (e) {
        console.error('[SAMA] Promise rejeitada:', e.reason);
        var msg = (e.reason && e.reason.message) ? String(e.reason.message) : '';
        if (msg.indexOf('Network') >= 0 || msg.indexOf('Failed') >= 0 || e.reason && e.reason.response) {
            showErrorFallback('Falha na comunicaÃ§Ã£o com o servidor. Tente atualizar a pÃ¡gina.');
        }
    });

    // SEMIT_A_PET/SAMA: usa as mesmas regras do memorial (login unificado em /login)
    window.__LOGIN_URL__ = '/garcapet/login';
    window.__getLoginRedirectUrl__ = function (returnPath) {
        var path = returnPath || (typeof window !== 'undefined' ? window.location.pathname : '/garcapet/');
        return '/garcapet/login?redirect=' + encodeURIComponent(path);
    };

    // Ajustes de responsividade para /garcapet em telas pequenas.
    (function patchGarcaPetMobileLayout() {
        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/garcapet') !== 0) return;

        if (document.getElementById('garcapet-mobile-layout-patch')) return;

        var style = document.createElement('style');
        style.id = 'garcapet-mobile-layout-patch';
        style.textContent = [
            '@media (max-width: 768px) {',
            '  html, body, #root {',
            '    padding-left: 0 !important;',
            '    padding-right: 0 !important;',
            '    margin-left: 0 !important;',
            '    margin-right: 0 !important;',
            '    overflow-x: hidden !important;',
            '  }',
            '  main, section, article {',
            '    padding-left: 8px !important;',
            '    padding-right: 8px !important;',
            '    margin-left: 0 !important;',
            '    margin-right: 0 !important;',
            '    margin-top: 0 !important;',
            '    margin-bottom: 0 !important;',
            '  }',
            '  [class*="container"], [class*="_container"], [class*="wrapper"], [class*="_wrapper"], [class*="content"], [class*="_content"] {',
            '    padding-left: 8px !important;',
            '    padding-right: 8px !important;',
            '    margin-left: 0 !important;',
            '    margin-right: 0 !important;',
            '    max-width: 100% !important;',
            '  }',
            '  /* Reduz espaços excessivos entre blocos no mobile */',
            '  section + section, div + section, section + div {',
            '    margin-top: 12px !important;',
            '  }',
            '  [class*="section"], [class*="container"], [class*="wrapper"] {',
            '    margin-bottom: 12px !important;',
            '  }',
            '  /* Textos institucionais/alvos de conteúdo devem ficar à esquerda no mobile */',
            '  [class*="about"], [class*="sobre"], [class*="description"], [class*="intro"], [class*="texto"], [class*="content"] {',
            '    text-align: left !important;',
            '  }',
            '  [class*="about"] p, [class*="sobre"] p, [class*="description"] p, [class*="intro"] p, [class*="texto"] p, [class*="content"] p {',
            '    text-align: left !important;',
            '    margin-left: 0 !important;',
            '    margin-right: 0 !important;',
            '  }',
            '',
            '  /* Grid dos pets: 2 cards por linha no celular */',
            '  [class*="pet_container"], [class*="pet-grid"], [class*="pets_grid"] {',
            '    display: grid !important;',
            '    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;',
            '    gap: 8px !important;',
            '    align-items: stretch !important;',
            '    width: 100% !important;',
            '    max-width: 100% !important;',
            '    padding-left: 0 !important;',
            '    padding-right: 0 !important;',
            '    margin-left: 0 !important;',
            '    margin-right: 0 !important;',
            '  }',
            '  [class*="pet_card"], [class*="pet-card"], [class*="card_pet"] {',
            '    width: 100% !important;',
            '    min-width: 0 !important;',
            '    margin: 0 !important;',
            '    justify-self: stretch !important;',
            '  }',
            '  [class*="section_title_container"], [class*="sorting_container"], [class*="filter_bar_container"] {',
            '    padding-left: 0 !important;',
            '    padding-right: 0 !important;',
            '    margin-left: 0 !important;',
            '    margin-right: 0 !important;',
            '  }',
            '  [class*="pet_card"] h3, [class*="pet-card"] h3, [class*="card_pet"] h3 {',
            '    font-size: 1rem !important;',
            '    line-height: 1.2 !important;',
            '  }',
            '  [class*="pet_card"] p, [class*="pet-card"] p, [class*="card_pet"] p {',
            '    font-size: .85rem !important;',
            '    line-height: 1.25 !important;',
            '  }',
            '',
            '  /* Botão CTA "Encontrar meu novo amigo" com destaque verde */',
            '  button, a[role="button"], input[type="button"], input[type="submit"] {',
            '    border-radius: 12px !important;',
            '  }',
            '  button[class*="find"], button[class*="cta"], a[class*="find"], a[class*="cta"] {',
            '    background: #446042 !important;',
            '    color: #fff !important;',
            '    border: 1px solid #446042 !important;',
            '    box-shadow: 0 6px 14px rgba(68,96,66,.22) !important;',
            '  }',
            '  /* Fallback por texto: aplica em botões/links com esse rótulo via JS marker class */',
            '  .garcapet-find-friend-btn {',
            '    background: #446042 !important;',
            '    color: #fff !important;',
            '    border: 1px solid #446042 !important;',
            '    box-shadow: 0 6px 14px rgba(68,96,66,.22) !important;',
            '  }',
            '}'
        ].join('\n');

        document.head.appendChild(style);

        // Marca CTA por texto para estilização robusta sem depender da classe minificada.
        function markFindFriendButtons() {
            var nodes = document.querySelectorAll('button,a,input[type="button"],input[type="submit"]');
            for (var i = 0; i < nodes.length; i++) {
                var txt = ((nodes[i].textContent || nodes[i].value || '') + '').trim().toLowerCase();
                if (txt.indexOf('encontrar meu novo amigo') >= 0) {
                    nodes[i].classList.add('garcapet-find-friend-btn');
                }
            }
        }
        markFindFriendButtons();
        var ctaObs = new MutationObserver(function () { markFindFriendButtons(); });
        ctaObs.observe(document.documentElement, { childList: true, subtree: true });
    })();

    // Sincroniza auth e token para compatibilidade entre portal principal e SAMA (Projeto GarÃ§aPet)
    try {
        var auth = localStorage.getItem('auth');
        var token = localStorage.getItem('token');
        if (auth && !token) {
            try {
                var parsed = JSON.parse(auth);
                if (parsed && parsed.token) {
                    localStorage.setItem('token', String(parsed.token).replace(/^"+|"+$/g, ''));
                }
            } catch (_) { }
        } else if (token && !auth) {
            localStorage.setItem('auth', JSON.stringify({ token: token }));
        }
    } catch (_) { }

    // Monkey-Patch JSON.parse para evitar CRASH TOTAL do React (sem limpar sessÃ£o do usuÃ¡rio)
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        if (typeof text !== 'string') return text;
        try {
            return originalParse(text, reviver);
        } catch (e) {
            const trimmed = String(text).trim().replace(/^"+|"+$/g, '');
            // Compat: em alguns fluxos o token JWT foi salvo como string "crua" no localStorage.
            // Nesses casos, retornar o token evita quebra do Profile ao tentar ler auth/token.
            if (/^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*$/.test(trimmed)) {
                return trimmed;
            }
            console.warn('JSON.parse falhou e foi silenciado:', e);
            // REMOVIDO: localStorage.clear() - estava causando logout inesperado ao clicar em
            // "Quero Doar", pois qualquer falha de parse em strings com "token" zerava a sessÃ£o
            return null;
        }
    };

    // Limpeza preventiva APENAS de tokens claramente corrompidos (nÃ£o remove JWTs vÃ¡lidos)
    try {
        const t = localStorage.getItem('token');
        // SÃ³ remove se for string invÃ¡lida (ex: "undefined", "null" como texto, ou lixo)
        if (t && typeof t === 'string') {
            const trimmed = t.trim();
            if (trimmed.length > 0 && trimmed.length < 20 &&
                !trimmed.startsWith('ey') && !trimmed.startsWith('{')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
    } catch (e) { }

    // Corrige navegacao da navbar para "Vacinacao":
    // a SPA atual nao possui rota React dedicada para /vacinacao.
    // Forcamos caminho absoluto com recarregamento completo da pagina.
    (function fixVacinacaoNavbarNavigation() {
        var VAC_PATH = 'https://api.garca.sp.gov.br/garcapet/vacinacao';

        function isVacinacaoLink(el) {
            if (!el) return false;
            var txt = (el.textContent || '').trim().toLowerCase();
            var href = (el.getAttribute('href') || '').toLowerCase();
            return txt === 'vacinação' ||
                txt === 'vacinacao' ||
                href === '/vacinacao' ||
                href === 'vacinacao' ||
                href === '/garcapet/vacinacao' ||
                href === 'https://api.garca.sp.gov.br/garcapet/vacinacao' ||
                href.endsWith('/vacinacao');
        }

        function normalizeLinks() {
            var links = document.querySelectorAll('a');
            for (var i = 0; i < links.length; i++) {
                var a = links[i];
                if (isVacinacaoLink(a)) {
                    a.setAttribute('href', VAC_PATH);
                }
            }
        }

        // Garante que o item "Vacinacao" exista no dropdown Institucional.
        function ensureVacinacaoMenuItem() {
            var allLinks = document.querySelectorAll('a');
            var hasVacinacao = false;
            for (var i = 0; i < allLinks.length; i++) {
                var txt = (allLinks[i].textContent || '').trim().toLowerCase();
                if (txt === 'vacinação' || txt === 'vacinacao') {
                    hasVacinacao = true;
                    allLinks[i].setAttribute('href', VAC_PATH);
                }
            }
            if (hasVacinacao) return;

            // Usa "Castracao" como ancora para inserir "Vacinacao" no mesmo menu.
            var castracaoLinks = [];
            for (var j = 0; j < allLinks.length; j++) {
                var t = (allLinks[j].textContent || '').trim().toLowerCase();
                if (t === 'castração' || t === 'castracao') castracaoLinks.push(allLinks[j]);
            }

            for (var k = 0; k < castracaoLinks.length; k++) {
                var base = castracaoLinks[k];
                var parent = base.parentNode;
                if (!parent) continue;

                var clone = base.cloneNode(true);
                clone.textContent = 'Vacinação';
                clone.setAttribute('href', VAC_PATH);

                if (base.nextSibling) parent.insertBefore(clone, base.nextSibling);
                else parent.appendChild(clone);
            }
        }

        // Captura o clique antes do React Router e faz navegacao real.
        document.addEventListener('click', function (ev) {
            var target = ev.target;
            var anchor = target && target.closest ? target.closest('a') : null;
            if (!isVacinacaoLink(anchor)) return;
            ev.preventDefault();
            ev.stopPropagation();
            window.location.assign(VAC_PATH);
        }, true);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                ensureVacinacaoMenuItem();
                normalizeLinks();
            });
        } else {
            ensureVacinacaoMenuItem();
            normalizeLinks();
        }

        // Menu pode ser re-renderizado pelo React; normaliza periodicamente.
        var attempts = 0;
        var timer = setInterval(function () {
            attempts += 1;
            ensureVacinacaoMenuItem();
            normalizeLinks();
            if (attempts > 30) clearInterval(timer);
        }, 500);
    })();

    // Integracao de vacinacao no cadastro/edicao de pets sem alterar o bundle React.
    (function patchPetVaccinationForm() {
        var STATE = { vaccines: [] };
        var ORIGINAL_FETCH = window.fetch ? window.fetch.bind(window) : null;
        var LAST_FORM_PATH = '';
        var EDIT_CTX = {
            petId: null,
            didInitialLoad: false,
            userTouchedVaccines: false
        };

        function isPetFormPath() {
            var p = (window.location.pathname || '').toLowerCase();
            return p.indexOf('/pet/add') >= 0 || p.indexOf('/pet/edit/') >= 0;
        }

        function normalizeVaccine(input) {
            var vaccineName = String(input.vaccineName || '').trim();
            var applicationDate = String(input.applicationDate || '').trim();
            if (!vaccineName || !applicationDate) return null;
            return {
                vaccineName: vaccineName,
                dose: String(input.dose || '1a dose').trim() || '1a dose',
                applicationDate: applicationDate,
                nextDueDate: String(input.nextDueDate || '').trim() || undefined,
                status: String(input.status || 'aplicada').trim().toLowerCase(),
                notes: String(input.notes || '').trim()
            };
        }

        function vaccinesPayload() {
            return STATE.vaccines.map(function (v) {
                return {
                    nomeVacina: v.vaccineName,
                    dataAplicacao: v.applicationDate,
                    proximaDose: v.nextDueDate || undefined,
                    observacoes: v.notes || ''
                };
            });
        }

        function renderVaccinesList(listEl) {
            if (!listEl) return;
            if (!STATE.vaccines.length) {
                listEl.innerHTML = '<div style="font-size:12px;color:#64748b">Nenhuma vacina adicionada.</div>';
                return;
            }

            listEl.innerHTML = STATE.vaccines.map(function (v, idx) {
                return '' +
                    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;padding:8px 10px;border:1px solid #dbe1ec;border-radius:8px;margin-bottom:8px;background:#f8fafc">' +
                    '<div style="font-size:12px;line-height:1.4;color:#334155">' +
                    '<strong>' + v.vaccineName + '</strong> (' + (v.dose || '1a dose') + ')<br>' +
                    'Aplicacao: ' + v.applicationDate + (v.nextDueDate ? ' | Proxima: ' + v.nextDueDate : '') +
                    (v.status ? '<br>Status: ' + v.status : '') +
                    (v.notes ? '<br>Obs: ' + v.notes : '') +
                    '</div>' +
                    '<button type="button" data-vac-remove="' + idx + '" style="border:none;background:#fee2e2;color:#991b1b;border-radius:6px;padding:4px 8px;cursor:pointer">Remover</button>' +
                    '</div>';
            }).join('');
        }

        function createVaccinationBlock() {
            var wrap = document.createElement('div');
            wrap.id = 'pet-vaccination-block';
            wrap.style.cssText = 'margin-top:16px;padding:14px;border:1px solid #dbe1ec;border-radius:10px;background:#fff';
            wrap.innerHTML = '' +
                '<h4 style="margin:0 0 10px;font-size:16px;color:#1e293b">Vacinacao</h4>' +
                '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">' +
                '<div><label style="font-size:12px;color:#334155">Vacina *</label><input id="vac-vaccineName" type="text" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px"></div>' +
                '<div><label style="font-size:12px;color:#334155">Dose</label><input id="vac-dose" type="text" placeholder="1a dose" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px"></div>' +
                '<div><label style="font-size:12px;color:#334155">Data de aplicacao *</label><input id="vac-applicationDate" type="date" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px"></div>' +
                '<div><label style="font-size:12px;color:#334155">Proxima dose</label><input id="vac-nextDueDate" type="date" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px"></div>' +
                '<div><label style="font-size:12px;color:#334155">Status</label><select id="vac-status" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px"><option value="aplicada">Aplicada</option><option value="pendente">Pendente</option><option value="atrasada">Atrasada</option></select></div>' +
                '<div><label style="font-size:12px;color:#334155">Observacoes</label><input id="vac-notes" type="text" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px"></div>' +
                '</div>' +
                '<div style="margin-top:10px;display:flex;justify-content:flex-end">' +
                '<button type="button" id="vac-add-btn" style="border:none;background:#384D9C;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer">Adicionar vacina</button>' +
                '</div>' +
                '<div id="vac-list" style="margin-top:12px"></div>';
            return wrap;
        }

        function findPetSubmitAnchor() {
            var direct =
                document.querySelector('input[value="Cadastrar Pet"]') ||
                document.querySelector('input[value="Atualizar"]') ||
                document.querySelector('button[type="submit"]');
            if (direct) return direct;

            var candidates = document.querySelectorAll('input,button');
            for (var i = 0; i < candidates.length; i += 1) {
                var el = candidates[i];
                var label = ((el.value || el.textContent || '') + '').trim().toLowerCase();
                if (!label) continue;
                if (label.indexOf('cadastrar pet') === -1 && label.indexOf('atualizar') === -1) continue;
                return el;
            }
            return null;
        }

        function findChipInput() {
            return (
                document.querySelector('input[name="chip"]') ||
                document.querySelector('input[placeholder*="chip"], input[placeholder*="Chip"]')
            );
        }

        function findChipAnchor() {
            var chipInput = findChipInput();
            if (!chipInput) return null;
            return (chipInput.closest && chipInput.closest('div')) ? chipInput.closest('div') : chipInput;
        }

        function applyChipOptionalUI() {
            if (!isPetFormPath()) return;
            var chipInput = findChipInput();
            if (!chipInput) return;
            chipInput.removeAttribute('required');
            chipInput.setAttribute('aria-required', 'false');
            chipInput.setAttribute('autocomplete', 'off');
            var wrap = chipInput.closest ? chipInput.closest('div') : null;
            var label = wrap ? wrap.querySelector('label') : null;
            if (label) {
                var labelText = (label.textContent || '').replace(/:\s*$/, '').trim();
                if (labelText.indexOf('Opcional') < 0 && labelText.indexOf('opcional') < 0) {
                    label.textContent = labelText + ' (Opcional):';
                }
            }
        }

        function injectVaccinationUI() {
            if (!isPetFormPath()) return;
            applyChipOptionalUI();
            var submitAnchor = findPetSubmitAnchor();
            var chipAnchor = findChipAnchor();
            if ((!submitAnchor || !submitAnchor.parentNode) && (!chipAnchor || !chipAnchor.parentNode)) return;
            var currentPath = String(window.location.pathname || '');

            var existingBlock = document.getElementById('pet-vaccination-block');
            // Se mudou de rota (add/edit), recria o bloco para evitar estado preso.
            if (existingBlock && LAST_FORM_PATH && LAST_FORM_PATH !== currentPath) {
                existingBlock.remove();
                existingBlock = null;
            }
            var block = existingBlock || createVaccinationBlock();
            LAST_FORM_PATH = currentPath;
            var insertionAnchor = null;
            var insertionParent = null;

            if (submitAnchor && submitAnchor.parentNode) {
                var buttonWrapper = submitAnchor.closest ? submitAnchor.closest('div') : submitAnchor.parentNode;
                insertionAnchor = buttonWrapper || submitAnchor;
                insertionParent = insertionAnchor.parentNode || submitAnchor.parentNode;
            } else if (chipAnchor && chipAnchor.parentNode) {
                // fallback estável: injeta logo após o campo de chip
                insertionAnchor = chipAnchor.nextSibling;
                insertionParent = chipAnchor.parentNode;
            }

            if (!insertionParent) return;

            // Sempre acima da linha do botão (não dentro dela), evitando esconder pelo CSS.
            if (!insertionAnchor) {
                if (block.parentElement !== insertionParent) {
                    insertionParent.appendChild(block);
                }
            } else if (block.parentElement !== insertionParent) {
                insertionParent.insertBefore(block, insertionAnchor);
            } else if (block.nextSibling !== insertionAnchor) {
                insertionParent.insertBefore(block, insertionAnchor);
            }

            var listEl = document.getElementById('vac-list');
            renderVaccinesList(listEl);

            // Evita duplicar listeners quando a tela re-renderiza.
            if (block.getAttribute('data-vac-bound') === '1') return;
            block.setAttribute('data-vac-bound', '1');

            document.getElementById('vac-add-btn').addEventListener('click', function () {
                var candidate = normalizeVaccine({
                    vaccineName: document.getElementById('vac-vaccineName').value,
                    dose: document.getElementById('vac-dose').value,
                    applicationDate: document.getElementById('vac-applicationDate').value,
                    nextDueDate: document.getElementById('vac-nextDueDate').value,
                    status: document.getElementById('vac-status').value,
                    notes: document.getElementById('vac-notes').value
                });

                if (!candidate) {
                    alert('Informe ao menos nome da vacina e data de aplicacao.');
                    return;
                }
                EDIT_CTX.userTouchedVaccines = true;
                STATE.vaccines.push(candidate);
                renderVaccinesList(listEl);

                document.getElementById('vac-vaccineName').value = '';
                document.getElementById('vac-dose').value = '';
                document.getElementById('vac-applicationDate').value = '';
                document.getElementById('vac-nextDueDate').value = '';
                document.getElementById('vac-notes').value = '';
                document.getElementById('vac-status').value = 'aplicada';
            });

            block.addEventListener('click', function (ev) {
                var btn = ev.target && ev.target.closest ? ev.target.closest('[data-vac-remove]') : null;
                if (!btn) return;
                var idx = Number(btn.getAttribute('data-vac-remove'));
                if (!Number.isNaN(idx)) {
                    EDIT_CTX.userTouchedVaccines = true;
                    STATE.vaccines.splice(idx, 1);
                    renderVaccinesList(listEl);
                }
            });
        }

        function shouldPatchPetRequest(url, method, body) {
            if (!url || !method || !body) return false;
            if (!(body instanceof FormData)) return false;
            var m = String(method).toUpperCase();
            if (m !== 'POST' && m !== 'PUT' && m !== 'PATCH') return false;
            var u = String(url).toLowerCase();
            // Aceita URL absoluta/relativa com e sem "/" inicial.
            if (u.indexOf('/pets/create') >= 0 || u.indexOf('pets/create') >= 0) return true;
            if (/\/pets\/[^/]+$/.test(u) || /^pets\/[^/]+$/.test(u)) return true;
            return false;
        }

        function stripEmptyChipFromFormData(fd) {
            if (!(fd instanceof FormData)) return;
            var chipVal = fd.get('chip');
            if (chipVal === null || chipVal === undefined || String(chipVal).trim() === '') {
                fd.delete('chip');
            }
        }

        function appendVaccinesToFormData(fd) {
            if (!(fd instanceof FormData)) return;
            stripEmptyChipFromFormData(fd);
            fd.delete('vaccines');
            fd.delete('vaccinations');
            var payload = vaccinesPayload();
            if (payload.length) {
                fd.append('vaccines', JSON.stringify(payload));
                fd.append('vaccinations', JSON.stringify(payload));
            }
        }

        function patchFetch() {
            if (!ORIGINAL_FETCH) return;
            window.fetch = function (input, init) {
                try {
                    var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
                    var method = (init && init.method) || (input && input.method) || 'GET';
                    var body = init && init.body;
                    if (shouldPatchPetRequest(url, method, body)) {
                        appendVaccinesToFormData(body);
                    }
                } catch (_) { }
                return ORIGINAL_FETCH(input, init);
            };
        }

        function patchXHR() {
            var origOpen = XMLHttpRequest.prototype.open;
            var origSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function (method, url) {
                this.__petMethod = method;
                this.__petUrl = url;
                return origOpen.apply(this, arguments);
            };
            XMLHttpRequest.prototype.send = function (body) {
                try {
                    if (shouldPatchPetRequest(this.__petUrl, this.__petMethod, body)) {
                        appendVaccinesToFormData(body);
                    }
                } catch (_) { }
                return origSend.apply(this, arguments);
            };
        }

        function preloadVaccinesOnEdit() {
            var p = window.location.pathname || '';
            var m = p.match(/\/pet\/edit\/([^/?#]+)/i);
            if (!m || !m[1] || !ORIGINAL_FETCH) return;
            var petId = m[1];
            if (EDIT_CTX.petId !== petId) {
                EDIT_CTX.petId = petId;
                EDIT_CTX.didInitialLoad = false;
                EDIT_CTX.userTouchedVaccines = false;
                STATE.vaccines = [];
            }
            if (EDIT_CTX.didInitialLoad || EDIT_CTX.userTouchedVaccines) return;

            ORIGINAL_FETCH('/api/pets/' + encodeURIComponent(petId))
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (data) {
                    var vaccines = [];
                    if (data && data.pet) {
                        if (Array.isArray(data.pet.vaccinations)) {
                            vaccines = data.pet.vaccinations.map(function (v) {
                                return {
                                    vaccineName: v.nomeVacina,
                                    applicationDate: v.dataAplicacao,
                                    nextDueDate: v.proximaDose,
                                    notes: v.observacoes
                                };
                            });
                        } else if (Array.isArray(data.pet.vaccines)) {
                            vaccines = data.pet.vaccines;
                        }
                    }
                    STATE.vaccines = vaccines.map(function (v) {
                        var dt = v.applicationDate ? String(v.applicationDate).slice(0, 10) : '';
                        var nd = v.nextDueDate ? String(v.nextDueDate).slice(0, 10) : '';
                        return normalizeVaccine({
                            vaccineName: v.vaccineName,
                            dose: v.dose,
                            applicationDate: dt,
                            nextDueDate: nd,
                            status: v.status,
                            notes: v.notes
                        });
                    }).filter(Boolean);
                    EDIT_CTX.didInitialLoad = true;
                    var listEl = document.getElementById('vac-list');
                    if (listEl) renderVaccinesList(listEl);
                })
                .catch(function () { });
        }

        if (!isPetFormPath()) return;
        patchFetch();
        patchXHR();

        var observer = new MutationObserver(function () {
            injectVaccinationUI();
            preloadVaccinesOnEdit();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        injectVaccinationUI();
        preloadVaccinesOnEdit();

        // Fallback para cenários em que o React monta o formulário com atraso.
        var attempts = 0;
        var mountTimer = setInterval(function () {
            attempts += 1;
            injectVaccinationUI();
            preloadVaccinesOnEdit();
            if (document.getElementById('pet-vaccination-block') || attempts >= 40) {
                clearInterval(mountTimer);
            }
        }, 250);
    })();

    // Completa o modal/perfil do pet com todos os campos salvos no banco.
    (function patchPetProfileModal() {
        var ORIGINAL_FETCH = window.fetch ? window.fetch.bind(window) : null;
        if (!ORIGINAL_FETCH) return;

        var listCache = [];
        var detailsCache = {};
        var inflightById = {};
        var modalRequestSeq = 0;

        function textOf(el) {
            return el ? String(el.textContent || '').trim() : '';
        }

        function normalizeLower(value) {
            return String(value || '').trim().toLowerCase();
        }

        function parseFilenameFromStyle(styleValue) {
            if (!styleValue) return '';
            var match = String(styleValue).match(/\/images\/pets\/([^"')?]+)/i);
            return match && match[1] ? decodeURIComponent(match[1]) : '';
        }

        function formatDate(value) {
            if (!value) return '-';
            var d = new Date(value);
            if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
            var day = String(d.getDate()).padStart(2, '0');
            var month = String(d.getMonth() + 1).padStart(2, '0');
            var year = d.getFullYear();
            return day + '/' + month + '/' + year;
        }

        function normalizeAge(value) {
            var age = value === undefined || value === null ? '' : String(value).trim();
            if (!age) return '-';
            if (/(mes|mês|ano)/i.test(age)) return age;
            return age + ' anos';
        }

        function parseNumber(value) {
            var n = Number(String(value || '').replace(',', '.').replace(/[^\d.-]/g, ''));
            return Number.isFinite(n) ? n : null;
        }

        function escapeHtml(value) {
            return String(value === undefined || value === null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function present(value) {
            var v = value === undefined || value === null ? '' : String(value).trim();
            return v ? v : 'Nao informado';
        }

        function hasValue(value) {
            if (value === undefined || value === null) return false;
            if (typeof value === 'string') return value.trim().length > 0;
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === 'object') return Object.keys(value).length > 0;
            return true;
        }

        function toLabel(key) {
            var map = {
                _id: 'ID',
                __v: 'Versao',
                adopterStatus: 'Status da solicitacao',
                deliveryAddress: 'Endereco informado',
                vaccinesCount: 'Total de vacinas',
                createdAt: 'Criado em',
                updatedAt: 'Atualizado em'
            };
            if (map[key]) return map[key];
            return String(key)
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/_/g, ' ')
                .replace(/^./, function (m) { return m.toUpperCase(); });
        }

        function formatGenericValue(value) {
            if (value === undefined || value === null) return '';
            if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
            if (typeof value === 'number') return String(value);
            if (typeof value === 'string') return value.trim();
            if (value instanceof Date) return formatDate(value);
            if (Array.isArray(value)) {
                if (!value.length) return '';
                if (typeof value[0] === 'string' || typeof value[0] === 'number') {
                    return value.join(', ');
                }
                return value.length + ' item(ns)';
            }
            if (typeof value === 'object') {
                if (value._id && (value.name || value.instituteName)) {
                    return (value.instituteName || value.name) + ' (' + String(value._id) + ')';
                }
                try {
                    return JSON.stringify(value);
                } catch (_) {
                    return String(value);
                }
            }
            return String(value);
        }

        function buildAdditionalRows(pet, knownKeys) {
            if (!pet || typeof pet !== 'object') return [];
            return Object.keys(pet).filter(function (key) {
                return knownKeys.indexOf(key) === -1;
            }).map(function (key) {
                return {
                    label: toLabel(key),
                    value: formatGenericValue(pet[key])
                };
            }).filter(function (row) {
                return hasValue(row.value);
            });
        }

        function buildSectionList(title, rows) {
            var items = rows.map(function (row) {
                return '' +
                    '<li style="display:grid;grid-template-columns:minmax(120px,150px) 1fr;gap:10px;padding:7px 0;border-bottom:1px dashed #e2e8f0">' +
                    '<span style="font-weight:700;color:#334155;font-size:13px">' + escapeHtml(row.label) + '</span>' +
                    '<span style="color:#0f172a;word-break:break-word;font-size:13px">' + escapeHtml(present(row.value)) + '</span>' +
                    '</li>';
            }).join('');

            return '' +
                '<section style="margin-top:12px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff">' +
                '<h4 style="margin:0 0 8px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:.08em;font-weight:800">' + escapeHtml(title) + '</h4>' +
                '<ul style="list-style:none;margin:0;padding:0">' + items + '</ul>' +
                '</section>';
        }

        function suppressOriginalInfo(area) {
            if (!area) return;
            var labels = ['idade:', 'peso:', 'cor:', 'gênero:', 'genero:', 'raça:', 'raca:', 'doador:', 'telefone:'];
            var paragraphs = area.querySelectorAll('p');
            for (var i = 0; i < paragraphs.length; i += 1) {
                var txt = normalizeLower(textOf(paragraphs[i]));
                for (var j = 0; j < labels.length; j += 1) {
                    if (txt.indexOf(labels[j]) >= 0) {
                        if (paragraphs[i].closest('#pet-profile-complete-block')) break;
                        paragraphs[i].style.display = 'none';
                        break;
                    }
                }
            }
        }

        function statusLabel(value) {
            if (value === true) return 'Disponivel';
            if (value === false) return 'Indisponivel';
            if (value === null || value === undefined || value === '') return '-';
            return String(value);
        }

        function getDisplayOwnerName(pet) {
            if (!pet || !pet.user) return '-';
            return pet.user.instituteName || pet.user.name || '-';
        }

        function buildVaccinesHtml(vaccines) {
            if (!Array.isArray(vaccines) || !vaccines.length) {
                return '<p style="margin:0;color:#64748b;font-size:13px;padding:8px 10px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px">Nenhuma vacina cadastrada.</p>';
            }
            return vaccines.map(function (v) {
                var row1 = '<strong>' + (v.vaccineName || '-') + '</strong> - ' + (v.dose || '1a dose');
                var row2 = 'Aplicacao: ' + formatDate(v.applicationDate);
                if (v.nextDueDate) row2 += ' | Proxima: ' + formatDate(v.nextDueDate);
                var row3 = 'Status: ' + (v.status || 'aplicada');
                var extras = [];
                if (v.batch) extras.push('Lote: ' + v.batch);
                if (v.veterinarian) extras.push('Veterinario: ' + v.veterinarian);
                if (v.notes) extras.push('Obs: ' + v.notes);
                return '' +
                    '<div style="border:1px solid #dbe1ec;border-radius:10px;padding:9px 11px;margin:0 0 8px;background:#f8fafc;font-size:12px;color:#334155;line-height:1.45;box-shadow:0 1px 2px rgba(15,23,42,.05)">' +
                    row1 + '<br>' + row2 + '<br>' + row3 + (extras.length ? '<br>' + extras.join(' | ') : '') +
                    '</div>';
            }).join('');
        }

        function isVisibleElement(el) {
            if (!el || !el.getBoundingClientRect) return false;
            var rect = el.getBoundingClientRect();
            if (rect.width < 200 || rect.height < 120) return false;
            if (rect.bottom <= 0 || rect.right <= 0) return false;
            var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
            if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) return false;
            return true;
        }

        function hasModalTraits(node) {
            if (!node || !node.querySelector) return false;
            var hasPetImage = !!node.querySelector('[style*="images/pets/"]');
            var hasTitle = !!node.querySelector('h2');
            var hasActionContext = /idade:|peso:|cor:|g[eê]nero:|ra[cç]a:|solicitar ado|criar conta|entrar|você precisa|voce precisa|adotar/i.test(textOf(node));
            if (!hasPetImage || !hasTitle || !hasActionContext || !isVisibleElement(node)) return false;

            var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
            if (!style) return false;
            var rect = node.getBoundingClientRect();
            var hasCloseButton = !!Array.prototype.find.call(node.querySelectorAll('button'), function (btn) {
                return textOf(btn) === '' && !!btn.querySelector('svg');
            });
            // Modal pode variar entre fixed/absolute dependendo do build, então validamos por contexto + tamanho.
            var hasModalPosition = style.position === 'fixed' || style.position === 'absolute' || style.position === 'relative';
            var isModalSized = rect.width >= 420 && rect.height >= 180;
            var isOnScreen = rect.top >= 0 && rect.left >= 0 && rect.right <= (window.innerWidth + 5) && rect.bottom <= (window.innerHeight + 5);

            return hasCloseButton && hasModalPosition && isModalSized && isOnScreen;
        }

        function findModalRoot() {
            var closeButtons = Array.prototype.filter.call(document.querySelectorAll('button'), function (btn) {
                return textOf(btn) === '' && !!btn.querySelector('svg');
            });

            for (var i = 0; i < closeButtons.length; i += 1) {
                var current = closeButtons[i].parentElement;
                while (current && current !== document.body) {
                    if (hasModalTraits(current)) return current;
                    current = current.parentElement;
                }
            }
            return null;
        }

        function cleanupOrphanProfiles(activeModalRoot) {
            var blocks = document.querySelectorAll('#pet-profile-complete-block');
            for (var i = 0; i < blocks.length; i += 1) {
                if (!activeModalRoot || !activeModalRoot.contains(blocks[i])) {
                    blocks[i].remove();
                }
            }
        }

        function readModalSnapshot(modalRoot) {
            var name = textOf(modalRoot.querySelector('h2'));
            var imgEl = modalRoot.querySelector('[style*="images/pets/"]');
            var fileName = imgEl ? parseFilenameFromStyle(imgEl.getAttribute('style') || '') : '';
            var modalText = textOf(modalRoot);

            var ageMatch = modalText.match(/Idade:\s*([^\n\r]+)/i);
            var weightMatch = modalText.match(/Peso:\s*([^\n\r]+)/i);
            var typeMatch = modalText.match(/Especie:\s*([^\n\r]+)/i);

            return {
                name: name,
                imageName: fileName,
                ageText: ageMatch ? String(ageMatch[1]).trim() : '',
                weightNumber: weightMatch ? parseNumber(weightMatch[1]) : null,
                typeText: typeMatch ? String(typeMatch[1]).trim() : ''
            };
        }

        function scoreCandidate(pet, snap) {
            var score = 0;
            if (!pet || !snap) return score;
            if (snap.imageName && Array.isArray(pet.images) && pet.images.indexOf(snap.imageName) >= 0) score += 100;
            if (normalizeLower(pet.name) === normalizeLower(snap.name)) score += 40;
            if (snap.typeText && normalizeLower(pet.type) === normalizeLower(snap.typeText)) score += 20;

            if (snap.weightNumber !== null) {
                var petWeight = parseNumber(pet.weight);
                if (petWeight !== null && Math.abs(petWeight - snap.weightNumber) < 0.001) score += 20;
            }
            if (snap.ageText && normalizeLower(String(pet.age)).indexOf(normalizeLower(snap.ageText)) >= 0) score += 15;
            return score;
        }

        function rememberPetList(pets) {
            if (!Array.isArray(pets)) return;
            listCache = pets.slice();
            for (var i = 0; i < pets.length; i += 1) {
                var p = pets[i];
                if (p && p._id) detailsCache[p._id] = p;
            }
            applyApplicantBadgesToGrid();
        }

        function getListingBadgeForPet(pet) {
            if (!pet) return null;
            if (pet.isOwnPet) {
                return { kind: 'own', text: 'Seu anúncio' };
            }
            if (pet.isAdoptedListing || pet.adopterStatus === 'Finalizado' || pet.available === false) {
                return { kind: 'adopted', text: 'Já adotado' };
            }
            if (pet.hasApprovedAdoption || pet.adopterStatus === 'Aprovado') {
                return { kind: 'approved', text: 'Adoção aprovada' };
            }
            var n = Number(pet.applicantsCount) || 0;
            if (n > 0) {
                return {
                    kind: 'queue',
                    text: n + ' pretendente' + (n > 1 ? 's' : '') + ' na fila',
                };
            }
            if (pet.hasApplicants || pet.hasActiveAdoption) {
                return { kind: 'queue', text: '1 pretendente na fila' };
            }
            return null;
        }

        function parseImageNameFromCard(card) {
            if (!card) return '';
            var img = card.querySelector('img[src*="images/pets/"]');
            if (img) {
                var src = img.getAttribute('src') || '';
                var parts = src.split('/');
                return parts[parts.length - 1].split('?')[0] || '';
            }
            var styled = card.querySelector('[style*="images/pets/"]');
            if (styled) return parseFilenameFromStyle(styled.getAttribute('style') || '');
            return '';
        }

        function matchPetToCard(card) {
            if (!listCache || !listCache.length || !card) return null;
            var fileName = parseImageNameFromCard(card);
            if (fileName) {
                for (var i = 0; i < listCache.length; i += 1) {
                    var pImg = listCache[i];
                    if (pImg && Array.isArray(pImg.images) && pImg.images.indexOf(fileName) >= 0) {
                        return pImg;
                    }
                }
            }
            var title = card.querySelector('h3, h2, h4, [class*="pet_name"]');
            var name = title ? (title.textContent || '').trim() : '';
            if (!name) return null;
            for (var j = 0; j < listCache.length; j += 1) {
                if (listCache[j] && normalizeLower(listCache[j].name) === normalizeLower(name)) {
                    return listCache[j];
                }
            }
            return null;
        }

        function createApplicantBadge(info) {
            var badge = document.createElement('div');
            badge.className = 'garcapet-applicants-badge garcapet-applicants-badge--on-image';
            badge.classList.add('garcapet-applicants-badge--' + info.kind);
            badge.textContent = info.text;
            var styles = {
                own:
                    'background:#eff6ff;border:1px solid #93c5fd;color:#1e40af',
                queue:
                    'background:#fff7ed;border:1px solid #fdba74;color:#9a3412',
                approved:
                    'background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46',
                adopted:
                    'background:#f1f5f9;border:1px solid #94a3b8;color:#334155',
            };
            badge.setAttribute('style',
                'display:inline-block;padding:4px 10px;border-radius:999px;' +
                (styles[info.kind] || styles.queue) +
                ';font-size:12px;font-weight:700;line-height:1.2;z-index:5;position:absolute;top:8px;left:8px;margin:0;' +
                'max-width:calc(100% - 16px);box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:none');
            return badge;
        }

        function findPetCardsInGrid() {
            return document.querySelectorAll(
                '[class*="pet_card__"]:not([class*="pet_card_image"]):not([class*="pet_card_content"]),' +
                '[class*="pet-card__"]:not([class*="pet-card_image"]):not([class*="pet-card_content"]),' +
                '[class*="card_pet"]'
            );
        }

        function findImageWrap(card) {
            var wrap = card.querySelector('[class*="pet_card_image"], [class*="pet-card_image"]');
            if (wrap) return wrap;
            var img = card.querySelector('img[src*="images/pets/"], img[src*="/pets/"]');
            if (img && img.parentElement) return img.parentElement;
            return null;
        }

        function removeBadgesOutsideImage(card) {
            var badges = card.querySelectorAll('.garcapet-applicants-badge');
            for (var b = badges.length - 1; b >= 0; b -= 1) {
                var badge = badges[b];
                if (!badge.closest('[class*="pet_card_image"], [class*="pet-card_image"]')) {
                    badge.remove();
                }
            }
        }

        function applyApplicantBadgesToGrid() {
            if (!listCache || !listCache.length) return;
            var cards = findPetCardsInGrid();
            for (var c = 0; c < cards.length; c += 1) {
                var card = cards[c];
                removeBadgesOutsideImage(card);

                var imageWrap = findImageWrap(card);
                if (!imageWrap) continue;

                var pet = matchPetToCard(card);
                var badgeInfo = getListingBadgeForPet(pet);
                if (!badgeInfo) continue;

                var existing = imageWrap.querySelector('.garcapet-applicants-badge--on-image');
                if (existing) {
                    existing.textContent = badgeInfo.text;
                    existing.className =
                        'garcapet-applicants-badge garcapet-applicants-badge--on-image garcapet-applicants-badge--' +
                        badgeInfo.kind;
                    continue;
                }

                var pos = window.getComputedStyle(imageWrap).position;
                if (pos === 'static' || pos === '') imageWrap.style.position = 'relative';
                imageWrap.style.overflow = 'hidden';
                imageWrap.appendChild(createApplicantBadge(badgeInfo));
            }
        }

        function scheduleApplicantBadgeRetries() {
            [100, 300, 700, 1500, 3000, 5000].forEach(function (ms) {
                setTimeout(applyApplicantBadgesToGrid, ms);
            });
        }

        function absorbPetsListResponse(data) {
            var pets = data && Array.isArray(data.pets) ? data.pets : null;
            if (pets) {
                rememberPetList(pets);
                scheduleApplicantBadgeRetries();
            }
        }

        function patchAxiosPetsList() {
            var ax = window.axios;
            if (!ax || ax.__garcapetPetsListPatched) return;
            ax.__garcapetPetsListPatched = true;
            ax.interceptors.response.use(function (response) {
                try {
                    var url = String((response.config && response.config.url) || '');
                    var method = String((response.config && response.config.method) || 'get').toLowerCase();
                    if (method !== 'get') return response;
                    if (/\/pets\/[^/?]+$/.test(url) &&
                        url.indexOf('mypets') === -1 &&
                        url.indexOf('myadoptions') === -1) {
                        var one = response.data && response.data.pet;
                        if (one && one._id) {
                            detailsCache[one._id] = one;
                            setTimeout(applyPetDetailsPageGuard, 50);
                        }
                        return response;
                    }
                    if (!/\/pets\/?(\?|$)/.test(url) || /\/pets\/[^/?]+/.test(url)) return response;
                    absorbPetsListResponse(response.data);
                } catch (_) { }
                return response;
            });
        }

        function fetchPetList() {
            return authFetch('/api/pets')
                .then(function (r) { return r && r.ok ? r.json() : null; })
                .then(function (data) {
                    var pets = data && Array.isArray(data.pets) ? data.pets : [];
                    rememberPetList(pets);
                    scheduleApplicantBadgeRetries();
                    return pets;
                })
                .catch(function () { return listCache || []; });
        }

        function resolvePetFromSnapshot(snap) {
            function chooseFrom(list) {
                if (!Array.isArray(list) || !list.length) return null;
                var best = null;
                var bestScore = -1;
                for (var i = 0; i < list.length; i += 1) {
                    var candidate = list[i];
                    var score = scoreCandidate(candidate, snap);
                    if (score > bestScore) {
                        bestScore = score;
                        best = candidate;
                    }
                }
                return bestScore > 0 ? best : null;
            }

            var fromCache = chooseFrom(listCache);
            if (fromCache) return Promise.resolve(fromCache);
            return fetchPetList().then(chooseFrom);
        }

        function getAuthToken() {
            try {
                var raw = localStorage.getItem('token');
                if (raw) {
                    var parsed = JSON.parse(raw);
                    if (typeof parsed === 'string' && parsed.trim()) {
                        return parsed.trim().replace(/^"+|"+$/g, '');
                    }
                }
            } catch (_) {
                var rawOnly = localStorage.getItem('token');
                if (rawOnly) {
                    var trimmed = String(rawOnly).trim().replace(/^"+|"+$/g, '');
                    if (trimmed.indexOf('eyJ') === 0) return trimmed;
                }
            }
            return '';
        }

        function authFetch(url) {
            var token = getAuthToken();
            var headers = {};
            if (token) headers.Authorization = 'Bearer ' + token;
            return ORIGINAL_FETCH(url, { headers: headers });
        }

        function findButtonsByText(root, textFragment) {
            if (!root) return [];
            var needle = normalizeLower(textFragment);
            return Array.prototype.filter.call(root.querySelectorAll('button'), function (btn) {
                return normalizeLower(textOf(btn)).indexOf(needle) >= 0;
            });
        }

        function findBlockWithText(root, textFragment) {
            if (!root) return null;
            var needle = normalizeLower(textFragment);
            var nodes = root.querySelectorAll('h3, p, span, div');
            for (var i = 0; i < nodes.length; i += 1) {
                if (normalizeLower(textOf(nodes[i])).indexOf(needle) >= 0) {
                    return nodes[i].closest('[class*="status_message"]') || nodes[i].parentElement;
                }
            }
            return null;
        }

        function hideAdoptControls(root) {
            findButtonsByText(root, 'solicitar ado').forEach(function (btn) {
                btn.style.display = 'none';
                btn.setAttribute('aria-hidden', 'true');
            });
            var forms = root.querySelectorAll('[class*="address_form"]');
            for (var i = 0; i < forms.length; i += 1) {
                forms[i].style.display = 'none';
            }
        }

        function showAdoptionGuardMessage(root, pet, kind) {
            var existing = root.querySelector('.garcapet-adoption-guard-msg');
            if (existing) existing.remove();

            var msg = document.createElement('div');
            msg.className = 'garcapet-adoption-guard-msg';
            msg.setAttribute('style',
                'margin:12px 0;padding:12px 14px;border-radius:10px;font-size:14px;line-height:1.45;');

            if (kind === 'own_pet') {
                msg.style.background = '#eff6ff';
                msg.style.border = '1px solid #93c5fd';
                msg.style.color = '#1e40af';
                msg.innerHTML = '<strong>Este é o seu anúncio.</strong> Gerencie pretendentes em ' +
                    '<a href="/garcapet/pet/mypets" style="color:#1d4ed8;font-weight:700">Meus Pets</a>.';
            } else if (kind === 'already_in_queue') {
                msg.style.background = '#ecfdf5';
                msg.style.border = '1px solid #6ee7b7';
                msg.style.color = '#065f46';
                var pos = pet.myQueuePosition || '?';
                var total = pet.myQueueTotal || '?';
                msg.innerHTML = '<strong>Você já está na fila</strong> deste pet (' +
                    escapeHtml(String(pos)) + 'º de ' + escapeHtml(String(total)) + '). ' +
                    'Acompanhe em <a href="/garcapet/pet/myadoptions" style="color:#047857;font-weight:700">Minhas Adoções</a>.';
            } else if (kind === 'adoption_approved') {
                msg.style.background = '#ecfdf5';
                msg.style.border = '2px solid #6ee7b7';
                msg.style.color = '#065f46';
                var donor = (pet.user && pet.user.name) || pet.donorName || 'O doador';
                msg.innerHTML =
                    '<strong>Parabéns! Seu pedido foi aceito.</strong><br/>' +
                    escapeHtml(String(donor)) + ' aprovou sua solicitação para adotar ' +
                    escapeHtml(String(pet.name || 'este pet')) + '. ' +
                    'Combine a entrega em <a href="/garcapet/pet/myadoptions" style="color:#047857;font-weight:700">Minhas Adoções</a>.';
            } else if (kind === 'not_available') {
                msg.style.background = '#f1f5f9';
                msg.style.border = '1px solid #94a3b8';
                msg.style.color = '#334155';
                msg.textContent = 'Este pet não está aceitando novas solicitações no momento.';
            } else if (kind === 'login_required') {
                msg.style.background = '#fff7ed';
                msg.style.border = '1px solid #fdba74';
                msg.style.color = '#9a3412';
                msg.innerHTML = 'Faça <a href="/garcapet/login" style="color:#c2410c;font-weight:700">login</a> para solicitar adoção.';
            }

            var actions = root.querySelector('[class*="actions"]') || root.querySelector('[class*="action"]');
            if (actions) {
                actions.insertBefore(msg, actions.firstChild);
            } else {
                root.appendChild(msg);
            }
        }

        function applyAdoptionUiGuard(root, pet) {
            if (!root || !pet) return;

            var falseBlock = findBlockWithText(root, 'já solicitou');
            if (falseBlock && pet.canRequestAdoption) {
                falseBlock.remove();
            } else if (falseBlock && (pet.isOwnPet || pet.blockReason === 'own_pet')) {
                falseBlock.remove();
            } else if (falseBlock && (pet.hasActiveRequestForMe || pet.blockReason === 'already_in_queue')) {
                falseBlock.remove();
            }

            if (pet.isOwnPet || pet.blockReason === 'own_pet') {
                hideAdoptControls(root);
                showAdoptionGuardMessage(root, pet, 'own_pet');
                return;
            }

            if (
                pet.blockReason === 'adoption_approved' ||
                pet.hasApprovedAdoption ||
                pet.adopterStatus === 'Aprovado'
            ) {
                if (pet.hasActiveRequestForMe || pet.blockReason === 'adoption_approved') {
                    hideAdoptControls(root);
                    showAdoptionGuardMessage(root, pet, 'adoption_approved');
                    return;
                }
            }

            if (pet.hasActiveRequestForMe || pet.blockReason === 'already_in_queue') {
                hideAdoptControls(root);
                showAdoptionGuardMessage(root, pet, 'already_in_queue');
                return;
            }

            if (pet.canRequestAdoption === false && pet.blockReason === 'not_available') {
                hideAdoptControls(root);
                showAdoptionGuardMessage(root, pet, 'not_available');
            }
        }

        function fetchPetDetailsById(petId) {
            if (!petId) return Promise.resolve(null);
            var cached = detailsCache[petId];
            if (cached && cached.canRequestAdoption !== undefined && cached.size !== undefined) {
                return Promise.resolve(cached);
            }
            if (inflightById[petId]) return inflightById[petId];

            inflightById[petId] = authFetch('/api/pets/' + encodeURIComponent(petId))
                .then(function (r) { return r && r.ok ? r.json() : null; })
                .then(function (data) {
                    var pet = data && data.pet ? data.pet : null;
                    if (pet && pet._id) detailsCache[pet._id] = pet;
                    return pet;
                })
                .catch(function () { return cached || null; })
                .finally(function () { delete inflightById[petId]; });

            return inflightById[petId];
        }

        function findInfoSection(modalRoot) {
            var title = modalRoot.querySelector('h2');
            if (!title) return null;
            return title.parentElement || null;
        }

        function renderExtendedProfile(modalRoot, pet) {
            var area = findInfoSection(modalRoot);
            if (!area || !pet) return;

            var petKey = pet._id ? String(pet._id) : '';
            var existing = area.querySelector('#pet-profile-complete-block');
            // O MutationObserver abaixo reage a qualquer childList. Antes removíamos e
            // reinseríamos o bloco sempre → nova mutação → observer → loop infinito e UI
            // travava ao abrir o fluxo de adoção (ex.: botão Adotar).
            if (existing && petKey && modalRoot.getAttribute('data-sama-profile-for') === petKey) {
                return;
            }
            modalRoot.setAttribute('data-sama-profile-for', petKey || '');

            if (existing) existing.remove();

            var vaccines = Array.isArray(pet.vaccines) ? pet.vaccines : [];
            var description = pet.description ? String(pet.description) : '';
            var animalRows = [
                { label: 'Nome', value: pet.name },
                { label: 'Especie', value: pet.type },
                { label: 'Porte', value: pet.size },
                { label: 'Idade', value: normalizeAge(pet.age) },
                { label: 'Peso', value: pet.weight !== undefined && pet.weight !== null ? String(pet.weight) + 'kg' : '' },
                { label: 'Genero', value: pet.gender },
                { label: 'Cor', value: pet.color },
                { label: 'Raca', value: pet.breed },
                { label: 'Chip', value: pet.chip || '' },
                { label: 'Descricao', value: description || '' }
            ];

            var privacyBanner = '';
            if (pet.isAdoptedListing || pet.adopterStatus === 'Finalizado') {
                privacyBanner =
                    '<p style="margin:0 0 10px;padding:10px 12px;border-radius:8px;background:#f1f5f9;border:1px solid #94a3b8;color:#334155;font-size:13px">' +
                    'Este animal <strong>já foi adotado</strong> e não aceita novas solicitações.' +
                    '</p>';
            } else if (pet.hasApprovedAdoption || pet.adopterStatus === 'Aprovado') {
                privacyBanner =
                    '<p style="margin:0 0 10px;padding:10px 12px;border-radius:8px;background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;font-size:13px">' +
                    'A adoção deste animal <strong>já foi aprovada</strong> para um pretendente. Novas solicitações não estão disponíveis no momento.' +
                    '</p>';
            } else if (pet.isOwnPet) {
                privacyBanner =
                    '<p style="margin:0 0 10px;padding:10px 12px;border-radius:8px;background:#eff6ff;border:1px solid #93c5fd;color:#1e40af;font-size:13px">' +
                    'Este é <strong>o seu anúncio</strong>. Você não pode solicitar adoção do próprio pet. Gerencie pretendentes em Meus Pets.' +
                    '</p>';
            } else if (pet.myQueuePosition && pet.myQueueTotal) {
                privacyBanner =
                    '<p style="margin:0 0 10px;padding:10px 12px;border-radius:8px;background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;font-size:13px">' +
                    'Sua posição na fila: <strong>' + escapeHtml(String(pet.myQueuePosition)) + ' de ' + escapeHtml(String(pet.myQueueTotal)) + '</strong>. Aguarde a análise do responsável.' +
                    '</p>';
            } else if (pet.applicantsCount > 0) {
                privacyBanner =
                    '<p style="margin:0 0 10px;padding:10px 12px;border-radius:8px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font-size:13px">' +
                    'Este animal já tem <strong>' + escapeHtml(String(pet.applicantsCount)) + '</strong> pretendente(s) na fila. Ao enviar sua solicitação, você entra na fila por ordem de chegada.' +
                    '</p>';
            } else if (!pet.user || (!pet.user.phone && !pet.user.email)) {
                privacyBanner =
                    '<p style="margin:0 0 10px;padding:10px 12px;border-radius:8px;background:#eff6ff;border:1px solid #93c5fd;color:#1e40af;font-size:13px">' +
                    'Os dados de contato do responsável ficam disponíveis após a aprovação da sua solicitação de adoção.' +
                    '</p>';
            }

            var html = '' +
                '<div id="pet-profile-complete-block" style="margin-top:12px;border:1px solid #dbe1ec;border-radius:12px;padding:12px;background:linear-gradient(180deg,#ffffff 0%,#fcfdff 100%);box-shadow:0 10px 22px rgba(15,23,42,.08)">' +
                '<h3 style="margin:0 0 6px;font-size:16px;color:#1e293b;font-weight:800">Perfil completo do animal</h3>' +
                '<p style="margin:0 0 8px;font-size:12px;color:#64748b">Informacoes cadastradas para este pet</p>' +
                privacyBanner +
                buildSectionList('Dados do animal', animalRows) +
                '<div style="margin-top:12px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff">' +
                '<h4 style="margin:0 0 6px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:.08em;font-weight:800">Historico de vacinacao</h4>' +
                '<p style="margin:0 0 8px;font-size:12px;color:#475569"><strong>Total de vacinas:</strong> ' + escapeHtml(String(vaccines.length)) + '</p>' +
                buildVaccinesHtml(vaccines) +
                '</div>' +
                '</div>';

            var wrap = document.createElement('div');
            wrap.innerHTML = html;
            area.insertBefore(wrap.firstChild, area.firstChild ? area.firstChild.nextSibling : null);
            suppressOriginalInfo(area);
        }

        // Observer global + injecao de DOM dentro do modal React: ao reconciliar, o React
        // remove nos que nao pertencem a ele; o observer disparava de novo -> injecao de novo
        // -> loop com a reconciliacao ("trava" ao clicar Adotar). Pausamos o observer durante
        // cada ciclo de enhance e reconectamos apos o patch (sync ou async).
        var petProfileObserver = null;

        function reconnectPetProfileObserver() {
            if (!petProfileObserver) return;
            try {
                petProfileObserver.observe(document.documentElement, { childList: true, subtree: true });
            } catch (_) {}
        }

        function pausePetProfileObserver() {
            if (!petProfileObserver) return;
            try {
                petProfileObserver.disconnect();
            } catch (_) {}
        }

        function scheduleReconnectPetProfileObserver() {
            if (typeof queueMicrotask === 'function') {
                queueMicrotask(reconnectPetProfileObserver);
            } else {
                setTimeout(reconnectPetProfileObserver, 0);
            }
        }

        function applyPetDetailsPageGuard() {
            var path = (window.location.pathname || '').toLowerCase();
            if (path.indexOf('/garcapet/pet/') === -1) return;
            if (path.indexOf('/mypets') >= 0 || path.indexOf('/myadoptions') >= 0 ||
                path.indexOf('/add') >= 0 || path.indexOf('/edit') >= 0) return;
            var match = path.match(/\/pet\/([a-f0-9]{24})$/i);
            if (!match) return;

            fetchPetDetailsById(match[1]).then(function (pet) {
                if (!pet) return;
                var root =
                    document.querySelector('[class*="pet_details"]') ||
                    document.querySelector('section');
                applyAdoptionUiGuard(root || document.body, pet);
            }).catch(function () { });
        }

        function enhanceCurrentModal() {
            pausePetProfileObserver();

            var modalRoot = findModalRoot();
            cleanupOrphanProfiles(modalRoot);
            if (!modalRoot) {
                scheduleReconnectPetProfileObserver();
                return;
            }

            var snap = readModalSnapshot(modalRoot);
            if (!snap.name && !snap.imageName) {
                scheduleReconnectPetProfileObserver();
                return;
            }

            modalRequestSeq += 1;
            var reqToken = modalRequestSeq;
            modalRoot.setAttribute('data-pet-profile-token', String(reqToken));

            resolvePetFromSnapshot(snap)
                .then(function (petRef) {
                    if (!petRef || !petRef._id) return null;
                    return fetchPetDetailsById(petRef._id);
                })
                .then(function (petDetails) {
                    if (!petDetails) return;
                    if (modalRoot.getAttribute('data-pet-profile-token') !== String(reqToken)) return;
                    renderExtendedProfile(modalRoot, petDetails);
                    applyAdoptionUiGuard(modalRoot, petDetails);
                })
                .catch(function () { })
                .finally(function () {
                    scheduleReconnectPetProfileObserver();
                });
        }

        petProfileObserver = new MutationObserver(function () {
            enhanceCurrentModal();
            applyApplicantBadgesToGrid();
            applyPetDetailsPageGuard();
        });
        petProfileObserver.observe(document.documentElement, { childList: true, subtree: true });
        window.__garcapetRefreshPetBadges = function () {
            fetchPetList().finally(applyApplicantBadgesToGrid);
        };
        patchAxiosPetsList();
        fetchPetList().finally(function () {
            enhanceCurrentModal();
            applyPetDetailsPageGuard();
            scheduleApplicantBadgeRetries();
        });
    })();

    // Permite doador e adotante simultaneamente: o bundle React em /pet/add bloqueia quem tem
    // histórico em GET /pets/myadoptions (axios empacotado, não window.axios). Interceptamos XHR.
    (function patchAddPetExclusiveRoleGuard() {
        var EMPTY_MY_ADOPTIONS = '{"pets":[],"adoptions":[]}';

        function pathnameLower() {
            return (window.location.pathname || '').toLowerCase();
        }

        function isGarcaPetContext() {
            var p = pathnameLower();
            return p.indexOf('/garcapet') === 0 || p.indexOf('/pet/') === 0;
        }

        function isAddPetPage() {
            return pathnameLower().indexOf('/pet/add') >= 0;
        }

        function isMyAdoptionsRoleCheck(url, method) {
            if (!isAddPetPage()) return false;
            if (String(method || 'GET').toUpperCase() !== 'GET') return false;
            var u = String(url || '');
            return u.indexOf('/pets/myadoptions') >= 0;
        }

        function spoofXhrResponse(xhr) {
            try {
                Object.defineProperty(xhr, 'responseText', { configurable: true, value: EMPTY_MY_ADOPTIONS });
                Object.defineProperty(xhr, 'response', { configurable: true, value: EMPTY_MY_ADOPTIONS });
            } catch (_) {
                try {
                    xhr.responseText = EMPTY_MY_ADOPTIONS;
                    xhr.response = EMPTY_MY_ADOPTIONS;
                } catch (_2) { }
            }
        }

        if (!isGarcaPetContext()) return;

        var XHR = window.XMLHttpRequest;
        if (XHR && !XHR.prototype.__garcapetAddPetGuardPatched) {
            XHR.prototype.__garcapetAddPetGuardPatched = true;
            var origOpen = XHR.prototype.open;
            var origSend = XHR.prototype.send;
            XHR.prototype.open = function (method, url) {
                this.__garcapetMethod = method;
                this.__garcapetUrl = url;
                return origOpen.apply(this, arguments);
            };
            XHR.prototype.send = function () {
                var xhr = this;
                if (isMyAdoptionsRoleCheck(xhr.__garcapetUrl, xhr.__garcapetMethod)) {
                    xhr.addEventListener(
                        'readystatechange',
                        function () {
                            if (xhr.readyState !== 4) return;
                            if (!isMyAdoptionsRoleCheck(xhr.__garcapetUrl, xhr.__garcapetMethod)) return;
                            if (xhr.status >= 200 && xhr.status < 300) {
                                spoofXhrResponse(xhr);
                            }
                        },
                        true
                    );
                }
                return origSend.apply(this, arguments);
            };
        }

        // Fallback se algum trecho usar window.axios
        function patchAxiosAddPet() {
            var ax = window.axios;
            if (!ax || ax.__garcapetAddPetRolePatched) return;
            ax.__garcapetAddPetRolePatched = true;
            ax.interceptors.response.use(function (response) {
                try {
                    var url = String((response.config && response.config.url) || '');
                    var method = String((response.config && response.config.method) || 'get').toLowerCase();
                    if (isMyAdoptionsRoleCheck(url, method)) {
                        response.data = { pets: [], adoptions: [] };
                    }
                } catch (_) { }
                return response;
            });
        }
        patchAxiosAddPet();
        var tries = 0;
        var timer = setInterval(function () {
            tries += 1;
            patchAxiosAddPet();
            if (window.axios || tries >= 40) clearInterval(timer);
        }, 250);
    })();

    // GarcaPet: aceite obrigatorio dos termos no cadastro (/garcapet/register).
    // Reutiliza o contrato de UserController.register (acceptedTermsAt, acceptedTermsVersion, etc.).
    // Hoje o bundle usa axios -> XHR; existe tambem espelhamento em fetch (abaixo) para migracao futura.
    // Consentimento em localStorage (compartilhado entre abas) para "Ler Termos" em nova aba.
    // Evolucao futura possivel (nao implementado): TTL via acceptedTermsAt, invalidar versao antiga vs DEFAULT_VER.
    (function garcapetRegisterTermsFlow() {
        if (window.__GARCAPET_TERMS_FLOW__) return;
        window.__GARCAPET_TERMS_FLOW__ = true;

        var STORAGE_AT = 'garcapet_acceptedTermsAt';
        var STORAGE_VER = 'garcapet_acceptedTermsVersion';
        var TERMS_PATH = '/garcapet/funcionalidade';
        var DEFAULT_VER = '2.0';

        function termsPageUrl() {
            try {
                return new URL(TERMS_PATH, window.location.origin).href;
            } catch (_) {
                return String(window.location.origin || '') + TERMS_PATH;
            }
        }

        // localStorage (nao sessionStorage): "Ler Termos" abre nova aba; o aceite precisa ser visivel na aba do cadastro.
        function storageGet(k) {
            try {
                return localStorage.getItem(k);
            } catch (_) {
                return null;
            }
        }
        function storageSet(k, v) {
            try {
                localStorage.setItem(k, v);
            } catch (_) {}
        }

        function hasAccepted() {
            var at = storageGet(STORAGE_AT);
            return !!(at && String(at).length);
        }

        function recordAcceptance() {
            storageSet(STORAGE_AT, new Date().toISOString());
            storageSet(STORAGE_VER, DEFAULT_VER);
            try {
                window.dispatchEvent(new CustomEvent('garcapetTermsAccepted'));
            } catch (_) {}
        }

        /** @returns {string|null} novo JSON ou null se nao houver consentimento / corpo invalido */
        function mergeRegisterTermsJsonIfConsented(body) {
            if (typeof body !== 'string' || body.charAt(0) !== '{') return null;
            var acceptedAt = storageGet(STORAGE_AT);
            if (!acceptedAt) return null;
            try {
                var j = JSON.parse(body);
                j.acceptedTermsAt = acceptedAt;
                j.acceptedTermsVersion = storageGet(STORAGE_VER) || DEFAULT_VER;
                j.acceptedTermsUrl = termsPageUrl();
                j.agreeTerms = true;
                return JSON.stringify(j);
            } catch (_) {
                return null;
            }
        }

        function isRegisterPostUrl(urlHref) {
            return !!(urlHref && urlHref.indexOf('/users/register') !== -1);
        }

        var XHR = window.XMLHttpRequest;
        if (XHR && !XHR.prototype.__garcaTermsPatched) {
            XHR.prototype.__garcaTermsPatched = true;
            var origOpen = XHR.prototype.open;
            var origSend = XHR.prototype.send;

            XHR.prototype.open = function (method, url) {
                this.__grcpMethod = method ? String(method).toUpperCase() : '';
                this.__grcpUrl = '';
                try {
                    this.__grcpUrl = new URL(String(url || ''), window.location.origin).href;
                } catch (_) {
                    this.__grcpUrl = String(url || '');
                }
                return origOpen.apply(this, arguments);
            };

            XHR.prototype.send = function (body) {
                try {
                    if (
                        this.__grcpMethod === 'POST' &&
                        isRegisterPostUrl(this.__grcpUrl) &&
                        typeof body === 'string' &&
                        body.charAt(0) === '{'
                    ) {
                        var merged = mergeRegisterTermsJsonIfConsented(body);
                        if (merged) body = merged;
                    }
                } catch (_) {}
                return origSend.call(this, body);
            };
        }

        // Espelha o merge do cadastro se o cliente passar a usar fetch (axios adapter ou outro codigo).
        // Encadeia o window.fetch atual (ex.: patch de pets em FormData), sem alterar outros URLs.
        if (typeof window.fetch === 'function' && !window.__GARCAPET_TERMS_FETCH_PATCHED__) {
            window.__GARCAPET_TERMS_FETCH_PATCHED__ = true;
            var chainFetch = window.fetch.bind(window);
            window.fetch = function (input, init) {
                try {
                    if (typeof input === 'string') {
                        var method = (init && init.method) ? String(init.method).toUpperCase() : 'GET';
                        var urlHref = new URL(input, window.location.origin).href;
                        var body = init && init.body;
                        if (
                            method === 'POST' &&
                            isRegisterPostUrl(urlHref) &&
                            typeof body === 'string' &&
                            body.charAt(0) === '{'
                        ) {
                            var mergedFetch = mergeRegisterTermsJsonIfConsented(body);
                            if (mergedFetch) {
                                init = init ? Object.assign({}, init) : {};
                                init.body = mergedFetch;
                            }
                        }
                    }
                } catch (_) {}
                return chainFetch(input, init);
            };
        }

        document.addEventListener(
            'submit',
            function (ev) {
                var path = window.location.pathname || '';
                if (path.indexOf('/garcapet/register') === -1) return;
                if (hasAccepted()) return;
                var form = ev.target;
                if (!form || form.tagName !== 'FORM') return;
                var root = document.getElementById('root');
                if (!root || !root.contains(form)) return;
                ev.preventDefault();
                ev.stopPropagation();
                alert(
                    'Para cadastrar, aceite os Termos de Uso: clique em "Ler Termos", leia a pagina e depois em "Aceitar" (na pagina dos termos ou no formulario de cadastro).'
                );
            },
            true
        );

        function buildRegisterPanel() {
            var wrap = document.createElement('div');
            wrap.id = 'garcapet-terms-consent-panel';
            wrap.setAttribute('data-garca-terms', '1');
            wrap.style.cssText =
                'margin:12px 0;padding:14px;border:1px solid #dbe1ec;border-radius:12px;background:#f8fafc;';
            wrap.innerHTML =
                '<p style="margin:0 0 10px;font-size:13px;color:#334155;line-height:1.4">Voce precisa aceitar os Termos de Uso (LGPD) antes de concluir o cadastro.</p>' +
                '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
                '<button type="button" id="garcapet-btn-read-terms" style="padding:8px 14px;border-radius:8px;border:1px solid #384D9C;background:#fff;color:#384D9C;font-weight:600;cursor:pointer">Ler Termos</button>' +
                '<button type="button" id="garcapet-btn-accept-terms" style="padding:8px 14px;border-radius:8px;border:none;background:#384D9C;color:#fff;font-weight:600;cursor:pointer">Aceitar</button>' +
                '<span id="garcapet-terms-status" style="font-size:13px;font-weight:600"></span>' +
                '</div>';
            return wrap;
        }

        function updateStatusEl(el) {
            if (!el) return;
            if (hasAccepted()) {
                el.textContent = 'Termos aceitos — pode concluir o cadastro.';
                el.style.color = '#15803d';
            } else {
                el.textContent = 'Termos ainda nao aceitos.';
                el.style.color = '#b45309';
            }
        }

        function refreshRegisterStatusFromDom() {
            updateStatusEl(document.getElementById('garcapet-terms-status'));
        }

        if (!window.__GARCAPET_TERMS_GLOBAL_LISTENERS__) {
            window.__GARCAPET_TERMS_GLOBAL_LISTENERS__ = true;
            window.addEventListener('garcapetTermsAccepted', refreshRegisterStatusFromDom);
            window.addEventListener('storage', function (ev) {
                if (ev.storageArea === localStorage && (ev.key === STORAGE_AT || ev.key === STORAGE_VER)) {
                    refreshRegisterStatusFromDom();
                }
            });
        }

        function wireRegisterPanel(panel) {
            var btnRead = panel.querySelector('#garcapet-btn-read-terms');
            var btnAccept = panel.querySelector('#garcapet-btn-accept-terms');
            var status = panel.querySelector('#garcapet-terms-status');
            if (btnRead) {
                btnRead.addEventListener('click', function () {
                    window.open(termsPageUrl(), '_blank', 'noopener,noreferrer');
                });
            }
            if (btnAccept) {
                btnAccept.addEventListener('click', function () {
                    recordAcceptance();
                    updateStatusEl(status);
                });
            }
            updateStatusEl(status);
        }

        function tryInjectRegisterPanel() {
            var path = window.location.pathname || '';
            if (path.indexOf('/garcapet/register') === -1) return;
            if (document.getElementById('garcapet-terms-consent-panel')) return;
            var root = document.getElementById('root');
            if (!root) return;
            var form = root.querySelector('form');
            if (!form) return;
            var panel = buildRegisterPanel();
            var anchor = form.querySelector('input[type="submit"],button[type="submit"]');
            if (anchor && anchor.parentNode) {
                anchor.parentNode.insertBefore(panel, anchor);
            } else {
                form.appendChild(panel);
            }
            wireRegisterPanel(panel);
        }

        function buildFuncionalidadeBar() {
            var bar = document.createElement('div');
            bar.id = 'garcapet-terms-page-bar';
            bar.setAttribute('data-garca-terms', '1');
            bar.style.cssText =
                'position:fixed;left:0;right:0;bottom:0;z-index:99999;padding:12px 16px;background:#1e293b;color:#f1f5f9;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;box-shadow:0 -4px 20px rgba(0,0,0,.25)';
            bar.innerHTML =
                '<span style="font-size:14px;text-align:center">Apos a leitura, clique em Aceitar para registrar o consentimento e voltar ao cadastro.</span>' +
                '<button type="button" id="garcapet-func-accept" style="padding:8px 16px;border-radius:8px;border:none;background:#22c55e;color:#052e16;font-weight:700;cursor:pointer">Aceitar</button>';
            return bar;
        }

        function tryInjectFuncionalidadeBar() {
            var path = window.location.pathname || '';
            if (path.indexOf('/garcapet/funcionalidade') === -1) return;
            if (document.getElementById('garcapet-terms-page-bar')) return;
            document.body.appendChild(buildFuncionalidadeBar());
            var btn = document.getElementById('garcapet-func-accept');
            if (btn) {
                btn.addEventListener('click', function () {
                    recordAcceptance();
                    alert('Aceite registrado. Volte a aba do cadastro para concluir.');
                });
            }
        }

        var RECOVER_PASSWORD_URL = '/garcapet/auth/forgot-password';

        function tryInjectRecoverPasswordLink() {
            var path = (window.location.pathname || '').toLowerCase();
            var onLogin = path.indexOf('/garcapet/login') >= 0;
            var onRegister = path.indexOf('/garcapet/register') >= 0;
            if (!onLogin && !onRegister) return;
            if (
                document.getElementById('garcapet-login-forgot-link') ||
                document.getElementById('garcapet-register-forgot-link')
            ) {
                return;
            }

            var root = document.getElementById('root');
            if (!root) return;

            var section =
                root.querySelector('section[class*="form_container"]') ||
                root.querySelector('form') ||
                root.querySelector('main') ||
                root;

            var elId = onRegister ? 'garcapet-register-forgot-link' : 'garcapet-login-forgot-link';
            var forgot = document.createElement('p');
            forgot.id = elId;
            forgot.setAttribute('data-garca-recover', '1');
            forgot.style.cssText =
                'margin:14px 0 0;font-size:15px;text-align:center;line-height:1.5';
            forgot.innerHTML =
                '<a href="' +
                RECOVER_PASSWORD_URL +
                '" style="color:#446042;font-weight:700;text-decoration:underline">Recuperar senha</a>';

            var paras = section.querySelectorAll ? section.querySelectorAll('p') : [];
            var anchorP = null;
            for (var pi = 0; pi < paras.length; pi += 1) {
                var txt = (paras[pi].textContent || '').toLowerCase();
                if (txt.indexOf('conta') >= 0) {
                    anchorP = paras[pi];
                    break;
                }
            }

            if (anchorP && anchorP.parentNode) {
                anchorP.parentNode.insertBefore(forgot, anchorP);
                return;
            }

            var submit = section.querySelector
                ? section.querySelector('input[type="submit"], button[type="submit"]')
                : null;
            if (submit && submit.parentNode) {
                submit.parentNode.insertBefore(forgot, submit.nextSibling);
                return;
            }

            section.appendChild(forgot);
        }

        var routeScheduled = false;
        function scheduleRouteEnhance() {
            if (routeScheduled) return;
            routeScheduled = true;
            var raf = window.requestAnimationFrame || function (fn) {
                return setTimeout(fn, 16);
            };
            raf(function () {
                routeScheduled = false;
                tryInjectRegisterPanel();
                tryInjectFuncionalidadeBar();
                tryInjectRecoverPasswordLink();
            });
        }

        scheduleRouteEnhance();
        window.__garcapetScheduleRouteEnhance = scheduleRouteEnhance;
        [200, 700, 1500, 3000].forEach(function (ms) {
            setTimeout(scheduleRouteEnhance, ms);
        });
        window.addEventListener('popstate', scheduleRouteEnhance);

        var rootEl = document.getElementById('root');
        if (rootEl) {
            var mo = new MutationObserver(function () {
                scheduleRouteEnhance();
            });
            try {
                mo.observe(rootEl, { childList: true, subtree: true });
            } catch (_) {}
        } else {
            document.addEventListener('DOMContentLoaded', function once() {
                document.removeEventListener('DOMContentLoaded', once);
                var r = document.getElementById('root');
                if (r) {
                    var mo2 = new MutationObserver(function () {
                        scheduleRouteEnhance();
                    });
                    try {
                        mo2.observe(r, { childList: true, subtree: true });
                    } catch (_) {}
                }
                scheduleRouteEnhance();
            });
        }
    })();

    // Hooks de rota SPA (React Router) — patches não podem depender só do pathname no load inicial.
    (function initGarcaPetSpaRouteHooks() {
        if (window.__garcapetSpaRouteHooks) return;
        window.__garcapetSpaRouteHooks = true;
        var listeners = [];
        window.__garcapetOnRouteChange = function (fn) {
            if (typeof fn === 'function') listeners.push(fn);
        };
        function notifyRouteChange() {
            var path = window.location.pathname || '';
            for (var i = 0; i < listeners.length; i += 1) {
                try {
                    listeners[i](path);
                } catch (err) {
                    console.error('[GarcaPet] route hook', err);
                }
            }
            if (typeof window.__garcapetScheduleRouteEnhance === 'function') {
                try {
                    window.__garcapetScheduleRouteEnhance();
                } catch (err2) {
                    console.error('[GarcaPet] route enhance', err2);
                }
            }
        }
        window.addEventListener('popstate', notifyRouteChange);
        var origPush = history.pushState;
        var origReplace = history.replaceState;
        history.pushState = function () {
            origPush.apply(history, arguments);
            notifyRouteChange();
        };
        history.replaceState = function () {
            origReplace.apply(history, arguments);
            notifyRouteChange();
        };
    })();

    // Meus Pets / Gerenciar Pets: lista de pretendentes na fila (doador escolhe)
    (function patchMyPetsAdoptionQueue() {
        function isMyPetsRoute() {
            return (window.location.pathname || '').toLowerCase().indexOf('/garcapet/pet/mypets') >= 0;
        }

        var myPetsById = {};
        var enhanceScheduled = false;
        var messagesByKey = {};

        function escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function getAuthToken() {
            try {
                var raw = localStorage.getItem('token');
                if (raw) {
                    var parsed = JSON.parse(raw);
                    if (typeof parsed === 'string' && parsed.trim()) {
                        return parsed.trim().replace(/^"+|"+$/g, '');
                    }
                }
            } catch (_) {
                var rawOnly = localStorage.getItem('token');
                if (rawOnly) {
                    var trimmed = String(rawOnly).trim().replace(/^"+|"+$/g, '');
                    if (trimmed.indexOf('eyJ') === 0) return trimmed;
                }
            }
            try {
                var auth = localStorage.getItem('auth');
                if (auth) {
                    var a = JSON.parse(auth);
                    if (a && a.token) return String(a.token).trim().replace(/^"+|"+$/g, '');
                }
            } catch (_) { }
            return '';
        }

        function apiRequest(method, url, body) {
            return new Promise(function (resolve, reject) {
                var token = getAuthToken();
                if (!token) {
                    reject(new Error('Sessão expirada. Faça login novamente.'));
                    return;
                }
                var xhr = new XMLHttpRequest();
                xhr.open(method, url, true);
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                if (body !== undefined && body !== null) {
                    xhr.setRequestHeader('Content-Type', 'application/json');
                }
                xhr.onload = function () {
                    var data = {};
                    try {
                        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                    } catch (parseErr) {
                        console.error('[GarcaPet Queue] Resposta não-JSON', url, xhr.status, xhr.responseText);
                        reject(new Error('Resposta inválida do servidor (HTTP ' + xhr.status + ').'));
                        return;
                    }
                    if (xhr.status >= 200 && xhr.status < 300) {
                        console.log('[GarcaPet Queue] OK', method, url, data);
                        resolve(data);
                        return;
                    }
                    console.warn('[GarcaPet Queue] Erro HTTP', method, url, xhr.status, data);
                    reject(new Error(data.message || ('Erro HTTP ' + xhr.status)));
                };
                xhr.onerror = function () {
                    console.error('[GarcaPet Queue] Falha de rede', method, url);
                    reject(new Error('Falha de comunicação com o servidor.'));
                };
                xhr.send(body !== undefined && body !== null ? JSON.stringify(body) : null);
            });
        }

        function showQueueToast(text, type) {
            var id = 'garcapet-queue-toast';
            var existing = document.getElementById(id);
            if (existing) existing.remove();
            var el = document.createElement('div');
            el.id = id;
            el.setAttribute('role', 'status');
            var bg = type === 'error' ? '#fef2f2' : '#ecfdf5';
            var border = type === 'error' ? '#fecaca' : '#6ee7b7';
            var color = type === 'error' ? '#991b1b' : '#065f46';
            el.style.cssText =
                'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;' +
                'max-width:min(92vw,480px);padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600;' +
                'background:' + bg + ';border:1px solid ' + border + ';color:' + color +
                ';box-shadow:0 8px 24px rgba(0,0,0,.12)';
            el.textContent = text;
            document.body.appendChild(el);
            setTimeout(function () {
                if (el.parentNode) el.remove();
            }, 4500);
        }
        window.showQueueToast = showQueueToast;

        function formatMsgDate(d) {
            if (!d) return '';
            try {
                return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            } catch (_) {
                return '';
            }
        }

        function buildMessagesHtml(messages) {
            if (!Array.isArray(messages) || !messages.length) {
                return '<p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Nenhuma mensagem no histórico ainda.</p>';
            }
            var visible = messages.filter(function (m) {
                return m && m.role !== 'system' && m.message;
            });
            if (!visible.length) {
                return '<p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Nenhuma mensagem no histórico ainda.</p>';
            }
            return '<div class="garcapet-msg-history" style="margin-top:10px;max-height:160px;overflow-y:auto">' +
                visible.map(function (m) {
                    var who = m.role === 'donor' ? 'Você (doador)' : m.role === 'adopter' ? 'Pretendente' : 'Sistema';
                    var align = m.role === 'donor' ? 'flex-end' : 'flex-start';
                    var bg = m.role === 'donor' ? '#dbeafe' : '#f1f5f9';
                    return '<div style="display:flex;justify-content:' + align + ';margin-bottom:6px">' +
                        '<div style="max-width:92%;padding:8px 10px;border-radius:8px;background:' + bg + ';font-size:12px">' +
                        '<div style="font-size:10px;color:#64748b;margin-bottom:2px">' + escapeHtml(who) +
                        (m.createdAt ? ' · ' + escapeHtml(formatMsgDate(m.createdAt)) : '') + '</div>' +
                        '<div style="color:#0f172a;word-break:break-word">' + escapeHtml(m.message) + '</div>' +
                        '</div></div>';
                }).join('') + '</div>';
        }

        function statusLabel(status) {
            var map = {
                enviada: 'Pendente',
                em_analise: 'Em análise',
                aprovada: 'Aprovado',
                recusada: 'Recusado',
                cancelada_adotante: 'Cancelado pelo adotante',
                cancelada_doador: 'Cancelado pelo doador',
            };
            return map[status] || status;
        }

        function absorbMyPets(data) {
            if (!data || !Array.isArray(data.pets)) return;
            myPetsById = {};
            data.pets.forEach(function (p) {
                if (p && p._id) myPetsById[String(p._id)] = p;
            });
            if (isMyPetsRoute()) scheduleEnhance();
        }

        function patchAxiosMyPets() {
            var ax = window.axios;
            if (!ax || ax.__garcapetMyPetsQueuePatched) return;
            ax.__garcapetMyPetsQueuePatched = true;
            ax.interceptors.response.use(function (response) {
                try {
                    var url = String((response.config && response.config.url) || '');
                    var method = String((response.config && response.config.method) || 'get').toLowerCase();
                    if (method === 'get' && url.indexOf('/pets/mypets') >= 0) {
                        absorbMyPets(response.data);
                    }
                } catch (_) { }
                return response;
            });
        }

        function getPetIdFromRow(row) {
            var link = row.querySelector('a[href*="/pet/edit/"]');
            if (!link) return null;
            var m = (link.getAttribute('href') || '').match(/\/pet\/edit\/([^/?#]+)/i);
            return m ? m[1] : null;
        }

        function fetchQueue(petId) {
            var cached = myPetsById[String(petId)];
            if (cached && Array.isArray(cached.adoptionQueue) && cached.adoptionQueue.length) {
                return Promise.resolve(cached.adoptionQueue);
            }
            return apiRequest('GET', '/api/pets/' + encodeURIComponent(petId) + '/adoption-requests')
                .then(function (data) {
                    if (!data || !Array.isArray(data.requests)) return [];
                    return data.requests.filter(function (req) {
                        return ['enviada', 'em_analise', 'aprovada'].indexOf(req.status) >= 0;
                    });
                })
                .catch(function () { return []; });
        }

        function sendQueueMessage(requestId, message) {
            var text = String(message || '').trim();
            if (!text) {
                return Promise.reject(new Error('Digite uma mensagem antes de enviar.'));
            }
            return apiRequest(
                'POST',
                '/api/adoption-requests/' + encodeURIComponent(requestId) + '/messages',
                { message: text }
            );
        }

        var LEGACY_TO_REQUEST_STATUS = {
            'Em análise': 'em_analise',
            Aprovado: 'aprovada',
            Recusado: 'recusada',
        };

        function patchStatus(petId, requestId, legacyStatus, message) {
            var newStatus = LEGACY_TO_REQUEST_STATUS[legacyStatus];
            if (!requestId) {
                return Promise.reject(new Error('Solicitação não identificada. Recarregue a página.'));
            }
            if (!newStatus) {
                return Promise.reject(new Error('Status inválido: ' + legacyStatus));
            }
            return apiRequest(
                'PATCH',
                '/api/adoption-requests/' + encodeURIComponent(requestId) + '/status',
                { status: newStatus, message: message || '' }
            );
        }

        function hideLegacyMyPetsControls(row) {
            if (!row) return;
            var selectors = [
                '[class*="requester_info"]',
                '[class*="admin_controls"]',
                '[class*="button_group"]',
                '[class*="admin_textarea"]',
            ];
            selectors.forEach(function (sel) {
                var el = row.querySelector(sel);
                if (el) {
                    el.style.display = 'none';
                    el.setAttribute('aria-hidden', 'true');
                }
            });
        }

        function ensureAxiosAuthHeaders() {
            var ax = window.axios;
            var token = getAuthToken();
            if (!ax || !token) return;
            var bearer = 'Bearer ' + token;
            try {
                if (!ax.defaults.headers) ax.defaults.headers = {};
                if (!ax.defaults.headers.common) ax.defaults.headers.common = {};
                ax.defaults.headers.common.Authorization = bearer;
                ax.defaults.headers.Authorization = bearer;
            } catch (_) { }
            if (ax.__garcapetAuthRequestPatched) return;
            ax.__garcapetAuthRequestPatched = true;
            ax.interceptors.request.use(function (config) {
                config = config || {};
                var t = getAuthToken();
                if (!t) return config;
                var b = 'Bearer ' + t;
                if (!config.headers) {
                    config.headers = {};
                }
                if (typeof config.headers.set === 'function') {
                    config.headers.set('Authorization', b);
                } else {
                    config.headers.Authorization = b;
                }
                return config;
            });
        }

        function removeSingleRequest(requestId) {
            return apiRequest(
                'PATCH',
                '/api/adoption-requests/' + encodeURIComponent(requestId) + '/status',
                { status: 'cancelada_doador', message: '' }
            );
        }

        function concludeAdoptionRequest(requestId) {
            return apiRequest(
                'POST',
                '/api/adoption-requests/' + encodeURIComponent(requestId) + '/conclude',
                {}
            );
        }

        function buildApprovedAdoptionBanner(petId, petCached, approvedReq) {
            var wrap = document.createElement('div');
            wrap.className = 'garcapet-approved-banner';
            wrap.setAttribute('data-pet-id', petId);
            wrap.style.cssText =
                'margin:12px 0;padding:14px;border:2px solid #6ee7b7;border-radius:12px;background:#ecfdf5;grid-column:1/-1;width:100%';

            var adopter = (approvedReq && approvedReq.adopter) || (petCached && petCached.adopter) || {};
            var reqId = approvedReq ? String(approvedReq._id || approvedReq.id || '') : '';

            var title = document.createElement('div');
            title.style.cssText =
                'font-weight:800;font-size:14px;color:#065f46;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em';
            title.textContent = '✓ Adoção aprovada';
            wrap.appendChild(title);

            var name = document.createElement('div');
            name.style.cssText = 'font-size:16px;font-weight:700;color:#1e293b;margin-bottom:6px';
            name.textContent = adopter.name || 'Pretendente aprovado';
            wrap.appendChild(name);

            if (adopter.phone) {
                var phone = document.createElement('div');
                phone.style.cssText = 'font-size:13px;margin-bottom:2px';
                phone.innerHTML = '<strong>Telefone:</strong> ' + escapeHtml(adopter.phone);
                wrap.appendChild(phone);
            }
            if (adopter.email) {
                var email = document.createElement('div');
                email.style.cssText = 'font-size:13px;margin-bottom:6px';
                email.innerHTML = '<strong>E-mail:</strong> ' + escapeHtml(adopter.email);
                wrap.appendChild(email);
            }

            var hint = document.createElement('p');
            hint.style.cssText = 'margin:8px 0 10px;font-size:12px;color:#64748b;line-height:1.45';
            hint.textContent =
                'Este anúncio foi retirado do catálogo público. Quando a entrega do animal for concluída, finalize a adoção abaixo.';
            wrap.appendChild(hint);

            if (reqId) {
                var btnRow = document.createElement('div');
                btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
                var concludeBtn = document.createElement('button');
                concludeBtn.type = 'button';
                concludeBtn.textContent = 'Concluir adoção';
                concludeBtn.style.cssText =
                    'padding:10px 16px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;background:#446042;color:#fff';
                concludeBtn.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (!confirm('Confirmar que a adoção foi concluída? O anúncio será encerrado.')) return;
                    ensureAxiosAuthHeaders();
                    runAction(concludeBtn, function () {
                        return concludeAdoptionRequest(reqId);
                    });
                });
                btnRow.appendChild(concludeBtn);
                wrap.appendChild(btnRow);
            }

            return wrap;
        }

        function petHasApprovedAdoption(petCached, queue) {
            if (petCached && (petCached.hasApprovedAdoption || petCached.adopterStatus === 'Aprovado')) {
                return true;
            }
            if (!queue || !queue.length) return false;
            for (var i = 0; i < queue.length; i += 1) {
                if (queue[i].status === 'aprovada') return true;
            }
            return false;
        }

        function findApprovedRequest(queue) {
            if (!queue) return null;
            for (var i = 0; i < queue.length; i += 1) {
                if (queue[i].status === 'aprovada') return queue[i];
            }
            return null;
        }

        function buildQueuePanel(petId, queue) {
            var wrap = document.createElement('div');
            wrap.className = 'garcapet-queue-panel';
            wrap.setAttribute('data-pet-id', petId);
            wrap.style.cssText =
                'margin:12px 0;padding:12px;border:2px solid #749666;border-radius:12px;background:#f8faf8;grid-column:1/-1;width:100%';

            var title = document.createElement('div');
            title.style.cssText = 'font-weight:800;font-size:14px;color:#446042;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em';
            var onlyApproved = queue.length === 1 && queue[0].status === 'aprovada';
            title.textContent = onlyApproved
                ? 'Pretendente aprovado — finalize quando entregar o animal'
                : 'Fila de pretendentes (' + queue.length + ') — escolha quem analisar/aprovar';
            wrap.appendChild(title);

            var hint = document.createElement('p');
            hint.style.cssText = 'margin:0 0 12px;font-size:12px;color:#64748b;line-height:1.4';
            hint.textContent =
                'Ordem por chegada. Use "Enviar recado" para mandar mensagem sem mudar o status. ' +
                '"Em análise", "Aprovar" e "Recusar" alteram o status da solicitação. Ao aprovar um pretendente, os demais são encerrados.';
            wrap.appendChild(hint);

            queue.forEach(function (req, idx) {
                var adopter = req.adopter || {};
                var reqId = String(req._id || req.id || '');
                var msgKey = petId + ':' + reqId;
                var pos = req.position || req.queuePosition || idx + 1;
                var total = req.total || req.applicantsCount || queue.length;

                var card = document.createElement('div');
                card.className = 'garcapet-queue-item';
                card.style.cssText =
                    'margin-bottom:12px;padding:12px;border-radius:10px;background:#fff;border:1px solid #dbe1ec';

                var isApproved = req.status === 'aprovada';
                card.innerHTML =
                    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">' +
                    '<div><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#ecfdf5;color:#065f46;font-size:11px;font-weight:800;margin-bottom:6px">' +
                    escapeHtml(pos + 'º de ' + total + ' na fila') + '</span>' +
                    '<div style="font-size:11px;color:#64748b;margin-bottom:4px">Status: <strong>' + escapeHtml(statusLabel(req.status)) + '</strong></div>' +
                    '<div style="font-size:14px;font-weight:700;color:#1e293b">' + escapeHtml(adopter.name || 'Sem nome') + '</div>' +
                    (adopter.phone ? '<div style="font-size:13px;margin-top:4px"><strong>Telefone:</strong> ' + escapeHtml(adopter.phone) + '</div>' : '') +
                    (adopter.email ? '<div style="font-size:13px"><strong>E-mail:</strong> ' + escapeHtml(adopter.email) + '</div>' : '') +
                    (req.initialMessage ? '<div style="font-size:13px;margin-top:6px;padding:8px;background:#f1f5f9;border-radius:6px"><strong>Mensagem inicial:</strong> ' + escapeHtml(req.initialMessage) + '</div>' : '') +
                    '</div></div>';

                var chatMount = document.createElement('div');
                chatMount.className = 'garcapet-chat-mount';
                chatMount.setAttribute('data-request-id', reqId);
                card.appendChild(chatMount);

                var btnRow = document.createElement('div');
                btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px';

                function getChatDraft() {
                    var inp = card.querySelector('.garcapet-chat-input');
                    return inp ? inp.value : '';
                }

                function runAction(btn, promiseFactory, opts) {
                    opts = opts || {};
                    var prevLabel = btn.textContent;
                    btn.disabled = true;
                    btn.textContent = opts.loadingLabel || 'Aguarde…';
                    promiseFactory()
                        .then(function (data) {
                            if (opts.onSuccess) {
                                return opts.onSuccess(data);
                            }
                            showQueueToast((data && data.message) || 'Ação concluída.', 'success');
                            window.location.reload();
                        })
                        .catch(function (err) {
                            console.error('[GarcaPet Queue] Ação falhou', err);
                            showQueueToast(err.message || 'Não foi possível concluir a ação.', 'error');
                            btn.disabled = false;
                            btn.textContent = prevLabel;
                        });
                }

                function mkBtn(label, bg, color, legacyStatus, disabled) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.textContent = label;
                    b.disabled = !!disabled;
                    b.style.cssText =
                        'padding:8px 12px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:' +
                        bg + ';color:' + color + (disabled ? ';opacity:.5;cursor:not-allowed' : '');
                    if (!disabled) {
                        b.addEventListener('click', function (ev) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            if (typeof ev.stopImmediatePropagation === 'function') {
                                ev.stopImmediatePropagation();
                            }
                            ensureAxiosAuthHeaders();
                            runAction(b, function () {
                                return patchStatus(petId, reqId, legacyStatus, getChatDraft());
                            });
                        });
                    }
                    return b;
                }

                btnRow.appendChild(mkBtn('Em análise', '#fdba74', '#7c2d12', 'Em análise', req.status === 'em_analise'));
                btnRow.appendChild(mkBtn('Aprovar', '#86efac', '#14532d', 'Aprovado', isApproved));
                btnRow.appendChild(mkBtn('Recusar', '#fecaca', '#991b1b', 'Recusado', isApproved || req.status === 'concluida'));

                var removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.textContent = 'Remover da fila';
                removeBtn.disabled = isApproved || req.status === 'concluida';
                removeBtn.style.cssText =
                    'padding:8px 12px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:#f87171;color:#fff' +
                    (removeBtn.disabled ? ';opacity:.5;cursor:not-allowed' : '');
                removeBtn.addEventListener('click', function (ev) {
                    if (removeBtn.disabled) return;
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (typeof ev.stopImmediatePropagation === 'function') {
                        ev.stopImmediatePropagation();
                    }
                    if (!confirm('Remover este pretendente da fila?')) return;
                    ensureAxiosAuthHeaders();
                    runAction(removeBtn, function () {
                        return removeSingleRequest(reqId);
                    });
                });
                btnRow.appendChild(removeBtn);

                card.appendChild(btnRow);
                wrap.appendChild(card);

                if (window.GarcaPetChat && reqId) {
                    window.GarcaPetChat.mount(chatMount, reqId, 'donor');
                }
            });

            return wrap;
        }

        function refreshQueuePanel(row, petId) {
            var old = row.querySelector('.garcapet-queue-panel');
            if (old) old.remove();
            var oldBanner = row.querySelector('.garcapet-approved-banner');
            if (oldBanner) oldBanner.remove();
            var cached = myPetsById[String(petId)];
            return fetchQueue(petId).then(function (queue) {
                var approvedReq = findApprovedRequest(queue);
                var hasApproved = petHasApprovedAdoption(cached, queue);
                if (!hasApproved && (!queue || !queue.length)) return;
                hideLegacyMyPetsControls(row);
                var container = row.querySelector('[class*="pet_info_container"]') || row;
                if (hasApproved) {
                    container.appendChild(buildApprovedAdoptionBanner(petId, cached, approvedReq));
                }
                if (queue && queue.length) {
                    container.appendChild(buildQueuePanel(petId, queue));
                }
            });
        }

        function enhanceRow(row, petId) {
            if (!petId) return;
            if (row.querySelector('.garcapet-queue-panel') && row.querySelector('.garcapet-approved-banner')) {
                return;
            }

            var cached = myPetsById[String(petId)];
            fetchQueue(petId).then(function (queue) {
                var approvedReq = findApprovedRequest(queue);
                var hasApproved = petHasApprovedAdoption(cached, queue);
                if (!hasApproved && (!queue || !queue.length)) return;

                hideLegacyMyPetsControls(row);

                var container = row.querySelector('[class*="pet_info_container"]') || row;
                if (hasApproved && !row.querySelector('.garcapet-approved-banner')) {
                    container.appendChild(buildApprovedAdoptionBanner(petId, cached, approvedReq));
                }
                if (queue && queue.length && !row.querySelector('.garcapet-queue-panel')) {
                    container.appendChild(buildQueuePanel(petId, queue));
                }
            });
        }

        function enhanceAllRows() {
            if (!isMyPetsRoute()) return;
            var rows = document.querySelectorAll('[class*="petlist_row"]');
            for (var i = 0; i < rows.length; i += 1) {
                var row = rows[i];
                var petId = getPetIdFromRow(row);
                if (petId) enhanceRow(row, petId);
            }
        }

        function scheduleEnhance() {
            if (!isMyPetsRoute()) return;
            if (enhanceScheduled) return;
            enhanceScheduled = true;
            var run = function () {
                enhanceScheduled = false;
                enhanceAllRows();
            };
            [100, 400, 900, 1800].forEach(function (ms) {
                setTimeout(run, ms);
            });
        }

        function prefetchMyPetsIfNeeded() {
            if (!isMyPetsRoute()) return;
            if (Object.keys(myPetsById).length > 0) return;
            apiRequest('GET', '/api/pets/mypets')
                .then(absorbMyPets)
                .catch(function () { scheduleEnhance(); });
        }

        function bootstrapMyPetsPage() {
            if (!isMyPetsRoute()) return;
            patchAxiosMyPets();
            ensureAxiosAuthHeaders();
            prefetchMyPetsIfNeeded();
            scheduleEnhance();
        }

        patchAxiosMyPets();
        (function waitAxiosAuth() {
            if (window.axios) {
                ensureAxiosAuthHeaders();
                bootstrapMyPetsPage();
                return;
            }
            var n = waitAxiosAuth.attempts || 0;
            waitAxiosAuth.attempts = n + 1;
            if (n < 80) setTimeout(waitAxiosAuth, 250);
        })();

        if (typeof window.__garcapetOnRouteChange === 'function') {
            window.__garcapetOnRouteChange(function () {
                bootstrapMyPetsPage();
            });
        }

        var rootEl = document.getElementById('root');
        if (rootEl) {
            new MutationObserver(function () {
                if (isMyPetsRoute()) scheduleEnhance();
            }).observe(rootEl, { childList: true, subtree: true });
        }
        bootstrapMyPetsPage();
    })();
})();
