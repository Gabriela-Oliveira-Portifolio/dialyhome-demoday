// tests/unit/userController.unit.test.js

// Mock do bcrypt ANTES de importar o controller
jest.mock('bcrypt');

// Mock do database como jest.fn()
const mockQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
  query: mockQuery
}));

const bcrypt = require('bcrypt');
const db = require('../../src/config/database');
const {
  getProfile,
  updateProfile,
  changePassword,
  getUserById,
  toggleUserStatus,
  deleteUser
} = require('../../src/controllers/userController');

describe('userController - Testes Unitários', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1, tipo_usuario: 'paciente' },
      body: {},
      params: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('deve retornar perfil de paciente com detalhes', async () => {
      mockQuery
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, nome: 'João', tipo: 'paciente', tipo_usuario: 'paciente' }] 
        })
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, cpf: '12345678900', telefone: '11999999999' }] 
        });

      await getProfile(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          nome: 'João',
          cpf: '12345678900'
        })
      );
    });

    it('deve retornar perfil de médico com detalhes', async () => {
      req.user.tipo_usuario = 'medico';
      mockQuery
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, nome: 'Dr. Silva', tipo: 'medico', tipo_usuario: 'medico' }] 
        })
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, crm: '123456', especialidade: 'Nefrologia' }] 
        });

      await getProfile(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Dr. Silva',
          crm: '123456'
        })
      );
    });

    it('deve retornar 404 se usuário não for encontrado', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' });
    });

    it('deve retornar 500 em caso de erro no banco', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Erro no banco'));

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar perfil' });
    });
  });

  describe('updateProfile', () => {
    it('deve atualizar perfil de paciente com sucesso', async () => {
      req.body = {
        nome: 'João Silva',
        email: 'joao@email.com',
        cpf: '12345678900',
        telefone: '11999999999',
        peso_inicial: 70.5,
        altura: 1.75
      };

      mockQuery
        .mockResolvedValueOnce({}) // UPDATE usuarios
        .mockResolvedValueOnce({}) // UPDATE pacientes
        .mockResolvedValueOnce({ 
          rows: [{
            id: 1,
            nome: 'João Silva',
            email: 'joao@email.com',
            cpf: '12345678900',
            telefone: '11999999999',
            peso_inicial: 70.5,
            altura: 1.75
          }]
        });

      await updateProfile(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Perfil atualizado com sucesso',
        user: expect.objectContaining({
          nome: 'João Silva',
          email: 'joao@email.com'
        })
      });
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      req.body = { telefone: '11988888888' };

      mockQuery
        .mockResolvedValueOnce({}) // UPDATE pacientes
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, nome: 'João', telefone: '11988888888' }]
        });

      await updateProfile(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pacientes'),
        expect.arrayContaining(['11988888888', 1])
      );
    });

    it('deve retornar 500 em caso de erro', async () => {
      req.body = { nome: 'Teste' };
      mockQuery.mockRejectedValueOnce(new Error('Erro no banco'));

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Erro ao atualizar perfil' })
      );
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      req.body = {
        currentPassword: 'senhaAntiga123',
        newPassword: 'novaSenha123'
      };
    });

    it('deve alterar senha com sucesso', async () => {
      mockQuery
        .mockResolvedValueOnce({ 
          rows: [{ senha_hash: 'hashedOldPassword' }] 
        })
        .mockResolvedValueOnce({});

      bcrypt.compare.mockResolvedValueOnce(true);
      bcrypt.hash.mockResolvedValueOnce('hashedNewPassword');

      await changePassword(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('senhaAntiga123', 'hashedOldPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('novaSenha123', 10);
      expect(res.json).toHaveBeenCalledWith({ message: 'Senha alterada com sucesso' });
    });

    it('deve retornar 400 se campos obrigatórios não forem enviados', async () => {
      req.body = { currentPassword: 'senha123' };

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Senha atual e nova senha são obrigatórias' 
      });
    });

    it('deve retornar 400 se nova senha for muito curta', async () => {
      req.body = { currentPassword: 'senha123', newPassword: '12345' };

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'A nova senha deve ter no mínimo 6 caracteres' 
      });
    });

    it('deve retornar 404 se usuário não for encontrado', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' });
    });

    it('deve retornar 400 se senha atual estiver incorreta', async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ senha_hash: 'hashedPassword' }] 
      });
      bcrypt.compare.mockResolvedValueOnce(false);

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Senha atual incorreta' });
    });

    it('deve retornar 500 em caso de erro', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Erro no banco'));

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao alterar senha' });
    });
  });

  describe('getUserById', () => {
    it('deve retornar usuário por ID', async () => {
      req.params.id = '1';
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1, nome: 'João', email: 'joao@email.com' }] 
      });

      await getUserById(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM usuarios WHERE id = $1',
        ['1']
      );
      expect(res.json).toHaveBeenCalledWith({ 
        id: 1, 
        nome: 'João', 
        email: 'joao@email.com' 
      });
    });

    it('deve retornar 404 se usuário não for encontrado', async () => {
      req.params.id = '999';
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' });
    });

    it('deve retornar 500 em caso de erro', async () => {
      req.params.id = '1';
      mockQuery.mockRejectedValueOnce(new Error('Erro no banco'));

      await getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('toggleUserStatus', () => {
    beforeEach(() => {
      req.user = { id: 1, tipo_usuario: 'admin' };
      req.params.id = '2';
    });

    it('deve ativar usuário inativo', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ativo: false }] })
        .mockResolvedValueOnce({});

      await toggleUserStatus(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE usuarios SET ativo = $1 WHERE id = $2',
        [true, 2]
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Usuário ativado com sucesso',
        ativo: true
      });
    });

    it('deve desativar usuário ativo', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ativo: true }] })
        .mockResolvedValueOnce({});

      await toggleUserStatus(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE usuarios SET ativo = $1 WHERE id = $2',
        [false, 2]
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Usuário desativado com sucesso',
        ativo: false
      });
    });

    it('deve retornar 401 se usuário não estiver autenticado', async () => {
      req.user = null;

      await toggleUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não autenticado' });
    });

    it('deve retornar 403 se usuário não for admin', async () => {
      req.user.tipo_usuario = 'paciente';

      await toggleUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
    });

    it('deve retornar 400 se ID for inválido', async () => {
      req.params.id = 'abc';

      await toggleUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID inválido' });
    });

    it('deve retornar 400 se admin tentar desativar própria conta', async () => {
      req.params.id = '1';

      await toggleUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Você não pode desativar sua própria conta' 
      });
    });

    it('deve retornar 404 se usuário não for encontrado', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await toggleUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' });
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      req.user = { id: 1, tipo_usuario: 'admin' };
      req.params.id = '2';
    });

    it('deve realizar soft delete e anonimizar dados', async () => {
      mockQuery.mockResolvedValueOnce({});

      await deleteUser(req, res);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE usuarios'),
        ['2']
      );
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Usuário removido e dados anonimizados com sucesso' 
      });
    });

    it('deve retornar 403 se usuário não for admin', async () => {
      req.user.tipo_usuario = 'paciente';

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
    });

    it('deve retornar 500 em caso de erro', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Erro no banco'));

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao deletar usuário' });
    });
  });
});