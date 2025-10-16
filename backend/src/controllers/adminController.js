// backend/src/controllers/adminController.js
const db = require('../config/database');
const bcrypt = require('bcrypt');

const adminController = {
  // ==================== DASHBOARD ====================
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

      // Calcular saúde do sistema (uptime fictício - em produção usar métricas reais)
      const systemHealth = 98.5;

      res.json({
        totalUsers: usersStats.rows.reduce((sum, row) => sum + parseInt(row.total), 0),
        activeUsers: usersStats.rows.reduce((sum, row) => sum + parseInt(row.ativos), 0),
        totalPatients: usersStats.rows.find(r => r.tipo_usuario === 'paciente')?.total || 0,
        totalDoctors: usersStats.rows.find(r => r.tipo_usuario === 'medico')?.total || 0,
        totalRecords: parseInt(dialysisStats.rows[0]?.total_registros) || 0,
        recentAlerts: parseInt(recentAlerts.rows[0]?.total_alertas) || 0,
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

  // ==================== GERENCIAMENTO DE USUÁRIOS ====================
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
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
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
      if (tipo_usuario === 'paciente') {
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
      } else if (tipo_usuario === 'medico') {
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

      // Soft delete
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

  // ==================== VINCULAÇÃO MÉDICO-PACIENTE ====================
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

      // Buscar lista de médicos disponíveis (ADICIONADO!)
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

  // getPatientDoctorRelations: async (req, res) => {
  //   try {
  //     const result = await db.query(`
  //       SELECT 
  //         p.id as paciente_id,
  //         u_pac.nome as paciente_nome,
  //         u_pac.email as paciente_email,
  //         m.id as medico_id,
  //         u_med.nome as medico_nome,
  //         u_med.email as medico_email,
  //         med.crm,
  //         p.data_inicio_tratamento
  //       FROM pacientes p
  //       JOIN usuarios u_pac ON p.usuario_id = u_pac.id
  //       LEFT JOIN medicos m ON p.medico_responsavel_id = m.id
  //       LEFT JOIN usuarios u_med ON m.usuario_id = u_med.id
  //       LEFT JOIN medicos med ON m.id = med.id
  //       WHERE u_pac.ativo = true
  //       ORDER BY u_pac.nome
  //     `);

  //     // Buscar lista de médicos disponíveis
  //     const doctors = await db.query(`
  //       SELECT 
  //         m.id,
  //         u.nome,
  //         u.email,
  //         m.crm,
  //         m.especialidade
  //       FROM medicos m
  //       JOIN usuarios u ON m.usuario_id = u.id
  //       WHERE u.ativo = true
  //       ORDER BY u.nome
  //     `);

  //     res.json({ 
  //       relations: result.rows,
  //       availableDoctors: doctors.rows
  //     });
  //   } catch (error) {
  //     console.error('Erro ao buscar relações:', error);
  //     res.status(500).json({ error: 'Erro ao buscar relações médico-paciente' });
  //   }
  // },

  assignDoctorToPatient: async (req, res) => {
    try {
      const { paciente_id, medico_id } = req.body;

      if (!paciente_id) {
        return res.status(400).json({ error: 'ID do paciente é obrigatório' });
      }

      // Permitir desvinculação (medico_id = null)
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

  // ==================== AUDITORIA ====================
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
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
  },

  // ==================== RELATÓRIOS ====================
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

  // ==================== BACKUP ====================
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
      // Aqui você implementaria a lógica real de backup
      // Por exemplo, usando pg_dump

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
  }
};

module.exports = adminController;
