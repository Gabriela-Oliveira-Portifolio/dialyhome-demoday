const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const register = async (req, res) => {
  try {
    const { nome, email, senha, tipo_usuario, ...additionalData } = req.body;
    
    // Verificar se usuário já existe
    const existingUser = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Inserir usuário
    const userResult = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ($1, $2, $3, $4) RETURNING id',
      [nome, email, hashedPassword, tipo_usuario]
    );

    const userId = userResult.rows[0].id;

    // Inserir dados específicos baseado no tipo de usuário
    if (tipo_usuario === 'paciente') {
      await db.query(
        'INSERT INTO pacientes (usuario_id, cpf, data_nascimento, telefone, endereco, peso_inicial, altura) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, additionalData.cpf, additionalData.data_nascimento, additionalData.telefone, additionalData.endereco, additionalData.peso_inicial, additionalData.altura]
      );
    } else if (tipo_usuario === 'medico') {
      await db.query(
        'INSERT INTO medicos (usuario_id, crm, especialidade, local_atendimento, telefone_contato) VALUES ($1, $2, $3, $4, $5)',
        [userId, additionalData.crm, additionalData.especialidade, additionalData.local_atendimento, additionalData.telefone_contato]
      );
    }

    res.status(201).json({ message: 'Usuário criado com sucesso', userId });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(senha, user.senha_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, tipo_usuario: user.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo_usuario: user.tipo_usuario
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { register, login };