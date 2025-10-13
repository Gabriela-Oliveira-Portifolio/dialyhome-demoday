import React, { useState } from 'react';
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
      console.log('Resposta do backend:', data);

      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem('user', JSON.stringify(data.user));

      // Redireciona baseado no tipo de usuário
      if (data.user.tipo_usuario === 'paciente') {
        navigate('/dashboard');
      } else if (data.user.tipo_usuario === 'medico') {
        navigate('/dashboard-medico'); // Criar depois
      } else if (data.user.tipo_usuario === 'admin') {
        navigate('/admin'); // Criar depois
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
            <h1 className="brand-name">DialCare</h1>
          </div>
          
          <h2 className="main-title">
            Sistema de Controle de<br/>
            <span className="gradient-text">Diálise Peritoneal</span>
          </h2>
          
          <p className="subtitle">
            Monitoramento completo e seguro para tratamento domiciliar
          </p>

          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon feature-icon-teal">
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
                <h3>Cuidado Personalizado</h3>
                <p>Comunicação direta com sua equipe médica e alertas em tempo real</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon feature-icon-cyan">
                <span>📊</span>
              </div>
              <div className="feature-content">
                <h3>Análise Inteligente</h3>
                <p>Visualize tendências e receba recomendações baseadas nos seus dados</p>
              </div>
            </div>
          </div>
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

              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span>Lembrar-me</span>
                </label>
                <button type="button" className="forgot-password">
                  Esqueceu a senha?
                </button>
              </div>

              <button 
                onClick={handleLogin} 
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>

            <div className="card-footer">
              <p>
                Não tem uma conta?{' '}
                <button className="signup-link">
                  Solicite acesso
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;




// import React, { useState } from 'react';
// import { login } from '../services/auth';
// import './Login.css'; // Vamos criar este arquivo

// const Login = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);

//   const handleLogin = async () => {
//     try {
//       const data = await login(email, password);
//       console.log('Resposta do backend:', data);

//       sessionStorage.setItem('accessToken', data.accessToken);
//       sessionStorage.setItem('refreshToken', data.refreshToken);
//       sessionStorage.setItem('user', JSON.stringify(data.user));

//       alert(`Login bem-sucedido: ${data.user.email}`);
//       window.location.href = '/dashboard';
//     } catch (err) {
//       console.error(err);
//       alert(err.error || 'Falha ao fazer login');
//     }
//   };

//   return (
//     <div className="login-container">
//       <div className="login-wrapper">
        
//         {/* Lado Esquerdo */}
//         <div className="login-left">
//           <div className="login-header">
//             <div className="logo-icon">
//               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
//               </svg>
//             </div>
//             <h1 className="brand-name">DialCare</h1>
//           </div>
          
//           <h2 className="main-title">
//             Sistema de Controle de<br/>
//             <span className="gradient-text">Diálise Peritoneal</span>
//           </h2>
          
//           <p className="subtitle">
//             Monitoramento completo e seguro para tratamento domiciliar
//           </p>

//           <div className="features-list">
//             <div className="feature-item">
//               <div className="feature-icon feature-icon-teal">
//                 <span>💚</span>
//               </div>
//               <div className="feature-content">
//                 <h3>Monitoramento Contínuo</h3>
//                 <p>Acompanhe seus parâmetros clínicos diariamente de forma simples e segura</p>
//               </div>
//             </div>

//             <div className="feature-item">
//               <div className="feature-icon feature-icon-emerald">
//                 <span>🩺</span>
//               </div>
//               <div className="feature-content">
//                 <h3>Cuidado Personalizado</h3>
//                 <p>Comunicação direta com sua equipe médica e alertas em tempo real</p>
//               </div>
//             </div>

//             <div className="feature-item">
//               <div className="feature-icon feature-icon-cyan">
//                 <span>📊</span>
//               </div>
//               <div className="feature-content">
//                 <h3>Análise Inteligente</h3>
//                 <p>Visualize tendências e receba recomendações baseadas nos seus dados</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Lado Direito */}
//         <div className="login-right">
//           <div className="login-card">
//             <div className="card-header">
//               <h3>Acesse sua conta</h3>
//               <p>Entre com suas credenciais para continuar</p>
//             </div>

//             <div className="login-form">
//               <div className="form-group">
//                 <label>Email</label>
//                 <div className="input-wrapper">
//                   <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
//                   </svg>
//                   <input
//                     type="email"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     placeholder="seu@email.com"
//                     className="form-input"
//                   />
//                 </div>
//               </div>

//               <div className="form-group">
//                 <label>Senha</label>
//                 <div className="input-wrapper">
//                   <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//                   </svg>
//                   <input
//                     type={showPassword ? "text" : "password"}
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     placeholder="••••••••"
//                     className="form-input"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="toggle-password"
//                   >
//                     {showPassword ? (
//                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
//                       </svg>
//                     ) : (
//                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                       </svg>
//                     )}
//                   </button>
//                 </div>
//               </div>

//               <div className="form-options">
//                 <label className="checkbox-label">
//                   <input type="checkbox" />
//                   <span>Lembrar-me</span>
//                 </label>
//                 <button type="button" className="forgot-password">
//                   Esqueceu a senha?
//                 </button>
//               </div>

//               <button onClick={handleLogin} className="login-button">
//                 Entrar
//               </button>
//             </div>

//             <div className="card-footer">
//               <p>
//                 Não tem uma conta?{' '}
//                 <button className="signup-link">
//                   Solicite acesso
//                 </button>
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Login;



// import React, { useState } from 'react';
// import PageContainer from '../components/Layout/PageContainer';
// import TwoColumnLayout from '../components/Layout/TwoColumnLayout';
// import WelcomeSection from '../components/login/WelcomeSection';
// import LoginCard from '../components/ui/LoginCard';
// import RoleTabs from '../components/ui/RoleTabs';
// import LoginForm from '../components/forms/LoginForm';
// // import { login } from '../services/auth';


// const Login = () => {
//   const [role, setRole] = useState('Paciente');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   const roles = ['Paciente', 'Médico', 'Admin'];

//   const features = [
//     {
//       icon: '💚',
//       title: 'Monitoramento Contínuo',
//       description: 'Acompanhe seus parâmetros clínicos diariamente de forma simples e segura'
//     },
//     {
//       icon: '🩺',
//       title: 'Cuidado Personalizado',
//       description: 'Comunicação direta com sua equipe médica e alertas em tempo real'
//     }
//   ];

//   // const handleLogin = () => {
//   //   alert(`Login como ${role}: ${email}`);
//   //   // Aqui você chamaria a API via Axios
//   // };
//   const handleLogin = async () => {
//   try {
//     const data = await login(email, password);

//     // Salva os tokens no localStorage
//     localStorage.setItem('accessToken', data.accessToken);
//     localStorage.setItem('refreshToken', data.refreshToken);

//     // Salva dados do usuário
//     localStorage.setItem('user', JSON.stringify(data.user));

//     alert(`Login bem-sucedido como ${role}: ${data.user.email}`);

//     // Redireciona para dashboard
//     window.location.href = '/dashboard';
//   } catch (err) {
//     console.error(err);
//     alert(err.error || 'Falha ao fazer login');
//   }
// };



//   return (
//     <PageContainer>
//       <TwoColumnLayout
//         leftContent={
//           <WelcomeSection
//             // logo="logo.png" // Descomente quando tiver o logo
//             title="Sistema Web para controle de diálise peritoneal domiciliar"
//             features={features}
//           />
//         }
//         rightContent={
//           <LoginCard
//             title="Acesse sua conta"
//             subtitle="Entre com suas credenciais para acessar o sistema"
//           >
//             <RoleTabs
//               activeRole={role}
//               onRoleChange={setRole}
//               roles={roles}
//             />
//             <LoginForm
//               email={email}
//               password={password}
//               role={role}
//               onEmailChange={setEmail}
//               onPasswordChange={setPassword}
//               onSubmit={handleLogin}
//             />
//           </LoginCard>
//         }
//       />
//     </PageContainer>
//   );
// };

// export default Login;










// import React, { useState } from 'react';
// import { Form, Button, Card, Tabs, Tab } from 'react-bootstrap';

// const Login = () => {
//   const [role, setRole] = useState('Paciente');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   const handleLogin = () => {
//     alert(`Login como ${role}: ${email}`);
//     // Aqui você chamaria a API via Axios
//   };

//   return (
//     <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
//       <div style={{ display: 'flex', gap: '50px', alignItems: 'center' }}>
//         {/* Lado esquerdo */}
//         <div>
//          {/* <img src="logo.png" alt="Logo" style={{ width: '60px', marginBottom: '20px' }} /> */}
//           <h4>Sistema Web para controle de diálise peritoneal domiciliar</h4>
//           <div style={{ marginTop: '30px' }}>
//             <p>💚 <b>Monitoramento Contínuo</b> - Acompanhe seus parâmetros clínicos diariamente de forma simples e segura</p>
//             <p>🩺 <b>Cuidado Personalizado</b> - Comunicação direta com sua equipe médica e alertas em tempo real</p>
//           </div>
//         </div>

//         {/* Lado direito */}
//         <Card style={{ width: '350px', padding: '20px' }}>
//           <h5>Acesse sua conta</h5>
//           <p>Entre com suas credenciais para acessar o sistema</p>
          
//           <Tabs activeKey={role} onSelect={(k) => setRole(k)} className="mb-3">
//             <Tab eventKey="Paciente" title="Paciente" />
//             <Tab eventKey="Médico" title="Médico" />
//             <Tab eventKey="Admin" title="Admin" />
//           </Tabs>

//           <Form>
//             <Form.Group className="mb-3" controlId="formEmail">
//               <Form.Label>Email</Form.Label>
//               <Form.Control 
//                 type="email" 
//                 placeholder="seu@email.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//               />
//             </Form.Group>

//             <Form.Group className="mb-3" controlId="formPassword">
//               <Form.Label>Senha</Form.Label>
//               <Form.Control 
//                 type="password" 
//                 placeholder="******"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//               />
//             </Form.Group>

//             <Button variant="success" className="w-100" onClick={handleLogin}>
//               Entrar como {role}
//             </Button>
//           </Form>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default Login;
