const request = require('supertest');
const app = require('../../../server.js'); // Seu app Express
const db = require('../../config/database.js');
const jwt = require('jsonwebtoken');

describe('Admin Routes - Integration Tests', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Criar token de autenticação para testes
    authToken = jwt.sign(
      { id: 1, tipo_usuario: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Limpar banco de teste
    await db.query('DELETE FROM logs_auditoria');
    await db.query('DELETE FROM registros_dialise');
    await db.query('DELETE FROM pacientes');
    await db.query('DELETE FROM medicos');
    await db.query('DELETE FROM usuarios WHERE id > 1');
  });

  afterAll(async () => {
    await db.pool.end();
  });

  describe('POST /api/admin/users', () => {
    it('deve criar um novo paciente', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Paciente Teste',
          email: 'paciente@test.com',
          senha: 'Senha123!',
          tipo_usuario: 'paciente',
          cpf: '12345678900',
          data_nascimento: '1990-01-01',
          telefone: '(47) 99999-9999'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.nome).toBe('Paciente Teste');
      
      testUserId = response.body.user.id;
    });

    it('deve rejeitar criação com email duplicado', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Outro Usuario',
          email: 'paciente@test.com', // Email já usado
          senha: 'Senha123!',
          tipo_usuario: 'paciente'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email já cadastrado');
    });

    it('deve rejeitar sem autenticação', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .send({
          nome: 'Teste',
          email: 'test@test.com',
          senha: 'Senha123!',
          tipo_usuario: 'paciente'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/users', () => {
    it('deve listar todos os usuários', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('totalPages');
    });

    it('deve filtrar usuários por tipo', async () => {
      const response = await request(app)
        .get('/api/admin/users?tipo=paciente')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users.every(u => u.tipo_usuario === 'paciente')).toBe(true);
    });
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('totalRecords');
      expect(response.body).toHaveProperty('systemHealth');
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('deve atualizar usuário existente', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Paciente Atualizado',
          ativo: true
        });

      expect(response.status).toBe(200);
      expect(response.body.user.nome).toBe('Paciente Atualizado');
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('deve inativar usuário (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Usuário inativado com sucesso');
    });
  });
});