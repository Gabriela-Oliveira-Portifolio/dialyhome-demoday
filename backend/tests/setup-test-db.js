// tests/setup-test-db.js - VERSÃO FINAL COM TODAS AS COLUNAS
require('dotenv').config();
const { Pool } = require('pg');

const setupTestDatabase = async () => {
    console.log('🔧 Configurando banco de dados de teste...');
    
    const pool = new Pool({
        host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
        port: process.env.TEST_DB_PORT || process.env.DB_PORT || 5432,
        database: process.env.TEST_DB_NAME || process.env.DB_NAME || 'dialyhome_test',
        user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
        password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD
    });

    try {
        console.log('✅ Banco de dados já existe');
        console.log('📋 Criando tabelas...');

        // 1. Tabela de usuários
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha_hash VARCHAR(255) NOT NULL,
                tipo_usuario VARCHAR(50) NOT NULL CHECK (tipo_usuario IN ('admin', 'medico', 'paciente')),
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Tabela de médicos
        await pool.query(`
            CREATE TABLE IF NOT EXISTS medicos (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER UNIQUE NOT NULL,
                crm VARCHAR(50) NOT NULL,
                especialidade VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);

        // 3. Tabela de pacientes - ⭐ COM observacoes_medicas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pacientes (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER UNIQUE NOT NULL,
                data_nascimento DATE,
                telefone VARCHAR(20),
                cpf VARCHAR(20),
                endereco TEXT,
                medico_id INTEGER,
                observacoes_medicas TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (medico_id) REFERENCES medicos(id) ON DELETE SET NULL
            );
        `);

        // 4. Tabela de registros de diálise - ⭐ COM concentracao_glicose
        await pool.query(`
            CREATE TABLE IF NOT EXISTS registros_dialise (
                id SERIAL PRIMARY KEY,
                paciente_id INTEGER NOT NULL,
                data_registro DATE NOT NULL,
                peso_pre_dialise numeric(5, 2) NULL,
                peso_pos_dialise numeric(5, 2) NULL,
                uf_total int4 NULL,
                pressao_arterial_sistolica int4 NULL,
                pressao_arterial_diastolica int4 NULL,
                temperatura numeric(4, 2) NULL,
                observacoes text NULL,
                concentracao_glicose numeric(6, 2) NULL,
                horario_inicio time NULL,
                horario_fim time NULL,
                drenagem_inicial int4 NULL,
                tempo_permanencia int4 NULL,
                concentracao_dextrose numeric(6, 2) NULL,
                sintomas text NULL,
                data_criacao timestamp DEFAULT CURRENT_TIMESTAMP NULL,
                data DATE,
                FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
            );
        `);

        // 5. Tabela de tokens invalidados
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tokens_invalidados (
                id SERIAL PRIMARY KEY,
                token TEXT NOT NULL UNIQUE,
                usuario_id INTEGER NOT NULL,
                data_invalidacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                motivo VARCHAR(100),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS registro_sintomas (
                id serial4 NOT NULL,
                registro_dialise_id INTEGER NULL,
                sintoma_id int4 NULL,
                severidade varchar(20) NULL
            );
        `);

        // 6. Tabela de logs de auditoria
        await pool.query(`
            CREATE TABLE IF NOT EXISTS logs_auditoria (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                acao VARCHAR(100) NOT NULL,
                tabela VARCHAR(100),
                registro_id INTEGER,
                dados_anteriores JSONB,
                dados_novos JSONB,
                ip_address VARCHAR(50),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);

         await pool.query(`
            CREATE TABLE IF NOT EXISTS notificacoes (
                id serial4 NOT NULL,
                usuario_id INTEGER NULL,
                titulo varchar(200) NULL,
                mensagem text NULL,
                tipo varchar(50) NULL,
                lida bool DEFAULT false NULL,
                data_criacao timestamp DEFAULT CURRENT_TIMESTAMP NULL
            );
        `);

        // ⭐ ADICIONAR COLUNAS FALTANTES (caso as tabelas já existam)
        console.log('🔧 Verificando e adicionando colunas faltantes...');
        
        // Adicionar observacoes_medicas se não existir
        await pool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='pacientes' AND column_name='observacoes_medicas'
                ) THEN
                    ALTER TABLE pacientes ADD COLUMN observacoes_medicas TEXT;
                END IF;
            END $$;
        `);

        // Adicionar concentracao_glicose se não existir
        await pool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='registros_dialise' AND column_name='concentracao_glicose'
                ) THEN
                    ALTER TABLE registros_dialise ADD COLUMN concentracao_glicose DECIMAL(5,2);
                END IF;
            END $$;
        `);

        // Criar índices
        console.log('📊 Criando índices...');
        
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_tokens_invalidados_token ON tokens_invalidados(token);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_tokens_invalidados_usuario ON tokens_invalidados(usuario_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_registros_dialise_paciente ON registros_dialise(paciente_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_registros_dialise_data ON registros_dialise(data);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_auditoria_usuario ON logs_auditoria(usuario_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_auditoria_acao ON logs_auditoria(acao);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_auditoria_created ON logs_auditoria(created_at);`);

        console.log('✅ Tabelas criadas com sucesso!');
        console.log('ℹ️  Admin será criado pelos testes de integração');
        console.log('🎉 Setup do banco de dados concluído!');

    } catch (error) {
        console.error('❌ Erro ao configurar banco de dados:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
};

if (require.main === module) {
    setupTestDatabase()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Falha no setup:', error);
            process.exit(1);
        });
}

module.exports = setupTestDatabase;
// // backend/tests/setup-test-db.js

// const { Pool } = require('pg');
// require('dotenv').config();

// const setupTestDatabase = async () => {
//   const rootPool = new Pool({
//     user: process.env.DB_USER || 'postgres',
//     host: process.env.DB_HOST || 'localhost',
//     database: 'postgres',
//     password: process.env.DB_PASSWORD || 'admin',
//     port: process.env.DB_PORT || 5432,
//   });

//   try {
//     console.log('🔧 Configurando banco de dados de teste...');

//     const checkDb = await rootPool.query(
//       `SELECT 1 FROM pg_database WHERE datname='dialyhome_test'`
//     );

//     if (checkDb.rows.length === 0) {
//       console.log('📦 Criando banco de dados dialyhome_test...');
//       await rootPool.query('CREATE DATABASE dialyhome_test');
//       console.log('✅ Banco de dados criado!');
//     } else {
//       console.log('✅ Banco de dados já existe');
//     }

//     await rootPool.end();

//     const testPool = new Pool({
//       user: process.env.DB_USER || 'postgres',
//       host: process.env.DB_HOST || 'localhost',
//       database: 'dialyhome_test',
//       password: process.env.DB_PASSWORD || 'admin',
//       port: process.env.DB_PORT || 5432,
//     });

//     console.log('📋 Criando tabelas...');

//     await testPool.query(`
//       DROP TABLE IF EXISTS logs_auditoria CASCADE;
//       DROP TABLE IF EXISTS registro_sintomas CASCADE;
//       DROP TABLE IF EXISTS sintomas_predefinidos CASCADE;
//       DROP TABLE IF EXISTS notificacoes CASCADE;
//       DROP TABLE IF EXISTS registros_dialise CASCADE;
//       DROP TABLE IF EXISTS pacientes CASCADE;
//       DROP TABLE IF EXISTS medicos CASCADE;
//       DROP TABLE IF EXISTS usuarios CASCADE;

//       CREATE TABLE usuarios (
//         id SERIAL PRIMARY KEY,
//         nome VARCHAR(100) NOT NULL,
//         email VARCHAR(100) UNIQUE NOT NULL,
//         senha_hash VARCHAR(255) NOT NULL,
//         tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('admin', 'medico', 'paciente')),
//         ativo BOOLEAN DEFAULT true,
//         data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );

//       CREATE TABLE medicos (
//         id SERIAL PRIMARY KEY,
//         usuario_id INTEGER UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
//         crm VARCHAR(20),
//         especialidade VARCHAR(100),
//         telefone_contato VARCHAR(20)
//       );

//       CREATE TABLE pacientes (
//         id SERIAL PRIMARY KEY,
//         usuario_id INTEGER UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
//         cpf VARCHAR(11),
//         data_nascimento DATE,
//         telefone VARCHAR(20),
//         endereco TEXT,
//         peso_inicial DECIMAL(5,2),
//         altura DECIMAL(3,2),
//         medico_responsavel_id INTEGER REFERENCES medicos(id),
//         data_inicio_tratamento DATE
//       );

//       CREATE TABLE registros_dialise (
//         id SERIAL PRIMARY KEY,
//         paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
//         data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         peso_pre_dialise DECIMAL(5,2),
//         peso_pos_dialise DECIMAL(5,2),
//         uf_total INTEGER,
//         pressao_arterial_sistolica INTEGER,
//         pressao_arterial_diastolica INTEGER,
//         temperatura DECIMAL(4,2),
//         observacoes TEXT
//       );

//       CREATE TABLE sintomas_predefinidos (
//         id SERIAL PRIMARY KEY,
//         nome VARCHAR(100) NOT NULL,
//         categoria VARCHAR(50),
//         descricao TEXT
//       );

//       CREATE TABLE registro_sintomas (
//         id SERIAL PRIMARY KEY,
//         registro_dialise_id INTEGER REFERENCES registros_dialise(id) ON DELETE CASCADE,
//         sintoma_id INTEGER REFERENCES sintomas_predefinidos(id),
//         severidade VARCHAR(20) CHECK (severidade IN ('leve', 'moderado', 'grave'))
//       );

//       CREATE TABLE notificacoes (
//         id SERIAL PRIMARY KEY,
//         usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
//         titulo VARCHAR(200),
//         mensagem TEXT,
//         tipo VARCHAR(50),
//         lida BOOLEAN DEFAULT false,
//         data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );

//       CREATE TABLE logs_auditoria (
//         id SERIAL PRIMARY KEY,
//         usuario_id INTEGER REFERENCES usuarios(id),
//         tabela_afetada VARCHAR(100),
//         operacao VARCHAR(20),
//         dados_anteriores JSONB,
//         dados_novos JSONB,
//         data_operacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         ip_address VARCHAR(45)
//       );

//       CREATE TABLE IF NOT EXISTS tokens_invalidados (
//                 id SERIAL PRIMARY KEY,
//                 token TEXT NOT NULL UNIQUE,
//                 usuario_id INTEGER NOT NULL,
//                 data_invalidacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//                 motivo VARCHAR(100),
//                 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
//             );

//     `);

//     console.log('✅ Tabelas criadas com sucesso!');
//     console.log('ℹ️  Admin será criado pelos testes de integração');

//     await testPool.end();
//     console.log('🎉 Setup do banco de dados concluído!');
//     process.exit(0);

//   } catch (error) {
//     console.error('❌ Erro ao configurar banco de teste:', error);
//     process.exit(1);
//   }
// };

// setupTestDatabase();