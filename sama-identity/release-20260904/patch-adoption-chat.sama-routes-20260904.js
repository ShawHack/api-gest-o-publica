/**
 * Garça Pet — chat ao vivo na adoção (polling + presença online / última visualização)
 * Telas: /garcapet/pet/mypets (doador) e /garcapet/pet/myadoptions (pretendente)
 */
(function () {
    if (window.GarcaPetChat) return;

    var POLL_MS = 8000;
    var HEARTBEAT_MS = 20000;
    var sessions = {};

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
            if (rawOnly && String(rawOnly).trim().indexOf('eyJ') === 0) {
                return String(rawOnly).trim().replace(/^"+|"+$/g, '');
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
            xhr.onerror = function () {
                reject(new Error('Falha de rede.'));
            };
            xhr.send(body !== undefined && body !== null ? JSON.stringify(body) : null);
        });
    }

    function formatRelativeTime(dateVal) {
        if (!dateVal) return 'ainda não visualizou';
        var d = new Date(dateVal);
        if (isNaN(d.getTime())) return '—';
        var diff = Date.now() - d.getTime();
        if (diff < 60000) return 'agora há pouco';
        if (diff < 3600000) return 'há ' + Math.floor(diff / 60000) + ' min';
        if (diff < 86400000) return 'há ' + Math.floor(diff / 3600000) + ' h';
        return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    function presenceLabel(presence, otherName) {
        if (!presence || !presence.other) {
            return '<span style="color:#64748b">Carregando presença…</span>';
        }
        var o = presence.other;
        var name = escapeHtml(otherName || 'outra pessoa');
        if (o.online) {
            return '<span style="display:inline-flex;align-items:center;gap:6px;color:#15803d;font-weight:700">' +
                '<span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block"></span>' +
                name + ' está online</span>';
        }
        return '<span style="color:#64748b;font-size:12px">' + name + ' — visto por último ' +
            escapeHtml(formatRelativeTime(o.lastSeenAt)) + '</span>';
    }

    function renderMessages(container, messages, viewerRole) {
        var list = container.querySelector('.garcapet-chat-messages');
        if (!list) return;
        var atBottom =
            list.scrollHeight - list.scrollTop - list.clientHeight < 48;
        var html = '';
        var items = (messages || []).filter(function (m) {
            return m && m.message && m.role !== 'system';
        });
        if (!items.length) {
            html = '<p style="margin:0;padding:12px;color:#94a3b8;font-size:13px;text-align:center">Nenhuma mensagem ainda. Envie a primeira!</p>';
        } else {
            html = items.map(function (m) {
                var mine = (viewerRole === 'donor' && m.role === 'donor') ||
                    (viewerRole === 'adopter' && m.role === 'adopter');
                var align = mine ? 'flex-end' : 'flex-start';
                var bg = mine ? '#dbeafe' : '#f1f5f9';
                var who = m.role === 'donor' ? 'Responsável' : m.role === 'adopter' ? 'Pretendente' : 'Sistema';
                return '<div style="display:flex;justify-content:' + align + ';margin-bottom:8px">' +
                    '<div style="max-width:88%;padding:8px 10px;border-radius:10px;background:' + bg + '">' +
                    '<div style="font-size:10px;color:#64748b;margin-bottom:2px">' + escapeHtml(who) +
                    (m.createdAt ? ' · ' + escapeHtml(formatRelativeTime(m.createdAt)) : '') + '</div>' +
                    '<div style="font-size:13px;color:#0f172a;word-break:break-word">' + escapeHtml(m.message) + '</div>' +
                    '</div></div>';
            }).join('');
        }
        list.innerHTML = html;
        if (atBottom) {
            list.scrollTop = list.scrollHeight;
        }
    }

    function fetchChat(requestId) {
        return apiRequest('GET', '/api/adoption-requests/' + encodeURIComponent(requestId) + '/chat');
    }

    function sendMessage(requestId, text) {
        return apiRequest(
            'POST',
            '/api/adoption-requests/' + encodeURIComponent(requestId) + '/messages',
            { message: text }
        );
    }

    function heartbeat(requestId) {
        return apiRequest(
            'POST',
            '/api/adoption-requests/' + encodeURIComponent(requestId) + '/presence',
            { heartbeat: true, markSeen: true }
        );
    }

    function stopSession(requestId) {
        var s = sessions[requestId];
        if (!s) return;
        if (s.pollTimer) clearInterval(s.pollTimer);
        if (s.hbTimer) clearInterval(s.hbTimer);
        delete sessions[requestId];
    }

    function refreshSession(requestId) {
        var s = sessions[requestId];
        if (!s || !s.mountEl) return;
        fetchChat(requestId)
            .then(function (data) {
                s.otherName = data.otherPartyName || s.otherName;
                s.viewerRole = data.viewerRole || s.viewerRole;
                var presEl = s.mountEl.querySelector('.garcapet-chat-presence');
                if (presEl) {
                    presEl.innerHTML = presenceLabel(data.presence, s.otherName);
                }
                renderMessages(s.mountEl, data.messages, s.viewerRole);
            })
            .catch(function (err) {
                console.warn('[GarcaPetChat] poll', requestId, err.message);
            });
    }

    function mount(el, requestId, viewerRole) {
        if (!el || !requestId) return;
        stopSession(requestId);

        el.innerHTML =
            '<div class="garcapet-chat-box" style="margin-top:10px;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#fafafa">' +
            '<div class="garcapet-chat-presence" style="padding:8px 10px;background:#fff;border-bottom:1px solid #e2e8f0;font-size:12px"></div>' +
            '<div class="garcapet-chat-messages" style="height:200px;overflow-y:auto;padding:10px;background:#f8fafc"></div>' +
            '<div style="display:flex;gap:8px;padding:8px;background:#fff;border-top:1px solid #e2e8f0">' +
            '<textarea class="garcapet-chat-input" rows="2" placeholder="Digite sua mensagem…" style="flex:1;resize:vertical;min-height:44px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px"></textarea>' +
            '<button type="button" class="garcapet-chat-send" style="align-self:flex-end;padding:10px 14px;border:none;border-radius:8px;background:#384D9C;color:#fff;font-weight:700;cursor:pointer">Enviar</button>' +
            '</div></div>';

        var sendBtn = el.querySelector('.garcapet-chat-send');
        var input = el.querySelector('.garcapet-chat-input');

        sessions[requestId] = {
            mountEl: el,
            viewerRole: viewerRole,
            otherName: '',
            pollTimer: null,
            hbTimer: null,
        };

        sendBtn.addEventListener('click', function () {
            var text = (input.value || '').trim();
            if (!text) return;
            sendBtn.disabled = true;
            sendBtn.textContent = '…';
            sendMessage(requestId, text)
                .then(function (data) {
                    input.value = '';
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Enviar';
                    if (window.showQueueToast) {
                        window.showQueueToast(data.message || 'Mensagem enviada!', 'success');
                    }
                    refreshSession(requestId);
                })
                .catch(function (err) {
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Enviar';
                    alert(err.message || 'Erro ao enviar');
                });
        });

        input.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                sendBtn.click();
            }
        });

        refreshSession(requestId);
        sessions[requestId].pollTimer = setInterval(function () {
            refreshSession(requestId);
        }, POLL_MS);
        sessions[requestId].hbTimer = setInterval(function () {
            heartbeat(requestId).catch(function () { });
        }, HEARTBEAT_MS);

        heartbeat(requestId).catch(function () { });
    }

    function absorbMyAdoptions(data) {
        if (!data) return;
        window.__garcapetMyAdoptionsCache = data;
        window.__garcapetMyAdoptionsByName = {};
        window.__garcapetMyAdoptionsByPetId = {};

        var pets = data.pets || [];
        pets.forEach(function (p) {
            if (!p) return;
            var reqId = p.adoptionRequestId;
            if (!reqId && Array.isArray(data.adoptions)) {
                for (var k = 0; k < data.adoptions.length; k += 1) {
                    var item = data.adoptions[k];
                    if (!item || !item.pet || !item.adoptionRequest) continue;
                    var petId = String(item.pet._id || '');
                    if (petId && String(p._id || '') === petId) {
                        reqId = item.adoptionRequest._id;
                        break;
                    }
                }
            }
            if (reqId) p.adoptionRequestId = String(reqId);
            if (p._id) window.__garcapetMyAdoptionsByPetId[String(p._id)] = p;
            if (p.name) {
                window.__garcapetMyAdoptionsByName[p.name.trim().toLowerCase()] = p;
            }
        });
    }

    var myAdoptionsLoadPromise = null;

    function loadMyAdoptionsData() {
        var cached = window.__garcapetMyAdoptionsCache;
        if (cached && Array.isArray(cached.pets) && cached.pets.length) {
            return Promise.resolve(cached);
        }
        if (myAdoptionsLoadPromise) return myAdoptionsLoadPromise;
        myAdoptionsLoadPromise = apiRequest('GET', '/api/pets/myadoptions')
            .then(function (data) {
                absorbMyAdoptions(data);
                return data;
            })
            .catch(function (err) {
                console.warn('[GarcaPetChat] myadoptions', err.message);
                return null;
            })
            .finally(function () {
                myAdoptionsLoadPromise = null;
            });
        return myAdoptionsLoadPromise;
    }

    function resolveRequestIdForRow(petName) {
        var key = (petName || '').trim().toLowerCase();
        if (key && window.__garcapetMyAdoptionsByName && window.__garcapetMyAdoptionsByName[key]) {
            var byName = window.__garcapetMyAdoptionsByName[key];
            if (byName.adoptionRequestId) return String(byName.adoptionRequestId);
        }
        var list = (window.__garcapetMyAdoptionsCache && window.__garcapetMyAdoptionsCache.pets) || [];
        for (var j = 0; j < list.length; j += 1) {
            var p = list[j];
            if (!p || !p.adoptionRequestId) continue;
            if (!key || (p.name && p.name.trim().toLowerCase() === key)) {
                return String(p.adoptionRequestId);
            }
        }
        if (list.length === 1 && list[0].adoptionRequestId) {
            return String(list[0].adoptionRequestId);
        }
        return null;
    }

    function mountChatOnRow(row, requestId) {
        if (!row || !requestId || row.querySelector('.garcapet-chat-mounted')) return;

        var mountEl = document.createElement('div');
        mountEl.className = 'garcapet-chat-mounted';
        mountEl.style.cssText = 'grid-column:1 / -1;width:100%;margin-top:14px';

        var title = document.createElement('p');
        title.style.cssText = 'margin:0 0 8px;font-size:13px;font-weight:700;color:#384D9C';
        title.textContent = 'Conversar com o doador';
        mountEl.appendChild(title);

        var chatHost = document.createElement('div');
        mountEl.appendChild(chatHost);

        var donorBlock = row.querySelector('[class*="donor_info"]');
        if (donorBlock && donorBlock.parentNode === row) {
            donorBlock.parentNode.insertBefore(mountEl, donorBlock.nextSibling);
        } else {
            row.appendChild(mountEl);
        }

        mount(chatHost, requestId, 'adopter');
    }

    function buildApprovedAdopterBanner(pet) {
        if (!pet) return null;
        var donor = pet.user || {};
        var donorName = donor.name || pet.donorName || 'O doador';
        var donorPhone = donor.phone || pet.donorPhone || '';
        var donorEmail = donor.email || pet.donorEmail || '';

        var wrap = document.createElement('div');
        wrap.className = 'garcapet-adopter-approved-banner';
        wrap.style.cssText =
            'grid-column:1/-1;width:100%;margin:0 0 14px;padding:14px;border:2px solid #6ee7b7;border-radius:12px;background:#ecfdf5';

        wrap.innerHTML =
            '<div style="font-weight:800;font-size:14px;color:#065f46;margin-bottom:8px">✓ Adoção aprovada</div>' +
            '<div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:6px">Parabéns! Seu pedido foi aceito.</div>' +
            '<p style="margin:0 0 10px;font-size:13px;color:#334155;line-height:1.45">' +
            escapeHtml(String(donorName)) + ' aprovou sua solicitação para adotar ' +
            escapeHtml(String(pet.name || 'este pet')) +
            '. Agora vocês podem combinar a entrega do animal.</p>' +
            (donorPhone
                ? '<div style="font-size:13px;margin-bottom:4px"><strong>Telefone:</strong> ' +
                  escapeHtml(String(donorPhone)) + '</div>'
                : '') +
            (donorEmail
                ? '<div style="font-size:13px;margin-bottom:4px"><strong>E-mail:</strong> ' +
                  escapeHtml(String(donorEmail)) + '</div>'
                : '') +
            '<p style="margin:10px 0 0;font-size:12px;color:#64748b">Use o chat abaixo para combinar a entrega com o doador.</p>';

        return wrap;
    }

    function mountApprovedBannerOnRow(row, pet) {
        if (!row || !pet) return;
        var isApproved =
            pet.hasApprovedAdoption ||
            pet.adopterStatus === 'Aprovado' ||
            pet.adoptionRequestStatus === 'aprovada';
        if (!isApproved) return;
        if (row.querySelector('.garcapet-adopter-approved-banner')) return;
        var banner = buildApprovedAdopterBanner(pet);
        if (!banner) return;
        row.insertBefore(banner, row.firstChild);
    }

    function scanMyAdoptionsDom() {
        var path = (window.SamaRoutes.legacyPath() || '').toLowerCase();
        if (path.indexOf('/garcapet/pet/myadoptions') === -1) return;

        var rows = document.querySelectorAll('[class*="petlist_row"]');
        if (!rows.length) return;

        for (var i = 0; i < rows.length; i += 1) {
            var row = rows[i];
            var nameEl = row.querySelector('[class*="pet_name"]');
            var petName = nameEl ? (nameEl.textContent || '').trim() : '';
            var petCached = null;
            if (petName && window.__garcapetMyAdoptionsByName) {
                petCached = window.__garcapetMyAdoptionsByName[petName.toLowerCase()];
            }
            if (petCached) mountApprovedBannerOnRow(row, petCached);

            if (row.querySelector('.garcapet-chat-mounted')) continue;

            var requestId = resolveRequestIdForRow(petName);
            if (!requestId) continue;

            mountChatOnRow(row, requestId);
        }
    }

    function scanMyAdoptions() {
        loadMyAdoptionsData().then(function () {
            scanMyAdoptionsDom();
        });
    }

    window.GarcaPetChat = { mount: mount, stop: stopSession, refresh: refreshSession };

    window.addEventListener('beforeunload', function () {
        Object.keys(sessions).forEach(stopSession);
    });

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            Object.keys(sessions).forEach(refreshSession);
        }
    });

    function installAxiosMyAdoptionsHook() {
        var ax = window.axios;
        if (!ax || ax.__garcapetChatCachePatched) return !!ax;
        ax.__garcapetChatCachePatched = true;
        ax.interceptors.response.use(function (res) {
            try {
                var url = String((res.config && res.config.url) || '');
                var base = String((res.config && res.config.baseURL) || '');
                if ((url + base).indexOf('myadoptions') >= 0) {
                    absorbMyAdoptions(res.data);
                    setTimeout(scanMyAdoptionsDom, 200);
                }
            } catch (_) { }
            return res;
        });
        return true;
    }

    var axiosHookAttempts = 0;
    (function waitAxiosHook() {
        if (installAxiosMyAdoptionsHook()) return;
        axiosHookAttempts += 1;
        if (axiosHookAttempts < 80) {
            setTimeout(waitAxiosHook, 250);
        }
    })();

    function isMyAdoptionsRoute() {
        return (window.SamaRoutes.legacyPath() || '').toLowerCase().indexOf('/garcapet/pet/myadoptions') >= 0;
    }

    function bootstrapMyAdoptionsPage() {
        if (!isMyAdoptionsRoute()) return;
        installAxiosMyAdoptionsHook();
        scanMyAdoptions();
        [200, 600, 1200, 2500].forEach(function (ms) {
            setTimeout(scanMyAdoptions, ms);
        });
    }

    if (typeof window.__garcapetOnRouteChange === 'function') {
        window.__garcapetOnRouteChange(function () {
            bootstrapMyAdoptionsPage();
        });
    }

    var root = document.getElementById('root');
    if (root) {
        new MutationObserver(function () {
            if (isMyAdoptionsRoute()) scanMyAdoptions();
        }).observe(root, { childList: true, subtree: true });
    }

    bootstrapMyAdoptionsPage();
})();
