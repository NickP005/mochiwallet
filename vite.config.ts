import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'index.html'),
        background: path.resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: 'src/[name]/index.js',
      },
    },
    emptyOutDir: true,
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: true,
    watch: {
      include: 'src/**'
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    },
    include: ['buffer', 'process/browser', 'crypto-browserify', 'stream-browserify']
  },
  publicDir: 'public',
  server: {
    watch: {
      usePolling: true
    }
  }
})
