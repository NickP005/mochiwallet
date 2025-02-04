var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { manifest } from './src/config/manifest';
import fs from 'fs';
function generateManifest(mode) {
    return {
        name: 'generate-manifest',
        writeBundle: function () {
            var finalManifest = __assign(__assign({}, manifest), { icons: mode === 'development' ? {} : {
                    "16": "icons/icon-16.png",
                    "48": "icons/icon-48.png",
                    "128": "icons/icon-128.png"
                } });
            fs.writeFileSync('dist/manifest.json', JSON.stringify(finalManifest, null, 2));
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
            generateManifest(mode)
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            }
        }
    };
});
