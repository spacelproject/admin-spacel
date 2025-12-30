import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'components': path.resolve(__dirname, './src/components'),
      'pages': path.resolve(__dirname, './src/pages'),
      'utils': path.resolve(__dirname, './src/utils'),
      'hooks': path.resolve(__dirname, './src/hooks'),
      'contexts': path.resolve(__dirname, './src/contexts'),
      'lib': path.resolve(__dirname, './src/lib'),
      'styles': path.resolve(__dirname, './src/styles')
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
