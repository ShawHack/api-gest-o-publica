const fs = require('node:fs')
const Module = require('node:module')
const assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(file, mocks = {}) {
  const code = transformSync(fs.readFileSync(file, 'utf8'), {
    loader: file.endsWith('.tsx') ? 'tsx' : 'jsx',
    jsx: 'automatic',
    format: 'cjs',
    target: 'es2020',
  }).code
  const mod = new Module(file)
  const original = mod.require.bind(mod)
  mod.require = id => mocks[id] || original(id)
  mod._compile(code, file)
  return mod.exports
}

const institutional = load(require.resolve('../InstitutionalError.tsx')).default
const missing = renderToStaticMarkup(React.createElement(institutional, { missing: true }))
assert.match(missing, /Não encontramos esta página/)
assert.match(missing, /href="\/docs\/"/)
assert.match(missing, /href="\/dashboard.html"/)
const unavailable = renderToStaticMarkup(React.createElement(institutional, { retry() {} }))
assert.match(unavailable, /Não foi possível abrir esta página/)
assert.match(unavailable, /consulte seu histórico/)
assert.ok(!unavailable.includes('SEGREDO_INTERNO'))

for (const file of ['not-found.tsx', 'error.tsx', 'global-error.tsx', 'EducationErrorBoundary.js']) {
  transformSync(fs.readFileSync(require.resolve('../' + file), 'utf8'), {
    loader: file.endsWith('.tsx') ? 'tsx' : 'jsx', format: 'cjs', target: 'es2020',
    jsx: 'automatic',
  })
}
const education = load(require.resolve('../EducationErrorBoundary.js'), {
  'react-router-dom': { useLocation: () => ({ pathname: '/educacao/' }) },
})
const education404 = renderToStaticMarkup(React.createElement(education.EducationErrorPage, { missing: true }))
assert.match(education404, /Não encontramos esta página/)
assert.match(education404, /href="\/educacao\/"/)
const boundary = new education.EducationBoundary({ children: React.createElement('p', null, 'Conteúdo normal') })
assert.match(renderToStaticMarkup(boundary.render()), /Conteúdo normal/)
boundary.state = education.EducationBoundary.getDerivedStateFromError(new Error('SEGREDO_INTERNO'))
const educationError = renderToStaticMarkup(boundary.render())
assert.match(educationError, /Não foi possível abrir esta página/)
assert.ok(!educationError.includes('SEGREDO_INTERNO'))
console.log('PASS: fontes compilam; Documentos e Educação renderizam 404/erro com links seguros e sem detalhes internos.')
