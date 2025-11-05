// Mock ANTES de importar
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.BCRYPT_SALT_ROUNDS = '10';

const mockQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  pool: {
    query: mockQuery,
    end: jest.fn()
  }
}));

const mockHash = jest.fn();
const mockCompare = jest.fn();
jest.mock('bcryptjs', () => ({
  hash: mockHash,
  compare: mockCompare
}));

const authService = require('../../src/services/authService');
const jwt = require('jsonwebtoken');

describe('AuthService - Unit Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockHash.mockReset();
    mockCompare.mockReset();
  });

  describe('createUser', () => {
    it('deve criar um paciente com sucesso', async () => {
      const userData = {
        nome: 'João Silva',
        email: 'joao@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'paciente',
        cpf: '12345678900',
        data_nascimento: '1990-01-01',
        telefone: '(47) 99999-9999',
        endereco: 'Rua Teste, 123',
        peso_inicial: 75.5,
        altura: 1.75
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Email não existe
        .mockResolvedValueOnce({ // Insert usuario
          rows: [{
            id: 1,
            nome: 'João Silva',
            email: 'joao@test.com',
            tipo_usuario: 'paciente'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Insert paciente

      mockHash.mockResolvedValue('hashed_password');

      const result = await authService.createUser(userData);

      expect(result).toHaveProperty('id');
      expect(result.nome).toBe('João Silva');
      expect(result.email).toBe('joao@test.com');
      expect(mockHash).toHaveBeenCalledWith('Senha123!', 10);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('deve criar um médico com sucesso', async () => {
      const userData = {
        nome: 'Dr. Silva',
        email: 'dr.silva@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'medico',
        crm: '12345-SC',
        especialidade: 'Nefrologia',
        local_atendimento: 'Hospital ABC',
        telefone_contato: '(47) 98888-8888'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            nome: 'Dr. Silva',
            email: 'dr.silva@test.com',
            tipo_usuario: 'medico'
          }]
        })
        .mockResolvedValueOnce({ rows: [] });

      mockHash.mockResolvedValue('hashed_password');

      const result = await authService.createUser(userData);

      expect(result.tipo_usuario).toBe('medico');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO medicos'),
        expect.any(Array)
      );
    });

    it('deve retornar erro se email já existe', async () => {
      const userData = {
        nome: 'Teste',
        email: 'existente@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'paciente'
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Email existe

      await expect(authService.createUser(userData))
        .rejects
        .toThrow('O email existente@test.com já está em uso');
    });

    it('deve retornar erro se falhar ao criar usuário', async () => {
      const userData = {
        nome: 'Teste',
        email: 'test@test.com',
        senha: 'Senha123!',
        tipo_usuario: 'paciente'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(authService.createUser(userData))
        .rejects
        .toThrow('Falha ao criar usuário');
    });
  });

  describe('authenticateUser', () => {
    it('deve autenticar usuário com credenciais válidas', async () => {
      const mockUser = {
        id: 1,
        nome: 'João Silva',
        email: 'joao@test.com',
        senha_hash: 'hashed_password',
        tipo_usuario: 'paciente'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      mockCompare.mockResolvedValue(true);

      const result = await authService.authenticateUser('joao@test.com', 'Senha123!');

      expect(result).toEqual(mockUser);
      expect(mockCompare).toHaveBeenCalledWith('Senha123!', 'hashed_password');
    });

    it('deve retornar erro se usuário não existe', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.authenticateUser('naoexiste@test.com', 'senha')
      ).rejects.toThrow('Credenciais inválidas');
    });

    it('deve retornar erro se senha está incorreta', async () => {
      const mockUser = {
        id: 1,
        email: 'joao@test.com',
        senha_hash: 'hashed_password'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      mockCompare.mockResolvedValue(false);

      await expect(
        authService.authenticateUser('joao@test.com', 'senhaerrada')
      ).rejects.toThrow('Credenciais inválidas');
    });
  });

  describe('generateToken', () => {
    it('deve gerar access token', () => {
      const token = authService.generateToken(1, 'paciente', 'access');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(1);
      expect(decoded.tipo_usuario).toBe('paciente');
      expect(decoded.type).toBe('access');
    });

    it('deve gerar refresh token', () => {
      const token = authService.generateToken(1, 'medico', 'refresh');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('verifyToken', () => {
    it('deve verificar token válido', () => {
      const token = jwt.sign(
        { userId: 1, tipo_usuario: 'paciente' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const decoded = authService.verifyToken(token);

      expect(decoded.userId).toBe(1);
      expect(decoded.tipo_usuario).toBe('paciente');
    });

    it('deve rejeitar token inválido', () => {
      expect(() => {
        authService.verifyToken('token_invalido');
      }).toThrow();
    });

    it('deve rejeitar token expirado', () => {
      const token = jwt.sign(
        { userId: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Aguardar 1 segundo para token expirar
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => {
            authService.verifyToken(token);
          }).toThrow();
          resolve();
        }, 1000);
      });
    });
  });

  describe('refreshAccessToken', () => {
    it('deve gerar novos tokens com refresh token válido', async () => {
      const refreshToken = jwt.sign(
        { userId: 1, tipo_usuario: 'paciente', type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          tipo_usuario: 'paciente'
        }]
      });

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('deve rejeitar se não for refresh token', async () => {
      const accessToken = jwt.sign(
        { userId: 1, tipo_usuario: 'paciente', type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      await expect(
        authService.refreshAccessToken(accessToken)
      ).rejects.toThrow('Refresh token inválido ou expirado');
    });

    it('deve rejeitar se usuário não existe', async () => {
      const refreshToken = jwt.sign(
        { userId: 999, tipo_usuario: 'paciente', type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.refreshAccessToken(refreshToken)
      ).rejects.toThrow('Refresh token inválido ou expirado');
    });

    it('deve rejeitar token inválido', async () => {
      await expect(
        authService.refreshAccessToken('token_invalido')
      ).rejects.toThrow('Refresh token inválido ou expirado');
    });
  });

  describe('logoutUser', () => {
    it('deve adicionar token à blacklist', () => {
      const token = 'valid_token';

      const result = authService.logoutUser(token);

      expect(result).toBe(true);
    });

    it('deve rejeitar token já invalidado', () => {
      const token = 'already_blacklisted_token';

      authService.logoutUser(token);

      expect(() => {
        authService.logoutUser(token);
      }).toThrow('Token já foi invalidado');
    });
  });
});