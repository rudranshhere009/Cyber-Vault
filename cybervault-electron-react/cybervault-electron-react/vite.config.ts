import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use relative paths in production so Electron can load assets via file://
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
