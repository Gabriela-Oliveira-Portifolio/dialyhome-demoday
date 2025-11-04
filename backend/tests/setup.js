// // backend/tests/setup.js
// Configuração global para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.DB_NAME = 'dialyhome_test'; // Explicitamente usar banco de teste

// Mock console para testes mais limpos (opcional)
global.console = {
  ...console,
  // Manter log para debug
  log: console.log,
};

// Timeout global
jest.setTimeout(30000);

// Limpar todos os mocks antes de cada teste
beforeEach(() => {
  jest.clearAllMocks();
});
// // Configuração global para testes
// process.env.NODE_ENV = 'test';
// process.env.JWT_SECRET = 'test_secret_key';
// process.env.DB_NAME = 'dialyhome_test';
// process.env.DB_HOST = 'localhost';
// process.env.DB_PORT = '5432';
// process.env.DB_USER = 'postgres';
// process.env.DB_PASSWORD = 'admin';

// // Mock console para testes mais limpos (opcional)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
//   // Mantenha log para debug se necessário
//   log: console.log,
// };

// // Timeout global
// jest.setTimeout(10000);

// // Limpar todos os mocks antes de cada teste
// beforeEach(() => {
//   jest.clearAllMocks();
// });