// front/src/services/adminService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://dialyhome.com.br/api';

// Configurar interceptor para adicionar token
const getAuthHeader = () => {
  // Tenta pegar o token de diferentes lugares
  const token = localStorage.getItem('token') || 
                localStorage.getItem('accessToken') ||
                sessionStorage.getItem('token') ||
                sessionStorage.getItem('accessToken');
  
  if (!token) {
    console.warn('⚠️ Token não encontrado! Verifique se você está logado.');
  } else {
    console.log('✅ Token encontrado:', token.substring(0, 20) + '...');
  }
  
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const adminService = {
  // ==================== DASHBOARD ====================
  getDashboardStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/dashboard/stats`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error.response?.data || { error: 'Erro ao buscar estatísticas' };
    }
  },

  // ==================== USUÁRIOS ====================
  getAllUsers: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axios.get(
        `${API_URL}/admin/users${queryString ? `?${queryString}` : ''}`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error.response?.data || { error: 'Erro ao buscar usuários' };
    }
  },

  getUserById: async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/admin/users/${userId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error.response?.data || { error: 'Erro ao buscar usuário' };
    }
  },

  createUser: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/admin/users`, userData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error.response?.data || { error: 'Erro ao criar usuário' };
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const response = await axios.put(`${API_URL}/admin/users/${userId}`, userData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error.response?.data || { error: 'Erro ao atualizar usuário' };
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await axios.delete(`${API_URL}/admin/users/${userId}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error.response?.data || { error: 'Erro ao deletar usuário' };
    }
  },

  toggleUserStatus: async (userId) => {
    try {
      const response = await axios.put(
        `${API_URL}/users/${userId}/toggle-status`,
        {},
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      throw error.response?.data || { error: 'Erro ao alterar status' };
    }
  },

  // ==================== VINCULAÇÕES ====================
  getPatientDoctorRelations: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/relations`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar vinculações:', error);
      throw error.response?.data || { error: 'Erro ao buscar vinculações' };
    }
  },

  assignDoctorToPatient: async (pacienteId, medicoId) => {
    try {
      const response = await axios.post(
        `${API_URL}/admin/relations/assign`,
        { paciente_id: pacienteId, medico_id: medicoId },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao vincular médico:', error);
      throw error.response?.data || { error: 'Erro ao vincular médico' };
    }
  },

  // ==================== AUDITORIA ====================
  getAuditLogs: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axios.get(
        `${API_URL}/admin/audit-logs${queryString ? `?${queryString}` : ''}`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      throw error.response?.data || { error: 'Erro ao buscar logs' };
    }
  },

  // ==================== RELATÓRIOS ====================
  getSystemReports: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axios.get(
        `${API_URL}/admin/reports${queryString ? `?${queryString}` : ''}`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
      throw error.response?.data || { error: 'Erro ao buscar relatórios' };
    }
  },

  // ==================== BACKUP ====================
  getBackupStatus: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/backup/status`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar status de backup:', error);
      throw error.response?.data || { error: 'Erro ao buscar status de backup' };
    }
  },

  triggerBackup: async () => {
    try {
      const response = await axios.post(
        `${API_URL}/admin/backup/trigger`,
        {},
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao iniciar backup:', error);
      throw error.response?.data || { error: 'Erro ao iniciar backup' };
    }
  },
  getUserGrowthData: async (meses = 6) => {
    try {
      const response = await axios.get(
        `${API_URL}/admin/analytics/user-growth?meses=${meses}`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar crescimento de usuários:', error);
      throw error.response?.data || { error: 'Erro ao buscar dados de crescimento' };
    }
  },

  getDoctorWorkload: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/analytics/doctor-workload`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar carga de trabalho:', error);
      throw error.response?.data || { error: 'Erro ao buscar carga de trabalho' };
    }
  },

  getDialysisWeeklyPattern: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/analytics/dialysis-pattern`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar padrão semanal:', error);
      throw error.response?.data || { error: 'Erro ao buscar padrão semanal' };
    }
  },

  getCommonSymptoms: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/analytics/symptoms`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar sintomas:', error);
      throw error.response?.data || { error: 'Erro ao buscar sintomas' };
    }
  },

  getTreatmentAdherence: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/analytics/adherence`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar adesão:', error);
      throw error.response?.data || { error: 'Erro ao buscar adesão ao tratamento' };
    }
  },

  getBloodPressureAnalysis: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/analytics/blood-pressure`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar análise de pressão:', error);
      throw error.response?.data || { error: 'Erro ao buscar análise de pressão' };
    }
  },

  getUltrafiltrationTrend: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/analytics/ultrafiltration`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar UF:', error);
      throw error.response?.data || { error: 'Erro ao buscar ultrafiltração' };
    }
  },

  getSystemInsights: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/analytics/insights`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar insights:', error);
      throw error.response?.data || { error: 'Erro ao buscar insights' };
    }
  }
};

// ✅ IMPORTANTE: Exportação default
export default adminService;