// Dados mock para usar nos testes
const testData = {
  // Usuários
  users: {
    admin: {
      id: 1,
      nome: 'Admin Teste',
      email: 'admin@test.com',
      tipo_usuario: 'admin',
      ativo: true,
      data_criacao: new Date('2025-01-01')
    },
    medico: {
      id: 2,
      nome: 'Dr. João Silva',
      email: 'joao.silva@test.com',
      tipo_usuario: 'medico',
      ativo: true,
      data_criacao: new Date('2025-01-15')
    },
    paciente: {
      id: 3,
      nome: 'Maria Santos',
      email: 'maria.santos@test.com',
      tipo_usuario: 'paciente',
      ativo: true,
      data_criacao: new Date('2025-02-01')
    },
    pacienteInativo: {
      id: 4,
      nome: 'Pedro Oliveira',
      email: 'pedro@test.com',
      tipo_usuario: 'paciente',
      ativo: false,
      data_criacao: new Date('2025-01-01')
    }
  },

  // Médicos
  medicos: {
    medico1: {
      id: 1,
      usuario_id: 2,
      crm: '12345-SC',
      especialidade: 'Nefrologia',
      telefone_contato: '(47) 99999-1111'
    },
    medico2: {
      id: 2,
      usuario_id: 5,
      crm: '67890-SC',
      especialidade: 'Nefrologia',
      telefone_contato: '(47) 99999-2222'
    }
  },

  // Pacientes
  pacientes: {
    paciente1: {
      id: 1,
      usuario_id: 3,
      cpf: '12345678900',
      data_nascimento: '1980-05-15',
      telefone: '(47) 98888-1111',
      endereco: 'Rua Teste, 123',
      peso_inicial: 75.5,
      altura: 1.75,
      medico_responsavel_id: 1,
      data_inicio_tratamento: '2024-01-01'
    },
    paciente2: {
      id: 2,
      usuario_id: 4,
      cpf: '98765432100',
      data_nascimento: '1975-08-20',
      telefone: '(47) 98888-2222',
      endereco: 'Av. Principal, 456',
      peso_inicial: 80.0,
      altura: 1.68,
      medico_responsavel_id: null,
      data_inicio_tratamento: '2024-06-01'
    }
  },

  // Registros de diálise
  registroDialise: {
    registro1: {
      id: 1,
      paciente_id: 1,
      data_registro: new Date('2025-03-01'),
      peso_pre_dialise: 77.0,
      peso_pos_dialise: 75.0,
      uf_total: 2000,
      pressao_arterial_sistolica: 130,
      pressao_arterial_diastolica: 80,
      temperatura: 36.5,
      observacoes: 'Sessão normal'
    },
    registro2: {
      id: 2,
      paciente_id: 1,
      data_registro: new Date('2025-03-03'),
      peso_pre_dialise: 76.5,
      peso_pos_dialise: 74.5,
      uf_total: 2000,
      pressao_arterial_sistolica: 140,
      pressao_arterial_diastolica: 90,
      temperatura: 36.7,
      observacoes: 'Paciente relatou leve tontura'
    }
  },

  // Logs de auditoria
  auditLogs: {
    log1: {
      id: 1,
      usuario_id: 1,
      tabela_afetada: 'usuarios',
      operacao: 'INSERT',
      dados_anteriores: null,
      dados_novos: JSON.stringify({ created_user_id: 3 }),
      data_operacao: new Date('2025-02-01'),
      ip_address: '127.0.0.1'
    },
    log2: {
      id: 2,
      usuario_id: 1,
      tabela_afetada: 'pacientes',
      operacao: 'UPDATE',
      dados_anteriores: JSON.stringify({ medico_responsavel_id: null }),
      dados_novos: JSON.stringify({ medico_responsavel_id: 1 }),
      data_operacao: new Date('2025-02-05'),
      ip_address: '127.0.0.1'
    }
  },

  // Sintomas
  sintomas: {
    sintoma1: {
      id: 1,
      nome: 'Náusea',
      categoria: 'gastrointestinal',
      descricao: 'Sensação de enjoo'
    },
    sintoma2: {
      id: 2,
      nome: 'Tontura',
      categoria: 'neurologico',
      descricao: 'Vertigem ou desequilíbrio'
    }
  },

  // Notificações
  notificacoes: {
    notificacao1: {
      id: 1,
      usuario_id: 2,
      titulo: 'Novo Paciente Atribuído',
      mensagem: 'Maria Santos foi atribuída como sua paciente',
      tipo: 'info',
      lida: false,
      data_criacao: new Date('2025-02-01')
    }
  },

  // Estatísticas mockadas
  dashboardStats: {
    usersStats: [
      { tipo_usuario: 'admin', total: '2', ativos: '2' },
      { tipo_usuario: 'medico', total: '10', ativos: '9' },
      { tipo_usuario: 'paciente', total: '50', ativos: '45' }
    ],
    dialysisStats: {
      total_registros: '1500',
      pacientes_com_registros: '45'
    },
    monthlyRecords: [
      { mes: new Date('2025-01-01'), registros_mes: '400' },
      { mes: new Date('2025-02-01'), registros_mes: '450' },
      { mes: new Date('2025-03-01'), registros_mes: '500' }
    ],
    recentAlerts: {
      total_alertas: '8'
    }
  }
};

// Funções auxiliares para criar dados de teste
const createMockUser = (overrides = {}) => ({
  ...testData.users.paciente,
  ...overrides
});

const createMockPaciente = (overrides = {}) => ({
  ...testData.pacientes.paciente1,
  ...overrides
});

const createMockMedico = (overrides = {}) => ({
  ...testData.medicos.medico1,
  ...overrides
});

const createMockRegistroDialise = (overrides = {}) => ({
  ...testData.registroDialise.registro1,
  ...overrides
});

// Mock de resultados de queries
const createQueryResult = (rows = [], rowCount = null) => ({
  rows,
  rowCount: rowCount !== null ? rowCount : rows.length,
  command: 'SELECT',
  fields: []
});

module.exports = {
  testData,
  createMockUser,
  createMockPaciente,
  createMockMedico,
  createMockRegistroDialise,
  createQueryResult
};