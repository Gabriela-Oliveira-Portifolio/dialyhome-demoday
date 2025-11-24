const db = require('../config/database');
const bcrypt = require('bcrypt');

const adminController = {


  // Parte do Dash
  getDashboardStats: async (req, res) => {
    try {
      // Total de usuários por tipo
      const usersStats = await db.query(`
        SELECT 
          tipo_usuario,
          COUNT(*) as total,
          COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
        FROM usuarios
        GROUP BY tipo_usuario
      `);

      // Total de registros de diálise
      const dialysisStats = await db.query(`
        SELECT 
          COUNT(*) as total_registros,
          COUNT(DISTINCT paciente_id) as pacientes_com_registros
        FROM registros_dialise
        WHERE data_registro >= CURRENT_DATE - INTERVAL '6 months'
      `);

      // Registros por mês
      const monthlyRecords = await db.query(`
        SELECT 
          DATE_TRUNC('month', data_registro) as mes,
          COUNT(*) as registros_mes
        FROM registros_dialise
        WHERE data_registro >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY mes
        ORDER BY mes DESC
      `);

      // Alertas/notificações recentes
      const recentAlerts = await db.query(`
        SELECT COUNT(*) as total_alertas
        FROM notificacoes
        WHERE data_criacao >= CURRENT_DATE - INTERVAL '7 days'
          AND lida = false
      `);

      // Atividade recente (logs de auditoria)
      const recentActivity = await db.query(`
        SELECT 
          u.nome,
          u.tipo_usuario,
          la.operacao as acao,
          la.data_operacao as data_hora
        FROM logs_auditoria la
        JOIN usuarios u ON la.usuario_id = u.id
        ORDER BY la.data_operacao DESC
        LIMIT 10
      `);

      // Calcular saúde do sistema  -- Melhoria futura: integrar com monitoramento real - até então valores estão MOCADOS
      const systemHealth = 98.5;

      res.json({
        totalUsers: usersStats.rows.reduce((sum, row) => sum + Number.parseInt(row.total), 0),
        activeUsers: usersStats.rows.reduce((sum, row) => sum + Number.parseInt(row.ativos), 0),
        totalPatients: usersStats.rows.find(r => r.tipo_usuario === 'paciente')?.total || 0,
        totalDoctors: usersStats.rows.find(r => r.tipo_usuario === 'medico')?.total || 0,
        totalRecords: Number.parseInt(dialysisStats.rows[0]?.total_registros) || 0,
        recentAlerts: Number.parseInt(recentAlerts.rows[0]?.total_alertas) || 0,
        systemHealth,
        usersStats: usersStats.rows,
        dialysisStats: dialysisStats.rows[0],
        monthlyRecords: monthlyRecords.rows,
        recentActivity: recentActivity.rows
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard' });
    }
  },

  // Gerenciamento dos usuários
  getAllUsers: async (req, res) => {
    try {
      const { tipo, search, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          u.id,
          u.nome,
          u.email,
          u.tipo_usuario,
          u.ativo,
          u.data_criacao,
          CASE 
            WHEN u.tipo_usuario = 'paciente' THEN p.cpf
            WHEN u.tipo_usuario = 'medico' THEN m.crm
            ELSE NULL
          END as documento
        FROM usuarios u
        LEFT JOIN pacientes p ON u.id = p.usuario_id
        LEFT JOIN medicos m ON u.id = m.usuario_id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (tipo) {
        query += ` AND u.tipo_usuario = $${paramIndex}`;
        params.push(tipo);
        paramIndex++;
      }

      if (search) {
        query += ` AND (u.nome ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY u.data_criacao DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // Total count para paginação
      let countQuery = 'SELECT COUNT(*) FROM usuarios WHERE 1=1';
      const countParams = [];
      let countIndex = 1;
      
      if (tipo) {
        countQuery += ` AND tipo_usuario = $${countIndex}`;
        countParams.push(tipo);
        countIndex++;
      }
      
      if (search) {
        countQuery += ` AND (nome ILIKE $${countIndex} OR email ILIKE $${countIndex})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await db.query(countQuery, countParams);

      res.json({
        users: result.rows,
        total: Number.parseInt(countResult.rows[0].count),
        page: Number.parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      });
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  },

  getUserById: async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.query(`
        SELECT 
          u.*,
          p.cpf, p.data_nascimento, p.telefone, p.endereco, 
          p.peso_inicial, p.altura, p.data_inicio_tratamento,
          m.crm, m.especialidade, m.telefone_contato
        FROM usuarios u
        LEFT JOIN pacientes p ON u.id = p.usuario_id
        LEFT JOIN medicos m ON u.id = m.usuario_id
        WHERE u.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ user: result.rows[0] });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
  },

  createUser: async (req, res) => {
    try {
      const { nome, email, senha, tipo_usuario, ...extraData } = req.body;

      // Validações
      if (!nome || !email || !senha || !tipo_usuario) {
        return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
      }

      // Verificar se email já existe
      const emailExists = await db.query(
        'SELECT id FROM usuarios WHERE email = $1',
        [email]
      );

      if (emailExists.rows.length > 0) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(senha, 10);

      // Criar usuário
      const userResult = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, nome, email, tipo_usuario`,
        [nome, email, hashedPassword, tipo_usuario]
      );

      const userId = userResult.rows[0].id;

      // Criar registro específico baseado no tipo
      if (tipo_usuario === 'paciente') { // tipo paciente
        await db.query(
          `INSERT INTO pacientes (
            usuario_id, cpf, data_nascimento, telefone, 
            endereco, peso_inicial, altura, medico_responsavel_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId,
            extraData.cpf || null,
            extraData.data_nascimento || null,
            extraData.telefone || null,
            extraData.endereco || null,
            extraData.peso_inicial || null,
            extraData.altura || null,
            extraData.medico_responsavel_id || null
          ]
        );
      } else if (tipo_usuario === 'medico') { // tipo médico
        await db.query(
          `INSERT INTO medicos (usuario_id, crm, especialidade, telefone_contato)
           VALUES ($1, $2, $3, $4)`,
          [
            userId, 
            extraData.crm || null, 
            extraData.especialidade || null,
            extraData.telefone_contato || null
          ]
        );
      }

      // Log de auditoria
      await db.query(
        `INSERT INTO logs_auditoria (usuario_id, tabela_afetada, operacao, dados_novos)
         VALUES ($1, 'usuarios', 'INSERT', $2)`,
        [req.user.id, JSON.stringify({ created_user_id: userId, tipo_usuario })]
      );

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: userResult.rows[0]
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, email, ativo, ...extraData } = req.body;

      // Buscar usuário atual
      const currentUser = await db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
      
      if (currentUser.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Atualizar usuário
      const result = await db.query(
        `UPDATE usuarios 
         SET nome = COALESCE($1, nome),
             email = COALESCE($2, email),
             ativo = COALESCE($3, ativo)
         WHERE id = $4
         RETURNING *`,
        [nome, email, ativo, id]
      );

      const user = result.rows[0];

      // Atualizar dados específicos
      if (user.tipo_usuario === 'paciente' && Object.keys(extraData).length > 0) {
        await db.query(
          `UPDATE pacientes 
           SET cpf = COALESCE($1, cpf),
               data_nascimento = COALESCE($2, data_nascimento),
               telefone = COALESCE($3, telefone),
               endereco = COALESCE($4, endereco),
               peso_inicial = COALESCE($5, peso_inicial),
               altura = COALESCE($6, altura),
               medico_responsavel_id = COALESCE($7, medico_responsavel_id)
           WHERE usuario_id = $8`,
          [
            extraData.cpf,
            extraData.data_nascimento,
            extraData.telefone,
            extraData.endereco,
            extraData.peso_inicial,
            extraData.altura,
            extraData.medico_responsavel_id,
            id
          ]
        );
      } else if (user.tipo_usuario === 'medico' && Object.keys(extraData).length > 0) {
        await db.query(
          `UPDATE medicos 
           SET crm = COALESCE($1, crm),
               especialidade = COALESCE($2, especialidade),
               telefone_contato = COALESCE($3, telefone_contato)
           WHERE usuario_id = $4`,
          [extraData.crm, extraData.especialidade, extraData.telefone_contato, id]
        );
      }

      // Log de auditoria
      await db.query(
        `INSERT INTO logs_auditoria (usuario_id, tabela_afetada, operacao, dados_anteriores, dados_novos)
         VALUES ($1, 'usuarios', 'UPDATE', $2, $3)`,
        [req.user.id, JSON.stringify(currentUser.rows[0]), JSON.stringify(req.body)]
      );

      res.json({ message: 'Usuário atualizado com sucesso', user: result.rows[0] });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      // Deletar usuario (soft delete) marcando como inativo
      const result = await db.query(
        'UPDATE usuarios SET ativo = false WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Log de auditoria
      await db.query(
        `INSERT INTO logs_auditoria (usuario_id, tabela_afetada, operacao, dados_anteriores)
         VALUES ($1, 'usuarios', 'DELETE', $2)`,
        [req.user.id, JSON.stringify({ deleted_user_id: id })]
      );

      res.json({ message: 'Usuário inativado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
  },

  // Vinculação médico-paciente
    getPatientDoctorRelations: async (req, res) => {
    try {
      // Buscar relações paciente-médico
      const result = await db.query(`
        SELECT 
          p.id as paciente_id,
          u_pac.nome as paciente_nome,
          u_pac.email as paciente_email,
          m.id as medico_id,
          u_med.nome as medico_nome,
          u_med.email as medico_email,
          med.crm,
          p.data_inicio_tratamento
        FROM pacientes p
        JOIN usuarios u_pac ON p.usuario_id = u_pac.id
        LEFT JOIN medicos m ON p.medico_responsavel_id = m.id
        LEFT JOIN usuarios u_med ON m.usuario_id = u_med.id
        LEFT JOIN medicos med ON m.id = med.id
        WHERE u_pac.ativo = true
        ORDER BY u_pac.nome
      `);

      // Buscar lista de médicos disponíveis
      const doctors = await db.query(`
        SELECT 
          m.id,
          u.nome,
          u.email,
          m.crm,
          m.especialidade,
          m.telefone_contato
        FROM medicos m
        JOIN usuarios u ON m.usuario_id = u.id
        WHERE u.ativo = true
        ORDER BY u.nome
      `);

      res.json({ 
        relations: result.rows,
        availableDoctors: doctors.rows  // RETORNAR OS MÉDICOS!
      });
    } catch (error) {
      console.error('Erro ao buscar relações:', error);
      res.status(500).json({ error: 'Erro ao buscar relações médico-paciente' });
    }
  },

  assignDoctorToPatient: async (req, res) => {
    try {
      const { paciente_id, medico_id } = req.body;

      if (!paciente_id) {
        return res.status(400).json({ error: 'ID do paciente é obrigatório' });
      }

      // Permitir desvinculação médico paciente
      const result = await db.query(
        `UPDATE pacientes 
         SET medico_responsavel_id = $1
         WHERE id = $2
         RETURNING *`,
        [medico_id || null, paciente_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      // Log de auditoria
      await db.query(
        `INSERT INTO logs_auditoria (usuario_id, tabela_afetada, operacao, dados_novos)
         VALUES ($1, 'pacientes', 'UPDATE', $2)`,
        [req.user.id, JSON.stringify({ paciente_id, medico_id })]
      );

      const action = medico_id ? 'vinculado' : 'desvinculado';
      res.json({ message: `Médico ${action} com sucesso` });
    } catch (error) {
      console.error('Erro ao vincular médico:', error);
      res.status(500).json({ error: 'Erro ao vincular médico ao paciente' });
    }
  },

  // auditoria
  getAuditLogs: async (req, res) => {
    try {
      const { page = 1, limit = 50, usuario_id, operacao } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          la.id,
          la.usuario_id,
          u.nome as usuario_nome,
          u.tipo_usuario,
          la.tabela_afetada,
          la.operacao,
          la.dados_anteriores,
          la.dados_novos,
          la.data_operacao,
          la.ip_address
        FROM logs_auditoria la
        LEFT JOIN usuarios u ON la.usuario_id = u.id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (usuario_id) {
        query += ` AND la.usuario_id = $${paramIndex}`;
        params.push(usuario_id);
        paramIndex++;
      }

      if (operacao) {
        query += ` AND la.operacao = $${paramIndex}`;
        params.push(operacao);
        paramIndex++;
      }

      query += ` ORDER BY la.data_operacao DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      res.json({
        logs: result.rows,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit)
      });
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
  },

  // relatórios
  getSystemReports: async (req, res) => {
    try {
      const { tipo, data_inicio, data_fim } = req.query;
      const report = {};

      if (tipo === 'usuarios' || !tipo) {
        const usersReport = await db.query(`
          SELECT 
            tipo_usuario,
            COUNT(*) as total,
            COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
          FROM usuarios
          GROUP BY tipo_usuario
        `);
        report.usuarios = usersReport.rows;
      }

      if (tipo === 'dialise' || !tipo) {
        const dialysisReport = await db.query(`
          SELECT 
            DATE(data_registro) as data,
            COUNT(*) as total_registros,
            COUNT(DISTINCT paciente_id) as pacientes_unicos,
            ROUND(AVG(pressao_arterial_sistolica)) as media_sistolica,
            ROUND(AVG(pressao_arterial_diastolica)) as media_diastolica
          FROM registros_dialise
          WHERE data_registro >= COALESCE($1::date, CURRENT_DATE - INTERVAL '30 days')
            AND data_registro <= COALESCE($2::date, CURRENT_DATE)
          GROUP BY DATE(data_registro)
          ORDER BY data DESC
        `, [data_inicio, data_fim]);
        report.dialise = dialysisReport.rows;
      }

      res.json({ report });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  },

  // backup do banco de dados -- valores ainda mokados
  getBackupStatus: async (req, res) => {
    try {
      // Simulação de backups - em produção, implementar lógica real
      const mockBackups = [
        {
          id: 1,
          data_backup: new Date().toISOString(),
          tamanho_mb: 145.5,
          status: 'concluído',
          localizacao: '/backups/backup_latest.sql'
        }
      ];

      res.json({ backups: mockBackups });
    } catch (error) {
      console.error('Erro ao buscar status de backup:', error);
      res.status(500).json({ error: 'Erro ao buscar status de backup' });
    }
  },

  triggerBackup: async (req, res) => {
    try {
      // Log de auditoria
      await db.query(
        `INSERT INTO logs_auditoria (usuario_id, tabela_afetada, operacao, dados_novos)
         VALUES ($1, 'system', 'BACKUP', '{}')`,
        [req.user.id]
      );

      res.json({ message: 'Backup iniciado com sucesso' });
    } catch (error) {
      console.error('Erro ao iniciar backup:', error);
      res.status(500).json({ error: 'Erro ao iniciar backup' });
    }
  },
// Crescimento de usuários ao longo do tempo
 getUserGrowthData: async (req, res) => {
  try {
    const { meses = 6 } = req.query;
    
    const result = await db.query(`
      SELECT 
        DATE_TRUNC('month', data_criacao) as mes,
        tipo_usuario,
        COUNT(*) as total
      FROM usuarios
      WHERE data_criacao >= CURRENT_DATE - ($1 || ' months')::INTERVAL
      GROUP BY DATE_TRUNC('month', data_criacao), tipo_usuario
      ORDER BY mes ASC
    `, [meses]);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Erro ao buscar crescimento de usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar dados de crescimento' });
  }
},

  // Distribuição de pacientes por médico (carga de trabalho)
  getDoctorWorkload: async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          u.nome as medico,
          m.crm,
          COUNT(p.id) as pacientes,
          20 as capacidade
        FROM medicos m
        JOIN usuarios u ON m.usuario_id = u.id
        LEFT JOIN pacientes p ON p.medico_responsavel_id = m.id
        WHERE u.ativo = true
        GROUP BY u.nome, m.crm
        ORDER BY pacientes DESC
      `);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Erro ao buscar carga de trabalho:', error);
      res.status(500).json({ error: 'Erro ao buscar carga de trabalho dos médicos' });
    }
  },

  // Registros de diálise por dia da semana
  getDialysisWeeklyPattern: async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          TO_CHAR(data_registro, 'Day') as dia_semana,
          EXTRACT(DOW FROM data_registro) as dia_num,
          COUNT(*) as registros,
          ROUND(AVG(uf_total)) as media_uf,
          ROUND(AVG(peso_pos_dialise - peso_pre_dialise), 2) as media_perda_peso
        FROM registros_dialise
        WHERE data_registro >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY TO_CHAR(data_registro, 'Day'), EXTRACT(DOW FROM data_registro)
        ORDER BY dia_num
      `);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Erro ao buscar padrão semanal:', error);
      res.status(500).json({ error: 'Erro ao buscar padrão semanal de diálise' });
    }
  },

  // Tipos de sintomas mais comuns
  getCommonSymptoms: async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          sp.nome,
          sp.categoria,
          COUNT(rs.id) as frequencia,
          ROUND(AVG(CASE 
            WHEN rs.severidade = 'leve' THEN 1
            WHEN rs.severidade = 'moderado' THEN 2
            WHEN rs.severidade = 'grave' THEN 3
          END), 2) as severidade_media
        FROM registro_sintomas rs
        JOIN sintomas_predefinidos sp ON rs.sintoma_id = sp.id
        JOIN registros_dialise rd ON rs.registro_dialise_id = rd.id
        WHERE rd.data_registro >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY sp.nome, sp.categoria
        ORDER BY frequencia DESC
        LIMIT 10
      `);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Erro ao buscar sintomas comuns:', error);
      res.status(500).json({ error: 'Erro ao buscar sintomas mais comuns' });
    }
  },

  // Taxa de adesão ao tratamento (registros por paciente) - com base em valores fixos da minha opinião
  getTreatmentAdherence: async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          u.nome as paciente,
          COUNT(rd.id) as registros_mes,
          ROUND(COUNT(rd.id)::numeric / 30 * 100, 1) as taxa_adesao,
          CASE 
            WHEN COUNT(rd.id) >= 25 THEN 'Excelente'
            WHEN COUNT(rd.id) >= 20 THEN 'Bom'
            WHEN COUNT(rd.id) >= 15 THEN 'Regular'
            ELSE 'Baixo'
          END as classificacao
        FROM pacientes p
        JOIN usuarios u ON p.usuario_id = u.id
        LEFT JOIN registros_dialise rd ON rd.paciente_id = p.id 
          AND rd.data_registro >= CURRENT_DATE - INTERVAL '30 days'
        WHERE u.ativo = true
        GROUP BY u.nome
        ORDER BY registros_mes DESC
      `);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Erro ao buscar adesão ao tratamento:', error);
      res.status(500).json({ error: 'Erro ao buscar taxa de adesão' });
    }
  },

  // Análise de pressão arterial média por paciente
  getBloodPressureAnalysis: async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          u.nome as paciente,
          ROUND(AVG(rd.pressao_arterial_sistolica)) as sistolica_media,
          ROUND(AVG(rd.pressao_arterial_diastolica)) as diastolica_media,
          COUNT(rd.id) as total_medicoes,
          CASE 
            WHEN AVG(rd.pressao_arterial_sistolica) > 140 OR AVG(rd.pressao_arterial_diastolica) > 90 
            THEN 'Atenção'
            WHEN AVG(rd.pressao_arterial_sistolica) > 130 OR AVG(rd.pressao_arterial_diastolica) > 80 
            THEN 'Monitorar'
            ELSE 'Normal'
          END as status
        FROM registros_dialise rd
        JOIN pacientes p ON rd.paciente_id = p.id
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE rd.data_registro >= CURRENT_DATE - INTERVAL '30 days'
          AND rd.pressao_arterial_sistolica IS NOT NULL
          AND rd.pressao_arterial_diastolica IS NOT NULL
        GROUP BY u.nome
        ORDER BY sistolica_media DESC
      `);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Erro ao buscar análise de pressão:', error);
      res.status(500).json({ error: 'Erro ao buscar análise de pressão arterial' });
    }
  },

  // Tendência de ultrafiltração
  getUltrafiltrationTrend: async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          DATE(data_registro) as data,
          ROUND(AVG(uf_total)) as uf_media,
          COUNT(*) as total_sessoes,
          ROUND(MIN(uf_total)) as uf_min,
          ROUND(MAX(uf_total)) as uf_max
        FROM registros_dialise
        WHERE data_registro >= CURRENT_DATE - INTERVAL '30 days'
          AND uf_total IS NOT NULL
        GROUP BY DATE(data_registro)
        ORDER BY data ASC
      `);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Erro ao buscar tendência de UF:', error);
      res.status(500).json({ error: 'Erro ao buscar tendência de ultrafiltração' });
    }
  },

  // Insights e alertas do sistema
  getSystemInsights: async (req, res) => {
    try {
      const insights = [];

      // Verificar pacientes sem registros recentes
      const inactivePatients = await db.query(`
        SELECT COUNT(*) as total
        FROM pacientes p
        JOIN usuarios u ON p.usuario_id = u.id
        LEFT JOIN registros_dialise rd ON rd.paciente_id = p.id 
          AND rd.data_registro >= CURRENT_DATE - INTERVAL '7 days'
        WHERE u.ativo = true AND rd.id IS NULL
      `);

      if (Number.parseInt(inactivePatients.rows[0].total) > 0) {
        insights.push({
          type: 'warning',
          title: 'Pacientes Inativos',
          message: `${inactivePatients.rows[0].total} paciente(s) sem registros nos últimos 7 dias`,
          priority: 'high'
        });
      }

      // Verificar médicos sobrecarregados
      const overloadedDoctors = await db.query(`
        SELECT COUNT(*) as total
        FROM (
          SELECT COUNT(p.id) as pacientes
          FROM medicos m
          JOIN usuarios u ON m.usuario_id = u.id
          LEFT JOIN pacientes p ON p.medico_responsavel_id = m.id
          WHERE u.ativo = true
          GROUP BY m.id
          HAVING COUNT(p.id) > 15
        ) sub
      `);

      if (Number.parseInt(overloadedDoctors.rows[0].total) > 0) {
        insights.push({
          type: 'alert',
          title: 'Médicos Sobrecarregados',
          message: `${overloadedDoctors.rows[0].total} médico(s) com mais de 15 pacientes`,
          priority: 'medium'
        });
      }

      // Verificar crescimento de usuários
      const userGrowth = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE data_criacao >= CURRENT_DATE - INTERVAL '30 days') as mes_atual,
          COUNT(*) FILTER (WHERE data_criacao >= CURRENT_DATE - INTERVAL '60 days' 
                           AND data_criacao < CURRENT_DATE - INTERVAL '30 days') as mes_anterior
        FROM usuarios
      `);

      const currentMonth = Number.parseInt(userGrowth.rows[0].mes_atual);
      const previousMonth = Number.parseInt(userGrowth.rows[0].mes_anterior);
      
      if (currentMonth > previousMonth * 1.2) {
        insights.push({
          type: 'success',
          title: 'Crescimento Acelerado',
          message: `Aumento de ${Math.round((currentMonth / previousMonth - 1) * 100)}% em novos usuários`,
          priority: 'low'
        });
      }

      // Pacientes sem médico vinculado
      const unassignedPatients = await db.query(`
        SELECT COUNT(*) as total
        FROM pacientes p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.medico_responsavel_id IS NULL AND u.ativo = true
      `);

      if (Number.parseInt(unassignedPatients.rows[0].total) > 0) {
        insights.push({
          type: 'info',
          title: 'Vinculações Pendentes',
          message: `${unassignedPatients.rows[0].total} paciente(s) sem médico vinculado`,
          priority: 'medium'
        });
      }

      res.json({ insights });
    } catch (error) {
      console.error('Erro ao buscar insights:', error);
      res.status(500).json({ error: 'Erro ao buscar insights do sistema' });
    }
  }
};

module.exports = adminController;
