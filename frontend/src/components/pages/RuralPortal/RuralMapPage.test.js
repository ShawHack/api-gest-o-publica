import { render, screen, waitFor } from '@testing-library/react'
import RuralMapPage from './RuralMapPage'

jest.mock('../../../context/UserContext', () => {
  const React = require('react')
  return { Context: React.createContext({}) }
})

jest.mock('react-leaflet', () => {
  const React = require('react')
  const Box = ({ children }) => <div>{children}</div>
  return {
    CircleMarker: Box, FeatureGroup: Box, GeoJSON: Box, MapContainer: Box, Popup: Box, TileLayer: Box, Tooltip: Box,
    LayersControl: Object.assign(Box, { BaseLayer: Box, Overlay: Box }),
    useMap: () => ({ fitBounds: jest.fn() }),
  }
})

test('disponibiliza a página gráfica dos bairros rurais', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [] }) })
  render(<RuralMapPage />)
  expect(screen.getByRole('heading', { name: /mapa dos bairros rurais de garça/i })).toBeInTheDocument()
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/data/bairros-rurais.geojson'))
  expect(screen.getByText(/referência administrativa/i)).toBeInTheDocument()
})
