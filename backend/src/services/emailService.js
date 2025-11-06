// backend/src/services/emailService.js

const nodemailer = require('nodemailer');

// ==================== CONFIGURAÇÃO ====================

// Configurar o transporter do nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER, // seu email
    pass: process.env.SMTP_PASS  // sua senha ou app password
  }
});

// Verificar conexão
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro na configuração do email:', error);
  } else {
    console.log('✅ Servidor de email pronto para enviar mensagens');
  }
});

// ==================== CONSTANTES ====================

const PRIORITY_CONFIG = {
  baixa: { color: '#10b981', label: 'Baixa' },
  media: { color: '#f59e0b', label: 'Média' },
  alta: { color: '#ef4444', label: 'Alta' }
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ==================== TEMPLATES ====================

/**
 * Gera o HTML do cabeçalho do email
 */
const getEmailHeader = () => `
<!-- Header -->
<div style="background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%); padding: 30px 20px; text-align: center;">
  <div style="background-color: rgba(255, 255, 255, 0.2); width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
    <div style="width: 40px; height: 40px; background-color: white; border-radius: 8px;"></div>
  </div>
  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">DialCare</h1>
  <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0; font-size: 14px;">Sistema de Monitoramento de Diálise</p>
</div>
`;

/**
 * Gera o HTML do badge de prioridade
 */
const getPriorityBadge = (priority) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.media;
  return `
<!-- Prioridade Badge -->
<div style="text-align: center; margin-top: -15px;">
  <div style="display: inline-block; background-color: ${config.color}; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    ⚠️ Prioridade: ${config.label}
  </div>
</div>
`;
};

/**
 * Gera o HTML das informações da sessão
 */
const getSessionInfoHtml = (sessionInfo) => {
  if (!sessionInfo) return '';
  
  return `
<!-- Session Info -->
<div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
  <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0; font-weight: 600; text-transform: uppercase;">
    📊 Relacionado à Sessão de Diálise
  </p>
  <div style="display: flex; gap: 15px; flex-wrap: wrap;">
    <div>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">Data</p>
      <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 3px 0 0 0;">${sessionInfo.data}</p>
    </div>
    <div>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">Pressão Arterial</p>
      <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 3px 0 0 0;">${sessionInfo.pa}</p>
    </div>
    <div>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">UF Total</p>
      <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 3px 0 0 0;">${sessionInfo.uf}</p>
    </div>
  </div>
</div>
`;
};

/**
 * Gera o HTML do rodapé do email
 */
const getEmailFooter = () => `
<!-- Footer -->
<div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0;">
    Este email foi enviado por <strong>DialCare</strong>
  </p>
  <p style="color: #9ca3af; font-size: 11px; margin: 0;">
    Sistema de Monitoramento e Acompanhamento de Diálise Peritoneal
  </p>
  <p style="color: #d1d5db; font-size: 10px; margin: 10px 0 0 0;">
    © ${new Date().getFullYear()} DialCare. Todos os direitos reservados.
  </p>
</div>
`;

/**
 * Gera o template HTML completo do email de alerta
 */
const getAlertEmailHtml = ({ patientName, doctorName, title, message, priority, sessionInfo }) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.media;
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta Médico - DialCare</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    ${getEmailHeader()}
    
    ${getPriorityBadge(priority)}

    <!-- Content -->
    <div style="padding: 30px 20px;">
      
      <!-- Greeting -->
      <p style="font-size: 16px; color: #111827; margin: 0 0 10px 0;">
        Olá, <strong>${patientName}</strong>!
      </p>
      
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 25px 0;">
        Você recebeu uma nova mensagem do seu médico, Dr(a). ${doctorName}.
      </p>

      <!-- Alert Box -->
      <div style="background-color: #f0fdfa; border-left: 4px solid #14b8a6; padding: 20px; margin-bottom: 25px; border-radius: 8px;">
        <h2 style="color: #0d9488; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
          📋 ${title}
        </h2>
        <p style="color: #374151; margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
${message}
        </p>
      </div>

      ${getSessionInfoHtml(sessionInfo)}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${FRONTEND_URL}/dashboard" 
           style="display: inline-block; background: linear-gradient(90deg, #14b8a6 0%, #10b981 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(20, 184, 166, 0.3);">
          Acessar Sistema
        </a>
      </div>

      <!-- Info Box -->
      <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 25px;">
        <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong>💡 Importante:</strong> Este é um alerta automático enviado pelo seu médico através do sistema DialCare. 
          Se você tiver dúvidas ou precisar de mais informações, entre em contato com sua equipe médica.
        </p>
      </div>
    </div>

    ${getEmailFooter()}
  </div>
</body>
</html>
  `;
};

/**
 * Gera o conteúdo em texto puro do email de alerta
 */
const getAlertEmailText = ({ patientName, doctorName, title, message, priority, sessionInfo }) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.media;
  
  let text = `
DialCare - Sistema de Monitoramento de Diálise

Prioridade: ${config.label}

Olá, ${patientName}!

Você recebeu uma nova mensagem do seu médico, Dr(a). ${doctorName}.

${title}

${message}
`;

  if (sessionInfo) {
    text += `
Relacionado à Sessão de Diálise:
Data: ${sessionInfo.data}
Pressão Arterial: ${sessionInfo.pa}
UF Total: ${sessionInfo.uf}
`;
  }

  text += `
Para mais informações, acesse: ${FRONTEND_URL}/dashboard

---
Este email foi enviado por DialCare
Sistema de Monitoramento e Acompanhamento de Diálise Peritoneal
© ${new Date().getFullYear()} DialCare. Todos os direitos reservados.
  `;

  return text;
};

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Envia email de alerta para o paciente
 */
const sendAlertEmail = async ({ to, patientName, doctorName, title, message, priority, sessionInfo }) => {
  try {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.media;
    
    const htmlContent = getAlertEmailHtml({ 
      patientName, 
      doctorName, 
      title, 
      message, 
      priority, 
      sessionInfo 
    });
    
    const textContent = getAlertEmailText({ 
      patientName, 
      doctorName, 
      title, 
      message, 
      priority, 
      sessionInfo 
    });

    // Enviar email
    const info = await transporter.sendMail({
      from: `"DialCare" <${process.env.SMTP_USER}>`,
      to: to,
      subject: `⚠️ [${config.label}] ${title} - DialCare`,
      text: textContent,
      html: htmlContent
    });

    console.log('✅ Email enviado com sucesso:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw error;
  }
};

/**
 * Envia email de teste (útil para verificar configuração)
 */
const sendTestEmail = async (to) => {
  try {
    const info = await transporter.sendMail({
      from: `"DialCare" <${process.env.SMTP_USER}>`,
      to: to,
      subject: 'Teste de Configuração - DialCare',
      text: 'Este é um email de teste do sistema DialCare. Se você recebeu esta mensagem, a configuração está funcionando corretamente!',
      html: '<p>Este é um email de teste do sistema <strong>DialCare</strong>.</p><p>Se você recebeu esta mensagem, a configuração está funcionando corretamente! ✅</p>'
    });

    console.log('✅ Email de teste enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email de teste:', error);
    throw error;
  }
};

module.exports = {
  sendAlertEmail,
  sendTestEmail
};