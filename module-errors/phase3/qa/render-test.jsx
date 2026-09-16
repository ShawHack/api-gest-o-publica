import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import assert from 'node:assert/strict'
import InstitutionalError from '../InstitutionalError.tsx'

const missing = renderToStaticMarkup(<InstitutionalError missing />)
assert.match(missing, /Não encontramos esta página/)
assert.match(missing, /href="\/docs\/"/)
assert.match(missing, /href="\/dashboard.html"/)

const unavailable = renderToStaticMarkup(<InstitutionalError retry={() => {}} />)
assert.match(unavailable, /Não foi possível abrir esta página/)
assert.match(unavailable, /consulte seu histórico/)
assert.ok(!unavailable.includes('SEGREDO_INTERNO'))

console.log('PASS: páginas de Documentos renderizam mensagens e saídas seguras sem detalhes internos.')
