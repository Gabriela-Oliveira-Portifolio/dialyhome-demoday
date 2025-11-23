import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'node_modules/',
        'src/test/**',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
        'src/main.jsx',
        'src/vite-env.d.ts'
      ],
      all: true,
      // Importante: gerar coverage mesmo com testes falhando
      skipFull: false
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});