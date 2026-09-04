// SEMIT_A_PET/SAMA: mesma base de API do memorial (regras existentes)
// Sempre usar /api pois SAMA Ã© servido via Nginx que faz proxy de /api para o backend
window.REACT_APP_API = window.location.origin;
window.__API_BASE__ = '/api';

// Hotfix de compatibilidade de sessão:
// Alguns trechos legados do SAMA fazem JSON.parse(localStorage.token).
// Se token estiver salvo cru (eyJ...), o parse falha e quebra telas como Perfil.
(function normalizeLegacyAuthStorage() {
  try {
    var rawToken = localStorage.getItem('token');
    if (rawToken) {
      var trimmed = String(rawToken).trim().replace(/^"+|"+$/g, '');
      if (trimmed && !rawToken.trim().startsWith('"')) {
        localStorage.setItem('token', JSON.stringify(trimmed));
      }
    }

    var rawAuth = localStorage.getItem('auth');
    if (rawAuth && !rawAuth.trim().startsWith('{')) {
      var normalizedToken = rawAuth.trim().replace(/^"+|"+$/g, '');
      localStorage.setItem('auth', JSON.stringify({ token: normalizedToken }));
      if (!localStorage.getItem('token')) {
        localStorage.setItem('token', JSON.stringify(normalizedToken));
      }
    }
  } catch (_) {}
})();