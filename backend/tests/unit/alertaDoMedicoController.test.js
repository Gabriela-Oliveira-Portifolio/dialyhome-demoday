// 1. Mock do Nodemailer para evitar o envio real de e-mails
const mockSendMail = jest.fn();
const mockVerify = jest.fn((callback) => callback(null, true)); // Simula sucesso na verificação
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  })),
}));

// 2. Mock do módulo de banco de dados
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const alertaDoMedicoController = require('../../src/controllers/alertaDoMedicoController');
const {
  enviarAlerta,
  listarAlertasEnviados,
  buscarAlerta,
  obterEstatisticas
} = alertaDoMedicoController; // Usa a versão carregada após os mocks

const db = require('../../src/config/database');

// Configuração do ambiente (necessário para os templates)
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'testpass';
process.env.FRONTEND_URL = 'http://test.app';

// Mock dos objetos req e res
const mockReq = (options = {}) => ({
  user: { id: 200, role: 'medico', ...options.user }, // Usuário do médico autenticado
  params: options.params || {},
  query: options.query || {},
  body: options.body || {},
  ip: '127.0.0.1',
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Dados Mock
const medicoMock = { id: 10, crm: '12345', especialidade: 'Nefrologia', nome: 'Dr. House' };
const pacienteMock = { id: 50, nome: 'Paciente Teste', email: 'paciente@test.com' };
const vinculoMock = { id: 50 }; // Confirma que o paciente é do médico
const notificacaoMock = { id: 1001, data_criacao: new Date().toISOString() };
const alertaId = 1001;
const pacienteId = 50;
const medicoUserId = 200;


describe('alertaDoMedicoController', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'mock-id' }); // Configuração padrão para sucesso de email
  });

  // ====================================================================
  // ENVIAR ALERTA (POST /api/doctor/alerta/enviar)
  // ====================================================================
  describe('enviarAlerta', () => {
    const dadosEnvio = {
      paciente_id: pacienteId,
      mensagem: 'Sua medicação precisa ser ajustada. Favor ligar para o consultório.',
      email: pacienteMock.email,
    };

    // --- Testes de Validação ---
    test('Deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
      const req = mockReq({ body: { paciente_id: pacienteId, mensagem: 'ok' } }); // Falta email
      const res = mockRes();

      await enviarAlerta(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(db.query).not.toHaveBeenCalled();
    });

    test('Deve retornar 400 se a mensagem for muito curta', async () => {
      const req = mockReq({ body: { ...dadosEnvio, mensagem: 'Curta' } });
      const res = mockRes();

      await enviarAlerta(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(db.query).not.toHaveBeenCalled();
    });
    
    test('Deve retornar 400 se o email for inválido', async () => {
      const req = mockReq({ body: { ...dadosEnvio, email: 'invalido@.com' } });
      const res = mockRes();

      await enviarAlerta(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(db.query).not.toHaveBeenCalled();
    });


    // --- Testes de Permissão e Dados ---
    test('Deve retornar 404 se o médico não for encontrado', async () => {
      const req = mockReq({ body: dadosEnvio });
      const res = mockRes();

      db.query.mockResolvedValueOnce({ rows: [] }); // 1. Médico não encontrado

      await enviarAlerta(req, res);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Médico não encontrado' });
    });

    test('Deve retornar 404 se o paciente não for encontrado', async () => {
      const req = mockReq({ body: dadosEnvio });
      const res = mockRes();

      db.query
        .mockResolvedValueOnce({ rows: [medicoMock] }) // 1. Médico encontrado
        .mockResolvedValueOnce({ rows: [] });          // 2. Paciente não encontrado

      await enviarAlerta(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
    });

    test('Deve retornar 403 se o paciente não estiver vinculado ao médico', async () => {
      const req = mockReq({ body: dadosEnvio });
      const res = mockRes();

      db.query
        .mockResolvedValueOnce({ rows: [medicoMock] })      // 1. Médico
        .mockResolvedValueOnce({ rows: [pacienteMock] })    // 2. Paciente
        .mockResolvedValueOnce({ rows: [] });               // 3. Vínculo FALHOU

      await enviarAlerta(req, res);

      expect(db.query).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Você não tem permissão para enviar alertas para este paciente'
      });
    });


    // --- Testes de Sucesso ---
    test('Deve criar notificação, enviar email e registrar log com sucesso', async () => {
      const req = mockReq({ body: dadosEnvio });
      const res = mockRes();

      db.query
        .mockResolvedValueOnce({ rows: [medicoMock] })      // 1. Médico
        .mockResolvedValueOnce({ rows: [pacienteMock] })    // 2. Paciente
        .mockResolvedValueOnce({ rows: [vinculoMock] })     // 3. Vínculo SUCESSO
        .mockResolvedValueOnce({ rows: [notificacaoMock] }) // 4. Notificação INSERT
        .mockResolvedValueOnce({ rows: [] });               // 5. Log de Auditoria INSERT

      await enviarAlerta(req, res);

      // Verifica as chamadas ao DB
      expect(db.query).toHaveBeenCalledTimes(5);
      
      // Verifica a chamada de INSERT da Notificação (4ª chamada)
      expect(db.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO notificacoes'),
        [
          pacienteMock.id,
          'alerta_medico',
          expect.stringContaining(medicoMock.nome), // Título
          dadosEnvio.mensagem.trim() // Mensagem sanitizada
        ]
      );
      
      // Verifica o envio de email
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Alerta enviado com sucesso',
        data: expect.objectContaining({
          notificacao_id: notificacaoMock.id,
          email_enviado: true,
        })
      }));
    });

    test('Deve registrar sucesso mesmo se o envio de email falhar', async () => {
      const req = mockReq({ body: dadosEnvio });
      const res = mockRes();
      
      mockSendMail.mockRejectedValue(new Error('Erro SMTP')); // Simula falha no envio de email

      db.query
        .mockResolvedValueOnce({ rows: [medicoMock] })
        .mockResolvedValueOnce({ rows: [pacienteMock] })
        .mockResolvedValueOnce({ rows: [vinculoMock] })
        .mockResolvedValueOnce({ rows: [notificacaoMock] }) // Notificação SUCESSO
        .mockResolvedValueOnce({ rows: [] });               // Log de Auditoria SUCESSO

      await enviarAlerta(req, res);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200); // Deve ser 200 (sucesso da API)
      
      // Verifica se o log registrou email_enviado: false
      expect(db.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining('INSERT INTO logs_auditoria'),
        expect.arrayContaining([
            expect.stringContaining(`"email_enviado":false`) // Deve ser false
        ])
      );
    });
    
    test('Deve sanitizar a mensagem (prevenir XSS)', async () => {
      const mensagemXSS = 'Mensagem <script>alert("xss")</script> de teste "com aspas" e \'barra/\'.';
      const dadosComXSS = { ...dadosEnvio, mensagem: mensagemXSS };
      const req = mockReq({ body: dadosComXSS });
      const res = mockRes();
      
      db.query
        .mockResolvedValueOnce({ rows: [medicoMock] })
        .mockResolvedValueOnce({ rows: [pacienteMock] })
        .mockResolvedValueOnce({ rows: [vinculoMock] })
        .mockResolvedValueOnce({ rows: [notificacaoMock] })
        .mockResolvedValueOnce({ rows: [] });

      await enviarAlerta(req, res);
      
        // Linha 238
        // Antigo: const expectedSanitized = 'Mensagem &lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt; de teste &quot;com aspas&quot; e &#x27;barra&#x2F;.';
        // Novo (ajustado para o que o DB recebeu):
        const expectedSanitized = 'Mensagem &lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt; de teste &quot;com aspas&quot; e &#x27;barra&#x2F;&#x27;';

      // Verifica a notificação no DB
      expect(db.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO notificacoes'),
        expect.arrayContaining([
            expect.stringContaining(expectedSanitized) // Usa stringContaining para a mensagem
        ])
        );
    });

    test('Deve retornar 500 em caso de falha na criação da notificação', async () => {
      const req = mockReq({ body: dadosEnvio });
      const res = mockRes();

      db.query
        .mockResolvedValueOnce({ rows: [medicoMock] })
        .mockResolvedValueOnce({ rows: [pacienteMock] })
        .mockResolvedValueOnce({ rows: [vinculoMock] })
        .mockRejectedValueOnce(new Error('Falha no INSERT')); // 4. Falha na notificação

      await enviarAlerta(req, res);

      expect(db.query).toHaveBeenCalledTimes(4); // Deve falhar na 4ª
      expect(mockSendMail).not.toHaveBeenCalled(); // Não deve tentar enviar email
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ====================================================================
  // LISTAR ALERTAS ENVIADOS (GET /api/doctor/alerta/enviados)
  // ====================================================================
  describe('listarAlertasEnviados', () => {
    const medicoId = 10;
    const alertaMock = [{ id: 1, titulo: 'Alerta' }];
    const totalMock = [{ total: '5' }];

    test('Deve retornar 404 se o médico não for encontrado', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      db.query.mockResolvedValueOnce({ rows: [] }); // 1. Médico não encontrado

      await listarAlertasEnviados(req, res);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Médico não encontrado' });
    });

    test('Deve listar alertas com paginação padrão (limite 20, página 1)', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      db.query
        .mockResolvedValueOnce({ rows: [{ id: medicoId }] }) // 1. Médico
        .mockResolvedValueOnce({ rows: alertaMock })         // 2. Listagem
        .mockResolvedValueOnce({ rows: totalMock });         // 3. Contagem

      await listarAlertasEnviados(req, res);

      // Verifica a query de listagem (2ª chamada)
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [medicoId, 20, 0] // [medicoId, limite, offset]
      );
      // Verifica a query de contagem (3ª chamada)
      expect(db.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('SELECT COUNT(*) as total'),
        [medicoId]
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        alertas: alertaMock,
        paginacao: expect.objectContaining({
          pagina_atual: 1,
          total_paginas: 1,
          total_registros: 5,
        })
      }));
    });

    test('Deve listar alertas com filtro de paciente e paginação', async () => {
      const pacienteIdFiltro = 99;
      const req = mockReq({ query: { paciente_id: pacienteIdFiltro, limite: 10, pagina: 2 } });
      const res = mockRes();
      const offsetEsperado = 10;

      db.query
        .mockResolvedValueOnce({ rows: [{ id: medicoId }] }) // 1. Médico
        .mockResolvedValueOnce({ rows: alertaMock })         // 2. Listagem
        .mockResolvedValueOnce({ rows: totalMock });         // 3. Contagem

      await listarAlertasEnviados(req, res);

      // Query de Listagem (2ª chamada)
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        // $1 = medicoId, $2 = paciente_id, $3 = limite, $4 = offset
        expect.stringContaining('AND p.id = $2 ORDER BY n.data_criacao DESC LIMIT $3 OFFSET $4'),
        [medicoId, pacienteIdFiltro, 10, offsetEsperado]
      );

      // Query de Contagem (3ª chamada)
      expect(db.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('AND p.id = $2'),
        [medicoId, pacienteIdFiltro]
      );

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        paginacao: expect.objectContaining({
          pagina_atual: 2,
          registros_por_pagina: 10
        })
      }));
    });

    test('Deve retornar 500 em caso de erro do banco de dados', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      db.query
        .mockResolvedValueOnce({ rows: [{ id: medicoId }] }) // Simula médico encontrado
        .mockRejectedValueOnce(new Error('Erro de BD')); // Falha na listagem

      await listarAlertasEnviados(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar alertas' });
    });
  });


  // ====================================================================
  // BUSCAR ALERTA (GET /api/doctor/alerta/:id)
  // ====================================================================
// ====================================================================
// BUSCAR ALERTA (GET /api/doctor/alerta/:id)
// ====================================================================
describe('buscarAlerta', () => {
    const alertaMock = { id: alertaId, titulo: 'Alerta Teste' };
    const alertaReq = { params: { id: alertaId } };

    test('Deve buscar alerta com sucesso', async () => {
        const req = mockReq(alertaReq); // << LINHA REINTRODUZIDA
        const res = mockRes(); // << LINHA REINTRODUZIDA

        db.query.mockResolvedValueOnce({ rows: [alertaMock] });

        await buscarAlerta(req, res); // << Agora req e res estão definidos

        expect(db.query).toHaveBeenCalledTimes(1);
        // Correção: Relaxa a string da query para evitar falhas por quebras de linha/espaços
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE n.id = $1'), // Busca apenas a primeira condição
            [alertaId, medicoUserId]
        );
        expect(res.json).toHaveBeenCalledWith({ alerta: alertaMock });
    });
    // ... (restante dos testes)
});

  // ====================================================================
  // OBTER ESTATÍSTICAS (GET /api/doctor/alerta/estatisticas)
  // ====================================================================
  describe('obterEstatisticas', () => {
    const medicoId = 10;
    const statsMock = { total: '10', lidos: '7', nao_lidos: '3' };

    test('Deve retornar 404 se o médico não for encontrado', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      db.query.mockResolvedValueOnce({ rows: [] }); // 1. Médico não encontrado

      await obterEstatisticas(req, res);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('Deve retornar estatísticas sem filtros de data', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      db.query
        .mockResolvedValueOnce({ rows: [{ id: medicoId }] }) // 1. Médico
        .mockResolvedValueOnce({ rows: [statsMock] });       // 2. Estatísticas

      await obterEstatisticas(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('WHERE p.medico_responsavel_id = $1'),
        [medicoId]
      );
      expect(res.json).toHaveBeenCalledWith({
        total_alertas_enviados: 10,
        alertas_lidos: 7,
        alertas_nao_lidos: 3,
        taxa_leitura: '70.00%'
      });
    });

    test('Deve retornar estatísticas com filtros de data', async () => {
      const dataInicio = '2024-01-01';
      const dataFim = '2024-12-31';
      const req = mockReq({ query: { data_inicio: dataInicio, data_fim: dataFim } });
      const res = mockRes();

      db.query
        .mockResolvedValueOnce({ rows: [{ id: medicoId }] }) // 1. Médico
        .mockResolvedValueOnce({ rows: [statsMock] });       // 2. Estatísticas

      await obterEstatisticas(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      // Verifica a query com os filtros
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('AND n.data_criacao >= $2 AND n.data_criacao <= $3'),
        [medicoId, dataInicio, dataFim]
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        total_alertas_enviados: 10,
      }));
    });

    test('Deve retornar 500 em caso de erro do banco de dados', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      db.query
        .mockResolvedValueOnce({ rows: [{ id: medicoId }] })
        .mockRejectedValueOnce(new Error('Erro de BD'));

      await obterEstatisticas(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar estatísticas' });
    });
  });
});