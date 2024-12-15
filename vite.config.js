import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
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
    },
    publicDir: 'public',
});
