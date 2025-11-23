import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  enviarAlerta, 
  listarAlertasEnviados, 
  buscarAlerta, 
  obterEstatisticas 
} from './alertaMedico'; // Importa as funções do serviço

// --- Mocks Globais ---

// 1. Mock de Storage (sessionStorage e localStorage) para simular o token
const mockStorageGetItem = vi.fn();

Object.defineProperty(global, 'sessionStorage', {
  value: { getItem: mockStorageGetItem },
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: { getItem: mockStorageGetItem },
  writable: true,
  configurable: true,
});

// 2. Mock do fetch global
const createFetchResponse = (data, { status = 200, ok = true } = {}) => ({ 
  json: () => new Promise(resolve => resolve(data)), 
  status,
  ok 
});

global.fetch = vi.fn();

// 3. Mock do console para silenciar logs durante o teste
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

// --- Configuração ---

const API_BASE_URL = 'https://dialyhome.com.br/api';
const MOCK_TOKEN = 'mock-auth-token-xyz';
const AUTH_HEADER = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${MOCK_TOKEN}`
};

beforeEach(() => {
  vi.clearAllMocks();
  // Assume que o token está sempre no sessionStorage.token, a menos que seja sobrescrito no teste
  mockStorageGetItem.mockImplementation((key) => {
    if (key === 'token') return MOCK_TOKEN;
    return null;
  });
});

// --- Testes de Autenticação (getAuthHeaders) ---

describe('getAuthHeaders', () => {
    it('deve lançar um erro se nenhum token for encontrado', async () => {
        // Zera todos os tokens em ambos os storages
        mockStorageGetItem.mockReturnValue(null);
        
        // Chamada à função que internamente chama getAuthHeaders
        await expect(buscarAlerta(1)).rejects.toHaveProperty('error', 'Token de autenticação não encontrado');
    });
});


// --- Testes para enviarAlerta ---

describe('enviarAlerta', () => {
  const defaultPayload = {
    pacienteId: 101,
    mensagem: 'Mensagem de teste com mais de dez caracteres.',
    email: 'paciente@test.com'
  };

  const expectedBody = {
    paciente_id: 101,
    mensagem: 'Mensagem de teste com mais de dez caracteres.',
    email: 'paciente@test.com'
  };

  it('deve enviar um alerta com sucesso usando o NOVO formato de objeto', async () => {
    const mockResponse = { success: true, id: 1 };
    global.fetch.mockResolvedValue(createFetchResponse(mockResponse));

    const result = await enviarAlerta(defaultPayload);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/medico/alertas/enviar`,
      expect.objectContaining({
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify(expectedBody),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('deve enviar um alerta com sucesso usando o formato ANTIGO de parâmetros', async () => {
    const mockResponse = { success: true, id: 2 };
    global.fetch.mockResolvedValue(createFetchResponse(mockResponse));

    const result = await enviarAlerta(defaultPayload.pacienteId, defaultPayload.mensagem, defaultPayload.email);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/medico/alertas/enviar`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(expectedBody),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  // --- Testes de Validação ---

  it('deve lançar erro se o ID do paciente estiver ausente (formato novo)', async () => {
    await expect(enviarAlerta({ ...defaultPayload, pacienteId: null })).rejects.toHaveProperty('error', 'ID do paciente é obrigatório');
  });

  it('deve lançar erro se a mensagem tiver menos de 10 caracteres', async () => {
    await expect(enviarAlerta({ ...defaultPayload, mensagem: 'Curta' })).rejects.toHaveProperty('error', 'Mensagem deve ter no mínimo 10 caracteres');
  });

  it('deve lançar erro se o email do paciente estiver ausente', async () => {
    await expect(enviarAlerta({ ...defaultPayload, email: '' })).rejects.toHaveProperty('error', 'Email do paciente é obrigatório');
  });
  
  // --- Teste de Falha da API ---
  
  it('deve lançar erro com a mensagem da API em caso de response.ok=false', async () => {
    const apiError = { error: 'Alerta não permitido' };
    global.fetch.mockResolvedValue(createFetchResponse(apiError, { status: 403, ok: false }));

    await expect(enviarAlerta(defaultPayload)).rejects.toHaveProperty('error', apiError.error);
  });
});

// --- Testes para listarAlertasEnviados ---

describe('listarAlertasEnviados', () => {
  it('deve fazer uma chamada GET correta sem parâmetros', async () => {
    const mockResponse = { total: 5, alertas: [] };
    global.fetch.mockResolvedValue(createFetchResponse(mockResponse));

    await listarAlertasEnviados({});

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/medico/alertas/enviados`,
      expect.objectContaining({ method: 'GET', headers: AUTH_HEADER })
    );
  });

  it('deve fazer uma chamada GET com todos os parâmetros de query', async () => {
    const params = { limite: 20, pagina: 2, paciente_id: 50 };
    const mockResponse = { total: 100, alertas: [{ id: 10 }] };
    global.fetch.mockResolvedValue(createFetchResponse(mockResponse));

    await listarAlertasEnviados(params);

    const expectedUrl = `${API_BASE_URL}/medico/alertas/enviados?limite=20&pagina=2&paciente_id=50`;

    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('deve lançar erro em caso de falha na listagem', async () => {
    const apiError = { error: 'Permissão negada' };
    global.fetch.mockResolvedValue(createFetchResponse(apiError, { status: 401, ok: false }));

    await expect(listarAlertasEnviados()).rejects.toHaveProperty('error', apiError.error);
  });
});


// --- Testes para buscarAlerta ---

describe('buscarAlerta', () => {
  const ALERTA_ID = 42;
  
  it('deve fazer uma chamada GET correta para um alerta específico', async () => {
    const mockResponse = { id: ALERTA_ID, mensagem: 'Urgente' };
    global.fetch.mockResolvedValue(createFetchResponse(mockResponse));

    const result = await buscarAlerta(ALERTA_ID);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/medico/alertas/${ALERTA_ID}`,
      expect.objectContaining({ method: 'GET', headers: AUTH_HEADER })
    );
    expect(result).toEqual(mockResponse);
  });

  it('deve lançar erro se o ID do alerta for ausente', async () => {
    await expect(buscarAlerta(null)).rejects.toHaveProperty('error', 'ID do alerta é obrigatório');
  });

  it('deve lançar erro em caso de falha na busca', async () => {
    const apiError = { message: 'Alerta não encontrado' };
    global.fetch.mockResolvedValue(createFetchResponse(apiError, { status: 404, ok: false }));

    await expect(buscarAlerta(ALERTA_ID)).rejects.toHaveProperty('error', apiError.message);
  });
});


// --- Testes para obterEstatisticas ---

describe('obterEstatisticas', () => {
  it('deve fazer uma chamada GET correta sem parâmetros', async () => {
    const mockResponse = { total: 100, media_por_dia: 5 };
    global.fetch.mockResolvedValue(createFetchResponse(mockResponse));

    await obterEstatisticas({});

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/medico/alertas/estatisticas`,
      expect.objectContaining({ method: 'GET', headers: AUTH_HEADER })
    );
  });

  it('deve fazer uma chamada GET com parâmetros de data', async () => {
    const params = { data_inicio: '2024-01-01', data_fim: '2024-01-31' };
    const mockResponse = { total: 30, media_por_dia: 1 };
    global.fetch.mockResolvedValue(createFetchResponse(mockResponse));

    await obterEstatisticas(params);

    const expectedUrl = `${API_BASE_URL}/medico/alertas/estatisticas?data_inicio=2024-01-01&data_fim=2024-01-31`;

    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({ method: 'GET' })
    );
  });
});