import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@horeca-smart/core/analytics': path.resolve(__dirname, '../../packages/core/src/analytics/index.ts'),
        '@horeca-smart/core/filters': path.resolve(__dirname, '../../packages/core/src/filters/index.ts'),
        '@horeca-smart/core/business-rules': path.resolve(__dirname, '../../packages/core/src/business-rules/index.ts'),
        '@horeca-smart/core/contracts': path.resolve(__dirname, '../../packages/core/src/contracts/index.ts'),
        '@horeca-smart/core/ai': path.resolve(__dirname, '../../packages/core/src/ai/index.ts'),
        '@horeca-smart/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
