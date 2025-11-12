import axios from 'axios';

const API_URL = 'https://dialyhome.com.br/api/auth';

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email,
      senha: password // mapeando password do React para senha do backend
    });
    return response.data; // { accessToken, refreshToken, user }
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao fazer login' };
  }
};
