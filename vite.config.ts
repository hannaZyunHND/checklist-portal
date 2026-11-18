import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const r2Endpoint = (env.VITE_R2_ENDPOINT || '').trim();

  return {
    plugins: [react(), tailwindcss()],
    base: './',
    server: {
      port: 32632,
      strictPort: true,
      ...(r2Endpoint
        ? {
            proxy: {
              '/r2-proxy': {
                target: r2Endpoint,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/r2-proxy/, ''),
              },
            },
          }
        : {}),
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
