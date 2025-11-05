// test-db.js
const db = require('../../src/config/database');

async function testConnection() {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ Banco conectado!', result.rows[0]);
    
    // Testar se tabelas existem
    const tables = await db.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    console.log('📋 Tabelas encontradas:', tables.rows.map(t => t.tablename));
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
  } finally {
    process.exit();
  }
}

testConnection();