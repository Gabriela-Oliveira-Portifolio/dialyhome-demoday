import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Activity, Shield, FileText, Database,
  TrendingUp, AlertCircle, CheckCircle, Clock, Search,
  Filter, Download, RefreshCw, Settings, LogOut, Bell,
  BarChart3, PieChart, Calendar, X, Save, Edit, Trash2
} from 'lucide-react';
import adminService from '../services/adminService';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [relations, setRelations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'dashboard') {
        const data = await adminService.getDashboardStats();
        setStats(data);
      } else if (activeTab === 'users') {
        await loadUsers();
      } else if (activeTab === 'relations') {
        await loadRelations();
      } else if (activeTab === 'audit') {
        await loadAuditLogs();
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterType) params.tipo = filterType;
      
      const data = await adminService.getAllUsers(params);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.error || 'Erro ao carregar usuários');
    }
  };

  const loadRelations = async () => {
    try {
      const data = await adminService.getPatientDoctorRelations();
      setRelations(data.relations || []);
    } catch (err) {
      setError(err.error || 'Erro ao carregar vinculações');
    }
  };

  const loadAuditLogs = async () => {
    try {
      const data = await adminService.getAuditLogs({ limit: 50 });
      setAuditLogs(data.logs || []);
    } catch (err) {
      setError(err.error || 'Erro ao carregar logs');
    }
  };

  const handleCreateUser = () => {
    setModalType('create');
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setModalType('edit');
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja inativar este usuário?')) return;
    
    try {
      await adminService.deleteUser(userId);
      setSuccess('Usuário inativado com sucesso');
      loadUsers();
    } catch (err) {
      setError(err.error || 'Erro ao deletar usuário');
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await adminService.toggleUserStatus(userId);
      setSuccess('Status do usuário alterado com sucesso');
      loadUsers();
    } catch (err) {
      setError(err.error || 'Erro ao alterar status');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  // Aplicar filtros quando mudarem
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [searchTerm, filterType]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #ecfdf5 100%)'
    }}>
      {/* Header */}
      <Header onLogout={handleLogout} />

      {/* Navigation Tabs */}
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          {loading ? (
            <LoadingState />
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardView stats={stats} />}
              {activeTab === 'users' && (
                <UsersView 
                  users={users}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  onCreateUser={handleCreateUser}
                  onEditUser={handleEditUser}
                  onDeleteUser={handleDeleteUser}
                  onToggleStatus={handleToggleStatus}
                />
              )}
              {activeTab === 'relations' && <RelationsView relations={relations} onReload={loadRelations} />}
              {activeTab === 'audit' && <AuditView logs={auditLogs} />}
              {activeTab === 'reports' && <ReportsView />}
              {activeTab === 'backup' && <BackupView />}
            </>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <UserModal
          type={modalType}
          user={selectedUser}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadUsers();
            setSuccess(`Usuário ${modalType === 'create' ? 'criado' : 'atualizado'} com sucesso`);
          }}
        />
      )}
    </div>
  );
};

// ==================== COMPONENTS ====================

const Header = ({ onLogout }) => (
  <header style={{
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  }}>
    <div style={{
      maxWidth: '1600px',
      margin: '0 auto',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 15px -3px rgba(20, 184, 166, 0.3)'
        }}>
          <Shield size={22} color="white" strokeWidth={2.5} />
        </div>
        <div>
          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
            DialCare Admin
          </span>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
            Painel de Administração
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          border: 'none',
          background: '#f3f4f6',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Settings size={20} color="#6b7280" strokeWidth={2} />
        </button>
        <button
          onClick={onLogout}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: 'none',
            background: '#fee',
            color: '#dc2626',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <LogOut size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  </header>
);

const NavigationTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'users', icon: Users, label: 'Usuários' },
    { id: 'relations', icon: Activity, label: 'Vinculações' },
    { id: 'audit', icon: FileText, label: 'Auditoria' },
    { id: 'reports', icon: PieChart, label: 'Relatórios' },
    { id: 'backup', icon: Database, label: 'Backup' }
  ];

  return (
    <div style={{
      background: 'white',
      borderBottom: '2px solid #e5e7eb',
      position: 'sticky',
      top: '73px',
      zIndex: 40
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '0 2rem',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <NavTab
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>
    </div>
  );
};

const NavTab = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: '1rem 1.5rem',
      background: 'transparent',
      color: active ? '#14b8a6' : '#6b7280',
      border: 'none',
      borderBottom: active ? '3px solid #14b8a6' : '3px solid transparent',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.95rem',
      fontWeight: '600',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap'
    }}
  >
    <Icon size={18} />
    {label}
  </button>
);

const Alert = ({ type, message, onClose }) => (
  <div style={{
    position: 'fixed',
    top: '100px',
    right: '2rem',
    zIndex: 1000,
    maxWidth: '400px',
    padding: '1rem',
    background: type === 'error' ? '#fee' : '#ecfdf5',
    border: `1px solid ${type === 'error' ? '#fca5a5' : '#a7f3d0'}`,
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  }}>
    <p style={{ 
      margin: 0, 
      color: type === 'error' ? '#dc2626' : '#059669',
      fontSize: '0.95rem'
    }}>
      {message}
    </p>
    <button
      onClick={onClose}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0.25rem',
        display: 'flex'
      }}
    >
      <X size={18} color={type === 'error' ? '#dc2626' : '#059669'} />
    </button>
  </div>
);

const DashboardView = ({ stats }) => {
  if (!stats) return null;

  return (
    <div>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '700',
        background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '2rem'
      }}>
        Visão Geral do Sistema
      </h1>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          icon={Users}
          title="Total de Usuários"
          value={stats.totalUsers}
          subtitle={`${stats.activeUsers} ativos`}
          color="#14b8a6"
        />
        <StatCard
          icon={Activity}
          title="Pacientes"
          value={stats.totalPatients}
          subtitle="Cadastrados"
          color="#10b981"
        />
        <StatCard
          icon={Shield}
          title="Médicos"
          value={stats.totalDoctors}
          subtitle="Ativos"
          color="#3b82f6"
        />
        <StatCard
          icon={FileText}
          title="Registros"
          value={stats.totalRecords}
          subtitle="Total de diálises"
          color="#8b5cf6"
        />
        <StatCard
          icon={AlertCircle}
          title="Alertas"
          value={stats.recentAlerts}
          subtitle="Não lidos"
          color="#f59e0b"
        />
        <StatCard
          icon={TrendingUp}
          title="Saúde do Sistema"
          value={`${stats.systemHealth}%`}
          subtitle="Uptime"
          color="#10b981"
        />
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        marginTop: '2rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>
          Atividade Recente
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {stats.recentActivity?.map((activity, index) => (
            <div key={index} style={{
              padding: '0.75rem',
              background: '#f9fafb',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>{activity.nome}</span>
                <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                  - {activity.acao}
                </span>
              </div>
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {new Date(activity.data_hora).toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const UsersView = ({ 
  users, 
  searchTerm, 
  setSearchTerm, 
  filterType, 
  setFilterType,
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onToggleStatus
}) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '700',
        background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Gerenciamento de Usuários
      </h1>
      <button 
        onClick={onCreateUser}
        style={{
          padding: '0.75rem 1.5rem',
          background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '600',
          fontSize: '0.95rem'
        }}
      >
        <UserPlus size={18} />
        Novo Usuário
      </button>
    </div>

    {/* Filters */}
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap'
    }}>
      <div style={{ flex: '1 1 300px', position: 'relative' }}>
        <Search size={20} color="#6b7280" style={{
          position: 'absolute',
          left: '1rem',
          top: '50%',
          transform: 'translateY(-50%)'
        }} />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem 0.75rem 3rem',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '0.95rem',
            outline: 'none'
          }}
        />
      </div>
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        style={{
          padding: '0.75rem 1rem',
          border: '2px solid #e5e7eb',
          borderRadius: '10px',
          fontSize: '0.95rem',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <option value="">Todos os tipos</option>
        <option value="paciente">Pacientes</option>
        <option value="medico">Médicos</option>
        <option value="admin">Administradores</option>
      </select>
    </div>

    {/* Users Table */}
    <div style={{
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <th style={tableHeaderStyle}>Nome</th>
            <th style={tableHeaderStyle}>Email</th>
            <th style={tableHeaderStyle}>Tipo</th>
            <th style={tableHeaderStyle}>Status</th>
            <th style={tableHeaderStyle}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id} style={{
              borderBottom: '1px solid #f3f4f6',
              background: index % 2 === 0 ? 'white' : '#fafafa'
            }}>
              <td style={tableCellStyle}>{user.nome}</td>
              <td style={tableCellStyle}>{user.email}</td>
              <td style={tableCellStyle}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  background: user.tipo_usuario === 'admin' ? '#dbeafe' :
                             user.tipo_usuario === 'medico' ? '#dcfce7' : '#fef3c7',
                  color: user.tipo_usuario === 'admin' ? '#2563eb' :
                        user.tipo_usuario === 'medico' ? '#16a34a' : '#f59e0b'
                }}>
                  {user.tipo_usuario}
                </span>
              </td>
              <td style={tableCellStyle}>
                {user.ativo ? (
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle size={16} /> Ativo
                  </span>
                ) : (
                  <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={16} /> Inativo
                  </span>
                )}
              </td>
              <td style={tableCellStyle}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => onEditUser(user)}
                    style={{
                      padding: '0.5rem',
                      background: '#dbeafe',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#2563eb',
                      display: 'flex'
                    }}
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => onToggleStatus(user.id)}
                    style={{
                      padding: '0.5rem',
                      background: user.ativo ? '#fef3c7' : '#dcfce7',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: user.ativo ? '#f59e0b' : '#16a34a',
                      display: 'flex'
                    }}
                    title={user.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {user.ativo ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                  </button>
                  <button 
                    onClick={() => onDeleteUser(user.id)}
                    style={{
                      padding: '0.5rem',
                      background: '#fee',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#dc2626',
                      display: 'flex'
                    }}
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const RelationsView = ({ relations, onReload }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'vinculado', 'desvinculado', ''

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      console.log('🔍 Carregando médicos disponíveis...');
      const data = await adminService.getPatientDoctorRelations();
      console.log('📦 Dados recebidos:', data);
      console.log('👨‍⚕️ Médicos disponíveis:', data.availableDoctors);
      setAvailableDoctors(data.availableDoctors || []);
    } catch (err) {
      console.error('❌ Erro ao carregar médicos:', err);
    }
  };

  const handleAssignDoctor = (patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
    setError(null);
  };

  const handleUnassignDoctor = async (pacienteId) => {
    if (!window.confirm('Tem certeza que deseja desvincular o médico deste paciente?')) return;

    setLoading(true);
    try {
      await adminService.assignDoctorToPatient(pacienteId, null);
      setSuccess('Médico desvinculado com sucesso!');
      onReload();
    } catch (err) {
      setError(err.error || 'Erro ao desvincular médico');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRelation = async (medicoId) => {
    if (!selectedPatient) return;

    setLoading(true);
    setError(null);

    try {
      await adminService.assignDoctorToPatient(selectedPatient.paciente_id, medicoId);
      setSuccess('Médico vinculado com sucesso!');
      setShowModal(false);
      onReload();
    } catch (err) {
      setError(err.error || 'Erro ao vincular médico');
    } finally {
      setLoading(false);
    }
  };

  const filteredRelations = relations.filter(rel => {
    const matchesSearch = rel.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rel.medico_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterStatus || 
                         (filterStatus === 'vinculado' && rel.medico_id) ||
                         (filterStatus === 'desvinculado' && !rel.medico_id);
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Vinculações Médico-Paciente
        </h1>
        <div style={{
          padding: '0.75rem 1rem',
          background: '#f0fdfa',
          borderRadius: '10px',
          fontSize: '0.875rem',
          color: '#0d9488',
          fontWeight: '600'
        }}>
          Total: {relations.length} pacientes
        </div>
      </div>

      {/* Alertas */}
      {success && (
        <div style={{
          padding: '1rem',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '10px',
          color: '#059669',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={18} color="#059669" />
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee',
          border: '1px solid #fca5a5',
          borderRadius: '10px',
          color: '#dc2626',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={18} color="#dc2626" />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <Search size={20} color="#6b7280" style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)'
          }} />
          <input
            type="text"
            placeholder="Buscar paciente ou médico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '0.95rem',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="">Todos os pacientes</option>
          <option value="vinculado">Com médico vinculado</option>
          <option value="desvinculado">Sem médico vinculado</option>
        </select>
      </div>

      {/* Tabela */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={tableHeaderStyle}>Paciente</th>
              <th style={tableHeaderStyle}>Email</th>
              <th style={tableHeaderStyle}>Médico Responsável</th>
              <th style={tableHeaderStyle}>CRM</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredRelations.map((rel, index) => (
              <tr key={rel.paciente_id} style={{
                borderBottom: '1px solid #f3f4f6',
                background: index % 2 === 0 ? 'white' : '#fafafa'
              }}>
                <td style={tableCellStyle}>
                  <div style={{ fontWeight: '600' }}>{rel.paciente_nome}</div>
                </td>
                <td style={tableCellStyle}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {rel.paciente_email}
                  </div>
                </td>
                <td style={tableCellStyle}>
                  {rel.medico_nome ? (
                    <div>
                      <div style={{ fontWeight: '600' }}>{rel.medico_nome}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {rel.medico_email}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sem médico vinculado</span>
                  )}
                </td>
                <td style={tableCellStyle}>
                  {rel.crm ? (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {rel.crm}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td style={tableCellStyle}>
                  {rel.medico_id ? (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: '#10b981',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      <CheckCircle size={16} />
                      Vinculado
                    </span>
                  ) : (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: '#f59e0b',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      <AlertCircle size={16} />
                      Pendente
                    </span>
                  )}
                </td>
                <td style={tableCellStyle}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAssignDoctor(rel)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: rel.medico_id ? '#dbeafe' : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
                        color: rel.medico_id ? '#2563eb' : 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      title={rel.medico_id ? 'Alterar médico' : 'Vincular médico'}
                    >
                      <Activity size={14} />
                      {rel.medico_id ? 'Alterar' : 'Vincular'}
                    </button>
                    {rel.medico_id && (
                      <button
                        onClick={() => handleUnassignDoctor(rel.paciente_id)}
                        disabled={loading}
                        style={{
                          padding: '0.5rem',
                          background: '#fee',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: loading ? 0.5 : 1
                        }}
                        title="Desvincular médico"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRelations.length === 0 && (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <Activity size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1rem', fontWeight: '500' }}>
              {searchTerm || filterStatus ? 'Nenhum resultado encontrado' : 'Nenhum paciente cadastrado'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Vinculação */}
      {showModal && selectedPatient && (
        <AssignDoctorModal
          patient={selectedPatient}
          doctors={availableDoctors}
          onClose={() => {
            setShowModal(false);
            setError(null);
          }}
          onSave={handleSaveRelation}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
};

const AuditView = ({ logs }) => (
  <div>
    <h1 style={{
      fontSize: '2rem',
      fontWeight: '700',
      background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '2rem'
    }}>
      Logs de Auditoria
    </h1>

    <div style={{
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <th style={tableHeaderStyle}>Usuário</th>
            <th style={tableHeaderStyle}>Operação</th>
            <th style={tableHeaderStyle}>Tabela</th>
            <th style={tableHeaderStyle}>Data/Hora</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={log.id} style={{
              borderBottom: '1px solid #f3f4f6',
              background: index % 2 === 0 ? 'white' : '#fafafa'
            }}>
              <td style={tableCellStyle}>{log.usuario_nome || 'Sistema'}</td>
              <td style={tableCellStyle}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  background: '#e0f2fe',
                  color: '#0891b2'
                }}>
                  {log.operacao}
                </span>
              </td>
              <td style={tableCellStyle}>{log.tabela_afetada}</td>
              <td style={tableCellStyle}>
                {new Date(log.data_operacao).toLocaleString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ReportsView = () => (
  <div>
    <h1 style={{
      fontSize: '2rem',
      fontWeight: '700',
      background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '2rem'
    }}>
      Relatórios do Sistema
    </h1>
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '3rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      textAlign: 'center'
    }}>
      <PieChart size={64} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
      <p style={{ color: '#6b7280', fontSize: '1rem' }}>
        Relatórios e análises serão implementados aqui
      </p>
    </div>
  </div>
);

const AssignDoctorModal = ({ patient, doctors, onClose, onSave, loading, error }) => {
  const [selectedDoctor, setSelectedDoctor] = useState(patient.medico_id || '');
  const [searchDoctor, setSearchDoctor] = useState('');

  const filteredDoctors = doctors.filter(doc => 
    doc.nome.toLowerCase().includes(searchDoctor.toLowerCase()) ||
    doc.crm.toLowerCase().includes(searchDoctor.toLowerCase())
  );

  const handleSave = () => {
    if (!selectedDoctor) {
      alert('Por favor, selecione um médico');
      return;
    }
    onSave(selectedDoctor);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.5rem 0' }}>
              Vincular Médico
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Paciente: <strong>{patient.paciente_nome}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              borderRadius: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '1rem',
            background: '#fee',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            color: '#dc2626',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {/* Busca de Médicos */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: '600',
            fontSize: '0.875rem',
            color: '#374151'
          }}>
            Buscar Médico
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={20} color="#6b7280" style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)'
            }} />
            <input
              type="text"
              placeholder="Nome ou CRM..."
              value={searchDoctor}
              onChange={(e) => setSearchDoctor(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 3rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Lista de Médicos */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: '600',
            fontSize: '0.875rem',
            color: '#374151'
          }}>
            Selecione o Médico *
          </label>
          
          <div style={{
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {filteredDoctors.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <Users size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
                <p>Nenhum médico encontrado</p>
              </div>
            ) : (
              filteredDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  onClick={() => setSelectedDoctor(doctor.id)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: selectedDoctor === doctor.id ? '#ecfdf5' : 'white',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDoctor !== doctor.id) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDoctor !== doctor.id) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: selectedDoctor === doctor.id 
                      ? 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)'
                      : '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {selectedDoctor === doctor.id ? (
                      <CheckCircle size={20} color="white" />
                    ) : (
                      <Shield size={20} color="#9ca3af" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#1f2937',
                      marginBottom: '0.25rem'
                    }}>
                      {doctor.nome}
                    </div>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: '#6b7280',
                      display: 'flex',
                      gap: '1rem'
                    }}>
                      <span>CRM: {doctor.crm}</span>
                      {doctor.especialidade && (
                        <span>• {doctor.especialidade}</span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#9ca3af',
                      marginTop: '0.25rem'
                    }}>
                      {doctor.email}
                    </div>
                  </div>
                  {selectedDoctor === doctor.id && (
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      background: '#10b981',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      Selecionado
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Informações Adicionais */}
        {selectedDoctor && (
          <div style={{
            padding: '1rem',
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            borderRadius: '10px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <CheckCircle size={16} color="#14b8a6" />
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600',
                color: '#0d9488'
              }}>
                Confirmação
              </span>
            </div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#0f766e',
              margin: 0
            }}>
              O médico selecionado será vinculado ao paciente <strong>{patient.paciente_nome}</strong> e 
              poderá visualizar seus dados médicos e histórico de diálise.
            </p>
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              opacity: loading ? 0.5 : 1
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !selectedDoctor}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: loading || !selectedDoctor 
                ? '#d1d5db' 
                : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: loading || !selectedDoctor ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Vinculando...
              </>
            ) : (
              <>
                <Save size={18} />
                Vincular Médico
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};














const LineChartComponent = ({ data }) => (
  <div style={{ width: '100%', height: '250px', position: 'relative' }}>
    <svg width="100%" height="100%" viewBox="0 0 500 250">
      {/* Grid */}
      {[0, 1, 2, 3, 4].map(i => (
        <line
          key={i}
          x1="50"
          y1={50 + i * 40}
          x2="480"
          y2={50 + i * 40}
          stroke="#f3f4f6"
          strokeWidth="1"
        />
      ))}
      
      {/* Linhas */}
      <polyline
        points={data.map((d, i) => `${70 + i * 70},${230 - (d.pacientes * 2)}`).join(' ')}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="3"
      />
      <polyline
        points={data.map((d, i) => `${70 + i * 70},${230 - (d.medicos * 15)}`).join(' ')}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="3"
      />
      
      {/* Labels */}
      {data.map((d, i) => (
        <text key={i} x={60 + i * 70} y="245" fontSize="12" fill="#6b7280" textAnchor="middle">
          {d.mes}
        </text>
      ))}
    </svg>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%' }} />
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Pacientes</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '50%' }} />
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Médicos</span>
      </div>
    </div>
  </div>
);

const PieChartComponent = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;
  
  return (
    <div style={{ width: '100%', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {data.map((d, i) => {
          const percentage = d.value / total;
          const angle = percentage * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;
          
          const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
          const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
          const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
          const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
          const largeArc = angle > 180 ? 1 : 0;
          
          return (
            <path
              key={i}
              d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={d.color}
            />
          );
        })}
        <circle cx="100" cy="100" r="50" fill="white" />
        <text x="100" y="105" fontSize="20" fontWeight="bold" fill="#1f2937" textAnchor="middle">
          {total}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', background: d.color, borderRadius: '4px' }} />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {d.name}: <strong>{d.value}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BarChartComponent = ({ data }) => (
  <div style={{ width: '100%', height: '250px' }}>
    <svg width="100%" height="100%" viewBox="0 0 500 250">
      {data.map((d, i) => (
        <g key={i}>
          {/* Meta (linha pontilhada) */}
          <line
            x1={60 + i * 60}
            y1={230 - d.meta * 3}
            x2={100 + i * 60}
            y2={230 - d.meta * 3}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4"
          />
          {/* Barra */}
          <rect
            x={60 + i * 60}
            y={230 - d.registros * 3}
            width="40"
            height={d.registros * 3}
            fill={d.registros >= d.meta ? '#10b981' : '#f59e0b'}
            rx="4"
          />
          {/* Valor */}
          <text
            x={80 + i * 60}
            y={220 - d.registros * 3}
            fontSize="12"
            fontWeight="bold"
            fill="#1f2937"
            textAnchor="middle"
          >
            {d.registros}
          </text>
          {/* Label */}
          <text
            x={80 + i * 60}
            y="245"
            fontSize="12"
            fill="#6b7280"
            textAnchor="middle"
          >
            {d.dia}
          </text>
        </g>
      ))}
    </svg>
  </div>
);

const HorizontalBarChart = ({ data }) => (
  <div style={{ width: '100%', height: '250px', padding: '1rem 0' }}>
    {data.map((d, i) => (
      <div key={i} style={{ marginBottom: '1rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '0.25rem',
          fontSize: '0.875rem'
        }}>
          <span style={{ color: '#374151', fontWeight: '600' }}>{d.medico}</span>
          <span style={{ color: '#6b7280' }}>{d.pacientes}/{d.capacidade}</span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '24px', 
          background: '#f3f4f6', 
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(d.pacientes / d.capacidade) * 100}%`,
            height: '100%',
            background: d.pacientes >= d.capacidade 
              ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    ))}
  </div>
);

const AlertsBarChart = ({ data }) => (
  <div style={{ width: '100%', height: '250px', padding: '1rem' }}>
    {data.map((d, i) => (
      <div key={i} style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <span style={{ 
          minWidth: '120px',
          fontSize: '0.875rem', 
          color: '#374151',
          fontWeight: '600'
        }}>
          {d.tipo}
        </span>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ 
            width: `${(d.quantidade / 20) * 100}%`,
            height: '32px', 
            background: d.cor, 
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '0.75rem',
            minWidth: '40px'
          }}>
            <span style={{ 
              color: 'white', 
              fontWeight: '700',
              fontSize: '0.875rem'
            }}>
              {d.quantidade}
            </span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AreaChartComponent = ({ data }) => (
  <div style={{ width: '100%', height: '250px' }}>
    <svg width="100%" height="100%" viewBox="0 0 500 250">
      {/* Área preenchida */}
      <polygon
        points={`50,230 ${data.map((d, i) => `${70 + i * 45},${230 - d.registros * 6}`).join(' ')} 470,230`}
        fill="url(#areaGradient)"
      />
      {/* Linha */}
      <polyline
        points={data.map((d, i) => `${70 + i * 45},${230 - d.registros * 6}`).join(' ')}
        fill="none"
        stroke="#14b8a6"
        strokeWidth="3"
      />
      {/* Pontos */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={70 + i * 45}
          cy={230 - d.registros * 6}
          r="4"
          fill="#14b8a6"
        />
      ))}
      {/* Labels */}
      {data.map((d, i) => (
        <text key={i} x={70 + i * 45} y="245" fontSize="11" fill="#6b7280" textAnchor="middle">
          {d.hora}
        </text>
      ))}
      {/* Gradiente */}
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

// Componentes auxiliares
const KPICard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute',
      top: '-20px',
      right: '-20px',
      width: '100px',
      height: '100px',
      background: `${color}10`,
      borderRadius: '50%'
    }} />
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{
        width: '48px',
        height: '48px',
        background: `${color}20`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem'
      }}>
        <Icon size={24} color={color} />
      </div>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
          {value}
        </p>
        {trend && (
          <span style={{ 
            fontSize: '0.875rem', 
            fontWeight: '600',
            color: trend.startsWith('+') ? '#10b981' : '#ef4444'
          }}>
            {trend}
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
        {subtitle}
      </p>
    </div>
  </div>
);

const ChartCard = ({ title, subtitle, children }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  }}>
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '700', margin: '0 0 0.25rem 0', color: '#1f2937' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
        {subtitle}
      </p>
    </div>
    {children}
  </div>
);

const InsightCard = ({ type, title, message }) => {
  const colors = {
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', icon: '✅' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: '⚠️' },
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' },
    alert: { bg: '#fee', border: '#ef4444', text: '#991b1b', icon: '🚨' }
  };
  
  const style = colors[type];
  
  return (
    <div style={{
      padding: '1rem',
      background: style.bg,
      border: `2px solid ${style.border}`,
      borderRadius: '10px',
      display: 'flex',
      gap: '1rem'
    }}>
      <span style={{ fontSize: '1.5rem' }}>{style.icon}</span>
      <div>
        <h4 style={{ 
          fontSize: '0.95rem', 
          fontWeight: '600', 
          color: style.text, 
          margin: '0 0 0.25rem 0' 
        }}>
          {title}
        </h4>
        <p style={{ fontSize: '0.875rem', color: style.text, margin: 0, opacity: 0.8 }}>
          {message}
        </p>
      </div>
    </div>
  );
};





















const BackupView = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const data = await adminService.getBackupStatus();
      setBackups(data.backups || []);
    } catch (err) {
      console.error('Erro ao carregar backups:', err);
    }
  };

  const handleTriggerBackup = async () => {
    setLoading(true);
    try {
      await adminService.triggerBackup();
      alert('Backup iniciado com sucesso!');
      loadBackups();
    } catch (err) {
      alert('Erro ao iniciar backup: ' + (err.error || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '700',
        background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '2rem'
      }}>
        Gerenciamento de Backup
      </h1>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '3rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        textAlign: 'center'
      }}>
        <Database size={64} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '1.5rem' }}>
          Sistema de backup automático ativo
        </p>
        <button 
          onClick={handleTriggerBackup}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            background: loading ? '#d1d5db' : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '600'
          }}
        >
          <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Processando...' : 'Realizar Backup Agora'}
        </button>

        {backups.length > 0 && (
          <div style={{ marginTop: '2rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
              Backups Recentes
            </h3>
            {backups.map(backup => (
              <div key={backup.id} style={{
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontWeight: '600' }}>{backup.localizacao}</span>
                  <span style={{ color: '#6b7280', marginLeft: '1rem' }}>
                    {backup.tamanho_mb} MB
                  </span>
                </div>
                <span style={{ 
                  color: backup.status === 'concluído' ? '#10b981' : '#f59e0b',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  {backup.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const UserModal = ({ type, user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    // Dados básicos
    nome: user?.nome || '',
    email: user?.email || '',
    senha: '',
    tipo_usuario: user?.tipo_usuario || 'paciente',
    
    // Dados de Paciente
    cpf: user?.cpf || '',
    data_nascimento: user?.data_nascimento || '',
    telefone: user?.telefone || '',
    endereco: user?.endereco || '',
    peso_inicial: user?.peso_inicial || '',
    altura: user?.altura || '',
    data_inicio_tratamento: user?.data_inicio_tratamento || '',
    observacoes_medicas: user?.observacoes_medicas || '',
    
    // Dados de Médico
    crm: user?.crm || '',
    especialidade: user?.especialidade || '',
    telefone_contato: user?.telefone_contato || '',
    local_atendimento: user?.local_atendimento || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validações
    if (!formData.nome || !formData.email || (type === 'create' && !formData.senha)) {
      setError('Por favor, preencha todos os campos obrigatórios');
      setLoading(false);
      return;
    }

    if (formData.tipo_usuario === 'medico' && !formData.crm) {
      setError('CRM é obrigatório para médicos');
      setLoading(false);
      return;
    }

    try {
      if (type === 'create') {
        await adminService.createUser(formData);
      } else {
        await adminService.updateUser(user.id, formData);
      }
      onSuccess();
    } catch (err) {
      setError(err.error || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>
            {type === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            background: '#fee',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#dc2626',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Seção: Dados Básicos */}
          <div style={{
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
              📋 Dados Básicos
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  required
                  placeholder="Ex: João Silva"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  placeholder="email@exemplo.com"
                  style={inputStyle}
                />
              </div>

              {type === 'create' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                    Senha *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.senha}
                      onChange={(e) => handleChange('senha', e.target.value)}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '0.25rem'
                      }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Tipo de Usuário *
                </label>
                <select
                  value={formData.tipo_usuario}
                  onChange={(e) => handleChange('tipo_usuario', e.target.value)}
                  required
                  disabled={type === 'edit'}
                  style={{...inputStyle, cursor: type === 'edit' ? 'not-allowed' : 'pointer', opacity: type === 'edit' ? 0.6 : 1}}
                >
                  <option value="paciente">Paciente</option>
                  <option value="medico">Médico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção: Dados do Paciente */}
          {formData.tipo_usuario === 'paciente' && (
            <div style={{
              padding: '1rem',
              background: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#92400e' }}>
                🏥 Dados do Paciente
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>CPF</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => handleChange('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => handleChange('data_nascimento', e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Telefone</label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => handleChange('telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Peso Inicial (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.peso_inicial}
                    onChange={(e) => handleChange('peso_inicial', e.target.value)}
                    placeholder="Ex: 70.5"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Altura (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.altura}
                    onChange={(e) => handleChange('altura', e.target.value)}
                    placeholder="Ex: 1.75"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Data Início Tratamento</label>
                  <input
                    type="date"
                    value={formData.data_inicio_tratamento}
                    onChange={(e) => handleChange('data_inicio_tratamento', e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Endereço</label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => handleChange('endereco', e.target.value)}
                    placeholder="Rua, número, bairro, cidade - UF"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Observações Médicas</label>
                  <textarea
                    value={formData.observacoes_medicas}
                    onChange={(e) => handleChange('observacoes_medicas', e.target.value)}
                    placeholder="Histórico médico, alergias, restrições..."
                    rows={3}
                    style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Seção: Dados do Médico */}
          {formData.tipo_usuario === 'medico' && (
            <div style={{
              padding: '1rem',
              background: '#dbeafe',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1e3a8a' }}>
                🩺 Dados do Médico
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>CRM *</label>
                  <input
                    type="text"
                    value={formData.crm}
                    onChange={(e) => handleChange('crm', e.target.value)}
                    required
                    placeholder="Ex: CRM-12345/SC"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Especialidade</label>
                  <input
                    type="text"
                    value={formData.especialidade}
                    onChange={(e) => handleChange('especialidade', e.target.value)}
                    placeholder="Ex: Nefrologia"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Telefone de Contato</label>
                  <input
                    type="tel"
                    value={formData.telefone_contato}
                    onChange={(e) => handleChange('telefone_contato', e.target.value)}
                    placeholder="(00) 00000-0000"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Local de Atendimento</label>
                  <input
                    type="text"
                    value={formData.local_atendimento}
                    onChange={(e) => handleChange('local_atendimento', e.target.value)}
                    placeholder="Ex: Hospital Regional de Joinville"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Seção: Administrador (apenas aviso) */}
          {formData.tipo_usuario === 'admin' && (
            <div style={{
              padding: '1rem',
              background: '#f3e8ff',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Shield size={24} color="#6b21a8" />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.25rem 0', color: '#6b21a8' }}>
                  Administrador
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#581c87', margin: 0 }}>
                  Este usuário terá acesso total ao sistema, incluindo gerenciamento de usuários e configurações.
                </p>
              </div>
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem',
                opacity: loading ? 0.5 : 1
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: loading ? '#d1d5db' : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {type === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Estilos reutilizáveis
const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  border: '2px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '0.95rem',
  outline: 'none'
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '600',
  fontSize: '0.875rem',
  color: '#374151'
};

const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      background: `${color}20`,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1rem'
    }}>
      <Icon size={24} color={color} />
    </div>
    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
      {title}
    </p>
    <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: '0 0 0.25rem 0' }}>
      {value}
    </p>
    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
      {subtitle}
    </p>
  </div>
);

const LoadingState = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    textAlign: 'center'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      border: '4px solid #e5e7eb',
      borderTop: '4px solid #14b8a6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '1rem'
    }} />
    <p style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>
      Carregando painel administrativo...
    </p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const tableHeaderStyle = {
  padding: '1rem',
  textAlign: 'left',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tableCellStyle = {
  padding: '1rem',
  fontSize: '0.95rem',
  color: '#374151'
};

export default AdminDashboard;