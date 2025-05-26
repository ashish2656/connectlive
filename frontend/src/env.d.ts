/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly PROD: boolean
  readonly VITE_SOCKET_SERVER_URL?: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Vite's process.env types
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
  }
} 