// front/src/services/admin.js
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/admin';

const getAuthHeader = () => {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ==================== DASHBOARD ====================
export const getDashboardStats = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/dashboard/stats`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar estatísticas' };
  }
};

// ==================== USUÁRIOS ====================
export const getAllUsers = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await axios.get(
      `${API_URL}/users?${params.toString()}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar usuários' };
  }
};

export const getUserById = async (id) => {
  try {
    const response = await axios.get(
      `${API_URL}/users/${id}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar usuário' };
  }
};

export const createUser = async (userData) => {
  try {
    const response = await axios.post(
      `${API_URL}/users`,
      userData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao criar usuário' };
  }
};

export const updateUser = async (id, userData) => {
  try {
    const response = await axios.put(
      `${API_URL}/users/${id}`,
      userData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao atualizar usuário' };
  }
};

export const deleteUser = async (id) => {
  try {
    const response = await axios.delete(
      `${API_URL}/users/${id}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao deletar usuário' };
  }
};

// ==================== VINCULAÇÕES ====================
export const getPatientDoctorRelations = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/relations`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar vinculações' };
  }
};

export const assignDoctorToPatient = async (pacienteId, medicoId) => {
  try {
    const response = await axios.post(
      `${API_URL}/relations/assign`,
      { paciente_id: pacienteId, medico_id: medicoId },
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao vincular médico' };
  }
};

// ==================== AUDITORIA ====================
export const getAuditLogs = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.usuario_id) params.append('usuario_id', filters.usuario_id);
    if (filters.acao) params.append('acao', filters.acao);
    if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters.data_fim) params.append('data_fim', filters.data_fim);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await axios.get(
      `${API_URL}/audit-logs?${params.toString()}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar logs' };
  }
};

// ==================== RELATÓRIOS ====================
export const getSystemReports = async (tipo, dataInicio, dataFim) => {
  try {
    const params = new URLSearchParams();
    if (tipo) params.append('tipo', tipo);
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);

    const response = await axios.get(
      `${API_URL}/reports?${params.toString()}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao gerar relatório' };
  }
};

// ==================== BACKUP ====================
export const getBackupStatus = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/backup/status`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar status de backup' };
  }
};

export const triggerBackup = async () => {
  try {
    const response = await axios.post(
      `${API_URL}/backup/trigger`,
      {},
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao iniciar backup' };
  }
};