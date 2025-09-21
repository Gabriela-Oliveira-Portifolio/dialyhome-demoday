import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './components/patient/Dashboard';
import DoctorDashboard from './components/doctor/Dashboard';
import Header from './components/common/Header';
import 'bootstrap/dist/css/bootstrap.min.css';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-4">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.tipo_usuario)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

const AppContent = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Router>
      {isAuthenticated && <Header />}
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            {user?.tipo_usuario === 'paciente' ? <PatientDashboard /> : <DoctorDashboard />}
          </PrivateRoute>
        } />
        
        <Route path="/patient/dashboard" element={
          <PrivateRoute allowedRoles={['paciente']}>
            <PatientDashboard />
          </PrivateRoute>
        } />
        
        <Route path="/doctor/dashboard" element={
          <PrivateRoute allowedRoles={['medico']}>
            <DoctorDashboard />
          </PrivateRoute>
        } />
        
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/unauthorized" element={<div className="alert alert-danger">Acesso negado</div>} />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;