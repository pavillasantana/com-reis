import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../', // Lê o .env da raiz do monorepo (fonte única de verdade)
  // Expõe ao cliente variáveis com AMBOS os prefixos:
  // EXPO_PUBLIC_ → compartilhado com Android (root .env)
  // VITE_        → exclusivo da web (Sentry DSN, AdSense, versão)
  envPrefix: ['EXPO_PUBLIC_', 'VITE_'],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  test: {
    // Vitest configuration
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**', 'src/store/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
