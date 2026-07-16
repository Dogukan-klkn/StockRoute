import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Workspace-link'li paketler varsayılan olarak pre-bundle edilmez; shared-types
  // CJS emit ettiği için dev sunucusunda esbuild ile ESM'e çevrilmesi gerekir.
  optimizeDeps: {
    include: ['@stockroute/shared-types'],
  },
  server: {
    port: 5173,
    host: true,
  },
});
