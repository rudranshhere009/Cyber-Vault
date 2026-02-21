import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use relative paths in production so Electron can load assets via file://
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
          if (id.includes('tesseract.js')) return 'ocr-vendor';
          if (id.includes('pdfjs-dist')) return 'pdf-vendor';
          if (id.includes('@tensorflow') || id.includes('opencv.js')) return 'biometric-vendor';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
