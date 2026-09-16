const { normalize } = require('/app/helpers/comtur-content')
const ok = normalize({
  type: 'qr_point',
  slug: 'placa-lago',
  title: 'Placa',
  qr: { enabled: true, code: 'GARCA-QR-001', status: 'installed' },
})
const bad = normalize({
  type: 'qr_point',
  slug: 'x',
  title: 'X',
  qr: { enabled: true, code: '', status: 'installed' },
})
console.log('OK', JSON.stringify(ok.value && ok.value.qr))
console.log('BAD', bad.error)
