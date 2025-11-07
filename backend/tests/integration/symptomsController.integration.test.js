// Mock do database ANTES de importar qualquer coisa
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

// Mock do middleware de autenticação ANTES de importar as rotas
jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, nome: 'Usuário de Teste' };
    next();
  },
  authorizeRole: (roles) => (req, res, next) => {
    next();
  }
}));

const db = require('../../src/config/database');
const request = require('supertest');
const app = require('../../server');

describe('symptoms routes (integração)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/symptoms/predefined', () => {
    it('deve retornar sintomas agrupados por categoria', async () => {
      db.query.mockResolvedValue({
        rows: [
          { id: 1, nome: 'Náusea', categoria: 'Gastrointestinal', severidade_padrao: 'leve' },
          { id: 2, nome: 'Vômito', categoria: 'Gastrointestinal', severidade_padrao: 'moderada' }
        ]
      });

      const res = await request(app).get('/api/symptoms/predefined');
      
      expect(res.status).toBe(200);
      expect(res.body.symptoms).toBeDefined();
      expect(res.body.grouped).toBeDefined();
      expect(res.body.symptoms).toHaveLength(2);
    });

    it('deve retornar erro 500 em caso de falha no banco', async () => {
      db.query.mockRejectedValue(new Error('Erro no banco'));

      const res = await request(app).get('/api/symptoms/predefined');
      
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Erro ao buscar sintomas');
    });
  });

  describe('POST /api/symptoms/register', () => {
    it('deve registrar sintomas com sucesso', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paciente
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // registro válido
        .mockResolvedValueOnce({}) // delete sintomas anteriores
        .mockResolvedValueOnce({ rows: [{ id: 5, registro_dialise_id: 10, sintoma_id: 1, severidade: 'leve' }] }); // insert

      const res = await request(app)
        .post('/api/symptoms/register')
        .send({ 
          registro_dialise_id: 10, 
          sintomas: [{ sintoma_id: 1, severidade: 'leve' }] 
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Sintomas registrados com sucesso');
      expect(res.body.symptoms).toHaveLength(1);
    });

    it('deve retornar erro 400 se dados obrigatórios não forem enviados', async () => {
      const res = await request(app)
        .post('/api/symptoms/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ID do registro de diálise e sintomas são obrigatórios');
    });

    it('deve retornar erro 404 se paciente não for encontrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // paciente não encontrado

      const res = await request(app)
        .post('/api/symptoms/register')
        .send({ 
          registro_dialise_id: 10, 
          sintomas: [{ sintoma_id: 1 }] 
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Paciente não encontrado');
    });

    it('deve retornar erro 404 se registro não pertencer ao paciente', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paciente
        .mockResolvedValueOnce({ rows: [] }); // registro não encontrado

      const res = await request(app)
        .post('/api/symptoms/register')
        .send({ 
          registro_dialise_id: 10, 
          sintomas: [{ sintoma_id: 1 }] 
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('não encontrado');
    });
  });

  describe('POST /api/symptoms/isolated', () => {
    it('deve registrar sintoma isolado com sucesso', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paciente
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // registro criado
        .mockResolvedValueOnce({ rows: [{ id: 100 }] }); // sintoma inserido

      const res = await request(app)
        .post('/api/symptoms/isolated')
        .send({ 
          sintomas: [{ sintoma_id: 1, severidade: 'moderada', observacoes: 'teste' }] 
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Sintomas registrados com sucesso');
      expect(res.body.registro_id).toBe(10);
    });

    it('deve retornar erro 400 se sintomas não forem enviados', async () => {
      const res = await request(app)
        .post('/api/symptoms/isolated')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Sintomas são obrigatórios');
    });
  });

  describe('GET /api/symptoms/record/:registroId', () => {
    it('deve retornar sintomas do registro específico', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paciente
        .mockResolvedValueOnce({ 
          rows: [
            { id: 2, sintoma_nome: 'Náusea', categoria: 'Gastrointestinal', severidade: 'leve' }
          ] 
        });

      const res = await request(app).get('/api/symptoms/record/5');
      
      expect(res.status).toBe(200);
      expect(res.body.symptoms).toHaveLength(1);
      expect(res.body.symptoms[0].sintoma_nome).toBe('Náusea');
    });

    it('deve retornar erro 404 se paciente não for encontrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/symptoms/record/5');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Paciente não encontrado');
    });
  });

  describe('GET /api/symptoms/history', () => {
    it('deve retornar histórico de sintomas com paginação', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paciente
        .mockResolvedValueOnce({
          rows: [
            { registro_id: 1, sintoma_nome: 'Dor', categoria: 'Geral', severidade: 'leve' },
            { registro_id: 2, sintoma_nome: 'Náusea', categoria: 'Gastrointestinal', severidade: 'moderada' }
          ]
        });

      const res = await request(app).get('/api/symptoms/history?limit=10&offset=0');
      
      expect(res.status).toBe(200);
      expect(res.body.symptoms).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('deve usar valores padrão para limit e offset', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/symptoms/history');
      
      expect(res.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 20, 0] // valores padrão
      );
    });
  });
});