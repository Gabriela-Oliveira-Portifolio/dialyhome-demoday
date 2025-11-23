import React from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import PatientDashboard from './pages/paciente';
import PatientHistory from './pages/PatientHistory';
import AdminDashboard from './pages/admin';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDetailPage from './pages/PatientDetailPage';
import Patientprofile from './pages/Patientprofile.jsx';
import UserProfile from './pages/UserProfile.jsx';
import Doctorprofile from './pages/Doctorprofile.jsx';

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

// 📌 PropTypes para remover os avisos do Sonar
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string), // opcional
};

function App() {
  return (
    <Router>
      <Routes>

        {/* Rota pública */}
        <Route path="/login" element={<Login />} />

        {/* Paciente */}
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

        {/* Médico */}
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
            <ProtectedRoute allowedRoles={['medico']}>
              <PatientDetailPage />
            </ProtectedRoute>
          }
        />

        <Route path="/perfil" element={<Patientprofile />} />
        <Route path="/user" element={<UserProfile />} />
        <Route path="/perfilDoutor" element={<Doctorprofile />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Padrão */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </Router>
  );
}

export default App;
