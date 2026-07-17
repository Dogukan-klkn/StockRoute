import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // shared-types CJS emit eder (API/Node tüketimi için); CJS'in dinamik
    // `__exportStar` re-export'u Rollup'ın named-export tespitini kırdığından
    // web tarafında paket doğrudan TS kaynağından tüketilir (ui-tokens ile
    // aynı desen — o zaten kaynak TS export ediyor).
    alias: {
      '@stockroute/shared-types': resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
