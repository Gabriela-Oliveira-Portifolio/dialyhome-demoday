// src/test/alertaMedico.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enviarAlerta,
  listarAlertasEnviados,
  buscarAlerta,
  obterEstatisticas
} from '../services/alertaMedico';

// Mock do fetch global
global.fetch = vi.fn();

describe('alertaMedico Service', () => {
  const mockToken = 'mock-jwt-token-12345';
  const API_URL = 'https://dialyhome.com.br/api';

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    vi.clearAllMocks();
    
    // Configura sessionStorage mock
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === 'token' || key === 'accessToken') return mockToken;
      return null;
    });
    
    // Suprime console nos testes
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== TESTES DE enviarAlerta ====================
  describe('enviarAlerta', () => {
    const mockSuccessResponse = {
      success: true,
      message: 'Alerta enviado com sucesso',
      alertaId: 123,
      emailEnviado: true
    };

    it('deve enviar alerta com formato novo (objeto)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      });

      const params = {
        pacienteId: 10,
        mensagem: 'Paciente apresenta sintomas preocupantes',
        email: 'paciente@test.com'
      };

      const result = await enviarAlerta(params);

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/enviar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`
          },
          body: JSON.stringify({
            paciente_id: 10,
            mensagem: 'Paciente apresenta sintomas preocupantes',
            email: 'paciente@test.com'
          })
        }
      );
      expect(result).toEqual(mockSuccessResponse);
    });

    it('deve enviar alerta com formato antigo (parâmetros separados)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      });

      const result = await enviarAlerta(
        10,
        'Paciente apresenta sintomas preocupantes',
        'paciente@test.com'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/enviar`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            paciente_id: 10,
            mensagem: 'Paciente apresenta sintomas preocupantes',
            email: 'paciente@test.com'
          })
        })
      );
      expect(result).toEqual(mockSuccessResponse);
    });

    it('deve remover espaços em branco da mensagem', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      });

      await enviarAlerta({
        pacienteId: 10,
        mensagem: '  Mensagem com espaços  ',
        email: 'test@test.com'
      });

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.mensagem).toBe('Mensagem com espaços');
    });

    it('deve lançar erro quando pacienteId não é fornecido', async () => {
      await expect(
        enviarAlerta({
          mensagem: 'Mensagem válida aqui',
          email: 'test@test.com'
        })
      ).rejects.toEqual({
        error: 'ID do paciente é obrigatório',
        details: expect.any(Error)
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando mensagem tem menos de 10 caracteres', async () => {
      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Curta',
          email: 'test@test.com'
        })
      ).rejects.toEqual({
        error: 'Mensagem deve ter no mínimo 10 caracteres',
        details: expect.any(Error)
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando mensagem está vazia ou só tem espaços', async () => {
      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: '     ',
          email: 'test@test.com'
        })
      ).rejects.toEqual({
        error: 'Mensagem deve ter no mínimo 10 caracteres',
        details: expect.any(Error)
      });
    });

    it('deve lançar erro quando email não é fornecido', async () => {
      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Mensagem válida com mais de 10 caracteres'
        })
      ).rejects.toEqual({
        error: 'Email do paciente é obrigatório',
        details: expect.any(Error)
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando token não está disponível', async () => {
      Storage.prototype.getItem = vi.fn(() => null);

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Mensagem válida',
          email: 'test@test.com'
        })
      ).rejects.toEqual({
        error: 'Token de autenticação não encontrado',
        details: expect.any(Error)
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando API retorna erro', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Email inválido' })
      });

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Mensagem válida',
          email: 'email-invalido'
        })
      ).rejects.toEqual({
        error: 'Email inválido',
        details: expect.any(Error)
      });
    });

    it('deve lançar erro genérico quando API não retorna mensagem específica', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Mensagem válida',
          email: 'test@test.com'
        })
      ).rejects.toEqual({
        error: 'Erro ao enviar alerta',
        details: expect.any(Error)
      });
    });

    it('deve tratar erro de rede', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Mensagem válida',
          email: 'test@test.com'
        })
      ).rejects.toEqual({
        error: 'Network error',
        details: expect.any(Error)
      });
    });

    it('deve aceitar mensagem com exatamente 10 caracteres', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      });

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: '1234567890',
          email: 'test@test.com'
        })
      ).resolves.toBeDefined();
    });
  });

  // ==================== TESTES DE listarAlertasEnviados ====================
  describe('listarAlertasEnviados', () => {
    const mockAlertas = {
      alertas: [
        {
          id: 1,
          paciente_id: 10,
          paciente_nome: 'João Silva',
          mensagem: 'Sintomas preocupantes',
          enviado_em: '2025-01-15T10:30:00Z',
          status: 'enviado'
        },
        {
          id: 2,
          paciente_id: 11,
          paciente_nome: 'Maria Santos',
          mensagem: 'Pressão alta detectada',
          enviado_em: '2025-01-14T15:20:00Z',
          status: 'lido'
        }
      ],
      total: 2,
      pagina: 1,
      limite: 10
    };

    it('deve listar alertas sem parâmetros', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertas
      });

      const result = await listarAlertasEnviados();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/enviados`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`
          }
        }
      );
      expect(result).toEqual(mockAlertas);
    });

    it('deve listar alertas com limite e página', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertas
      });

      await listarAlertasEnviados({ limite: 20, pagina: 2 });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/enviados?limite=20&pagina=2`,
        expect.any(Object)
      );
    });

    it('deve filtrar alertas por paciente_id', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockAlertas, alertas: [mockAlertas.alertas[0]] })
      });

      await listarAlertasEnviados({ paciente_id: 10 });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/enviados?paciente_id=10`,
        expect.any(Object)
      );
    });

    it('deve combinar múltiplos parâmetros de filtro', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlertas
      });

      await listarAlertasEnviados({ limite: 5, pagina: 3, paciente_id: 10 });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/enviados?limite=5&pagina=3&paciente_id=10`,
        expect.any(Object)
      );
    });

    it('deve lançar erro quando token não está disponível', async () => {
      Storage.prototype.getItem = vi.fn(() => null);

      await expect(listarAlertasEnviados()).rejects.toEqual({
        error: 'Token de autenticação não encontrado',
        details: expect.any(Error)
      });
    });

    it('deve lançar erro quando API retorna erro', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Acesso negado' })
      });

      await expect(listarAlertasEnviados()).rejects.toEqual({
        error: 'Acesso negado',
        details: expect.any(Error)
      });
    });

    it('deve lançar erro genérico quando API não retorna mensagem', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      await expect(listarAlertasEnviados()).rejects.toEqual({
        error: 'Erro ao listar alertas',
        details: expect.any(Error)
      });
    });
  });

  // ==================== TESTES DE buscarAlerta ====================
  describe('buscarAlerta', () => {
    const mockAlerta = {
      id: 1,
      paciente_id: 10,
      paciente_nome: 'João Silva',
      paciente_email: 'joao@test.com',
      mensagem: 'Sintomas preocupantes',
      enviado_em: '2025-01-15T10:30:00Z',
      status: 'enviado',
      medico_id: 5,
      medico_nome: 'Dr. Carlos'
    };

    it('deve buscar alerta por ID com sucesso', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerta
      });

      const result = await buscarAlerta(1);

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`
          }
        }
      );
      expect(result).toEqual(mockAlerta);
    });

    it('deve lançar erro quando alertaId não é fornecido', async () => {
      await expect(buscarAlerta()).rejects.toEqual({
        error: 'ID do alerta é obrigatório',
        details: expect.any(Error)
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando alertaId é null', async () => {
      await expect(buscarAlerta(null)).rejects.toEqual({
        error: 'ID do alerta é obrigatório',
        details: expect.any(Error)
      });
    });

    it('deve lançar erro quando alertaId é 0', async () => {
      await expect(buscarAlerta(0)).rejects.toEqual({
        error: 'ID do alerta é obrigatório',
        details: expect.any(Error)
      });
    });

    it('deve aceitar alertaId como string', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerta
      });

      await buscarAlerta('123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/123`,
        expect.any(Object)
      );
    });

    it('deve lançar erro quando alerta não é encontrado', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Alerta não encontrado' })
      });

      await expect(buscarAlerta(999)).rejects.toEqual({
        error: 'Alerta não encontrado',
        details: expect.any(Error)
      });
    });

    it('deve lançar erro quando token não está disponível', async () => {
      Storage.prototype.getItem = vi.fn(() => null);

      await expect(buscarAlerta(1)).rejects.toEqual({
        error: 'Token de autenticação não encontrado',
        details: expect.any(Error)
      });
    });
  });

  // ==================== TESTES DE obterEstatisticas ====================
  describe('obterEstatisticas', () => {
    const mockEstatisticas = {
      total_alertas: 45,
      alertas_mes_atual: 12,
      alertas_mes_anterior: 10,
      crescimento_percentual: 20,
      pacientes_alertados: 8,
      media_alertas_por_paciente: 5.6,
      distribuicao_por_mes: [
        { mes: '2025-01', total: 10 },
        { mes: '2025-02', total: 12 }
      ],
      alertas_por_status: {
        enviado: 30,
        lido: 12,
        respondido: 3
      }
    };

    it('deve obter estatísticas sem parâmetros', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstatisticas
      });

      const result = await obterEstatisticas();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/estatisticas`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`
          }
        }
      );
      expect(result).toEqual(mockEstatisticas);
    });

    it('deve obter estatísticas com data_inicio', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstatisticas
      });

      await obterEstatisticas({ data_inicio: '2025-01-01' });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/estatisticas?data_inicio=2025-01-01`,
        expect.any(Object)
      );
    });

    it('deve obter estatísticas com data_fim', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstatisticas
      });

      await obterEstatisticas({ data_fim: '2025-12-31' });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/estatisticas?data_fim=2025-12-31`,
        expect.any(Object)
      );
    });

    it('deve obter estatísticas com range de datas', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstatisticas
      });

      await obterEstatisticas({
        data_inicio: '2025-01-01',
        data_fim: '2025-12-31'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/medico/alertas/estatisticas?data_inicio=2025-01-01&data_fim=2025-12-31`,
        expect.any(Object)
      );
    });

    it('deve lançar erro quando API retorna erro', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Erro interno do servidor' })
      });

      await expect(obterEstatisticas()).rejects.toEqual({
        error: 'Erro interno do servidor',
        details: expect.any(Error)
      });
    });

    it('deve lançar erro genérico quando API não retorna mensagem', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      await expect(obterEstatisticas()).rejects.toEqual({
        error: 'Erro ao obter estatísticas',
        details: expect.any(Error)
      });
    });

    it('deve lançar erro quando token não está disponível', async () => {
      Storage.prototype.getItem = vi.fn(() => null);

      await expect(obterEstatisticas()).rejects.toEqual({
        error: 'Token de autenticação não encontrado',
        details: expect.any(Error)
      });
    });
  });

  // ==================== TESTES DE AUTENTICAÇÃO ====================
  describe('Autenticação e Headers', () => {
    // it('deve priorizar token do sessionStorage', async () => {
    //   sessionStorage.getItem = vi.fn((key) => {
    //     if (key === 'token') return 'session-token-123';
    //     return null;
    //   });
    //   localStorage.getItem = vi.fn((key) => {
    //     if (key === 'token') return 'local-token-456';
    //     return null;
    //   });

    //   global.fetch.mockResolvedValueOnce({
    //     ok: true,
    //     json: async () => ({ alertas: [] })
    //   });

    //   await listarAlertasEnviados();

    //   expect(global.fetch).toHaveBeenCalledWith(
    //     expect.any(String),
    //     expect.objectContaining({
    //       headers: expect.objectContaining({
    //         'Authorization': 'Bearer session-token-123'
    //       })
    //     })
    //   );
    // });

    // it('deve usar token do localStorage quando sessionStorage está vazio', async () => {
    //   sessionStorage.getItem = vi.fn(() => null);
    //   localStorage.getItem = vi.fn((key) => {
    //     if (key === 'token') return 'local-token-789';
    //     return null;
    //   });

    //   global.fetch.mockResolvedValueOnce({
    //     ok: true,
    //     json: async () => ({ alertas: [] })
    //   });

    //   await listarAlertasEnviados();

    //   expect(global.fetch).toHaveBeenCalledWith(
    //     expect.any(String),
    //     expect.objectContaining({
    //       headers: expect.objectContaining({
    //         'Authorization': 'Bearer local-token-789'
    //       })
    //     })
    //   );
    // });

    it('deve aceitar accessToken como alternativa', async () => {
      Storage.prototype.getItem = vi.fn((key) => {
        if (key === 'accessToken') return 'access-token-999';
        return null;
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alertas: [] })
      });

      await listarAlertasEnviados();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer access-token-999'
          })
        })
      );
    });

    it('deve incluir Content-Type em todas as requisições', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await listarAlertasEnviados();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  // ==================== TESTES DE EXPORTAÇÃO DEFAULT ====================
  describe('Exportação Default', () => {
    it('deve exportar todas as funções via default', async () => {
      const defaultExport = (await import('../services/alertaMedico')).default;

      expect(defaultExport).toHaveProperty('enviarAlerta');
      expect(defaultExport).toHaveProperty('listarAlertasEnviados');
      expect(defaultExport).toHaveProperty('buscarAlerta');
      expect(defaultExport).toHaveProperty('obterEstatisticas');
      
      expect(typeof defaultExport.enviarAlerta).toBe('function');
      expect(typeof defaultExport.listarAlertasEnviados).toBe('function');
      expect(typeof defaultExport.buscarAlerta).toBe('function');
      expect(typeof defaultExport.obterEstatisticas).toBe('function');
    });
  });
});