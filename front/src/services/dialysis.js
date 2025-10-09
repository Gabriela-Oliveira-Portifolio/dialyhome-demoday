import axios from 'axios';

const API_URL = 'http://localhost:3000/api/dialysis';

// Função para pegar o token do sessionStorage
const getAuthHeader = () => {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Criar novo registro de diálise
export const createDialysisRecord = async (recordData) => {
  try {
    const response = await axios.post(
      `${API_URL}/records`,
      recordData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao criar registro' };
  }
};

// Buscar registros do paciente
export const getPatientRecords = async (limit = 10) => {
  try {
    const response = await axios.get(
      `${API_URL}/records?limit=${limit}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar registros' };
  }
};

// Buscar estatísticas do paciente
export const getPatientStats = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/stats`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar estatísticas' };
  }
};

// Buscar registro específico por ID
export const getRecordById = async (id) => {
  try {
    const response = await axios.get(
      `${API_URL}/records/${id}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar registro' };
  }
};

// Atualizar registro
export const updateDialysisRecord = async (id, recordData) => {
  try {
    const response = await axios.put(
      `${API_URL}/records/${id}`,
      recordData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao atualizar registro' };
  }
};

// Deletar registro
export const deleteDialysisRecord = async (id) => {
  try {
    const response = await axios.delete(
      `${API_URL}/records/${id}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao deletar registro' };
  }
};
