/**
 * Garça Pet — módulo de castração (campanhas, formulário, painel SAMA)
 * Rotas: /garcapet/castracao, /garcapet/admin/castracao-solicitacoes, /garcapet/admin/castracao-campanhas
 */
(function () {
    var PATCH_VERSION = '20260606w';
    if (window.GarcaPetCastration && window.GarcaPetCastration.version === PATCH_VERSION) return;

    /** Só atua no Garça Pet — não interfere no Memorial (/login) nem em outros apps da API. */
    function isGarcaPetContext() {
        var p = (window.SamaRoutes.legacyPath() || '').toLowerCase();
        return p.indexOf('/garcapet') >= 0 || p.indexOf('/sama/garcapet') >= 0 || p.indexOf('/semit-a-pet') >= 0;
    }
    if (!isGarcaPetContext()) return;

    var API = (window.__API_BASE__ || '/api').replace(/\/$/, '');
    var PATH_PUBLIC = '/garcapet/castracao';
    var PATH_ADMIN_REQUESTS = '/garcapet/admin/castracao-solicitacoes';
    var PATH_ADMIN_CAMPAIGNS = '/garcapet/admin/castracao-campanhas';

    /** Normaliza /sama/garcapet/... e /semit-a-pet/... para /garcapet/... (mesmo path do React Router). */
    function normalizeAppPath(path) { path = window.SamaRoutes.legacyPath(path);
        var p = String(path || window.SamaRoutes.legacyPath() || '/').replace(/\/$/, '') || '/';
        if (p.indexOf('/sama/') === 0) return p.slice(5) || '/';
        if (p === '/sama') return '/';
        if (p.indexOf('/semit-a-pet/') === 0) return p.slice(13) || '/';
        if (p === '/semit-a-pet') return '/';
        return p;
    }

    var STATUS_LABELS = {
        pendente: 'Pendente',
        em_analise: 'Em análise',
        aprovada: 'Aprovada',
        lista_de_espera: 'Lista de espera',
        recusada: 'Recusada',
        agendada: 'Agendada',
        realizada: 'Realizada',
        cancelada: 'Cancelada'
    };

    function escapeHtml(v) {
        return String(v || '')
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
                if (typeof parsed === 'string' && parsed.trim()) return parsed.trim().replace(/^"+|"+$/g, '');
            }
        } catch (_) {
            var t = localStorage.getItem('token');
            if (t && String(t).trim().indexOf('eyJ') === 0) return String(t).trim().replace(/^"+|"+$/g, '');
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

    function decodeJwtPayload(token) {
        try {
            var parts = String(token || '').split('.');
            if (parts.length < 2) return null;
            var base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            return JSON.parse(atob(base64));
        } catch (_) {
            return null;
        }
    }

    function getUserRole() {
        try {
            var u = localStorage.getItem('user');
            if (u) {
                var parsed = JSON.parse(u);
                if (parsed && parsed.role) return String(parsed.role).trim();
            }
        } catch (_) { }
        try {
            var auth = localStorage.getItem('auth');
            if (auth) {
                var a = JSON.parse(auth);
                if (a && a.role) return String(a.role).trim();
                if (a && a.user && a.user.role) return String(a.user.role).trim();
            }
        } catch (_) { }
        var payload = decodeJwtPayload(getAuthToken());
        if (payload && payload.role) return String(payload.role).trim();
        return '';
    }

    var cachedCheckUser = null;
    var cachedCheckUserAt = 0;
    var CHECK_USER_CACHE_MS = 90000;

    function isSamaStaffFromProfile(user) {
        if (!user) return false;
        if (user.role === 'sama') return true;
        if (user.isSamaMember === true) return true;
        return false;
    }

    function isSamaStaff() {
        if (cachedCheckUser && isSamaStaffFromProfile(cachedCheckUser)) return true;
        if (getUserRole() === 'sama') return true;
        return false;
    }

    function fetchCheckUser(force) {
        if (!getAuthToken()) {
            cachedCheckUser = null;
            cachedCheckUserAt = 0;
            return Promise.resolve(null);
        }
        var now = Date.now();
        if (!force && cachedCheckUser && (now - cachedCheckUserAt) < CHECK_USER_CACHE_MS) {
            return Promise.resolve(cachedCheckUser);
        }
        return apiRequest('GET', '/users/checkuser', null, true)
            .then(function (user) {
                cachedCheckUser = user && user._id ? user : null;
                cachedCheckUserAt = Date.now();
                return cachedCheckUser;
            })
            .catch(function () {
                return cachedCheckUser;
            });
    }

    function isCastrationAdminRoute() {
        var n = normalizeAppPath();
        return n === PATH_ADMIN_REQUESTS || n === PATH_ADMIN_CAMPAIGNS;
    }

    function isCastrationModuleActive() {
        return isPublicCastrationPath() || isCastrationAdminRoute();
    }

    function apiRequest(method, path, body, auth) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, API + path, true);
            if (auth) {
                var token = getAuthToken();
                if (!token) {
                    reject(new Error('Faça login para continuar.'));
                    return;
                }
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            }
            if (body !== undefined && body !== null) {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
            xhr.onload = function () {
                var data = {};
                try {
                    data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                } catch (_) {
                    reject(new Error('Resposta inválida do servidor.'));
                    return;
                }
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(data);
                    return;
                }
                reject(new Error(data.message || ('Erro HTTP ' + xhr.status)));
            };
            xhr.onerror = function () { reject(new Error('Falha de rede.')); };
            xhr.ontimeout = function () { reject(new Error('Tempo esgotado. Tente novamente.')); };
            xhr.timeout = 45000;
            xhr.send(body !== undefined && body !== null ? JSON.stringify(body) : null);
        });
    }

    function openAuthedDocument(path, mime) {
        var token = getAuthToken();
        if (!token) {
            alert('Faça login para abrir o documento.');
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', API + path, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.responseType = 'blob';
        xhr.onload = function () {
            if (xhr.status < 200 || xhr.status >= 300) {
                alert('Não foi possível abrir o documento.');
                return;
            }
            var blob = new Blob([xhr.response], { type: mime || xhr.getResponseHeader('Content-Type') || 'text/html' });
            var url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener');
            setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        };
        xhr.onerror = function () { alert('Falha de rede.'); };
        xhr.send();
    }

    function fmtDate(d) {
        if (!d) return '—';
        var dt = new Date(d);
        if (isNaN(dt.getTime())) return '—';
        return dt.toLocaleDateString('pt-BR');
    }

    function fmtDateTime(d) {
        if (!d) return '—';
        var dt = new Date(d);
        if (isNaN(dt.getTime())) return '—';
        return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    function statusPillClass(status) {
        return 'gp-cast-pill gp-cast-pill-' + String(status || 'pendente').replace(/_/g, '-');
    }

    function mountStyles() {
        var styleId = 'garcapet-castration-patch-css';
        var style = document.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }
        if (style.getAttribute('data-v') === PATCH_VERSION) return;
        style.setAttribute('data-v', PATCH_VERSION);
        style.textContent = [
            '#gp-cast-inject-host,.gp-cast-wrap{',
            '--gp-green:#446042;--gp-green-dark:#365233;--gp-green-soft:#ecf5eb;',
            '--gp-accent:#ed9756;--gp-accent-soft:#fff7ed;--gp-green-light:#749666;',
            '--gp-text:#1e293b;--gp-muted:#64748b;--gp-border:#e2e8f0;',
            '--gp-surface:#fff;--gp-bg:#f6f8f5;--gp-radius:16px;--gp-radius-sm:10px;',
            '--gp-shadow:0 4px 24px rgba(68,96,66,.08);--gp-transition:180ms ease;',
            'font-family:Rubik,system-ui,sans-serif;color:var(--gp-text);-webkit-font-smoothing:antialiased}',
            '.gp-cast-wrap{max-width:960px;margin:0 auto;padding:20px 16px 40px}',
            '#gp-cast-inject-host{margin:12px auto 28px;z-index:50;position:relative;pointer-events:auto}',
            '#gp-cast-inject-host input,#gp-cast-inject-host select,#gp-cast-inject-host textarea,#gp-cast-inject-host button{pointer-events:auto}',
            '.gp-cast-card{background:var(--gp-surface);border:1px solid var(--gp-border);border-radius:var(--gp-radius);',
            'padding:24px;margin-bottom:20px;box-shadow:var(--gp-shadow);transition:box-shadow var(--gp-transition)}',
            '.gp-cast-card:hover{box-shadow:0 6px 28px rgba(68,96,66,.1)}',
            '.gp-cast-hero{border-top:4px solid var(--gp-green);background:linear-gradient(180deg,var(--gp-green-soft) 0%,#fff 120px)}',
            '.gp-cast-hero-head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}',
            '.gp-cast-eyebrow{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gp-accent);margin:0 0 6px}',
            '.gp-cast-title{color:var(--gp-green);font-size:clamp(1.25rem,2.5vw,1.65rem);font-weight:700;margin:0;line-height:1.25}',
            '.gp-cast-section-title{font-size:1.15rem;font-weight:700;color:var(--gp-green);margin:0 0 6px}',
            '.gp-cast-section-desc{font-size:.9rem;color:var(--gp-muted);margin:0 0 18px;line-height:1.5}',
            '.gp-cast-sub{color:var(--gp-muted);font-size:.95rem;margin:6px 0 0;line-height:1.45}',
            '.gp-cast-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700}',
            '.gp-cast-badge.open{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}',
            '.gp-cast-badge.open::before{content:"";width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25)}',
            '.gp-cast-badge.closed{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}',
            '.gp-cast-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0 8px}',
            '.gp-cast-stat{background:var(--gp-surface);border:1px solid var(--gp-border);border-radius:var(--gp-radius-sm);',
            'padding:14px 10px;text-align:center;transition:transform var(--gp-transition),border-color var(--gp-transition)}',
            '.gp-cast-stat:hover{transform:translateY(-2px);border-color:#c5d4c3}',
            '.gp-cast-stat b{display:block;font-size:clamp(1.35rem,3vw,1.75rem);color:var(--gp-green);font-weight:800;line-height:1.1}',
            '.gp-cast-stat span{font-size:11px;color:var(--gp-muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}',
            '.gp-cast-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:16px;padding-top:16px;border-top:1px solid var(--gp-border)}',
            '.gp-cast-meta-item{font-size:.88rem;color:var(--gp-muted);line-height:1.45}',
            '.gp-cast-meta-item strong{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--gp-green);margin-bottom:2px}',
            '.gp-cast-section{margin-bottom:0}',
            '.gp-cast-field{margin-bottom:14px}',
            '.gp-cast-field label{display:block;font-size:13px;font-weight:600;color:#475569;margin-bottom:6px}',
            '.gp-cast-req::after{content:" *";color:#dc2626;font-weight:700}',
            '.gp-cast-field input,.gp-cast-field select,.gp-cast-field textarea,.gp-cast-toolbar input,.gp-cast-toolbar select{',
            'width:100%;min-height:44px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:var(--gp-radius-sm);',
            'font-size:15px;font-family:inherit;color:var(--gp-text);background:#fff;transition:border-color var(--gp-transition),box-shadow var(--gp-transition)}',
            '.gp-cast-field textarea{min-height:88px;resize:vertical;line-height:1.45}',
            '.gp-cast-field input:hover,.gp-cast-field select:hover,.gp-cast-field textarea:hover{border-color:#94a3b8}',
            '.gp-cast-field input:focus,.gp-cast-field select:focus,.gp-cast-field textarea:focus{',
            'outline:none;border-color:var(--gp-green);box-shadow:0 0 0 3px rgba(68,96,66,.15)}',
            '.gp-cast-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
            '.gp-cast-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;',
            'border:1px solid transparent;border-radius:var(--gp-radius-sm);font-weight:700;cursor:pointer;font-size:14px;',
            'font-family:inherit;line-height:1.2;transition:background var(--gp-transition),transform var(--gp-transition),box-shadow var(--gp-transition)}',
            '.gp-cast-btn:hover{transform:translateY(-1px)}',
            '.gp-cast-btn:active{transform:translateY(0)}',
            '.gp-cast-btn:focus-visible{outline:2px solid var(--gp-accent);outline-offset:2px}',
            '.gp-cast-btn.primary{background:var(--gp-green);color:#fff;box-shadow:0 2px 8px rgba(68,96,66,.25)}',
            '.gp-cast-btn.primary:hover{background:var(--gp-green-dark);box-shadow:0 4px 12px rgba(68,96,66,.3)}',
            '.gp-cast-btn.secondary{background:#fff;color:var(--gp-green);border-color:#c5d4c3}',
            '.gp-cast-btn.secondary:hover{background:var(--gp-green-soft)}',
            '.gp-cast-btn.danger{background:#fff;color:#b91c1c;border-color:#fecaca}',
            '.gp-cast-btn.danger:hover{background:#fef2f2}',
            '.gp-cast-btn.sm{padding:7px 12px;font-size:12px;min-height:34px}',
            '.gp-cast-animal{border:1px solid var(--gp-border);border-left:4px solid var(--gp-green);border-radius:var(--gp-radius-sm);',
            'padding:0;margin-bottom:16px;background:var(--gp-bg);overflow:hidden}',
            '.gp-cast-animal-head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--gp-green-soft);border-bottom:1px solid #d4e5d2}',
            '.gp-cast-animal-num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;',
            'border-radius:8px;background:var(--gp-green);color:#fff;font-size:13px;font-weight:800}',
            '.gp-cast-animal h4{margin:0;color:var(--gp-green);font-size:15px;font-weight:700}',
            '.gp-cast-animal-body{padding:16px}',
            '.gp-cast-form-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--gp-border)}',
            '.gp-cast-form-actions .gp-cast-btn.primary{min-width:200px}',
            '.gp-cast-msg{padding:12px 14px;border-radius:var(--gp-radius-sm);font-size:14px;margin-bottom:14px;line-height:1.5}',
            '.gp-cast-msg.ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}',
            '.gp-cast-msg.err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}',
            '.gp-cast-msg.info{background:var(--gp-accent-soft);color:#9a3412;border:1px solid #fdba74}',
            '.gp-cast-login-banner{display:flex;flex-wrap:wrap;align-items:center;gap:12px;background:var(--gp-accent-soft);border-color:#fdba74}',
            '.gp-cast-login-banner a{color:var(--gp-green);font-weight:700;text-decoration:underline}',
            '#gp-cast-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;',
            'max-width:min(520px,calc(100% - 24px));padding:14px 20px;border-radius:12px;font-size:14px;font-weight:600;',
            'box-shadow:0 12px 32px rgba(15,23,42,.2);display:none;backdrop-filter:blur(4px)}',
            '#gp-cast-toast.ok{display:block;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}',
            '#gp-cast-toast.err{display:block;background:#fef2f2;color:#991b1b;border:1px solid #fecaca}',
            '#gp-cast-toast.info{display:block;background:var(--gp-accent-soft);color:#9a3412;border:1px solid #fdba74}',
            '#gp-cast-submit:disabled{opacity:.65;cursor:wait;transform:none}',
            '.gp-cast-loading{display:flex;align-items:center;gap:12px;color:var(--gp-muted)}',
            '.gp-cast-spinner{width:22px;height:22px;border:3px solid #e2e8f0;border-top-color:var(--gp-green);border-radius:50%;animation:gp-cast-spin .8s linear infinite}',
            '@keyframes gp-cast-spin{to{transform:rotate(360deg)}}',
            '.gp-cast-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--gp-border);border-radius:var(--gp-radius-sm)}',
            '.gp-cast-table{width:100%;border-collapse:collapse;font-size:13px;min-width:520px}',
            '.gp-cast-table thead{background:var(--gp-green-soft)}',
            '.gp-cast-table th,.gp-cast-table td{border-bottom:1px solid var(--gp-border);padding:12px 14px;text-align:left;vertical-align:middle}',
            '.gp-cast-table th{color:var(--gp-green);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}',
            '.gp-cast-table tbody tr{transition:background var(--gp-transition)}',
            '.gp-cast-table tbody tr:hover{background:#fafdfb}',
            '.gp-cast-table tbody tr:last-child td{border-bottom:none}',
            '.gp-cast-table small{color:var(--gp-muted);font-size:11px}',
            '.gp-cast-table-actions{white-space:nowrap}',
            '.gp-cast-pill{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700}',
            '.gp-cast-pill-pendente,.gp-cast-pill-em-analise{background:#fff7ed;color:#9a3412;border:1px solid #fdba74}',
            '.gp-cast-pill-aprovada,.gp-cast-pill-agendada,.gp-cast-pill-realizada{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}',
            '.gp-cast-pill-lista-de-espera{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}',
            '.gp-cast-pill-recusada,.gp-cast-pill-cancelada{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}',
            '.gp-cast-status-select{min-height:36px;padding:6px 10px;font-size:12px}',
            '.gp-cast-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:18px}',
            '.gp-cast-form-block{margin-bottom:18px}',
            '.gp-cast-stats-pre{margin-top:14px;font-size:12px;background:var(--gp-bg);padding:14px;border-radius:var(--gp-radius-sm);border:1px solid var(--gp-border);display:none;overflow:auto}',
            '[class*="Castracao_admin_controls"]{top:185px!important}',
            '@media(max-width:968px){[class*="Castracao_admin_controls"]{top:155px!important;right:12px!important}}',
            '@media(max-width:768px){.gp-cast-grid{grid-template-columns:1fr}.gp-cast-wrap{padding:16px 12px 32px}.gp-cast-card{padding:18px}}',
            '@media(max-width:640px){.gp-cast-row{grid-template-columns:1fr}.gp-cast-form-actions{flex-direction:column;align-items:stretch}',
            '.gp-cast-form-actions .gp-cast-btn,.gp-cast-form-actions .gp-cast-btn.primary{width:100%;min-width:0}}',
            'a[data-gp-cast-menu]{display:block}',
            '#gp-sama-admin-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:10px 16px;',
            'background:linear-gradient(90deg,var(--gp-green) 0%,var(--gp-green-dark) 100%);color:#fff;',
            'font-size:13px;font-weight:600;box-shadow:0 2px 12px rgba(68,96,66,.22);position:relative;z-index:55}',
            '#gp-sama-admin-bar .gp-sama-label{opacity:.9;font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-right:4px}',
            '#gp-sama-admin-bar a{color:#fff;text-decoration:none;padding:6px 12px;border-radius:8px;',
            'border:1px solid rgba(255,255,255,.35);transition:background .18s ease}',
            '#gp-sama-admin-bar a:hover{background:rgba(255,255,255,.15)}',
            '#gp-sama-admin-bar a.gp-sama-active{background:var(--gp-accent);border-color:var(--gp-accent);color:#fff}',
            'a[data-gp-cast-nav]{font-weight:600!important}',
            'li.gp-cast-nav-item{list-style:none;position:relative}',
            'li.gp-cast-nav-item>.gp-cast-nav-trigger{display:flex;align-items:center;gap:5px;cursor:pointer;',
            'color:inherit;font-weight:600;text-decoration:none;padding:8px 10px}',
            'li.gp-cast-nav-item>.gp-cast-nav-dropdown{display:none;position:absolute;top:100%;left:0;min-width:220px;',
            'background:#fff;border:1px solid var(--gp-border);border-radius:10px;box-shadow:0 8px 24px rgba(68,96,66,.12);',
            'padding:8px 0;z-index:60}',
            'li.gp-cast-nav-item:hover>.gp-cast-nav-dropdown,li.gp-cast-nav-item:focus-within>.gp-cast-nav-dropdown{display:block}',
            'li.gp-cast-nav-item .gp-cast-nav-dropdown a{display:block;padding:10px 14px;color:var(--gp-green);',
            'font-weight:600;text-decoration:none;font-size:14px}',
            'li.gp-cast-nav-item .gp-cast-nav-dropdown a:hover{background:var(--gp-green-soft)}'
        ].join('');
    }

    var publicPatchActive = false;
    var publicPollTimer = null;
    var lastInjectSignature = '';
    var cachedActive = null;
    var cachedActiveAt = 0;
    var cachedMine = null;
    var cachedMineAt = 0;
    var ACTIVE_CACHE_MS = 45000;
    var MINE_CACHE_MS = 120000;
    var repositionTimer = null;
    var publicRouteInFlight = false;
    var formRendered = false;
    var hostWatchTimer = null;
    var injectRetryTimer = null;
    var lastSpaPath = '';
    var maintenanceTimer = null;
    var menuObserverScheduled = false;
    var formObserver = null;
    var formObserverScheduled = false;
    var pathPollTimer = null;
    var lastPolledPath = '';
    var formInteractionUntil = 0;
    var formEventsBound = false;
    var submitInFlight = false;
    var toastHideTimer = null;
    var samaAccessTimer = null;
    var samaMenuObserver = null;
    var samaMenuMounted = false;
    var samaAccessInFlight = false;
    var lastAdminRouteRendered = '';

    function isPublicCastrationPath() {
        return normalizeAppPath() === PATH_PUBLIC;
    }

    function hasCastrationPageAnchor() {
        var anchor = findCastrationContentAnchor();
        return !!(anchor && anchor.id !== 'root' && (anchor.textContent || '').trim().length > 5);
    }

    function waitForCastrationAnchor(maxMs, cb) {
        var start = Date.now();
        function tick() {
            if (hasCastrationPageAnchor() || Date.now() - start >= maxMs) {
                cb(hasCastrationPageAnchor());
                return;
            }
            injectRetryTimer = setTimeout(tick, 350);
        }
        if (injectRetryTimer) clearTimeout(injectRetryTimer);
        tick();
    }

    function ensureAdminRoot() {
        var root = document.getElementById('root');
        if (!root) return null;
        var box = root.querySelector('.gp-cast-wrap');
        if (!box) {
            root.innerHTML = '';
            box = document.createElement('div');
            box.className = 'gp-cast-wrap';
            root.appendChild(box);
        }
        return box;
    }

    function shouldInjectForm(active) {
        if (!active || active.legacyClosed) return false;
        if (active.acceptsRequests === true) return true;
        var c = active.campaign;
        return !!(c && c.status === 'open' && c.slotsAvailable > 0);
    }

    function stopHostWatcher() {
        if (hostWatchTimer) {
            clearInterval(hostWatchTimer);
            hostWatchTimer = null;
        }
        if (injectRetryTimer) {
            clearTimeout(injectRetryTimer);
            injectRetryTimer = null;
        }
    }

    function removePublicPatch() {
        var host = document.getElementById('gp-cast-inject-host');
        if (host) host.remove();
        publicPatchActive = false;
        formRendered = false;
        lastInjectSignature = '';
        stopHostWatcher();
        stopFormPersistenceObserver();
    }

    function findCastrationContentAnchor() {
        var headings = document.querySelectorAll('#root h1, #root h2, #root h3, #root h4');
        for (var i = 0; i < headings.length; i++) {
            var t = (headings[i].textContent || '').trim().toLowerCase();
            if (
                t.indexOf('importância da castração') >= 0 ||
                t.indexOf('importancia da castracao') >= 0 ||
                t.indexOf('benefícios da castração') >= 0 ||
                t.indexOf('beneficios da castracao') >= 0
            ) {
                return headings[i];
            }
        }
        return document.querySelector('#root main') || document.getElementById('root');
    }

    function isHostAnchored(host) {
        if (!host || !host.parentNode) return false;
        var anchor = findCastrationContentAnchor();
        if (!anchor || !anchor.parentNode || anchor.id === 'root') {
            var root = document.getElementById('root');
            return !!(root && host.parentNode === root && root.firstChild === host);
        }
        return host.parentNode === anchor.parentNode && host.nextElementSibling === anchor;
    }

    function placeInjectHost(host) {
        if (!host) return;
        if (isHostAnchored(host)) return;
        var anchor = findCastrationContentAnchor();
        if (!anchor || !anchor.parentNode) {
            var root = document.getElementById('root');
            if (root) {
                if (root.firstChild) root.insertBefore(host, root.firstChild);
                else root.appendChild(host);
            }
            return;
        }
        if (anchor.id === 'root') {
            if (anchor.firstChild) anchor.insertBefore(host, anchor.firstChild);
            else anchor.appendChild(host);
            return;
        }
        anchor.parentNode.insertBefore(host, anchor);
    }

    function isFormHostAlive() {
        var host = document.getElementById('gp-cast-inject-host');
        return !!(
            formRendered &&
            host &&
            document.body.contains(host) &&
            host.childElementCount > 0
        );
    }

    function isFormInteracting() {
        return submitInFlight || Date.now() < formInteractionUntil;
    }

    function ensureFormMessageEl() {
        var msg = document.getElementById('gp-cast-form-msg');
        if (msg && document.body.contains(msg)) return msg;
        var card = document.getElementById('gp-cast-form-card');
        if (!card || !document.body.contains(card)) return null;
        msg = document.createElement('div');
        msg.id = 'gp-cast-form-msg';
        var title = card.querySelector('.gp-cast-title');
        if (title && title.nextSibling) card.insertBefore(msg, title.nextSibling);
        else card.insertBefore(msg, card.firstChild);
        return msg;
    }

    function showFormMessage(text, type, asHtml) {
        var msg = ensureFormMessageEl();
        if (!msg) return;
        msg.className = 'gp-cast-msg ' + (type || 'info');
        if (asHtml) msg.innerHTML = text;
        else msg.textContent = text;
        try { msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) { }
    }

    function showCastrationToast(text, type) {
        var toast = document.getElementById('gp-cast-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'gp-cast-toast';
            document.body.appendChild(toast);
        }
        toast.className = type || 'info';
        toast.textContent = text;
        if (toastHideTimer) clearTimeout(toastHideTimer);
        toastHideTimer = setTimeout(function () {
            toast.className = '';
            toast.textContent = '';
        }, type === 'ok' ? 12000 : 9000);
    }

    function getSubmitButton() {
        return document.getElementById('gp-cast-submit');
    }

    function setSubmitButtonState(busy, label) {
        var btn = getSubmitButton();
        if (!btn) return;
        btn.disabled = !!busy;
        if (label) btn.textContent = label;
    }

    function validateAnimalsClient(animals) {
        var errors = [];
        if (!animals || !animals.length) {
            errors.push('Informe ao menos um animal.');
            return errors;
        }
        animals.forEach(function (a, idx) {
            var label = 'Animal ' + (idx + 1);
            if (!a.species) errors.push(label + ': selecione a espécie.');
            if (a.species === 'outro' && !String(a.speciesOther || '').trim()) {
                errors.push(label + ': especifique a espécie.');
            }
            if (!String(a.birthYearOrAge || '').trim()) errors.push(label + ': informe idade ou ano de nascimento.');
            if (!String(a.breed || '').trim()) errors.push(label + ': informe a raça.');
            var weight = parseFloat(a.weightKg);
            if (!Number.isFinite(weight) || weight < 0) errors.push(label + ': informe o peso em kg.');
            if (!a.sex) errors.push(label + ': selecione o sexo.');
        });
        return errors;
    }

    function submitCastrationRequest() {
        if (submitInFlight) return;
        var host = document.getElementById('gp-cast-inject-host');
        if (!host) return;

        var animals = collectAnimals(host);
        var validationErrors = validateAnimalsClient(animals);
        if (validationErrors.length) {
            var errText = validationErrors.join(' ');
            showFormMessage(errText, 'err');
            showCastrationToast(validationErrors[0], 'err');
            return;
        }

        submitInFlight = true;
        formInteractionUntil = Date.now() + 60000;
        setSubmitButtonState(true, 'Enviando…');
        showFormMessage('Enviando solicitação… Aguarde.', 'info');
        showCastrationToast('Enviando solicitação…', 'info');

        apiRequest('POST', '/castration-requests', { animals: animals }, true)
            .then(function (data) {
                var protocol = data && data.request ? data.request.protocol : '';
                var receiptUrl = data && data.receiptUrl ? data.receiptUrl : '';
                var okHtml = 'Solicitação registrada! Protocolo <strong>' + escapeHtml(protocol) +
                    '</strong>.' + (receiptUrl
                        ? ' <button type="button" class="gp-cast-btn secondary sm" id="gp-cast-open-receipt" data-url="' + escapeHtml(receiptUrl) + '">Abrir comprovante</button>'
                        : '');
                showFormMessage(okHtml, 'ok', true);
                showCastrationToast('Solicitação enviada! Protocolo ' + protocol, 'ok');
                setSubmitButtonState(false, 'Enviado ✓');

                cachedMine = null;
                cachedMineAt = 0;
                cachedActive = null;
                cachedActiveAt = 0;

                setTimeout(function () {
                    submitInFlight = false;
                    formRendered = false;
                    lastInjectSignature = '';
                    handlePublicRoute(true);
                }, 3500);
            })
            .catch(function (err) {
                submitInFlight = false;
                formInteractionUntil = Date.now() + 5000;
                var errText = (err && err.message) ? err.message : 'Erro ao enviar.';
                showFormMessage(errText, 'err');
                showCastrationToast(errText, 'err');
                setSubmitButtonState(false, 'Enviar solicitação');
            });
    }

    function bindFormInteractionGuard() {
        if (formEventsBound) return;
        formEventsBound = true;
        document.addEventListener('focusin', function (ev) {
            if (ev.target && ev.target.closest && ev.target.closest('#gp-cast-inject-host')) {
                formInteractionUntil = Date.now() + 5000;
            }
        }, true);
        document.addEventListener('mousedown', function (ev) {
            if (ev.target && ev.target.closest && ev.target.closest('#gp-cast-inject-host')) {
                formInteractionUntil = Date.now() + 5000;
            }
        }, true);
    }

    function restoreFormFromCache(box) {
        if (submitInFlight) return false;
        if (!box || !cachedActive || !formRendered) return false;
        renderOpenCampaignPage(box, cachedActive, cachedMine || { items: [] });
        lastInjectSignature = injectSignature(cachedActive);
        placeInjectHost(box);
        return true;
    }

    /** Formulário logo abaixo do banner — dentro do fluxo visual da página. */
    function ensureInjectHost() {
        var host = document.getElementById('gp-cast-inject-host');
        if (host && !document.body.contains(host)) host = null;
        if (!host) {
            host = document.createElement('div');
            host.id = 'gp-cast-inject-host';
            host.className = 'gp-cast-wrap';
        }
        placeInjectHost(host);
        return host;
    }

    function startHostWatcher() {
        if (hostWatchTimer) return;
        hostWatchTimer = setInterval(function () {
            if (!isPublicCastrationPath()) {
                stopHostWatcher();
                return;
            }
            ensureFormVisible();
        }, 1000);
    }

    function ensureFormVisible() {
        if (!isPublicCastrationPath()) return;
        if (submitInFlight) return;
        if (isFormInteracting()) return;

        var host = document.getElementById('gp-cast-inject-host');
        if (isFormHostAlive()) {
            if (!isHostAnchored(host)) placeInjectHost(host);
            return;
        }

        if (!host || !document.body.contains(host) || host.childElementCount === 0) {
            if (publicRouteInFlight) return;
            var box = ensureInjectHost();
            if (restoreFormFromCache(box)) return;
            handlePublicRoute(true);
        }
    }

    function startFormPersistenceObserver() {
        if (formObserver) return;
        var root = document.getElementById('root');
        if (!root) return;
        formObserver = new MutationObserver(function () {
            if (!isPublicCastrationPath()) return;
            if (submitInFlight) return;
            if (isFormInteracting()) return;
            var host = document.getElementById('gp-cast-inject-host');
            if (isFormHostAlive()) return;
            if (host && document.body.contains(host) && host.childElementCount > 0) return;
            if (formObserverScheduled) return;
            formObserverScheduled = true;
            setTimeout(function () {
                formObserverScheduled = false;
                ensureFormVisible();
            }, 200);
        });
        formObserver.observe(root, { childList: true, subtree: true });
    }

    function stopFormPersistenceObserver() {
        if (!formObserver) return;
        formObserver.disconnect();
        formObserver = null;
    }

    function startPathPoller() {
        if (pathPollTimer) return;
        lastPolledPath = normalizeAppPath();
        pathPollTimer = setInterval(function () {
            if (!isGarcaPetContext()) return;
            var current = normalizeAppPath();
            if (current === lastPolledPath) return;
            lastPolledPath = current;
            handleRouteChange();
        }, 1000);
    }

    function schedulePublicInject(force) {
        handlePublicRoute(!!force);
        startHostWatcher();
        startFormPersistenceObserver();
        startPublicPoller();
        waitForCastrationAnchor(15000, function () {
            ensureFormVisible();
        });
        [400, 1200, 3000].forEach(function (ms) {
            setTimeout(function () {
                if (isPublicCastrationPath()) ensureFormVisible();
            }, ms);
        });
    }

    function injectSignature(active) {
        var c = active && active.campaign ? active.campaign : {};
        return [
            active && active.legacyClosed ? '1' : '0',
            c.id || '',
            c.status || '',
            c.slotsAvailable || 0,
            c.reservedAnimals || 0,
            getAuthToken() ? 'auth' : 'guest',
        ].join('|');
    }

    function fetchActiveCampaign() {
        var now = Date.now();
        if (cachedActive && (now - cachedActiveAt) < ACTIVE_CACHE_MS) {
            return Promise.resolve(cachedActive);
        }
        return apiRequest('GET', '/castration-campaigns/active', null, false)
            .then(function (data) {
                cachedActive = data;
                cachedActiveAt = Date.now();
                return data;
            })
            .catch(function (err) {
                if (cachedActive) return cachedActive;
                throw err;
            });
    }

    function fetchMineRequests(force) {
        if (!getAuthToken()) return Promise.resolve({ items: [] });
        var now = Date.now();
        if (!force && cachedMine && (now - cachedMineAt) < MINE_CACHE_MS) {
            return Promise.resolve(cachedMine);
        }
        return apiRequest('GET', '/castration-requests/mine', null, true)
            .then(function (data) {
                cachedMine = data;
                cachedMineAt = Date.now();
                return data;
            })
            .catch(function () {
                return cachedMine || { items: [] };
            });
    }

    function startPublicPoller() {
        if (publicPollTimer) return;
        publicPollTimer = setInterval(function () {
            if (!isPublicCastrationPath()) {
                clearInterval(publicPollTimer);
                publicPollTimer = null;
                removePublicPatch();
                return;
            }
            handlePublicRoute(false);
        }, 60000);
    }

    function animalTemplate(index) {
        return '<div class="gp-cast-animal" data-animal-index="' + index + '">' +
            '<div class="gp-cast-animal-head">' +
            '<span class="gp-cast-animal-num">' + (index + 1) + '</span>' +
            '<h4>Dados do animal</h4>' +
            '</div>' +
            '<div class="gp-cast-animal-body">' +
            '<div class="gp-cast-row">' +
            '<div class="gp-cast-field"><label class="gp-cast-req">Espécie</label><select data-f="species"><option value="cachorro">Cachorro</option><option value="gato">Gato</option><option value="outro">Outro</option></select></div>' +
            '<div class="gp-cast-field gp-cast-species-other" style="display:none"><label>Especifique</label><input data-f="speciesOther" type="text" placeholder="Informe a espécie"></div>' +
            '</div>' +
            '<div class="gp-cast-row">' +
            '<div class="gp-cast-field"><label>Nome</label><input data-f="name" type="text" placeholder="Opcional"></div>' +
            '<div class="gp-cast-field"><label class="gp-cast-req">Idade ou ano nasc.</label><input data-f="birthYearOrAge" type="text" placeholder="Ex: 2 anos"></div>' +
            '</div>' +
            '<div class="gp-cast-row">' +
            '<div class="gp-cast-field"><label class="gp-cast-req">Raça</label><input data-f="breed" type="text" placeholder="Ex: SRD, Poodle"></div>' +
            '<div class="gp-cast-field"><label class="gp-cast-req">Peso (kg)</label><input data-f="weightKg" type="number" min="0" step="0.1" placeholder="Ex: 12.5"></div>' +
            '</div>' +
            '<div class="gp-cast-row">' +
            '<div class="gp-cast-field"><label class="gp-cast-req">Sexo</label><select data-f="sex"><option value="macho">Macho</option><option value="femea">Fêmea</option></select></div>' +
            '<div class="gp-cast-field"><label class="gp-cast-req">Já castrado?</label><select data-f="previouslyCastrated"><option value="false">Não</option><option value="true">Sim</option></select></div>' +
            '</div>' +
            '<div class="gp-cast-row gp-cast-female-only">' +
            '<div class="gp-cast-field"><label>Prenha?</label><select data-f="isPregnant"><option value="false">Não</option><option value="true">Sim</option></select></div>' +
            '<div class="gp-cast-field"><label>No cio?</label><select data-f="inHeat"><option value="false">Não</option><option value="true">Sim</option></select></div>' +
            '</div>' +
            '<div class="gp-cast-row">' +
            '<div class="gp-cast-field"><label>Animal de comunidade?</label><select data-f="isCommunityAnimal"><option value="false">Não</option><option value="true">Sim</option></select></div>' +
            '<div class="gp-cast-field"><label>Tem tutor?</label><select data-f="hasGuardian"><option value="true">Sim</option><option value="false">Não</option></select></div>' +
            '</div>' +
            '<div class="gp-cast-row">' +
            '<div class="gp-cast-field"><label>Doenças?</label><select data-f="hasDiseases"><option value="false">Não</option><option value="true">Sim</option></select></div>' +
            '<div class="gp-cast-field gp-cast-diseases-detail" style="display:none"><label>Quais?</label><input data-f="diseasesDetail" type="text" placeholder="Descreva as doenças"></div>' +
            '</div>' +
            '<div class="gp-cast-row">' +
            '<div class="gp-cast-field"><label>Medicação contínua?</label><select data-f="onContinuousMedication"><option value="false">Não</option><option value="true">Sim</option></select></div>' +
            '<div class="gp-cast-field gp-cast-medication-detail" style="display:none"><label>Qual?</label><input data-f="medicationDetail" type="text" placeholder="Nome da medicação"></div>' +
            '</div>' +
            '<div class="gp-cast-row">' +
            '<div class="gp-cast-field"><label>Agressivo?</label><select data-f="isAggressive"><option value="false">Não</option><option value="true">Sim</option></select></div>' +
            '<div class="gp-cast-field"><label>Observações</label><textarea data-f="notes" rows="2" placeholder="Informações adicionais sobre o animal"></textarea></div>' +
            '</div>' +
            (index > 0 ? '<button type="button" class="gp-cast-btn danger sm gp-cast-remove-animal">Remover animal</button>' : '') +
            '</div></div>';
    }

    function collectAnimals(container) {
        var blocks = container.querySelectorAll('.gp-cast-animal');
        var animals = [];
        blocks.forEach(function (block) {
            var obj = {};
            block.querySelectorAll('[data-f]').forEach(function (el) {
                var key = el.getAttribute('data-f');
                var val = el.value;
                if (el.type === 'number') val = parseFloat(val);
                else if (el.tagName === 'SELECT' && (val === 'true' || val === 'false')) val = val === 'true';
                obj[key] = val;
            });
            animals.push(obj);
        });
        return animals;
    }

    function bindAnimalFormEvents(container) {
        if (!container || container.dataset.gpCastBound === '1') return;
        container.dataset.gpCastBound = '1';
        container.addEventListener('change', function (ev) {
            var el = ev.target;
            if (!el || !el.getAttribute) return;
            var block = el.closest('.gp-cast-animal');
            if (!block) return;
            if (el.getAttribute('data-f') === 'species') {
                var other = block.querySelector('.gp-cast-species-other');
                if (other) other.style.display = el.value === 'outro' ? 'block' : 'none';
            }
            if (el.getAttribute('data-f') === 'sex') {
                var fem = block.querySelector('.gp-cast-female-only');
                if (fem) fem.style.display = el.value === 'femea' ? 'grid' : 'none';
            }
            if (el.getAttribute('data-f') === 'hasDiseases') {
                var dd = block.querySelector('.gp-cast-diseases-detail');
                if (dd) dd.style.display = el.value === 'true' ? 'block' : 'none';
            }
            if (el.getAttribute('data-f') === 'onContinuousMedication') {
                var md = block.querySelector('.gp-cast-medication-detail');
                if (md) md.style.display = el.value === 'true' ? 'block' : 'none';
            }
        });
        container.addEventListener('click', function (ev) {
            var target = ev.target;
            if (!target) return;
            if (target.id === 'gp-cast-open-receipt' || (target.closest && target.closest('#gp-cast-open-receipt'))) {
                var receiptBtn = target.id === 'gp-cast-open-receipt' ? target : target.closest('#gp-cast-open-receipt');
                var url = receiptBtn && receiptBtn.getAttribute('data-url');
                if (url) openAuthedDocument(url, 'text/html');
                return;
            }
            if (target.id === 'gp-cast-submit' || (target.closest && target.closest('#gp-cast-submit'))) {
                ev.preventDefault();
                submitCastrationRequest();
                return;
            }
            if (target.classList && target.classList.contains('gp-cast-remove-animal')) {
                var block = target.closest('.gp-cast-animal');
                if (block) block.remove();
            }
            if (target.id === 'gp-cast-add-animal') {
                var list = container.querySelector('#gp-cast-animals');
                if (!list) return;
                var count = list.querySelectorAll('.gp-cast-animal').length;
                if (count >= 20) return;
                list.insertAdjacentHTML('beforeend', animalTemplate(count));
            }
        });
    }

    function renderOpenCampaignPage(box, active, mine) {
        mountStyles();
        var c = active.campaign;
        var html = '';

        html += '<div class="gp-cast-card gp-cast-hero">';
        html += '<div class="gp-cast-hero-head">';
        html += '<div><p class="gp-cast-eyebrow">Campanha ativa</p><h1 class="gp-cast-title">Inscrições abertas — Castração</h1>';
        if (c) html += '<p class="gp-cast-sub">' + escapeHtml(c.name) + '</p>';
        html += '</div>';
        html += '<span class="gp-cast-badge open">Inscrições abertas</span>';
        html += '</div>';
        if (c) {
            html += '<div class="gp-cast-grid">';
            html += '<div class="gp-cast-stat"><b>' + escapeHtml(c.slotsAvailable) + '</b><span>vagas disponíveis</span></div>';
            html += '<div class="gp-cast-stat"><b>' + escapeHtml(c.reservedAnimals) + '</b><span>vagas preenchidas</span></div>';
            html += '<div class="gp-cast-stat"><b>' + escapeHtml(c.maxAnimals) + '</b><span>capacidade total</span></div>';
            html += '</div>';
            if (c.surgeryDate || c.location || c.notes) {
                html += '<div class="gp-cast-meta">';
                if (c.surgeryDate) html += '<div class="gp-cast-meta-item"><strong>Data da cirurgia</strong>' + escapeHtml(fmtDate(c.surgeryDate)) + '</div>';
                if (c.location) html += '<div class="gp-cast-meta-item"><strong>Local</strong>' + escapeHtml(c.location) + '</div>';
                if (c.notes) html += '<div class="gp-cast-meta-item"><strong>Observações</strong>' + escapeHtml(c.notes) + '</div>';
                html += '</div>';
            }
        }
        html += '</div>';

        if (mine.items && mine.items.length) {
                html += '<div class="gp-cast-card gp-cast-section">';
                html += '<h2 class="gp-cast-section-title">Minhas solicitações</h2>';
                html += '<p class="gp-cast-section-desc">Acompanhe o status das inscrições que você já enviou.</p>';
                html += '<div class="gp-cast-table-wrap"><table class="gp-cast-table"><thead><tr>' +
                    '<th>Protocolo</th><th>Status</th><th>Animais</th><th>Data</th><th></th></tr></thead><tbody>';
                mine.items.forEach(function (item) {
                    var statusText = item.statusLabel || STATUS_LABELS[item.status] || item.status;
                    html += '<tr><td><strong>' + escapeHtml(item.protocol) + '</strong></td><td><span class="' + statusPillClass(item.status) + '">' +
                        escapeHtml(statusText) + '</span></td><td>' + escapeHtml(item.animalCount) + '</td><td>' + escapeHtml(fmtDate(item.createdAt)) +
                        '</td><td class="gp-cast-table-actions"><button type="button" class="gp-cast-btn secondary sm gp-cast-receipt-mine" data-id="' +
                        escapeHtml(item._id) + '">Comprovante</button></td></tr>';
                });
                html += '</tbody></table></div></div>';
            }

        if (!getAuthToken()) {
            html += '<div class="gp-cast-card gp-cast-login-banner"><span>Para enviar sua solicitação, é necessário estar logado.</span>' +
                '<a class="gp-cast-btn primary sm" href="/garcapet/login?redirect=' + encodeURIComponent(PATH_PUBLIC) + '">Fazer login</a></div>';
        } else {
            html += '<div class="gp-cast-card gp-cast-section" id="gp-cast-form-card">';
            html += '<h2 class="gp-cast-section-title">Nova solicitação</h2>';
            html += '<p class="gp-cast-section-desc">Preencha os dados de cada animal que deseja inscrever na campanha.</p>';
            html += '<div id="gp-cast-form-msg"></div>';
            html += '<div id="gp-cast-animals">' + animalTemplate(0) + '</div>';
            html += '<div class="gp-cast-form-actions">';
            html += '<button type="button" class="gp-cast-btn secondary" id="gp-cast-add-animal">+ Adicionar animal</button>';
            html += '<button type="button" class="gp-cast-btn primary" id="gp-cast-submit">Enviar solicitação</button>';
            html += '</div></div>';
        }

        box.innerHTML = html;
        bindAnimalFormEvents(box);

        box.querySelectorAll('.gp-cast-receipt-mine').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                openAuthedDocument('/castration-requests/mine/' + encodeURIComponent(id) + '/receipt', 'text/html');
            });
        });

    }

    /** Campanha fechada: não altera a página React. Aberta: injeta formulário no fluxo da página. */
    function handlePublicRoute(force) {
        if (!isPublicCastrationPath()) return;
        if (publicRouteInFlight) return;
        if (submitInFlight) return;
        if (!force && isFormInteracting()) return;
        if (!force && isFormHostAlive()) return;

        publicPatchActive = true;
        mountStyles();
        bindFormInteractionGuard();
        var box = ensureInjectHost();

        if (!force && formRendered && cachedActive && box && box.childElementCount === 0) {
            if (restoreFormFromCache(box)) return;
        }

        if (box && (!formRendered || force) && box.childElementCount === 0) {
            box.innerHTML = '<div class="gp-cast-card gp-cast-loading"><span class="gp-cast-spinner"></span><p class="gp-cast-sub">Carregando inscrições…</p></div>';
        }

        publicRouteInFlight = true;
        fetchActiveCampaign()
            .then(function (active) {
                if (!shouldInjectForm(active)) {
                    removePublicPatch();
                    return;
                }
                var signature = injectSignature(active);
                var hostReady = document.getElementById('gp-cast-inject-host');
                if (
                    !force &&
                    formRendered &&
                    signature === lastInjectSignature &&
                    hostReady &&
                    document.body.contains(hostReady) &&
                    hostReady.childElementCount > 0
                ) {
                    placeInjectHost(hostReady);
                    return;
                }

                if (!box) box = ensureInjectHost();
                if (!box) return;
                return fetchMineRequests(force).then(function (mine) {
                    renderOpenCampaignPage(box, active, mine);
                    lastInjectSignature = signature;
                    formRendered = true;
                    placeInjectHost(box);
                });
            })
            .catch(function () {
                if (!box) box = ensureInjectHost();
                if (box) {
                    box.innerHTML = '<div class="gp-cast-card gp-cast-msg err">Não foi possível carregar as inscrições. <button type="button" class="gp-cast-btn secondary" id="gp-cast-retry-load">Tentar novamente</button></div>';
                    var retryBtn = document.getElementById('gp-cast-retry-load');
                    if (retryBtn) {
                        retryBtn.addEventListener('click', function () {
                            cachedActive = null;
                            cachedActiveAt = 0;
                            formRendered = false;
                            handlePublicRoute(true);
                        });
                    }
                    placeInjectHost(box);
                }
            })
            .then(function () {
                publicRouteInFlight = false;
            });
    }

    function renderAdminRequests(box) {
        mountStyles();
        if (!isSamaStaff()) {
            box.innerHTML = '<div class="gp-cast-card gp-cast-msg err">Acesso restrito à equipe SAMA.</div>';
            return;
        }

        box.innerHTML = '<div class="gp-cast-card gp-cast-loading"><span class="gp-cast-spinner"></span><p class="gp-cast-sub">Carregando solicitações…</p></div>';

        apiRequest('GET', '/castration-requests?limit=100', null, true).then(function (data) {
            var html = '<div class="gp-cast-card">';
            html += '<h1 class="gp-cast-title">Solicitações de Castração</h1>';
            html += '<p class="gp-cast-section-desc">Gerencie as inscrições recebidas na campanha ativa.</p>';
            html += '<div class="gp-cast-toolbar">';
            html += '<a class="gp-cast-btn secondary" href="' + PATH_ADMIN_CAMPAIGNS + '">Campanhas</a>';
            html += '<button type="button" class="gp-cast-btn secondary" id="gp-cast-export-csv">Exportar CSV</button>';
            html += '</div>';
            html += '<div class="gp-cast-table-wrap"><table class="gp-cast-table"><thead><tr><th>Protocolo</th><th>Solicitante</th><th>Cidade</th><th>Animais</th><th>Status</th><th>Ações</th></tr></thead><tbody>';

            (data.items || []).forEach(function (row) {
                html += '<tr data-id="' + escapeHtml(row._id) + '">';
                html += '<td><strong>' + escapeHtml(row.protocol) + '</strong><br><small>' + escapeHtml(fmtDateTime(row.createdAt)) + '</small></td>';
                html += '<td>' + escapeHtml(row.applicant && row.applicant.name) + '<br><small>' + escapeHtml(row.applicant && row.applicant.phone) + '</small></td>';
                html += '<td>' + escapeHtml(row.applicant && row.applicant.city) + '</td>';
                html += '<td>' + escapeHtml(row.animalCount) + '</td>';
                html += '<td><select class="gp-cast-status-select">';
                Object.keys(STATUS_LABELS).forEach(function (st) {
                    html += '<option value="' + st + '"' + (row.status === st ? ' selected' : '') + '>' + STATUS_LABELS[st] + '</option>';
                });
                html += '</select></td>';
                html += '<td class="gp-cast-table-actions">';
                html += '<button type="button" class="gp-cast-btn primary sm gp-cast-save-status">Salvar</button> ';
                html += '<button type="button" class="gp-cast-btn secondary sm gp-cast-receipt-admin" data-id="' + escapeHtml(row._id) + '">Comprovante</button>';
                html += '</td></tr>';
            });

            html += '</tbody></table></div></div>';
            box.innerHTML = html;

            var exportBtn = document.getElementById('gp-cast-export-csv');
            if (exportBtn) {
                exportBtn.addEventListener('click', function () {
                    openAuthedDocument('/castration-requests/export.csv', 'text/csv');
                });
            }

            box.querySelectorAll('.gp-cast-receipt-admin').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = btn.getAttribute('data-id');
                    openAuthedDocument('/castration-requests/' + encodeURIComponent(id) + '/receipt', 'text/html');
                });
            });

            box.querySelectorAll('.gp-cast-save-status').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var tr = btn.closest('tr');
                    var id = tr.getAttribute('data-id');
                    var status = tr.querySelector('.gp-cast-status-select').value;
                    btn.disabled = true;
                    apiRequest('PATCH', '/castration-requests/' + encodeURIComponent(id) + '/status', { status: status }, true)
                        .then(function () { renderAdminRequests(box); })
                        .catch(function (err) { alert(err.message || 'Erro'); btn.disabled = false; });
                });
            });
        }).catch(function (err) {
            box.innerHTML = '<div class="gp-cast-card gp-cast-msg err">' + escapeHtml(err.message || 'Erro ao carregar.') + '</div>';
        });
    }

    function renderAdminCampaigns(box) {
        mountStyles();
        if (!isSamaStaff()) {
            box.innerHTML = '<div class="gp-cast-card gp-cast-msg err">Acesso restrito à equipe SAMA.</div>';
            return;
        }

        box.innerHTML = '<div class="gp-cast-card gp-cast-loading"><span class="gp-cast-spinner"></span><p class="gp-cast-sub">Carregando campanhas…</p></div>';

        apiRequest('GET', '/castration-campaigns', null, true).then(function (data) {
            var html = '<div class="gp-cast-card">';
            html += '<h1 class="gp-cast-title">Campanhas de Castração</h1>';
            html += '<p class="gp-cast-section-desc">Crie e gerencie campanhas de castração solidária.</p>';
            html += '<div class="gp-cast-toolbar"><a class="gp-cast-btn secondary" href="' + PATH_ADMIN_REQUESTS + '">Solicitações</a></div>';
            html += '<div class="gp-cast-row gp-cast-form-block">';
            html += '<div class="gp-cast-field"><label>Nome</label><input id="gp-new-name" type="text" placeholder="Campanha 2026"></div>';
            html += '<div class="gp-cast-field"><label>Vagas (maxAnimals)</label><input id="gp-new-max" type="number" min="1" value="50"></div>';
            html += '</div>';
            html += '<div class="gp-cast-row gp-cast-form-block">';
            html += '<div class="gp-cast-field"><label>Data cirurgia</label><input id="gp-new-surgery" type="date"></div>';
            html += '<div class="gp-cast-field"><label>Local</label><input id="gp-new-location" type="text" placeholder="Ex: SAMA — Bosque Municipal"></div>';
            html += '</div>';
            html += '<button type="button" class="gp-cast-btn primary" id="gp-new-campaign">Criar campanha (rascunho)</button>';
            html += '<div id="gp-campaign-msg"></div>';
            html += '<div class="gp-cast-table-wrap gp-cast-form-block"><table class="gp-cast-table"><thead><tr><th>Nome</th><th>Status</th><th>Vagas</th><th>Ações</th></tr></thead><tbody>';

            (data.items || []).forEach(function (c) {
                html += '<tr data-id="' + escapeHtml(c.id) + '">';
                html += '<td><strong>' + escapeHtml(c.name) + '</strong><br><small>' + escapeHtml(fmtDate(c.surgeryDate)) + ' · ' + escapeHtml(c.location) + '</small></td>';
                html += '<td><span class="' + statusPillClass(c.status === 'open' ? 'aprovada' : c.status === 'closed' ? 'cancelada' : 'pendente') + '">' + escapeHtml(c.status) + '</span></td>';
                html += '<td>' + escapeHtml(c.reservedAnimals) + ' / ' + escapeHtml(c.maxAnimals) + ' <small>(' + escapeHtml(c.slotsAvailable) + ' livres)</small></td>';
                html += '<td class="gp-cast-table-actions">';
                if (c.status === 'draft' || c.status === 'closed') {
                    html += '<button type="button" class="gp-cast-btn primary sm gp-cast-open">Abrir</button> ';
                }
                if (c.status === 'open' || c.status === 'full') {
                    html += '<button type="button" class="gp-cast-btn danger sm gp-cast-close">Encerrar</button> ';
                }
                html += '<button type="button" class="gp-cast-btn secondary sm gp-cast-stats">Stats</button>';
                html += '</td></tr>';
            });
            html += '</tbody></table></div><pre id="gp-campaign-stats" class="gp-cast-stats-pre"></pre></div>';
            box.innerHTML = html;

            document.getElementById('gp-new-campaign').addEventListener('click', function () {
                var payload = {
                    name: document.getElementById('gp-new-name').value || ('Campanha ' + new Date().getFullYear()),
                    year: new Date().getFullYear(),
                    maxAnimals: parseInt(document.getElementById('gp-new-max').value, 10) || 50,
                    surgeryDate: document.getElementById('gp-new-surgery').value || undefined,
                    location: document.getElementById('gp-new-location').value || ''
                };
                apiRequest('POST', '/castration-campaigns', payload, true)
                    .then(function () { renderAdminCampaigns(box); })
                    .catch(function (err) {
                        var m = document.getElementById('gp-campaign-msg');
                        if (m) { m.className = 'gp-cast-msg err'; m.textContent = err.message; }
                    });
            });

            box.querySelectorAll('.gp-cast-open').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = btn.closest('tr').getAttribute('data-id');
                    apiRequest('POST', '/castration-campaigns/' + encodeURIComponent(id) + '/open', null, true)
                        .then(function () { renderAdminCampaigns(box); })
                        .catch(function (err) { alert(err.message); });
                });
            });
            box.querySelectorAll('.gp-cast-close').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = btn.closest('tr').getAttribute('data-id');
                    apiRequest('POST', '/castration-campaigns/' + encodeURIComponent(id) + '/close', null, true)
                        .then(function () { renderAdminCampaigns(box); })
                        .catch(function (err) { alert(err.message); });
                });
            });
            box.querySelectorAll('.gp-cast-stats').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var id = btn.closest('tr').getAttribute('data-id');
                    apiRequest('GET', '/castration-campaigns/' + encodeURIComponent(id) + '/stats', null, true)
                        .then(function (stats) {
                            var pre = document.getElementById('gp-campaign-stats');
                            if (pre) {
                                pre.style.display = 'block';
                                pre.textContent = JSON.stringify(stats, null, 2);
                            }
                        })
                        .catch(function (err) { alert(err.message); });
                });
            });
        }).catch(function (err) {
            box.innerHTML = '<div class="gp-cast-card gp-cast-msg err">' + escapeHtml(err.message || 'Erro ao carregar.') + '</div>';
        });
    }

    function route(force) {
        var path = normalizeAppPath();
        if (path === PATH_PUBLIC) {
            handlePublicRoute(false);
            return false;
        }
        if (path === PATH_ADMIN_REQUESTS) {
            if (!force && lastAdminRouteRendered === path) return true;
            var boxA = ensureAdminRoot();
            if (boxA) {
                renderAdminRequests(boxA);
                lastAdminRouteRendered = path;
            }
            return true;
        }
        if (path === PATH_ADMIN_CAMPAIGNS) {
            if (!force && lastAdminRouteRendered === path) return true;
            var boxB = ensureAdminRoot();
            if (boxB) {
                renderAdminCampaigns(boxB);
                lastAdminRouteRendered = path;
            }
            return true;
        }
        return false;
    }

    function isNodeInDocument(node) {
        return !!(node && document.body && document.body.contains(node));
    }

    function safeInsertBefore(parent, newNode, ref) {
        if (!parent || !newNode) return false;
        if (!isNodeInDocument(parent)) return false;
        if (ref && (!isNodeInDocument(ref) || ref.parentNode !== parent)) {
            parent.appendChild(newNode);
            return true;
        }
        if (ref) parent.insertBefore(newNode, ref);
        else parent.appendChild(newNode);
        return true;
    }

    function isSamaMenuComplete() {
        if (document.getElementById('gp-cast-nav-solicitacoes')) return true;
        if (document.getElementById('gp-sama-admin-bar')) return true;
        return false;
    }

    function hasCastrationMenuLink(kind) {
        return !!document.querySelector('a[data-gp-cast-menu="' + kind + '"]');
    }

    function findSamaUserMenuContainer() {
        if (isCastrationAdminRoute()) return null;

        var profile = document.querySelector(
            '#root header a[href*="/garcapet/user/profile"], #root header a[href*="/user/profile"]'
        );
        if (profile && profile.parentNode) {
            var menuBox = profile.closest('[class*="dropdown"], [role="menu"]');
            if (menuBox && menuBox.contains(profile) && menuBox.parentNode) {
                return { container: menuBox, ref: profile };
            }
            return { container: profile.parentNode, ref: profile };
        }

        var allLinks = document.querySelectorAll('#root header a, #root nav a');
        for (var j = 0; j < allLinks.length; j++) {
            var a = allLinks[j];
            var label = (a.textContent || '').trim().toLowerCase();
            if (label === 'sair' || label === 'meu perfil') {
                if (a.parentNode) return { container: a.parentNode, ref: a };
            }
        }
        return null;
    }

    function findMainNavList() {
        if (isCastrationAdminRoute()) return null;
        var markers = ['pets', 'árvores', 'arvores', 'castração', 'castracao', 'adoção', 'adocao'];
        var links = document.querySelectorAll('#root header a, #root nav a');
        for (var i = 0; i < links.length; i++) {
            var text = (links[i].textContent || '').trim().toLowerCase();
            if (markers.indexOf(text) < 0) continue;
            var li = links[i].closest('li');
            if (li && li.parentNode && li.parentNode.tagName === 'UL' && isNodeInDocument(li.parentNode)) {
                var ref = li.nextSibling;
                if (ref && ref.parentNode !== li.parentNode) ref = null;
                return { container: li.parentNode, ref: ref };
            }
        }
        return null;
    }

    function createMenuLink(href, label, kind, className) {
        var link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        link.setAttribute('data-gp-cast-menu', kind);
        if (className) link.className = className;
        else {
            link.style.display = 'block';
            link.style.padding = '8px 12px';
            link.style.color = '#446042';
            link.style.fontWeight = '600';
            link.style.textDecoration = 'none';
            link.style.cursor = 'pointer';
        }
        return link;
    }

    function ensureSamaAdminBar() {
        if (!isGarcaPetContext() || !isSamaStaff()) {
            var oldBar = document.getElementById('gp-sama-admin-bar');
            if (oldBar) oldBar.remove();
            return;
        }
        mountStyles();
        var bar = document.getElementById('gp-sama-admin-bar');
        var path = normalizeAppPath();
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'gp-sama-admin-bar';
            bar.innerHTML =
                '<span class="gp-sama-label">Área SAMA</span>' +
                '<a href="' + PATH_ADMIN_REQUESTS + '" data-gp-cast-menu="solicitacoes" data-gp-bar="solicitacoes">Solicitações de Castração</a>' +
                '<a href="' + PATH_ADMIN_CAMPAIGNS + '" data-gp-cast-menu="campanhas" data-gp-bar="campanhas">Campanhas de Castração</a>';
            var root = document.getElementById('root');
            var header = root && root.querySelector('header');
            if (header && header.parentNode) {
                if (header.nextSibling) header.parentNode.insertBefore(bar, header.nextSibling);
                else header.parentNode.appendChild(bar);
            } else if (root && root.firstChild) {
                root.insertBefore(bar, root.firstChild);
            } else {
                document.body.insertBefore(bar, document.getElementById('root') || null);
            }
        }
        bar.querySelectorAll('a[data-gp-bar]').forEach(function (lnk) {
            var active =
                (lnk.getAttribute('data-gp-bar') === 'solicitacoes' && path === PATH_ADMIN_REQUESTS) ||
                (lnk.getAttribute('data-gp-bar') === 'campanhas' && path === PATH_ADMIN_CAMPAIGNS);
            lnk.className = active ? 'gp-sama-active' : '';
        });
    }

    function ensureSamaMainNavDropdown() {
        if (!isSamaStaff()) return;
        if (document.getElementById('gp-cast-nav-solicitacoes')) return;
        var target = findMainNavList();
        if (!target || !target.container) return;

        var refLi = target.container.querySelector('li');
        var liClass = refLi && refLi.className ? refLi.className : 'gp-cast-nav-item';
        var linkClass = '';
        var sampleLink = target.container.querySelector('a');
        if (sampleLink && sampleLink.className) linkClass = sampleLink.className;

        var li = document.createElement('li');
        li.id = 'gp-cast-nav-solicitacoes';
        li.className = liClass + ' gp-cast-nav-item';

        var trigger = document.createElement('span');
        trigger.className = 'gp-cast-nav-trigger';
        trigger.textContent = 'Solicitações ▾';

        var dropdown = document.createElement('div');
        dropdown.className = 'gp-cast-nav-dropdown';

        var reqLink = createMenuLink(
            PATH_ADMIN_REQUESTS,
            'Solicitações de Castração',
            'solicitacoes',
            linkClass
        );
        var campLink = createMenuLink(
            PATH_ADMIN_CAMPAIGNS,
            'Campanhas de Castração',
            'campanhas',
            linkClass
        );
        dropdown.appendChild(reqLink);
        dropdown.appendChild(campLink);
        li.appendChild(trigger);
        li.appendChild(dropdown);

        safeInsertBefore(target.container, li, target.ref);
    }

    function stopSamaMenuObserver() {
        if (!samaMenuObserver) return;
        samaMenuObserver.disconnect();
        samaMenuObserver = null;
    }

    function startSamaMenuObserver() {
        if (samaMenuObserver || samaMenuMounted) return;
        var root = document.getElementById('root');
        if (!root) return;
        samaMenuObserver = new MutationObserver(function (records) {
            if (!isGarcaPetContext() || samaMenuMounted || isCastrationAdminRoute()) return;
            var relevant = false;
            for (var i = 0; i < records.length; i++) {
                var t = records[i].target;
                if (t && t.closest && (
                    t.closest('#gp-sama-admin-bar') ||
                    t.closest('#gp-cast-nav-solicitacoes') ||
                    t.closest('.gp-cast-wrap') ||
                    t.closest('#gp-cast-inject-host')
                )) continue;
                relevant = true;
                break;
            }
            if (!relevant) return;
            if (menuObserverScheduled) return;
            menuObserverScheduled = true;
            setTimeout(function () {
                menuObserverScheduled = false;
                if (!samaMenuMounted) ensureSamaAccess(true);
            }, 500);
        });
        samaMenuObserver.observe(root, { childList: true, subtree: true });
    }

    function removeCampanhasFromProfileMenu() {
        var target = findSamaUserMenuContainer();
        if (!target || !target.container) return;
        target.container.querySelectorAll('a[data-gp-cast-menu="campanhas"]').forEach(function (lnk) {
            lnk.remove();
        });
    }

    function ensureSamaAdminMenu() {
        if (!isSamaStaff()) {
            samaMenuMounted = false;
            return;
        }
        if (samaMenuMounted && isSamaMenuComplete()) return;

        removeCampanhasFromProfileMenu();

        var target = findSamaUserMenuContainer();
        if (target && target.container && isNodeInDocument(target.container)) {
            var menuClass = target.ref && target.ref.className ? target.ref.className : '';
            if (!hasCastrationMenuLink('solicitacoes')) {
                safeInsertBefore(
                    target.container,
                    createMenuLink(PATH_ADMIN_REQUESTS, 'Solicitações de Castração', 'solicitacoes', menuClass),
                    target.ref
                );
            }
        }
        ensureSamaMainNavDropdown();
        ensureSamaAdminBar();

        if (isSamaMenuComplete()) {
            samaMenuMounted = true;
            stopSamaMenuObserver();
            if (samaAccessTimer) {
                clearInterval(samaAccessTimer);
                samaAccessTimer = null;
            }
        }
    }

    function ensureSamaAccess(force) {
        if (!isGarcaPetContext()) return;
        if (!getAuthToken()) {
            samaMenuMounted = false;
            return;
        }
        if (!force && samaMenuMounted && isSamaMenuComplete()) return;
        if (samaAccessInFlight) return;

        samaAccessInFlight = true;
        fetchCheckUser(false).then(function () {
            if (isSamaStaff()) {
                ensureSamaAdminMenu();
                if (!samaMenuMounted) startSamaMenuObserver();
            }
        }).then(function () {
            samaAccessInFlight = false;
        });
    }

    function resetSamaMenuState() {
        samaMenuMounted = false;
        lastAdminRouteRendered = '';
        startSamaMenuObserver();
        if (!samaAccessTimer) {
            samaAccessTimer = setInterval(function () {
                if (!isGarcaPetContext()) return;
                if (samaMenuMounted) {
                    clearInterval(samaAccessTimer);
                    samaAccessTimer = null;
                    return;
                }
                if (getAuthToken()) ensureSamaAccess(false);
            }, 5000);
        }
    }

    function startSamaAccessWatcher() {
        startSamaMenuObserver();
        if (samaAccessTimer) return;
        samaAccessTimer = setInterval(function () {
            if (!isGarcaPetContext() || samaMenuMounted) return;
            if (getAuthToken()) ensureSamaAccess(false);
        }, 5000);
    }

    function startMaintenanceTimer() {
        if (maintenanceTimer) return;
        maintenanceTimer = setInterval(function () {
            if (!isCastrationModuleActive()) {
                stopMaintenanceTimer();
                return;
            }
            if (isPublicCastrationPath()) {
                if (!publicPollTimer) startPublicPoller();
                var host = document.getElementById('gp-cast-inject-host');
                if (!host && !publicRouteInFlight) schedulePublicInject(false);
            } else if (isCastrationAdminRoute()) {
                var adminBox = document.querySelector('#root .gp-cast-wrap');
                if (!adminBox || !adminBox.childElementCount) route(true);
            }
        }, 2000);
    }

    function stopMaintenanceTimer() {
        if (!maintenanceTimer) return;
        clearInterval(maintenanceTimer);
        maintenanceTimer = null;
    }

    function handleRouteChange() {
        if (isPublicCastrationPath()) {
            mountStyles();
            bindFormInteractionGuard();
            if (!isFormHostAlive()) {
                formRendered = false;
                lastInjectSignature = '';
            }
            schedulePublicInject(!isFormHostAlive());
            startMaintenanceTimer();
            ensureSamaAccess();
            return;
        }
        removePublicPatch();
        if (isCastrationAdminRoute()) {
            mountStyles();
            route();
            startMaintenanceTimer();
            if (isSamaStaff()) ensureSamaAdminBar();
            ensureSamaAccess();
            return;
        }
        stopMaintenanceTimer();
        ensureSamaAccess();
    }

    function onSpaRouteChange() {
        var path = window.SamaRoutes.legacyPath() || '';
        if (path === lastSpaPath) return;
        lastSpaPath = path;
        if (!isGarcaPetContext()) {
            removePublicPatch();
            stopMaintenanceTimer();
            return;
        }
        handleRouteChange();
    }

    function watchSpaNavigation() {
        if (window.__gpCastSpaHook) return;
        window.__gpCastSpaHook = true;
        lastSpaPath = window.SamaRoutes.legacyPath() || '';
        window.addEventListener('popstate', onSpaRouteChange);
        var origPush = history.pushState;
        var origReplace = history.replaceState;
        history.pushState = function () {
            origPush.apply(history, arguments);
            onSpaRouteChange();
        };
        history.replaceState = function () {
            origReplace.apply(history, arguments);
            onSpaRouteChange();
        };
    }

    function init() {
        watchSpaNavigation();
        startPathPoller();
        startSamaAccessWatcher();
        handleRouteChange();
        ensureSamaAccess();
        [500, 1500, 3000].forEach(function (ms) {
            setTimeout(function () {
                if (isGarcaPetContext()) {
                    handleRouteChange();
                    ensureSamaAccess();
                }
            }, ms);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }


    window.GarcaPetCastration = {
        version: PATCH_VERSION,
        route: route,
        handlePublicRoute: handlePublicRoute,
        normalizeAppPath: normalizeAppPath,
    };
})();
