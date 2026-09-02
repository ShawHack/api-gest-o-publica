/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOVOSGA_API_URL: string
  readonly VITE_MERCURE_PUBLIC_URL: string
  readonly VITE_MERCURE_TOPIC_TEMPLATE: string
  readonly VITE_MERCURE_SUBSCRIBE_GLOBAL: string
  readonly VITE_MERCURE_SUBSCRIBER_JWT: string
  readonly VITE_DISPLAY_MODE: string
  readonly VITE_ENABLE_DEMO: string
  readonly VITE_DEFAULT_UNIT_ID: string
  readonly VITE_POLL_INTERVAL_MS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
