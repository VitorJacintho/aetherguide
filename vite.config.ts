import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// base './' para que o build funcione aberto direto do disco (file://),
// que é como o ACT/OverlayPlugin costuma carregar overlays locais.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        overlay: resolve(import.meta.dirname, 'overlay.html'),
      },
    },
  },
});
