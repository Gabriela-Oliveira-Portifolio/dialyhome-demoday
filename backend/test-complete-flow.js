const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
let authToken = '';

async function runTests() {
  try {
    console.log('🧪 Iniciando testes completos...\n');

    // Teste 1: Health Check
    console.log('1️⃣ Testando Health Check...');
    const healthResponse = await axios.get(`${API_URL}/test`);
    console.log('✅ Health Check OK:', healthResponse.data.message);

    // Teste 2: Registro
    console.log('\n2️⃣ Testando Registro...');
    const userData = {
      nome: 'Teste Paciente',
      email: `teste${Date.now()}@example.com`,
      senha: '123456',
      tipo_usuario: 'paciente',
      cpf: '123.456.789-00'
    };

    const registerResponse = await axios.post(`${API_URL}/auth/register`, userData);
    console.log('✅ Registro OK:', registerResponse.data.message);

    // Teste 3: Login
    console.log('\n3️⃣ Testando Login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: userData.email,
      senha: userData.senha
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login OK, token recebido');

    // Teste 4: Rota Protegida
    console.log('\n4️⃣ Testando Rota Protegida...');
    const protectedResponse = await axios.get(`${API_URL}/test/protected`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Rota protegida OK:', protectedResponse.data.message);

    console.log('\n🎉 Todos os testes passaram!');

  } catch (error) {
    console.error('❌ Teste falhou:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

runTests();