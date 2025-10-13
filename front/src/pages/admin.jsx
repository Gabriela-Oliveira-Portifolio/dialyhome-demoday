import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Activity, Shield, FileText, Database,
  TrendingUp, AlertCircle, CheckCircle, Clock, Search,
  Filter, Download, RefreshCw, Settings, LogOut, Bell,
  BarChart3, PieChart, Calendar
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simular carregamento de dados
      // Substituir por chamadas reais à API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalUsers: 142,
        activeUsers: 128,
        totalPatients: 95,
        totalDoctors: 12,
        totalRecords: 3547,
        recentAlerts: 8,
        systemHealth: 98.5
      });

      setUsers(generateMockUsers());
      setAuditLogs(generateMockAuditLogs());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockUsers = () => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      nome: `Usuário ${i + 1}`,
      email: `usuario${i + 1}@email.com`,
      tipo_usuario: ['paciente', 'medico', 'admin'][i % 3],
      ativo: Math.random() > 0.2,
      ultimo_acesso: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
    }));
  };

  const generateMockAuditLogs = () => {
    const actions = ['LOGIN', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'ASSIGN_DOCTOR'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      usuario_nome: `Usuário ${Math.floor(Math.random() * 10) + 1}`,
      acao: actions[Math.floor(Math.random() * actions.length)],
      data_hora: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleString('pt-BR'),
      detalhes: 'Ação realizada com sucesso'
    }));
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #ecfdf5 100%)'
    }}>
      {/* Header */}
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
              justifyContent: 'center',
              position: 'relative'
            }}>
              <Bell size={20} color="#6b7280" strokeWidth={2} />
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: '600',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>8</span>
            </button>
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
              onClick={handleLogout}
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

      {/* Navigation Tabs */}
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
          <NavTab
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={BarChart3}
            label="Dashboard"
          />
          <NavTab
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            icon={Users}
            label="Usuários"
          />
          <NavTab
            active={activeTab === 'relations'}
            onClick={() => setActiveTab('relations')}
            icon={Activity}
            label="Vinculações"
          />
          <NavTab
            active={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            icon={FileText}
            label="Auditoria"
          />
          <NavTab
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            icon={PieChart}
            label="Relatórios"
          />
          <NavTab
            active={activeTab === 'backup'}
            onClick={() => setActiveTab('backup')}
            icon={Database}
            label="Backup"
          />
        </div>
      </div>

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
                />
              )}
              {activeTab === 'relations' && <RelationsView />}
              {activeTab === 'audit' && <AuditView logs={auditLogs} />}
              {activeTab === 'reports' && <ReportsView />}
              {activeTab === 'backup' && <BackupView />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// Componente de Tab
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

// Dashboard View
const DashboardView = ({ stats }) => (
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

    {/* Charts */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '1.5rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>
          Atividade Recente
        </h3>
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#6b7280' }}>Gráfico de atividade dos últimos 7 dias</p>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>
          Distribuição de Usuários
        </h3>
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#6b7280' }}>Gráfico de pizza por tipo de usuário</p>
        </div>
      </div>
    </div>
  </div>
);

// Users View
const UsersView = ({ users, searchTerm, setSearchTerm, filterType, setFilterType }) => {
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterType || user.tipo_usuario === filterType;
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
          Gerenciamento de Usuários
        </h1>
        <button style={{
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
        }}>
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
              <th style={tableHeaderStyle}>Último Acesso</th>
              <th style={tableHeaderStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
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
                <td style={tableCellStyle}>{user.ultimo_acesso}</td>
                <td style={tableCellStyle}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={{
                      padding: '0.5rem',
                      background: '#dbeafe',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#2563eb'
                    }}>
                      Editar
                    </button>
                    <button style={{
                      padding: '0.5rem',
                      background: '#fee',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#dc2626'
                    }}>
                      Excluir
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
};

// Relations View
const RelationsView = () => (
  <div>
    <h1 style={{
      fontSize: '2rem',
      fontWeight: '700',
      background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '2rem'
    }}>
      Vinculações Médico-Paciente
    </h1>
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '3rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      textAlign: 'center'
    }}>
      <Activity size={64} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
      <p style={{ color: '#6b7280', fontSize: '1rem' }}>
        Interface de vinculação será implementada aqui
      </p>
    </div>
  </div>
);

// Audit View
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
            <th style={tableHeaderStyle}>Ação</th>
            <th style={tableHeaderStyle}>Data/Hora</th>
            <th style={tableHeaderStyle}>Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={log.id} style={{
              borderBottom: '1px solid #f3f4f6',
              background: index % 2 === 0 ? 'white' : '#fafafa'
            }}>
              <td style={tableCellStyle}>{log.usuario_nome}</td>
              <td style={tableCellStyle}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  background: '#e0f2fe',
                  color: '#0891b2'
                }}>
                  {log.acao}
                </span>
              </td>
              <td style={tableCellStyle}>{log.data_hora}</td>
              <td style={tableCellStyle}>{log.detalhes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Reports View
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

// Backup View
const BackupView = () => (
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
      <button style={{
        padding: '0.75rem 1.5rem',
        background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: '600'
      }}>
        <RefreshCw size={18} />
        Realizar Backup Agora
      </button>
    </div>
  </div>
);

// Componentes Auxiliares
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