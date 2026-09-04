/**
 * Garça Pet — tela "Quero adotar": mensagem institucional de inauguração.
 * Aplica uma única vez por visita à rota (sem MutationObserver — evita loop infinito).
 */
(function garcaPetInaugurationPatch() {
    if (window.__GARCA_PET_INAUGURATION_PATCH__) return;
    window.__GARCA_PET_INAUGURATION_PATCH__ = true;

    var PRIMARY = '#384D9C';
    var GREEN = '#446042';
    var appliedForPath = '';
    var applyTimer = null;

    function pathname() {
        return (window.SamaRoutes.legacyPath() || '').toLowerCase();
    }

    function isAdotarPage() {
        return pathname().indexOf('/garcapet/adotar') >= 0;
    }

    function ensureStyles() {
        if (document.getElementById('garca-pet-inauguration-styles')) return;
        var style = document.createElement('style');
        style.id = 'garca-pet-inauguration-styles';
        style.textContent =
            '[data-garca-inaug-hidden="1"]{display:none!important;}' +
            '#garca-pet-inauguration-banner{animation:garcaInaugFade .45s ease;}' +
            '@keyframes garcaInaugFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';
        document.head.appendChild(style);
    }

    function findAdotarHeading() {
        var h1s = document.querySelectorAll('h1');
        for (var i = 0; i < h1s.length; i += 1) {
            var t = (h1s[i].textContent || '').trim();
            if (t.indexOf('Encontre seu novo amigo') >= 0 || t.indexOf('Quero adotar') >= 0) {
                return h1s[i];
            }
        }
        return null;
    }

    function buildBanner() {
        var banner = document.createElement('div');
        banner.id = 'garca-pet-inauguration-banner';
        banner.setAttribute('role', 'status');
        banner.style.cssText =
            'margin:28px auto 0;max-width:640px;padding:32px 24px;text-align:center;' +
            'background:linear-gradient(145deg,#f8fafc 0%,#eef2ff 100%);' +
            'border:2px solid ' + PRIMARY + ';border-radius:16px;box-shadow:0 8px 24px rgba(56,77,156,.12);';
        banner.innerHTML =
            '<div style="font-size:48px;line-height:1;margin-bottom:12px;" aria-hidden="true">🐾</div>' +
            '<h2 style="margin:0 0 10px;font-size:1.65rem;color:' + PRIMARY + ';font-weight:800;">Inauguração em breve</h2>' +
            '<p style="margin:0 0 8px;font-size:1.05rem;color:#334155;line-height:1.55;">' +
            'Estamos preparando o catálogo de adoção responsável do Garça Pet.' +
            '</p>' +
            '<p style="margin:0;font-size:.95rem;color:#64748b;line-height:1.5;">' +
            'Em breve você poderá conhecer os pets disponíveis e iniciar o processo de adoção pelo portal.' +
            '</p>' +
            '<div style="margin-top:20px;padding-top:16px;border-top:1px solid #cbd5e1;">' +
            '<span style="display:inline-block;padding:8px 14px;border-radius:999px;background:' + GREEN +
            ';color:#fff;font-weight:700;font-size:.9rem;">Prefeitura de Garça · SEMIT</span></div>';
        return banner;
    }

    function applyInauguration() {
        if (!isAdotarPage()) {
            appliedForPath = '';
            return;
        }

        var path = pathname();
        if (appliedForPath === path && document.getElementById('garca-pet-inauguration-banner')) {
            return;
        }

        ensureStyles();

        var h1 = findAdotarHeading();
        if (!h1) return;

        var parent = h1.parentElement;
        if (!parent) return;

        if (h1.getAttribute('data-garca-inaug') !== '1') {
            h1.textContent = 'Quero adotar';
            h1.style.color = PRIMARY;
            h1.setAttribute('data-garca-inaug', '1');
        }

        var intro = h1.nextElementSibling;
        if (intro && intro.tagName === 'P' && intro.getAttribute('data-garca-inaug') !== '1') {
            intro.textContent =
                'O módulo de adoção responsável do Garça Pet será inaugurado em breve.';
            intro.style.fontSize = '1rem';
            intro.style.color = '#475569';
            intro.setAttribute('data-garca-inaug', '1');
        } else if (!(intro && intro.tagName === 'P')) {
            intro = h1;
        }

        var anchor = intro;
        var passed = false;
        Array.prototype.forEach.call(parent.children, function (child) {
            if (child === anchor) {
                passed = true;
                return;
            }
            if (passed && child.id !== 'garca-pet-inauguration-banner') {
                child.setAttribute('data-garca-inaug-hidden', '1');
            }
        });

        if (!document.getElementById('garca-pet-inauguration-banner')) {
            intro.insertAdjacentElement('afterend', buildBanner());
        }

        appliedForPath = path;
    }

    function scheduleApply() {
        if (applyTimer) clearTimeout(applyTimer);
        var delays = [0, 150, 400, 900];
        delays.forEach(function (ms) {
            setTimeout(applyInauguration, ms);
        });
    }

    window.addEventListener('popstate', scheduleApply);
    window.addEventListener('hashchange', scheduleApply);

    var pushState = history.pushState;
    var replaceState = history.replaceState;
    history.pushState = function () {
        var r = pushState.apply(history, arguments);
        scheduleApply();
        return r;
    };
    history.replaceState = function () {
        var r = replaceState.apply(history, arguments);
        scheduleApply();
        return r;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleApply);
    } else {
        scheduleApply();
    }
})();
