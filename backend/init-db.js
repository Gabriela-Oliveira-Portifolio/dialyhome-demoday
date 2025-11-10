const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('🚀 Conectando ao banco...');
    
    // Ordem importa! Primeiro criamos as tabelas base (usuarios, sintomas_predefinidos, etc.)
    await pool.query(`

      -- Tabela de usuários
      CREATE TABLE IF NOT EXISTS public.usuarios (
        id serial PRIMARY KEY,
        nome varchar(255) NOT NULL,
        email varchar(255) UNIQUE NOT NULL,
        senha_hash varchar(255) NOT NULL,
        tipo_usuario varchar(20) NOT NULL CHECK (tipo_usuario IN ('paciente','medico','admin')),
        ativo bool DEFAULT true,
        data_criacao timestamp DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao timestamp DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios (email);
      CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON public.usuarios (tipo_usuario);

      -- Tabela de sintomas predefinidos
      CREATE TABLE IF NOT EXISTS public.sintomas_predefinidos (
        id serial PRIMARY KEY,
        nome varchar(100) NOT NULL,
        categoria varchar(50),
        severidade_padrao varchar(20) DEFAULT 'leve'
      );

      -- Tabela de pacientes
      CREATE TABLE IF NOT EXISTS public.pacientes (
        id serial PRIMARY KEY,
        usuario_id int UNIQUE REFERENCES public.usuarios(id) ON DELETE CASCADE,
        cpf varchar(14) UNIQUE,
        data_nascimento date,
        telefone varchar(20),
        endereco text,
        peso_inicial numeric(5,2),
        altura numeric(3,2),
        data_inicio_tratamento date,
        observacoes_medicas text,
        medico_responsavel_id int
      );

      -- Tabela de médicos
      CREATE TABLE IF NOT EXISTS public.medicos (
        id serial PRIMARY KEY,
        usuario_id int UNIQUE REFERENCES public.usuarios(id) ON DELETE CASCADE,
        crm varchar(20) UNIQUE NOT NULL,
        especialidade varchar(100),
        local_atendimento text,
        telefone_contato varchar(20)
      );

      -- Tabela de registros de diálise
      CREATE TABLE IF NOT EXISTS public.registros_dialise (
        id serial PRIMARY KEY,
        paciente_id int REFERENCES public.pacientes(id) ON DELETE CASCADE,
        data_registro date NOT NULL,
        horario_inicio time,
        horario_fim time,
        pressao_arterial_sistolica int,
        pressao_arterial_diastolica int,
        peso_pre_dialise numeric(5,2),
        peso_pos_dialise numeric(5,2),
        drenagem_inicial int,
        uf_total int,
        tempo_permanencia int,
        concentracao_glicose numeric(6,2),
        concentracao_dextrose numeric(6,2),
        sintomas text,
        observacoes text,
        data_criacao timestamp DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_registros_dialise_paciente ON public.registros_dialise (paciente_id);
      CREATE INDEX IF NOT EXISTS idx_registros_dialise_paciente_data ON public.registros_dialise (paciente_id, data_registro);

      -- Tabela de registro de sintomas
      CREATE TABLE IF NOT EXISTS public.registro_sintomas (
        id serial PRIMARY KEY,
        registro_dialise_id int REFERENCES public.registros_dialise(id) ON DELETE CASCADE,
        sintoma_id int REFERENCES public.sintomas_predefinidos(id),
        severidade varchar(20) DEFAULT 'leve',
        observacoes text
      );

      -- Tabela de lembretes
      CREATE TABLE IF NOT EXISTS public.lembretes (
        id serial PRIMARY KEY,
        paciente_id int REFERENCES public.pacientes(id) ON DELETE CASCADE,
        tipo varchar(50) NOT NULL,
        titulo varchar(255) NOT NULL,
        descricao text,
        data_hora timestamp NOT NULL,
        recorrente bool DEFAULT false,
        frequencia_recorrencia varchar(50),
        ativo bool DEFAULT true,
        data_criacao timestamp DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_lembretes_paciente_ativo ON public.lembretes (paciente_id, ativo);

      -- Tabela de notificações
      CREATE TABLE IF NOT EXISTS public.notificacoes (
        id serial PRIMARY KEY,
        usuario_destinatario_id int REFERENCES public.usuarios(id),
        tipo varchar(50) NOT NULL,
        titulo varchar(255) NOT NULL,
        mensagem text NOT NULL,
        lida bool DEFAULT false,
        data_criacao timestamp DEFAULT CURRENT_TIMESTAMP,
        data_leitura timestamp,
        prioridade varchar(20)
      );
      CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida ON public.notificacoes (usuario_destinatario_id, lida);

      -- Tabela de tokens invalidados
      CREATE TABLE IF NOT EXISTS public.tokens_invalidados (
        id serial PRIMARY KEY,
        token text NOT NULL,
        usuario_id int REFERENCES public.usuarios(id),
        data_invalidacao timestamp DEFAULT CURRENT_TIMESTAMP,
        expira_em timestamp NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tokens_invalidados_token ON public.tokens_invalidados (token);
      CREATE INDEX IF NOT EXISTS idx_tokens_invalidados_usuario ON public.tokens_invalidados (usuario_id);

      -- Logs de auditoria
      CREATE TABLE IF NOT EXISTS public.logs_auditoria (
        id serial PRIMARY KEY,
        usuario_id int REFERENCES public.usuarios(id),
        tabela_afetada varchar(100),
        operacao varchar(20),
        dados_anteriores jsonb,
        dados_novos jsonb,
        ip_address inet,
        user_agent text,
        data_operacao timestamp DEFAULT CURRENT_TIMESTAMP
      );

    `);

    console.log('✅ Todas as tabelas e índices foram criados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    await pool.end();
  }
})();
