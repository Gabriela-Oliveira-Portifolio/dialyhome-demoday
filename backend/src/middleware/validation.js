const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }
  next();
};

const validateRegister = [
  body('nome').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('tipo_usuario').isIn(['paciente', 'medico']).withMessage('Tipo de usuário inválido'),
  handleValidationErrors
];

const validateLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').notEmpty().withMessage('Senha é obrigatória'),
  handleValidationErrors
];

const validateDialysisRecord = [
  body('data_registro').isDate().withMessage('Data inválida'),
  body('horario_inicio').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário de início inválido'),
  body('pressao_arterial_sistolica').optional().isInt({ min: 60, max: 250 }).withMessage('Pressão sistólica inválida'),
  body('pressao_arterial_diastolica').optional().isInt({ min: 40, max: 150 }).withMessage('Pressão diastólica inválida'),
  body('peso_pre_dialise').optional().isFloat({ min: 20, max: 300 }).withMessage('Peso pré-diálise inválido'),
  body('peso_pos_dialise').optional().isFloat({ min: 20, max: 300 }).withMessage('Peso pós-diálise inválido'),
  body('uf_total').optional().isInt({ min: 0, max: 5000 }).withMessage('UF total inválida'),
  handleValidationErrors
];

const validateMedication = [
  body('nome').isLength({ min: 2 }).withMessage('Nome do medicamento deve ter pelo menos 2 caracteres'),
  body('dosagem').notEmpty().withMessage('Dosagem é obrigatória'),
  body('frequencia').notEmpty().withMessage('Frequência é obrigatória'),
  body('horario_principal').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário principal inválido'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateDialysisRecord,
  validateMedication,
  handleValidationErrors
};