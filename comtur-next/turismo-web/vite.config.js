import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/turismo/',
  server: { proxy: { '/api': 'https://api.garca.sp.gov.br' } },
  preview: { proxy: { '/api': 'https://api.garca.sp.gov.br' } },
  test: { environment: 'jsdom' },
})
