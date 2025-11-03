const adminController = require('../../src/controllers/adminController');
const db = require('../../src/config/database');
const bcrypt = require('bcrypt');
const { 
  testData, 
  createMockUser, 
  createQueryResult 
} = require('../fixtures/testData');

jest.mock('../../src/config/database');
jest.mock('bcrypt');

describe('AdminController - Unit Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: testData.users.admin
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getDashboardStats', () => {
    it('deve retornar estatísticas do dashboard com sucesso', async () => {
      // Arrange
      db.query
        .mockResolvedValueOnce(createQueryResult(testData.dashboardStats.usersStats))
        .mockResolvedValueOnce(createQueryResult([testData.dashboardStats.dialysisStats]))
        .mockResolvedValueOnce(createQueryResult(testData.dashboardStats.monthlyRecords))
        .mockResolvedValueOnce(createQueryResult([testData.dashboardStats.recentAlerts]))
        .mockResolvedValueOnce(createQueryResult([]));

      // Act
      await adminController.getDashboardStats(mockReq, mockRes);

      // Assert
      const response = mockRes.json.mock.calls[0][0];
      
      expect(mockRes.json).toHaveBeenCalled();
      expect(response).toMatchObject({
        totalUsers: 62,
        activeUsers: 56,
        totalRecords: 1500,
        recentAlerts: 8,
        systemHealth: 98.5
      });
      
      // Aceitar tanto string quanto número
      expect(parseInt(response.totalPatients)).toBe(50);
      expect(parseInt(response.totalDoctors)).toBe(10);
      
      expect(db.query).toHaveBeenCalledTimes(5);
    });

    it('deve retornar erro 500 em caso de falha', async () => {
      // Arrange
      db.query.mockRejectedValue(new Error('Database error'));

      // Act
      await adminController.getDashboardStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro ao buscar estatísticas do dashboard'
      });
    });
  });

  describe('getAllUsers', () => {
    it('deve retornar lista de usuários paginada', async () => {
      // Arrange
      mockReq.query = { page: 1, limit: 20 };
      
      const mockUsers = {
        rows: [
          { id: 1, nome: 'João', email: 'joao@test.com', tipo_usuario: 'paciente' },
          { id: 2, nome: 'Maria', email: 'maria@test.com', tipo_usuario: 'medico' }
        ]
      };

      const mockCount = { rows: [{ count: '50' }] };

      db.query
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce(mockCount);

      // Act
      await adminController.getAllUsers(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        users: mockUsers.rows,
        total: 50,
        page: 1,
        totalPages: 3
      });
    });

    it('deve filtrar usuários por tipo', async () => {
      // Arrange
      mockReq.query = { tipo: 'medico', page: 1, limit: 20 };
      
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await adminController.getAllUsers(mockReq, mockRes);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('tipo_usuario = $1'),
        expect.arrayContaining(['medico'])
      );
    });

    it('deve filtrar usuários por busca de texto', async () => {
      // Arrange
      mockReq.query = { search: 'João', page: 1, limit: 20 };
      
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await adminController.getAllUsers(mockReq, mockRes);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%João%'])
      );
    });
  });

  describe('getUserById', () => {
    it('deve retornar usuário por ID', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      
      const mockUser = {
        rows: [{
          id: 1,
          nome: 'João Silva',
          email: 'joao@test.com',
          tipo_usuario: 'paciente',
          cpf: '12345678900'
        }]
      };

      db.query.mockResolvedValueOnce(mockUser);

      // Act
      await adminController.getUserById(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockUser.rows[0]
      });
    });

    it('deve retornar erro 404 se usuário não existe', async () => {
      // Arrange
      mockReq.params = { id: '999' };
      
      db.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await adminController.getUserById(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuário não encontrado'
      });
    });
  });

  describe('createUser', () => {
    it('deve criar um novo usuário paciente com sucesso', async () => {
      // Arrange
      mockReq.body = {
        nome: 'Novo Paciente',
        email: 'novo@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'paciente',
        cpf: '12345678900',
        data_nascimento: '1990-01-01'
      };

      bcrypt.hash.mockResolvedValue('hashed_password');
      
      db.query
        .mockResolvedValueOnce({ rows: [] }) // Email não existe
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            nome: 'Novo Paciente', 
            email: 'novo@test.com', 
            tipo_usuario: 'paciente' 
          }] 
        }) // Insert usuario
        .mockResolvedValueOnce({ rows: [] }) // Insert paciente
        .mockResolvedValueOnce({ rows: [] }); // Log auditoria

      // Act
      await adminController.createUser(mockReq, mockRes);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('Senha123!', 10);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Usuário criado com sucesso',
        user: expect.objectContaining({ nome: 'Novo Paciente' })
      });
    });

    it('deve criar um novo usuário médico com sucesso', async () => {
      // Arrange
      mockReq.body = {
        nome: 'Dr. Silva',
        email: 'drsilva@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'medico',
        crm: '12345-SC',
        especialidade: 'Nefrologia'
      };

      bcrypt.hash.mockResolvedValue('hashed_password');
      
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 2, 
            nome: 'Dr. Silva', 
            email: 'drsilva@test.com', 
            tipo_usuario: 'medico' 
          }] 
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await adminController.createUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO medicos'),
        expect.any(Array)
      );
    });

    it('deve retornar erro 400 se email já existe', async () => {
      // Arrange
      mockReq.body = {
        nome: 'Teste',
        email: 'existente@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'paciente'
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      // Act
      await adminController.createUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Email já cadastrado'
      });
    });

    it('deve retornar erro 400 se dados obrigatórios ausentes', async () => {
      // Arrange
      mockReq.body = { nome: 'Teste' };

      // Act
      await adminController.createUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Dados obrigatórios ausentes'
      });
    });

    it('deve retornar erro 500 em caso de falha no banco', async () => {
      // Arrange
      mockReq.body = {
        nome: 'Teste',
        email: 'teste@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'paciente'
      };

      db.query.mockRejectedValue(new Error('Database error'));

      // Act
      await adminController.createUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erro ao criar usuário'
      });
    });
  });

  describe('updateUser', () => {
    it('deve atualizar usuário com sucesso', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { nome: 'Nome Atualizado', ativo: true };

      const currentUser = { 
        rows: [{ 
          id: 1, 
          nome: 'Nome Antigo', 
          tipo_usuario: 'paciente' 
        }] 
      };
      
      const updatedUser = { 
        rows: [{ 
          id: 1, 
          nome: 'Nome Atualizado', 
          tipo_usuario: 'paciente',
          ativo: true 
        }] 
      };

      db.query
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(updatedUser)
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await adminController.updateUser(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Usuário atualizado com sucesso',
        user: expect.objectContaining({ nome: 'Nome Atualizado' })
      });
    });

    it('deve retornar erro 404 se usuário não existe', async () => {
      // Arrange
      mockReq.params = { id: '999' };
      mockReq.body = { nome: 'Teste' };

      db.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await adminController.updateUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuário não encontrado'
      });
    });

    it('deve retornar erro 500 em caso de falha', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { nome: 'Teste' };

      db.query.mockRejectedValue(new Error('Database error'));

      // Act
      await adminController.updateUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteUser', () => {
    it('deve inativar usuário (soft delete)', async () => {
      // Arrange
      mockReq.params = { id: '1' };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, ativo: false }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await adminController.deleteUser(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Usuário inativado com sucesso'
      });
    });

    it('deve retornar erro 404 se usuário não existe', async () => {
      // Arrange
      mockReq.params = { id: '999' };

      db.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await adminController.deleteUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuário não encontrado'
      });
    });
  });

  describe('assignDoctorToPatient', () => {
    it('deve vincular médico ao paciente', async () => {
      // Arrange
      mockReq.body = { paciente_id: 1, medico_id: 2 };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await adminController.assignDoctorToPatient(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Médico vinculado com sucesso'
      });
    });

    it('deve desvincular médico do paciente', async () => {
      // Arrange
      mockReq.body = { paciente_id: 1, medico_id: null };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await adminController.assignDoctorToPatient(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Médico desvinculado com sucesso'
      });
    });

    it('deve retornar erro 400 se paciente_id ausente', async () => {
      // Arrange
      mockReq.body = { medico_id: 2 };

      // Act
      await adminController.assignDoctorToPatient(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'ID do paciente é obrigatório'
      });
    });

    it('deve retornar erro 404 se paciente não existe', async () => {
      // Arrange
      mockReq.body = { paciente_id: 999, medico_id: 2 };

      db.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await adminController.assignDoctorToPatient(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Paciente não encontrado'
      });
    });
  });

  describe('getAuditLogs', () => {
    it('deve retornar logs de auditoria', async () => {
      // Arrange
      mockReq.query = { page: 1, limit: 50 };

      const mockLogs = {
        rows: [
          {
            id: 1,
            usuario_nome: 'Admin',
            operacao: 'INSERT',
            tabela_afetada: 'usuarios',
            data_operacao: new Date()
          }
        ]
      };

      db.query.mockResolvedValueOnce(mockLogs);

      // Act
      await adminController.getAuditLogs(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        logs: mockLogs.rows,
        page: 1,
        limit: 50
      });
    });
  });
});