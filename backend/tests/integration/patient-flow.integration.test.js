const request = require('supertest');
const app = require('../../src/app');
const { cleanDatabase } = require('../helpers/factory.helper');

describe('Patient Flow Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('deve completar o fluxo completo do paciente', async () => {
    // 1. REGISTRO
    const registerData = {
      nome: 'Maria Silva',
      email: 'maria@test.com',
      senha: 'senha123',
      tipo_usuario: 'paciente',
      cpf: '12345678901',
      data_nascimento: '1990-05-15',
      telefone: '81999999999',
      endereco: 'Rua Teste, 123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(registerData)
      .expect(201);

    expect(registerResponse.body).toHaveProperty('user');
    const userId = registerResponse.body.user.id;

    // 2. LOGIN
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: registerData.email,
        senha: registerData.senha
      })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('accessToken');
    expect(loginResponse.body).toHaveProperty('refreshToken');
    
    const { accessToken, refreshToken } = loginResponse.body;

    // 3. VER PERFIL
    const profileResponse = await request(app)
      .get('/api/patient/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profileResponse.body.patient).toHaveProperty('nome', registerData.nome);
    expect(profileResponse.body.patient).toHaveProperty('email', registerData.email);
    expect(profileResponse.body.patient).toHaveProperty('idade');

    // 4. CRIAR REGISTRO DE DIÁLISE
    const dialysisData = {
      pressaoSistolica: 130,
      pressaoDiastolica: 80,
      drenagemInicial: 2.5,
      ufTotal: 2.2,
      tempoPermanencia: 4,
      glicose: 110,
      dextrose: 2.5,
      observacoes: 'Sessão normal'
    };

    const dialysisResponse = await request(app)
      .post('/api/dialysis/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(dialysisData)
      .expect(201);

    expect(dialysisResponse.body).toHaveProperty('record');
    const recordId = dialysisResponse.body.record.id;

    // 5. LISTAR REGISTROS
    const recordsResponse = await request(app)
      .get('/api/dialysis/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(recordsResponse.body.records).toBeInstanceOf(Array);
    expect(recordsResponse.body.records.length).toBe(1);
    expect(recordsResponse.body.records[0].id).toBe(recordId);

    // 6. VER ESTATÍSTICAS
    const statsResponse = await request(app)
      .get('/api/dialysis/stats')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(statsResponse.body).toHaveProperty('stats');
    expect(statsResponse.body.stats.pressaoArterial.value).toContain('130/80');

    // 7. CRIAR LEMBRETE
    const reminderData = {
      tipo: 'medicacao',
      titulo: 'Tomar medicamento',
      descricao: 'Tomar captopril',
      data_hora: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      recorrente: true,
      frequencia_recorrencia: 'diario'
    };

    const reminderResponse = await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(reminderData)
      .expect(201);

    expect(reminderResponse.body).toHaveProperty('reminder');
    expect(reminderResponse.body.reminder.titulo).toBe(reminderData.titulo);

    // 8. LISTAR LEMBRETES
    const remindersResponse = await request(app)
      .get('/api/reminders')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(remindersResponse.body.reminders).toBeInstanceOf(Array);
    expect(remindersResponse.body.reminders.length).toBe(1);

    // 9. ATUALIZAR REGISTRO
    const updateData = {
      pressaoSistolica: 125,
      observacoes: 'Atualizado - pressão melhorou'
    };

    const updateResponse = await request(app)
      .put(`/api/dialysis/records/${recordId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData)
      .expect(200);

    expect(updateResponse.body.record.pressao_arterial_sistolica).toBe(125);

    // 10. REFRESH TOKEN
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshResponse.body).toHaveProperty('accessToken');
    expect(refreshResponse.body).toHaveProperty('refreshToken');

    const newAccessToken = refreshResponse.body.accessToken;

    // 11. USAR NOVO TOKEN
    const verifyNewTokenResponse = await request(app)
      .get('/api/patient/profile')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    expect(verifyNewTokenResponse.body.patient.email).toBe(registerData.email);

    // 12. LOGOUT
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    expect(logoutResponse.body).toHaveProperty('message');

    // 13. VERIFICAR QUE TOKEN FOI INVALIDADO
    await request(app)
      .get('/api/patient/profile')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(401);
  });

  it('deve rejeitar ações sem autenticação', async () => {
    // Tentar acessar rotas protegidas sem token
    await request(app)
      .get('/api/patient/profile')
      .expect(401);

    await request(app)
      .post('/api/dialysis/records')
      .send({})
      .expect(401);

    await request(app)
      .get('/api/reminders')
      .expect(401);
  });

  it('deve criar múltiplos registros e calcular estatísticas corretamente', async () => {
    // Registrar paciente
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'Test Patient',
        email: 'stats@test.com',
        senha: 'senha123',
        tipo_usuario: 'paciente',
        cpf: '98765432101'
      })
      .expect(201);

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'stats@test.com',
        senha: 'senha123'
      })
      .expect(200);

    const { accessToken } = loginResponse.body;

    // Criar 5 registros com valores diferentes
    const records = [
      { pressaoSistolica: 120, pressaoDiastolica: 70, ufTotal: 2.0 },
      { pressaoSistolica: 125, pressaoDiastolica: 75, ufTotal: 2.2 },
      { pressaoSistolica: 130, pressaoDiastolica: 80, ufTotal: 2.4 },
      { pressaoSistolica: 135, pressaoDiastolica: 85, ufTotal: 2.6 },
      { pressaoSistolica: 140, pressaoDiastolica: 90, ufTotal: 2.8 }
    ];

    for (const record of records) {
      await request(app)
        .post('/api/dialysis/records')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(record)
        .expect(201);
    }

    // Verificar estatísticas
    const statsResponse = await request(app)
      .get('/api/dialysis/stats')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(statsResponse.body.averages).toHaveProperty('sistolica');
    expect(statsResponse.body.averages.sistolica).toBe(130); // Média de 120, 125, 130, 135, 140
    expect(statsResponse.body.averages.diastolica).toBe(80);
  });
});

// tests/integration/doctor-flow.integration.test.js
// Teste de fluxo completo do médico

const request = require('supertest');
const app = require('../../src/app');
const { cleanDatabase, createUser, createDoctor, createPatient, createDialysisRecord } = require('../helpers/factory.helper');

describe('Doctor Flow Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('deve completar o fluxo completo do médico', async () => {
    // 1. REGISTRAR MÉDICO
    const doctorRegisterData = {
      nome: 'Dr. Carlos Oliveira',
      email: 'carlos@test.com',
      senha: 'senha123',
      tipo_usuario: 'medico',
      crm: '123456',
      especialidade: 'Nefrologia',
      telefone_contato: '81988888888'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(doctorRegisterData)
      .expect(201);

    expect(registerResponse.body.user).toHaveProperty('id');

    // 2. LOGIN
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: doctorRegisterData.email,
        senha: doctorRegisterData.senha
      })
      .expect(200);

    const { accessToken } = loginResponse.body;

    // 3. VER PERFIL
    const profileResponse = await request(app)
      .get('/api/doctor/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profileResponse.body.doctor).toHaveProperty('crm', doctorRegisterData.crm);
    expect(profileResponse.body.doctor).toHaveProperty('especialidade', doctorRegisterData.especialidade);

    // 4. REGISTRAR PACIENTE (simulando admin ou outro fluxo)
    const patientUser = await createUser({ tipo_usuario: 'paciente' });
    const medicoResult = await db.query(
      'SELECT id FROM medicos WHERE usuario_id = $1',
      [registerResponse.body.user.id]
    );
    const medicoId = medicoResult.rows[0].id;
    const patient = await createPatient(patientUser.id, medicoId);

    // Criar alguns registros de diálise para o paciente
    await createDialysisRecord(patient.id, { pressao_arterial_sistolica: 130, pressao_arterial_diastolica: 80 });
    await createDialysisRecord(patient.id, { pressao_arterial_sistolica: 135, pressao_arterial_diastolica: 85 });
    await createDialysisRecord(patient.id, { pressao_arterial_sistolica: 140, pressao_arterial_diastolica: 90 });

    // 5. LISTAR PACIENTES
    const patientsResponse = await request(app)
      .get('/api/doctor/patients')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(patientsResponse.body.patients).toBeInstanceOf(Array);
    expect(patientsResponse.body.patients.length).toBe(1);
    expect(patientsResponse.body.patients[0].paciente_id).toBe(patient.id);

    // 6. VER DETALHES DO PACIENTE
    const patientDetailsResponse = await request(app)
      .get(`/api/doctor/patients/${patient.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(patientDetailsResponse.body).toHaveProperty('patient');
    expect(patientDetailsResponse.body).toHaveProperty('recentDialysis');
    expect(patientDetailsResponse.body).toHaveProperty('stats');
    expect(patientDetailsResponse.body.recentDialysis.length).toBe(3);

    // 7. VER ANALYTICS DO PACIENTE
    const analyticsResponse = await request(app)
      .get(`/api/doctor/patients/${patient.id}/analytics`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ days: 30 })
      .expect(200);

    expect(analyticsResponse.body).toHaveProperty('pressureData');
    expect(analyticsResponse.body).toHaveProperty('trends');
    expect(analyticsResponse.body).toHaveProperty('predictions');

    // 8. ENVIAR ALERTA PARA PACIENTE
    const alertData = {
      titulo: 'Pressão Elevada',
      mensagem: 'Sua pressão está consistentemente elevada. Agende uma consulta.',
      prioridade: 'alta'
    };

    const alertResponse = await request(app)
      .post(`/api/doctor/patients/${patient.id}/alert`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(alertData)
      .expect(201);

    expect(alertResponse.body).toHaveProperty('success', true);
    expect(alertResponse.body).toHaveProperty('notification');

    // 9. VER DASHBOARD
    const dashboardResponse = await request(app)
      .get('/api/doctor/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(dashboardResponse.body).toHaveProperty('totalPatients', 1);
    expect(dashboardResponse.body).toHaveProperty('unreadAlerts');
    expect(dashboardResponse.body).toHaveProperty('sessionsToday');

    // 10. GERAR RELATÓRIO DO PACIENTE
    const reportResponse = await request(app)
      .get(`/api/reports/patient/${patient.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      })
      .expect(200);

    expect(reportResponse.body).toHaveProperty('patient');
    expect(reportResponse.body).toHaveProperty('statistics');
    expect(reportResponse.body).toHaveProperty('dialysisRecords');
    expect(reportResponse.body.statistics.totalSessions).toBe(3);

    // 11. ATUALIZAR PERFIL
    const updateProfileData = {
      telefone: '81999999999',
      especialidade: 'Nefrologia Pediátrica'
    };

    const updateProfileResponse = await request(app)
      .put('/api/doctor/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateProfileData)
      .expect(200);

    expect(updateProfileResponse.body.doctor.telefone).toBe(updateProfileData.telefone);
    expect(updateProfileResponse.body.doctor.especialidade).toBe(updateProfileData.especialidade);

    // 12. ALTERAR SENHA
    const changePasswordResponse = await request(app)
      .put('/api/doctor/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'senha123',
        newPassword: 'novaSenha456'
      })
      .expect(200);

    expect(changePasswordResponse.body).toHaveProperty('message');

    // 13. VERIFICAR NOVA SENHA FUNCIONA
    const newLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: doctorRegisterData.email,
        senha: 'novaSenha456'
      })
      .expect(200);

    expect(newLoginResponse.body).toHaveProperty('accessToken');
  });

  it('deve impedir acesso a pacientes de outros médicos', async () => {
    // Criar médico 1
    const doctor1 = await createUser({ tipo_usuario: 'medico' });
    const doctor1Data = await createDoctor(doctor1.id);
    const doctor1Token = generateToken(doctor1.id, 'medico');

    // Criar médico 2
    const doctor2 = await createUser({ tipo_usuario: 'medico' });
    const doctor2Data = await createDoctor(doctor2.id);

    // Criar paciente do médico 2
    const patientUser = await createUser({ tipo_usuario: 'paciente' });
    const patient = await createPatient(patientUser.id, doctor2Data.id);

    // Médico 1 tentar acessar paciente do médico 2
    await request(app)
      .get(`/api/doctor/patients/${patient.id}`)
      .set('Authorization', `Bearer ${doctor1Token}`)
      .expect(404); // Ou 403, dependendo da implementação
  });
});
