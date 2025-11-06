// backend/src/__tests__/services/emailService.test.js

// Mock GLOBAL do nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
const mockVerify = jest.fn((callback) => callback(null, true));
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
  verify: mockVerify
}));

jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport
}));

const emailService = require('../../src/services/emailService');

describe('EmailService', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  describe('sendAlertEmail', () => {
    test('deve enviar email de alerta com sucesso - prioridade baixa', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dra. Maria Santos',
        title: 'Ajuste na medicação',
        message: 'Por favor, ajustar a dosagem conforme orientado.',
        priority: 'baixa'
      };

      const result = await emailService.sendAlertEmail(alertData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.to).toBe('paciente@test.com');
      expect(emailCall.subject).toContain('Baixa');
      expect(emailCall.html).toContain('João Silva');
    });

    test('deve enviar email com prioridade média', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dr. Pedro Costa',
        title: 'Atenção aos sintomas',
        message: 'Observe os sintomas.',
        priority: 'media'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.subject).toContain('Média');
    });

    test('deve enviar email com prioridade alta', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'Maria Santos',
        doctorName: 'Dr. Carlos Lima',
        title: 'URGENTE',
        message: 'Procure atendimento.',
        priority: 'alta'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.subject).toContain('Alta');
    });

    test('deve incluir sessionInfo quando fornecida', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'Ana Costa',
        doctorName: 'Dra. Julia Ferreira',
        title: 'Verificar valores',
        message: 'Atenção aos valores.',
        priority: 'media',
        sessionInfo: {
          data: '15/01/2025',
          pa: '140/90 mmHg',
          uf: '2500 mL'
        }
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('15/01/2025');
      expect(emailCall.html).toContain('140/90 mmHg');
    });

    test('deve enviar sem sessionInfo', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'Pedro Santos',
        doctorName: 'Dr. Roberto Silva',
        title: 'Lembrete',
        message: 'Consulta amanhã.',
        priority: 'baixa'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).not.toContain('Relacionado à Sessão');
    });

    test('deve usar prioridade média como padrão', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dra. Maria Santos',
        title: 'Teste',
        message: 'Mensagem.',
        priority: 'invalida'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.subject).toContain('Média');
    });

    test('deve incluir link para o dashboard', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dra. Maria Santos',
        title: 'Teste',
        message: 'Mensagem.',
        priority: 'baixa'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('/dashboard');
    });

    test('deve incluir informações do sistema', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dra. Maria Santos',
        title: 'Teste',
        message: 'Mensagem.',
        priority: 'baixa'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('DialCare');
    });

    test('deve lançar erro quando falha', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dra. Maria Santos',
        title: 'Teste',
        message: 'Mensagem.',
        priority: 'baixa'
      };

      await expect(emailService.sendAlertEmail(alertData)).rejects.toThrow('SMTP error');
    });

    test('deve incluir emojis no HTML', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dra. Maria Santos',
        title: 'Alerta',
        message: 'Mensagem.',
        priority: 'alta'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('⚠️');
      expect(emailCall.html).toContain('📋');
    });
  });

  describe('sendTestEmail', () => {
    test('deve enviar email de teste', async () => {
      const result = await emailService.sendTestEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.to).toBe('test@example.com');
      expect(emailCall.subject).toContain('Teste');
    });

    test('deve incluir DialCare no email', async () => {
      await emailService.sendTestEmail('test@example.com');

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.text).toContain('DialCare');
      expect(emailCall.html).toContain('DialCare');
    });

    test('deve lançar erro quando falha', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(emailService.sendTestEmail('test@example.com')).rejects.toThrow('Connection timeout');
    });
  });

  describe('Templates e formatação', () => {
    test('deve gerar HTML válido', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dra. Maria Santos',
        title: 'Teste',
        message: 'Mensagem.',
        priority: 'media'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('<!DOCTYPE html>');
      expect(emailCall.html).toContain('</html>');
    });

    test('deve incluir charset UTF-8', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dra. Maria Santos',
        title: 'Teste',
        message: 'Mensagem.',
        priority: 'baixa'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('UTF-8');
    });

    test('deve preservar quebras de linha', async () => {
      const alertData = {
        to: 'paciente@test.com',
        patientName: 'João Silva',
        doctorName: 'Dra. Maria Santos',
        title: 'Teste',
        message: 'Linha 1\nLinha 2\nLinha 3',
        priority: 'baixa'
      };

      await emailService.sendAlertEmail(alertData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('pre-wrap');
    });
  });

  describe('Cores por prioridade', () => {
    test('deve usar cor verde para baixa', async () => {
      await emailService.sendAlertEmail({
        to: 'test@test.com',
        patientName: 'Test',
        doctorName: 'Test',
        title: 'Test',
        message: 'Test',
        priority: 'baixa'
      });

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('#10b981');
    });

    test('deve usar cor laranja para média', async () => {
      await emailService.sendAlertEmail({
        to: 'test@test.com',
        patientName: 'Test',
        doctorName: 'Test',
        title: 'Test',
        message: 'Test',
        priority: 'media'
      });

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('#f59e0b');
    });

    test('deve usar cor vermelha para alta', async () => {
      await emailService.sendAlertEmail({
        to: 'test@test.com',
        patientName: 'Test',
        doctorName: 'Test',
        title: 'Test',
        message: 'Test',
        priority: 'alta'
      });

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('#ef4444');
    });
  });
});
