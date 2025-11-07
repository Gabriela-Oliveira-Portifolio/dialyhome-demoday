// tests/integration/userController.integration.test.js

jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, nome: 'Usuário Teste', tipo_usuario: 'paciente' };
    next();
  },
  authorizeRole: (roles) => (req, res, next) => {
    if (roles.includes('admin')) {
      req.user.tipo_usuario = 'admin';
    }
    next();
  }
}));

const db = require('../../src/config/database');
const request = require('supertest');
const app = require('../../server');

describe('User Routes - Testes de Integração', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/getProfile', () => {
    it('deve retornar perfil do usuário autenticado', async () => {
      db.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            nome: 'João', 
            email: 'joao@email.com',
            tipo_usuario: 'paciente' 
          }] 
        })
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            cpf: '12345678900', 
            telefone: '11999999999' 
          }] 
        });

      const res = await request(app).get('/api/users/getProfile');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('nome', 'João');
      expect(res.body).toHaveProperty('cpf', '12345678900');
    });

    it('deve retornar 404 se usuário não existir', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/users/getProfile');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Usuário não encontrado');
    });
  });

  describe('PUT /api/users/updateProfile', () => {
    it('deve atualizar perfil com sucesso', async () => {
      db.query
        .mockResolvedValueOnce({}) // UPDATE usuarios
        .mockResolvedValueOnce({}) // UPDATE pacientes
        .mockResolvedValueOnce({ 
          rows: [{
            id: 1,
            nome: 'João Atualizado',
            email: 'joao.novo@email.com',
            cpf: '12345678900',
            telefone: '11988888888'
          }]
        });

      const res = await request(app)
        .put('/api/users/updateProfile')
        .send({
          nome: 'João Atualizado',
          email: 'joao.novo@email.com',
          telefone: '11988888888'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Perfil atualizado com sucesso');
      expect(res.body.user.nome).toBe('João Atualizado');
    });

    it('deve atualizar apenas telefone', async () => {
      db.query
        .mockResolvedValueOnce({}) // UPDATE pacientes
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, nome: 'João', telefone: '11977777777' }]
        });

      const res = await request(app)
        .put('/api/users/updateProfile')
        .send({ telefone: '11977777777' });

      expect(res.status).toBe(200);
      expect(res.body.user.telefone).toBe('11977777777');
    });
  });

  describe('PUT /api/users/changePassword', () => {
    it('deve alterar senha com sucesso', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      bcrypt.hash = jest.fn().mockResolvedValue('novaSenhaHash');

      db.query
        .mockResolvedValueOnce({ 
          rows: [{ senha_hash: 'senhaAntigaHash' }] 
        })
        .mockResolvedValueOnce({});

      const res = await request(app)
        .put('/api/users/changePassword')
        .send({
          currentPassword: 'senhaAntiga123',
          newPassword: 'novaSenha123'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Senha alterada com sucesso');
    });

    it('deve retornar 400 se senha atual estiver incorreta', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      db.query.mockResolvedValueOnce({ 
        rows: [{ senha_hash: 'senhaHash' }] 
      });

      const res = await request(app)
        .put('/api/users/changePassword')
        .send({
          currentPassword: 'senhaErrada',
          newPassword: 'novaSenha123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Senha atual incorreta');
    });

    it('deve retornar 400 se nova senha for muito curta', async () => {
      const res = await request(app)
        .put('/api/users/changePassword')
        .send({
          currentPassword: 'senhaAntiga123',
          newPassword: '12345'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A nova senha deve ter no mínimo 6 caracteres');
    });
  });

  describe('GET /api/users/:id (Admin)', () => {
    it('deve retornar usuário por ID', async () => {
      db.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 2, 
          nome: 'Maria', 
          email: 'maria@email.com' 
        }] 
      });

      const res = await request(app).get('/api/users/2');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 2);
      expect(res.body).toHaveProperty('nome', 'Maria');
    });

    it('deve retornar 404 se usuário não existir', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/users/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Usuário não encontrado');
    });
  });

  describe('PUT /api/users/:id/toggle-status (Admin)', () => {
    it('deve desativar usuário ativo', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ ativo: true }] })
        .mockResolvedValueOnce({});

      const res = await request(app).put('/api/users/2/toggle-status');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Usuário desativado com sucesso');
      expect(res.body.ativo).toBe(false);
    });

    it('deve ativar usuário inativo', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ ativo: false }] })
        .mockResolvedValueOnce({});

      const res = await request(app).put('/api/users/2/toggle-status');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Usuário ativado com sucesso');
      expect(res.body.ativo).toBe(true);
    });

    it('deve retornar 400 se ID for inválido', async () => {
      const res = await request(app).put('/api/users/abc/toggle-status');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ID inválido');
    });
  });

  describe('DELETE /api/users/:id (Admin)', () => {
    it('deve realizar soft delete e anonimizar dados', async () => {
      db.query.mockResolvedValueOnce({});

      const res = await request(app).delete('/api/users/2');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Usuário removido e dados anonimizados com sucesso');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE usuarios'),
        ['2']
      );
    });

    it('deve retornar 500 em caso de erro', async () => {
      db.query.mockRejectedValueOnce(new Error('Erro no banco'));

      const res = await request(app).delete('/api/users/2');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Erro ao deletar usuário');
    });
  });
});