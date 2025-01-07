import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 'mochimo-wallet': path.resolve(__dirname, '../mochimo-wallet/src')
    }
  },

})
