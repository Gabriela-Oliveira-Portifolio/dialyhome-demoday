import axios from 'axios';

const API_URL = 'http://localhost:3000/api/patients';

// Função para pegar o token do sessionStorage
const getAuthHeader = () => {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Buscar informações completas do paciente
export const getPatientInfo = async () => {
  
  try {
    const response = await axios.get(
      `${API_URL}/profile`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar informações do paciente' };
  }
};

// Buscar estatísticas detalhadas
export const getDetailedStats = async (days = 30) => {
  try {
    const response = await axios.get(
      `${API_URL}/stats?days=${days}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar estatísticas' };
  }
};
