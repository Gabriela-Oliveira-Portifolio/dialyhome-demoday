// test-jwt.js
const jwt = require('jsonwebtoken');

// Testar criação de token
const payload = { userId: 1, tipo_usuario: 'paciente' };
const secret = 'test_secret';
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('✅ Token gerado:', token);

// Testar validação de token
try {
  const decoded = jwt.verify(token, secret);
  console.log('✅ Token válido:', decoded);
} catch (error) {
  console.error('❌ Token inválido:', error);
}