const request = require('supertest');
const app = require('../../../server.js');
const db = require('../../../src/config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, generateToken } = require('../../helpers/factory.helper');

describe('AuthController', () => {
  describe('POST /api/auth/register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const userData = {
        nome: 'João Silva',
        email: 'joao@test.com',
        senha: 'senha123',
        tipo_usuario: 'paciente',
        cpf: '12345678901',
        data_nascimento: '1990-01-01',
        telefone: '81999999999'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Usuário criado com sucesso');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', userData.email);

      // Verificar se foi criado no banco
      const userInDb = await db.query(
        'SELECT * FROM usuarios WHERE email = $1',
        [userData.email]
      );
      expect(userInDb.rows.length).toBe(1);
      expect(userInDb.rows[0].tipo_usuario).toBe('paciente');
    });

    it('deve retornar erro ao registrar com email duplicado', async () => {
      const userData = {
        nome: 'João Silva',
        email: 'joao@test.com',
        senha: 'senha123',
        tipo_usuario: 'paciente'
      };

      // Criar usuário
      await request(app).post('/api/auth/register').send(userData);

      // Tentar criar novamente
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('já cadastrado');
    });

    it('deve retornar erro com dados inválidos', async () => {
      const userData = {
        nome: 'João',
        // email faltando
        senha: '123',
        tipo_usuario: 'paciente'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('deve criar médico com dados específicos', async () => {
      const doctorData = {
        nome: 'Dr. Carlos',
        email: 'carlos@test.com',
        senha: 'senha123',
        tipo_usuario: 'medico',
        crm: '12345',
        especialidade: 'Nefrologia',
        telefone_contato: '81988888888'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(doctorData)
        .expect(201);

      // Verificar tabela medicos
      const medicoResult = await db.query(
        'SELECT * FROM medicos WHERE usuario_id = $1',
        [response.body.user.id]
      );

      expect(medicoResult.rows.length).toBe(1);
      expect(medicoResult.rows[0].crm).toBe(doctorData.crm);
      expect(medicoResult.rows[0].especialidade).toBe(doctorData.especialidade);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Criar usuário de teste
      const hashedPassword = await bcrypt.hash('senha123', 10);
      await db.query(
        'INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo) VALUES ($1, $2, $3, $4, true)',
        ['João Test', 'joao@test.com', hashedPassword, 'paciente']
      );
    });

    it('deve fazer login com credenciais válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'joao@test.com',
          senha: 'senha123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('email', 'joao@test.com');
      expect(response.body.user).not.toHaveProperty('senha_hash');
    });

    it('deve retornar erro com senha incorreta', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'joao@test.com',
          senha: 'senhaErrada'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Credenciais inválidas');
    });

    it('deve retornar erro com email inexistente', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'naoexiste@test.com',
          senha: 'senha123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('não deve fazer login se usuário estiver inativo', async () => {
      // Inativar usuário
      await db.query(
        'UPDATE usuarios SET ativo = false WHERE email = $1',
        ['joao@test.com']
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'joao@test.com',
          senha: 'senha123'
        })
        .expect(401);

      expect(response.body.error).toContain('inativo');
    });
  });

  describe('POST /api/auth/logout', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const user = await createUser({ tipo_usuario: 'paciente' });
      userId = user.id;
      token = generateToken(userId, 'paciente');
    });

    it('deve fazer logout com sucesso', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout realizado com sucesso');

      // Verificar se token foi adicionado à blacklist
      const blacklistCheck = await db.query(
        'SELECT * FROM tokens_invalidados WHERE token = $1',
        [token]
      );
      expect(blacklistCheck.rows.length).toBe(1);
    });

    it('deve retornar erro sem token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;
    let userId;

    beforeEach(async () => {
      const user = await createUser({ tipo_usuario: 'paciente' });
      userId = user.id;
      refreshToken = generateToken(userId, 'paciente', 'refresh');
    });

    it('deve gerar novo access token com refresh token válido', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Verificar se os tokens são válidos
      const decoded = jwt.verify(response.body.accessToken, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(userId);
    });

    it('deve retornar erro com refresh token inválido', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'token_invalido' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar erro sem refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('não fornecido');
    });
  });
});