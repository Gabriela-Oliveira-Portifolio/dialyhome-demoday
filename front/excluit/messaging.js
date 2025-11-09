// front/src/services/messaging.js

import axios from 'axios';

const API_URL = 'http://localhost:3000/api/messaging';

const getAuthHeader = () => {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ===============================
// Enviar mensagem
// ===============================
export const sendMessage = async (destinatarioId, assunto, mensagem) => {
  try {
    const response = await axios.post(
      `${API_URL}/send`,
      {
        destinatario_id: destinatarioId,
        assunto,
        mensagem
      },
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao enviar mensagem' };
  }
};

// ===============================
// Listar conversas
// ===============================
export const getConversations = async () => {
  try {
    const response = await axios.get(`${API_URL}/conversations`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar conversas' };
  }
};

// ===============================
// Obter mensagens de uma conversa
// ===============================
export const getMessages = async (userId, limit = 50, offset = 0) => {
  try {
    const response = await axios.get(
      `${API_URL}/${userId}?limit=${limit}&offset=${offset}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar mensagens' };
  }
};

// ===============================
// Marcar mensagem como lida
// ===============================
export const markMessageAsRead = async (messageId) => {
  try {
    const response = await axios.put(
      `${API_URL}/${messageId}/read`,
      {},
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao marcar mensagem como lida' };
  }
};

// ===============================
// Deletar mensagem
// ===============================
export const deleteMessage = async (messageId) => {
  try {
    const response = await axios.delete(`${API_URL}/${messageId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao deletar mensagem' };
  }
};

// ===============================
// Obter informações do contato
// ===============================
export const getContactInfo = async () => {
  try {
    console.log('📞 Chamando API: GET /api/messaging/contact/info');
    const response = await axios.get(`${API_URL}/contact/info`, {
      headers: getAuthHeader()
    });
    console.log('✅ Resposta da API:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro na API getContactInfo:', error);
    console.error('Status:', error.response?.status);
    console.error('Dados:', error.response?.data);
    throw error.response?.data || { error: 'Erro ao buscar informações do contato' };
  }
};
