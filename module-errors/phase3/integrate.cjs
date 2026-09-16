const fs = require('fs')

function replaceOnce(file, before, after) {
  const text = fs.readFileSync(file, 'utf8')
  if (text.includes(after)) return
  const count = text.split(before).length - 1
  if (count !== 1) throw new Error(`${file}: marcador encontrado ${count} vez(es)`)
  fs.writeFileSync(file, text.replace(before, after))
}

for (const root of process.argv.slice(2)) {
  const education = `${root}/frontend/src/components/pages/Education`
  const portal = `${education}/EducationPortal.js`
  fs.copyFileSync('/tmp/phase3-errors/EducationErrorBoundary.js', `${education}/EducationErrorBoundary.js`)
  replaceOnce(portal,
    "import styles from './EducationPortal.module.css'",
    "import styles from './EducationPortal.module.css'\nimport EducationErrorBoundary, { EducationErrorPage } from './EducationErrorBoundary'")
  replaceOnce(portal, '      <Routes>\n', '      <EducationErrorBoundary>\n      <Routes>\n')
  replaceOnce(portal,
    '            <Route path="transparencia" element={<CouncilTransparency />} />\n          </Route>',
    '            <Route path="transparencia" element={<CouncilTransparency />} />\n            <Route path="*" element={<EducationErrorPage missing />} />\n          </Route>')
  replaceOnce(portal,
    '          <Route path="documentos" element={<DocumentList />} />\n        </Route>\n      </Routes>',
    '          <Route path="documentos" element={<DocumentList />} />\n          <Route path="*" element={<EducationErrorPage missing />} />\n        </Route>\n      </Routes>\n      </EducationErrorBoundary>')
  replaceOnce(`${root}/frontend/src/App.js`,
    '<Route path="/educacao/admin/*" element={<EducationAdminPortal />} />',
    '<Route path="/educacao/admin" element={<EducationAdminPortal />} />')
}

const docs = '/home/semit/Documentos/sd_docs/apps/web/src'
fs.copyFileSync('/tmp/phase3-errors/InstitutionalError.tsx', `${docs}/components/InstitutionalError.tsx`)
for (const file of ['not-found.tsx', 'error.tsx', 'global-error.tsx']) {
  fs.copyFileSync(`/tmp/phase3-errors/${file}`, `${docs}/app/${file}`)
}
