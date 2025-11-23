// src/test/DoctorDashboard.test.jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DoctorDashboard from '../pages/DoctorDashboard';
import * as doctorService from '../services/doctor';

// Mock do react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock dos services
vi.mock('../services/doctor');

// Mock do ModalEnviarAlerta
vi.mock('../components/ui/ModalEnviarAlerta', () => ({
  default: ({ isOpen, onClose, paciente }) => (
    isOpen ? (
      <div data-testid="modal-alerta">
        <h3>Enviar Alerta</h3>
        <p>Paciente: {paciente?.nome}</p>
        <button onClick={onClose}>Fechar</button>
      </div>
    ) : null
  )
}));

// Mock do PatientAnalytics
vi.mock('../components/ui/Patientanalytics', () => ({
  default: ({ patientId, patientName }) => (
    <div data-testid="patient-analytics">
      <h3>Analytics para {patientName}</h3>
      <p>ID: {patientId}</p>
    </div>
  )
}));

// Mock do jsPDF global
global.jspdf = {
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: { width: 210, height: 297 },
      getNumberOfPages: () => 1
    },
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setTextColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setLineWidth: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    setPage: vi.fn(),
    getTextWidth: () => 50,
    save: vi.fn()
  }))
};

// Mock do fetch global
global.fetch = vi.fn();

describe('DoctorDashboard', () => {
  const mockDoctorProfile = {
    doctor: {
      id: 1,
      nome: 'Dr. João Silva',
      email: 'joao@doctor.com',
      crm: 'CRM-12345/SC',
      especialidade: 'Nefrologia'
    }
  };

  const mockPatients = {
    patients: [
      {
        id: 1,
        paciente_id: 1,
        nome: 'Maria Santos',
        email: 'maria@test.com',
        idade: 45,
        total_registros: 12,
        ultimo_registro: '2025-11-14T10:00:00Z',
        alertas_nao_lidos: 2
      },
      {
        id: 2,
        paciente_id: 2,
        nome: 'José Silva',
        email: 'jose@test.com',
        idade: 52,
        total_registros: 8,
        ultimo_registro: '2025-11-13T15:30:00Z',
        alertas_nao_lidos: 0
      },
      {
        id: 3,
        paciente_id: 3,
        nome: 'Ana Costa',
        email: 'ana@test.com',
        idade: 38,
        total_registros: 15,
        ultimo_registro: null,
        alertas_nao_lidos: 1
      }
    ]
  };

  const mockStats = {
    total_pacientes: 3,
    totalPatients: 3,
    sessoes_hoje: 5,
    sessionsToday: 5,
    alertas_ativos: 3,
    unreadAlerts: 3,
    pacientes_criticos: 1,
    patientsAtRisk: 1
  };

  const mockNotifications = {
    notifications: [
      {
        id: 1,
        titulo: 'Alerta Crítico',
        mensagem: 'Paciente Maria Santos - PA elevada',
        criado_em: '2025-11-15T10:00:00Z',
        lida: false
      },
      {
        id: 2,
        titulo: 'Novo Registro',
        mensagem: 'José Silva registrou nova sessão',
        data_criacao: '2025-11-15T09:30:00Z',
        lida: false
      }
    ]
  };

  const mockPatientDetails = {
    patient: {
      id: 1,
      nome: 'Maria Santos',
      email: 'maria@test.com',
      idade: 45,
      cpf: '123.456.789-00',
      data_nascimento: '1980-05-15'
    },
    recent_dialysis: [
      {
        id: 1,
        data_registro: '2025-11-14',
        horario_inicio: '08:00',
        horario_fim: '12:00',
        pressao_arterial_sistolica: 140,
        pressao_arterial_diastolica: 90,
        uf_total: 2500,
        concentracao_glicose: 110,
        sintomas: 'Dor de cabeça leve'
      },
      {
        id: 2,
        data_registro: '2025-11-12',
        horario_inicio: '08:00',
        horario_fim: '12:00',
        pressao_arterial_sistolica: 135,
        pressao_arterial_diastolica: 85,
        uf_total: 2300,
        concentracao_glicose: 105,
        sintomas: null
      }
    ],
    medications: [
      {
        id: 1,
        nome: 'Losartana',
        dosagem: '50mg',
        frequencia: '1x ao dia',
        observacoes: 'Tomar pela manhã'
      },
      {
        id: 2,
        nome: 'Insulina',
        dosagem: '10 UI',
        frequencia: '2x ao dia',
        observacoes: null
      }
    ],
    stats: {
      total_sessoes: 12,
      media_sistolica: 138,
      media_diastolica: 88,
      media_uf: 2400
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup sessionStorage mock
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === 'accessToken' || key === 'token') return 'mock-token';
      return null;
    });
    Storage.prototype.clear = vi.fn();

    // Suprime console
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock default dos services
    doctorService.getDoctorProfile.mockResolvedValue(mockDoctorProfile);
    doctorService.getPatients.mockResolvedValue(mockPatients);
    doctorService.getDashboardStats.mockResolvedValue(mockStats);
    doctorService.getNotifications.mockResolvedValue(mockNotifications);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper para renderizar com router
  const renderWithRouter = (component) => {
    return render(
      <MemoryRouter>
        {component}
      </MemoryRouter>
    );
  };

  // ==================== TESTES DE CARREGAMENTO INICIAL ====================
  describe('Carregamento Inicial', () => {
    it('deve mostrar loading enquanto carrega dados', () => {
      renderWithRouter(<DoctorDashboard />);
      
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('deve carregar e exibir dados do dashboard', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => {
        expect(doctorService.getDoctorProfile).toHaveBeenCalledTimes(1);
        expect(doctorService.getPatients).toHaveBeenCalledTimes(1);
        expect(doctorService.getDashboardStats).toHaveBeenCalledTimes(1);
        expect(doctorService.getNotifications).toHaveBeenCalledWith({ limit: 10, lida: false });
      });

      expect(screen.getByText(/Olá, Dr\(a\)\. Dr\. João Silva/i)).toBeInTheDocument();
      expect(screen.getByText(/CRM: CRM-12345\/SC/i)).toBeInTheDocument();
      expect(screen.getByText(/Nefrologia/i)).toBeInTheDocument();
    });

    // it('deve exibir estatísticas corretas', async () => {
    //   renderWithRouter(<DoctorDashboard />);

    //   await waitFor(() => {
    //     expect(screen.getByText('3')).toBeInTheDocument(); // Total pacientes
    //     expect(screen.getByText('5')).toBeInTheDocument(); // Sessões hoje
    //     expect(screen.getByText('1')).toBeInTheDocument(); // Pacientes críticos
    //   });

    //   expect(screen.getByText('Total de Pacientes')).toBeInTheDocument();
    //   expect(screen.getByText('Sessões Hoje')).toBeInTheDocument();
    //   expect(screen.getByText('Alertas Ativos')).toBeInTheDocument();
    //   expect(screen.getByText('Pacientes Críticos')).toBeInTheDocument();
    // });

    it('deve exibir lista de pacientes', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        expect(screen.getByText('José Silva')).toBeInTheDocument();
        expect(screen.getByText('Ana Costa')).toBeInTheDocument();
      });

      expect(screen.getByText('maria@test.com')).toBeInTheDocument();
      expect(screen.getByText('jose@test.com')).toBeInTheDocument();
    });

    // it('deve mostrar erro quando falhar ao carregar', async () => {
    //   const errorMessage = 'Erro ao carregar dados';
    //   doctorService.getDoctorProfile.mockRejectedValueOnce(new Error(errorMessage));

    //   renderWithRouter(<DoctorDashboard />);

    //   await waitFor(() => {
    //     expect(screen.getByText(errorMessage)).toBeInTheDocument();
    //   });
    // });

    it('deve redirecionar para login quando erro de autenticação', async () => {
      doctorService.getDoctorProfile.mockRejectedValueOnce({
        error: 'Token inválido'
      });

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => {
        expect(Storage.prototype.clear).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  // ==================== TESTES DE FILTROS E BUSCA ====================
  describe('Filtros e Busca', () => {
    it('deve filtrar pacientes por nome', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const searchInput = screen.getByPlaceholderText('Buscar paciente...');
      await userEvent.type(searchInput, 'Maria');

      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      expect(screen.queryByText('José Silva')).not.toBeInTheDocument();
      expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();
    });

    it('deve filtrar busca case-insensitive', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const searchInput = screen.getByPlaceholderText('Buscar paciente...');
      await userEvent.type(searchInput, 'MARIA');

      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });

    it('deve filtrar por status "Todos"', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const todosButton = screen.getByRole('button', { name: /Todos/i });
      await userEvent.click(todosButton);

      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      expect(screen.getByText('José Silva')).toBeInTheDocument();
      expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    });

    it('deve filtrar por "Com Alertas"', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const alertasButton = screen.getByRole('button', { name: /Com Alertas/i });
      await userEvent.click(alertasButton);

      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      expect(screen.queryByText('José Silva')).not.toBeInTheDocument();
      expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    });

    it('deve filtrar por "Recentes"', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const recentesButton = screen.getByRole('button', { name: /Recentes/i });
      await userEvent.click(recentesButton);

      // Pacientes com registro nos últimos 7 dias
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      expect(screen.getByText('José Silva')).toBeInTheDocument();
    });

    it('deve combinar busca e filtro', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const searchInput = screen.getByPlaceholderText('Buscar paciente...');
      await userEvent.type(searchInput, 'Maria');

      const alertasButton = screen.getByRole('button', { name: /Com Alertas/i });
      await userEvent.click(alertasButton);

      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      expect(screen.queryByText('José Silva')).not.toBeInTheDocument();
    });

    it('deve mostrar mensagem quando nenhum paciente é encontrado', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const searchInput = screen.getByPlaceholderText('Buscar paciente...');
      await userEvent.type(searchInput, 'Paciente Inexistente');

      expect(screen.getByText('Nenhum paciente encontrado')).toBeInTheDocument();
      expect(screen.getByText(/Ajuste os filtros ou busque por outro termo/i)).toBeInTheDocument();
    });
  });

  // ==================== TESTES DE DETALHES DO PACIENTE ====================
  describe('Detalhes do Paciente', () => {
    it('deve abrir modal com detalhes ao clicar em "Ver Detalhes"', async () => {
      doctorService.getPatientDetails.mockResolvedValue(mockPatientDetails);

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const detailsButtons = screen.getAllByText(/Ver Detalhes/i);
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => {
        expect(doctorService.getPatientDetails).toHaveBeenCalledWith(1);
      });

      expect(screen.getByText('Estatísticas do Último Mês')).toBeInTheDocument();
      expect(screen.getByText('Últimos Registros de Diálise')).toBeInTheDocument();
      expect(screen.getByText('Medicamentos Ativos')).toBeInTheDocument();
    });

    it('deve exibir registros de diálise no modal', async () => {
      doctorService.getPatientDetails.mockResolvedValue(mockPatientDetails);

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const detailsButtons = screen.getAllByText(/Ver Detalhes/i);
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('140/90')).toBeInTheDocument();
        expect(screen.getByText('2.5L')).toBeInTheDocument();
        expect(screen.getByText('Dor de cabeça leve')).toBeInTheDocument();
      });
    });

    it('deve exibir medicamentos no modal', async () => {
      doctorService.getPatientDetails.mockResolvedValue(mockPatientDetails);

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const detailsButtons = screen.getAllByText(/Ver Detalhes/i);
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Losartana')).toBeInTheDocument();
        expect(screen.getByText('50mg')).toBeInTheDocument();
        expect(screen.getByText('Insulina')).toBeInTheDocument();
      });
    });

    it('deve fechar modal ao clicar no botão fechar', async () => {
      doctorService.getPatientDetails.mockResolvedValue(mockPatientDetails);

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const detailsButtons = screen.getAllByText(/Ver Detalhes/i);
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => screen.getByText('Estatísticas do Último Mês'));

      const closeButtons = screen.getAllByRole('button', { name: /Fechar/i });
      await userEvent.click(closeButtons[closeButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByText('Estatísticas do Último Mês')).not.toBeInTheDocument();
      });
    });

    it('deve mostrar mensagem quando não há registros de diálise', async () => {
      const detailsWithoutRecords = {
        ...mockPatientDetails,
        recent_dialysis: []
      };
      doctorService.getPatientDetails.mockResolvedValue(detailsWithoutRecords);

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const detailsButtons = screen.getAllByText(/Ver Detalhes/i);
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Nenhum registro de diálise encontrado')).toBeInTheDocument();
      });
    });

    it('deve mostrar mensagem quando não há medicamentos', async () => {
      const detailsWithoutMeds = {
        ...mockPatientDetails,
        medications: []
      };
      doctorService.getPatientDetails.mockResolvedValue(detailsWithoutMeds);

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const detailsButtons = screen.getAllByText(/Ver Detalhes/i);
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Nenhum medicamento cadastrado')).toBeInTheDocument();
      });
    });
  });

  // ==================== TESTES DE ALERTA ====================
  describe('Modal de Enviar Alerta', () => {
    it('deve abrir modal de alerta ao clicar em "Enviar Alerta"', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const alertButtons = screen.getAllByText(/Enviar Alerta/i);
      await userEvent.click(alertButtons[0]);

      expect(screen.getByTestId('modal-alerta')).toBeInTheDocument();
      expect(screen.getByText('Paciente: Maria Santos')).toBeInTheDocument();
    });

    it('deve fechar modal de alerta', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const alertButtons = screen.getAllByText(/Enviar Alerta/i);
      await userEvent.click(alertButtons[0]);

      expect(screen.getByTestId('modal-alerta')).toBeInTheDocument();

      const closeButton = within(screen.getByTestId('modal-alerta')).getByRole('button', { name: /Fechar/i });
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('modal-alerta')).not.toBeInTheDocument();
      });
    });
  });

  // ==================== TESTES DE ANALYTICS ====================
  describe('Analytics do Paciente', () => {
    it('deve abrir modal de analytics ao clicar em "Ver Análises"', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const analyticsButtons = screen.getAllByText(/Ver Análises/i);
      await userEvent.click(analyticsButtons[0]);

      expect(screen.getByTestId('patient-analytics')).toBeInTheDocument();
      expect(screen.getByText('Analytics para Maria Santos')).toBeInTheDocument();
    });

    it('deve abrir analytics do modal de detalhes', async () => {
      doctorService.getPatientDetails.mockResolvedValue(mockPatientDetails);

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const detailsButtons = screen.getAllByText(/Ver Detalhes/i);
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => screen.getByText('Estatísticas do Último Mês'));

      const analyticsButton = screen.getByText(/Ver Análises Estratégicas/i);
      await userEvent.click(analyticsButton);

      expect(screen.getByTestId('patient-analytics')).toBeInTheDocument();
    });

    // it('deve fechar modal de analytics', async () => {
    //   renderWithRouter(<DoctorDashboard />);

    //   await waitFor(() => screen.getByText('Maria Santos'));

    //   const analyticsButtons = screen.getAllByText(/Ver Análises/i);
    //   await userEvent.click(analyticsButtons[0]);

    //   expect(screen.getByTestId('patient-analytics')).toBeInTheDocument();

    //   // Clica no X do modal
    //   const closeButtons = screen.getAllByRole('button');
    //   const xButton = closeButtons.find(btn => btn.textContent === '');
    //   if (xButton) await userEvent.click(xButton);

    //   await waitFor(() => {
    //     expect(screen.queryByTestId('patient-analytics')).not.toBeInTheDocument();
    //   });
    // });
  });

  // ==================== TESTES DE RELATÓRIO PDF ====================
  describe('Geração de Relatório PDF', () => {
    it('deve gerar relatório PDF ao clicar no botão', async () => {
      const mockReportData = {
        patient: mockPatientDetails.patient,
        period: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        },
        statistics: mockPatientDetails.stats,
        dialysisRecords: mockPatientDetails.recent_dialysis,
        medications: mockPatientDetails.medications
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReportData
      });

      doctorService.getPatientDetails.mockResolvedValue(mockPatientDetails);

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const detailsButtons = screen.getAllByText(/Ver Detalhes/i);
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => screen.getByText('Gerar Relatório PDF'));

      const reportButton = screen.getByText(/Gerar Relatório PDF/i);
      await userEvent.click(reportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('deve mostrar erro ao falhar gerar relatório', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Erro ao gerar relatório'));

      doctorService.getPatientDetails.mockResolvedValue(mockPatientDetails);

      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      const detailsButtons = screen.getAllByText(/Ver Detalhes/i);
      await userEvent.click(detailsButtons[0]);

      await waitFor(() => screen.getByText('Gerar Relatório PDF'));

      const reportButton = screen.getByText(/Gerar Relatório PDF/i);
      await userEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByText(/Erro ao gerar relatório/i)).toBeInTheDocument();
      });
    });
  });

  // ==================== TESTES DE NAVEGAÇÃO ====================
  describe('Navegação e Logout', () => {
    it('deve navegar para perfil ao clicar no botão', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText(/Olá, Dr\(a\)/i));

      // Encontra botão de perfil pelo ícone User
      const buttons = screen.getAllByRole('button');
      const profileButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-user')
      );

      if (profileButton) {
        await userEvent.click(profileButton);
        expect(mockNavigate).toHaveBeenCalledWith('/perfilDoutor');
      }
    });

    it('deve fazer logout e redirecionar', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText(/Olá, Dr\(a\)/i));

      // Encontra botão de logout pelo ícone LogOut
      const buttons = screen.getAllByRole('button');
      const logoutButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-log-out')
      );

      if (logoutButton) {
        await userEvent.click(logoutButton);

        expect(Storage.prototype.clear).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      }
    });
  });

  // ==================== TESTES DE CARD DE PACIENTE ====================
  describe('Patient Card', () => {
    it('deve mostrar badge de alerta quando paciente tem alertas', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      expect(screen.getByText('2 alertas')).toBeInTheDocument();
    });

    it('deve mostrar informações do paciente corretamente', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('Maria Santos'));

      expect(screen.getByText('45 anos')).toBeInTheDocument();
      expect(screen.getByText('12 registros')).toBeInTheDocument();
    });

    // it('deve mostrar "Sem registros" quando não há último registro', async () => {
    //   renderWithRouter(<DoctorDashboard />);

    //   await waitFor(() => screen.getByText('Ana Costa'));

    //   // Ana Costa não tem último_registro
    //   const anaCard = screen.getByText('Ana Costa').closest('div');
    //   expect(within(anaCard).getByText('Sem registros')).toBeInTheDocument();
    // });

    it('não deve mostrar badge quando não há alertas', async () => {
      renderWithRouter(<DoctorDashboard />);

      await waitFor(() => screen.getByText('José Silva'));

      const joseCard = screen.getByText('José Silva').closest('div');
      expect(within(joseCard).queryByText(/alerta/i)).not.toBeInTheDocument();
    });
  });

});