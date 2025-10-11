import axios from 'axios';

const API_URL = 'http://localhost:3000/api/symptoms';

const getAuthHeader = () => {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Buscar sintomas pré-definidos
export const getPredefinedSymptoms = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/predefined`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar sintomas' };
  }
};

// Registrar sintomas isolados (sem registro de diálise)
export const registerIsolatedSymptom = async (symptomsData) => {
  try {
    const response = await axios.post(
      `${API_URL}/isolated`,
      symptomsData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao registrar sintomas' };
  }
};

// Registrar sintomas para um registro de diálise
export const registerSymptoms = async (registroId, symptomsData) => {
  try {
    const response = await axios.post(
      `${API_URL}/register`,
      { registro_dialise_id: registroId, sintomas: symptomsData },
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao registrar sintomas' };
  }
};

// Buscar histórico de sintomas
export const getSymptomsHistory = async (limit, offset) => {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);

    const response = await axios.get(
      `${API_URL}/history?${params.toString()}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar histórico' };
  }
};