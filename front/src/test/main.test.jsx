import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
// Importamos o componente App (embora não seja o foco, é necessário)
import App from '../../src/App.jsx';

// Mock do módulo ReactDOM para capturar a chamada a createRoot e render
const mockRender = vi.fn();
const mockCreateRoot = vi.fn().mockReturnValue({ render: mockRender });

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

// Mock do componente App (não precisamos do código real do App)
vi.mock('../../src/App', () => ({
  default: () => <div data-testid="app-mock">App Component</div>,
}));

describe('Main Application Entry (main.jsx)', () => {

  // Armazena a referência original do document.getElementById
  const originalGetElementById = document.getElementById;
  
  // Mock do elemento 'root'
  const mockRootElement = document.createElement('div');
  mockRootElement.id = 'root';

  beforeEach(() => {
    // Resetar mocks
    vi.clearAllMocks();
    
    // Substitui document.getElementById para retornar nosso elemento mock
    document.getElementById = vi.fn(id => {
      if (id === 'root') return mockRootElement;
      return null;
    });
  });

  afterEach(() => {
    // Restaura a função original
    document.getElementById = originalGetElementById;
  });
  
  it.skip('deve chamar ReactDOM.createRoot no elemento "root" e renderizar o App dentro do StrictMode', async () => {

    await import('../../src/main');

    expect(document.getElementById).toHaveBeenCalledWith('root');
    
    expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);

    expect(mockRender).toHaveBeenCalledTimes(1);

    const renderCallArgument = mockRender.mock.calls[0][0];

    expect(renderCallArgument.type).toBe(React.StrictMode);
    expect(renderCallArgument.props.children.type).toBe(App);
  });
});