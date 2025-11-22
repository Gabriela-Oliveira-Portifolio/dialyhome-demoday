import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { updateUserProfile, changePassword, getUserProfile, updatePatientProfile } from '../services/Userservice';

// --- Mocks Globais ---

// 1. Mock do Axios
// Mockamos o módulo axios inteiro, mas apenas os métodos que usamos (put e get)
vi.mock('axios', () => ({
  default: {
    put: vi.fn(),
    get: vi.fn(),
  },
}));

// 2. Mock de Storage (sessionStorage e localStorage)
const mockSessionStorageGetItem = vi.fn();
const mockLocalStorageGetItem = vi.fn();

// Define as propriedades de mock no objeto global
Object.defineProperty(global, 'sessionStorage', {
  value: { getItem: mockSessionStorageGetItem },
  writable: true,
  configurable: true,
});
Object.defineProperty(global, 'localStorage', {
  value: { getItem: mockLocalStorageGetItem },
  writable: true,
  configurable: true,
});

// --- Configuração ---

const API_URL = 'https://dialyhome.com.br/api/users';
const MOCK_TOKEN = 'mock-jwt-token-12345';
const AUTH_HEADER = { Authorization: `Bearer ${MOCK_TOKEN}` };

beforeEach(() => {
  // Limpa todos os mocks antes de cada teste para isolamento
  vi.clearAllMocks();
});

// --- Testes da Lógica de Autenticação (implícitos no getAuthHeader) ---

describe('Authentication Header Logic', () => {

    it.skip('deve usar o token do sessionStorage se estiver presente', async () => {
        mockSessionStorageGetItem.mockReturnValue(MOCK_TOKEN);
        mockLocalStorageGetItem.mockReturnValue(null);

        // Chamamos qualquer função para testar o header
        await getUserProfile();

        expect(axios.get).toHaveBeenCalledWith(
            `${API_URL}/getProfile`,
            { headers: AUTH_HEADER }
        );
    });

    it.skip('deve usar o token do localStorage se o sessionStorage estiver vazio', async () => {
        mockSessionStorageGetItem.mockReturnValue(null);
        mockLocalStorageGetItem.mockReturnValue(MOCK_TOKEN);

        await getUserProfile();

        expect(axios.get).toHaveBeenCalledWith(
            `${API_URL}/getProfile`,
            { headers: AUTH_HEADER }
        );
    });

    it.skip('não deve incluir header de Authorization se nenhum token for encontrado', async () => {
        mockSessionStorageGetItem.mockReturnValue(null);
        mockLocalStorageGetItem.mockReturnValue(null);

        await getUserProfile();

        expect(axios.get).toHaveBeenCalledWith(
            `${API_URL}/getProfile`,
            { headers: {} } // Header deve ser vazio
        );
    });
});

// --- Testes para updateUserProfile (e updatePatientProfile) ---

describe('updateUserProfile', () => {
  const profileData = { name: 'Novo Nome', email: 'novo@email.com' };
  const mockResponse = { success: true, user: profileData };

  beforeEach(() => {
    mockSessionStorageGetItem.mockReturnValue(MOCK_TOKEN);
    axios.put.mockResolvedValue({ data: mockResponse });
  });

  it('deve fazer uma chamada PUT correta para /updateProfile', async () => {
    await updateUserProfile(profileData);

    expect(axios.put).toHaveBeenCalledWith(
      `${API_URL}/updateProfile`,
      profileData,
      { headers: AUTH_HEADER }
    );
  });

  it('deve retornar os dados da resposta em caso de sucesso', async () => {
    const data = await updateUserProfile(profileData);
    expect(data).toEqual(mockResponse);
  });

  it('deve ser idêntico a updatePatientProfile (compatibilidade)', () => {
    expect(updatePatientProfile).toBe(updateUserProfile);
  });

  it('deve lançar erro com dados de resposta da API em caso de falha', async () => {
    const errorData = { error: 'Dados inválidos' };
    const mockError = { response: { data: errorData } };
    axios.put.mockRejectedValue(mockError);

    await expect(updateUserProfile(profileData)).rejects.toEqual(errorData);
  });

  it('deve lançar um erro genérico se a resposta de erro da API for vazia', async () => {
    const mockGenericError = { error: 'Erro de rede' };
    axios.put.mockRejectedValue(mockGenericError);

    await expect(updateUserProfile(profileData)).rejects.toEqual({ error: 'Erro ao atualizar perfil' });
  });
});

// --- Testes para changePassword ---

describe('changePassword', () => {
  const passwordData = { oldPassword: '123', newPassword: '456' };
  const mockResponse = { message: 'Senha alterada com sucesso' };

  beforeEach(() => {
    mockSessionStorageGetItem.mockReturnValue(MOCK_TOKEN);
    axios.put.mockResolvedValue({ data: mockResponse });
  });

  it('deve fazer uma chamada PUT correta para /changePassword', async () => {
    await changePassword(passwordData);

    expect(axios.put).toHaveBeenCalledWith(
      `${API_URL}/changePassword`,
      passwordData,
      { headers: AUTH_HEADER }
    );
  });

  it('deve retornar os dados da resposta em caso de sucesso', async () => {
    const data = await changePassword(passwordData);
    expect(data).toEqual(mockResponse);
  });

  it('deve lançar erro com dados de resposta da API em caso de falha', async () => {
    const errorData = { error: 'Senha antiga incorreta' };
    const mockError = { response: { data: errorData } };
    axios.put.mockRejectedValue(mockError);

    await expect(changePassword(passwordData)).rejects.toEqual(errorData);
  });
});

// --- Testes para getUserProfile ---

describe('getUserProfile', () => {
  const mockProfile = { id: 1, name: 'João Silva', role: 'patient' };
  const mockResponse = { data: mockProfile };

  beforeEach(() => {
    mockSessionStorageGetItem.mockReturnValue(MOCK_TOKEN);
    axios.get.mockResolvedValue({ data: mockResponse });
  });

  it('deve fazer uma chamada GET correta para /getProfile', async () => {
    await getUserProfile();

    expect(axios.get).toHaveBeenCalledWith(
      `${API_URL}/getProfile`,
      { headers: AUTH_HEADER }
    );
  });

  it('deve retornar os dados da resposta em caso de sucesso', async () => {
    const data = await getUserProfile();
    expect(data).toEqual(mockResponse);
  });

  it('deve lançar um erro genérico se a busca falhar', async () => {
    const mockError = { error: 'Erro de rede ou permissão' };
    axios.get.mockRejectedValue(mockError);

    await expect(getUserProfile()).rejects.toEqual({ error: 'Erro ao buscar perfil' });
  });
});