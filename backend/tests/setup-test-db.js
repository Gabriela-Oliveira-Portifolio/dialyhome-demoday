// backend/tests/setup-test-db.js

const { Pool } = require('pg');
require('dotenv').config();

const setupTestDatabase = async () => {
  const rootPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('🔧 Configurando banco de dados de teste...');

    const checkDb = await rootPool.query(
      `SELECT 1 FROM pg_database WHERE datname='dialyhome_test'`
    );

    if (checkDb.rows.length === 0) {
      console.log('📦 Criando banco de dados dialyhome_test...');
      await rootPool.query('CREATE DATABASE dialyhome_test');
      console.log('✅ Banco de dados criado!');
    } else {
      console.log('✅ Banco de dados já existe');
    }

    await rootPool.end();

    const testPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: 'dialyhome_test',
      password: process.env.DB_PASSWORD || 'admin',
      port: process.env.DB_PORT || 5432,
    });

    console.log('📋 Criando tabelas...');

    await testPool.query(`
      DROP TABLE IF EXISTS logs_auditoria CASCADE;
      DROP TABLE IF EXISTS registro_sintomas CASCADE;
      DROP TABLE IF EXISTS sintomas_predefinidos CASCADE;
      DROP TABLE IF EXISTS notificacoes CASCADE;
      DROP TABLE IF EXISTS registros_dialise CASCADE;
      DROP TABLE IF EXISTS pacientes CASCADE;
      DROP TABLE IF EXISTS medicos CASCADE;
      DROP TABLE IF EXISTS usuarios CASCADE;

      CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('admin', 'medico', 'paciente')),
        ativo BOOLEAN DEFAULT true,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE medicos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
        crm VARCHAR(20),
        especialidade VARCHAR(100),
        telefone_contato VARCHAR(20)
      );

      CREATE TABLE pacientes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
        cpf VARCHAR(11),
        data_nascimento DATE,
        telefone VARCHAR(20),
        endereco TEXT,
        peso_inicial DECIMAL(5,2),
        altura DECIMAL(3,2),
        medico_responsavel_id INTEGER REFERENCES medicos(id),
        data_inicio_tratamento DATE
      );

      CREATE TABLE registros_dialise (
        id SERIAL PRIMARY KEY,
        paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        peso_pre_dialise DECIMAL(5,2),
        peso_pos_dialise DECIMAL(5,2),
        uf_total INTEGER,
        pressao_arterial_sistolica INTEGER,
        pressao_arterial_diastolica INTEGER,
        temperatura DECIMAL(4,2),
        observacoes TEXT
      );

      CREATE TABLE sintomas_predefinidos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        categoria VARCHAR(50),
        descricao TEXT
      );

      CREATE TABLE registro_sintomas (
        id SERIAL PRIMARY KEY,
        registro_dialise_id INTEGER REFERENCES registros_dialise(id) ON DELETE CASCADE,
        sintoma_id INTEGER REFERENCES sintomas_predefinidos(id),
        severidade VARCHAR(20) CHECK (severidade IN ('leve', 'moderado', 'grave'))
      );

      CREATE TABLE notificacoes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        titulo VARCHAR(200),
        mensagem TEXT,
        tipo VARCHAR(50),
        lida BOOLEAN DEFAULT false,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE logs_auditoria (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        tabela_afetada VARCHAR(100),
        operacao VARCHAR(20),
        dados_anteriores JSONB,
        dados_novos JSONB,
        data_operacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45)
      );
    `);

    console.log('✅ Tabelas criadas com sucesso!');
    console.log('ℹ️  Admin será criado pelos testes de integração');

    await testPool.end();
    console.log('🎉 Setup do banco de dados concluído!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro ao configurar banco de teste:', error);
    process.exit(1);
  }
};

setupTestDatabase();