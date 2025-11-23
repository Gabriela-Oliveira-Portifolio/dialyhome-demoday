import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Estende os matchers
expect.extend(matchers);

// Limpa após cada teste
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock completo do localStorage com implementação funcional
const createStorageMock = () => {
  let store = {};
  
  return {
    getItem: vi.fn((key) => {
      return store[key] || null;
    }),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    // Expor store para testes poderem acessar
    _getStore: () => store,
    _setStore: (newStore) => { store = newStore; }
  };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

// Configurar no global
globalThis.localStorage = localStorageMock;
globalThis.sessionStorage = sessionStorageMock;

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Reset antes de cada teste
beforeEach(() => {
  // Limpar stores
  localStorageMock._setStore({});
  sessionStorageMock._setStore({});
  
  // Limpar todos os mocks
  vi.clearAllMocks();
  
  // Configurar token padrão para testes que precisam de autenticação
  localStorageMock.setItem('token', 'mock-jwt-token-12345');
  localStorageMock.setItem('accessToken', 'mock-jwt-token-12345');
});

// Mock do fetch global
globalThis.fetch = vi.fn();

// Mock do console para evitar spam nos testes
globalThis.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};