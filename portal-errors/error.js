const page = window.parent !== window ? window.parent : window;
if (page !== window) document.querySelectorAll('a').forEach(link => { link.target = '_top'; });
document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => {
  if (page.history.length > 1) page.history.back(); else page.location.assign('/dashboard.html');
}));
document.querySelectorAll('[data-retry]').forEach(button => button.addEventListener('click', () => page.location.reload()));
