import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A diferencia de web-campo, esta app es de escritorio con conexión
// permanente (oficina de la Subgerencia) — sin PWA ni soporte offline.
export default defineConfig({
  resolve: {
    alias: {
      '@pas-sjl/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
  plugins: [react()],
});
