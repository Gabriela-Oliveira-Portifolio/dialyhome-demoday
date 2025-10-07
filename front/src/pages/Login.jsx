import React, { useState } from 'react';
import PageContainer from '../components/Layout/PageContainer';
import TwoColumnLayout from '../components/Layout/TwoColumnLayout';
import WelcomeSection from '../components/login/WelcomeSection';
import LoginCard from '../components/ui/LoginCard';
import RoleTabs from '../components/ui/RoleTabs';
import LoginForm from '../components/forms/LoginForm';
import { login } from '../services/auth';


const Login = () => {
  const [role, setRole] = useState('Paciente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const roles = ['Paciente', 'Médico', 'Admin'];

  const features = [
    {
      icon: '💚',
      title: 'Monitoramento Contínuo',
      description: 'Acompanhe seus parâmetros clínicos diariamente de forma simples e segura'
    },
    {
      icon: '🩺',
      title: 'Cuidado Personalizado',
      description: 'Comunicação direta com sua equipe médica e alertas em tempo real'
    }
  ];

  // const handleLogin = () => {
  //   alert(`Login como ${role}: ${email}`);
  //   // Aqui você chamaria a API via Axios
  // };
  const handleLogin = async () => {
    try {
      const data = await login(email, password);
      console.log('Resposta do backend:', data);

      // Salva os tokens no localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      // Salva dados do usuário
      localStorage.setItem('user', JSON.stringify(data.user));

      alert(`Login bem-sucedido como ${role}: ${data.user.email}`);

      // Redireciona para dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      alert(err.error || 'Falha ao fazer login');
    }
};



  return (
    <PageContainer>
      <TwoColumnLayout
        leftContent={
          <WelcomeSection
            // logo="logo.png" // Descomente quando tiver o logo
            title="Sistema Web para controle de diálise peritoneal domiciliar"
            features={features}
          />
        }
        rightContent={
          <LoginCard
            title="Acesse sua conta"
            subtitle="Entre com suas credenciais para acessar o sistema"
          >
            <RoleTabs
              activeRole={role}
              onRoleChange={setRole}
              roles={roles}
            />
            <LoginForm
              email={email}
              password={password}
              role={role}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleLogin}
            />
          </LoginCard>
        }
      />
    </PageContainer>
  );
};

export default Login;


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
