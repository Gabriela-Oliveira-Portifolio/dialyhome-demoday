import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

    const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await login(email, password);

      // ✅ MUDANÇA: Usar localStorage ao invés de sessionStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Também manter no sessionStorage para compatibilidade (opcional)
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem('user', JSON.stringify(data.user));

      // Redireciona baseado no tipo de usuário
      if (data.user.tipo_usuario === 'paciente') {
        navigate('/dashboard');
      } else if (data.user.tipo_usuario === 'medico') {
        navigate('/DoctorDashboard');
      } else if (data.user.tipo_usuario === 'admin') {
        navigate('/admin');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError(err.error || 'Falha ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        
        {/* Lado Esquerdo */}
        <div className="login-left">
          <div className="login-header">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="brand-name" fontSize>DialyHome</h1>
          </div>
          
          <h2 className="main-title">
            Sistema de Controle de - <br/>
            <span className="gradient-text">Diálise Peritoneal</span>
          </h2>
          
          <p className="subtitle">
            Monitoramento completo e seguro para tratamento domiciliar, sua saude na palma de sua mão
          </p>

          {/* <div className="features-list"> */}
            {/* <div className="feature-item"> */}
              {/* <div className="feature-icon feature-icon-teal">
                <span>💚</span>
              </div>
              <div className="feature-content">
                <h3>Monitoramento Contínuo</h3>
                <p>Acompanhe seus parâmetros clínicos diariamente de forma simples e segura</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon feature-icon-emerald">
                <span>🩺</span>
              </div>
              <div className="feature-content">
                <h3>Alertas e lembretes</h3>
                <p>Alertas de tratamento e medicamentos</p>
              </div>
            </div> */}

            {/* <div className="feature-item">
              <div className="feature-icon feature-icon-cyan">
                <span>📊</span>
              </div>
              <div className="feature-content">
                <h3>Análise Inteligente</h3>
                <p>Visualize tendências e receba recomendações baseadas nos seus dados</p>
              </div>
            </div> */}
          {/* </div> */}
        </div>

        {/* Lado Direito */}
        <div className="login-right">
          <div className="login-card">
            <div className="card-header">
              <h3>Acesse sua conta</h3>
              <p>Entre com suas credenciais para continuar</p>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fee',
                color: '#c33',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div className="login-form">
              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="seu@email.com"
                    className="form-input"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Senha</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="••••••••"
                    className="form-input"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="toggle-password"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleLogin} 
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;