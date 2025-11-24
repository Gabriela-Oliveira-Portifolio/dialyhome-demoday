const nodemailer = require('nodemailer');

// config para mandar email - utilizando o nodemailer

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro na configuração do email:', error);
  }
});

// ==================== CONSTANTES ====================

const PRIORITY_CONFIG = {
  baixa: { 
    color: '#10b981', 
    label: 'Baixa'
  },
  media: { 
    color: '#f59e0b', 
    label: 'Média'
  },
  alta: { 
    color: '#ef4444', 
    label: 'Alta'
  }
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const getEmailHeader = () => `
<!-- Header -->
<div style="background-color: #ffffff; padding: 48px 80px; border-bottom: 3px solid #14b8a6;">
  <h1 style="color: #14b8a6; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.3px;">
    Dialyhome
  </h1>
  <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">
    Sistema de Monitoramento de Diálise
  </p>
</div>
`;

// Prioridade
const getPriorityBadge = (priority) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.media;
  return `
<!-- Prioridade Badge -->
<div style="padding: 20px 80px; background-color: #f9fafb;">
  <span style="display: inline-block; color: ${config.color}; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
    Prioridade ${config.label}
  </span>
</div>
`;
};

// Sessão Info
const getSessionInfoHtml = (sessionInfo) => {
  if (!sessionInfo) return '';
  
  return `
<!-- Session Info -->
<div style="margin: 32px 0; padding: 28px; background-color: #f0fdfa; border-left: 3px solid #14b8a6; border-radius: 4px;">
  <p style="color: #0d9488; font-size: 13px; margin: 0 0 16px 0; font-weight: 600; text-transform: uppercase;">
    Dados da Sessão
  </p>
  <div style="display: flex; gap: 40px; flex-wrap: wrap;">
    <div>
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 6px 0;">Data</p>
      <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0;">${sessionInfo.data}</p>
    </div>
    <div>
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 6px 0;">Pressão Arterial</p>
      <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0;">${sessionInfo.pa}</p>
    </div>
    <div>
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 6px 0;">UF Total</p>
      <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0;">${sessionInfo.uf}</p>
    </div>
  </div>
</div>
`;
};

// rodape
const getEmailFooter = () => `
<!-- Footer -->
<div style="background-color: #f9fafb; padding: 32px 80px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 13px; margin: 0 0 6px 0;">
    Dialyhome - Sistema de Monitoramento de Diálise
  </p>
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    © ${new Date().getFullYear()} Todos os direitos reservados
  </p>
</div>
`;

// alerta
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <div style="width: 100%; margin: 0; background-color: #ffffff;">
    
    ${getEmailHeader()}
    
    ${getPriorityBadge(priority)}

    <!-- Content -->
    <div style="padding: 48px 80px;">
      
      <!-- Greeting -->
      <p style="font-size: 16px; color: #111827; margin: 0 0 8px 0;">
        Olá, <strong>${patientName}</strong>
      </p>
      
      <p style="font-size: 15px; color: #6b7280; margin: 0 0 32px 0;">
        Você recebeu uma mensagem do Dr(a). ${doctorName}
      </p>

      <!-- Alert Box -->
      <div style="background-color: #ffffff; border: 2px solid ${config.color}; border-radius: 4px; padding: 28px; margin-bottom: 32px;">
        <h2 style="color: ${config.color}; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
          ${title}
        </h2>
        <p style="color: #374151; margin: 0; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">
${message}
        </p>
      </div>

      ${getSessionInfoHtml(sessionInfo)}

      <!-- CTA Button -->
      <div style="margin: 36px 0;">
        <a href="${FRONTEND_URL}/dashboard" 
           style="display: inline-block; background-color: #14b8a6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 15px;">
          Acessar Sistema
        </a>
      </div>

      <!-- Info Box -->
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 4px; border-left: 3px solid #3b82f6;">
        <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Importante:</strong> Este é um alerta automático enviado pelo seu médico. 
          Se você tiver dúvidas, entre em contato com sua equipe médica.
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
Dialyhome - Sistema de Monitoramento de Diálise

Prioridade: ${config.label}

Olá, ${patientName}

Você recebeu uma mensagem do Dr(a). ${doctorName}

${title}

${message}
`;

  if (sessionInfo) {
    text += `
Dados da Sessão:
Data: ${sessionInfo.data}
Pressão Arterial: ${sessionInfo.pa}
UF Total: ${sessionInfo.uf}
`;
  }

  text += `
Acesse o sistema: ${FRONTEND_URL}/dashboard

---
IMPORTANTE: Este é um alerta automático enviado pelo seu médico.
Se você tiver dúvidas, entre em contato com sua equipe médica.

© ${new Date().getFullYear()} DialCare. Todos os direitos reservados.
  `;

  return text;
};

// Funções

// Envia email de alerta
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

    const info = await transporter.sendMail({
      from: `"DialCare" <${process.env.SMTP_USER}>`,
      to: to,
      subject: `Prioridade ${config.label} ${title} - DialCare`,
      text: textContent,
      html: htmlContent,
      priority: priority === 'alta' ? 'high' : 'normal'
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw error;
  }
};

/**
 * Envia email de teste
 */
const sendTestEmail = async (to) => {
  try {
    const testHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teste - DialCare</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff;">
  <div style="width: 100%; margin: 0; background-color: #ffffff;">
    ${getEmailHeader()}
    
    <div style="padding: 48px 80px; text-align: center;">
      <div style="width: 80px; height: 80px; border-radius: 50%; background-color: #d1fae5; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
        <span style="font-size: 36px;">✓</span>
      </div>
      
      <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 12px 0;">
        Configuração OK
      </h2>
      
      <p style="color: #6b7280; font-size: 15px; margin: 0 0 32px 0;">
        O sistema de email está funcionando corretamente
      </p>
      
      <div style="background-color: #f0fdfa; padding: 20px; border-radius: 4px; border-left: 3px solid #14b8a6;">
        <p style="color: #0d9488; font-size: 14px; margin: 0;">
          Sistema pronto para enviar alertas
        </p>
      </div>
    </div>
    
    ${getEmailFooter()}
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: `"DialCare" <${process.env.SMTP_USER}>`,
      to: to,
      subject: 'Teste de Configuração - DialCare',
      text: 'Sistema de email configurado corretamente.',
      html: testHtml
    });

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