const adminController = require('../../src/controllers/adminController');
const db = require('../../src/config/database');
const bcrypt = require('bcrypt');
const { 
  testData, 
  createMockUser, 
  createQueryResult 
} = require('../fixtures/testData');
// Mock das dependências
jest.mock('../../src/config/database');
jest.mock('bcrypt');

describe('AdminController - Unit Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request e response
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: testData.users.admin // USAR FIXTURE
    };


    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getDashboardStats', () => {
    it('deve retornar estatísticas do dashboard com sucesso', async () => {
      // Usar dados das fixtures
      db.query
        .mockResolvedValueOnce(createQueryResult(testData.dashboardStats.usersStats))
        .mockResolvedValueOnce(createQueryResult([testData.dashboardStats.dialysisStats]))
        .mockResolvedValueOnce(createQueryResult(testData.dashboardStats.monthlyRecords))
        .mockResolvedValueOnce(createQueryResult([testData.dashboardStats.recentAlerts]))
        .mockResolvedValueOnce(createQueryResult([]));

      await adminController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalUsers: 62,
          activeUsers: 56,
          totalPatients: 50,
          totalDoctors: 10
        })
      );
    });
  });

  describe('createUser', () => {
    it('deve criar um novo usuário com dados das fixtures', async () => {
      const newUser = createMockUser({
        nome: 'Novo Usuario',
        email: 'novo@test.com'
      });

      mockReq.body = {
        ...newUser,
        senha: 'Senha123!'
      };

      bcrypt.hash.mockResolvedValue('hashed_password');
      
      db.query
        .mockResolvedValueOnce(createQueryResult([])) // Email não existe
        .mockResolvedValueOnce(createQueryResult([newUser])) // Insert usuario
        .mockResolvedValueOnce(createQueryResult([])) // Insert paciente
        .mockResolvedValueOnce(createQueryResult([])); // Log auditoria

      await adminController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Usuário criado com sucesso',
        user: expect.objectContaining({ nome: 'Novo Usuario' })
      });
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
        .mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Novo Paciente', email: 'novo@test.com', tipo_usuario: 'paciente' }] }) // Insert usuario
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

    it('deve retornar erro 400 se email já existe', async () => {
      // Arrange
      mockReq.body = {
        nome: 'Teste',
        email: 'existente@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'paciente'
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Email existe

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
  });

  describe('updateUser', () => {
    it('deve atualizar usuário com sucesso', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { nome: 'Nome Atualizado', ativo: true };

      const currentUser = { rows: [{ id: 1, nome: 'Nome Antigo', tipo_usuario: 'paciente' }] };
      const updatedUser = { rows: [{ id: 1, nome: 'Nome Atualizado', tipo_usuario: 'paciente' }] };

      db.query
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(updatedUser)
        .mockResolvedValueOnce({ rows: [] }); // Log auditoria

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
  });

  describe('assignDoctorToPatient', () => {
    it('deve vincular médico ao paciente', async () => {
      // Arrange
      mockReq.body = { paciente_id: 1, medico_id: 2 };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Update paciente
        .mockResolvedValueOnce({ rows: [] }); // Log auditoria

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
  });
});