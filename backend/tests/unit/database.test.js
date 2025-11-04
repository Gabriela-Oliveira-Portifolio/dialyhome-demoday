// Mock do pg antes de importar
const mockPoolQuery = jest.fn();
const mockPoolEnd = jest.fn();
const mockPoolOn = jest.fn();

jest.mock('pg', () => {
  return {
    Pool: jest.fn(() => ({
      query: mockPoolQuery,
      end: mockPoolEnd,
      on: mockPoolOn
    }))
  };
});

const db = require('../../src/config/database');

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

      mockPoolQuery.mockResolvedValue(mockResult);

      const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [1]);

      expect(mockPoolQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE id = $1', [1]);
      expect(result).toEqual(mockResult);
    });

    it('deve propagar erros de query', async () => {
      const mockError = new Error('Connection failed');
      mockPoolQuery.mockRejectedValue(mockError);

      await expect(
        db.query('SELECT * FROM usuarios', [])
      ).rejects.toThrow('Connection failed');
    });

    it('deve aceitar queries sem parâmetros', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      mockPoolQuery.mockResolvedValue(mockResult);

      await db.query('SELECT NOW()');

      expect(mockPoolQuery).toHaveBeenCalledWith('SELECT NOW()', undefined);
    });
  });

  describe('Connection Handling', () => {
    it('deve lidar com múltiplas queries simultâneas', async () => {
      const mockResult1 = { rows: [{ id: 1 }], rowCount: 1 };
      const mockResult2 = { rows: [{ id: 2 }], rowCount: 1 };

      mockPoolQuery
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);

      const [result1, result2] = await Promise.all([
        db.query('SELECT * FROM usuarios WHERE id = $1', [1]),
        db.query('SELECT * FROM usuarios WHERE id = $1', [2])
      ]);

      expect(result1.rows[0].id).toBe(1);
      expect(result2.rows[0].id).toBe(2);
      expect(mockPoolQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Scenarios', () => {
    it('deve lidar com timeout de conexão', async () => {
      const timeoutError = new Error('timeout exceeded');
      timeoutError.code = 'ETIMEDOUT';
      
      mockPoolQuery.mockRejectedValue(timeoutError);

      await expect(
        db.query('SELECT * FROM usuarios')
      ).rejects.toThrow('timeout exceeded');
    });

    it('deve lidar com erro de sintaxe SQL', async () => {
      const syntaxError = new Error('syntax error at or near "SELEC"');
      syntaxError.code = '42601';
      
      mockPoolQuery.mockRejectedValue(syntaxError);

      await expect(
        db.query('SELEC * FROM usuarios')
      ).rejects.toThrow('syntax error');
    });

    it('deve lidar com erro de tabela não encontrada', async () => {
      const tableError = new Error('relation "usuarios_inexistente" does not exist');
      tableError.code = '42P01';
      
      mockPoolQuery.mockRejectedValue(tableError);

      await expect(
        db.query('SELECT * FROM usuarios_inexistente')
      ).rejects.toThrow('does not exist');
    });

    it('deve lidar com erro de violação de constraint', async () => {
      const constraintError = new Error('duplicate key value violates unique constraint');
      constraintError.code = '23505';
      
      mockPoolQuery.mockRejectedValue(constraintError);

      await expect(
        db.query('INSERT INTO usuarios (email) VALUES ($1)', ['duplicate@test.com'])
      ).rejects.toThrow('duplicate key value');
    });
  });

  describe('Transaction Support', () => {
    it('deve permitir início de transação', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await db.query('BEGIN');

      expect(mockPoolQuery).toHaveBeenCalledWith('BEGIN', undefined);
    });

    it('deve permitir commit de transação', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await db.query('COMMIT');

      expect(mockPoolQuery).toHaveBeenCalledWith('COMMIT', undefined);
    });

    it('deve permitir rollback de transação', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await db.query('ROLLBACK');

      expect(mockPoolQuery).toHaveBeenCalledWith('ROLLBACK', undefined);
    });
  });
});