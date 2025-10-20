import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import PatientDashboard from './pages/paciente';
import PatientHistory from './pages/PatientHistory';
import AdminDashboard from './pages/admin';
import DoctorDashboard from './pages/DoctorDashboard'; // ✅ import da página do médico
import PatientDetailPage from './pages/PatientDetailPage';

// Componente de rota protegida
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const token = sessionStorage.getItem('accessToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.tipo_usuario)) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<Login />} />
        
        {/* Rotas protegidas - Paciente */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['paciente']}>
              <PatientDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/historico" 
          element={
            <ProtectedRoute allowedRoles={['paciente']}>
              <PatientHistory />
            </ProtectedRoute>
          } 
        />

        {/* Rota protegida - Médico */}
        <Route 
          path="/DoctorDashboard" 
          element={
            <ProtectedRoute allowedRoles={['medico']}>
              <DoctorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/DoctorDashboard/paciente/:patientId" 
          element={
            <ProtectedRoute requiredRole="medico">
              <PatientDetailPage />
            </ProtectedRoute>
          } 
        />

        {/* Rota protegida - Admin */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
                
        {/* Rota padrão */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Rota 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import Login from './pages/Login';
// import PatientDashboard from './pages/paciente';
// import PatientHistory from './pages/PatientHistory';
// import AdminDashboard from './pages/admin';

// // Componente de rota protegida
// const ProtectedRoute = ({ children, allowedRoles }) => {
//   const user = JSON.parse(sessionStorage.getItem('user') || '{}');
//   const token = sessionStorage.getItem('accessToken');
  
//   if (!token) {
//     return <Navigate to="/login" replace />;
//   }
  
//   if (allowedRoles && !allowedRoles.includes(user.tipo_usuario)) {
//     return <Navigate to="/login" replace />;
//   }
  
//   return children;
// };

// function App() {
//   return (
//     <Router>
//       <Routes>
//         {/* Rota pública */}
//         <Route path="/login" element={<Login />} />
        
//         {/* Rotas protegidas para pacientes */}
//         <Route 
//           path="/dashboard" 
//           element={
//             <ProtectedRoute allowedRoles={['paciente']}>
//               <PatientDashboard />
//             </ProtectedRoute>
//           } 
//         />
        
//         <Route 
//           path="/historico" 
//           element={
//             <ProtectedRoute allowedRoles={['paciente']}>
//               <PatientHistory />
//             </ProtectedRoute>
//           } 
//         />

//         <Route 
//           path="/admin" 
//           element={
//             <ProtectedRoute allowedRoles={['admin']}>
//               <AdminDashboard />
//             </ProtectedRoute>
//           } 
//         />
                
//         {/* Rota padrão - redireciona para login */}
//         <Route path="/" element={<Navigate to="/login" replace />} />
        
//         {/* Rota 404 - redireciona para login */}
//         <Route path="*" element={<Navigate to="/login" replace />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;