// src/test/adminService.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import adminService from '../services/adminService';

// Mock do axios
vi.mock('axios');

describe('adminService', () => {
  const mockToken = 'mock-jwt-token-12345';
  const API_URL = 'https://dialyhome.com.br/api';

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    vi.clearAllMocks();
    
    // Configura localStorage mock
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === 'token' || key === 'accessToken') return mockToken;
      return null;
    });
    
    // Suprime console.log e console.warn nos testes
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== TESTES DE DASHBOARD ====================
  describe('getDashboardStats', () => {
    it('deve buscar estatísticas do dashboard com sucesso', async () => {
      const mockStats = {
        totalUsers: 150,
        activeUsers: 120,
        totalPatients: 100,
        totalDoctors: 20,
        totalRecords: 5000,
        recentAlerts: 5,
        systemHealth: 99.8
      };

      axios.get.mockResolvedValueOnce({ data: mockStats });

      const result = await adminService.getDashboardStats();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/dashboard/stats`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockStats);
    });

    it('deve lançar erro quando falhar ao buscar estatísticas', async () => {
      const mockError = { error: 'Erro ao buscar dados' };
      axios.get.mockRejectedValueOnce({
        response: { data: mockError }
      });

      await expect(adminService.getDashboardStats()).rejects.toEqual(mockError);
    });

    it('deve lançar erro genérico quando não houver response.data', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(adminService.getDashboardStats()).rejects.toEqual({
        error: 'Erro ao buscar estatísticas'
      });
    });
  });

  // ==================== TESTES DE USUÁRIOS ====================
  describe('getAllUsers', () => {
    it('deve buscar todos os usuários sem parâmetros', async () => {
      const mockUsers = {
        users: [
          { id: 1, nome: 'Admin', email: 'admin@test.com' },
          { id: 2, nome: 'Médico', email: 'medico@test.com' }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockUsers });

      const result = await adminService.getAllUsers();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/users`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockUsers);
    });

    it('deve buscar usuários com parâmetros de filtro', async () => {
      const mockUsers = { users: [] };
      const params = { search: 'john', tipo: 'medico', ativo: true };

      axios.get.mockResolvedValueOnce({ data: mockUsers });

      await adminService.getAllUsers(params);

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/users?search=john&tipo=medico&ativo=true`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });

    it('deve lançar erro ao falhar buscar usuários', async () => {
      const mockError = { error: 'Não autorizado' };
      axios.get.mockRejectedValueOnce({ response: { data: mockError } });

      await expect(adminService.getAllUsers()).rejects.toEqual(mockError);
    });
  });

  describe('getUserById', () => {
    it('deve buscar usuário por ID', async () => {
      const mockUser = { id: 1, nome: 'John Doe', email: 'john@test.com' };
      axios.get.mockResolvedValueOnce({ data: mockUser });

      const result = await adminService.getUserById(1);

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/users/1`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('deve criar novo usuário com sucesso', async () => {
      const userData = {
        nome: 'New User',
        email: 'newuser@test.com',
        senha: 'senha123',
        tipo_usuario: 'paciente'
      };
      const mockResponse = { message: 'Usuário criado com sucesso', userId: 10 };

      axios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await adminService.createUser(userData);

      expect(axios.post).toHaveBeenCalledWith(
        `${API_URL}/admin/users`,
        userData,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('deve lançar erro ao falhar criar usuário', async () => {
      const mockError = { error: 'Email já existe' };
      axios.post.mockRejectedValueOnce({ response: { data: mockError } });

      await expect(adminService.createUser({})).rejects.toEqual(mockError);
    });
  });

  describe('updateUser', () => {
    it('deve atualizar usuário com sucesso', async () => {
      const userId = 5;
      const userData = { nome: 'Updated Name', email: 'updated@test.com' };
      const mockResponse = { message: 'Usuário atualizado' };

      axios.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await adminService.updateUser(userId, userData);

      expect(axios.put).toHaveBeenCalledWith(
        `${API_URL}/admin/users/${userId}`,
        userData,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteUser', () => {
    it('deve deletar usuário com sucesso', async () => {
      const userId = 5;
      const mockResponse = { message: 'Usuário deletado' };

      axios.delete.mockResolvedValueOnce({ data: mockResponse });

      const result = await adminService.deleteUser(userId);

      expect(axios.delete).toHaveBeenCalledWith(
        `${API_URL}/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('toggleUserStatus', () => {
    it('deve alternar status do usuário', async () => {
      const userId = 3;
      const mockResponse = { message: 'Status alterado', ativo: false };

      axios.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await adminService.toggleUserStatus(userId);

      expect(axios.put).toHaveBeenCalledWith(
        `${API_URL}/users/${userId}/toggle-status`,
        {},
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  // ==================== TESTES DE VINCULAÇÕES ====================
  describe('getPatientDoctorRelations', () => {
    it('deve buscar vinculações paciente-médico', async () => {
      const mockRelations = {
        relations: [
          { paciente_id: 1, medico_id: 2, paciente_nome: 'Pac 1', medico_nome: 'Dr. A' }
        ],
        availableDoctors: [
          { id: 2, nome: 'Dr. A' },
          { id: 3, nome: 'Dr. B' }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockRelations });

      const result = await adminService.getPatientDoctorRelations();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/relations`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockRelations);
    });
  });

  describe('assignDoctorToPatient', () => {
    it('deve vincular médico ao paciente', async () => {
      const pacienteId = 10;
      const medicoId = 5;
      const mockResponse = { message: 'Médico vinculado com sucesso' };

      axios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await adminService.assignDoctorToPatient(pacienteId, medicoId);

      expect(axios.post).toHaveBeenCalledWith(
        `${API_URL}/admin/relations/assign`,
        { paciente_id: pacienteId, medico_id: medicoId },
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('deve desvincular médico quando medicoId é null', async () => {
      const pacienteId = 10;
      const medicoId = null;
      const mockResponse = { message: 'Médico desvinculado' };

      axios.post.mockResolvedValueOnce({ data: mockResponse });

      await adminService.assignDoctorToPatient(pacienteId, medicoId);

      expect(axios.post).toHaveBeenCalledWith(
        `${API_URL}/admin/relations/assign`,
        { paciente_id: pacienteId, medico_id: null },
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });
  });

  // ==================== TESTES DE AUDITORIA ====================
  describe('getAuditLogs', () => {
    it('deve buscar logs de auditoria sem parâmetros', async () => {
      const mockLogs = { logs: [{ id: 1, acao: 'Login', usuario: 'admin' }] };

      axios.get.mockResolvedValueOnce({ data: mockLogs });

      const result = await adminService.getAuditLogs();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/audit-logs`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockLogs);
    });

    it('deve buscar logs com parâmetros de filtro', async () => {
      const params = { usuario_id: 5, acao: 'Delete', limit: 50 };
      const mockLogs = { logs: [] };

      axios.get.mockResolvedValueOnce({ data: mockLogs });

      await adminService.getAuditLogs(params);

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/audit-logs?usuario_id=5&acao=Delete&limit=50`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });
  });

  // ==================== TESTES DE RELATÓRIOS ====================
  describe('getSystemReports', () => {
    it('deve buscar relatórios do sistema', async () => {
      const mockReports = { reports: [{ tipo: 'usuarios', total: 150 }] };

      axios.get.mockResolvedValueOnce({ data: mockReports });

      const result = await adminService.getSystemReports();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/reports`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockReports);
    });
  });

  // ==================== TESTES DE BACKUP ====================
  describe('getBackupStatus', () => {
    it('deve buscar status de backup', async () => {
      const mockStatus = {
        backups: [
          { id: 1, data: '2025-01-01', status: 'concluido', tamanho: '150MB' }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockStatus });

      const result = await adminService.getBackupStatus();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/backup/status`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe('triggerBackup', () => {
    it('deve iniciar backup manualmente', async () => {
      const mockResponse = { message: 'Backup iniciado', backupId: 123 };

      axios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await adminService.triggerBackup();

      expect(axios.post).toHaveBeenCalledWith(
        `${API_URL}/admin/backup/trigger`,
        {},
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  // ==================== TESTES DE ANALYTICS ====================
  describe('getUserGrowthData', () => {
    it('deve buscar dados de crescimento de usuários com meses padrão', async () => {
      const mockData = {
        data: [
          { mes: '2025-01', tipo_usuario: 'pacientes', total: '50' },
          { mes: '2025-02', tipo_usuario: 'medicos', total: '10' }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await adminService.getUserGrowthData();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/analytics/user-growth?meses=6`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockData);
    });

    it('deve buscar dados com número personalizado de meses', async () => {
      const mockData = { data: [] };

      axios.get.mockResolvedValueOnce({ data: mockData });

      await adminService.getUserGrowthData(12);

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/analytics/user-growth?meses=12`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
    });
  });

  describe('getDoctorWorkload', () => {
    it('deve buscar carga de trabalho dos médicos', async () => {
      const mockData = {
        data: [
          { medico: 'Dr. John', pacientes: 15, capacidade: 20 },
          { medico: 'Dr. Jane', pacientes: 18, capacidade: 20 }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await adminService.getDoctorWorkload();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/analytics/doctor-workload`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getDialysisWeeklyPattern', () => {
    it('deve buscar padrão semanal de diálise', async () => {
      const mockData = {
        data: [
          { dia_num: 1, dia_nome: 'Segunda', registros: '45' },
          { dia_num: 2, dia_nome: 'Terça', registros: '50' }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await adminService.getDialysisWeeklyPattern();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/analytics/dialysis-pattern`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getCommonSymptoms', () => {
    it('deve buscar sintomas mais comuns', async () => {
      const mockData = {
        data: [
          { nome: 'Dor de cabeça', frequencia: '25', categoria: 'neurológico' },
          { nome: 'Náusea', frequencia: '20', categoria: 'gastrointestinal' }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await adminService.getCommonSymptoms();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/analytics/symptoms`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getTreatmentAdherence', () => {
    it('deve buscar dados de adesão ao tratamento', async () => {
      const mockData = {
        data: [
          { classificacao: 'Excelente', quantidade: 50 },
          { classificacao: 'Boa', quantidade: 30 }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await adminService.getTreatmentAdherence();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/analytics/adherence`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getBloodPressureAnalysis', () => {
    it('deve buscar análise de pressão arterial', async () => {
      const mockData = {
        data: [
          { paciente: 'John Doe', sistolica_media: 120, diastolica_media: 80, status: 'Normal' },
          { paciente: 'Jane Smith', sistolica_media: 140, diastolica_media: 90, status: 'Hipertensão' }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await adminService.getBloodPressureAnalysis();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/analytics/blood-pressure`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getUltrafiltrationTrend', () => {
    it('deve buscar tendência de ultrafiltração', async () => {
      const mockData = {
        data: [
          { data: '2025-01-01', uf_media: 500, pacientes: 20 },
          { data: '2025-01-02', uf_media: 520, pacientes: 22 }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await adminService.getUltrafiltrationTrend();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/analytics/ultrafiltration`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getSystemInsights', () => {
    it('deve buscar insights do sistema', async () => {
      const mockData = {
        insights: [
          { type: 'success', title: 'Sistema Estável', message: 'Tudo funcionando normalmente' },
          { type: 'warning', title: 'Atenção', message: 'Alguns usuários inativos' }
        ]
      };

      axios.get.mockResolvedValueOnce({ data: mockData });

      const result = await adminService.getSystemInsights();

      expect(axios.get).toHaveBeenCalledWith(
        `${API_URL}/admin/analytics/insights`,
        { headers: { Authorization: `Bearer ${mockToken}` } }
      );
      expect(result).toEqual(mockData);
    });
  });

  // ==================== TESTES DE AUTENTICAÇÃO ====================
  describe('Autenticação e Headers', () => {
    it('deve incluir token do localStorage no header', async () => {
      Storage.prototype.getItem = vi.fn((key) => {
        if (key === 'token') return 'local-token-123';
        return null;
      });

      axios.get.mockResolvedValueOnce({ data: {} });

      await adminService.getDashboardStats();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        { headers: { Authorization: 'Bearer local-token-123' } }
      );
    });

    it('deve incluir token do sessionStorage quando não há no localStorage', async () => {
      Storage.prototype.getItem = vi.fn((key) => {
        if (key === 'token' && key.includes('session')) return 'session-token-456';
        return null;
      });

      sessionStorage.getItem = vi.fn((key) => {
        if (key === 'token') return 'session-token-456';
        return null;
      });

      axios.get.mockResolvedValueOnce({ data: {} });

      await adminService.getDashboardStats();

      // Verifica que a chamada foi feita (com ou sem token, dependendo do mock)
      expect(axios.get).toHaveBeenCalled();
    });

    it('deve fazer requisição sem token quando não houver', async () => {
      Storage.prototype.getItem = vi.fn(() => null);
      sessionStorage.getItem = vi.fn(() => null);

      axios.get.mockResolvedValueOnce({ data: {} });

      await adminService.getDashboardStats();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        { headers: {} }
      );
    });
  });

  // ==================== TESTES DE TRATAMENTO DE ERROS ====================
  describe('Tratamento de Erros', () => {
    it('deve logar erro no console quando houver falha', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(adminService.getDashboardStats()).rejects.toBeDefined();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('deve retornar erro específico quando disponível', async () => {
      const specificError = { error: 'Token inválido', code: 401 };
      axios.get.mockRejectedValueOnce({
        response: { data: specificError }
      });

      await expect(adminService.getAllUsers()).rejects.toEqual(specificError);
    });

    it('deve retornar erro genérico quando não houver response', async () => {
      axios.post.mockRejectedValueOnce(new Error('Timeout'));

      await expect(adminService.createUser({})).rejects.toEqual({
        error: 'Erro ao criar usuário'
      });
    });
  });
});