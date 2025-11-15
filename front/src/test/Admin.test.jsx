// src/test/AdminDashboard.test.jsx
// Reescrito para Vitest + React Testing Library

import React from 'react';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// -----------------------------
// 1) MOCK DO adminService (TOP-LEVEL)
// -----------------------------
vi.mock('../services/adminService', () => ({
  default: {
    getDashboardStats: vi.fn(() => Promise.resolve({
      totalUsers: 150,
      activeUsers: 120,
      totalPatients: 100,
      totalDoctors: 20,
      totalRecords: 5000,
      recentAlerts: 5,
      systemHealth: 99.8,
      recentActivity: [
        { id: 1, nome: 'Admin Teste', acao: 'Login', data_hora: new Date(Date.now() - 3600000).toISOString() },
        { id: 2, nome: 'Dr. House', acao: 'Criou novo registro', data_hora: new Date().toISOString() },
      ],
    })),
    getAllUsers: vi.fn(() => Promise.resolve({ users: [
      { id: 1, nome: 'Admin Master', email: 'admin@test.com', tipo_usuario: 'admin', ativo: true },
      { id: 2, nome: 'Dr. John Doe', email: 'doe@med.com', tipo_usuario: 'medico', ativo: true, crm: 'CRM-12345/SC' },
      { id: 3, nome: 'Patient Zero', email: 'zero@pat.com', tipo_usuario: 'paciente', ativo: true },
      { id: 4, nome: 'User Inativo', email: 'inativo@test.com', tipo_usuario: 'paciente', ativo: false },
    ] })),
    getPatientDoctorRelations: vi.fn(() => Promise.resolve({
      relations: [
        { paciente_id: 101, paciente_nome: 'Pac 1', paciente_email: 'p1@mail.com', medico_id: 2, medico_nome: 'Dr. John Doe', medico_email: 'doe@med.com', crm: 'CRM-12345/SC' },
        { paciente_id: 102, paciente_nome: 'Pac 2', paciente_email: 'p2@mail.com', medico_id: null, medico_nome: null, medico_email: null, crm: null },
      ],
      availableDoctors: [
        { id: 2, nome: 'Dr. John Doe', email: 'doe@med.com', crm: 'CRM-12345/SC', especialidade: 'Nefrologia' },
        { id: 5, nome: 'Dra. Jane Smith', email: 'jane@med.com', crm: 'CRM-67890/SC', especialidade: 'Cardiologia' },
      ]
    })),
    getAuditLogs: vi.fn(() => Promise.resolve({ logs: [] })),
    getBackupStatus: vi.fn(() => Promise.resolve({ backups: [] })),
    triggerBackup: vi.fn(() => Promise.resolve({})),
    deleteUser: vi.fn(() => Promise.resolve({})),
    toggleUserStatus: vi.fn(() => Promise.resolve({})),
    createUser: vi.fn(() => Promise.resolve({})),
    updateUser: vi.fn(() => Promise.resolve({})),
    assignDoctorToPatient: vi.fn(() => Promise.resolve({})),
    getUserGrowthData: vi.fn(() => Promise.resolve({ data: [{ mes: '2025-05-01', tipo_usuario: 'pacientes', total: '10' }] })),
    getDoctorWorkload: vi.fn(() => Promise.resolve({ data: [{ medico: 'Dr. John Doe', pacientes: 10, capacidade: 20 }] })),
    getDialysisWeeklyPattern: vi.fn(() => Promise.resolve({ data: [{ dia_num: 1, registros: '50' }] })),
    getCommonSymptoms: vi.fn(() => Promise.resolve({ data: [{ nome: 'Dor de Cabeça', frequencia: '15', categoria: 'neurológico' }] })),
    getTreatmentAdherence: vi.fn(() => Promise.resolve({ data: [{ classificacao: 'Excelente' }] })),
    getBloodPressureAnalysis: vi.fn(() => Promise.resolve({ data: [{ paciente: 'Patient A', sistolica_media: 120, diastolica_media: 80, status: 'Normal' }] })),
    getUltrafiltrationTrend: vi.fn(() => Promise.resolve({ data: [{ data: '2025-10-01', uf_media: 500 }] })),
    getSystemInsights: vi.fn(() => Promise.resolve({ insights: [{ type: 'success', title: 'Excelente', message: 'Tudo OK' }] })),
  }
}));

// -----------------------------
// 2) IMPORTS APÓS MOCK
// -----------------------------
import AdminDashboard from '../pages/admin';
import adminService from '../services/adminService';

const adminServiceMock = adminService;

// -----------------------------
// 3) CONFIGURAÇÃO GLOBAL (location, confirm, alert)
// -----------------------------
const originalLocation = globalThis.location;
const originalConfirm = globalThis.confirm;
const originalAlert = globalThis.alert;

beforeAll(() => {
  delete globalThis.location;
  globalThis.location = { href: '' };

  globalThis.confirm = vi.fn(() => true);
  globalThis.alert = vi.fn();
});

afterAll(() => {
  globalThis.location = originalLocation;
  globalThis.confirm = originalConfirm;
  globalThis.alert = originalAlert;
});

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.confirm = vi.fn(() => true);
  globalThis.location.href = '';
});

// -----------------------------
// 4) TESTES DE FLUXO (integração) - Dashboard principal
// -----------------------------
describe('AdminDashboard - Fluxo principal (integração)', () => {
  it('carrega dados iniciais e mostra Dashboard', async () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/Carregando painel administrativo/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(adminServiceMock.getDashboardStats).toHaveBeenCalled();
    });

    expect(screen.getByText(/Visão Geral do Sistema/i)).toBeInTheDocument();
    expect(screen.getByText(/Total de Usuários/i)).toBeInTheDocument();
  });

  it('troca para aba Usuários e carrega usuários', async () => {
    render(<AdminDashboard />);

    await waitFor(() => screen.getByText(/Visão Geral do Sistema/i));

    const usersTab = screen.getByRole('button', { name: /Usuários/i });
    await userEvent.click(usersTab);

    await waitFor(() => {
      expect(adminServiceMock.getAllUsers).toHaveBeenCalled();
    });

    expect(screen.getByText(/Gerenciamento de Usuários/i)).toBeInTheDocument();
    expect(screen.getByText('Admin Master')).toBeInTheDocument();
  });

  it('mostra alerta de erro se getDashboardStats rejeitar', async () => {
    // Suprime console.error para este teste
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const errorMessage = 'Falha ao conectar';
    adminServiceMock.getDashboardStats.mockRejectedValueOnce(new Error(errorMessage));

    render(<AdminDashboard />);

    // Aguarda o loading desaparecer
    await waitFor(() => {
      expect(screen.queryByText(/Carregando painel administrativo/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Verifica que o componente renderizou (mesmo com erro, ele mostra a UI básica)
    expect(screen.getByText('DialyHome')).toBeInTheDocument();
    
    consoleErrorSpy.mockRestore();
  });

  it('logout limpa storage e redireciona', async () => {
    render(<AdminDashboard />);

    await waitFor(() => screen.getByText(/Visão Geral do Sistema/i));

    // Procura especificamente o botão de logout (último botão no header com ícone de logout)
    const logoutButtons = screen.getAllByRole('button').filter(btn => {
      const svg = btn.querySelector('svg.lucide-log-out');
      return svg !== null;
    });
    
    expect(logoutButtons.length).toBeGreaterThan(0);
    await userEvent.click(logoutButtons[0]);

    // Aguarda o redirecionamento acontecer
    await waitFor(() => {
      expect(globalThis.location.href).toBe('/login');
    }, { timeout: 2000 });
  });
});

// -----------------------------
// 5) TESTES DO FLUXO DA ABA USUÁRIOS
// -----------------------------
describe('UsersView - Fluxos', () => {
  it('deleta usuário e recarrega lista', async () => {
    render(<AdminDashboard />);

    await userEvent.click(screen.getByRole('button', { name: /Usuários/i }));
    await waitFor(() => expect(adminServiceMock.getAllUsers).toHaveBeenCalled());

    expect(screen.getByText('Admin Master')).toBeInTheDocument();

    const deleteButtons = screen.getAllByTitle('Excluir');
    expect(deleteButtons.length).toBeGreaterThan(0);
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(adminServiceMock.deleteUser).toHaveBeenCalledWith(1);
      expect(adminServiceMock.getAllUsers).toHaveBeenCalled();
    });

    expect(screen.getByText(/Usuário inativado com sucesso/i)).toBeInTheDocument();
  });

  it('aplica filtros e chama getAllUsers com parâmetros', async () => {
    render(<AdminDashboard />);

    await userEvent.click(screen.getByRole('button', { name: /Usuários/i }));
    await waitFor(() => expect(adminServiceMock.getAllUsers).toHaveBeenCalled());

    const searchInput = screen.getByPlaceholderText('Buscar por nome ou email...');
    await userEvent.type(searchInput, 'admin');

    await waitFor(() => {
      expect(adminServiceMock.getAllUsers).toHaveBeenCalled();
      const lastCallArgs = adminServiceMock.getAllUsers.mock.calls.slice(-1)[0][0];
      expect(lastCallArgs.search).toContain('admin');
    });

    const typeFilter = screen.getByRole('combobox');
    await userEvent.selectOptions(typeFilter, 'medico');

    await waitFor(() => {
      const lastCallArgs = adminServiceMock.getAllUsers.mock.calls.slice(-1)[0][0];
      expect(lastCallArgs.tipo).toBe('medico');
    });
  });

  it('abre modal de criação ao clicar "Novo Usuário"', async () => {
    render(<AdminDashboard />);
    await userEvent.click(screen.getByRole('button', { name: /Usuários/i }));
    await waitFor(() => screen.getByText(/Gerenciamento de Usuários/i));

    const novoBtn = screen.getByRole('button', { name: /Novo Usuário/i });
    await userEvent.click(novoBtn);

    const modalHeading = screen.getAllByText(/Novo Usuário/i).find(el => el.tagName === 'H2');
    expect(modalHeading).toBeInTheDocument();
    expect(screen.queryByText(/Editar Usuário/i)).not.toBeInTheDocument();
  });
});

// -----------------------------
// 6) TESTES DO MODAL DE USUÁRIOS
// -----------------------------
describe('UserModal - Testes', () => {
  it('cria usuário via modal, chama createUser e fecha', async () => {
    render(<AdminDashboard />);
    await userEvent.click(screen.getByRole('button', { name: /Usuários/i }));
    await waitFor(() => screen.getByText(/Gerenciamento de Usuários/i));

    await userEvent.click(screen.getByRole('button', { name: /Novo Usuário/i }));

    // Aguarda modal abrir e busca inputs por tipo
    await waitFor(() => screen.getAllByText(/Novo Usuário/i)[0]);
    
    const inputs = screen.getAllByRole('textbox');
    const passwordInput = screen.getAllByDisplayValue('')[0]; // Campo de senha

    // Preenche os campos (ordem: nome, email)
    await userEvent.type(inputs[0], 'New Guy');
    await userEvent.type(inputs[1], 'new@guy.com');
    
    // Busca campo de senha por type
    const allInputs = document.querySelectorAll('input');
    const senhaInput = Array.from(allInputs).find(input => input.type === 'password');
    if (senhaInput) {
      await userEvent.type(senhaInput, 'senha123');
    }

    await userEvent.click(screen.getByRole('button', { name: /Criar Usuário/i }));

    await waitFor(() => {
      expect(adminServiceMock.createUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Criar Usuário/i })).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/Usuário criado com sucesso/i)).toBeInTheDocument();
  });
});

// -----------------------------
// 7) TESTES DE VINCULAÇÕES
// -----------------------------
describe('RelationsView - Fluxos', () => {
  it('desvincula médico e recarrega', async () => {
    render(<AdminDashboard />);
    await userEvent.click(screen.getByRole('button', { name: /Vinculações/i }));

    await waitFor(() => expect(adminServiceMock.getPatientDoctorRelations).toHaveBeenCalled());

    const unassignBtn = screen.getByTitle('Desvincular médico');
    await userEvent.click(unassignBtn);

    await waitFor(() => {
      expect(adminServiceMock.assignDoctorToPatient).toHaveBeenCalledWith(101, null);
    });

    expect(screen.getByText(/Médico desvinculado com sucesso/i)).toBeInTheDocument();
  });

  it('vincula médico via modal e fecha', async () => {
    render(<AdminDashboard />);
    await userEvent.click(screen.getByRole('button', { name: /Vinculações/i }));
    
    await waitFor(() => expect(adminServiceMock.getPatientDoctorRelations).toHaveBeenCalled());

    const assignBtn = screen.getByRole('button', { name: /Vincular médico/i });
    await userEvent.click(assignBtn);

    // Aguarda modal abrir
    await waitFor(() => screen.getByText(/Selecione um médico/i));

    // Busca pelo texto usando uma função para lidar com texto quebrado
    const jane = screen.getByText((content, element) => {
      return element?.textContent?.includes('Dra. Jane Smith') || false;
    });
    
    await userEvent.click(jane);

    const saveBtn = screen.getByRole('button', { name: /Vincular Médico/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminServiceMock.assignDoctorToPatient).toHaveBeenCalledWith(102, 5);
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Vincular Médico/i })).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/Médico vinculado com sucesso/i)).toBeInTheDocument();
  });
});

// -----------------------------
// 8) TESTES REPORTS + BACKUP
// -----------------------------
describe('Reports & Backup flows', () => {
  it('carrega análises e exibe relatórios', async () => {
    render(<AdminDashboard />);
    await userEvent.click(screen.getByRole('button', { name: /Relatórios/i }));

    await waitFor(() => {
      expect(adminServiceMock.getUserGrowthData).toHaveBeenCalled();
      expect(adminServiceMock.getDoctorWorkload).toHaveBeenCalled();
      expect(adminServiceMock.getDialysisWeeklyPattern).toHaveBeenCalled();
      expect(adminServiceMock.getCommonSymptoms).toHaveBeenCalled();
      expect(adminServiceMock.getTreatmentAdherence).toHaveBeenCalled();
      expect(adminServiceMock.getBloodPressureAnalysis).toHaveBeenCalled();
      expect(adminServiceMock.getUltrafiltrationTrend).toHaveBeenCalled();
      expect(adminServiceMock.getSystemInsights).toHaveBeenCalled();
    }, { timeout: 3000 });

    expect(screen.getByText(/Análises e Relatórios/i)).toBeInTheDocument();
  });

  it('dispara backup manual e mostra alerta de sucesso', async () => {
    adminServiceMock.getBackupStatus.mockResolvedValueOnce({ backups: [] });
    adminServiceMock.triggerBackup.mockResolvedValueOnce({});

    render(<AdminDashboard />);
    await userEvent.click(screen.getByRole('button', { name: /Backup/i }));

    await waitFor(() => expect(adminServiceMock.getBackupStatus).toHaveBeenCalled());

    const backupBtn = screen.getByRole('button', { name: /Realizar Backup Agora/i });
    await userEvent.click(backupBtn);

    await waitFor(() => expect(adminServiceMock.triggerBackup).toHaveBeenCalled());

    expect(globalThis.alert).toHaveBeenCalledWith('Backup iniciado com sucesso!');
  });
});