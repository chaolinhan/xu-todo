import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'pages' ? '/xu-todo/' : '/',
  server: { port: 4173 },
  preview: { port: 4173 },
}))
