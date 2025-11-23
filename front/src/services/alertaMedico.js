
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