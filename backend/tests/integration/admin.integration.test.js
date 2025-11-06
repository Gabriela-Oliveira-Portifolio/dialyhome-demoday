// backend/src/__tests__/integration/adminController.integration.test.js
const request = require('supertest');
const app = require('../../server');
const db = require('../../src/config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

describe('AdminController - Integration Tests', () => {
  let authToken;
  let testAdminId;
  let testPacienteId;
  let testMedicoId;

  beforeAll(async () => {
    // Limpar tabelas
    await db.query('DELETE FROM logs_auditoria');
    await db.query('DELETE FROM registro_sintomas');
    await db.query('DELETE FROM registros_dialise');
    await db.query('DELETE FROM notificacoes');
    await db.query('DELETE FROM pacientes');
    await db.query('DELETE FROM medicos');
    await db.query('DELETE FROM usuarios');

    // Criar usuário admin para testes
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      ['Admin Teste', 'admin@test.com', hashedPassword, 'admin']
    );
    testAdminId = adminResult.rows[0].id;

    // Gerar token JWT
    authToken = jwt.sign(
      { id: testAdminId, email: 'admin@test.com', tipo_usuario: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Criar um médico para testes
    const medicoUserResult = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      ['Dr. Teste', 'medico@test.com', hashedPassword, 'medico']
    );
    const medicoUserId = medicoUserResult.rows[0].id;

    const medicoResult = await db.query(
      `INSERT INTO medicos (usuario_id, crm, especialidade, telefone_contato)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [medicoUserId, 'CRM12345', 'Nefrologia', '81999999999']
    );
    testMedicoId = medicoResult.rows[0].id;

    // Criar um paciente para testes
    const pacienteUserResult = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      ['Paciente Teste', 'paciente@test.com', hashedPassword, 'paciente']
    );
    const pacienteUserId = pacienteUserResult.rows[0].id;

    const pacienteResult = await db.query(
      `INSERT INTO pacientes (usuario_id, cpf, data_nascimento, telefone, medico_responsavel_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [pacienteUserId, '12345678900', '1990-01-01', '81988888888', testMedicoId]
    );
    testPacienteId = pacienteResult.rows[0].id;

    // Criar alguns registros de diálise para estatísticas
    await db.query(
      `INSERT INTO registros_dialise (
        paciente_id, data_registro,
        pressao_arterial_sistolica, pressao_arterial_diastolica,
        peso_pre_dialise, peso_pos_dialise, uf_total
      ) VALUES ($1, CURRENT_DATE, 120, 80, 70.5, 68.0, 2500)`,
      [testPacienteId]
    );
  });

  afterAll(async () => {
    // Limpar dados de teste
    await db.query('DELETE FROM logs_auditoria');
    await db.query('DELETE FROM registro_sintomas');
    await db.query('DELETE FROM registros_dialise');
    await db.query('DELETE FROM notificacoes');
    await db.query('DELETE FROM pacientes');
    await db.query('DELETE FROM medicos');
    await db.query('DELETE FROM usuarios');
  });

  // ==================== DASHBOARD ====================
  describe('GET /api/admin/dashboard/stats', () => {
    test('deve retornar estatísticas do dashboard', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('totalPatients');
      expect(response.body).toHaveProperty('totalDoctors');
      expect(response.body).toHaveProperty('systemHealth');
      expect(response.body.totalUsers).toBeGreaterThan(0);
    });

    test('deve retornar 401 sem token', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats');

      expect(response.status).toBe(401);
    });
  });

  // ==================== GERENCIAMENTO DE USUÁRIOS ====================
  describe('GET /api/admin/users', () => {
    test('deve listar todos os usuários', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
    });

    test('deve filtrar usuários por tipo', async () => {
      const response = await request(app)
        .get('/api/admin/users?tipo=medico')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users.every(u => u.tipo_usuario === 'medico')).toBe(true);
    });

    test('deve buscar usuários por termo', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=Paciente')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users.some(u => u.nome.includes('Paciente'))).toBe(true);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    test('deve retornar um usuário específico', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${testAdminId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('id', testAdminId);
      expect(response.body.user).toHaveProperty('nome');
    });

    test('deve retornar 404 para usuário inexistente', async () => {
      const response = await request(app)
        .get('/api/admin/users/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/admin/users', () => {
    test('deve criar um novo paciente', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Novo Paciente Teste',
          email: `novopaciente${Date.now()}@test.com`,
          senha: 'senha123',
          tipo_usuario: 'paciente',
          cpf: '98765432100',
          telefone: '81987654321'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.tipo_usuario).toBe('paciente');
    });

    test('deve criar um novo médico', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Dr. Novo Teste',
          email: `novomedico${Date.now()}@test.com`,
          senha: 'senha123',
          tipo_usuario: 'medico',
          crm: 'CRM54321',
          especialidade: 'Cardiologia'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.tipo_usuario).toBe('medico');
    });

    test('deve retornar erro se dados obrigatórios faltando', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Teste Incompleto'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('deve retornar erro se email já existe', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Teste Duplicado',
          email: 'admin@test.com',
          senha: 'senha123',
          tipo_usuario: 'paciente'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('já cadastrado');
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    test('deve atualizar um usuário', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testAdminId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nome: 'Admin Atualizado'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.user.nome).toBe('Admin Atualizado');
    });

    test('deve retornar 404 para usuário inexistente', async () => {
      const response = await request(app)
        .put('/api/admin/users/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nome: 'Teste' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    test('deve inativar um usuário (soft delete)', async () => {
      const tempUser = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        ['Temp User', `temp${Date.now()}@test.com`, 'hash', 'paciente']
      );
      const tempUserId = tempUser.rows[0].id;

      const response = await request(app)
        .delete(`/api/admin/users/${tempUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('inativado');

      const check = await db.query('SELECT ativo FROM usuarios WHERE id = $1', [tempUserId]);
      expect(check.rows[0].ativo).toBe(false);
    });
  });

  // ==================== AUDITORIA ====================
  describe('GET /api/admin/audit-logs', () => {
    test('deve retornar logs de auditoria', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
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
    });
  });

  describe('POST /api/admin/backup/trigger', () => {
    test('deve iniciar backup', async () => {
      const response = await request(app)
        .post('/api/admin/backup/trigger')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Backup');
    });
  });

  // ==================== ANALYTICS ====================
  describe('GET /api/admin/analytics/user-growth', () => {
    test('deve retornar dados de crescimento', async () => {
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
      const response = await request(app)
        .get('/api/admin/analytics/insights')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('insights');
      expect(Array.isArray(response.body.insights)).toBe(true);
    });
  });

  describe('GET /api/admin/analytics/doctor-workload', () => {
    test('deve retornar carga de trabalho dos médicos', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/doctor-workload')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });
});