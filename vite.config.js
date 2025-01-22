import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { manifest } from './src/config/manifest';
import fs from 'fs';
function generateManifest() {
    return {
        name: 'generate-manifest',
        writeBundle: function () {
            fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
        }
    };
}
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
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
                    entryFileNames: function (chunkInfo) {
                        return chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js';
                    },
                    manualChunks: {
                        vendor: ['react', 'react-dom'],
                    }
                }
            }
        },
        plugins: [
            react(),
            generateManifest()
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            }
        }
    };
});
