import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { login } from '../services/auth'; // Supondo que você salvará a função login em AuthService.js

// Mock do Axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('AuthService - login', () => {
  const API_URL = 'https://dialyhome.com.br/api/auth';
  const MOCK_EMAIL = 'user@example.com';
  const MOCK_PASSWORD = 'password123';
  
  // Dados que o backend espera (com 'senha')
  const EXPECTED_PAYLOAD = {
    email: MOCK_EMAIL,
    senha: MOCK_PASSWORD,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve fazer uma chamada POST correta para /login com o mapeamento de senha', async () => {
    const mockResponseData = { 
      accessToken: 'token-xyz', 
      refreshToken: 'refresh-abc', 
      user: { id: 1, email: MOCK_EMAIL } 
    };

    // Simula o sucesso da chamada API
    axios.post.mockResolvedValue({ data: mockResponseData });

    await login(MOCK_EMAIL, MOCK_PASSWORD);

    // Verifica se o axios.post foi chamado com o URL e o payload corretos
    expect(axios.post).toHaveBeenCalledWith(
      `${API_URL}/login`,
      EXPECTED_PAYLOAD
    );
  });

  it('deve retornar os dados da resposta em caso de sucesso', async () => {
    const mockResponseData = { 
      accessToken: 'token-xyz', 
      refreshToken: 'refresh-abc', 
      user: { id: 1, email: MOCK_EMAIL } 
    };

    axios.post.mockResolvedValue({ data: mockResponseData });

    const result = await login(MOCK_EMAIL, MOCK_PASSWORD);

    expect(result).toEqual(mockResponseData);
  });

  it('deve lançar erro com dados de resposta da API em caso de falha', async () => {
    const errorData = { error: 'Credenciais inválidas' };
    const mockError = { response: { data: errorData } };
    
    axios.post.mockRejectedValue(mockError);

    await expect(login(MOCK_EMAIL, MOCK_PASSWORD)).rejects.toEqual(errorData);
  });

  it('deve lançar um erro genérico se a resposta de erro da API for vazia', async () => {
    const mockGenericError = { message: 'Network Error' }; // Simula um erro sem response.data

    axios.post.mockRejectedValue(mockGenericError);

    await expect(login(MOCK_EMAIL, MOCK_PASSWORD)).rejects.toEqual({ error: 'Erro ao fazer login' });
  });
});