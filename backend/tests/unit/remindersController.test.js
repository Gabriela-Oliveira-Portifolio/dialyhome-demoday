// 1. Mock do módulo de banco de dados (Deve vir ANTES de qualquer require que dependa dele)
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

// 2. Importa a referência do mock (para configurá-lo no teste)
const db = require('../../src/config/database'); 

// 3. Importa o SUT (Controller)
const remindersController = require('../../src/controllers/remindersController');

// Mock dos objetos req e res (Restante do arquivo permanece igual)
const mockReq = (options = {}) => ({
// ...
  user: { id: 1, ...options.user },
  params: options.params || {},
  query: options.query || {},
  body: options.body || {},
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('remindersController', () => {

  // Limpa o histórico de chamadas de todos os mocks antes de cada teste
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Testes para getReminders ---
  describe('getReminders', () => {
    const pacienteMock = [{ id: 101 }];
    const lembretesMock = [
      { id: 1, titulo: 'Lembrete 1' },
      { id: 2, titulo: 'Lembrete 2' }
    ];

    test('Deve retornar 404 se o paciente não for encontrado', async () => {
      const req = mockReq();
      const res = mockRes();

      // **CORREÇÃO: Garantir que a primeira chamada retorne array vazio**
      db.query.mockResolvedValueOnce({ rows: [] }); 

      await remindersController.getReminders(req, res);

      // A controller DEVE CHAMAR db.query uma vez
      expect(db.query).toHaveBeenCalledTimes(1); 
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
    });

    test('Deve buscar lembretes sem limite/offset', async () => {
      const req = mockReq();
      const res = mockRes();

      // **CORREÇÃO: Encadeamento de Mocks para Sucesso**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock }) // 1. Paciente encontrado
        .mockResolvedValueOnce({ rows: lembretesMock }); // 2. Lembretes encontrados

      await remindersController.getReminders(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        reminders: lembretesMock,
        total: lembretesMock.length
      });
    });

    test('Deve buscar lembretes com limite e offset', async () => {
      const req = mockReq({ query: { limit: '10', offset: '5' } });
      const res = mockRes();
      const pacienteId = pacienteMock[0].id;
      
      // **CORREÇÃO: Encadeamento de Mocks para Sucesso**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock })
        .mockResolvedValueOnce({ rows: lembretesMock });

      await remindersController.getReminders(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      // Verifica se o segundo db.query está correto
      expect(db.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('LIMIT 10 OFFSET 5'),
            [pacienteId]
            );

    });

    test('Deve retornar 500 em caso de erro do banco de dados', async () => {
      const req = mockReq();
      const res = mockRes();

      // **CORREÇÃO: Rejeita a primeira chamada (Busca paciente) para forçar o catch 500**
      db.query.mockRejectedValueOnce(new Error('Erro de BD'));

      await remindersController.getReminders(req, res);

      expect(res.status).toHaveBeenCalledWith(500); // Deve ser 500, pois cai no catch
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar lembretes' });
    });
  });

  // --- Testes para createReminder ---
  describe('createReminder', () => {
    const pacienteMock = [{ id: 101 }];
    const novoLembreteMock = {
      id: 3,
      tipo: 'medicacao',
      titulo: 'Tomar remédio',
      data_hora: '2025-12-01T10:00:00Z',
      paciente_id: 101
    };
    const dadosLembrete = {
      tipo: 'medicacao',
      titulo: 'Tomar remédio',
      data_hora: '2025-12-01T10:00:00Z',
      descricao: 'Descrição opcional',
      recorrente: true,
      frequencia_recorrencia: 'diario'
    };

    // Estes dois testes de validação devem ter passado, pois não chamam o DB
    test('Deve retornar 400 se faltarem campos obrigatórios', async () => { /* ... (ok) */ });
    test('Deve retornar 400 se o tipo de lembrete for inválido', async () => { /* ... (ok) */ });

    test('Deve retornar 404 se o paciente não for encontrado', async () => {
      const req = mockReq({ body: dadosLembrete });
      const res = mockRes();

      // **CORREÇÃO: Simula paciente não encontrado**
      db.query.mockResolvedValueOnce({ rows: [] }); 

      await remindersController.createReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
    });

    test('Deve criar o lembrete com sucesso (com todos os campos)', async () => {
      const req = mockReq({ body: dadosLembrete });
      const res = mockRes();

      // **CORREÇÃO: Encadeamento de Mocks para Sucesso**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock }) // 1. Paciente encontrado
        .mockResolvedValueOnce({ rows: [novoLembreteMock] }); // 2. Lembrete criado

      await remindersController.createReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Lembrete criado com sucesso',
      }));
    });

    test('Deve criar o lembrete com sucesso (com campos opcionais nulos)', async () => {
      const minimalData = { tipo: 'exame', titulo: 'Exame de sangue', data_hora: '2025-12-05T09:00:00Z' };
      const req = mockReq({ body: minimalData });
      const res = mockRes();

      // **CORREÇÃO: Encadeamento de Mocks para Sucesso**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock })
        .mockResolvedValueOnce({ rows: [{ ...minimalData, paciente_id: pacienteMock[0].id, recorrente: false }] });

      await remindersController.createReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('Deve retornar 500 em caso de erro de inserção no banco de dados', async () => {
      const req = mockReq({ body: dadosLembrete });
      const res = mockRes();
      const error = new Error('Erro de inserção');

      // **CORREÇÃO: mockResolvedValueOnce para a 1ª chamada (Paciente) e mockRejectedValueOnce para a 2ª (Insert)**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock }) 
        .mockRejectedValueOnce(error);

      await remindersController.createReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(500); // Deve ser 500, pois é o erro de INSERT
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao criar lembrete', details: error.message });
    });
  });

  // --- Testes para updateReminder ---
  describe('updateReminder', () => {
    const pacienteMock = [{ id: 101 }];
    const lembreteId = 15;
    const lembreteAtualizadoMock = { id: lembreteId, titulo: 'Novo Título' };
    const dadosAtualizacao = { titulo: 'Novo Título', recorrente: false };

    test('Deve retornar 404 se o paciente não for encontrado', async () => {
      const req = mockReq({ params: { id: lembreteId }, body: dadosAtualizacao });
      const res = mockRes();

      // **CORREÇÃO: Simula paciente não encontrado**
      db.query.mockResolvedValueOnce({ rows: [] }); 

      await remindersController.updateReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Paciente não encontrado' });
    });

    test('Deve retornar 404 se o lembrete não pertencer ao paciente', async () => {
      const req = mockReq({ params: { id: lembreteId }, body: dadosAtualizacao });
      const res = mockRes();

      // **CORREÇÃO: Encadeamento de Mocks**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock }) // 1. Paciente encontrado
        .mockResolvedValueOnce({ rows: [] }); // 2. Lembrete NÃO encontrado para este paciente

      await remindersController.updateReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Lembrete não encontrado' });
    });

    test('Deve atualizar o lembrete com sucesso', async () => {
      const req = mockReq({ params: { id: lembreteId }, body: dadosAtualizacao });
      const res = mockRes();

      // **CORREÇÃO: Encadeamento de Mocks**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock }) // 1. Paciente encontrado
        .mockResolvedValueOnce({ rows: [{ id: lembreteId }] }) // 2. Lembrete pertence ao paciente
        .mockResolvedValueOnce({ rows: [lembreteAtualizadoMock] }); // 3. Atualização bem-sucedida

      await remindersController.updateReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(3);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Lembrete atualizado com sucesso',
        reminder: lembreteAtualizadoMock
      });
    });

    test('Deve retornar 500 em caso de erro de atualização no banco de dados', async () => {
      const req = mockReq({ params: { id: lembreteId }, body: dadosAtualizacao });
      const res = mockRes();
      const error = new Error('Erro de UPDATE');

      // **CORREÇÃO: Rejeição na 3ª chamada (Update)**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock }) 
        .mockResolvedValueOnce({ rows: [{ id: lembreteId }] }) 
        .mockRejectedValueOnce(error);

      await remindersController.updateReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(500); 
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao atualizar lembrete' });
    });
  });

  // --- Testes para deleteReminder (soft delete) ---
  describe('deleteReminder', () => {
    const pacienteMock = [{ id: 101 }];
    const lembreteId = 20;

    test('Deve retornar 404 se o paciente não for encontrado', async () => {
      const req = mockReq({ params: { id: lembreteId } });
      const res = mockRes();

      db.query.mockResolvedValueOnce({ rows: [] });

      await remindersController.deleteReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('Deve retornar 404 se o lembrete não for encontrado ou não pertencer ao paciente', async () => {
      const req = mockReq({ params: { id: lembreteId } });
      const res = mockRes();

      // **CORREÇÃO: Simula que o UPDATE (2ª chamada) não afetou linhas**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock })
        .mockResolvedValueOnce({ rows: [] }); 

      await remindersController.deleteReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Lembrete não encontrado' });
    });

    test('Deve deletar (soft delete) o lembrete com sucesso', async () => {
      const req = mockReq({ params: { id: lembreteId } });
      const res = mockRes();

      // **CORREÇÃO: Simula que o UPDATE (2ª chamada) afetou 1 linha**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock })
        .mockResolvedValueOnce({ rows: [{ id: lembreteId }] }); 

      await remindersController.deleteReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lembrete deletado com sucesso' });
    });

    test('Deve retornar 500 em caso de erro de exclusão no banco de dados', async () => {
      const req = mockReq({ params: { id: lembreteId } });
      const res = mockRes();
      const error = new Error('Erro de DELETE');

      // **CORREÇÃO: Rejeição na 2ª chamada (Update)**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock })
        .mockRejectedValueOnce(error);

      await remindersController.deleteReminder(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(500); 
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao deletar lembrete' });
    });
  });

  // --- Testes para getUpcomingReminders ---
  describe('getUpcomingReminders', () => {
    const pacienteMock = [{ id: 101 }];
    const proximosLembretesMock = [{ id: 1, titulo: 'Próximo' }];

    test('Deve retornar 404 se o paciente não for encontrado', async () => { /* ... (ok) */ });

    test('Deve buscar os lembretes próximos com sucesso', async () => {
      const req = mockReq();
      const res = mockRes();

      // **CORREÇÃO: Encadeamento de Mocks para Sucesso**
      db.query
        .mockResolvedValueOnce({ rows: pacienteMock })
        .mockResolvedValueOnce({ rows: proximosLembretesMock });

      await remindersController.getUpcomingReminders(req, res);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({ reminders: proximosLembretesMock });
    });

    test('Deve retornar 500 em caso de erro de banco de dados', async () => {
      const req = mockReq();
      const res = mockRes();
      const error = new Error('Erro de busca próxima');

      // **CORREÇÃO: Rejeição na 1ª chamada (Busca paciente) para forçar o catch 500**
      db.query.mockRejectedValueOnce(error);

      await remindersController.getUpcomingReminders(req, res);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar lembretes próximos' });
    });
  });
});