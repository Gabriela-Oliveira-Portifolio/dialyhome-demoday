const AuthService = require('../services/authService');

// Registro
const register = async (req, res) => {
  try {
    const user = await AuthService.createUser(req.body);
    res.status(201).json({ message: "Usuário criado com sucesso", user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await AuthService.authenticateUser(email, senha);

    const accessToken = AuthService.generateToken(user.id, user.tipo_usuario, 'access');
    const refreshToken = AuthService.generateToken(user.id, user.tipo_usuario, 'refresh');

    res.json({ accessToken, refreshToken, user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(400).json({ error: "Token não fornecido" });

    AuthService.logoutUser(token);

    // Adiciona o token na blacklist
    await db.query(
      "INSERT INTO tokens_invalidados (token, usuario_id, expira_em) VALUES ($1, $2, $3)",
      [token, req.user.id, expiraEm]
    );

    
    res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Refresh
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token não fornecido" });

    const tokens = await AuthService.refreshAccessToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

module.exports = { register, login, logout, refreshToken };

