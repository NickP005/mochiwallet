import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                popup: 'index.html',
                background: 'src/background/index.ts'
            },
            output: {
                entryFileNames: function (chunkInfo) {
                    return chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js';
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
});
