const request = require('supertest');
const app = require('../../../server.js');
const db = require('../../../src/config/database');
const { createUser, createDoctor, createPatient, generateToken } = require('../../helpers/factory.helper');

describe('DoctorController', () => {
  let doctorUser, doctorToken, doctorId;
  let patientUser, patientId;

  beforeEach(async () => {
    // Criar médico
    doctorUser = await createUser({ tipo_usuario: 'medico' });
    doctorToken = generateToken(doctorUser.id, 'medico');
    
    const doctorResult = await createDoctor(doctorUser.id);
    doctorId = doctorResult.id;

    // Criar paciente vinculado
    patientUser = await createUser({ tipo_usuario: 'paciente' });
    const patientResult = await createPatient(patientUser.id, doctorId);
    patientId = patientResult.id;
  });

  describe('GET /api/doctor/profile', () => {
    it('deve retornar perfil do médico autenticado', async () => {
      const response = await request(app)
        .get('/api/doctor/profile')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.doctor).toHaveProperty('nome', doctorUser.nome);
      expect(response.body.doctor).toHaveProperty('email', doctorUser.email);
      expect(response.body.doctor).toHaveProperty('crm');
    });

    it('deve retornar 401 sem autenticação', async () => {
      await request(app)
        .get('/api/doctor/profile')
        .expect(401);
    });
  });

  describe('PUT /api/doctor/profile', () => {
    it('deve atualizar perfil do médico', async () => {
      const updateData = {
        crm: '54321',
        telefone: '81987654321',
        especialidade: 'Nefrologia Pediátrica'
      };

      const response = await request(app)
        .put('/api/doctor/profile')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.doctor.crm).toBe(updateData.crm);
      expect(response.body.doctor.especialidade).toBe(updateData.especialidade);
    });

    it('não deve permitir atualização com dados inválidos', async () => {
      const response = await request(app)
        .put('/api/doctor/profile')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ crm: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/doctor/change-password', () => {
    it('deve alterar senha com credenciais corretas', async () => {
      const response = await request(app)
        .put('/api/doctor/change-password')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          currentPassword: 'senha123',
          newPassword: 'novaSenha456'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('deve retornar erro com senha atual incorreta', async () => {
      const response = await request(app)
        .put('/api/doctor/change-password')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          currentPassword: 'senhaErrada',
          newPassword: 'novaSenha456'
        })
        .expect(400);

      expect(response.body.error).toContain('incorreta');
    });
  });

  describe('GET /api/doctor/patients', () => {
    it('deve listar pacientes do médico', async () => {
      const response = await request(app)
        .get('/api/doctor/patients')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.patients).toBeInstanceOf(Array);
      expect(response.body.patients.length).toBeGreaterThan(0);
      expect(response.body.patients[0]).toHaveProperty('paciente_id');
      expect(response.body.patients[0]).toHaveProperty('nome');
    });

    it('deve retornar lista vazia se não tiver pacientes', async () => {
      // Criar novo médico sem pacientes
      const newDoctor = await createUser({ tipo_usuario: 'medico' });
      const newToken = generateToken(newDoctor.id, 'medico');
      await createDoctor(newDoctor.id);

      const response = await request(app)
        .get('/api/doctor/patients')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(response.body.patients).toEqual([]);
    });
  });

  describe('GET /api/doctor/patients/:patientId', () => {
    it('deve retornar detalhes completos do paciente', async () => {
      const response = await request(app)
        .get(`/api/doctor/patients/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('patient');
      expect(response.body).toHaveProperty('recentDialysis');
      expect(response.body).toHaveProperty('medications');
      expect(response.body).toHaveProperty('stats');
      expect(response.body.patient.id).toBe(patientId);
    });

    it('deve retornar 404 para paciente inexistente', async () => {
      await request(app)
        .get('/api/doctor/patients/99999')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);
    });

    it('deve retornar 403 para paciente de outro médico', async () => {
      // Criar outro médico e paciente
      const otherDoctor = await createUser({ tipo_usuario: 'medico' });
      const otherDoctorData = await createDoctor(otherDoctor.id);
      const otherPatient = await createUser({ tipo_usuario: 'paciente' });
      const otherPatientData = await createPatient(otherPatient.id, otherDoctorData.id);

      await request(app)
        .get(`/api/doctor/patients/${otherPatientData.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);
    });
  });

  describe('POST /api/doctor/patients/:patientId/alert', () => {
    it('deve enviar alerta para paciente', async () => {
      const alertData = {
        titulo: 'Consulta Agendada',
        mensagem: 'Você tem uma consulta amanhã às 10h',
        prioridade: 'alta'
      };

      const response = await request(app)
        .post(`/api/doctor/patients/${patientId}/alert`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(alertData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('notification');

      // Verificar se notificação foi criada
      const notificationCheck = await db.query(
        'SELECT * FROM notificacoes WHERE tipo = $1 AND usuario_destinatario_id = $2',
        ['alerta_medico', patientUser.id]
      );
      expect(notificationCheck.rows.length).toBeGreaterThan(0);
    });

    it('deve retornar erro sem dados obrigatórios', async () => {
      const response = await request(app)
        .post(`/api/doctor/patients/${patientId}/alert`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          // titulo faltando
          mensagem: 'Teste'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/doctor/dashboard', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      const response = await request(app)
        .get('/api/doctor/dashboard')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalPatients');
      expect(response.body).toHaveProperty('unreadAlerts');
      expect(response.body).toHaveProperty('sessionsToday');
      expect(response.body).toHaveProperty('patientsAtRisk');
    });
  });

  describe('GET /api/doctor/patients/:patientId/analytics', () => {
    beforeEach(async () => {
      // Criar alguns registros de diálise para ter dados de analytics
      for (let i = 0; i < 5; i++) {
        await db.query(
          `INSERT INTO registros_dialise (
            paciente_id, data_registro, pressao_arterial_sistolica, 
            pressao_arterial_diastolica, uf_total, concentracao_glicose
          ) VALUES ($1, CURRENT_DATE - $2, $3, $4, $5, $6)`,
          [patientId, i, 130 + i, 80 + i, 2500 + (i * 100), 110 + (i * 5)]
        );
      }
    });

    it('deve retornar analytics completos do paciente', async () => {
      const response = await request(app)
        .get(`/api/doctor/patients/${patientId}/analytics`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({ days: 30 })
        .expect(200);

      expect(response.body).toHaveProperty('pressureData');
      expect(response.body).toHaveProperty('ufData');
      expect(response.body).toHaveProperty('glucoseData');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('predictions');
      expect(response.body.trends).toHaveProperty('pressure');
      expect(response.body.trends).toHaveProperty('uf');
    });
  });
});