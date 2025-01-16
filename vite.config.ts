import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __API_URL__: JSON.stringify(env.MESH_API_URL),
    },
    build: {
      rollupOptions: {
        input: {
          popup: 'index.html',
          background: 'src/background/index.ts'
        },
        output: {
          entryFileNames: (chunkInfo) => {
            return chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'
          }
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  }
})