'use strict'

const fs = require('fs')

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('Uso: node convert-rural-kml-to-geojson.js entrada.kml saida.geojson')

const xml = fs.readFileSync(input, 'utf8')
const placemarks = xml.match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) || []

function textOf(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return String(match?.[1] || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .trim()
}

function coordinatesOf(text) {
  return text.trim().split(/\s+/).map((tuple) => tuple.split(',').slice(0, 2).map(Number))
    .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude))
}

function normalizeName(value) {
  return value.replace(/^Bairro\s+/i, '').replace(/^àgua\b/i, 'Água').replace(/^9 de julho$/i, '9 de Julho').replace(/\s*\/\s*/g, ' / ').trim()
}

const features = []
for (const placemark of placemarks) {
  const name = normalizeName(textOf(placemark, 'name') || 'Local sem título')
  const polygons = []
  for (const polygon of placemark.match(/<Polygon\b[\s\S]*?<\/Polygon>/gi) || []) {
    const coordinates = textOf(polygon, 'coordinates')
    const ring = coordinatesOf(coordinates)
    if (ring.length >= 4) polygons.push([ring])
  }
  if (polygons.length) {
    features.push({
      type: 'Feature',
      properties: { name, kind: /^Divisa de município$/i.test(name) ? 'boundary' : 'neighborhood' },
      geometry: polygons.length === 1
        ? { type: 'Polygon', coordinates: polygons[0] }
        : { type: 'MultiPolygon', coordinates: polygons },
    })
  }

  const pointBlock = placemark.match(/<Point\b[\s\S]*?<\/Point>/i)?.[0]
  const point = coordinatesOf(textOf(pointBlock || '', 'coordinates'))[0]
  if (point) features.push({ type: 'Feature', properties: { name, kind: 'marker' }, geometry: { type: 'Point', coordinates: point } })
}

const collection = { type: 'FeatureCollection', features }
fs.writeFileSync(output, `${JSON.stringify(collection)}\n`, 'utf8')
const polygons = features.filter((feature) => ['neighborhood', 'boundary'].includes(feature.properties.kind)).length
const markers = features.filter((feature) => feature.properties.kind === 'marker').length
if (!polygons) throw new Error('Nenhum polígono encontrado no KML')
console.log(`Conversão concluída: ${polygons} polígonos e ${markers} marcadores.`)
