// Vite — F0b de la modularización (2026-07-15). Objetivo: build estándar sin cambiar NADA de cómo se ve
// o funciona la app.
//
// Decisiones (y sus porqués):
// · `publicDir: 'public'` → todo lo que se sirve TAL CUAL (sw.js, styles.css, manifest, iconos, fonts,
//   vendor, .well-known, privacy/terms, docs/manuales) se copia a dist/ sin tocar. Sus URLs no cambian.
// · NOMBRES FIJOS, SIN HASH (`entryFileNames: 'assets/main.js'`): el service worker precachea rutas
//   literales en su SHELL; con hash cambiarían en cada build y el precache se rompería. El cache-busting
//   ya lo da el `CACHE = 'flyclean-vN'` del sw + los headers de Vercel.
// · `target: 'es2020'`: mismo piso de browsers que ya soporta la app (PWA en celulares modernos).
// · api/ NO pasa por Vite: son funciones serverless de Vercel, se despliegan aparte.
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: true, // para poder depurar el bundle minificado desde el navegador
    rollupOptions: {
      output: {
        entryFileNames: 'assets/main.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: { port: 5173 },
});
