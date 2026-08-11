import { useEffect, useMemo, useState } from 'react'
import styles from './RuralPortal.module.css'

const WIDTH = 960
const HEIGHT = 560
const PADDING = 16

function outerRings(feature) {
  const { type, coordinates } = feature.geometry || {}
  if (type === 'Polygon') return coordinates?.slice(0, 1) || []
  if (type === 'MultiPolygon') return (coordinates || []).flatMap((polygon) => polygon.slice(0, 1))
  return []
}

export default function RuralNeighborhoodMap({ selected, onSelect }) {
  const [features, setFeatures] = useState([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`${process.env.PUBLIC_URL || ''}/data/bairros-rurais.geojson`)
      .then((response) => {
        if (!response.ok) throw new Error('map_unavailable')
        return response.json()
      })
      .then((data) => { if (active) setFeatures(data.features || []) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])

  const projected = useMemo(() => {
    const neighborhoodFeatures = features.filter((feature) => feature.properties.kind === 'neighborhood' || (!feature.properties.kind && feature.geometry?.type !== 'Point'))
    const allCoordinates = neighborhoodFeatures.flatMap(outerRings).flat()
    if (!allCoordinates.length) return []
    const longitudes = allCoordinates.map(([longitude]) => longitude)
    const latitudes = allCoordinates.map(([, latitude]) => latitude)
    const minLongitude = Math.min(...longitudes)
    const maxLongitude = Math.max(...longitudes)
    const minLatitude = Math.min(...latitudes)
    const maxLatitude = Math.max(...latitudes)
    const scaleX = (WIDTH - PADDING * 2) / (maxLongitude - minLongitude)
    const scaleY = (HEIGHT - PADDING * 2) / (maxLatitude - minLatitude)

    return neighborhoodFeatures.map((feature) => ({
      name: feature.properties.name,
      polygons: outerRings(feature).map((ring) => ring.map(([longitude, latitude]) =>
        `${PADDING + (longitude - minLongitude) * scaleX},${HEIGHT - PADDING - (latitude - minLatitude) * scaleY}`,
      ).join(' ')),
    }))
  }, [features])

  if (error) return <p className={styles.mapMessage}>Não foi possível carregar o mapa dos bairros.</p>
  if (!projected.length) return <p className={styles.mapMessage}>Carregando mapa dos bairros…</p>

  return <div className={styles.ruralMap}>
    <div className={styles.mapHeading}>
      <strong>Mapa dos bairros rurais</strong>
      <span>{selected ? `Selecionado: ${selected}` : 'Clique no bairro da propriedade'}</span>
    </div>
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Limites dos bairros rurais de Garça">
      {projected.map(({ name, polygons }) => <g
        key={name}
        role="button"
        tabIndex="0"
        aria-label={`Selecionar bairro ${name}`}
        className={selected === name ? styles.mapSelected : styles.mapNeighborhood}
        onClick={() => onSelect(name)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(name) }}
      >
        <title>{name}</title>
        {polygons.map((points, index) => <polygon key={`${name}-${index}`} points={points} />)}
      </g>)}
    </svg>
  </div>
}
