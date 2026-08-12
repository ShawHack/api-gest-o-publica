import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RuralMapPage from './RuralMapPage'
import { searchRuralMapProperties } from '../../../services/ruralPortalService'

jest.mock('../../../services/ruralPortalService', () => ({ searchRuralMapProperties: jest.fn() }))

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
    useMap: () => ({ fitBounds: jest.fn(), setView: jest.fn(), getZoom: jest.fn(() => 10), on: jest.fn(), off: jest.fn() }),
  }
})

test('localiza a UPA e apresenta a propriedade para marcação', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [] }) })
  searchRuralMapProperties.mockResolvedValue({ items: [{ codigoUpa: '1751428043', plusCode: '589G8QRQ+CM', name: 'Sítio Teste', location: { latitude: -22.21, longitude: -49.65 } }] })
  render(<RuralMapPage />)
  fireEvent.change(screen.getByLabelText(/localizar uma propriedade/i), { target: { value: '043' } })
  fireEvent.click(screen.getByRole('button', { name: /buscar/i }))
  expect((await screen.findAllByText('Sítio Teste')).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/upa: 1751428043/i).length).toBeGreaterThan(0)
  const directions = screen.getAllByRole('link', { name: 'Ir' })
  expect(directions.length).toBeGreaterThanOrEqual(2)
  expect(directions[0]).toHaveAttribute('href', expect.stringContaining('destination=-22.21%2C-49.65'))
  expect(screen.getAllByRole('button', { name: 'Compartilhar' }).length).toBeGreaterThanOrEqual(2)
  expect(searchRuralMapProperties).toHaveBeenCalledWith('043')
})

test('disponibiliza a página gráfica dos bairros rurais', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [] }) })
  render(<RuralMapPage />)
  expect(screen.getByRole('heading', { name: /mapa dos bairros rurais de garça/i })).toBeInTheDocument()
  expect(screen.getAllByText('Mapa dos bairros')).toHaveLength(1)
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/data/bairros-rurais.geojson'))
  expect(screen.getByText(/referência administrativa/i)).toBeInTheDocument()
})
