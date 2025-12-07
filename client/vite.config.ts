import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // Base URL pour GitHub Pages (ajustez selon le nom de votre dépôt)
  // IMPORTANT: Le slash final est requis pour GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/MegaMix/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // S'assurer que les imports dynamiques utilisent le bon chemin de base
    rollupOptions: {
      output: {
        // Utiliser des chemins relatifs pour les chunks dynamiques
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})

