/**
 * Garça Pet — cadastro com verificação de e-mail, login, forgot/reset e verify-email.
 * Carregado apenas em sama/index.html (não afeta Memorial na raiz).
 */
(function garcapetAuthPatch() {
    if (window.__GARCAPET_AUTH_PATCH__) return;
    window.__GARCAPET_AUTH_PATCH__ = true;

    var API = '/api';
    var PRIMARY = '#384D9C';
    var RECOVER_PRIMARY = '#446042';
    var GREEN = '#446042';
    var RED = '#b91c1c';
    var AMBER = '#b45309';

    function pathname() {
        return (window.SamaRoutes.legacyPath() || '').toLowerCase();
    }

    function isGarcaPetPath() {
        return pathname().indexOf('/garcapet') === 0;
    }

    function isRegisterPostUrl(urlHref) {
        return !!(urlHref && String(urlHref).indexOf('/users/register') !== -1);
    }

    function mergeGarcaPetClientInBody(body) {
        if (typeof body !== 'string' || body.charAt(0) !== '{') return body;
        try {
            var j = JSON.parse(body);
            j.client = 'garcapet';
            return JSON.stringify(j);
        } catch (_) {
            return body;
        }
    }

    function clearSessionAndRedirectAfterRegister() {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('auth');
            localStorage.setItem('emailValidationPending', 'true');
        } catch (_) {}
        try {
            if (window.axios && window.axios.defaults && window.axios.defaults.headers) {
                delete window.axios.defaults.headers.common.Authorization;
                delete window.axios.defaults.headers.Authorization;
            }
        } catch (_) {}
        window.location.replace('/garcapet/login?registered=1');
    }

    function shouldHandleRegisterRedirect() {
        return pathname().indexOf('/garcapet/register') >= 0;
    }

    // --- Interceptar cadastro: não deixar o bundle SAMA simular login sem token ---
    (function patchRegisterFlow() {
        var XHR = window.XMLHttpRequest;
        if (XHR && !XHR.prototype.__garcaAuthRegisterPatched) {
            XHR.prototype.__garcaAuthRegisterPatched = true;
            var origSend = XHR.prototype.send;
            XHR.prototype.send = function (body) {
                var xhr = this;
                try {
                    var method = xhr.__grcpMethod || '';
                    var url = xhr.__grcpUrl || '';
                    if (method === 'POST' && isRegisterPostUrl(url) && isGarcaPetPath()) {
                        if (typeof body === 'string' && body.charAt(0) === '{') {
                            body = mergeGarcaPetClientInBody(body);
                        }
                        if (shouldHandleRegisterRedirect()) {
                            xhr.addEventListener('load', function () {
                                if (xhr.__garcaRegisterHandled) return;
                                if (xhr.status >= 200 && xhr.status < 300) {
                                    xhr.__garcaRegisterHandled = true;
                                    clearSessionAndRedirectAfterRegister();
                                }
                            });
                        }
                    }
                } catch (_) {}
                return origSend.call(this, body);
            };
        }

        if (typeof window.fetch === 'function' && !window.__GARCAPET_AUTH_FETCH_PATCHED__) {
            window.__GARCAPET_AUTH_FETCH_PATCHED__ = true;
            var chainFetch = window.fetch.bind(window);
            window.fetch = function (input, init) {
                var urlHref = '';
                var method = 'GET';
                try {
                    if (typeof input === 'string') {
                        urlHref = new URL(input, window.location.origin).href;
                        method = (init && init.method) ? String(init.method).toUpperCase() : 'GET';
                        if (
                            method === 'POST' &&
                            isRegisterPostUrl(urlHref) &&
                            isGarcaPetPath() &&
                            init &&
                            typeof init.body === 'string' &&
                            init.body.charAt(0) === '{'
                        ) {
                            init = Object.assign({}, init);
                            init.body = mergeGarcaPetClientInBody(init.body);
                        }
                    }
                } catch (_) {}

                var promise = chainFetch(input, init);
                if (
                    shouldHandleRegisterRedirect() &&
                    method === 'POST' &&
                    isRegisterPostUrl(urlHref)
                ) {
                    promise = promise.then(function (res) {
                        if (res.ok) clearSessionAndRedirectAfterRegister();
                        return res;
                    });
                }
                return promise;
            };
        }

        function patchAxiosRegister() {
            var ax = window.axios;
            if (!ax || ax.__garcaAuthRegisterAxios) return;
            ax.__garcaAuthRegisterAxios = true;

            ax.interceptors.request.use(function (config) {
                try {
                    var url = String((config && config.url) || '');
                    var method = String((config && config.method) || 'get').toLowerCase();
                    if (method === 'post' && url.indexOf('/users/register') >= 0 && isGarcaPetPath()) {
                        config.data = config.data || {};
                        if (typeof config.data === 'object') {
                            config.data.client = 'garcapet';
                        }
                    }
                } catch (_) {}
                return config;
            });

            ax.interceptors.response.use(
                function (response) {
                    try {
                        var cfg = response && response.config;
                        var url = String((cfg && cfg.url) || '');
                        var method = String((cfg && cfg.method) || '').toLowerCase();
                        if (
                            shouldHandleRegisterRedirect() &&
                            method === 'post' &&
                            url.indexOf('/users/register') >= 0 &&
                            response.status >= 200 &&
                            response.status < 300
                        ) {
                            clearSessionAndRedirectAfterRegister();
                            return new Promise(function () {});
                        }
                    } catch (_) {}
                    return response;
                },
                function (err) {
                    return Promise.reject(err);
                }
            );
        }

        patchAxiosRegister();
        (function waitAxios() {
            if (window.axios) {
                patchAxiosRegister();
                return;
            }
            var n = waitAxios.attempts || 0;
            waitAxios.attempts = n + 1;
            if (n < 80) setTimeout(waitAxios, 250);
        })();
    })();

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
        } catch (_) {}
        return '';
    }

    function hasGarcaPetSession() {
        var token = getAuthToken();
        return !!(token && token.indexOf('eyJ') === 0);
    }

    function isLoginPostUrl(urlHref) {
        return !!(urlHref && String(urlHref).indexOf('/users/login') !== -1);
    }

    function responseLooksLikeLoginSuccess(payload) {
        if (!payload || typeof payload !== 'object') return false;
        if (payload.token) return true;
        if (payload.data && payload.data.token) return true;
        return false;
    }

    function removeLoginValidationBanner() {
        var el = document.getElementById('garcapet-login-validation-banner');
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function clearEmailValidationPendingState() {
        try {
            localStorage.removeItem('emailValidationPending');
        } catch (_) {}
        try {
            if ((window.location.search || '').indexOf('registered=') >= 0) {
                var url = new URL(window.location.href);
                url.searchParams.delete('registered');
                history.replaceState(
                    history.state,
                    '',
                    url.pathname + (url.search || '') + (url.hash || '')
                );
            }
        } catch (_) {}
    }

    function onGarcaPetLoginSuccess() {
        clearEmailValidationPendingState();
        removeLoginValidationBanner();
    }

    // Bundle SAMA não limpa emailValidationPending após login (Memorial faz).
    (function patchLoginFlow() {
        var XHR = window.XMLHttpRequest;
        if (XHR && !XHR.prototype.__garcaAuthLoginPatched) {
            XHR.prototype.__garcaAuthLoginPatched = true;
            var origSend = XHR.prototype.send;
            XHR.prototype.send = function (body) {
                var xhr = this;
                try {
                    var method = xhr.__grcpMethod || '';
                    var url = xhr.__grcpUrl || '';
                    if (method === 'POST' && isLoginPostUrl(url) && isGarcaPetPath()) {
                        xhr.addEventListener('load', function () {
                            try {
                                var data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                                if (responseLooksLikeLoginSuccess(data)) onGarcaPetLoginSuccess();
                            } catch (_) {}
                        });
                    }
                } catch (_) {}
                return origSend.call(this, body);
            };
        }

        if (typeof window.fetch === 'function' && !window.__GARCAPET_AUTH_LOGIN_FETCH__) {
            window.__GARCAPET_AUTH_LOGIN_FETCH__ = true;
            var chainFetch = window.fetch.bind(window);
            window.fetch = function (input, init) {
                var urlHref = '';
                var method = 'GET';
                try {
                    if (typeof input === 'string') {
                        urlHref = new URL(input, window.location.origin).href;
                        method = (init && init.method) ? String(init.method).toUpperCase() : 'GET';
                    }
                } catch (_) {}
                return chainFetch(input, init).then(function (res) {
                    if (
                        isGarcaPetPath() &&
                        method === 'POST' &&
                        isLoginPostUrl(urlHref) &&
                        res.ok
                    ) {
                        return res
                            .clone()
                            .json()
                            .catch(function () {
                                return {};
                            })
                            .then(function (data) {
                                if (responseLooksLikeLoginSuccess(data)) onGarcaPetLoginSuccess();
                                return res;
                            });
                    }
                    return res;
                });
            };
        }

        function patchAxiosLogin() {
            var ax = window.axios;
            if (!ax || ax.__garcaAuthLoginAxios) return;
            ax.__garcaAuthLoginAxios = true;
            ax.interceptors.response.use(function (response) {
                try {
                    var cfg = response && response.config;
                    var url = String((cfg && cfg.url) || '');
                    var method = String((cfg && cfg.method) || '').toLowerCase();
                    if (
                        isGarcaPetPath() &&
                        method === 'post' &&
                        url.indexOf('/users/login') >= 0 &&
                        response.status >= 200 &&
                        response.status < 300 &&
                        responseLooksLikeLoginSuccess(response.data || {})
                    ) {
                        onGarcaPetLoginSuccess();
                    }
                } catch (_) {}
                return response;
            });
        }

        patchAxiosLogin();
        (function waitAxiosLogin() {
            if (window.axios) {
                patchAxiosLogin();
                return;
            }
            var n = waitAxiosLogin.attempts || 0;
            waitAxiosLogin.attempts = n + 1;
            if (n < 80) setTimeout(waitAxiosLogin, 250);
        })();
    })();

    // --- API helper (sem token) ---
    function apiJson(method, path, body) {
        var opts = {
            method: method,
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        };
        if (body !== undefined && body !== null) opts.body = JSON.stringify(body);
        return fetch(API + path, opts).then(function (res) {
            return res
                .json()
                .catch(function () {
                    return {};
                })
                .then(function (data) {
                    return { ok: res.ok, status: res.status, data: data };
                });
        });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderAuthShell(title, innerHtml, accentColor) {
        var accent = accentColor || PRIMARY;
        var root = document.getElementById('root');
        if (!root) return;
        root.innerHTML =
            '<div style="font-family:Rubik,sans-serif;min-height:100vh;background:#f1f5f9;padding:24px 16px;display:flex;justify-content:center;align-items:flex-start">' +
            '<div style="max-width:440px;width:100%;background:#fff;border-radius:12px;padding:28px 24px;box-shadow:0 4px 24px rgba(0,0,0,.08);border-left:4px solid ' +
            accent +
            '">' +
            '<p style="margin:0 0 8px;font-size:13px;color:#64748b"><a href="/garcapet/" style="color:' +
            accent +
            ';text-decoration:none;font-weight:600">&larr; Garça Pet</a></p>' +
            '<h1 style="margin:0 0 20px;font-size:1.5rem;color:' +
            accent +
            '">' +
            escapeHtml(title) +
            '</h1>' +
            innerHtml +
            '</div></div>';
    }

    function getAuthSubRoute() {
        var path = pathname();
        if (path.indexOf('/garcapet/auth/verify-email') >= 0) return 'verify-email';
        if (path.indexOf('/garcapet/auth/forgot-password') >= 0) return 'forgot-password';
        if (path.indexOf('/garcapet/auth/reset-password') >= 0) return 'reset-password';
        return null;
    }

    function renderVerifyEmailPage() {
        var params = new URLSearchParams(window.location.search || '');
        var token = params.get('token') || '';
        var email = params.get('email') || '';

        renderAuthShell(
            'Verificação de e-mail',
            '<p id="garcapet-verify-msg" style="color:#475569;line-height:1.5">Validando seu e-mail...</p>'
        );

        var msgEl = document.getElementById('garcapet-verify-msg');
        if (!token || !email) {
            if (msgEl) {
                msgEl.textContent = 'Link inválido ou incompleto.';
                msgEl.style.color = RED;
            }
            return;
        }

        var qs =
            '?token=' + encodeURIComponent(token) + '&email=' + encodeURIComponent(email);
        apiJson('GET', '/users/verify-email' + qs)
            .then(function (res) {
                if (!msgEl) return;
                var text =
                    (res.data && (res.data.message || res.data.msg)) ||
                    (res.ok
                        ? 'E-mail verificado com sucesso! Você já pode fazer login.'
                        : 'Não foi possível verificar o e-mail.');
                msgEl.textContent = text;
                msgEl.style.color = res.ok ? GREEN : RED;
                if (res.ok) {
                    try {
                        localStorage.removeItem('emailValidationPending');
                    } catch (_) {}
                    msgEl.innerHTML =
                        escapeHtml(text) +
                        '<p style="margin-top:16px"><a href="/garcapet/login" style="color:' +
                        PRIMARY +
                        ';font-weight:600">Ir para o login</a></p>';
                }
            })
            .catch(function () {
                if (msgEl) {
                    msgEl.textContent = 'Falha na comunicação com o servidor. Tente novamente.';
                    msgEl.style.color = RED;
                }
            });
    }

    function renderForgotPasswordPage() {
        renderAuthShell(
            'Recuperar senha',
            '<p style="margin:0 0 16px;color:#475569;line-height:1.5">Informe seu e-mail. Se existir cadastro, enviaremos um link para redefinir a senha.</p>' +
                '<form id="garcapet-forgot-form">' +
                '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#334155">E-mail</label>' +
                '<input type="email" name="email" required autocomplete="email" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:14px;font-size:15px" />' +
                '<button type="submit" style="width:100%;padding:11px;border:none;border-radius:8px;background:' +
                RECOVER_PRIMARY +
                ';color:#fff;font-weight:700;font-size:15px;cursor:pointer">Enviar</button>' +
                '</form>' +
                '<p id="garcapet-forgot-msg" style="margin-top:14px;font-size:14px"></p>' +
                '<p style="margin-top:18px;font-size:14px"><a href="/garcapet/login" style="color:' +
                RECOVER_PRIMARY +
                ';font-weight:600">Voltar ao login</a></p>',
            RECOVER_PRIMARY
        );

        var form = document.getElementById('garcapet-forgot-form');
        var msgEl = document.getElementById('garcapet-forgot-msg');
        if (!form) return;

        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            var emailInput = form.querySelector('[name="email"]');
            var email = emailInput ? String(emailInput.value || '').trim() : '';
            if (!email) return;
            if (msgEl) {
                msgEl.textContent = 'Enviando...';
                msgEl.style.color = '#475569';
            }
            apiJson('POST', '/users/forgot-password', { email: email, client: 'garcapet' })
                .then(function () {
                    if (msgEl) {
                        msgEl.textContent =
                            'Se o e-mail existir, você receberá as instruções em alguns minutos (verifique também o spam).';
                        msgEl.style.color = GREEN;
                    }
                })
                .catch(function () {
                    if (msgEl) {
                        msgEl.textContent =
                            'Se o e-mail existir, você receberá as instruções em alguns minutos (verifique também o spam).';
                        msgEl.style.color = GREEN;
                    }
                });
        });
    }

    function renderResetPasswordPage() {
        var params = new URLSearchParams(window.location.search || '');
        var token = params.get('token') || '';
        var email = params.get('email') || '';

        renderAuthShell(
            'Redefinir senha',
            (!token || !email
                ? '<p style="color:' +
                  RED +
                  '">Link inválido. Solicite uma nova recuperação de senha.</p>' +
                  '<p style="margin-top:14px"><a href="/garcapet/auth/forgot-password" style="color:' +
                  RECOVER_PRIMARY +
                  ';font-weight:600">Recuperar senha</a></p>'
                : '<form id="garcapet-reset-form">' +
                  '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#334155">Nova senha</label>' +
                  '<input type="password" name="password" required minlength="6" autocomplete="new-password" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:12px;font-size:15px" />' +
                  '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#334155">Confirmar senha</label>' +
                  '<input type="password" name="confirmpassword" required minlength="6" autocomplete="new-password" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:14px;font-size:15px" />' +
                  '<button type="submit" style="width:100%;padding:11px;border:none;border-radius:8px;background:' +
                  RECOVER_PRIMARY +
                  ';color:#fff;font-weight:700;font-size:15px;cursor:pointer">Salvar nova senha</button>' +
                  '</form>' +
                  '<p id="garcapet-reset-msg" style="margin-top:14px;font-size:14px"></p>'),
            RECOVER_PRIMARY
        );

        if (!token || !email) return;

        var form = document.getElementById('garcapet-reset-form');
        var msgEl = document.getElementById('garcapet-reset-msg');
        if (!form) return;

        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            var pwd = String(form.querySelector('[name="password"]').value || '');
            var conf = String(form.querySelector('[name="confirmpassword"]').value || '');
            if (pwd !== conf) {
                if (msgEl) {
                    msgEl.textContent = 'As senhas não conferem.';
                    msgEl.style.color = RED;
                }
                return;
            }
            if (msgEl) {
                msgEl.textContent = 'Salvando...';
                msgEl.style.color = '#475569';
            }
            apiJson('POST', '/users/reset-password', {
                email: email,
                token: token,
                password: pwd,
                confirmpassword: conf,
            })
                .then(function (res) {
                    if (!msgEl) return;
                    var text =
                        (res.data && res.data.message) ||
                        (res.ok
                            ? 'Senha alterada com sucesso!'
                            : 'Não foi possível alterar a senha.');
                    msgEl.textContent = text;
                    msgEl.style.color = res.ok ? GREEN : RED;
                    if (res.ok) {
                        form.style.display = 'none';
                        msgEl.innerHTML =
                            escapeHtml(text) +
                            ' <a href="/garcapet/login" style="color:' +
                            RECOVER_PRIMARY +
                            ';font-weight:600">Fazer login</a>';
                    }
                })
                .catch(function () {
                    if (msgEl) {
                        msgEl.textContent = 'Erro ao comunicar com o servidor.';
                        msgEl.style.color = RED;
                    }
                });
        });
    }

    function bootstrapAuthPage() {
        var route = getAuthSubRoute();
        if (!route) return;
        if (route === 'verify-email') renderVerifyEmailPage();
        else if (route === 'forgot-password') renderForgotPasswordPage();
        else if (route === 'reset-password') renderResetPasswordPage();
    }

    // --- Login: banner de validação + esqueci senha + reenviar e-mail ---
    function isLoginRoute() {
        return pathname().indexOf('/garcapet/login') >= 0;
    }

    function findLoginFormSection(root) {
        if (!root) return null;
        var sections = root.querySelectorAll('section[class*="form_container"]');
        for (var i = 0; i < sections.length; i += 1) {
            var sec = sections[i];
            var heading = sec.querySelector('h1, h2');
            if (heading && /login/i.test(heading.textContent || '')) return sec;
            var submit = sec.querySelector('input[type="submit"], button[type="submit"]');
            if (submit && /entrar/i.test(String(submit.value || submit.textContent || ''))) return sec;
            if (
                sec.querySelector('form input[name="email"], form input[type="email"]') &&
                sec.querySelector('form input[name="password"], form input[type="password"]')
            ) {
                return sec;
            }
        }
        return null;
    }

    function buildLoginValidationBanner() {
        var pending = false;
        try {
            pending = localStorage.getItem('emailValidationPending') === 'true';
        } catch (_) {}
        var registered =
            (window.location.search || '').indexOf('registered=1') >= 0;
        if (hasGarcaPetSession()) return null;
        if (!pending && !registered) return null;

        var wrap = document.createElement('div');
        wrap.id = 'garcapet-login-validation-banner';
        wrap.setAttribute('data-garca-auth', '1');
        wrap.style.cssText =
            'box-sizing:border-box;width:100%;max-width:100%;margin:0 auto 16px;padding:14px 16px;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;color:#78350f;font-size:14px;line-height:1.45;text-align:left';
        wrap.innerHTML =
            '<strong style="display:block;margin-bottom:6px;color:' +
            AMBER +
            '">Validação de e-mail necessária</strong>' +
            '<p style="margin:0 0 10px">Confira sua caixa de entrada (e spam) e clique no link que enviamos para ativar a conta antes de entrar.</p>' +
            '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
            '<button type="button" id="garcapet-btn-resend-verify" style="padding:7px 12px;border-radius:8px;border:1px solid ' +
            RECOVER_PRIMARY +
            ';background:#fff;color:' +
            RECOVER_PRIMARY +
            ';font-weight:600;cursor:pointer;font-size:13px">Reenviar e-mail</button>' +
            '<button type="button" id="garcapet-btn-dismiss-verify" style="padding:7px 12px;border-radius:8px;border:none;background:#e2e8f0;color:#334155;font-weight:600;cursor:pointer;font-size:13px">Já validei</button>' +
            '</div>' +
            '<p id="garcapet-resend-status" style="margin:10px 0 0;font-size:13px"></p>';

        setTimeout(function () {
            var btnResend = document.getElementById('garcapet-btn-resend-verify');
            var btnDismiss = document.getElementById('garcapet-btn-dismiss-verify');
            var statusEl = document.getElementById('garcapet-resend-status');

            if (btnDismiss) {
                btnDismiss.addEventListener('click', function () {
                    clearEmailValidationPendingState();
                    wrap.remove();
                });
            }

            if (btnResend) {
                btnResend.addEventListener('click', function () {
                    var emailInput =
                        document.querySelector('#root form input[name="email"]') ||
                        document.querySelector('#root form input[type="email"]');
                    var email = emailInput ? String(emailInput.value || '').trim() : '';
                    if (!email) {
                        if (statusEl) {
                            statusEl.textContent = 'Digite seu e-mail no formulário abaixo.';
                            statusEl.style.color = RED;
                        }
                        return;
                    }
                    if (statusEl) {
                        statusEl.textContent = 'Enviando...';
                        statusEl.style.color = '#475569';
                    }
                    apiJson('POST', '/users/resend-verification', {
                        email: email,
                        client: 'garcapet',
                    })
                        .then(function (res) {
                            if (!statusEl) return;
                            statusEl.textContent =
                                (res.data && res.data.message) ||
                                'Se o e-mail existir, reenviamos o link de verificação.';
                            statusEl.style.color = res.ok ? GREEN : RED;
                        })
                        .catch(function () {
                            if (statusEl) {
                                statusEl.textContent = 'Não foi possível reenviar agora. Tente mais tarde.';
                                statusEl.style.color = RED;
                            }
                        });
                });
            }
        }, 0);

        return wrap;
    }

    function buildForgotPasswordLink(elementId) {
        var p = document.createElement('p');
        p.id = elementId || 'garcapet-login-forgot-link';
        p.setAttribute('data-garca-auth', '1');
        p.style.cssText =
            'margin:14px 0 0;font-size:15px;text-align:center;line-height:1.5';
        p.innerHTML =
            '<a href="/garcapet/auth/forgot-password" style="color:' +
            RECOVER_PRIMARY +
            ';font-weight:700;text-decoration:underline">Recuperar senha</a>';
        return p;
    }

    function findRecoverPasswordAnchor(root) {
        if (!root) return null;

        var section = findLoginFormSection(root);
        if (!section) {
            section =
                root.querySelector('section[class*="form_container"]') ||
                root.querySelector('form') ||
                root;
        }

        var paras = section.querySelectorAll ? section.querySelectorAll('p') : [];
        for (var i = 0; i < paras.length; i += 1) {
            var txt = (paras[i].textContent || '').toLowerCase();
            if (txt.indexOf('conta') >= 0) return paras[i];
        }

        var submit = section.querySelector
            ? section.querySelector('input[type="submit"], button[type="submit"]')
            : null;
        if (submit) return submit;

        return section;
    }

    function injectRecoverPasswordLink(elementId) {
        if (
            document.getElementById(elementId) ||
            document.getElementById('garcapet-login-forgot-link') ||
            document.getElementById('garcapet-register-forgot-link')
        ) {
            return true;
        }
        var root = document.getElementById('root');
        if (!root) return false;
        var anchor = findRecoverPasswordAnchor(root);
        if (!anchor) return false;
        var forgot = buildForgotPasswordLink(elementId);
        if (anchor.parentNode) {
            if (anchor.tagName === 'P') {
                anchor.parentNode.insertBefore(forgot, anchor);
            } else {
                anchor.parentNode.insertBefore(forgot, anchor.nextSibling);
            }
        } else {
            root.appendChild(forgot);
        }
        return true;
    }

    function injectLoginValidationBanner() {
        if (!isLoginRoute()) return;
        if (document.getElementById('garcapet-login-validation-banner')) return;

        var banner = buildLoginValidationBanner();
        if (!banner) return;

        var root = document.getElementById('root');
        if (!root) return;

        var loginSection = findLoginFormSection(root);
        if (!loginSection || !loginSection.parentNode) return;

        loginSection.parentNode.insertBefore(banner, loginSection);
    }

    function syncValidationBannerOnRoute() {
        if (!isLoginRoute()) {
            removeLoginValidationBanner();
            return;
        }
        if (hasGarcaPetSession()) {
            clearEmailValidationPendingState();
            removeLoginValidationBanner();
            return;
        }
        injectLoginValidationBanner();
    }

    function injectLoginExtras() {
        if (!isLoginRoute()) return;
        var root = document.getElementById('root');
        if (!root) return;

        injectRecoverPasswordLink('garcapet-login-forgot-link');
        syncValidationBannerOnRoute();
    }

    function isRegisterRoute() {
        return pathname().indexOf('/garcapet/register') >= 0;
    }

    function injectRegisterExtras() {
        if (!isRegisterRoute()) return;
        injectRecoverPasswordLink('garcapet-register-forgot-link');
    }

    function bootstrapLoginPage() {
        if (!isLoginRoute()) return;
        injectLoginExtras();
    }

    function bootstrapRegisterPage() {
        if (!isRegisterRoute()) return;
        injectRegisterExtras();
    }

    function scheduleAuthUiEnhance() {
        if (getAuthSubRoute()) return;
        var run = function () {
            bootstrapLoginPage();
            bootstrapRegisterPage();
        };
        run();
        [100, 400, 900, 1800, 3200].forEach(function (ms) {
            setTimeout(run, ms);
        });
    }

    function authPageMarkerPresent() {
        return !!(
            document.getElementById('garcapet-verify-msg') ||
            document.getElementById('garcapet-forgot-form') ||
            document.getElementById('garcapet-reset-form')
        );
    }

    function guardAuthPageMount() {
        if (!getAuthSubRoute()) return;
        function ensure() {
            if (!getAuthSubRoute()) return;
            if (!authPageMarkerPresent()) bootstrapAuthPage();
        }
        ensure();
        [50, 200, 600, 1200, 2500].forEach(function (ms) {
            setTimeout(ensure, ms);
        });
        if (typeof window.__garcapetOnRouteChange === 'function') {
            window.__garcapetOnRouteChange(ensure);
        }
        var root = document.getElementById('root');
        if (root) {
            new MutationObserver(function () {
                if (getAuthSubRoute() && !authPageMarkerPresent()) {
                    bootstrapAuthPage();
                }
            }).observe(root, { childList: true, subtree: true });
        }
    }

    function bootstrapAll() {
        if (getAuthSubRoute()) {
            removeLoginValidationBanner();
            bootstrapAuthPage();
            guardAuthPageMount();
            return;
        }
        if (!isLoginRoute()) {
            removeLoginValidationBanner();
            if (hasGarcaPetSession()) clearEmailValidationPendingState();
        }
        bootstrapLoginPage();
        bootstrapRegisterPage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            bootstrapAll();
            scheduleAuthUiEnhance();
        });
    } else {
        bootstrapAll();
        scheduleAuthUiEnhance();
    }

    if (typeof window.__garcapetOnRouteChange === 'function') {
        window.__garcapetOnRouteChange(function () {
            bootstrapAll();
            scheduleAuthUiEnhance();
        });
    }

    var rootEl = document.getElementById('root');
    if (rootEl && !getAuthSubRoute()) {
        new MutationObserver(function () {
            if (isLoginRoute()) injectLoginExtras();
            else removeLoginValidationBanner();
            if (isRegisterRoute()) injectRegisterExtras();
        }).observe(rootEl, { childList: true, subtree: true });
    }
})();
