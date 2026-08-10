// utils/pluscode.js
const olc = require('open-location-code')

/** Remove sufixos ("Garça, SP", espaços) e deixa maiúsculo */
function normalizePluscode(input = '') {
  return String(input)
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[,;-].*$/g, '') // corta sufixos como ",SP"
}

/** Decodifica o centro do Plus Code; retorna { lat, lng } */
function decodeToLatLng(pluscode) {
  const code = normalizePluscode(pluscode)
  const area = olc.decode(code)
  return { lat: area.latitudeCenter, lng: area.longitudeCenter }
}

/** Retorna prefixo de "quadra" (8 chars) a partir de um code detalhado */
function toQuadraPrefix(pluscode) {
  const code = normalizePluscode(pluscode)
  // 8 é “área de quadra” típico; ajuste se seu padrão for outro
  return code.slice(0, 8)
}

module.exports = { normalizePluscode, decodeToLatLng, toQuadraPrefix }
