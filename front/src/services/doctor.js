import axios from 'axios';

const API_URL = 'http://localhost:3000/api/doctor';

const getAuthHeader = () => {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ===============================
// Perfil do médico
// ===============================
export const getDoctorProfile = async () => {
  try {
    const response = await axios.get(`${API_URL}/profile`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar perfil do médico' };
  }
};

// ===============================
// Estatísticas do dashboard
// ===============================
export const getDashboardStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/dashboard/stats`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar estatísticas' };
  }
};

// ===============================
// Relatório individual de paciente
// ===============================
export const getPatientReport = async (patientId, startDate, endDate) => {
  try {
    const response = await axios.get(
      `${API_URL}/reports/patient/${patientId}?startDate=${startDate}&endDate=${endDate}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao gerar relatório individual' };
  }
};

// ===============================
// Relatório geral
// ===============================
export const getGeneralReport = async (startDate, endDate) => {
  try {
    const response = await axios.get(
      `${API_URL}/reports/general?startDate=${startDate}&endDate=${endDate}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao gerar relatório geral' };
  }
};

// ===============================
// Lista de pacientes
// ===============================
export const getPatients = async () => {
  try {
    const response = await axios.get(`${API_URL}/patients`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar pacientes' };
  }
};

// ===============================
// Detalhes de um paciente
// ===============================
export const getPatientDetails = async (patientId) => {
  try {
    const response = await axios.get(`${API_URL}/patients/${patientId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar detalhes do paciente' };
  }
};

// ===============================
// Histórico de diálise do paciente
// ===============================
export const getPatientDialysisHistory = async (patientId, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(
      `${API_URL}/patients/${patientId}/dialysis${queryString ? `?${queryString}` : ''}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar histórico de diálise' };
  }
};

// ===============================
// Documentos do paciente
// ===============================
export const getPatientDocuments = async (patientId) => {
  try {
    const response = await axios.get(`${API_URL}/patients/${patientId}/documents`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar documentos do paciente' };
  }
};

// ===============================
// Enviar recomendação
// ===============================
export const sendRecommendation = async (patientId, recommendationData) => {
  try {
    const response = await axios.post(
      `${API_URL}/patients/${patientId}/recommendations`,
      recommendationData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao enviar recomendação' };
  }
};

// ===============================
// Notificações
// ===============================
export const getNotifications = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(
      `${API_URL}/notifications${queryString ? `?${queryString}` : ''}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar notificações' };
  }
};

// ===============================
// Marcar notificação como lida
// ===============================
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await axios.put(
      `${API_URL}/notifications/${notificationId}/read`,
      {},
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao marcar notificação como lida' };
  }
};
