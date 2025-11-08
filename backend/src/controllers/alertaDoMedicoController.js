// src/controllers/alertaMedicoController.js
// Controller para gerenciar alertas médicos enviados por email
  // NÃO É AQUI QUE O ALERTA É ENVIADO
const db = require('../config/database');
const nodemailer = require('nodemailer');

// Configurar o transportador de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verificar configuração do email ao inicializar
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro na configuração do email:', error);
  } else {
    console.log('✅ Servidor de email pronto para enviar');
  }
});

/**
 * Envia um alerta por email para o paciente
 * POST /api/doctor/alerta/enviar
 */
const enviarAlerta = async (req, res) => {
  try {
    console.log('=== ENVIAR ALERTA DEBUG ===');
    console.log('User:', req.user);
    console.log('Body:', req.body);

    const { paciente_id, mensagem, email } = req.body;
    const userId = req.user.id;

    // Validações básicas
    if (!paciente_id || !mensagem || !email) {
      return res.status(400).json({
        error: 'Campos obrigatórios faltando: paciente_id, mensagem e email são necessários'
      });
    }

    if (mensagem.trim().length < 10) {
      return res.status(400).json({
        error: 'A mensagem deve ter no mínimo 10 caracteres'
      });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido'
      });
    }

    // 1. Buscar informações do médico
    const medicoResult = await db.query(
      `SELECT m.id, m.crm, m.especialidade, u.nome 
       FROM medicos m
       JOIN usuarios u ON m.usuario_id = u.id
       WHERE m.usuario_id = $1`,
      [userId]
    );

    if (medicoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const medico = medicoResult.rows[0];
    console.log('Médico encontrado:', medico);

    // 2. Buscar informações do paciente
    const pacienteResult = await db.query(
      `SELECT p.id, u.nome, u.email
       FROM pacientes p
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = $1`,
      [paciente_id]
    );

    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const paciente = pacienteResult.rows[0];
    console.log('Paciente encontrado:', paciente);

    // 3. Verificar se o paciente pertence ao médico
    const vinculoResult = await db.query(
      'SELECT id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
      [paciente_id, medico.id]
    );

    if (vinculoResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Você não tem permissão para enviar alertas para este paciente'
      });
    }

    // 4. Sanitizar a mensagem (prevenir XSS)
    const mensagemSanitizada = mensagem
      .trim()
      .replaceAll(/</g, '&lt;')
      .replaceAll(/>/g, '&gt;')
      .replaceAll(/"/g, '&quot;')
      .replaceAll(/'/g, '&#x27;')
      .replaceAll(/\//g, '&#x2F;');

    // 5. Criar notificação no banco de dados
    const notificacaoResult = await db.query(
      `INSERT INTO notificacoes (
        usuario_destinatario_id,
        tipo,
        titulo,
        mensagem,
        lida,
        data_criacao
      ) VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)
      RETURNING id, data_criacao`,
      [
        paciente.id,
        'alerta_medico',
        `Alerta do Dr(a). ${medico.nome}`,
        mensagemSanitizada
      ]
    );

    const notificacao = notificacaoResult.rows[0];
    console.log('Notificação criada:', notificacao);

    // 6. Preparar e enviar o email
    const htmlTemplate = criarTemplateEmail({
      nomePaciente: paciente.nome,
      nomeMedico: medico.nome,
      especialidade: medico.especialidade || 'Nefrologia',
      crm: medico.crm,
      mensagem: mensagemSanitizada
    });

    const mailOptions = {
      from: {
        name: 'DialCare - Sistema de Monitoramento',
        address: process.env.SMTP_USER
      },
      to: email,
      subject: '🏥 Novo Alerta do seu Médico - DialCare',
      html: htmlTemplate,
      text: criarTextoSimples(paciente.nome, medico.nome, mensagemSanitizada)
    };

    // Enviar email
    let emailEnviado = false;
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('📧 Email enviado:', info.messageId);
      emailEnviado = true;
    } catch (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
      // Continua mesmo se o email falhar
    }

    // 7. Registrar no log de auditoria
    await db.query(
      `INSERT INTO logs_auditoria (
        usuario_id,
        tabela_afetada,
        operacao,
        dados_novos,
        ip_address,
        data_operacao
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        userId,
        'notificacoes',
        'INSERT',
        JSON.stringify({
          notificacao_id: notificacao.id,
          tipo: 'alerta_medico',
          paciente_id: paciente_id,
          email_enviado: emailEnviado
        }),
        req.ip
      ]
    );

    res.status(200).json({
      message: 'Alerta enviado com sucesso',
      data: {
        notificacao_id: notificacao.id,
        email_enviado: emailEnviado,
        data_envio: notificacao.data_criacao
      }
    });

  } catch (error) {
    console.error('❌ Erro ao enviar alerta:', error);
    res.status(500).json({
      error: 'Erro ao enviar alerta',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Lista os alertas enviados pelo médico
 * GET /api/doctor/alerta/enviados
 */
const listarAlertasEnviados = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limite = 20, pagina = 1, paciente_id } = req.query;
    const offset = (Number.parseInt(pagina) - 1) * Number.parseInt(limite);

    // Buscar médico
    const medicoResult = await db.query(
      'SELECT id FROM medicos WHERE usuario_id = $1',
      [userId]
    );

    if (medicoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const medicoId = medicoResult.rows[0].id;

    // Construir query
    let query = `
      SELECT 
        n.id,
        n.titulo,
        n.mensagem,
        n.lida,
        n.data_criacao,
        n.data_leitura,
        p.id as paciente_id,
        u.nome as paciente_nome,
        u.email as paciente_email
      FROM notificacoes n
      JOIN usuarios u ON n.usuario_destinatario_id = u.id
      JOIN pacientes p ON p.usuario_id = u.id
      WHERE p.medico_responsavel_id = $1
        AND n.tipo = 'alerta_medico'
    `;

    const params = [medicoId];

    if (paciente_id) {
      query += ` AND p.id = $${params.length + 1}`;
      params.push(paciente_id);
    }

    query += ` ORDER BY n.data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number.parseInt(limite), offset);

    const result = await db.query(query, params);

    // Contar total
    let countQuery = `
      SELECT COUNT(*) as total
      FROM notificacoes n
      JOIN usuarios u ON n.usuario_destinatario_id = u.id
      JOIN pacientes p ON p.usuario_id = u.id
      WHERE p.medico_responsavel_id = $1
        AND n.tipo = 'alerta_medico'
    `;

    const countParams = [medicoId];
    if (paciente_id) {
      countQuery += ` AND p.id = $2`;
      countParams.push(paciente_id);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = Number.parseInt(countResult.rows[0].total);

    res.json({
      alertas: result.rows,
      paginacao: {
        pagina_atual: Number.parseInt(pagina),
        total_paginas: Math.ceil(total / Number.parseInt(limite)),
        total_registros: total,
        registros_por_pagina: Number.parseInt(limite)
      }
    });

  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ error: 'Erro ao buscar alertas' });
  }
};

/**
 * Busca um alerta específico
 * GET /api/doctor/alerta/:id
 */
const buscarAlerta = async (req, res) => {
  try {
    const userId = req.user.id;
    const alertaId = req.params.id;

    const result = await db.query(
      `SELECT 
        n.id,
        n.titulo,
        n.mensagem,
        n.lida,
        n.data_criacao,
        n.data_leitura,
        u.nome as paciente_nome,
        u.email as paciente_email,
        p.id as paciente_id
      FROM notificacoes n
      JOIN usuarios u ON n.usuario_destinatario_id = u.id
      JOIN pacientes p ON p.usuario_id = u.id
      JOIN medicos m ON p.medico_responsavel_id = m.id
      WHERE n.id = $1 
        AND m.usuario_id = $2
        AND n.tipo = 'alerta_medico'`,
      [alertaId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    res.json({ alerta: result.rows[0] });

  } catch (error) {
    console.error('Erro ao buscar alerta:', error);
    res.status(500).json({ error: 'Erro ao buscar alerta' });
  }
};

/**
 * Obtém estatísticas de alertas
 * GET /api/doctor/alerta/estatisticas
 */
const obterEstatisticas = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data_inicio, data_fim } = req.query;

    // Buscar médico
    const medicoResult = await db.query(
      'SELECT id FROM medicos WHERE usuario_id = $1',
      [userId]
    );

    if (medicoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const medicoId = medicoResult.rows[0].id;

    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN n.lida = true THEN 1 END) as lidos,
        COUNT(CASE WHEN n.lida = false THEN 1 END) as nao_lidos
      FROM notificacoes n
      JOIN usuarios u ON n.usuario_destinatario_id = u.id
      JOIN pacientes p ON p.usuario_id = u.id
      WHERE p.medico_responsavel_id = $1
        AND n.tipo = 'alerta_medico'
    `;

    const params = [medicoId];

    if (data_inicio) {
      query += ` AND n.data_criacao >= $${params.length + 1}`;
      params.push(data_inicio);
    }

    if (data_fim) {
      query += ` AND n.data_criacao <= $${params.length + 1}`;
      params.push(data_fim);
    }

    const result = await db.query(query, params);
    const stats = result.rows[0];

    const total = Number.parseInt(stats.total) || 0;
    const lidos = Number.parseInt(stats.lidos) || 0;
    const naoLidos = Number.parseInt(stats.nao_lidos) || 0;

    res.json({
      total_alertas_enviados: total,
      alertas_lidos: lidos,
      alertas_nao_lidos: naoLidos,
      taxa_leitura: total > 0 ? ((lidos / total) * 100).toFixed(2) + '%' : '0%'
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

/**
 * Cria o template HTML do email
 */
function criarTemplateEmail({ nomePaciente, nomeMedico, especialidade, crm, mensagem }) {
  const mensagemFormatada = mensagem.replaceAll(/\n/g, '<br>');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta Médico - DialCare</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #fff;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 10px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      color: #111827;
      font-size: 18px;
      margin-bottom: 20px;
    }
    .alert-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%);
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .doctor-name {
      color: #111827;
      font-size: 18px;
      font-weight: 700;
      display: block;
      margin-bottom: 5px;
    }
    .doctor-specialty {
      color: #6b7280;
      font-size: 14px;
      display: block;
      margin-bottom: 15px;
    }
    .message-content {
      color: #1f2937;
      background: white;
      padding: 15px;
      border-radius: 6px;
      line-height: 1.7;
      font-size: 15px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%);
      color: white !important;
      padding: 14px 35px;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
    }
    .footer {
      background: #f9fafb;
      text-align: center;
      padding: 25px 30px;
      border-top: 1px solid #e5e7eb;
      font-size: 13px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🏥</div>
      <h1>DialCare</h1>
      <p>Sistema de Monitoramento de Diálise</p>
    </div>

    <div class="content">
      <div class="greeting">
        Olá, <strong>${nomePaciente}</strong>!
      </div>
      
      <p style="color: #4b5563; font-size: 15px; margin-bottom: 20px;">
        Você recebeu uma nova mensagem importante do seu médico através do sistema DialCare.
      </p>

      <div class="alert-box">
        <span class="doctor-name">👨‍⚕️ ${nomeMedico}</span>
        ${especialidade ? `<span class="doctor-specialty">${especialidade}${crm ? ` - CRM ${crm}` : ''}</span>` : ''}
        
        <strong style="color: #374151; display: block; margin-bottom: 10px;">📋 Mensagem do Médico:</strong>
        <div class="message-content">
          ${mensagemFormatada}
        </div>
      </div>

      <center>
        <a href="${frontendUrl}/dashboard" class="button">
          🔗 Acessar Meu Painel
        </a>
      </center>

      <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
        Você pode visualizar este alerta através do sistema DialCare.
      </p>
    </div>

    <div class="footer">
      <p><strong>DialCare - Sistema de Monitoramento de Diálise</strong></p>
      <p>Este é um email automático. Por favor, não responda diretamente a este email.</p>
      <p>© ${new Date().getFullYear()} DialCare. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Cria versão em texto simples do email
 */
function criarTextoSimples(nomePaciente, nomeMedico, mensagem) {
  return `
DialCare - Alerta Médico

Olá, ${nomePaciente}!

Você recebeu uma nova mensagem do seu médico:

Dr(a). ${nomeMedico}

Mensagem:
${mensagem}

---
Acesse o painel do DialCare para visualizar este alerta:
${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard

Este é um email automático. Não responda a este email.
  `;
}

module.exports = {
  enviarAlerta,
  listarAlertasEnviados,
  buscarAlerta,
  obterEstatisticas
};