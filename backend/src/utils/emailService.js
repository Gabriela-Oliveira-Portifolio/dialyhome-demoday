const nodemailer = require('nodemailer');
const cron = require('node-cron');
const db = require('../config/database');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(to, subject, html) {
    try {
      const info = await this.transporter.sendMail({
        from: `"DialyHome" <${process.env.SMTP_FROM}>`,
        to,
        subject,
        html
      });
      console.log('Email enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  async sendMedicationReminder(patient, medication) {
    const subject = `Lembrete: Hora do medicamento ${medication.nome}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745; text-align: center;">DialyHome - Lembrete de Medicação</h2>
          
          <p>Olá, <strong>${patient.nome}</strong>!</p>
          
          <p>Este é um lembrete para tomar seu medicamento:</p>
          
          <div style="background: #e9f7ef; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #155724; margin-top: 0;">📋 ${medication.nome}</h3>
            <p><strong>Dosagem:</strong> ${medication.dosagem}</p>
            <p><strong>Horário:</strong> ${medication.horario_principal}</p>
            <p><strong>Frequência:</strong> ${medication.frequencia}</p>
            ${medication.observacoes ? `<p><strong>Observações:</strong> ${medication.observacoes}</p>` : ''}
          </div>
          
          <p>⚠️ <em>Importante: Não esqueça de registrar a tomada do medicamento no sistema.</em></p>
          
          <p>Cuide-se bem!</p>
          <p><strong>Equipe DialyHome</strong></p>
        </div>
      </div>
    `;
    
    await this.sendEmail(patient.email, subject, html);
  }

  async sendDialysisReminder(patient) {
    const subject = 'Lembrete: Sessão de Diálise';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff; text-align: center;">DialyHome - Lembrete de Diálise</h2>
          
          <p>Olá, <strong>${patient.nome}</strong>!</p>
          
          <p>É hora da sua sessão de diálise peritoneal. Lembre-se de:</p>
          
          <ul style="background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <li>🧤 Higienizar as mãos adequadamente</li>
            <li>🏠 Verificar se o ambiente está limpo e organizado</li>
            <li>📋 Ter em mãos todos os materiais necessários</li>
            <li>⏰ Anotar os horários de início e fim</li>
            <li>📝 Registrar todos os dados no sistema após a sessão</li>
          </ul>
          
          <p>Após a sessão, não esqueça de registrar:</p>
          <ul>
            <li>Pressão arterial</li>
            <li>Peso antes e depois</li>
            <li>Volume de ultrafiltração</li>
            <li>Sintomas (se houver)</li>
          </ul>
          
          <p>Boa sessão!</p>
          <p><strong>Equipe DialyHome</strong></p>
        </div>
      </div>
    `;
    
    await this.sendEmail(patient.email, subject, html);
  }

  async sendAlertToDoctor(doctor, patient, alert) {
    const subject = `ALERTA: ${alert.titulo} - Paciente ${patient.nome}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff3cd;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; border-left: 4px solid #dc3545;">
          <h2 style="color: #dc3545; text-align: center;">⚠️ ALERTA MÉDICO - DialyHome</h2>
          
          <p>Dr(a). <strong>${doctor.nome}</strong>,</p>
          
          <p>Foi detectada uma situação que requer sua atenção:</p>
          
          <div style="background: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #f5c6cb;">
            <h3 style="color: #721c24; margin-top: 0;">${alert.titulo}</h3>
            <p><strong>Paciente:</strong> ${patient.nome}</p>
            <p><strong>Email:</strong> ${patient.email}</p>
            <p><strong>Detalhes:</strong> ${alert.mensagem}</p>
            <p><strong>Data/Hora:</strong> ${new Date(alert.data_criacao).toLocaleString('pt-BR')}</p>
          </div>
          
          <p>Recomendamos entrar em contato com o paciente o mais breve possível.</p>
          
          <p>Atenciosamente,</p>
          <p><strong>Sistema DialyHome</strong></p>
        </div>
      </div>
    `;
    
    await this.sendEmail(doctor.email, subject, html);
  }
}

// Configurar cron jobs para lembretes automáticos
const emailService = new EmailService();

// Verificar lembretes de medicação a cada hora
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    
    const result = await db.query(`
      SELECT m.*, p.usuario_id, u.nome, u.email
      FROM medicamentos m
      JOIN pacientes p ON m.paciente_id = p.id
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE m.horario_principal = $1 AND m.ativo = true
    `, [currentTime]);

    for (const medication of result.rows) {
      await emailService.sendMedicationReminder(
        { nome: medication.nome, email: medication.email },
        medication
      );
    }
  } catch (error) {
    console.error('Erro ao enviar lembretes de medicação:', error);
  }
});

module.exports = EmailService;