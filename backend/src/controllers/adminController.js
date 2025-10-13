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
          COUNT(DISTINCT paciente_id) as pacientes_com_registros,
          DATE_TRUNC('month', data_registro) as mes,
          COUNT(*) as registros_mes
        FROM registros_dialise
        WHERE data_registro >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY mes
        ORDER BY mes DESC
      `);

      // Alertas recentes
      const recentAlerts = await db.query(`
        SELECT COUNT(*) as total_alertas
        FROM alertas
        WHERE data_criacao >= CURRENT_DATE - INTERVAL '7 days'
      `);

      // Atividade recente
      const recentActivity = await db.query(`
        SELECT 
          u.nome,
          u.tipo_usuario,
          al.acao,
          al.data_hora
        FROM audit_logs al
        JOIN usuarios u ON al.usuario_id = u.id
        ORDER BY al.data_hora DESC
        LIMIT 10
      `);

      res.json({
        users: usersStats.rows,
        dialysis: dialysisStats.rows,
        alerts: recentAlerts.rows[0],
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
          u.ultimo_acesso,
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

      // Total count
      const countResult = await db.query(
        'SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = COALESCE($1, tipo_usuario)',
        [tipo || null]
      );

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
          p.cpf, p.data_nascimento, p.telefone, p.endereco, p.peso_inicial, p.altura,
          m.crm, m.especialidade
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
        `INSERT INTO usuarios (nome, email, senha, tipo_usuario, ativo)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, nome, email, tipo_usuario`,
        [nome, email, hashedPassword, tipo_usuario]
      );

      const userId = userResult.rows[0].id;

      // Criar registro específico baseado no tipo
      if (tipo_usuario === 'paciente') {
        await db.query(
          `INSERT INTO pacientes (usuario_id, cpf, data_nascimento, telefone, endereco, peso_inicial, altura, medico_responsavel_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
          `INSERT INTO medicos (usuario_id, crm, especialidade)
           VALUES ($1, $2, $3)`,
          [userId, extraData.crm, extraData.especialidade || null]
        );
      }

      // Log de auditoria
      await db.query(
        `INSERT INTO audit_logs (usuario_id, acao, detalhes)
         VALUES ($1, 'CREATE_USER', $2)`,
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

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Atualizar dados específicos
      const user = result.rows[0];
      
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
               especialidade = COALESCE($2, especialidade)
           WHERE usuario_id = $3`,
          [extraData.crm, extraData.especialidade, id]
        );
      }

      // Log de auditoria
      await db.query(
        `INSERT INTO audit_logs (usuario_id, acao, detalhes)
         VALUES ($1, 'UPDATE_USER', $2)`,
        [req.user.id, JSON.stringify({ updated_user_id: id })]
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
        `INSERT INTO audit_logs (usuario_id, acao, detalhes)
         VALUES ($1, 'DELETE_USER', $2)`,
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
      const result = await db.query(`
        SELECT 
          p.id as paciente_id,
          u_pac.nome as paciente_nome,
          m.id as medico_id,
          u_med.nome as medico_nome,
          m.crm,
          p.data_inicio_tratamento
        FROM pacientes p
        JOIN usuarios u_pac ON p.usuario_id = u_pac.id
        LEFT JOIN medicos m ON p.medico_responsavel_id = m.id
        LEFT JOIN usuarios u_med ON m.usuario_id = u_med.id
        WHERE u_pac.ativo = true
        ORDER BY u_pac.nome
      `);

      res.json({ relations: result.rows });
    } catch (error) {
      console.error('Erro ao buscar relações:', error);
      res.status(500).json({ error: 'Erro ao buscar relações médico-paciente' });
    }
  },

  assignDoctorToPatient: async (req, res) => {
    try {
      const { paciente_id, medico_id } = req.body;

      if (!paciente_id || !medico_id) {
        return res.status(400).json({ error: 'Paciente e médico são obrigatórios' });
      }

      const result = await db.query(
        `UPDATE pacientes 
         SET medico_responsavel_id = $1
         WHERE id = $2
         RETURNING *`,
        [medico_id, paciente_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      // Log de auditoria
      await db.query(
        `INSERT INTO audit_logs (usuario_id, acao, detalhes)
         VALUES ($1, 'ASSIGN_DOCTOR', $2)`,
        [req.user.id, JSON.stringify({ paciente_id, medico_id })]
      );

      res.json({ message: 'Médico vinculado com sucesso' });
    } catch (error) {
      console.error('Erro ao vincular médico:', error);
      res.status(500).json({ error: 'Erro ao vincular médico ao paciente' });
    }
  },

  // ==================== AUDITORIA ====================
  getAuditLogs: async (req, res) => {
    try {
      const { page = 1, limit = 50, usuario_id, acao, data_inicio, data_fim } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          al.id,
          al.usuario_id,
          u.nome as usuario_nome,
          u.tipo_usuario,
          al.acao,
          al.detalhes,
          al.data_hora,
          al.ip_address
        FROM audit_logs al
        LEFT JOIN usuarios u ON al.usuario_id = u.id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (usuario_id) {
        query += ` AND al.usuario_id = $${paramIndex}`;
        params.push(usuario_id);
        paramIndex++;
      }

      if (acao) {
        query += ` AND al.acao = $${paramIndex}`;
        params.push(acao);
        paramIndex++;
      }

      if (data_inicio) {
        query += ` AND al.data_hora >= $${paramIndex}`;
        params.push(data_inicio);
        paramIndex++;
      }

      if (data_fim) {
        query += ` AND al.data_hora <= $${paramIndex}`;
        params.push(data_fim);
        paramIndex++;
      }

      query += ` ORDER BY al.data_hora DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
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

      let report = {};

      if (tipo === 'usuarios' || !tipo) {
        const usersReport = await db.query(`
          SELECT 
            tipo_usuario,
            COUNT(*) as total,
            COUNT(CASE WHEN ativo = true THEN 1 END) as ativos,
            COUNT(CASE WHEN ultimo_acesso >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as ativos_ultimo_mes
          FROM usuarios
          GROUP BY tipo_usuario
        `);
        report.usuarios = usersReport.rows;
      }

      if (tipo === 'dialise' || !tipo) {
        const dialysisReport = await db.query(`
          SELECT 
            DATE_TRUNC('day', data_registro) as data,
            COUNT(*) as total_registros,
            COUNT(DISTINCT paciente_id) as pacientes_unicos,
            AVG(pressao_arterial_sistolica) as media_sistolica,
            AVG(pressao_arterial_diastolica) as media_diastolica
          FROM registros_dialise
          WHERE data_registro >= COALESCE($1::date, CURRENT_DATE - INTERVAL '30 days')
            AND data_registro <= COALESCE($2::date, CURRENT_DATE)
          GROUP BY DATE_TRUNC('day', data_registro)
          ORDER BY data DESC
        `, [data_inicio, data_fim]);
        report.dialise = dialysisReport.rows;
      }

      if (tipo === 'alertas' || !tipo) {
        const alertsReport = await db.query(`
          SELECT 
            tipo_alerta,
            COUNT(*) as total,
            COUNT(CASE WHEN lido = false THEN 1 END) as nao_lidos
          FROM alertas
          WHERE data_criacao >= COALESCE($1::date, CURRENT_DATE - INTERVAL '30 days')
            AND data_criacao <= COALESCE($2::date, CURRENT_DATE)
          GROUP BY tipo_alerta
        `, [data_inicio, data_fim]);
        report.alertas = alertsReport.rows;
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
      const result = await db.query(`
        SELECT 
          id,
          data_backup,
          tamanho_mb,
          status,
          localizacao
        FROM backups
        ORDER BY data_backup DESC
        LIMIT 10
      `);

      res.json({ backups: result.rows });
    } catch (error) {
      console.error('Erro ao buscar status de backup:', error);
      res.status(500).json({ error: 'Erro ao buscar status de backup' });
    }
  },

  triggerBackup: async (req, res) => {
    try {
      // Aqui você implementaria a lógica de backup
      // Por exemplo, usando pg_dump ou outro método

      await db.query(
        `INSERT INTO backups (data_backup, status, localizacao)
         VALUES (NOW(), 'em_progresso', '/backups/${Date.now()}.sql')`
      );

      // Log de auditoria
      await db.query(
        `INSERT INTO audit_logs (usuario_id, acao, detalhes)
         VALUES ($1, 'TRIGGER_BACKUP', '{}')`,
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