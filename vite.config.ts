import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A diferencia de web-campo, esta app es de escritorio con conexión
// permanente (oficina de la Subgerencia) — sin PWA ni soporte offline.
export default defineConfig({
  // host:true = escucha en todas las interfaces (no solo localhost), para
  // poder abrirla desde otra PC en la misma red.
  // allowedHosts: acepta los enlaces temporales de Cloudflare Tunnel
  // (`cloudflared tunnel --url ...`) para demos con HTTPS; Vite bloquea
  // por defecto cualquier dominio que no sea localhost o una IP.
  server: { host: true, port: 5174, allowedHosts: ['.trycloudflare.com'] },
  resolve: {
    alias: {
      '@pas-sjl/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
  plugins: [react()],
});
