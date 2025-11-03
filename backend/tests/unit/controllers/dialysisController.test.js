const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../../src/config/database');
const { createUser, createPatient, generateToken } = require('../../helpers/factory.helper');

describe('DialysisController', () => {
  let patientUser, patientToken, patientId;

  beforeEach(async () => {
    patientUser = await createUser({ tipo_usuario: 'paciente' });
    patientToken = generateToken(patientUser.id, 'paciente');
    
    const patientResult = await createPatient(patientUser.id);
    patientId = patientResult.id;
  });

  describe('POST /api/dialysis/records', () => {
    it('deve criar registro de diálise com sucesso', async () => {
      const recordData = {
        pressaoSistolica: 130,
        pressaoDiastolica: 80,
        drenagemInicial: 2.5,
        ufTotal: 2.3,
        tempoPermanencia: 4,
        glicose: 110,
        dextrose: 2.5,
        observacoes: 'Sessão normal'
      };

      const response = await request(app)
        .post('/api/dialysis/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(recordData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('record');
      expect(response.body.record).toHaveProperty('id');
      expect(response.body.record.pressao_arterial_sistolica).toBe(130);
    });

    it('deve retornar erro sem pressão arterial', async () => {
      const recordData = {
        // pressaoSistolica faltando
        drenagemInicial: 2.5
      };

      const response = await request(app)
        .post('/api/dialysis/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(recordData)
        .expect(400);

      expect(response.body.error).toContain('obrigatória');
    });

    it('deve converter unidades corretamente', async () => {
      const recordData = {
        pressaoSistolica: 120,
        pressaoDiastolica: 70,
        drenagemInicial: 2.0, // litros
        ufTotal: 1.8, // litros
        tempoPermanencia: 3.5 // horas
      };

      const response = await request(app)
        .post('/api/dialysis/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(recordData)
        .expect(201);

      // Verificar conversões no banco
      const dbRecord = await db.query(
        'SELECT * FROM registros_dialise WHERE id = $1',
        [response.body.record.id]
      );

      expect(dbRecord.rows[0].drenagem_inicial).toBe(2000); // ml
      expect(dbRecord.rows[0].uf_total).toBe(1800); // ml
      expect(dbRecord.rows[0].tempo_permanencia).toBe(210); // minutos
    });
  });

  describe('GET /api/dialysis/records', () => {
    beforeEach(async () => {
      // Criar alguns registros
      for (let i = 0; i < 5; i++) {
        await db.query(
          `INSERT INTO registros_dialise (
            paciente_id, data_registro, pressao_arterial_sistolica, pressao_arterial_diastolica
          ) VALUES ($1, CURRENT_DATE - $2, 130, 80)`,
          [patientId, i]
        );
      }
    });

    it('deve listar registros do paciente', async () => {
      const response = await request(app)
        .get('/api/dialysis/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.records).toBeInstanceOf(Array);
      expect(response.body.records.length).toBe(5);
    });

    it('deve paginar resultados', async () => {
      const response = await request(app)
        .get('/api/dialysis/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body.records.length).toBe(2);
    });

    it('deve ordenar por data decrescente', async () => {
      const response = await request(app)
        .get('/api/dialysis/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      const dates = response.body.records.map(r => new Date(r.data_registro));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1] >= dates[i]).toBe(true);
      }
    });
  });

  describe('GET /api/dialysis/stats', () => {
    beforeEach(async () => {
      // Criar registros para estatísticas
      await db.query(
        `INSERT INTO registros_dialise (
          paciente_id, data_registro, pressao_arterial_sistolica, 
          pressao_arterial_diastolica, uf_total, concentracao_glicose, tempo_permanencia
        ) VALUES ($1, CURRENT_DATE, 130, 80, 2500, 110, 240)`,
        [patientId]
      );
    });

    it('deve retornar estatísticas do paciente', async () => {
      const response = await request(app)
        .get('/api/dialysis/stats')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('pressaoArterial');
      expect(response.body.stats).toHaveProperty('ufTotal');
      expect(response.body.stats).toHaveProperty('glicose');
      expect(response.body).toHaveProperty('averages');
    });
  });

  describe('PUT /api/dialysis/records/:id', () => {
    let recordId;

    beforeEach(async () => {
      const result = await db.query(
        `INSERT INTO registros_dialise (
          paciente_id, data_registro, pressao_arterial_sistolica, pressao_arterial_diastolica
        ) VALUES ($1, CURRENT_DATE, 130, 80) RETURNING id`,
        [patientId]
      );
      recordId = result.rows[0].id;
    });

    it('deve atualizar registro existente', async () => {
      const updateData = {
        pressaoSistolica: 125,
        pressaoDiastolica: 75,
        observacoes: 'Atualizado'
      };

      const response = await request(app)
        .put(`/api/dialysis/records/${recordId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.record.pressao_arterial_sistolica).toBe(125);
      expect(response.body.record.observacoes).toBe('Atualizado');
    });

    it('deve retornar 404 para registro inexistente', async () => {
      await request(app)
        .put('/api/dialysis/records/99999')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ pressaoSistolica: 120 })
        .expect(404);
    });
  });

  describe('DELETE /api/dialysis/records/:id', () => {
    let recordId;

    beforeEach(async () => {
      const result = await db.query(
        `INSERT INTO registros_dialise (
          paciente_id, data_registro, pressao_arterial_sistolica, pressao_arterial_diastolica
        ) VALUES ($1, CURRENT_DATE, 130, 80) RETURNING id`,
        [patientId]
      );
      recordId = result.rows[0].id;
    });

    it('deve deletar registro existente', async () => {
      const response = await request(app)
        .delete(`/api/dialysis/records/${recordId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verificar se foi deletado
      const checkResult = await db.query(
        'SELECT * FROM registros_dialise WHERE id = $1',
        [recordId]
      );
      expect(checkResult.rows.length).toBe(0);
    });
  });
});