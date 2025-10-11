import axios from 'axios';

const API_URL = 'http://localhost:3000/api/reminders';

const getAuthHeader = () => {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Buscar todos os lembretes
export const getReminders = async (limit, offset) => {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);

    const response = await axios.get(
      `${API_URL}?${params.toString()}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar lembretes' };
  }
};

// Buscar lembretes próximos
export const getUpcomingReminders = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/upcoming`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar lembretes próximos' };
  }
};

// Criar novo lembrete
export const createReminder = async (reminderData) => {
  try {
    const response = await axios.post(
      API_URL,
      reminderData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao criar lembrete' };
  }
};

// Atualizar lembrete
export const updateReminder = async (id, reminderData) => {
  try {
    const response = await axios.put(
      `${API_URL}/${id}`,
      reminderData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao atualizar lembrete' };
  }
};

// Deletar lembrete
export const deleteReminder = async (id) => {
  try {
    const response = await axios.delete(
      `${API_URL}/${id}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao deletar lembrete' };
  }
};