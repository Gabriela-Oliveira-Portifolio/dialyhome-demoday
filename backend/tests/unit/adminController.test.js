// Garantir que está em modo de teste ANTES de importar
process.env.NODE_ENV = 'test';

const adminController = require('../../src/controllers/adminController');
const db = require('../../src/config/database');
const bcrypt = require('bcrypt');
const { 
  testData, 
  createQueryResult 
} = require('../fixtures/testData');

describe('AdminController - Unit Tests (usando dialyhome_test)', () => {
  let mockReq, mockRes;
  let adminUserId;
  let createdUserIds = [];

  beforeAll(async () => {
    // Confirmar que estamos usando o banco de teste
    const dbCheck = await db.query('SELECT current_database()');
    console.log('📊 Banco de dados atual:', dbCheck.rows[0].current_database);
    
    expect(dbCheck.rows[0].current_database).toBe('dialyhome_test');

    // Limpar banco de teste
    await db.query('DELETE FROM logs_auditoria');
    await db.query('DELETE FROM registro_sintomas');
    await db.query('DELETE FROM registros_dialise');
    await db.query('DELETE FROM notificacoes');
    await db.query('DELETE FROM pacientes');
    await db.query('DELETE FROM medicos');
    await db.query('DELETE FROM usuarios');

    // Criar usuário admin
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const adminResult = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
       VALUES ('Admin Teste Unit', 'admin.unit@test.com', $1, 'admin', true)
       RETURNING id`,
      [hashedPassword]
    );
    adminUserId = adminResult.rows[0].id;

    console.log('✅ Setup de testes unitários concluído. Admin ID:', adminUserId);
  });

  beforeEach(() => {
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { 
        id: adminUserId,
        tipo_usuario: 'admin',
        email: 'admin.unit@test.com',
        nome: 'Admin Teste Unit'
      }
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterAll(async () => {
    // Limpar dados criados durante os testes
    if (createdUserIds.length > 0) {
      await db.query(
        `DELETE FROM usuarios WHERE id = ANY($1::int[])`,
        [createdUserIds]
      );
    }
    await db.pool.end();
  });

  describe('getDashboardStats', () => {
    it('deve retornar estatísticas do dashboard', async () => {
      await adminController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response).toHaveProperty('totalUsers');
      expect(response).toHaveProperty('activeUsers');
      expect(response).toHaveProperty('totalRecords');
      expect(response).toHaveProperty('systemHealth');
      expect(response.systemHealth).toBe(98.5);
    });
  });

  describe('getAllUsers', () => {
    it('deve retornar lista de usuários paginada', async () => {
      mockReq.query = { page: 1, limit: 20 };

      await adminController.getAllUsers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response).toHaveProperty('users');
      expect(response).toHaveProperty('total');
      expect(response).toHaveProperty('page');
      expect(response).toHaveProperty('totalPages');
      expect(Array.isArray(response.users)).toBe(true);
    });

    it('deve filtrar usuários por tipo', async () => {
      mockReq.query = { tipo: 'admin', page: 1, limit: 20 };

      await adminController.getAllUsers(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      
      if (response.users.length > 0) {
        expect(response.users.every(u => u.tipo_usuario === 'admin')).toBe(true);
      }
    });

    it('deve filtrar usuários por busca de texto', async () => {
      mockReq.query = { search: 'Admin', page: 1, limit: 20 };

      await adminController.getAllUsers(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.users.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getUserById', () => {
    it('deve retornar usuário por ID', async () => {
      mockReq.params = { id: adminUserId.toString() };

      await adminController.getUserById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response).toHaveProperty('user');
      expect(response.user.id).toBe(adminUserId);
      expect(response.user.nome).toBe('Admin Teste Unit');
    });

    it('deve retornar erro 404 se usuário não existe', async () => {
      mockReq.params = { id: '99999' };

      await adminController.getUserById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuário não encontrado'
      });
    });
  });

  describe('createUser', () => {
    it('deve criar um novo usuário paciente com sucesso', async () => {
      mockReq.body = {
        nome: 'Paciente Unit Test',
        email: 'paciente.unit@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'paciente',
        cpf: '12345678900',
        data_nascimento: '1990-01-01',
        telefone: '(47) 99999-9999'
      };

      await adminController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.message).toBe('Usuário criado com sucesso');
      expect(response.user.nome).toBe('Paciente Unit Test');
      
      createdUserIds.push(response.user.id);
    });

    it('deve criar um novo usuário médico com sucesso', async () => {
      mockReq.body = {
        nome: 'Dr. Unit Test',
        email: 'dr.unit@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'medico',
        crm: '12345-SC',
        especialidade: 'Nefrologia',
        telefone_contato: '(47) 98888-8888'
      };

      await adminController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.user.tipo_usuario).toBe('medico');
      
      createdUserIds.push(response.user.id);
    });

    it('deve retornar erro 400 se email já existe', async () => {
      mockReq.body = {
        nome: 'Teste Duplicado',
        email: 'admin.unit@test.com', // Email do admin já existe
        senha: 'Senha123!',
        tipo_usuario: 'paciente'
      };

      await adminController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Email já cadastrado'
      });
    });

    it('deve retornar erro 400 se dados obrigatórios ausentes', async () => {
      mockReq.body = { nome: 'Teste Incompleto' };

      await adminController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Dados obrigatórios ausentes'
      });
    });

    it('deve retornar erro 500 em caso de falha no banco', async () => {
      // Forçar um erro usando um tipo de usuário inválido
      mockReq.body = {
        nome: 'Teste Erro',
        email: 'erro@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'tipo_invalido' // Vai falhar na constraint CHECK
      };

      await adminController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateUser', () => {
    let userToUpdateId;

    beforeAll(async () => {
      // Criar usuário para testes de atualização
      const result = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
         VALUES ('Usuario Para Update', 'update.unit@test.com', $1, 'paciente', true)
         RETURNING id`,
        [await bcrypt.hash('senha123', 10)]
      );
      userToUpdateId = result.rows[0].id;
    });

    it('deve atualizar usuário com sucesso', async () => {
      mockReq.params = { id: userToUpdateId.toString() };
      mockReq.body = { nome: 'Nome Atualizado Unit', ativo: true };

      await adminController.updateUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response.message).toBe('Usuário atualizado com sucesso');
      expect(response.user.nome).toBe('Nome Atualizado Unit');
    });

    it('deve retornar erro 404 se usuário não existe', async () => {
      mockReq.params = { id: '99999' };
      mockReq.body = { nome: 'Teste' };

      await adminController.updateUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuário não encontrado'
      });
    });
  });

  describe('deleteUser', () => {
    let userToDeleteId;

    beforeEach(async () => {
      // Criar novo usuário para cada teste de deleção
      const result = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
         VALUES ('Usuario Para Delete', $1, $2, 'paciente', true)
         RETURNING id`,
        [`delete.${Date.now()}@test.com`, await bcrypt.hash('senha123', 10)]
      );
      userToDeleteId = result.rows[0].id;
    });

    it('deve inativar usuário (soft delete)', async () => {
      mockReq.params = { id: userToDeleteId.toString() };

      await adminController.deleteUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Usuário inativado com sucesso'
      });

      // Verificar se foi realmente inativado
      const check = await db.query('SELECT ativo FROM usuarios WHERE id = $1', [userToDeleteId]);
      expect(check.rows[0].ativo).toBe(false);
    });

    it('deve retornar erro 404 se usuário não existe', async () => {
      mockReq.params = { id: '99999' };

      await adminController.deleteUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuário não encontrado'
      });
    });
  });

  describe('assignDoctorToPatient', () => {
    let medicoId, pacienteId;

    beforeAll(async () => {
      // Criar médico
      const medicoUser = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
         VALUES ('Dr. Vinculo', 'vinculo@test.com', $1, 'medico', true)
         RETURNING id`,
        [await bcrypt.hash('senha123', 10)]
      );
      
      const medicoResult = await db.query(
        `INSERT INTO medicos (usuario_id, crm, especialidade)
         VALUES ($1, '99999-SC', 'Nefrologia')
         RETURNING id`,
        [medicoUser.rows[0].id]
      );
      medicoId = medicoResult.rows[0].id;

      // Criar paciente
      const pacienteUser = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
         VALUES ('Paciente Vinculo', 'pac.vinculo@test.com', $1, 'paciente', true)
         RETURNING id`,
        [await bcrypt.hash('senha123', 10)]
      );
      
      const pacienteResult = await db.query(
        `INSERT INTO pacientes (usuario_id, cpf)
         VALUES ($1, '99999999999')
         RETURNING id`,
        [pacienteUser.rows[0].id]
      );
      pacienteId = pacienteResult.rows[0].id;
    });

    it('deve vincular médico ao paciente', async () => {
      mockReq.body = { paciente_id: pacienteId, medico_id: medicoId };

      await adminController.assignDoctorToPatient(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Médico vinculado com sucesso'
      });

      // Verificar vinculação
      const check = await db.query(
        'SELECT medico_responsavel_id FROM pacientes WHERE id = $1',
        [pacienteId]
      );
      expect(check.rows[0].medico_responsavel_id).toBe(medicoId);
    });

    it('deve desvincular médico do paciente', async () => {
      mockReq.body = { paciente_id: pacienteId, medico_id: null };

      await adminController.assignDoctorToPatient(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Médico desvinculado com sucesso'
      });

      // Verificar desvinculação
      const check = await db.query(
        'SELECT medico_responsavel_id FROM pacientes WHERE id = $1',
        [pacienteId]
      );
      expect(check.rows[0].medico_responsavel_id).toBeNull();
    });

    it('deve retornar erro 400 se paciente_id ausente', async () => {
      mockReq.body = { medico_id: medicoId };

      await adminController.assignDoctorToPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'ID do paciente é obrigatório'
      });
    });

    it('deve retornar erro 404 se paciente não existe', async () => {
      mockReq.body = { paciente_id: 99999, medico_id: medicoId };

      await adminController.assignDoctorToPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Paciente não encontrado'
      });
    });
  });

  describe('getAuditLogs', () => {
    it('deve retornar logs de auditoria', async () => {
      mockReq.query = { page: 1, limit: 50 };

      await adminController.getAuditLogs(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      
      expect(response).toHaveProperty('logs');
      expect(response).toHaveProperty('page');
      expect(response).toHaveProperty('limit');
      expect(Array.isArray(response.logs)).toBe(true);
    });
  });
});