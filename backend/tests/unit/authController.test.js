process.env.NODE_ENV = 'test';

const mockCreateUser = jest.fn();
const mockAuthenticateUser = jest.fn();
const mockGenerateToken = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockLogoutUser = jest.fn();
const mockVerifyToken = jest.fn();

jest.mock('../../src/services/authService', () => ({
  createUser: mockCreateUser,
  authenticateUser: mockAuthenticateUser,
  generateToken: mockGenerateToken,
  refreshAccessToken: mockRefreshAccessToken,
  logoutUser: mockLogoutUser,
  verifyToken: mockVerifyToken
}));

const mockQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
  query: mockQuery
}));

const authController = require('../../src/controllers/authController');

describe('AuthController - Unit Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      headers: {},
      user: {}
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const userData = {
        nome: 'João Silva',
        email: 'joao@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'paciente'
      };

      const mockUser = {
        id: 1,
        nome: 'João Silva',
        email: 'joao@test.com',
        tipo_usuario: 'paciente'
      };

      mockReq.body = userData;
      mockCreateUser.mockResolvedValue(mockUser);

      await authController.register(mockReq, mockRes);

      expect(mockCreateUser).toHaveBeenCalledWith(userData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Usuário criado com sucesso',
        user: mockUser
      });
    });

    it('deve retornar erro 400 se falhar ao criar usuário', async () => {
      mockReq.body = {
        nome: 'Teste',
        email: 'teste@test.com',
        senha: 'senha'
      };

      mockCreateUser.mockRejectedValue(new Error('Email já está em uso'));

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Email já está em uso'
      });
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const mockUser = {
        id: 1,
        nome: 'João Silva',
        email: 'joao@test.com',
        tipo_usuario: 'paciente'
      };

      mockReq.body = {
        email: 'joao@test.com',
        senha: 'Senha123!'
      };

      mockAuthenticateUser.mockResolvedValue(mockUser);
      mockGenerateToken
        .mockReturnValueOnce('access_token_123')
        .mockReturnValueOnce('refresh_token_456');

      await authController.login(mockReq, mockRes);

      expect(mockAuthenticateUser).toHaveBeenCalledWith('joao@test.com', 'Senha123!');
      expect(mockGenerateToken).toHaveBeenCalledWith(1, 'paciente', 'access');
      expect(mockGenerateToken).toHaveBeenCalledWith(1, 'paciente', 'refresh');
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        user: mockUser
      });
    });

    it('deve retornar erro 401 se credenciais inválidas', async () => {
      mockReq.body = {
        email: 'joao@test.com',
        senha: 'senhaerrada'
      };

      mockAuthenticateUser.mockRejectedValue(new Error('Credenciais inválidas'));

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Credenciais inválidas'
      });
    });
  });

  describe('logout', () => {
    it('deve fazer logout com sucesso', async () => {
      mockReq.headers.authorization = 'Bearer valid_token_123';
      mockReq.user = { id: 1 };

      // Mock do token decodificado - PRECISA RETORNAR ANTES
      const mockDecodedToken = {
        userId: 1,
        tipo_usuario: 'paciente',
        exp: Math.floor(Date.now() / 1000) + 3600 // expira em 1 hora
      };

      // IMPORTANTE: verifyToken é chamado ANTES de logoutUser no código
      mockVerifyToken.mockReturnValue(mockDecodedToken);
      mockLogoutUser.mockReturnValue(true);
      mockQuery.mockResolvedValue({ rows: [] });

      await authController.logout(mockReq, mockRes);

      // Verificar ordem das chamadas
      expect(mockVerifyToken).toHaveBeenCalledWith('valid_token_123');
      expect(mockLogoutUser).toHaveBeenCalledWith('valid_token_123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tokens_invalidados'),
        expect.arrayContaining([
          'valid_token_123',
          1,
          expect.any(Date)
        ])
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Logout realizado com sucesso'
      });
    });

    it('deve retornar erro 400 se token não fornecido', async () => {
      mockReq.headers.authorization = undefined;

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token não fornecido'
      });
    });

    it('deve retornar erro 400 se token inválido', async () => {
      mockReq.headers.authorization = 'Bearer invalid_token';
      mockReq.user = { id: 1 };

      // verifyToken lança erro para token inválido
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Token inválido');
      });

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token inválido'
      });
    });

    it('deve retornar erro 400 se logout falhar', async () => {
      mockReq.headers.authorization = 'Bearer valid_token_123';
      mockReq.user = { id: 1 };

      const mockDecodedToken = {
        userId: 1,
        tipo_usuario: 'paciente',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockVerifyToken.mockReturnValue(mockDecodedToken);
      
      // logoutUser lança erro para token já na blacklist
      mockLogoutUser.mockImplementation(() => {
        throw new Error('Token já foi invalidado');
      });

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token já foi invalidado'
      });
    });
  });

  describe('refreshToken', () => {
    it('deve renovar tokens com sucesso', async () => {
      mockReq.body = {
        refreshToken: 'valid_refresh_token'
      };

      const newTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token'
      };

      mockRefreshAccessToken.mockResolvedValue(newTokens);

      await authController.refreshToken(mockReq, mockRes);

      expect(mockRefreshAccessToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(mockRes.json).toHaveBeenCalledWith(newTokens);
    });

    it('deve retornar erro 400 se refresh token não fornecido', async () => {
      mockReq.body = {};

      await authController.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Refresh token não fornecido'
      });
    });

    it('deve retornar erro 401 se refresh token inválido', async () => {
      mockReq.body = {
        refreshToken: 'invalid_token'
      };

      mockRefreshAccessToken.mockRejectedValue(
        new Error('Refresh token inválido ou expirado')
      );

      await authController.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Refresh token inválido ou expirado'
      });
    });
  });
});

// process.env.NODE_ENV = 'test';

// const mockCreateUser = jest.fn();
// const mockAuthenticateUser = jest.fn();
// const mockGenerateToken = jest.fn();
// const mockRefreshAccessToken = jest.fn();
// const mockLogoutUser = jest.fn();
// const mockVerifyToken = jest.fn(); // ADICIONAR

// jest.mock('../../src/services/authService', () => ({
//   createUser: mockCreateUser,
//   authenticateUser: mockAuthenticateUser,
//   generateToken: mockGenerateToken,
//   refreshAccessToken: mockRefreshAccessToken,
//   logoutUser: mockLogoutUser,
//   verifyToken: mockVerifyToken // ADICIONAR
// }));

// const mockQuery = jest.fn();
// jest.mock('../../src/config/database', () => ({
//   query: mockQuery
// }));

// const authController = require('../../src/controllers/authController');

// describe('AuthController - Unit Tests', () => {
//   let mockReq, mockRes;

//   beforeEach(() => {
//     jest.clearAllMocks();

//     mockReq = {
//       body: {},
//       headers: {},
//       user: {}
//     };

//     mockRes = {
//       json: jest.fn().mockReturnThis(),
//       status: jest.fn().mockReturnThis()
//     };
//   });

//   describe('register', () => {
//     it('deve registrar um novo usuário com sucesso', async () => {
//       const userData = {
//         nome: 'João Silva',
//         email: 'joao@test.com',
//         senha: 'Senha123!',
//         tipo_usuario: 'paciente'
//       };

//       const mockUser = {
//         id: 1,
//         nome: 'João Silva',
//         email: 'joao@test.com',
//         tipo_usuario: 'paciente'
//       };

//       mockReq.body = userData;
//       mockCreateUser.mockResolvedValue(mockUser);

//       await authController.register(mockReq, mockRes);

//       expect(mockCreateUser).toHaveBeenCalledWith(userData);
//       expect(mockRes.status).toHaveBeenCalledWith(201);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         message: 'Usuário criado com sucesso',
//         user: mockUser
//       });
//     });

//     it('deve retornar erro 400 se falhar ao criar usuário', async () => {
//       mockReq.body = {
//         nome: 'Teste',
//         email: 'teste@test.com',
//         senha: 'senha'
//       };

//       mockCreateUser.mockRejectedValue(new Error('Email já está em uso'));

//       await authController.register(mockReq, mockRes);

//       expect(mockRes.status).toHaveBeenCalledWith(400);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         error: 'Email já está em uso'
//       });
//     });
//   });

//   describe('login', () => {
//     it('deve fazer login com sucesso', async () => {
//       const mockUser = {
//         id: 1,
//         nome: 'João Silva',
//         email: 'joao@test.com',
//         tipo_usuario: 'paciente'
//       };

//       mockReq.body = {
//         email: 'joao@test.com',
//         senha: 'Senha123!'
//       };

//       mockAuthenticateUser.mockResolvedValue(mockUser);
//       mockGenerateToken
//         .mockReturnValueOnce('access_token_123')
//         .mockReturnValueOnce('refresh_token_456');

//       await authController.login(mockReq, mockRes);

//       expect(mockAuthenticateUser).toHaveBeenCalledWith('joao@test.com', 'Senha123!');
//       expect(mockGenerateToken).toHaveBeenCalledWith(1, 'paciente', 'access');
//       expect(mockGenerateToken).toHaveBeenCalledWith(1, 'paciente', 'refresh');
//       expect(mockRes.json).toHaveBeenCalledWith({
//         accessToken: 'access_token_123',
//         refreshToken: 'refresh_token_456',
//         user: mockUser
//       });
//     });

//     it('deve retornar erro 401 se credenciais inválidas', async () => {
//       mockReq.body = {
//         email: 'joao@test.com',
//         senha: 'senhaerrada'
//       };

//       mockAuthenticateUser.mockRejectedValue(new Error('Credenciais inválidas'));

//       await authController.login(mockReq, mockRes);

//       expect(mockRes.status).toHaveBeenCalledWith(401);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         error: 'Credenciais inválidas'
//       });
//     });
//   });

//   describe('logout', () => {
//     it('deve fazer logout com sucesso', async () => {
//       mockReq.headers.authorization = 'Bearer valid_token_123';
//       mockReq.user = { id: 1 };

//       // Mock do token decodificado
//       const mockDecodedToken = {
//         userId: 1,
//         tipo_usuario: 'paciente',
//         exp: Math.floor(Date.now() / 1000) + 3600 // expira em 1 hora
//       };

//       mockVerifyToken.mockReturnValue(mockDecodedToken);
//       mockLogoutUser.mockReturnValue(true);
//       mockQuery.mockResolvedValue({ rows: [] });

//       await authController.logout(mockReq, mockRes);

//       expect(mockVerifyToken).toHaveBeenCalledWith('valid_token_123');
//       expect(mockLogoutUser).toHaveBeenCalledWith('valid_token_123');
//       expect(mockQuery).toHaveBeenCalledWith(
//         expect.stringContaining('INSERT INTO tokens_invalidados'),
//         expect.arrayContaining([
//           'valid_token_123',
//           1,
//           expect.any(Date)
//         ])
//       );
//       expect(mockRes.json).toHaveBeenCalledWith({
//         message: 'Logout realizado com sucesso'
//       });
//     });

//     it('deve retornar erro 400 se token não fornecido', async () => {
//       mockReq.headers.authorization = undefined;

//       await authController.logout(mockReq, mockRes);

//       expect(mockRes.status).toHaveBeenCalledWith(400);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         error: 'Token não fornecido'
//       });
//     });

//     it('deve retornar erro 400 se logout falhar', async () => {
//       mockReq.headers.authorization = 'Bearer valid_token_123';
//       mockReq.user = { id: 1 };

//       mockVerifyToken.mockImplementation(() => {
//         throw new Error('Token inválido');
//       });

//       await authController.logout(mockReq, mockRes);

//       expect(mockRes.status).toHaveBeenCalledWith(400);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         error: 'Token inválido'
//       });
//     });
//   });

//   describe('refreshToken', () => {
//     it('deve renovar tokens com sucesso', async () => {
//       mockReq.body = {
//         refreshToken: 'valid_refresh_token'
//       };

//       const newTokens = {
//         accessToken: 'new_access_token',
//         refreshToken: 'new_refresh_token'
//       };

//       mockRefreshAccessToken.mockResolvedValue(newTokens);

//       await authController.refreshToken(mockReq, mockRes);

//       expect(mockRefreshAccessToken).toHaveBeenCalledWith('valid_refresh_token');
//       expect(mockRes.json).toHaveBeenCalledWith(newTokens);
//     });

//     it('deve retornar erro 400 se refresh token não fornecido', async () => {
//       mockReq.body = {};

//       await authController.refreshToken(mockReq, mockRes);

//       expect(mockRes.status).toHaveBeenCalledWith(400);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         error: 'Refresh token não fornecido'
//       });
//     });

//     it('deve retornar erro 401 se refresh token inválido', async () => {
//       mockReq.body = {
//         refreshToken: 'invalid_token'
//       };

//       mockRefreshAccessToken.mockRejectedValue(
//         new Error('Refresh token inválido ou expirado')
//       );

//       await authController.refreshToken(mockReq, mockRes);

//       expect(mockRes.status).toHaveBeenCalledWith(401);
//       expect(mockRes.json).toHaveBeenCalledWith({
//         error: 'Refresh token inválido ou expirado'
//       });
//     });
//   });
// });