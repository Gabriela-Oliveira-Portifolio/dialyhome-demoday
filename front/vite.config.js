// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })


// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   test: {
//     globals: true,
//     environment: 'jsdom',
//     setupFiles: './src/setupTests.js',
//   },
// })


import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    
    // Padrões de arquivos de teste
    include: [
      'src/test/**/*.test.{js,jsx}',
      'src/test/**/*.spec.{js,jsx}',
      'src/**/__tests__/**/*.{js,jsx}'
    ],
    
    // Configuração de cobertura
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      
      // Arquivos a serem incluídos na cobertura
      include: [
        'src/**/*.{js,jsx}'
      ],
      
      // Arquivos a serem excluídos da cobertura
      exclude: [
        'src/test/**',
        'src/**/*.test.{js,jsx}',
        'src/**/*.spec.{js,jsx}',
        'src/setupTests.js',
        'src/main.jsx',
        'src/App.jsx',
        'node_modules/**',
        'coverage/**'
      ],
      
      // Limites de cobertura (opcional)
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})