import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enviarAlerta,
  listarAlertasEnviados,
  buscarAlerta,
  obterEstatisticas
} from '../services/alertaMedico';

// Mock do fetch global
globalThis.fetch = vi.fn();

// Mock das variáveis de ambiente
vi.mock('import.meta', () => ({
  env: {
    VITE_API_URL: 'https://dialyhome.com.br/api'
  }
}));

describe('alertaMedico Service - Testes Unitários', () => {
  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    vi.clearAllMocks();
    
    // Limpa storage
    sessionStorage.clear();
    localStorage.clear();
    
    // Configura token padrão
    sessionStorage.setItem('token', 'mock-token-123');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthToken', () => {
    it('deve obter token do sessionStorage (token)', () => {
      sessionStorage.setItem('token', 'session-token');
      
      // Trigger a função indiretamente através de uma chamada
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      enviarAlerta({ pacienteId: 1, mensagem: 'Teste teste teste', email: 'test@test.com' });
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer session-token'
          })
        })
      );
    });

    it('deve obter token do sessionStorage (accessToken)', () => {
      sessionStorage.removeItem('token');
      sessionStorage.setItem('accessToken', 'access-token');
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      enviarAlerta({ pacienteId: 1, mensagem: 'Teste teste teste', email: 'test@test.com' });
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer access-token'
          })
        })
      );
    });

    it('deve obter token do localStorage como fallback', () => {
      sessionStorage.clear();
      localStorage.setItem('token', 'local-token');
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      enviarAlerta({ pacienteId: 1, mensagem: 'Teste teste teste', email: 'test@test.com' });
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer local-token'
          })
        })
      );
    });

    it('deve lançar erro quando não há token', async () => {
      sessionStorage.clear();
      localStorage.clear();

      await expect(
        enviarAlerta({ pacienteId: 1, mensagem: 'Teste teste teste', email: 'test@test.com' })
      ).rejects.toMatchObject({
        error: 'Token de autenticação não encontrado'
      });
    });
  });

  describe('enviarAlerta', () => {
    describe('Formato Novo - Objeto como parâmetro', () => {
      it('deve enviar alerta com sucesso usando formato novo', async () => {
        const mockResponse = {
          success: true,
          alerta: {
            id: 1,
            paciente_id: 10,
            mensagem: 'Alerta de teste com texto suficiente',
            email: 'paciente@test.com',
            enviado_em: '2024-11-24T10:00:00Z'
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse
        });

        const result = await enviarAlerta({
          pacienteId: 10,
          mensagem: 'Alerta de teste com texto suficiente',
          email: 'paciente@test.com'
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
          'https://dialyhome.com.br/api/medico/alertas/enviar',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-token-123'
            },
            body: JSON.stringify({
              paciente_id: 10,
              mensagem: 'Alerta de teste com texto suficiente',
              email: 'paciente@test.com'
            })
          }
        );

        expect(result).toEqual(mockResponse);
      });

      it('deve remover espaços em branco da mensagem', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        await enviarAlerta({
          pacienteId: 10,
          mensagem: '  Mensagem com espaços extras  ',
          email: 'test@test.com'
        });

        const callBody = JSON.parse(fetch.mock.calls[0][1].body);
        expect(callBody.mensagem).toBe('Mensagem com espaços extras');
      });

      it('deve validar pacienteId obrigatório', async () => {
        await expect(
          enviarAlerta({
            mensagem: 'Teste teste teste',
            email: 'test@test.com'
          })
        ).rejects.toMatchObject({
          error: 'ID do paciente é obrigatório'
        });
      });

      it('deve validar mensagem mínima de 10 caracteres', async () => {
        await expect(
          enviarAlerta({
            pacienteId: 10,
            mensagem: 'Curto',
            email: 'test@test.com'
          })
        ).rejects.toMatchObject({
          error: 'Mensagem deve ter no mínimo 10 caracteres'
        });
      });

      it('deve validar mensagem não vazia', async () => {
        await expect(
          enviarAlerta({
            pacienteId: 10,
            mensagem: '',
            email: 'test@test.com'
          })
        ).rejects.toMatchObject({
          error: 'Mensagem deve ter no mínimo 10 caracteres'
        });
      });

      it('deve validar mensagem não apenas espaços', async () => {
        await expect(
          enviarAlerta({
            pacienteId: 10,
            mensagem: '     ',
            email: 'test@test.com'
          })
        ).rejects.toMatchObject({
          error: 'Mensagem deve ter no mínimo 10 caracteres'
        });
      });

      it('deve validar email obrigatório', async () => {
        await expect(
          enviarAlerta({
            pacienteId: 10,
            mensagem: 'Teste teste teste'
          })
        ).rejects.toMatchObject({
          error: 'Email do paciente é obrigatório'
        });
      });

      it('deve tratar erro de resposta da API', async () => {
        const mockError = {
          error: 'Email inválido',
          message: 'Formato de email inválido'
        };

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => mockError
        });

        await expect(
          enviarAlerta({
            pacienteId: 10,
            mensagem: 'Teste teste teste',
            email: 'invalid-email'
          })
        ).rejects.toMatchObject({
          error: 'Email inválido'
        });
      });

      it('deve tratar erro de rede', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(
          enviarAlerta({
            pacienteId: 10,
            mensagem: 'Teste teste teste',
            email: 'test@test.com'
          })
        ).rejects.toMatchObject({
          error: 'Network error'
        });
      });

      it('deve tratar erro sem mensagem específica', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({})
        });

        await expect(
          enviarAlerta({
            pacienteId: 10,
            mensagem: 'Teste teste teste',
            email: 'test@test.com'
          })
        ).rejects.toMatchObject({
          error: 'Erro ao enviar alerta'
        });
      });
    });

    describe('Formato Antigo - Parâmetros separados (compatibilidade)', () => {
      it('deve enviar alerta com sucesso usando formato antigo', async () => {
        const mockResponse = {
          success: true,
          alerta: {
            id: 1,
            paciente_id: 10,
            mensagem: 'Alerta formato antigo com texto',
            email: 'paciente@test.com'
          }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse
        });

        const result = await enviarAlerta(
          10,
          'Alerta formato antigo com texto',
          'paciente@test.com'
        );

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResponse);
      });

      it('deve validar parâmetros no formato antigo', async () => {
        await expect(
          enviarAlerta(null, 'Teste teste teste', 'test@test.com')
        ).rejects.toMatchObject({
          error: 'ID do paciente é obrigatório'
        });

        await expect(
          enviarAlerta(10, 'Curto', 'test@test.com')
        ).rejects.toMatchObject({
          error: 'Mensagem deve ter no mínimo 10 caracteres'
        });

        await expect(
          enviarAlerta(10, 'Teste teste teste', null)
        ).rejects.toMatchObject({
          error: 'Email do paciente é obrigatório'
        });
      });
    });

    describe('Console Logs', () => {
      it('deve fazer log do início do envio', async () => {
        const consoleSpy = vi.spyOn(console, 'log');

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        await enviarAlerta({
          pacienteId: 10,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          '📧 Service enviarAlerta - Enviando...',
          expect.objectContaining({
            pacienteId: 10,
            mensagem: 'Teste teste teste',
            email: 'test@test.com'
          })
        );

        consoleSpy.mockRestore();
      });

      it('deve fazer log da resposta', async () => {
        const consoleSpy = vi.spyOn(console, 'log');

        fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        });

        await enviarAlerta({
          pacienteId: 10,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          '📧 Service enviarAlerta - Resposta:',
          expect.objectContaining({
            status: 200,
            data: { success: true }
          })
        );

        consoleSpy.mockRestore();
      });

      it('deve fazer log de sucesso', async () => {
        const consoleSpy = vi.spyOn(console, 'log');

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        await enviarAlerta({
          pacienteId: 10,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        });

        expect(consoleSpy).toHaveBeenCalledWith('✅ Alerta enviado com sucesso!');

        consoleSpy.mockRestore();
      });

      it('deve fazer log de erro', async () => {
        const consoleSpy = vi.spyOn(console, 'error');

        fetch.mockRejectedValueOnce(new Error('Erro de teste'));

        await expect(
          enviarAlerta({
            pacienteId: 10,
            mensagem: 'Teste teste teste',
            email: 'test@test.com'
          })
        ).rejects.toBeDefined();

        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ Service enviarAlerta - Erro:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('listarAlertasEnviados', () => {
    it('deve listar alertas sem parâmetros', async () => {
      const mockResponse = {
        alertas: [
          { id: 1, mensagem: 'Alerta 1', paciente_id: 10 },
          { id: 2, mensagem: 'Alerta 2', paciente_id: 11 }
        ],
        total: 2,
        pagina: 1
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await listarAlertasEnviados();

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/enviados',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token-123'
          }
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('deve listar alertas com limite', async () => {
      const mockResponse = {
        alertas: [],
        total: 0,
        pagina: 1
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await listarAlertasEnviados({ limite: 10 });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/enviados?limite=10',
        expect.any(Object)
      );
    });

    it('deve listar alertas com paginação', async () => {
      const mockResponse = {
        alertas: [],
        total: 0,
        pagina: 2
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await listarAlertasEnviados({ limite: 10, pagina: 2 });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/enviados?limite=10&pagina=2',
        expect.any(Object)
      );
    });

    it('deve filtrar alertas por paciente', async () => {
      const mockResponse = {
        alertas: [
          { id: 1, mensagem: 'Alerta 1', paciente_id: 10 }
        ],
        total: 1
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await listarAlertasEnviados({ paciente_id: 10 });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/enviados?paciente_id=10',
        expect.any(Object)
      );
    });

    it('deve listar alertas com todos os parâmetros', async () => {
      const mockResponse = {
        alertas: [],
        total: 0
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await listarAlertasEnviados({
        limite: 5,
        pagina: 3,
        paciente_id: 10
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/enviados?limite=5&pagina=3&paciente_id=10',
        expect.any(Object)
      );
    });

    it('deve tratar erro de resposta', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Parâmetros inválidos' })
      });

      await expect(listarAlertasEnviados()).rejects.toMatchObject({
        error: 'Parâmetros inválidos'
      });
    });

    it('deve tratar erro de rede', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(listarAlertasEnviados()).rejects.toMatchObject({
        error: 'Network error'
      });
    });

    it('deve fazer log de erro', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      fetch.mockRejectedValueOnce(new Error('Erro de teste'));

      await expect(listarAlertasEnviados()).rejects.toBeDefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro ao listar alertas:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('deve ignorar parâmetros undefined ou null', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alertas: [] })
      });

      await listarAlertasEnviados({
        limite: undefined,
        pagina: null,
        paciente_id: 10
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/enviados?paciente_id=10',
        expect.any(Object)
      );
    });
  });

  describe('buscarAlerta', () => {
    it('deve buscar alerta por ID com sucesso', async () => {
      const mockResponse = {
        alerta: {
          id: 1,
          paciente_id: 10,
          mensagem: 'Alerta específico',
          email: 'test@test.com',
          enviado_em: '2024-11-24T10:00:00Z',
          lido: false
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await buscarAlerta(1);

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/1',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token-123'
          }
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('deve validar ID obrigatório', async () => {
      await expect(buscarAlerta(null)).rejects.toMatchObject({
        error: 'ID do alerta é obrigatório'
      });

      await expect(buscarAlerta(undefined)).rejects.toMatchObject({
        error: 'ID do alerta é obrigatório'
      });

      await expect(buscarAlerta(0)).rejects.toMatchObject({
        error: 'ID do alerta é obrigatório'
      });
    });

    it('deve tratar erro quando alerta não encontrado', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Alerta não encontrado' })
      });

      await expect(buscarAlerta(999)).rejects.toMatchObject({
        error: 'Alerta não encontrado'
      });
    });

    it('deve tratar erro de resposta genérico', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      await expect(buscarAlerta(1)).rejects.toMatchObject({
        error: 'Erro ao buscar alerta'
      });
    });

    it('deve tratar erro de rede', async () => {
      fetch.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(buscarAlerta(1)).rejects.toMatchObject({
        error: 'Connection timeout'
      });
    });

    it('deve fazer log de erro', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      fetch.mockRejectedValueOnce(new Error('Erro de teste'));

      await expect(buscarAlerta(1)).rejects.toBeDefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro ao buscar alerta:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('deve aceitar IDs como string e converter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerta: { id: 1 } })
      });

      await buscarAlerta('1');

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/1',
        expect.any(Object)
      );
    });
  });

  describe('obterEstatisticas', () => {
    it('deve obter estatísticas sem parâmetros', async () => {
      const mockResponse = {
        total_alertas: 50,
        alertas_lidos: 30,
        alertas_nao_lidos: 20,
        taxa_leitura: 0.6
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await obterEstatisticas();

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/estatisticas',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token-123'
          }
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('deve obter estatísticas com data de início', async () => {
      const mockResponse = {
        total_alertas: 25,
        periodo: {
          inicio: '2024-01-01',
          fim: null
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await obterEstatisticas({ data_inicio: '2024-01-01' });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/estatisticas?data_inicio=2024-01-01',
        expect.any(Object)
      );
    });

    it('deve obter estatísticas com data de fim', async () => {
      const mockResponse = {
        total_alertas: 30,
        periodo: {
          inicio: null,
          fim: '2024-12-31'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await obterEstatisticas({ data_fim: '2024-12-31' });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/estatisticas?data_fim=2024-12-31',
        expect.any(Object)
      );
    });

    it('deve obter estatísticas com período completo', async () => {
      const mockResponse = {
        total_alertas: 100,
        periodo: {
          inicio: '2024-01-01',
          fim: '2024-12-31'
        },
        media_diaria: 0.27
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await obterEstatisticas({
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31'
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/estatisticas?data_inicio=2024-01-01&data_fim=2024-12-31',
        expect.any(Object)
      );
    });

    it('deve tratar erro de resposta', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Período inválido' })
      });

      await expect(
        obterEstatisticas({ data_inicio: 'invalid-date' })
      ).rejects.toMatchObject({
        error: 'Período inválido'
      });
    });

    it('deve tratar erro genérico', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      await expect(obterEstatisticas()).rejects.toMatchObject({
        error: 'Erro ao obter estatísticas'
      });
    });

    it('deve tratar erro de rede', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(obterEstatisticas()).rejects.toMatchObject({
        error: 'Network error'
      });
    });

    it('deve fazer log de erro', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      fetch.mockRejectedValueOnce(new Error('Erro de teste'));

      await expect(obterEstatisticas()).rejects.toBeDefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro ao obter estatísticas:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('deve ignorar parâmetros undefined', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_alertas: 0 })
      });

      await obterEstatisticas({
        data_inicio: undefined,
        data_fim: '2024-12-31'
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/estatisticas?data_fim=2024-12-31',
        expect.any(Object)
      );
    });
  });

  describe('Exportação Default', () => {
    it('deve exportar todas as funções no objeto default', async () => {
      const defaultExport = await import('../services/alertaMedico');
      
      expect(defaultExport.default).toBeDefined();
      expect(defaultExport.default.enviarAlerta).toBe(enviarAlerta);
      expect(defaultExport.default.listarAlertasEnviados).toBe(listarAlertasEnviados);
      expect(defaultExport.default.buscarAlerta).toBe(buscarAlerta);
      expect(defaultExport.default.obterEstatisticas).toBe(obterEstatisticas);
    });
  });

  describe('Testes de Integração - Fluxos Completos', () => {
    it('deve realizar fluxo completo: enviar, listar e buscar alerta', async () => {
      // 1. Enviar alerta
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alerta: { id: 1, mensagem: 'Teste completo aqui' }
        })
      });

      const envioResult = await enviarAlerta({
        pacienteId: 10,
        mensagem: 'Teste completo aqui',
        email: 'test@test.com'
      });

      expect(envioResult.alerta.id).toBe(1);

      // 2. Listar alertas
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          alertas: [{ id: 1, mensagem: 'Teste completo aqui' }],
          total: 1
        })
      });

      const listaResult = await listarAlertasEnviados({ limite: 10 });
      expect(listaResult.alertas).toHaveLength(1);

      // 3. Buscar alerta específico
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          alerta: { id: 1, mensagem: 'Teste completo aqui', lido: false }
        })
      });

      const buscaResult = await buscarAlerta(1);
      expect(buscaResult.alerta.id).toBe(1);
    });

    it('deve realizar fluxo de estatísticas após envios', async () => {
      // Enviar múltiplos alertas
      for (let i = 0; i < 3; i++) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, alerta: { id: i + 1 } })
        });

        await enviarAlerta({
          pacienteId: 10,
          mensagem: `Alerta número ${i + 1} com texto`,
          email: 'test@test.com'
        });
      }

      // Obter estatísticas
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_alertas: 3,
          alertas_lidos: 0,
          alertas_nao_lidos: 3
        })
      });

      const stats = await obterEstatisticas();
      expect(stats.total_alertas).toBe(3);
    });
  });

  describe('Testes de Borda e Casos Especiais', () => {
    it('deve lidar com resposta JSON malformada', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        })
      ).rejects.toMatchObject({
        error: 'Invalid JSON'
      });
    });

    it('deve lidar com IDs muito grandes', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ alerta: { id: 999999999 } })
      });

      const result = await buscarAlerta(999999999);
      expect(result.alerta.id).toBe(999999999);
    });

    it('deve lidar com mensagem no limite mínimo (10 caracteres)', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: '1234567890', // Exatamente 10 caracteres
          email: 'test@test.com'
        })
      ).resolves.toBeDefined();
    });

    it('deve lidar com mensagem muito longa', async () => {
      const longMessage = 'A'.repeat(1000) + ' mensagem longa aqui';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: longMessage,
          email: 'test@test.com'
        })
      ).resolves.toBeDefined();

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.mensagem.length).toBeGreaterThan(1000);
    });

    it('deve lidar com caracteres especiais na mensagem', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const specialMessage = 'Teste com áçêntôs e símbolos: @#$%&*()';
      
      await enviarAlerta({
        pacienteId: 10,
        mensagem: specialMessage,
        email: 'test@test.com'
      });

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.mensagem).toBe(specialMessage);
    });

    it('deve lidar com email em diferentes formatos', async () => {
      const emails = [
        'test@test.com',
        'test.user@test.co.uk',
        'test+tag@test.com',
        'test_user@test-domain.com'
      ];

      for (const email of emails) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        await expect(
          enviarAlerta({
            pacienteId: 10,
            mensagem: 'Teste teste teste',
            email
          })
        ).resolves.toBeDefined();
      }
    });

    it('deve lidar com respostas vazias', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      });

      const result = await listarAlertasEnviados();
      expect(result).toBeNull();
    });

    it('deve lidar com timeout de rede', async () => {
      fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        })
      ).rejects.toMatchObject({
        error: 'Timeout'
      });
    });
  });

  describe('Testes de Segurança', () => {
    it('deve incluir Bearer token em todas as requisições', async () => {
      const endpoints = [
        { func: enviarAlerta, args: [{ pacienteId: 1, mensagem: 'Test message here', email: 'test@test.com' }] },
        { func: listarAlertasEnviados, args: [] },
        { func: buscarAlerta, args: [1] },
        { func: obterEstatisticas, args: [] }
      ];

      for (const { func, args } of endpoints) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({})
        });

        await func(...args);

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token-123'
            })
          })
        );

        vi.clearAllMocks();
      }
    });

    it('deve incluir Content-Type correto em todas as requisições', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await enviarAlerta({
        pacienteId: 10,
        mensagem: 'Teste teste teste',
        email: 'test@test.com'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('não deve expor token em logs de erro', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      fetch.mockRejectedValueOnce(new Error('Erro de autenticação'));

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        })
      ).rejects.toBeDefined();

      const errorCalls = consoleSpy.mock.calls;
      errorCalls.forEach(call => {
        const callString = JSON.stringify(call);
        expect(callString).not.toContain('mock-token-123');
      });

      consoleSpy.mockRestore();
    });

    it('deve falhar sem token mesmo com credenciais válidas', async () => {
      sessionStorage.clear();
      localStorage.clear();

      await expect(
        enviarAlerta({
          pacienteId: 10,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        })
      ).rejects.toMatchObject({
        error: 'Token de autenticação não encontrado'
      });

      // Não deve fazer chamada ao servidor
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Testes de Performance e Concorrência', () => {
    it('deve lidar com múltiplas requisições simultâneas', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, id: i })
        });

        promises.push(
          enviarAlerta({
            pacienteId: 10 + i,
            mensagem: `Alerta ${i} com texto suficiente`,
            email: `test${i}@test.com`
          })
        );
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(fetch).toHaveBeenCalledTimes(5);
    });

    it('deve lidar com requisições que falham e outras que funcionam', async () => {
      const promises = [];

      // Primeira falha
      fetch.mockRejectedValueOnce(new Error('Erro 1'));
      promises.push(
        enviarAlerta({
          pacienteId: 1,
          mensagem: 'Teste teste teste',
          email: 'test1@test.com'
        }).catch(e => ({ error: e.error }))
      );

      // Segunda sucesso
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      promises.push(
        enviarAlerta({
          pacienteId: 2,
          mensagem: 'Teste teste teste',
          email: 'test2@test.com'
        })
      );

      // Terceira falha
      fetch.mockRejectedValueOnce(new Error('Erro 2'));
      promises.push(
        enviarAlerta({
          pacienteId: 3,
          mensagem: 'Teste teste teste',
          email: 'test3@test.com'
        }).catch(e => ({ error: e.error }))
      );

      const results = await Promise.all(promises);

      expect(results[0]).toHaveProperty('error');
      expect(results[1]).toHaveProperty('success');
      expect(results[2]).toHaveProperty('error');
    });
  });

  describe('Testes de URLs e Endpoints', () => {
    it('deve usar URL correta para enviar alerta', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await enviarAlerta({
        pacienteId: 10,
        mensagem: 'Teste teste teste',
        email: 'test@test.com'
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/enviar',
        expect.any(Object)
      );
    });

    it('deve usar URL correta para listar alertas', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await listarAlertasEnviados();

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/enviados',
        expect.any(Object)
      );
    });

    it('deve usar URL correta para buscar alerta', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await buscarAlerta(123);

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/123',
        expect.any(Object)
      );
    });

    it('deve usar URL correta para estatísticas', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await obterEstatisticas();

      expect(fetch).toHaveBeenCalledWith(
        'https://dialyhome.com.br/api/medico/alertas/estatisticas',
        expect.any(Object)
      );
    });

    it('deve construir query strings corretamente', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await listarAlertasEnviados({
        limite: 20,
        pagina: 3,
        paciente_id: 15
      });

      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('limite=20');
      expect(calledUrl).toContain('pagina=3');
      expect(calledUrl).toContain('paciente_id=15');
      expect(calledUrl).toContain('&'); // Deve ter separadores
    });
  });

  describe('Testes de Compatibilidade de API', () => {
    it('deve enviar dados no formato esperado pelo backend', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await enviarAlerta({
        pacienteId: 10,
        mensagem: 'Teste teste teste',
        email: 'test@test.com'
      });

      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      
      expect(requestBody).toEqual({
        paciente_id: 10, // snake_case para o backend
        mensagem: 'Teste teste teste',
        email: 'test@test.com'
      });
    });

    it('deve usar método HTTP correto para cada operação', async () => {
      const operations = [
        { func: enviarAlerta, args: [{ pacienteId: 1, mensagem: 'Test message here', email: 'test@test.com' }], method: 'POST' },
        { func: listarAlertasEnviados, args: [], method: 'GET' },
        { func: buscarAlerta, args: [1], method: 'GET' },
        { func: obterEstatisticas, args: [], method: 'GET' }
      ];

      for (const { func, args, method } of operations) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({})
        });

        await func(...args);

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ method })
        );

        vi.clearAllMocks();
      }
    });
  });

  describe('Testes de Estrutura de Erro', () => {
    it('deve retornar estrutura de erro consistente', async () => {
      fetch.mockRejectedValueOnce(new Error('Erro de teste'));

      try {
        await enviarAlerta({
          pacienteId: 10,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        });
        expect.fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error).toHaveProperty('error');
        expect(error).toHaveProperty('details');
        expect(typeof error.error).toBe('string');
      }
    });

    it('deve preservar mensagem de erro da API', async () => {
      const apiError = 'Paciente não encontrado no sistema';
      
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: apiError })
      });

      try {
        await enviarAlerta({
          pacienteId: 999,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        });
        expect.fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.error).toBe(apiError);
      }
    });

    it('deve priorizar error sobre message na resposta', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Erro principal',
          message: 'Mensagem secundária'
        })
      });

      try {
        await enviarAlerta({
          pacienteId: 10,
          mensagem: 'Teste teste teste',
          email: 'test@test.com'
        });
        expect.fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.error).toBe('Erro principal');
      }
    });
  });
});