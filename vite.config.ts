import { defineConfig, loadEnv, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { manifest } from './src/config/manifest'
import fs from 'fs'

function generateManifest(mode: string): Plugin {
  return {
    name: 'generate-manifest',
    writeBundle() {
      const finalManifest = {
        ...manifest,
        icons: mode === 'development' ? {} : {
          "16": `icons/icon-16.png`,
          "48": `icons/icon-48.png`,
          "128": `icons/icon-128.png`
        }
      }

      fs.writeFileSync(
        'dist/manifest.json',
        JSON.stringify(finalManifest, null, 2)
      )
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __API_URL__: JSON.stringify(env.MESH_API_URL),
      'process.env.VERSION': JSON.stringify(manifest.version)
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
          },
          manualChunks: {
            vendor: ['react', 'react-dom'],
          }
        }
      }
    },
    plugins: [
      react(),
      generateManifest(mode)
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  }
})