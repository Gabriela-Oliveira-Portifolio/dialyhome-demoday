const db = require('../../src/config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { faker } = require('@faker-js/faker');

/**
 * Cria um usuário de teste
 */
const createUser = async (overrides = {}) => {
  const defaultData = {
    nome: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    senha_hash: await bcrypt.hash(overrides.senha || 'senha123', 10),
    tipo_usuario: overrides.tipo_usuario || 'paciente',
    ativo: true
  };

  const userData = { ...defaultData, ...overrides };

  const result = await db.query(
    `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userData.nome, userData.email, userData.senha_hash, userData.tipo_usuario, userData.ativo]
  );

  return result.rows[0];
};

/**
 * Cria um médico de teste
 */
const createDoctor = async (usuarioId, overrides = {}) => {
  const defaultData = {
    crm: faker.string.numeric(6),
    especialidade: 'Nefrologia',
    telefone_contato: faker.phone.number('81#########')
  };

  const doctorData = { ...defaultData, ...overrides };

  const result = await db.query(
    `INSERT INTO medicos (usuario_id, crm, especialidade, telefone_contato)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [usuarioId, doctorData.crm, doctorData.especialidade, doctorData.telefone_contato]
  );

  return result.rows[0];
};

/**
 * Cria um paciente de teste
 */
const createPatient = async (usuarioId, medicoResponsavelId = null, overrides = {}) => {
  const defaultData = {
    cpf: faker.string.numeric(11),
    data_nascimento: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
    telefone: faker.phone.number('81#########'),
    endereco: faker.location.streetAddress(),
    peso_inicial: faker.number.float({ min: 50, max: 120, precision: 0.1 }),
    altura: faker.number.float({ min: 1.5, max: 2.0, precision: 0.01 })
  };

  const patientData = { ...defaultData, ...overrides };

  const result = await db.query(
    `INSERT INTO pacientes (
      usuario_id, cpf, data_nascimento, telefone, endereco, 
      peso_inicial, altura, medico_responsavel_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      usuarioId,
      patientData.cpf,
      patientData.data_nascimento,
      patientData.telefone,
      patientData.endereco,
      patientData.peso_inicial,
      patientData.altura,
      medicoResponsavelId
    ]
  );

  return result.rows[0];
};

/**
 * Cria um registro de diálise de teste
 */
const createDialysisRecord = async (pacienteId, overrides = {}) => {
  const defaultData = {
    data_registro: new Date(),
    pressao_arterial_sistolica: faker.number.int({ min: 100, max: 160 }),
    pressao_arterial_diastolica: faker.number.int({ min: 60, max: 100 }),
    drenagem_inicial: faker.number.int({ min: 1500, max: 3000 }),
    uf_total: faker.number.int({ min: 1500, max: 3000 }),
    tempo_permanencia: faker.number.int({ min: 180, max: 300 }),
    concentracao_glicose: faker.number.int({ min: 80, max: 180 }),
    concentracao_dextrose: faker.number.float({ min: 1.5, max: 4.25 })
  };

  const recordData = { ...defaultData, ...overrides };

  const result = await db.query(
    `INSERT INTO registros_dialise (
      paciente_id, data_registro, pressao_arterial_sistolica, pressao_arterial_diastolica,
      drenagem_inicial, uf_total, tempo_permanencia, concentracao_glicose, concentracao_dextrose
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      pacienteId,
      recordData.data_registro,
      recordData.pressao_arterial_sistolica,
      recordData.pressao_arterial_diastolica,
      recordData.drenagem_inicial,
      recordData.uf_total,
      recordData.tempo_permanencia,
      recordData.concentracao_glicose,
      recordData.concentracao_dextrose
    ]
  );

  return result.rows[0];
};

/**
 * Cria uma notificação de teste
 */
const createNotification = async (usuarioDestinatarioId, overrides = {}) => {
  const defaultData = {
    tipo: 'alerta_medico',
    titulo: faker.lorem.sentence(),
    mensagem: faker.lorem.paragraph(),
    lida: false
  };

  const notificationData = { ...defaultData, ...overrides };

  const result = await db.query(
    `INSERT INTO notificacoes (usuario_destinatario_id, tipo, titulo, mensagem, lida)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      usuarioDestinatarioId,
      notificationData.tipo,
      notificationData.titulo,
      notificationData.mensagem,
      notificationData.lida
    ]
  );

  return result.rows[0];
};

/**
 * Cria um lembrete de teste
 */
const createReminder = async (pacienteId, overrides = {}) => {
  const defaultData = {
    tipo: 'medicacao',
    titulo: faker.lorem.sentence(3),
    descricao: faker.lorem.sentence(),
    data_hora: faker.date.future(),
    recorrente: false,
    ativo: true
  };

  const reminderData = { ...defaultData, ...overrides };

  const result = await db.query(
    `INSERT INTO lembretes (paciente_id, tipo, titulo, descricao, data_hora, recorrente, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      pacienteId,
      reminderData.tipo,
      reminderData.titulo,
      reminderData.descricao,
      reminderData.data_hora,
      reminderData.recorrente,
      reminderData.ativo
    ]
  );

  return result.rows[0];
};

/**
 * Cria uma mensagem de teste
 */
const createMessage = async (remetenteId, destinatarioId, overrides = {}) => {
  const defaultData = {
    assunto: faker.lorem.sentence(),
    mensagem: faker.lorem.paragraph(),
    lida: false
  };

  const messageData = { ...defaultData, ...overrides };

  const result = await db.query(
    `INSERT INTO mensagens (remetente_id, destinatario_id, assunto, mensagem, lida)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      remetenteId,
      destinatarioId,
      messageData.assunto,
      messageData.mensagem,
      messageData.lida
    ]
  );

  return result.rows[0];
};

/**
 * Cria um medicamento de teste
 */
const createMedication = async (pacienteId, overrides = {}) => {
  const defaultData = {
    nome: faker.commerce.productName(),
    dosagem: '10mg',
    frequencia: '1x ao dia',
    horarios: ['08:00'],
    ativo: true
  };

  const medicationData = { ...defaultData, ...overrides };

  const result = await db.query(
    `INSERT INTO medicamentos (paciente_id, nome, dosagem, frequencia, horarios, ativo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      pacienteId,
      medicationData.nome,
      medicationData.dosagem,
      medicationData.frequencia,
      JSON.stringify(medicationData.horarios),
      medicationData.ativo
    ]
  );

  return result.rows[0];
};

/**
 * Gera um token JWT de teste
 */
const generateToken = (userId, tipoUsuario, type = 'access') => {
  const expiresIn = type === 'access' ? '15m' : '7d';
  
  return jwt.sign(
    {
      userId,
      tipo_usuario: tipoUsuario,
      type
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn }
  );
};

/**
 * Cria um cenário completo médico-paciente
 */
const createDoctorPatientScenario = async () => {
  // Criar médico
  const doctorUser = await createUser({ tipo_usuario: 'medico', nome: 'Dr. Carlos' });
  const doctor = await createDoctor(doctorUser.id);
  const doctorToken = generateToken(doctorUser.id, 'medico');

  // Criar paciente
  const patientUser = await createUser({ tipo_usuario: 'paciente', nome: 'João Silva' });
  const patient = await createPatient(patientUser.id, doctor.id);
  const patientToken = generateToken(patientUser.id, 'paciente');

  // Criar alguns registros de diálise
  const dialysisRecords = [];
  for (let i = 0; i < 3; i++) {
    const record = await createDialysisRecord(patient.id, {
      data_registro: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    });
    dialysisRecords.push(record);
  }

  return {
    doctor: { user: doctorUser, data: doctor, token: doctorToken },
    patient: { user: patientUser, data: patient, token: patientToken },
    dialysisRecords
  };
};

/**
 * Limpa todas as tabelas na ordem correta
 */
const cleanDatabase = async () => {
  const tables = [
    'registro_sintomas',
    'sintomas_predefinidos',
    'registros_dialise',
    'notificacoes',
    'mensagens',
    'lembretes',
    'medicamentos',
    'logs_auditoria',
    'tokens_invalidados',
    'pacientes',
    'medicos',
    'usuarios'
  ];

  for (const table of tables) {
    await db.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
  }
};

module.exports = {
  createUser,
  createDoctor,
  createPatient,
  createDialysisRecord,
  createNotification,
  createReminder,
  createMessage,
  createMedication,
  generateToken,
  createDoctorPatientScenario,
  cleanDatabase
};
