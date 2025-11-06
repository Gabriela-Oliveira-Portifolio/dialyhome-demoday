// backend/src/__tests__/controllers/dialysisController.test.js

// Mock do database ANTES de importar o controller
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

const db = require('../../src/config/database');
const {
  createRecord,
  getRecords,
  getStats,
  getRecordById,
  updateRecord,
  deleteRecord
} = require('../../src/controllers/dialysisController');

describe('DialysisController - Unit Tests', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock padrão de req e res
    mockReq = {
      user: { id: 1, tipo_usuario: 'paciente' },
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Silenciar console.log e console.error nos testes
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // ==================== CREATE RECORD ====================
  describe('createRecord', () => {
    test('deve criar registro de diálise com sucesso', async () => {
      mockReq.body = {
        pressaoSistolica: 120,
        pressaoDiastolica: 80,
        drenagemInicial: 2.0,
        ufTotal: 2.5,
        tempoPermanencia: 4.0,
        glicose: 100,
        dextrose: 1.5,
        observacoes: 'Sessão normal'
      };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Buscar paciente_id
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 10, 
            paciente_id: 1,
            pressao_arterial_sistolica: 120,
            pressao_arterial_diastolica: 80
          }] 
        }); // Insert registro

      await createRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Registro criado com sucesso',
        record: expect.objectContaining({
          id: 10,
          paciente_id: 1
        })
      });
    });

    test('deve retornar 404 se paciente não encontrado', async () => {
      mockReq.body = {
        pressaoSistolica: 120,
        pressaoDiastolica: 80
      };

      db.query.mockResolvedValueOnce({ rows: [] }); // Paciente não encontrado

      await createRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Paciente não encontrado' 
      });
    });

    test('deve retornar 400 se pressão arterial não fornecida', async () => {
      mockReq.body = {
        drenagemInicial: 2.0
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await createRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Pressão arterial é obrigatória' 
      });
    });

    test('deve converter litros para mililitros', async () => {
      mockReq.body = {
        pressaoSistolica: 120,
        pressaoDiastolica: 80,
        drenagemInicial: 2.0,
        ufTotal: 2.5
      };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] });

      await createRecord(mockReq, mockRes);

      // Verificar que os valores foram convertidos na query
      const insertCall = db.query.mock.calls[1];
      expect(insertCall[1][3]).toBe(2000); // drenagemInicial em mL
      expect(insertCall[1][4]).toBe(2500); // ufTotal em mL
    });

    test('deve converter horas para minutos', async () => {
      mockReq.body = {
        pressaoSistolica: 120,
        pressaoDiastolica: 80,
        tempoPermanencia: 4.5
      };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] });

      await createRecord(mockReq, mockRes);

      const insertCall = db.query.mock.calls[1];
      expect(insertCall[1][5]).toBe(270); // 4.5 * 60 = 270 minutos
    });

    test('deve tratar erro no banco de dados', async () => {
      mockReq.body = {
        pressaoSistolica: 120,
        pressaoDiastolica: 80
      };

      db.query.mockRejectedValueOnce(new Error('Database error'));

      await createRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro ao criar registro de diálise',
        details: 'Database error'
      });
    });
  });

  // ==================== GET RECORDS ====================
  describe('getRecords', () => {
    test('deve retornar lista de registros', async () => {
      mockReq.query = { limit: 10, offset: 0 };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Buscar paciente_id
        .mockResolvedValueOnce({ 
          rows: [
            { 
              id: 1, 
              data_registro: '2025-01-15',
              pressao_arterial_sistolica: 120,
              pressao_arterial_diastolica: 80,
              tempo_permanencia: 240
            }
          ] 
        }); // Buscar registros

      await getRecords(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        records: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            tempo_permanencia: '4.0' // 240 / 60 = 4.0 horas
          })
        ])
      });
    });

    test('deve usar valores padrão para limit e offset', async () => {
      mockReq.query = {}; // Sem limit e offset

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      await getRecords(mockReq, mockRes);

      const selectCall = db.query.mock.calls[1];
      expect(selectCall[1][1]).toBe(10); // limit padrão
      expect(selectCall[1][2]).toBe(0);  // offset padrão
    });

    test('deve retornar 404 se paciente não encontrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await getRecords(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Paciente não encontrado' 
      });
    });

    test('deve converter tempo de minutos para horas', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ 
          rows: [
            { id: 1, tempo_permanencia: 300 }, // 5 horas em minutos
            { id: 2, tempo_permanencia: null }
          ] 
        });

      await getRecords(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        records: [
          expect.objectContaining({ tempo_permanencia: '5.0' }),
          expect.objectContaining({ tempo_permanencia: null })
        ]
      });
    });

    test('deve tratar erro no banco de dados', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await getRecords(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Erro ao buscar registros' 
      });
    });
  });

  // ==================== GET STATS ====================
  describe('getStats', () => {
    test('deve retornar estatísticas do paciente', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Buscar paciente_id
        .mockResolvedValueOnce({ 
          rows: [{ 
            pressao_arterial_sistolica: 120,
            pressao_arterial_diastolica: 80,
            uf_total: 2500,
            concentracao_glicose: 100,
            tempo_permanencia: 240
          }] 
        }) // Último registro
        .mockResolvedValueOnce({ 
          rows: [{ 
            avg_sistolica: 125,
            avg_diastolica: 82,
            avg_uf: 2600,
            avg_glicose: 105
          }] 
        }); // Médias

      await getStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        stats: expect.objectContaining({
          pressaoArterial: expect.objectContaining({
            value: '120/80',
            unit: 'mmHg'
          }),
          ufTotal: expect.objectContaining({
            value: '2.5',
            unit: 'L'
          })
        }),
        averages: expect.objectContaining({
          sistolica: 125,
          diastolica: 82
        })
      });
    });

    test('deve retornar N/A quando não há registros', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] }) // Sem último registro
        .mockResolvedValueOnce({ rows: [{}] }); // Sem médias

      await getStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        stats: expect.objectContaining({
          pressaoArterial: expect.objectContaining({ value: 'N/A' }),
          ufTotal: expect.objectContaining({ value: 'N/A' })
        }),
        averages: expect.objectContaining({
          sistolica: null,
          diastolica: null
        })
      });
    });

    test('deve converter valores corretamente', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ 
          rows: [{ 
            uf_total: 3000,
            tempo_permanencia: 300
          }] 
        })
        .mockResolvedValueOnce({ rows: [{ avg_uf: 2800 }] });

      await getStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        stats: expect.objectContaining({
          ufTotal: expect.objectContaining({ value: '3.0' }), // 3000 mL = 3.0 L
          tempoPermanencia: expect.objectContaining({ value: '5.0' }) // 300 min = 5.0 h
        }),
        averages: expect.objectContaining({
          uf: '2.8' // 2800 mL = 2.8 L
        })
      });
    });

    test('deve tratar erro no banco de dados', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await getStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Erro ao buscar estatísticas' 
      });
    });
  });

  // ==================== GET RECORD BY ID ====================
  describe('getRecordById', () => {
    test('deve retornar registro específico', async () => {
      mockReq.params = { id: '10' };

      db.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 10, 
          paciente_id: 1,
          pressao_arterial_sistolica: 120
        }] 
      });

      await getRecordById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        record: expect.objectContaining({ id: 10 })
      });
    });

    test('deve retornar 404 se registro não encontrado', async () => {
      mockReq.params = { id: '999' };

      db.query.mockResolvedValueOnce({ rows: [] });

      await getRecordById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Registro não encontrado' 
      });
    });

    test('deve tratar erro no banco de dados', async () => {
      mockReq.params = { id: '10' };

      db.query.mockRejectedValueOnce(new Error('Database error'));

      await getRecordById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Erro ao buscar registro' 
      });
    });
  });

  // ==================== UPDATE RECORD ====================
  describe('updateRecord', () => {
    test('deve atualizar registro com sucesso', async () => {
      mockReq.params = { id: '10' };
      mockReq.body = {
        pressaoSistolica: 130,
        pressaoDiastolica: 85,
        observacoes: 'Atualizado'
      };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // Verificar existência
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 10, 
            pressao_arterial_sistolica: 130,
            observacoes: 'Atualizado'
          }] 
        }); // Update

      await updateRecord(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Registro atualizado com sucesso',
        record: expect.objectContaining({ id: 10 })
      });
    });

    test('deve retornar 404 se registro não encontrado', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { pressaoSistolica: 130 };

      db.query.mockResolvedValueOnce({ rows: [] });

      await updateRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Registro não encontrado' 
      });
    });

    test('deve converter tempo de horas para minutos', async () => {
      mockReq.params = { id: '10' };
      mockReq.body = { tempoPermanencia: 5.5 };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] });

      await updateRecord(mockReq, mockRes);

      const updateCall = db.query.mock.calls[1];
      expect(updateCall[1][4]).toBe(330); // 5.5 * 60 = 330 minutos
    });

    test('deve tratar erro no banco de dados', async () => {
      mockReq.params = { id: '10' };
      mockReq.body = { pressaoSistolica: 130 };

      db.query.mockRejectedValueOnce(new Error('Database error'));

      await updateRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Erro ao atualizar registro' 
      });
    });
  });

  // ==================== DELETE RECORD ====================
  describe('deleteRecord', () => {
    test('deve deletar registro com sucesso', async () => {
      mockReq.params = { id: '10' };

      db.query.mockResolvedValueOnce({ rows: [{ id: 10 }] });

      await deleteRecord(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'Registro deletado com sucesso' 
      });
    });

    test('deve retornar 404 se registro não encontrado', async () => {
      mockReq.params = { id: '999' };

      db.query.mockResolvedValueOnce({ rows: [] });

      await deleteRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Registro não encontrado' 
      });
    });

    test('deve tratar erro no banco de dados', async () => {
      mockReq.params = { id: '10' };

      db.query.mockRejectedValueOnce(new Error('Database error'));

      await deleteRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Erro ao deletar registro' 
      });
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    test('createRecord - deve aceitar valores decimais válidos', async () => {
      mockReq.body = {
        pressaoSistolica: 120,
        pressaoDiastolica: 80,
        glicose: 99.5,
        dextrose: 1.36
      };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] });

      await createRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    test('getRecords - deve lidar com tempo_permanencia null', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, tempo_permanencia: null }] 
        });

      await getRecords(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        records: [
          expect.objectContaining({ tempo_permanencia: null })
        ]
      });
    });

    test('updateRecord - deve permitir COALESCE para valores opcionais', async () => {
      mockReq.params = { id: '10' };
      mockReq.body = {}; // Nenhum campo para atualizar

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] });

      await updateRecord(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});