// backend/tests/integration/admin.integration.test.js

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../../src/config/database');

// Criar o app sem iniciar o servidor
const express = require('express');
const app = express();
const cors = require('cors');
const adminRoutes = require('../../src/routes/admin');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/admin', adminRoutes);

describe('Admin Routes - Integration Tests', () => {
  let authToken;
  let adminUserId;

  beforeAll(async () => {
    try {
      // Garantir que estamos em ambiente de teste
      process.env.NODE_ENV = 'test';

      // Limpar banco de teste (em ordem de dependências)
      await db.query('DELETE FROM logs_auditoria');
      await db.query('DELETE FROM registro_sintomas');
      await db.query('DELETE FROM registros_dialise');
      await db.query('DELETE FROM notificacoes');
      await db.query('DELETE FROM pacientes');
      await db.query('DELETE FROM medicos');
      await db.query('DELETE FROM usuarios');

      // Criar usuário admin para testes
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      const adminResult = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
         VALUES ('Admin Teste', 'admin@test.com', $1, 'admin', true)
         RETURNING id`,
        [hashedPassword]
      );

      adminUserId = adminResult.rows[0].id;

      // Criar token de autenticação com AMBOS os campos (id e userId)
      authToken = jwt.sign(
        { 
          id: adminUserId,
          userId: adminUserId, // Compatibilidade
          tipo_usuario: 'admin',
          email: 'admin@test.com',
          nome: 'Admin Teste'
        },
        process.env.JWT_SECRET || 'test_secret_key',
        { expiresIn: '1h' }
      );

      console.log('✅ Setup de testes concluído. Admin ID:', adminUserId);
    } catch (error) {
      console.error('❌ Erro no setup:', error);
      throw error;
    }
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
    });

    it('deve rejeitar criação com email duplicado', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Outro Usuario',
          email: 'paciente@test.com',
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

    it('deve rejeitar com token inválido', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', 'Bearer token_invalido')
        .send({
          nome: 'Teste',
          email: 'test2@test.com',
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
      
      if (response.body.users && response.body.users.length > 0) {
        expect(response.body.users.every(u => u.tipo_usuario === 'paciente')).toBe(true);
      }
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
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Usuario para Update',
          email: 'update@test.com',
          senha: 'Senha123!',
          tipo_usuario: 'paciente'
        });

      expect(createResponse.status).toBe(201);
      const userId = createResponse.body.user.id;

      const response = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Paciente Atualizado',
          ativo: true
        });

      expect(response.status).toBe(200);
      expect(response.body.user.nome).toBe('Paciente Atualizado');
    });

    it('deve retornar 404 para usuário inexistente', async () => {
      const response = await request(app)
        .put('/api/admin/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Teste'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('deve inativar usuário (soft delete)', async () => {
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Usuario para Deletar',
          email: 'delete@test.com',
          senha: 'Senha123!',
          tipo_usuario: 'paciente'
        });

      expect(createResponse.status).toBe(201);
      const userId = createResponse.body.user.id;

      const response = await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Usuário inativado com sucesso');
    });

    it('deve retornar 404 para usuário inexistente', async () => {
      const response = await request(app)
        .delete('/api/admin/users/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});