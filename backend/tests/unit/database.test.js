const db = require('../../src/config/database');

// Mock do pg
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Database Configuration - Unit Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pool Configuration', () => {
    it('deve criar uma instância do Pool', () => {
      expect(db.pool).toBeDefined();
      expect(typeof db.pool).toBe('object');
    });

    it('deve ter o método query disponível', () => {
      expect(db.query).toBeDefined();
      expect(typeof db.query).toBe('function');
    });

    it('deve ter o pool exportado', () => {
      expect(db.pool).toBeDefined();
    });
  });

  describe('Query Execution', () => {
    it('deve executar uma query com sucesso', async () => {
      const mockResult = {
        rows: [{ id: 1, nome: 'Test' }],
        rowCount: 1
      };

      db.pool.query.mockResolvedValue(mockResult);

      const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [1]);

      expect(db.pool.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE id = $1', [1]);
      expect(result).toEqual(mockResult);
    });

    it('deve propagar erros de query', async () => {
      const mockError = new Error('Connection failed');
      db.pool.query.mockRejectedValue(mockError);

      await expect(
        db.query('SELECT * FROM usuarios', [])
      ).rejects.toThrow('Connection failed');
    });

    it('deve aceitar queries sem parâmetros', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      db.pool.query.mockResolvedValue(mockResult);

      await db.query('SELECT NOW()');

      expect(db.pool.query).toHaveBeenCalledWith('SELECT NOW()', undefined);
    });
  });

  describe('Connection Handling', () => {
    it('deve lidar com múltiplas queries simultâneas', async () => {
      const mockResult1 = { rows: [{ id: 1 }], rowCount: 1 };
      const mockResult2 = { rows: [{ id: 2 }], rowCount: 1 };

      db.pool.query
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);

      const [result1, result2] = await Promise.all([
        db.query('SELECT * FROM usuarios WHERE id = $1', [1]),
        db.query('SELECT * FROM usuarios WHERE id = $1', [2])
      ]);

      expect(result1.rows[0].id).toBe(1);
      expect(result2.rows[0].id).toBe(2);
      expect(db.pool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Scenarios', () => {
    it('deve lidar com timeout de conexão', async () => {
      const timeoutError = new Error('timeout exceeded');
      timeoutError.code = 'ETIMEDOUT';
      
      db.pool.query.mockRejectedValue(timeoutError);

      await expect(
        db.query('SELECT * FROM usuarios')
      ).rejects.toThrow('timeout exceeded');
    });

    it('deve lidar com erro de sintaxe SQL', async () => {
      const syntaxError = new Error('syntax error at or near "SELEC"');
      syntaxError.code = '42601';
      
      db.pool.query.mockRejectedValue(syntaxError);

      await expect(
        db.query('SELEC * FROM usuarios')
      ).rejects.toThrow('syntax error');
    });

    it('deve lidar com erro de tabela não encontrada', async () => {
      const tableError = new Error('relation "usuarios_inexistente" does not exist');
      tableError.code = '42P01';
      
      db.pool.query.mockRejectedValue(tableError);

      await expect(
        db.query('SELECT * FROM usuarios_inexistente')
      ).rejects.toThrow('does not exist');
    });

    it('deve lidar com erro de violação de constraint', async () => {
      const constraintError = new Error('duplicate key value violates unique constraint');
      constraintError.code = '23505';
      
      db.pool.query.mockRejectedValue(constraintError);

      await expect(
        db.query('INSERT INTO usuarios (email) VALUES ($1)', ['duplicate@test.com'])
      ).rejects.toThrow('duplicate key value');
    });
  });

  describe('Transaction Support', () => {
    it('deve permitir início de transação', async () => {
      db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await db.query('BEGIN');

      expect(db.pool.query).toHaveBeenCalledWith('BEGIN', undefined);
    });

    it('deve permitir commit de transação', async () => {
      db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await db.query('COMMIT');

      expect(db.pool.query).toHaveBeenCalledWith('COMMIT', undefined);
    });

    it('deve permitir rollback de transação', async () => {
      db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await db.query('ROLLBACK');

      expect(db.pool.query).toHaveBeenCalledWith('ROLLBACK', undefined);
    });
  });
});