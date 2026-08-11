import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, FeatureGroup, GeoJSON, LayersControl, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

const DEFAULT_CENTER = [-22.23, -49.70]

export default function RuralMapPage() {
  const [collection, setCollection] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
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

  return <div className={styles.appShell}>
    <RuralNavbar section="Mapa dos bairros" />
    <main className={styles.mapPage}>
      <header className={styles.mapPageHeader}><div><h1>Mapa dos bairros rurais de Garça</h1><p>Consulte limites, nomes e referências geográficas extraídas do arquivo oficial KMZ.</p></div><span>{selected ? `Selecionado: ${selected}` : 'Clique em um bairro'}</span></header>
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
            <GeoJSON data={polygons} style={styleFeature} onEachFeature={(feature, layer) => {
              layer.bindTooltip(feature.properties.name, { permanent: true, direction: 'center', className: 'rural-map-label' })
              layer.on('click', () => setSelected(feature.properties.name))
            }} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Marcadores do KMZ">
            <FeatureGroup>{markers.map((feature, index) => <CircleMarker key={`${feature.properties.name}-${index}`} center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]} radius={5} pathOptions={{ color: '#082d22', fillColor: '#f5d547', fillOpacity: 1 }}><Popup>{feature.properties.name}</Popup><Tooltip>{feature.properties.name}</Tooltip></CircleMarker>)}</FeatureGroup>
          </LayersControl.Overlay>
        </LayersControl>
        <FitBounds bounds={bounds} />
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

function styleFeature(feature) {
  if (feature.properties.kind === 'boundary') return { color: '#f5d547', weight: 4, fillOpacity: 0, dashArray: '8 6' }
  return { color: '#00e5ff', weight: 2.5, fillColor: '#1f7a4b', fillOpacity: 0.12 }
}

function FitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [24, 24] }) }, [bounds, map])
  return null
}
