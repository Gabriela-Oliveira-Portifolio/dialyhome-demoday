const db = require('../src/config/database');

// Configuração global antes de todos os testes
beforeAll(async () => {
  // Conectar ao banco de testes
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

// Limpar dados após cada teste
afterEach(async () => {
  // Limpar tabelas na ordem correta (devido às foreign keys)
  await db.query('TRUNCATE TABLE registro_sintomas CASCADE');
  await db.query('TRUNCATE TABLE registros_dialise CASCADE');
  await db.query('TRUNCATE TABLE notificacoes CASCADE');
  await db.query('TRUNCATE TABLE mensagens CASCADE');
  await db.query('TRUNCATE TABLE lembretes CASCADE');
  await db.query('TRUNCATE TABLE medicamentos CASCADE');
  await db.query('TRUNCATE TABLE logs_auditoria CASCADE');
  await db.query('TRUNCATE TABLE pacientes CASCADE');
  await db.query('TRUNCATE TABLE medicos CASCADE');
  await db.query('TRUNCATE TABLE usuarios CASCADE');
});

// Fechar conexão após todos os testes
afterAll(async () => {
  await db.end();
});