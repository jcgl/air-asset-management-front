import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/air-asset-management-front/',
  server: {
    proxy: {
      '/api': {
        target: 'https://generator-manager-gydsehh4b3f6a2av.westcentralus-01.azurewebsites.net',
        changeOrigin: true,
      },
    },
  },
})
