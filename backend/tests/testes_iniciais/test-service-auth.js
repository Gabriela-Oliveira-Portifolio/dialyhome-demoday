const authService = require('../../src/services/authService');
require('dotenv').config();

async function testarManualmente() {
  console.log('🧪 Testando AuthService manualmente...');
  
  try {
    // Teste 1: Hash de senha
    console.log('\n1️⃣ Testando hash de senha...');
    const hash = await authService.hashPassword('teste123');
    console.log('✅ Hash gerado:', hash.substring(0, 20) + '...');
    
    // Teste 2: Comparar senha
    console.log('\n2️⃣ Testando comparação de senha...');
    const isValid = await authService.comparePassword('teste123', hash);
    console.log('✅ Senha válida:', isValid);
    
    // Teste 3: Gerar token
    console.log('\n3️⃣ Testando geração de token...');
    const token = authService.generateToken(123);
    console.log('✅ Token gerado:', token.substring(0, 30) + '...');
    
    // Teste 4: Verificar token
    console.log('\n4️⃣ Testando verificação de token...');
    const decoded = authService.verifyToken(token);
    console.log('✅ Token decodificado:', decoded);
    
    console.log('\n🎉 Todos os testes manuais passaram!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
  
  process.exit(0);
}

testarManualmente();