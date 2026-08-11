import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, FeatureGroup, GeoJSON, LayersControl, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { searchRuralMapProperties } from '../../../services/ruralPortalService'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

const DEFAULT_CENTER = [-22.23, -49.70]

export default function RuralMapPage() {
  const [collection, setCollection] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [locatedProperty, setLocatedProperty] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const assetPrefix = process.env.PUBLIC_URL || ''

  useEffect(() => {
    fetch(`${assetPrefix}/data/bairros-rurais.geojson`)
      .then((response) => { if (!response.ok) throw new Error('map_unavailable'); return response.json() })
      .then(setCollection)
      .catch(() => setError('Não foi possível carregar o mapa dos bairros rurais.'))
  }, [assetPrefix])

  const polygons = useMemo(() => collection ? { ...collection, features: collection.features.filter((feature) => feature.geometry.type !== 'Point') } : null, [collection])
  const markers = useMemo(() => collection?.features.filter((feature) => feature.geometry.type === 'Point') || [], [collection])
  const bounds = useMemo(() => {
    if (!polygons) return null
    const points = polygons.features.flatMap((feature) => flattenCoordinates(feature.geometry.coordinates))
    if (!points.length) return null
    return points.reduce((result, [longitude, latitude]) => [
      [Math.min(result[0][0], latitude), Math.min(result[0][1], longitude)],
      [Math.max(result[1][0], latitude), Math.max(result[1][1], longitude)],
    ], [[Infinity, Infinity], [-Infinity, -Infinity]])
  }, [polygons])

  async function search(event) {
    event.preventDefault()
    if (query.trim().length < 2) return setSearchError('Informe ao menos 2 caracteres para pesquisar.')
    setSearching(true)
    setSearchError('')
    setResults([])
    try {
      const data = await searchRuralMapProperties(query.trim())
      const items = data.items || []
      setResults(items)
      if (!items.length) setSearchError('Nenhuma UPA encontrada.')
      if (items.length === 1) selectProperty(items[0])
    } catch (requestError) {
      setSearchError(requestError.response?.data?.message || 'Não foi possível pesquisar a UPA.')
    } finally {
      setSearching(false)
    }
  }

  function selectProperty(property) {
    setLocatedProperty(property)
    const neighborhood = findNeighborhood(polygons?.features || [], property.location)
    setSelected(neighborhood?.properties?.name || '')
  }

  return <div className={styles.appShell}>
    <RuralNavbar section="Mapa dos bairros" />
    <main className={styles.mapPage}>
      <header className={styles.mapPageHeader}><div><h1>Mapa dos bairros rurais de Garça</h1><p>Consulte limites, nomes e referências geográficas extraídas do arquivo oficial KMZ.</p></div><span>{selected ? `Selecionado: ${selected}` : 'Clique em um bairro'}</span></header>
      <form className={styles.mapSearch} onSubmit={search}>
        <label htmlFor="rural-map-search">Localizar uma propriedade</label>
        <div><input id="rural-map-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código da UPA, 3 últimos números, Plus Code ou nome" /><button className={styles.button} disabled={searching}>{searching ? 'Buscando…' : 'Buscar'}</button></div>
        {searchError && <span role="alert">{searchError}</span>}
        {results.length > 1 && <ul className={styles.mapSearchResults}>{results.map((item) => <li key={`${item.codigoUpa}-${item.plusCode}`}><button type="button" onClick={() => selectProperty(item)}><strong>{item.codigoUpa}</strong><span>{item.name || 'Propriedade rural'} · {item.plusCode}</span></button></li>)}</ul>}
      </form>
      {locatedProperty && <section className={styles.mapPropertyCard} aria-live="polite"><div><strong>{locatedProperty.name || 'Propriedade rural'}</strong><span>UPA: {locatedProperty.codigoUpa} · Plus Code: {locatedProperty.plusCode}</span>{selected && <span>Bairro rural: {selected}</span>}</div><button type="button" onClick={() => { setLocatedProperty(null); setSelected('') }}>Limpar marcação</button></section>}
      {error && <div role="alert" className={styles.error}>{error}</div>}
      {!collection && !error && <p>Carregando mapa…</p>}
      {collection && <MapContainer center={DEFAULT_CENTER} zoom={10} className={styles.interactiveMap} scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satélite">
            <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Mapa">
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay checked name="Limites dos bairros">
            <GeoJSON key={selected || 'all'} data={polygons} style={(feature) => styleFeature(feature, selected)} onEachFeature={(feature, layer) => {
              layer.bindTooltip(feature.properties.name, { permanent: true, direction: 'center', className: 'rural-map-label' })
              layer.on('click', () => setSelected(feature.properties.name))
            }} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Marcadores do KMZ">
            <FeatureGroup>{markers.map((feature, index) => <CircleMarker key={`${feature.properties.name}-${index}`} center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]} radius={5} pathOptions={{ color: '#082d22', fillColor: '#f5d547', fillOpacity: 1 }}><Popup>{feature.properties.name}</Popup><Tooltip>{feature.properties.name}</Tooltip></CircleMarker>)}</FeatureGroup>
          </LayersControl.Overlay>
          {locatedProperty && <LayersControl.Overlay checked name="UPA localizada"><CircleMarker center={[locatedProperty.location.latitude, locatedProperty.location.longitude]} radius={11} pathOptions={{ color: '#fff', weight: 3, fillColor: '#d52222', fillOpacity: 1 }}><Popup><strong>{locatedProperty.name || 'Propriedade rural'}</strong><br />UPA: {locatedProperty.codigoUpa}<br />Plus Code: {locatedProperty.plusCode}{selected && <><br />Bairro: {selected}</>}</Popup><Tooltip permanent direction="top">UPA {locatedProperty.codigoUpa}</Tooltip></CircleMarker></LayersControl.Overlay>}
        </LayersControl>
        <FitBounds bounds={bounds} />
        <FocusProperty property={locatedProperty} />
      </MapContainer>}
      <p className={styles.mapAttributionNote}>Os limites representam os dados fornecidos no arquivo “Bairros Garça.kmz” e devem ser usados como referência administrativa.</p>
    </main>
  </div>
}

function flattenCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) return []
  if (typeof coordinates[0] === 'number') return [coordinates]
  return coordinates.flatMap(flattenCoordinates)
}

function styleFeature(feature, selected) {
  if (feature.properties.kind === 'boundary') return { color: '#f5d547', weight: 4, fillOpacity: 0, dashArray: '8 6' }
  if (selected && feature.properties.name === selected) return { color: '#d52222', weight: 5, fillColor: '#f5d547', fillOpacity: 0.32 }
  return { color: '#00e5ff', weight: 2.5, fillColor: '#1f7a4b', fillOpacity: 0.12 }
}

function FitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [24, 24] }) }, [bounds, map])
  return null
}

function FocusProperty({ property }) {
  const map = useMap()
  useEffect(() => { if (property) map.setView([property.location.latitude, property.location.longitude], 16) }, [map, property])
  return null
}

function findNeighborhood(features, location) {
  const point = [location.longitude, location.latitude]
  return features.find((feature) => feature.properties.kind !== 'boundary' && geometryContainsPoint(feature.geometry, point))
}

function geometryContainsPoint(geometry, point) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
  return polygons.some((polygon) => polygon.length && pointInRing(point, polygon[0]) && !polygon.slice(1).some((hole) => pointInRing(point, hole)))
}

function pointInRing([x, y], ring) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index]
    const [xj, yj] = ring[previous]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
