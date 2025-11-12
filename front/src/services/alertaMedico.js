// // front/src/services/alertaMedico.js
// import axios from 'axios';

// const API_URL = 'http://localhost:3000/api/doctor/alerta';

// const getAuthHeader = () => {
//   const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
//   return token ? { Authorization: `Bearer ${token}` } : {};
// };

// /**
//  * Envia um alerta por email para o paciente
//  * @param {number} pacienteId - ID do paciente
//  * @param {string} mensagem - Mensagem do alerta
//  * @param {string} email - Email do paciente
//  */
// export const enviarAlerta = async (pacienteId, mensagem, email) => {
//   try {
//     console.log('📧 Enviando alerta...', { pacienteId, mensagem, email });
    
//     const response = await axios.post(
//       `${API_URL}/enviar`,
//       {
//         paciente_id: pacienteId,
//         mensagem: mensagem,
//         email: email
//       },
//       { headers: getAuthHeader() }
//     );
    
//     console.log('✅ Alerta enviado com sucesso:', response.data);
//     return response.data;
//   } catch (error) {
//     console.error('❌ Erro ao enviar alerta:', error);
//     throw error.response?.data || { error: 'Erro ao enviar alerta' };
//   }
// };

// /**
//  * Lista alertas enviados pelo médico
//  * @param {object} params - Parâmetros de filtro
//  */
// export const listarAlertasEnviados = async (params = {}) => {
//   try {
//     const queryString = new URLSearchParams(params).toString();
//     const response = await axios.get(
//       `${API_URL}/enviados${queryString ? `?${queryString}` : ''}`,
//       { headers: getAuthHeader() }
//     );
//     return response.data;
//   } catch (error) {
//     console.error('Erro ao listar alertas:', error);
//     throw error.response?.data || { error: 'Erro ao listar alertas' };
//   }
// };

// /**
//  * Busca um alerta específico
//  * @param {number} alertaId - ID do alerta
//  */
// export const buscarAlerta = async (alertaId) => {
//   try {
//     const response = await axios.get(
//       `${API_URL}/${alertaId}`,
//       { headers: getAuthHeader() }
//     );
//     return response.data;
//   } catch (error) {
//     console.error('Erro ao buscar alerta:', error);
//     throw error.response?.data || { error: 'Erro ao buscar alerta' };
//   }
// };

// /**
//  * Obtém estatísticas de alertas enviados
//  * @param {object} params - Parâmetros de filtro (data_inicio, data_fim)
//  */
// export const obterEstatisticas = async (params = {}) => {
//   try {
//     const queryString = new URLSearchParams(params).toString();
//     const response = await axios.get(
//       `${API_URL}/estatisticas${queryString ? `?${queryString}` : ''}`,
//       { headers: getAuthHeader() }
//     );
//     return response.data;
//   } catch (error) {
//     console.error('Erro ao obter estatísticas:', error);
//     throw error.response?.data || { error: 'Erro ao obter estatísticas' };
//   }
// };

// front/src/services/alertaMedico.js
// Service para gerenciamento de alertas médicos

import axios from 'axios';


// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const API_URL = import.meta.env.VITE_API_URL || 'https://dialyhome.com.br/api';

/**
 * Obtém o token de autenticação
 */
const getAuthToken = () => {
  // Tenta pegar de ambos os locais para compatibilidade
  return sessionStorage.getItem('token') || 
         sessionStorage.getItem('accessToken') || 
         localStorage.getItem('token') ||
         localStorage.getItem('accessToken');
};

/**
 * Configura os headers para requisições autenticadas
 */
const getAuthHeaders = () => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Token de autenticação não encontrado');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Envia um alerta por email para o paciente
 * 
 * Aceita dois formatos:
 * 1. enviarAlerta({ pacienteId, mensagem, email })  (NOVO)
 * 2. enviarAlerta(pacienteId, mensagem, email)      (ANTIGO - para compatibilidade)
 * 
 * @param {Object|number} params - Objeto com parâmetros OU pacienteId
 * @param {string} mensagem - Mensagem do alerta (se usar formato antigo)
 * @param {string} email - Email do paciente (se usar formato antigo)
 */
export const enviarAlerta = async (params, mensagem, email) => {
  try {
    // Suporta ambos os formatos de chamada
    let pacienteId, msg, emailPaciente;
    
    if (typeof params === 'object' && params !== null) {
      // Formato novo: enviarAlerta({ pacienteId, mensagem, email })
      pacienteId = params.pacienteId;
      msg = params.mensagem;
      emailPaciente = params.email;
    } else {
      // Formato antigo: enviarAlerta(pacienteId, mensagem, email)
      pacienteId = params;
      msg = mensagem;
      emailPaciente = email;
    }

    console.log('📧 Service enviarAlerta - Enviando...', {
      pacienteId,
      mensagem: msg,
      email: emailPaciente
    });

    // Validações
    if (!pacienteId) {
      throw new Error('ID do paciente é obrigatório');
    }

    if (!msg || msg.trim().length < 10) {
      throw new Error('Mensagem deve ter no mínimo 10 caracteres');
    }

    if (!emailPaciente) {
      throw new Error('Email do paciente é obrigatório');
    }

    const response = await fetch(`${API_URL}/medico/alertas/enviar`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        paciente_id: pacienteId,
        mensagem: msg.trim(),
        email: emailPaciente
      })
    });

    const data = await response.json();

    console.log('📧 Service enviarAlerta - Resposta:', {
      status: response.status,
      data
    });

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erro ao enviar alerta');
    }

    console.log('✅ Alerta enviado com sucesso!');
    return data;

  } catch (error) {
    console.error('❌ Service enviarAlerta - Erro:', error);
    throw {
      error: error.message || 'Erro ao enviar alerta',
      details: error
    };
  }
};

/**
 * Lista alertas enviados pelo médico
 * @param {Object} params - Parâmetros de filtro
 * @param {number} params.limite - Limite de registros por página
 * @param {number} params.pagina - Número da página
 * @param {number} params.paciente_id - Filtrar por paciente específico
 */
export const listarAlertasEnviados = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.limite) queryParams.append('limite', params.limite);
    if (params.pagina) queryParams.append('pagina', params.pagina);
    if (params.paciente_id) queryParams.append('paciente_id', params.paciente_id);

    const url = `${API_URL}/medico/alertas/enviados${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao listar alertas');
    }

    return data;

  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    throw {
      error: error.message || 'Erro ao listar alertas',
      details: error
    };
  }
};

/**
 * Busca um alerta específico
 * @param {number} alertaId - ID do alerta
 */
export const buscarAlerta = async (alertaId) => {
  try {
    if (!alertaId) {
      throw new Error('ID do alerta é obrigatório');
    }

    const response = await fetch(`${API_URL}/medico/alertas/${alertaId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao buscar alerta');
    }

    return data;

  } catch (error) {
    console.error('Erro ao buscar alerta:', error);
    throw {
      error: error.message || 'Erro ao buscar alerta',
      details: error
    };
  }
};

/**
 * Obtém estatísticas de alertas enviados
 * @param {Object} params - Parâmetros de filtro
 * @param {string} params.data_inicio - Data de início (formato: YYYY-MM-DD)
 * @param {string} params.data_fim - Data de fim (formato: YYYY-MM-DD)
 */
export const obterEstatisticas = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.data_inicio) queryParams.append('data_inicio', params.data_inicio);
    if (params.data_fim) queryParams.append('data_fim', params.data_fim);

    const url = `${API_URL}/medico/alertas/estatisticas${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao obter estatísticas');
    }

    return data;

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    throw {
      error: error.message || 'Erro ao obter estatísticas',
      details: error
    };
  }
};

// Exportação default para compatibilidade
export default {
  enviarAlerta,
  listarAlertasEnviados,
  buscarAlerta,
  obterEstatisticas
};