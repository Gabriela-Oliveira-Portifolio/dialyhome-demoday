const { validationResult } = require('express-validator');

// --- CORREÇÃO: Define o mock explicitamente para garantir que seja mockável ---
const mockValidationResult = jest.fn();

// Mock da função validationResult para simular erros ou sucesso na validação
jest.mock('express-validator', () => ({
  // Usamos o mock explicitamente definido
  validationResult: mockValidationResult,
  // Mockamos as funções de validação básicas que são usadas para construir os middlewares
  body: jest.fn(() => ({
    isLength: jest.fn(() => ({ withMessage: jest.fn(() => {}) })),
    isEmail: jest.fn(() => ({ withMessage: jest.fn(() => {}) })),
    notEmpty: jest.fn(() => ({ withMessage: jest.fn(() => {}) })),
    isIn: jest.fn(() => ({ withMessage: jest.fn(() => {}) })),
    isDate: jest.fn(() => ({ withMessage: jest.fn(() => {}) })),
    matches: jest.fn(() => ({ withMessage: jest.fn(() => {}) })),
    optional: jest.fn(() => ({ 
        isInt: jest.fn(() => ({ withMessage: jest.fn(() => {}) })), 
        isFloat: jest.fn(() => ({ withMessage: jest.fn(() => {}) })), 
        notEmpty: jest.fn(() => ({ withMessage: jest.fn(() => {}) })) 
    })),
    isInt: jest.fn(() => ({ withMessage: jest.fn(() => {}) })),
    isFloat: jest.fn(() => ({ withMessage: jest.fn(() => {}) })),
  })),
}));
// --- Fim do bloco de Mock ---


const {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateDialysisRecord,
  validateMedication,
} = require('../../src/middleware/validation');


// Mock dos objetos req, res e next
const mockReq = (errors = []) => ({
  // Simula a requisição com os erros de validação
  __expressValidatorErrors: errors,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// Dados de erro mockados
const mockErrors = [{
  type: 'field',
  msg: 'Email inválido',
  path: 'email',
  location: 'body'
}];

describe('Validation Middleware', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // CORREÇÃO: Usa o mock explícito para definir o valor de retorno padrão
    mockValidationResult.mockReturnValue({ 
      isEmpty: () => true,
      array: () => [],
    });
  });

  // =========================================================
  // handleValidationErrors
  // =========================================================
  describe('handleValidationErrors', () => {
    test('Deve chamar next() se não houver erros de validação', () => {
      const req = mockReq();
      const res = mockRes();

      handleValidationErrors(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('Deve retornar 400 e JSON de erro se houver erros de validação', () => {
      const res = mockRes();
      
      // CORREÇÃO: Usa o mock explícito para simular erros de validação
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      const req = mockReq();

      handleValidationErrors(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Dados inválidos',
        details: mockErrors
      });
    });
  });

  // =========================================================
  // Testes de Estrutura de Validação (Simplesmente checa o encadeamento)
  // =========================================================

  test('validateRegister deve ser um array de middlewares terminando com handleValidationErrors', () => {
    expect(Array.isArray(validateRegister)).toBe(true);
    // Deve ter 4 validadores e 1 handler
    expect(validateRegister.length).toBe(5);
    expect(validateRegister[validateRegister.length - 1]).toBe(handleValidationErrors);
  });

  test('validateLogin deve ser um array de middlewares terminando com handleValidationErrors', () => {
    expect(Array.isArray(validateLogin)).toBe(true);
    // Deve ter 2 validadores e 1 handler
    expect(validateLogin.length).toBe(3);
    expect(validateLogin[validateLogin.length - 1]).toBe(handleValidationErrors);
  });

  test('validateDialysisRecord deve ser um array de middlewares terminando com handleValidationErrors', () => {
    expect(Array.isArray(validateDialysisRecord)).toBe(true);
    // Deve ter 7 validadores (com optional) e 1 handler
    expect(validateDialysisRecord.length).toBe(8);
    expect(validateDialysisRecord[validateDialysisRecord.length - 1]).toBe(handleValidationErrors);
  });

  test('validateMedication deve ser um array de middlewares terminando com handleValidationErrors', () => {
    expect(Array.isArray(validateMedication)).toBe(true);
    // Deve ter 4 validadores e 1 handler
    expect(validateMedication.length).toBe(5);
    expect(validateMedication[validateMedication.length - 1]).toBe(handleValidationErrors);
  });

});