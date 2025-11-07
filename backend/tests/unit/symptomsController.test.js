// backend/src/__tests__/controllers/symptomsController.test.js
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

const db = require('../../src/config/database');
const symptomsController = require('../../src/controllers/symptomsController');

describe('symptomsController (unitário)', () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: 1 }, body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('getPredefinedSymptoms', () => {
    it('deve retornar sintomas agrupados por categoria', async () => {
      db.query.mockResolvedValue({
        rows: [
          { id: 1, nome: 'Náusea', categoria: 'Gastrointestinal', severidade_padrao: 'leve' },
          { id: 2, nome: 'Dor de cabeça', categoria: 'Neurológico', severidade_padrao: 'moderada' }
        ]
      });

      await symptomsController.getPredefinedSymptoms(req, res);

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM sintomas_predefinidos'));
      expect(res.json).toHaveBeenCalledWith({
        symptoms: expect.any(Array),
        grouped: expect.any(Object)
      });
    });

    it('deve retornar erro 500 se a query falhar', async () => {
      db.query.mockRejectedValue(new Error('Erro BD'));
      await symptomsController.getPredefinedSymptoms(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar sintomas' });
    });
  });

//   describe('registerSymptoms', () => {
//     it('deve retornar 400 se dados estiverem ausentes', async () => {
//       req.body = {};
//       await symptomsController.registerSymptoms(req, res);
//       expect(res.status).toHaveBeenCalledWith(400);
//     });

//     it('deve registrar sintomas corretamente', async () => {
//       req.body = {
//         registro_dialise_id: 10,
//         sintomas: [{ sintoma_id: 1, severidade: 'leve', observacoes: 'ok' }]
//       };

//       db.query
//         .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // paciente
//         .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // registro de diálise
//         .mockResolvedValueOnce({}) // delete sintomas
//         .mockResolvedValueOnce({ rows: [{ id: 1, sintoma_id: 1 }] }); // insert

//       await symptomsController.registerSymptoms(req, res);

//       expect(db.query).toHaveBeenCalledTimes(4);
//       expect(res.status).toHaveBeenCalledWith(201);
//       expect(res.json).toHaveBeenCalledWith(
//         expect.objectContaining({
//           message: 'Sintomas registrados com sucesso'
//         })
//       );
//     });

//     it('deve retornar 404 se paciente não encontrado', async () => {
//       db.query.mockResolvedValueOnce({ rows: [] });
//       await symptomsController.registerSymptoms(req, res);
//       expect(res.status).toHaveBeenCalledWith(404);
//     });

//     it('deve retornar 404 se registro de diálise não pertencer ao paciente', async () => {
//       db.query
//         .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paciente
//         .mockResolvedValueOnce({ rows: [] }); // registro
//       await symptomsController.registerSymptoms(req, res);
//       expect(res.status).toHaveBeenCalledWith(404);
//     });

//     it('deve tratar erro de banco (500)', async () => {
//       db.query.mockRejectedValue(new Error('Falha BD'));
//       await symptomsController.registerSymptoms(req, res);
//       expect(res.status).toHaveBeenCalledWith(500);
//     });
//   });

  describe('registerSymptoms', () => {
  it('deve retornar 404 se paciente não encontrado', async () => {
    const req = {
      user: { id: 1 },
      body: {
        registro_dialise_id: 10,
        sintomas: [{ sintoma_id: 1 }]
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Simula paciente não encontrado
    db.query
      .mockResolvedValueOnce({ rows: [] }); // <- Corrigido aqui

    await symptomsController.registerSymptoms(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
  });

  it('deve retornar 404 se registro de diálise não pertencer ao paciente', async () => {
    const req = {
      user: { id: 1 },
      body: {
        registro_dialise_id: 10,
        sintomas: [{ sintoma_id: 1 }]
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Primeira query (paciente encontrado)
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 99 }] })
      // Segunda query (registro não pertence)
      .mockResolvedValueOnce({ rows: [] }); // <- Corrigido aqui

    await symptomsController.registerSymptoms(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Registro de diálise não encontrado ou não pertence ao paciente'
    });
  });

  it('deve tratar erro de banco (500)', async () => {
    const req = {
      user: { id: 1 },
      body: {
        registro_dialise_id: 10,
        sintomas: [{ sintoma_id: 1 }]
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Simula erro de BD — mantém mockRejectedValue, pois é erro real
    db.query.mockRejectedValueOnce(new Error('Falha BD'));

    await symptomsController.registerSymptoms(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Erro ao registrar sintomas'
    });
  });
});

  describe('registerIsolatedSymptom', () => {
    it('deve retornar 400 se sintomas estiverem ausentes', async () => {
      req.body = {};
      await symptomsController.registerIsolatedSymptom(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('deve registrar sintoma isolado com sucesso', async () => {
      req.body = {
        sintomas: [{ sintoma_id: 1, severidade: 'moderada', observacoes: 'Teste' }]
      };
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paciente
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // insert registro_dialise
        .mockResolvedValueOnce({ rows: [{ id: 100 }] }); // insert sintoma

      await symptomsController.registerIsolatedSymptom(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Sintomas registrados com sucesso' })
      );
    });
  });

  describe('getSymptomsByRecord', () => {
    it('deve retornar sintomas do registro', async () => {
      req.params = { registroId: 5 };
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paciente
        .mockResolvedValueOnce({ rows: [{ id: 2, sintoma_nome: 'Náusea' }] }); // sintomas
      await symptomsController.getSymptomsByRecord(req, res);
      expect(res.json).toHaveBeenCalledWith({ symptoms: expect.any(Array) });
    });

    it('deve retornar 404 se paciente não encontrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      await symptomsController.getSymptomsByRecord(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getSymptomsHistory', () => {
    it('deve retornar histórico de sintomas', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paciente
        .mockResolvedValueOnce({
          rows: [{ registro_id: 1, sintoma_nome: 'Dor', categoria: 'Geral' }]
        });
      await symptomsController.getSymptomsHistory(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ symptoms: expect.any(Array) })
      );
    });

    it('deve retornar 404 se paciente não encontrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      await symptomsController.getSymptomsHistory(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
