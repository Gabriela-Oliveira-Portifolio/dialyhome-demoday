import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://dialyhome.com.br/api';

// ==================== TOKEN ====================
const getAuthHeader = () => {
  const tokenSources = [
    localStorage.getItem('token'),
    localStorage.getItem('accessToken'),
    sessionStorage.getItem('token'),
    sessionStorage.getItem('accessToken')
  ];

  const token = tokenSources.find(Boolean);

  if (token) {
    console.log("✅ Token encontrado:", token.substring(0, 20) + "...");
    return { Authorization: `Bearer ${token}` };
  }

  console.warn("⚠️ Token não encontrado! Verifique se você está logado.");
  return {};
};

// ==================== QUERY STRING ====================
const buildQuery = (params) => {
  const queryString = new URLSearchParams(params).toString();
  return queryString ? `?${queryString}` : "";
};

const adminService = {
  // ==================== DASHBOARD ====================
  getDashboardStats: async () => {
    try {
      const url = API_URL + "/admin/dashboard/stats";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      throw error.response?.data || { error: "Erro ao buscar estatísticas" };
    }
  },

  // ==================== USUÁRIOS ====================
  getAllUsers: async (params = {}) => {
    try {
      const url = API_URL + "/admin/users" + buildQuery(params);
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      throw error.response?.data || { error: "Erro ao buscar usuários" };
    }
  },

  getUserById: async (userId) => {
    try {
      const url = `${API_URL}/admin/users/${userId}`;
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      throw error.response?.data || { error: "Erro ao buscar usuário" };
    }
  },

  createUser: async (userData) => {
    try {
      const url = API_URL + "/admin/users";
      const response = await axios.post(url, userData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      throw error.response?.data || { error: "Erro ao criar usuário" };
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const url = `${API_URL}/admin/users/${userId}`;
      const response = await axios.put(url, userData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw error.response?.data || { error: "Erro ao atualizar usuário" };
    }
  },

  deleteUser: async (userId) => {
    try {
      const url = `${API_URL}/admin/users/${userId}`;
      const response = await axios.delete(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      throw error.response?.data || { error: "Erro ao deletar usuário" };
    }
  },

  toggleUserStatus: async (userId) => {
    try {
      const url = `${API_URL}/users/${userId}/toggle-status`;
      const response = await axios.put(url, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      throw error.response?.data || { error: "Erro ao alterar status" };
    }
  },

  // ==================== VINCULAÇÕES ====================
  getPatientDoctorRelations: async () => {
    try {
      const url = API_URL + "/admin/relations";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar vinculações:", error);
      throw error.response?.data || { error: "Erro ao buscar vinculações" };
    }
  },

  assignDoctorToPatient: async (pacienteId, medicoId) => {
    try {
      const url = API_URL + "/admin/relations/assign";
      const body = { paciente_id: pacienteId, medico_id: medicoId };
      const response = await axios.post(url, body, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao vincular médico:", error);
      throw error.response?.data || { error: "Erro ao vincular médico" };
    }
  },

  // ==================== AUDITORIA ====================
  getAuditLogs: async (params = {}) => {
    try {
      const url = API_URL + "/admin/audit-logs" + buildQuery(params);
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      throw error.response?.data || { error: "Erro ao buscar logs" };
    }
  },

  // ==================== RELATÓRIOS ====================
  getSystemReports: async (params = {}) => {
    try {
      const url = API_URL + "/admin/reports" + buildQuery(params);
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      throw error.response?.data || { error: "Erro ao buscar relatórios" };
    }
  },

  // ==================== BACKUP ====================
  getBackupStatus: async () => {
    try {
      const url = API_URL + "/admin/backup/status";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar status de backup:", error);
      throw error.response?.data || { error: "Erro ao buscar status de backup" };
    }
  },

  triggerBackup: async () => {
    try {
      const url = API_URL + "/admin/backup/trigger";
      const response = await axios.post(url, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao iniciar backup:", error);
      throw error.response?.data || { error: "Erro ao iniciar backup" };
    }
  },

  // ==================== ANALYTICS ====================
  getUserGrowthData: async (meses = 6) => {
    try {
      const url = `${API_URL}/admin/analytics/user-growth?meses=${meses}`;
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar crescimento de usuários:", error);
      throw error.response?.data || { error: "Erro ao buscar crescimento" };
    }
  },

  getDoctorWorkload: async () => {
    try {
      const url = API_URL + "/admin/analytics/doctor-workload";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar carga de trabalho:", error);
      throw error.response?.data || { error: "Erro ao buscar carga de trabalho" };
    }
  },

  getDialysisWeeklyPattern: async () => {
    try {
      const url = API_URL + "/admin/analytics/dialysis-pattern";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar padrão semanal:", error);
      throw error.response?.data || { error: "Erro ao buscar padrão semanal" };
    }
  },

  getCommonSymptoms: async () => {
    try {
      const url = API_URL + "/admin/analytics/symptoms";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar sintomas:", error);
      throw error.response?.data || { error: "Erro ao buscar sintomas" };
    }
  },

  getTreatmentAdherence: async () => {
    try {
      const url = API_URL + "/admin/analytics/adherence";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar adesão:", error);
      throw error.response?.data || { error: "Erro ao buscar adesão" };
    }
  },

  getBloodPressureAnalysis: async () => {
    try {
      const url = API_URL + "/admin/analytics/blood-pressure";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar análise de pressão:", error);
      throw error.response?.data || { error: "Erro ao buscar análise de pressão" };
    }
  },

  getUltrafiltrationTrend: async () => {
    try {
      const url = API_URL + "/admin/analytics/ultrafiltration";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar UF:", error);
      throw error.response?.data || { error: "Erro ao buscar UF" };
    }
  },

  getSystemInsights: async () => {
    try {
      const url = API_URL + "/admin/analytics/insights";
      const response = await axios.get(url, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar insights:", error);
      throw error.response?.data || { error: "Erro ao buscar insights" };
    }
  },
};

export default adminService;
