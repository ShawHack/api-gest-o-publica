import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PanelProvider } from './features/calls/PanelContext'
import { AdminPanelsPage } from './pages/AdminPanelsPage'
import { PanelDisplayPage } from './pages/PanelDisplayPage'
import { PanelEditPage } from './pages/PanelEditPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <PanelProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminPanelsPage />} />
          <Route path="/admin/paineis/:panelId" element={<PanelEditPage />} />
          <Route path="/p/:slug" element={<PanelDisplayPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </PanelProvider>
    </BrowserRouter>
  )
}
