import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Heart, Activity, AlertCircle, TrendingUp, FileText,
  Bell, User, LogOut, Search, Filter, Send, Eye, Calendar,
  Download, RefreshCw, Clock, Droplet, X, ChevronRight,
  Plus, ClipboardList, Pill, TrendingDown
} from 'lucide-react';
import {
  getDoctorProfile,
  getPatients,
  getDashboardStats,
  getNotifications,
  markNotificationAsRead,
  getPatientDetails
} from '../services/doctor';
import MessagingComponent from '../components/ui/MessagingComponent';


const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileData, patientsData, statsData, notificationsData] = await Promise.all([
        getDoctorProfile(),
        getPatients(),
        getDashboardStats(),
        getNotifications({ limit: 10, lida: false })
      ]);

      setDoctorInfo(profileData.doctor);
      setPatients(patientsData.patients || []);
      setStats(statsData);
      setNotifications(notificationsData.notifications || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.error || 'Erro ao carregar dados do dashboard');
      
      if (err.error?.includes('Token') || err.error?.includes('autenticação')) {
        sessionStorage.clear();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      loadDashboardData();
    } catch (err) {
      console.error('Erro ao marcar notificação:', err);
    }
  };

  const handleViewPatient = async (patientId) => {
    try {
      setLoading(true);
      const details = await getPatientDetails(patientId);
      setPatientDetails(details);
      setSelectedPatient(patientId);
      setShowPatientModal(true);
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      setError('Erro ao carregar detalhes do paciente');
    } finally {
      setLoading(false);
    }
  };

  const closePatientModal = () => {
    setShowPatientModal(false);
    setSelectedPatient(null);
    setPatientDetails(null);
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'risk' && patient.alertas_nao_lidos > 0) ||
      (filterStatus === 'recent' && patient.ultimo_registro && 
        new Date(patient.ultimo_registro) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesFilter;
  });

  if (loading && !showPatientModal) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #ecfdf5 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #14b8a6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>Carregando...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

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
              <Heart size={22} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                DialCare Médico
              </span>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                Painel de Acompanhamento
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
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
              }}
            >
              <Bell size={20} color="#6b7280" strokeWidth={2} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  background: '#ef4444',
                  borderRadius: '50%'
                }} />
              )}
            </button>
            <button
              onClick={handleLogout}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: '#fee2e2',
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

        {/* Notifications Panel */}
        {showNotifications && (
          <div style={{
            position: 'absolute',
            top: '80px',
            right: '2rem',
            width: '400px',
            maxHeight: '500px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            zIndex: 100
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                Notificações ({notifications.length})
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex'
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  Nenhuma notificação não lida
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'start',
                      gap: '0.75rem'
                    }}>
                      <AlertCircle size={20} color="#f59e0b" />
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          margin: '0 0 0.25rem 0'
                        }}>
                          {notification.titulo}
                        </p>
                        <p style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          margin: 0
                        }}>
                          {notification.mensagem}
                        </p>
                        <p style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                          margin: '0.25rem 0 0 0'
                        }}>
                          {new Date(notification.data_criacao).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          {/* Welcome Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Olá, Dr(a). {doctorInfo?.nome || 'Médico'}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              {doctorInfo?.crm && `CRM: ${doctorInfo.crm}`}
              {doctorInfo?.especialidade && ` • ${doctorInfo.especialidade}`}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Stats Grid */}
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <StatCard
                icon={Users}
                title="Total de Pacientes"
                value={stats.totalPatients}
                subtitle="Sob seus cuidados"
                color="#14b8a6"
              />
              <StatCard
                icon={AlertCircle}
                title="Alertas Pendentes"
                value={stats.unreadAlerts}
                subtitle="Necessitam atenção"
                color="#f59e0b"
              />
              <StatCard
                icon={Activity}
                title="Sessões Hoje"
                value={stats.sessionsToday}
                subtitle="Registros de diálise"
                color="#10b981"
              />
              <StatCard
                icon={TrendingUp}
                title="Pacientes em Risco"
                value={stats.patientsAtRisk}
                subtitle="Últimos 7 dias"
                color="#ef4444"
              />
            </div>
          )}

          {/* Patients Section */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                Meus Pacientes ({filteredPatients.length})
              </h2>
              <button
                onClick={loadDashboardData}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
            </div>

            {/* Filters */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
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
                  placeholder="Buscar paciente..."
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
                <option value="all">Todos os pacientes</option>
                <option value="risk">Com alertas</option>
                <option value="recent">Ativos recentemente</option>
              </select>
            </div>

            {/* Patients List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredPatients.length === 0 ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <Users size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
                  <p>Nenhum paciente encontrado</p>
                </div>
              ) : (
                filteredPatients.map(patient => (
                  <PatientCard
                    key={patient.paciente_id}
                    patient={patient}
                    onView={handleViewPatient}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Patient Details Modal */}
      {showPatientModal && patientDetails && (
        <PatientDetailsModal
          patient={patientDetails.patient}
          recentDialysis={patientDetails.recentDialysis}
          medications={patientDetails.medications}
          stats={patientDetails.stats}
          onClose={closePatientModal}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s'
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
  }}
  >
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

// Patient Card Component
const PatientCard = ({ patient, onView }) => (
  <div style={{
    padding: '1.25rem',
    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
    borderRadius: '12px',
    border: patient.alertas_nao_lidos > 0 ? '2px solid #fbbf24' : '1px solid #e5e7eb',
    transition: 'all 0.2s',
    cursor: 'pointer'
  }}
  onClick={() => onView(patient.paciente_id)}
  onMouseOver={(e) => {
    e.currentTarget.style.borderColor = '#14b8a6';
    e.currentTarget.style.transform = 'translateX(4px)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.borderColor = patient.alertas_nao_lidos > 0 ? '#fbbf24' : '#e5e7eb';
    e.currentTarget.style.transform = 'translateX(0)';
  }}
  >
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '0.75rem'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
            {patient.nome}
          </h3>
          {patient.alertas_nao_lidos > 0 && (
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              background: '#fef3c7',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <AlertCircle size={12} />
              {patient.alertas_nao_lidos} alerta{patient.alertas_nao_lidos > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          {patient.email}
        </p>
      </div>
      <ChevronRight size={20} color="#6b7280" />
    </div>
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '1rem',
      fontSize: '0.875rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={16} color="#6b7280" />
        <span style={{ color: '#6b7280' }}>
          {patient.idade} anos
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={16} color="#6b7280" />
        <span style={{ color: '#6b7280' }}>
          {patient.total_registros} registros
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={16} color="#6b7280" />
        <span style={{ color: '#6b7280' }}>
          {patient.ultimo_registro 
            ? `Último: ${new Date(patient.ultimo_registro).toLocaleDateString('pt-BR')}`
            : 'Sem registros'}
        </span>
      </div>
    </div>
  </div>
);

// Patient Details Modal Component
const PatientDetailsModal = ({ patient, recentDialysis, medications, stats, onClose }) => (
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
    padding: '2rem'
  }}
  onClick={onClose}
  >
    <div style={{
      background: 'white',
      borderRadius: '20px',
      maxWidth: '900px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    }}
    onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        background: 'white',
        zIndex: 10
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.25rem 0' }}>
            {patient.nome}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            {patient.email} • {patient.idade} anos
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Modal Content */}
      <div style={{ padding: '1.5rem' }}>
        
        {/* Statistics */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Estatísticas do Último Mês
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '10px'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                Total de Sessões
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {stats.total_sessoes || 0}
              </p>
            </div>
            <div style={{
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '10px'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                Pressão Média
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {stats.media_sistolica ? `${Math.round(stats.media_sistolica)}/${Math.round(stats.media_diastolica)}` : 'N/A'}
              </p>
            </div>
            <div style={{
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '10px'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                UF Médio
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {stats.media_uf ? `${(stats.media_uf / 1000).toFixed(1)}L` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Dialysis */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} />
            Últimos Registros de Diálise
          </h3>
          {recentDialysis && recentDialysis.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentDialysis.map((record, index) => (
                <div key={index} style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontWeight: '600', color: '#111827' }}>
                      {new Date(record.data_registro).toLocaleDateString('pt-BR')}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {record.horario_inicio} - {record.horario_fim}
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '0.75rem',
                    fontSize: '0.875rem'
                  }}>
                    <div>
                      <p style={{ color: '#6b7280', margin: '0 0 0.25rem 0' }}>PA</p>
                      <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.pressao_arterial_sistolica}/{record.pressao_arterial_diastolica}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', margin: '0 0 0.25rem 0' }}>UF</p>
                      <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.uf_total ? `${(record.uf_total / 1000).toFixed(1)}L` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', margin: '0 0 0.25rem 0' }}>Glicose</p>
                      <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.concentracao_glicose || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {record.sintomas && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#fef3c7', borderRadius: '6px' }}>
                      <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>
                        <strong>Sintomas:</strong> {record.sintomas}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              Nenhum registro de diálise encontrado
            </p>
          )}
        </div>

        {/* Medications */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill size={20} />
            Medicamentos Ativos
          </h3>
          {medications && medications.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {medications.map((med, index) => (
                <div key={index} style={{
                  padding: '1rem',
                  background: '#f0f9ff',
                  borderRadius: '10px',
                  border: '1px solid #e0f2fe'
                }}>
                  <p style={{ fontWeight: '600', color: '#111827', margin: '0 0 0.5rem 0' }}>
                    {med.nome}
                  </p>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>Dosagem:</strong> {med.dosagem}
                    </p>
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>Frequência:</strong> {med.frequencia}
                    </p>
                    {med.observacoes && (
                      <p style={{ margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                        {med.observacoes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              Nenhum medicamento cadastrado
            </p>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      <div style={{
        padding: '1.5rem',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '1rem',
        position: 'sticky',
        bottom: 0,
        background: 'white'
      }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Fechar
        </button>
        <button
          style={{
            flex: 1,
            padding: '0.75rem',
            background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <Send size={18} />
          Enviar Recomendação
        </button>
      </div>
    </div>
    <MessagingComponent userRole="medico" />
  </div>
);

export default DoctorDashboard;
// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom'; // ✅ adicione esta linha
// import {
//   Users, Heart, Activity, AlertCircle, TrendingUp, FileText,
//   Bell, User, LogOut, Search, Filter, Send, Eye, Calendar,
//   Download, RefreshCw, Clock, Droplet, X, ChevronRight
// } from 'lucide-react';
// import {
//   getDoctorProfile,
//   getPatients,
//   getDashboardStats,
//   getNotifications,
//   markNotificationAsRead
// } from '../services/doctor';
// import './DoctorDashboard.css';

// const DoctorDashboard = () => {
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [activeTab, setActiveTab] = useState('overview');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatus, setFilterStatus] = useState('all');
  
//   const [doctorInfo, setDoctorInfo] = useState(null);
//   const [patients, setPatients] = useState([]);
//   const [stats, setStats] = useState(null);
//   const [notifications, setNotifications] = useState([]);
//   const [showNotifications, setShowNotifications] = useState(false);

//   useEffect(() => {
//     loadDashboardData();
//   }, []);

//   const loadDashboardData = async () => {
//     setLoading(true);
//     setError('');
//     try {
//       const [profileData, patientsData, statsData, notificationsData] = await Promise.all([
//         getDoctorProfile(),
//         getPatients(),
//         getDashboardStats(),
//         getNotifications({ limit: 10, lida: false })
//       ]);

//       setDoctorInfo(profileData.doctor);
//       setPatients(patientsData.patients || []);
//       setStats(statsData);
//       setNotifications(notificationsData.notifications || []);
//     } catch (err) {
//       console.error('Erro ao carregar dados:', err);
//       setError(err.error || 'Erro ao carregar dados do dashboard');
      
//       if (err.error?.includes('Token') || err.error?.includes('autenticação')) {
//         sessionStorage.clear();
//         navigate('/login');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = () => {
//     sessionStorage.clear();
//     navigate('/login');
//   };

//   const handleNotificationClick = async (notificationId) => {
//     try {
//       await markNotificationAsRead(notificationId);
//       loadDashboardData();
//     } catch (err) {
//       console.error('Erro ao marcar notificação:', err);
//     }
//   };

//   const handleViewPatient = (patientId) => {
//     navigate(`/medico/paciente/${patientId}`);
//   };

//   const filteredPatients = patients.filter(patient => {
//     const matchesSearch = patient.nome.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesFilter = 
//       filterStatus === 'all' ||
//       (filterStatus === 'risk' && patient.alertas_nao_lidos > 0) ||
//       (filterStatus === 'recent' && patient.ultimo_registro && 
//         new Date(patient.ultimo_registro) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
//     return matchesSearch && matchesFilter;
//   });

//   if (loading) {
//     return (
//       <div style={{
//         minHeight: '100vh',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #ecfdf5 100%)'
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{
//             width: '60px',
//             height: '60px',
//             border: '4px solid #e5e7eb',
//             borderTop: '4px solid #14b8a6',
//             borderRadius: '50%',
//             animation: 'spin 1s linear infinite',
//             margin: '0 auto 1rem'
//           }} />
//           <p style={{ color: '#6b7280', fontSize: '1rem' }}>Carregando...</p>
//         </div>
//         <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`}</style>
//       </div>
//     );
//   }

//   return (
//     <div style={{
//       minHeight: '100vh',
//       background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #ecfdf5 100%)'
//     }}>
//       {/* Header */}
//       <header style={{
//         background: 'rgba(255, 255, 255, 0.95)',
//         backdropFilter: 'blur(10px)',
//         borderBottom: '1px solid #e5e7eb',
//         position: 'sticky',
//         top: 0,
//         zIndex: 50,
//         boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
//       }}>
//         <div style={{
//           maxWidth: '1600px',
//           margin: '0 auto',
//           padding: '1rem 2rem',
//           display: 'flex',
//           justifyContent: 'space-between',
//           alignItems: 'center'
//         }}>
//           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
//             <div style={{
//               width: '40px',
//               height: '40px',
//               background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
//               borderRadius: '10px',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               boxShadow: '0 10px 15px -3px rgba(20, 184, 166, 0.3)'
//             }}>
//               <Heart size={22} color="white" strokeWidth={2.5} />
//             </div>
//             <div>
//               <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
//                 DialCare Médico
//               </span>
//               <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
//                 Painel de Acompanhamento
//               </p>
//             </div>
//           </div>
          
//           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//             <button 
//               onClick={() => setShowNotifications(!showNotifications)}
//               style={{
//                 width: '40px',
//                 height: '40px',
//                 borderRadius: '10px',
//                 border: 'none',
//                 background: '#f3f4f6',
//                 cursor: 'pointer',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 position: 'relative'
//               }}
//             >
//               <Bell size={20} color="#6b7280" strokeWidth={2} />
//               {notifications.length > 0 && (
//                 <span style={{
//                   position: 'absolute',
//                   top: '6px',
//                   right: '6px',
//                   width: '8px',
//                   height: '8px',
//                   background: '#ef4444',
//                   borderRadius: '50%'
//                 }} />
//               )}
//             </button>
//             <button style={{
//               width: '40px',
//               height: '40px',
//               borderRadius: '10px',
//               border: 'none',
//               background: '#f3f4f6',
//               cursor: 'pointer',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center'
//             }}>
//               <User size={20} color="#6b7280" strokeWidth={2} />
//             </button>
//             <button
//               onClick={handleLogout}
//               style={{
//                 width: '40px',
//                 height: '40px',
//                 borderRadius: '10px',
//                 border: 'none',
//                 background: '#fee',
//                 color: '#dc2626',
//                 cursor: 'pointer',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center'
//               }}
//             >
//               <LogOut size={20} strokeWidth={2} />
//             </button>
//           </div>
//         </div>

//         {/* Notifications Panel */}
//         {showNotifications && (
//           <div style={{
//             position: 'absolute',
//             top: '80px',
//             right: '2rem',
//             width: '400px',
//             maxHeight: '500px',
//             background: 'white',
//             borderRadius: '16px',
//             boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
//             overflow: 'hidden',
//             zIndex: 100
//           }}>
//             <div style={{
//               padding: '1rem',
//               borderBottom: '1px solid #e5e7eb',
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center'
//             }}>
//               <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
//                 Notificações ({notifications.length})
//               </h3>
//               <button
//                 onClick={() => setShowNotifications(false)}
//                 style={{
//                   background: 'transparent',
//                   border: 'none',
//                   cursor: 'pointer',
//                   padding: '0.25rem',
//                   display: 'flex'
//                 }}
//               >
//                 <X size={20} />
//               </button>
//             </div>
//             <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
//               {notifications.length === 0 ? (
//                 <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
//                   Nenhuma notificação não lida
//                 </div>
//               ) : (
//                 notifications.map(notification => (
//                   <div
//                     key={notification.id}
//                     onClick={() => handleNotificationClick(notification.id)}
//                     style={{
//                       padding: '1rem',
//                       borderBottom: '1px solid #f3f4f6',
//                       cursor: 'pointer',
//                       transition: 'background 0.2s'
//                     }}
//                     onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
//                     onMouseOut={(e) => e.currentTarget.style.background = 'white'}
//                   >
//                     <div style={{
//                       display: 'flex',
//                       alignItems: 'start',
//                       gap: '0.75rem'
//                     }}>
//                       <AlertCircle size={20} color="#f59e0b" />
//                       <div style={{ flex: 1 }}>
//                         <p style={{
//                           fontSize: '0.875rem',
//                           fontWeight: '600',
//                           margin: '0 0 0.25rem 0'
//                         }}>
//                           {notification.titulo}
//                         </p>
//                         <p style={{
//                           fontSize: '0.8rem',
//                           color: '#6b7280',
//                           margin: 0
//                         }}>
//                           {notification.mensagem}
//                         </p>
//                         <p style={{
//                           fontSize: '0.75rem',
//                           color: '#9ca3af',
//                           margin: '0.25rem 0 0 0'
//                         }}>
//                           {new Date(notification.data_criacao).toLocaleString('pt-BR')}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>
//         )}
//       </header>

//       {/* Main Content */}
//       <main style={{ padding: '2rem' }}>
//         <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
//           {/* Welcome Section */}
//           <div style={{ marginBottom: '2rem' }}>
//             <h1 style={{
//               fontSize: '2rem',
//               fontWeight: '700',
//               background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
//               WebkitBackgroundClip: 'text',
//               WebkitTextFillColor: 'transparent',
//               marginBottom: '0.5rem'
//             }}>
//               Olá, Dr(a). {doctorInfo?.nome || 'Médico'}
//             </h1>
//             <p style={{ color: '#6b7280', fontSize: '1rem' }}>
//               {doctorInfo?.crm && `CRM: ${doctorInfo.crm}`}
//               {doctorInfo?.especialidade && ` • ${doctorInfo.especialidade}`}
//             </p>
//           </div>

//           {/* Error Message */}
//           {error && (
//             <div style={{
//               backgroundColor: '#fee',
//               color: '#c33',
//               padding: '16px',
//               borderRadius: '12px',
//               marginBottom: '20px'
//             }}>
//               {error}
//             </div>
//           )}

//           {/* Stats Grid */}
//           {stats && (
//             <div style={{
//               display: 'grid',
//               gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
//               gap: '1.5rem',
//               marginBottom: '2rem'
//             }}>
//               <StatCard
//                 icon={Users}
//                 title="Total de Pacientes"
//                 value={stats.totalPatients}
//                 subtitle="Sob seus cuidados"
//                 color="#14b8a6"
//               />
//               <StatCard
//                 icon={AlertCircle}
//                 title="Alertas Pendentes"
//                 value={stats.unreadAlerts}
//                 subtitle="Necessitam atenção"
//                 color="#f59e0b"
//               />
//               <StatCard
//                 icon={Activity}
//                 title="Sessões Hoje"
//                 value={stats.sessionsToday}
//                 subtitle="Registros de diálise"
//                 color="#10b981"
//               />
//               <StatCard
//                 icon={TrendingUp}
//                 title="Pacientes em Risco"
//                 value={stats.patientsAtRisk}
//                 subtitle="Últimos 7 dias"
//                 color="#ef4444"
//               />
//             </div>
//           )}

//           {/* Patients Section */}
//           <div style={{
//             background: 'white',
//             borderRadius: '16px',
//             padding: '1.5rem',
//             boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
//             marginBottom: '2rem'
//           }}>
//             <div style={{
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//               marginBottom: '1.5rem'
//             }}>
//               <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
//                 Meus Pacientes ({filteredPatients.length})
//               </h2>
//               <button
//                 onClick={loadDashboardData}
//                 style={{
//                   padding: '0.5rem 1rem',
//                   background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
//                   color: 'white',
//                   border: 'none',
//                   borderRadius: '8px',
//                   cursor: 'pointer',
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '0.5rem',
//                   fontSize: '0.875rem',
//                   fontWeight: '600'
//                 }}
//               >
//                 <RefreshCw size={16} />
//                 Atualizar
//               </button>
//             </div>

//             {/* Filters */}
//             <div style={{
//               display: 'flex',
//               gap: '1rem',
//               marginBottom: '1.5rem',
//               flexWrap: 'wrap'
//             }}>
//               <div style={{ flex: '1 1 300px', position: 'relative' }}>
//                 <Search size={20} color="#6b7280" style={{
//                   position: 'absolute',
//                   left: '1rem',
//                   top: '50%',
//                   transform: 'translateY(-50%)'
//                 }} />
//                 <input
//                   type="text"
//                   placeholder="Buscar paciente..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   style={{
//                     width: '100%',
//                     padding: '0.75rem 1rem 0.75rem 3rem',
//                     border: '2px solid #e5e7eb',
//                     borderRadius: '10px',
//                     fontSize: '0.95rem',
//                     outline: 'none'
//                   }}
//                 />
//               </div>
//               <select
//                 value={filterStatus}
//                 onChange={(e) => setFilterStatus(e.target.value)}
//                 style={{
//                   padding: '0.75rem 1rem',
//                   border: '2px solid #e5e7eb',
//                   borderRadius: '10px',
//                   fontSize: '0.95rem',
//                   cursor: 'pointer',
//                   outline: 'none'
//                 }}
//               >
//                 <option value="all">Todos os pacientes</option>
//                 <option value="risk">Com alertas</option>
//                 <option value="recent">Ativos recentemente</option>
//               </select>
//             </div>

//             {/* Patients List */}
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
//               {filteredPatients.length === 0 ? (
//                 <div style={{
//                   padding: '3rem',
//                   textAlign: 'center',
//                   color: '#6b7280'
//                 }}>
//                   <Users size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
//                   <p>Nenhum paciente encontrado</p>
//                 </div>
//               ) : (
//                 filteredPatients.map(patient => (
//                   <PatientCard
//                     key={patient.paciente_id}
//                     patient={patient}
//                     onView={handleViewPatient}
//                   />
//                 ))
//               )}
//             </div>
//           </div>

//         </div>
//       </main>
//     </div>
//   );
// };

// // Stat Card Component
// const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
//   <div style={{
//     background: 'white',
//     borderRadius: '16px',
//     padding: '1.5rem',
//     boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
//     transition: 'transform 0.2s'
//   }}
//   onMouseOver={(e) => {
//     e.currentTarget.style.transform = 'translateY(-4px)';
//     e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
//   }}
//   onMouseOut={(e) => {
//     e.currentTarget.style.transform = 'translateY(0)';
//     e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
//   }}
//   >
//     <div style={{
//       width: '48px',
//       height: '48px',
//       background: `${color}20`,
//       borderRadius: '12px',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: '1rem'
//     }}>
//       <Icon size={24} color={color} />
//     </div>
//     <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
//       {title}
//     </p>
//     <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: '0 0 0.25rem 0' }}>
//       {value}
//     </p>
//     <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
//       {subtitle}
//     </p>
//   </div>
// );

// // Patient Card Component
// const PatientCard = ({ patient, onView }) => (
//   <div style={{
//     padding: '1.25rem',
//     background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
//     borderRadius: '12px',
//     border: patient.alertas_nao_lidos > 0 ? '2px solid #fbbf24' : '1px solid #e5e7eb',
//     transition: 'all 0.2s',
//     cursor: 'pointer'
//   }}
//   onClick={() => onView(patient.paciente_id)}
//   onMouseOver={(e) => {
//     e.currentTarget.style.borderColor = '#14b8a6';
//     e.currentTarget.style.transform = 'translateX(4px)';
//   }}
//   onMouseOut={(e) => {
//     e.currentTarget.style.borderColor = patient.alertas_nao_lidos > 0 ? '#fbbf24' : '#e5e7eb';
//     e.currentTarget.style.transform = 'translateX(0)';
//   }}
//   >
//     <div style={{
//       display: 'flex',
//       justifyContent: 'space-between',
//       alignItems: 'start',
//       marginBottom: '0.75rem'
//     }}>
//       <div style={{ flex: 1 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
//           <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
//             {patient.nome}
//           </h3>
//           {patient.alertas_nao_lidos > 0 && (
//             <span style={{
//               padding: '0.25rem 0.5rem',
//               borderRadius: '12px',
//               fontSize: '0.75rem',
//               fontWeight: '600',
//               background: '#fef3c7',
//               color: '#f59e0b',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.25rem'
//             }}>
//               <AlertCircle size={12} />
//               {patient.alertas_nao_lidos} alerta{patient.alertas_nao_lidos > 1 ? 's' : ''}
//             </span>
//           )}
//         </div>
//         <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
//           {patient.email}
//         </p>
//       </div>
//       <ChevronRight size={20} color="#6b7280" />
//     </div>
    
//     <div style={{
//       display: 'grid',
//       gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
//       gap: '1rem',
//       fontSize: '0.875rem'
//     }}>
//       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//         <Calendar size={16} color="#6b7280" />
//         <span style={{ color: '#6b7280' }}>
//           {patient.idade} anos
//         </span>
//       </div>
//       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//         <Activity size={16} color="#6b7280" />
//         <span style={{ color: '#6b7280' }}>
//           {patient.total_registros} registros
//         </span>
//       </div>
//       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//         <Clock size={16} color="#6b7280" />
//         <span style={{ color: '#6b7280' }}>
//           {patient.ultimo_registro 
//             ? `Último: ${new Date(patient.ultimo_registro).toLocaleDateString('pt-BR')}`
//             : 'Sem registros'}
//         </span>
//       </div>
//     </div>
//   </div>
// );

// export default DoctorDashboard;