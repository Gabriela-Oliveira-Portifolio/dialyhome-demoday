// test-insert.js
const db = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function testInsert() {
  try {
    // Testar inserção de usuário
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const result = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ($1, $2, $3, $4) RETURNING id, nome, email',
      ['Teste Usuario', 'teste@example.com', hashedPassword, 'paciente']
    );
    
    console.log('✅ Usuário criado:', result.rows[0]);
    
    // Testar busca
    const findUser = await db.query('SELECT * FROM usuarios WHERE email = $1', ['teste@example.com']);
    console.log('✅ Usuário encontrado:', findUser.rows[0]);
    
    // Limpar teste
    await db.query('DELETE FROM usuarios WHERE email = $1', ['teste@example.com']);
    console.log('✅ Usuário de teste removido');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit();
  }
}

testInsert();