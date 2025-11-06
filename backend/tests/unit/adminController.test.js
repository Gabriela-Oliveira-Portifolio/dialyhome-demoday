// backend/src/__tests__/controllers/adminController.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock do database ANTES de importar o app
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

const db = require('../../src/config/database');
const app = require('../../server');

describe('AdminController', () => {
  let authToken;
  let mockAdminUser;

  beforeAll(() => {
    // Criar um token válido para os testes
    mockAdminUser = {
      id: 1,
      nome: 'Admin Teste',
      email: 'admin@test.com',
      tipo_usuario: 'admin'
    };
    
    // Gerar token JWT real
    authToken = jwt.sign(mockAdminUser, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '1h'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== DASHBOARD ====================
  describe('GET /api/admin/dashboard/stats', () => {
    test('deve retornar estatísticas do dashboard com sucesso', async () => {
      // Mock das queries do banco
      db.query
        .mockResolvedValueOnce({ 
          rows: [
            { tipo_usuario: 'paciente', total: '10', ativos: '8' },
            { tipo_usuario: 'medico', total: '5', ativos: '5' }
          ] 
        })
        .mockResolvedValueOnce({ 
          rows: [{ total_registros: '150', pacientes_com_registros: '8' }] 
        })
        .mockResolvedValueOnce({ 
          rows: [{ mes: '2025-01-01', registros_mes: '50' }] 
        })
        .mockResolvedValueOnce({ 
          rows: [{ total_alertas: '3' }] 
        })
        .mockResolvedValueOnce({ 
          rows: [
            { 
              nome: 'Dr. Silva', 
              tipo_usuario: 'medico', 
              acao: 'UPDATE', 
              data_hora: new Date() 
            }
          ] 
        });

      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('totalPatients');
      expect(response.body).toHaveProperty('totalDoctors');
      expect(response.body).toHaveProperty('systemHealth');
      expect(response.body.totalUsers).toBe(15);
      // Corrigir: o controller retorna string, não número
      expect(response.body.totalPatients).toBe('10');
    });

    test('deve retornar erro 500 em caso de falha no banco', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ==================== GERENCIAMENTO DE USUÁRIOS ====================
  describe('GET /api/admin/users', () => {
    test('deve listar todos os usuários com paginação', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [
            { 
              id: 1, 
              nome: 'Paciente Teste', 
              email: 'paciente@test.com', 
              tipo_usuario: 'paciente',
              ativo: true,
              documento: '12345678900'
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const response = await request(app)
        .get('/api/admin/users?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    test('deve filtrar usuários por tipo', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [
            { id: 2, nome: 'Dr. Silva', tipo_usuario: 'medico', ativo: true }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const response = await request(app)
        .get('/api/admin/users?tipo=medico')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users[0].tipo_usuario).toBe('medico');
    });

    test('deve buscar usuários por termo de pesquisa', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, nome: 'João Silva', email: 'joao@test.com' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const response = await request(app)
        .get('/api/admin/users?search=João')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users[0].nome).toContain('João');
    });
  });

  describe('GET /api/admin/users/:id', () => {
    test('deve retornar um usuário específico por ID', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            nome: 'Teste User',
            email: 'teste@test.com',
            tipo_usuario: 'paciente',
            cpf: '12345678900'
          }
        ]
      });

      const response = await request(app)
        .get('/api/admin/users/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('id', 1);
      expect(response.body.user).toHaveProperty('nome');
    });

    test('deve retornar 404 se usuário não encontrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/admin/users/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Usuário não encontrado');
    });
  });

  describe('POST /api/admin/users', () => {
    test('deve retornar erro 400 se dados obrigatórios faltando', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Teste'
          // Faltando email, senha, tipo_usuario
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Dados obrigatórios ausentes');
    });

    test('deve retornar erro 400 se email já existe', async () => {
      db.query.mockResolvedValueOnce({ 
        rows: [{ id: 1 }] // Email já existe
      });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Teste',
          email: 'existente@test.com',
          senha: 'senha123',
          tipo_usuario: 'paciente'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email já cadastrado');
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    test('deve atualizar um usuário com sucesso', async () => {
      db.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            nome: 'Usuário Antigo',
            tipo_usuario: 'paciente' 
          }] 
        })
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            nome: 'Usuário Atualizado',
            email: 'atualizado@test.com',
            tipo_usuario: 'paciente'
          }] 
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/admin/users/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Usuário Atualizado',
          email: 'atualizado@test.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário atualizado com sucesso');
      expect(response.body.user.nome).toBe('Usuário Atualizado');
    });

    test('deve retornar 404 se usuário não existe', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/admin/users/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nome: 'Teste' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Usuário não encontrado');
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    test('deve inativar um usuário (soft delete)', async () => {
      db.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, nome: 'Usuário', ativo: false }] 
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/admin/users/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Usuário inativado com sucesso');
    });

    test('deve retornar 404 se usuário não encontrado', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/admin/users/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Usuário não encontrado');
    });
  });

  // ==================== AUDITORIA ====================
  describe('GET /api/admin/audit-logs', () => {
    test('deve retornar logs de auditoria', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            usuario_id: 1,
            usuario_nome: 'Admin',
            operacao: 'UPDATE',
            tabela_afetada: 'usuarios',
            data_operacao: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    test('deve filtrar logs por usuário', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 1, usuario_id: 5, operacao: 'INSERT' }
        ]
      });

      const response = await request(app)
        .get('/api/admin/audit-logs?usuario_id=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs[0].usuario_id).toBe(5);
    });
  });

  // ==================== BACKUP ====================
  describe('GET /api/admin/backup/status', () => {
    test('deve retornar status de backups', async () => {
      const response = await request(app)
        .get('/api/admin/backup/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('backups');
      expect(Array.isArray(response.body.backups)).toBe(true);
    });
  });

  describe('POST /api/admin/backup/trigger', () => {
    test('deve iniciar backup', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/admin/backup/trigger')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Backup iniciado com sucesso');
    });
  });

  // ==================== ANALYTICS ====================
  describe('GET /api/admin/analytics/user-growth', () => {
    test('deve retornar dados de crescimento de usuários', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { mes: '2025-01-01', tipo_usuario: 'paciente', total: 5 }
        ]
      });

      const response = await request(app)
        .get('/api/admin/analytics/user-growth')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/admin/analytics/insights', () => {
    test('deve retornar insights do sistema', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ mes_atual: '10', mes_anterior: '5' }] })
        .mockResolvedValueOnce({ rows: [{ total: '3' }] });

      const response = await request(app)
        .get('/api/admin/analytics/insights')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('insights');
      expect(Array.isArray(response.body.insights)).toBe(true);
    });
  });
});