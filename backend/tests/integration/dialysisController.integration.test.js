// backend/src/__tests__/integration/dialysisController.integration.test.js
const request = require('supertest');
const app = require('../../server');
const db = require('../../src/config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

describe('DialysisController - Integration Tests', () => {
  let authToken;
  let testPacienteId;
  let testPacienteUserId;
  let testRecordId;

  beforeAll(async () => {
    // Limpar tabelas
    await db.query('DELETE FROM registros_dialise');
    await db.query('DELETE FROM pacientes');
    await db.query('DELETE FROM usuarios WHERE tipo_usuario = $1', ['paciente']);

    // Criar usuário paciente para testes
    const hashedPassword = await bcrypt.hash('paciente123', 10);
    const pacienteUserResult = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      ['Paciente Teste Dialise', 'paciente.dialise@test.com', hashedPassword, 'paciente']
    );
    testPacienteUserId = pacienteUserResult.rows[0].id;

    // Criar registro de paciente
    const pacienteResult = await db.query(
      `INSERT INTO pacientes (usuario_id, cpf, data_nascimento, telefone)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testPacienteUserId, '11122233344', '1985-05-15', '81987654321']
    );
    testPacienteId = pacienteResult.rows[0].id;

    // Gerar token JWT
    authToken = jwt.sign(
      { id: testPacienteUserId, email: 'paciente.dialise@test.com', tipo_usuario: 'paciente' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Criar um registro de teste simples (apenas campos obrigatórios)
    const recordResult = await db.query(
      `INSERT INTO registros_dialise (
        paciente_id, data_registro,
        pressao_arterial_sistolica, pressao_arterial_diastolica
      ) VALUES ($1, CURRENT_DATE, 120, 80)
      RETURNING id`,
      [testPacienteId]
    );
    testRecordId = recordResult.rows[0].id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await db.query('DELETE FROM registros_dialise');
    await db.query('DELETE FROM pacientes WHERE id = $1', [testPacienteId]);
    await db.query('DELETE FROM usuarios WHERE id = $1', [testPacienteUserId]);
  });

  // ==================== CREATE RECORD ====================
  describe('POST /api/dialysis/records', () => {
    test('deve criar novo registro de diálise com sucesso', async () => {
      const response = await request(app)
        .post('/api/dialysis/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pressaoSistolica: 130,
          pressaoDiastolica: 85,
          observacoes: 'Sessão normal'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registro criado com sucesso');
      expect(response.body.record).toHaveProperty('id');
      expect(response.body.record.pressao_arterial_sistolica).toBe(130);
      expect(response.body.record.pressao_arterial_diastolica).toBe(85);
    });

    test('deve retornar erro 400 se pressão arterial não for fornecida', async () => {
      const response = await request(app)
        .post('/api/dialysis/records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          observacoes: 'Sem pressão'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Pressão arterial é obrigatória');
    });

    test('deve retornar 401 sem token', async () => {
      const response = await request(app)
        .post('/api/dialysis/records')
        .send({
          pressaoSistolica: 120,
          pressaoDiastolica: 80
        });

      expect(response.status).toBe(401);
    });
  });

  // ==================== GET RECORDS ====================
  describe('GET /api/dialysis/records', () => {
    test('deve retornar lista de registros do paciente', async () => {
      const response = await request(app)
        .get('/api/dialysis/records')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('records');
      expect(Array.isArray(response.body.records)).toBe(true);
      expect(response.body.records.length).toBeGreaterThan(0);
    });

    test('deve retornar registros com paginação', async () => {
      const response = await request(app)
        .get('/api/dialysis/records?limit=2&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.records.length).toBeLessThanOrEqual(2);
    });

    test('deve retornar 401 sem token', async () => {
      const response = await request(app)
        .get('/api/dialysis/records');

      expect(response.status).toBe(401);
    });
  });

  // ==================== GET STATS ====================
  describe('GET /api/dialysis/stats', () => {
    test('deve retornar estatísticas do paciente', async () => {
      const response = await request(app)
        .get('/api/dialysis/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('averages');
      expect(response.body.stats).toHaveProperty('pressaoArterial');
      expect(response.body.stats).toHaveProperty('ufTotal');
      expect(response.body.stats).toHaveProperty('glicose');
      expect(response.body.stats).toHaveProperty('tempoPermanencia');
    });

    test('deve incluir médias dos últimos 7 dias', async () => {
      const response = await request(app)
        .get('/api/dialysis/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.averages).toHaveProperty('sistolica');
      expect(response.body.averages).toHaveProperty('diastolica');
      expect(response.body.averages).toHaveProperty('uf');
      expect(response.body.averages).toHaveProperty('glicose');
    });

    test('deve retornar N/A quando não há dados', async () => {
      // Criar novo paciente sem registros
      const newUser = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        ['Paciente Sem Dados', 'sem.dados@test.com', 'hash', 'paciente']
      );
      const newPaciente = await db.query(
        `INSERT INTO pacientes (usuario_id, cpf) VALUES ($1, $2) RETURNING id`,
        [newUser.rows[0].id, '99988877766']
      );

      const newToken = jwt.sign(
        { id: newUser.rows[0].id, tipo_usuario: 'paciente' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/dialysis/stats')
        .set('Authorization', `Bearer ${newToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.pressaoArterial.value).toBe('N/A');

      // Limpar
      await db.query('DELETE FROM pacientes WHERE id = $1', [newPaciente.rows[0].id]);
      await db.query('DELETE FROM usuarios WHERE id = $1', [newUser.rows[0].id]);
    });
  });

  // ==================== GET RECORD BY ID ====================
  describe('GET /api/dialysis/records/:id', () => {
    test('deve retornar registro específico', async () => {
      const response = await request(app)
        .get(`/api/dialysis/records/${testRecordId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('record');
      expect(response.body.record.id).toBe(testRecordId);
    });

    test('deve retornar 404 para registro inexistente', async () => {
      const response = await request(app)
        .get('/api/dialysis/records/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Registro não encontrado');
    });

    test('não deve retornar registro de outro paciente', async () => {
      // Criar outro paciente com registro
      const otherUser = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        ['Outro Paciente', 'outro@test.com', 'hash', 'paciente']
      );
      const otherPaciente = await db.query(
        `INSERT INTO pacientes (usuario_id, cpf) VALUES ($1, $2) RETURNING id`,
        [otherUser.rows[0].id, '55544433322']
      );
      const otherRecord = await db.query(
        `INSERT INTO registros_dialise (paciente_id, data_registro, pressao_arterial_sistolica, pressao_arterial_diastolica)
         VALUES ($1, CURRENT_DATE, 120, 80) RETURNING id`,
        [otherPaciente.rows[0].id]
      );

      const response = await request(app)
        .get(`/api/dialysis/records/${otherRecord.rows[0].id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);

      // Limpar
      await db.query('DELETE FROM registros_dialise WHERE id = $1', [otherRecord.rows[0].id]);
      await db.query('DELETE FROM pacientes WHERE id = $1', [otherPaciente.rows[0].id]);
      await db.query('DELETE FROM usuarios WHERE id = $1', [otherUser.rows[0].id]);
    });
  });

  // ==================== UPDATE RECORD ====================
  describe('PUT /api/dialysis/records/:id', () => {
    test('deve atualizar registro com sucesso', async () => {
      const response = await request(app)
        .put(`/api/dialysis/records/${testRecordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pressaoSistolica: 135,
          pressaoDiastolica: 88,
          observacoes: 'Registro atualizado'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Registro atualizado com sucesso');
      expect(response.body.record.pressao_arterial_sistolica).toBe(135);
      expect(response.body.record.observacoes).toBe('Registro atualizado');
    });

    test('deve atualizar apenas campos fornecidos', async () => {
      const response = await request(app)
        .put(`/api/dialysis/records/${testRecordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          observacoes: 'Apenas observação atualizada'
        });

      expect(response.status).toBe(200);
      expect(response.body.record.observacoes).toBe('Apenas observação atualizada');
    });

    test('deve retornar 404 para registro inexistente', async () => {
      const response = await request(app)
        .put('/api/dialysis/records/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pressaoSistolica: 130
        });

      expect(response.status).toBe(404);
    });

  // ==================== DELETE RECORD ====================
  describe('DELETE /api/dialysis/records/:id', () => {
    test('deve deletar registro com sucesso', async () => {
      // Criar registro temporário para deletar
      const tempRecord = await db.query(
        `INSERT INTO registros_dialise (paciente_id, data_registro, pressao_arterial_sistolica, pressao_arterial_diastolica)
         VALUES ($1, CURRENT_DATE, 120, 80) RETURNING id`,
        [testPacienteId]
      );

      const response = await request(app)
        .delete(`/api/dialysis/records/${tempRecord.rows[0].id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Registro deletado com sucesso');

      // Verificar se foi deletado
      const check = await db.query('SELECT * FROM registros_dialise WHERE id = $1', [tempRecord.rows[0].id]);
      expect(check.rows.length).toBe(0);
    });

    test('deve retornar 404 para registro inexistente', async () => {
      const response = await request(app)
        .delete('/api/dialysis/records/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  // ==================== AUTHORIZATION ====================
  describe('Autorização', () => {
    test('deve retornar 401 sem autenticação', async () => {
      const response = await request(app)
        .get('/api/dialysis/records');

      expect(response.status).toBe(401);
    });

    test('médico não deve ter acesso às rotas de diálise', async () => {
      // Criar token de médico
      const medicoToken = jwt.sign(
        { id: 999, tipo_usuario: 'medico' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/dialysis/records')
        .set('Authorization', `Bearer ${medicoToken}`);

      expect(response.status).toBe(403);
    });
  });
}); 
});