import axios from 'axios';

const API_URL = 'https://dialyhome.com.br/api/users';

// Função para pegar o token do sessionStorage
const getAuthHeader = () => {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Atualizar perfil (genérico para todos os tipos)
export const updateUserProfile = async (profileData) => {
  try {
    const response = await axios.put(
      `${API_URL}/updateProfile`,
      profileData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao atualizar perfil' };
  }
};

// Manter por compatibilidade
export const updatePatientProfile = updateUserProfile;

// Alterar senha
export const changePassword = async (passwordData) => {
  try {
    const response = await axios.put(
      `${API_URL}/changePassword`,
      passwordData,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao alterar senha' };
  }
};

// Buscar perfil do usuário
export const getUserProfile = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/getProfile`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erro ao buscar perfil' };
  }
};
// import axios from 'axios';

// const API_URL = 'http://localhost:3000/api/users';

// // Função para pegar o token do sessionStorage
// const getAuthHeader = () => {
//   const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
//   return token ? { Authorization: `Bearer ${token}` } : {};
// };

// // Atualizar perfil do paciente
// export const updatePatientProfile = async (profileData) => {
//   try {
//     const response = await axios.put(
//       `${API_URL}/updateProfile`,
//       profileData,
//       { headers: getAuthHeader() }
//     );
//     return response.data;
//   } catch (error) {
//     throw error.response?.data || { error: 'Erro ao atualizar perfil' };
//   }
// };

// // Alterar senha
// export const changePassword = async (passwordData) => {
//   try {
//     const response = await axios.put(
//       `${API_URL}/changePassword`,
//       passwordData,
//       { headers: getAuthHeader() }
//     );
//     return response.data;
//   } catch (error) {
//     throw error.response?.data || { error: 'Erro ao alterar senha' };
//   }
// };

// // Buscar perfil do usuário
// export const getUserProfile = async () => {
//   try {
//     const response = await axios.get(
//       `${API_URL}/getProfile`,
//       { headers: getAuthHeader() }
//     );
//     return response.data;
//   } catch (error) {
//     throw error.response?.data || { error: 'Erro ao buscar perfil' };
//   }
// };