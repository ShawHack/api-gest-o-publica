const fs = require('fs');
const Module = require('module');
const assert = require('node:assert/strict');
const req = Module.createRequire('/app/apps/web/package.json');
const ts = req('typescript');
const React = req('react');
const { JSDOM } = req('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/docs/' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = req('react-dom/client');
const { renderToStaticMarkup } = req('react-dom/server');
const loaded = {};
function load(name) {
  if (loaded[name]) return loaded[name];
  const file = '/qa/' + name;
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: name.endsWith('.js') ? name + 'x' : name,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  const m = new Module(file);
  m.require = id => id === '../components/InstitutionalError'
    ? load('InstitutionalError.tsx')
    : id === 'react-router-dom' ? { useLocation: () => ({ pathname: '/educacao/' }) } : req(id);
  m._compile(compiled.outputText, file);
  return loaded[name] = m.exports;
}
async function main() {
  const root = createRoot(document.getElementById('root'));
  const notFound = load('not-found.tsx').default;
  await React.act(() => root.render(React.createElement(notFound)));
  assert.match(document.body.textContent, /Não encontramos esta página/);
  assert.equal(document.querySelector('a').getAttribute('href'), '/docs/');
  let retries = 0;
  const error = load('error.tsx').default;
  await React.act(() => root.render(React.createElement(error, { error: new Error('SEGREDO_INTERNO'), retry: () => retries++ })));
  assert.ok(!document.body.textContent.includes('SEGREDO_INTERNO'));
  await React.act(() => document.querySelector('button').click());
  assert.equal(retries, 1);
  const globalError = load('global-error.tsx').default;
  const html = renderToStaticMarkup(React.createElement(globalError, { error: new Error('SEGREDO_INTERNO'), retry() {} }));
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<body/);
  assert.ok(!html.includes('SEGREDO_INTERNO'));
  const { EducationBoundary, EducationErrorPage } = load('EducationErrorBoundary.js');
  let shouldThrow = false;
  function Child() { if (shouldThrow) throw new Error('SEGREDO_INTERNO'); return React.createElement('p', null, 'Conteúdo normal'); }
  await React.act(() => root.render(React.createElement(EducationBoundary, null, React.createElement(Child))));
  assert.match(document.body.textContent, /Conteúdo normal/);
  shouldThrow = true;
  const originalError = console.error;
  try {
    console.error = () => {};
    await React.act(() => root.render(React.createElement(EducationBoundary, null, React.createElement(Child))));
  } finally { console.error = originalError; }
  assert.match(document.body.textContent, /Não foi possível abrir/);
  assert.ok(!document.body.textContent.includes('SEGREDO_INTERNO'));
  shouldThrow = false;
  await React.act(() => document.querySelector('button').click());
  assert.match(document.body.textContent, /Conteúdo normal/);
  await React.act(() => root.render(React.createElement(EducationErrorPage, { missing: true })));
  assert.equal(document.querySelector('a').getAttribute('href'), '/educacao/');
  await React.act(() => root.unmount());
  console.log('PASS: Documentos 404, erro, retry, links, global-error; Educação normal, falha, recuperação, 404; nenhuma mensagem interna exposta.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
