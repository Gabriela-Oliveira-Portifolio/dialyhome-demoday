import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Droplet, Heart, Clock, TrendingUp, FileText, Plus, Bell, User, LogOut, X, Save, Calendar, Weight, Ruler } from "lucide-react";
import { createDialysisRecord, getPatientRecords } from '../services/dialysis';
import { getPatientInfo, getDetailedStats } from '../services/patient';
import './PatientDashboard2.css';
import RemindersModal from '../components/ui/RemindersModal';
import { getUpcomingReminders } from '../services/reminder';
import SymptomsModal from '../components/ui/SymptomsModal';
import ChartsModal from '../components/ui/ChartsModal';
import MessagingComponent from '../components/ui/MessagingComponent';


const PatientDashboard = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  
  const [user, setUser] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [stats, setStats] = useState([]);
  const [detailedStats, setDetailedStats] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [remindersData, setRemindersData] = useState([]);
  const [showSymptomsModal, setShowSymptomsModal] = useState(false);
  const [showChartsModal, setShowChartsModal] = useState(false);


  
  const [formData, setFormData] = useState({
    pressaoSistolica: '',
    pressaoDiastolica: '',
    drenagemInicial: '',
    ufTotal: '',
    tempoPermanencia: '',
    glicose: '',
    dextrose: '',
    observacoes: ''
  });

  // const reminders = [
  //   { title: "Sessão de Diálise", time: "Hoje às 14:00", icon: Clock, color: "reminder-primary" },
  //   { title: "Tomar Medicamento", time: "Hoje às 16:00", icon: Activity, color: "reminder-info" },
  //   { title: "Consulta Médica", time: "Amanhã às 10:00", icon: Heart, color: "reminder-warning" },
  // ];

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    setUser(userData);
    
    loadPatientProfile();
    loadDashboardData();
  }, []);

  const loadPatientProfile = async () => {
    try {
      const profileData = await getPatientInfo();
      setPatientInfo(profileData.patient);
      console.log('Perfil do paciente:', profileData.patient);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  const loadDashboardData = async () => {
    try {
      const statsData = await getDetailedStats(30);
      setDetailedStats(statsData);
      console.log('Estatísticas:', statsData);

      if (statsData && statsData.current) {
        const getTrendIcon = (trend) => {
          if (trend === 'up') return '↑';
          if (trend === 'down') return '↓';
          return '→';
        };

        setStats([
          { 
            title: "Pressão Arterial", 
            value: statsData.current.pressao_arterial.sistolica && statsData.current.pressao_arterial.diastolica
              ? `${statsData.current.pressao_arterial.sistolica}/${statsData.current.pressao_arterial.diastolica}`
              : 'N/A',
            average: statsData.averages.pressao_sistolica.value && statsData.averages.pressao_diastolica.value
              ? `Média: ${statsData.averages.pressao_sistolica.value}/${statsData.averages.pressao_diastolica.value}`
              : null,
            unit: "mmHg", 
            icon: Heart, 
            trend: statsData.averages.pressao_sistolica.trend || "stable",
            trendIcon: getTrendIcon(statsData.averages.pressao_sistolica.trend),
            color: "stat-success"
          },
          { 
            title: "UF Total", 
            value: statsData.current.uf_total || 'N/A',
            average: statsData.averages.uf_total.value ? `Média: ${statsData.averages.uf_total.value} L` : null,
            unit: "L", 
            icon: Droplet, 
            trend: statsData.averages.uf_total.trend || "stable",
            trendIcon: getTrendIcon(statsData.averages.uf_total.trend),
            color: "stat-info"
          },
          { 
            title: "Glicose", 
            value: statsData.current.glicose || 'N/A',
            average: statsData.averages.glicose.value ? `Média: ${statsData.averages.glicose.value} mg/dL` : null,
            unit: "mg/dL", 
            icon: Activity, 
            trend: statsData.averages.glicose.trend || "stable",
            trendIcon: getTrendIcon(statsData.averages.glicose.trend),
            color: "stat-primary"
          },
          { 
            title: "Tempo Permanência", 
            value: statsData.current.tempo_permanencia || 'N/A',
            average: statsData.averages.tempo_permanencia.value ? `Média: ${statsData.averages.tempo_permanencia.value} h` : null,
            unit: "horas", 
            icon: Clock, 
            trend: "stable",
            trendIcon: '→',
            color: "stat-warning"
          },
        ]);
      }

      const recordsData = await getPatientRecords(3);

      
      if (recordsData && recordsData.records && recordsData.records.length > 0) {
        setRecentRecords(recordsData.records.map(record => ({
          date: new Date(record.data_registro).toLocaleDateString('pt-BR'),
          pa: `${record.pressao_arterial_sistolica}/${record.pressao_arterial_diastolica}`,
          uf: record.uf_total ? `${(record.uf_total / 1000).toFixed(1)}L` : 'N/A',
          glicose: record.concentracao_glicose ? `${record.concentracao_glicose} mg/dL` : 'N/A',
          status: "Normal"
        })));
      } else {
        setRecentRecords([]);
      }

        const upcomingData = await getUpcomingReminders();
          setRemindersData(upcomingData.reminders.map(r => ({
            title: r.titulo,
            time: new Date(r.data_hora).toLocaleString('pt-BR'),
            icon: Clock,
            color: "reminder-primary"
          })));

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      
      if (err.error?.includes('Token') || err.error?.includes('necessário')) {
        sessionStorage.clear();
        navigate('/login');
      } else {
        setStats([
          { title: "Pressão Arterial", value: 'N/A', unit: "mmHg", icon: Heart, trend: "stable", trendIcon: '→', color: "stat-success" },
          { title: "UF Total", value: 'N/A', unit: "L", icon: Droplet, trend: "stable", trendIcon: '→', color: "stat-info" },
          { title: "Glicose", value: 'N/A', unit: "mg/dL", icon: Activity, trend: "stable", trendIcon: '→', color: "stat-primary" },
          { title: "Tempo Permanência", value: 'N/A', unit: "horas", icon: Clock, trend: "stable", trendIcon: '→', color: "stat-warning" },
        ]);
        setRecentRecords([]);
      }
    }
    
    
    
    
    
    
    
    try {
      const upcomingData = await getUpcomingReminders();
      if (upcomingData && upcomingData.reminders) {
        setRemindersData(upcomingData.reminders); // ← Apenas salvar os dados sem transformar
      } else {
        setRemindersData([]);
      }
    } catch (err) {
      console.error('Erro ao carregar lembretes:', err);
      setRemindersData([]);
    }
    // // Carregar lembretes próximos
    // try {
    //   const upcomingData = await getUpcomingReminders();
    //   if (upcomingData && upcomingData.reminders) {
    //     setRemindersData(upcomingData.reminders.map(r => ({
    //       title: r.titulo,
    //       time: new Date(r.data_hora).toLocaleString('pt-BR', {
    //         day: '2-digit',
    //         month: '2-digit',
    //         hour: '2-digit',
    //         minute: '2-digit'
    //       }),
    //       icon: Clock,
    //       color: "reminder-primary"
    //     })));
    //   }
    // } catch (err) {
    //   console.error('Erro ao carregar lembretes:', err);
    //   setRemindersData([]);
    // }








    
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.pressaoSistolica || !formData.pressaoDiastolica) {
      setError('Pressão arterial é obrigatória');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await createDialysisRecord(formData);
      setSuccess('Registro salvo com sucesso!');
      
      await loadDashboardData();
      await loadPatientProfile();
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        setFormData({
          pressaoSistolica: '',
          pressaoDiastolica: '',
          drenagemInicial: '',
          ufTotal: '',
          tempoPermanencia: '',
          glicose: '',
          dextrose: '',
          observacoes: ''
        });
      }, 1500);
    } catch (err) {
      console.error('Erro completo:', err);
      const errorMessage = err.error || err.message || 'Erro ao salvar registro';
      setError(errorMessage);
      
      if (err.error?.includes('Token') || err.error?.includes('autenticação')) {
        setTimeout(() => {
          sessionStorage.clear();
          navigate('/login');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-section">
              <div className="logo-icon-small">
                <Heart className="icon" />
              </div>
              <span className="logo-text">DialyHome</span>
            </div>
          </div>
          
          <div className="header-right">
            <button className="icon-button">
              <Bell className="icon" />
              <span className="notification-badge">3</span>
            </button>
            <button 
            onClick={() => navigate('/perfil')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: 'none',
              background: '#f3f4f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <User size={20} color="#6b7280" strokeWidth={2} />
          </button>

            <button className="icon-button" onClick={handleLogout}>
              <LogOut className="icon" />
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-wrapper">
          
          <div className="welcome-section">
            <div className="welcome-text">
              <h1 className="welcome-title">Olá, {patientInfo?.nome || user?.nome || 'Paciente'}!</h1>
              <p className="welcome-subtitle">
                {patientInfo?.dias_tratamento 
                  ? `Em tratamento há ${patientInfo.dias_tratamento} dias` 
                  : 'Aqui está um resumo do seu tratamento'}
              </p>
              {detailedStats?.summary && (
                <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                  📊 {detailedStats.summary.total_registros} registros nos últimos {detailedStats.summary.dias_periodo} dias
                </p>
              )}
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="icon" />
              Novo Registro
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {patientInfo && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <div>
                  <h2 className="card-title">Informações Pessoais</h2>
                  <p className="card-description">Seus dados cadastrais</p>
                </div>
              </div>
              <div className="card-body">
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <User style={{ width: '20px', height: '20px', color: '#10b981' }} />
                    <div>
                      <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Nome</p>
                      <p style={{ fontSize: '14px', fontWeight: '600' }}>{patientInfo.nome}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                    <div>
                      <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Idade</p>
                      <p style={{ fontSize: '14px', fontWeight: '600' }}>{patientInfo.idade} anos</p>
                    </div>
                  </div>

                  {patientInfo.peso_inicial && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Weight style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
                      <div>
                        <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Peso Inicial</p>
                        <p style={{ fontSize: '14px', fontWeight: '600' }}>{patientInfo.peso_inicial} kg</p>
                      </div>
                    </div>
                  )}

                  {patientInfo.altura && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Ruler style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                      <div>
                        <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Altura</p>
                        <p style={{ fontSize: '14px', fontWeight: '600' }}>{patientInfo.altura} m</p>
                      </div>
                    </div>
                  )}

                  {patientInfo.nome_medico && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Heart style={{ width: '20px', height: '20px', color: '#ec4899' }} />
                      <div>
                        <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Médico Responsável</p>
                        <p style={{ fontSize: '14px', fontWeight: '600' }}>{patientInfo.nome_medico}</p>
                        {patientInfo.crm && (
                          <p style={{ fontSize: '12px', color: '#999' }}>CRM: {patientInfo.crm}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {patientInfo.data_inicio_tratamento && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Calendar style={{ width: '20px', height: '20px', color: '#14b8a6' }} />
                      <div>
                        <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Início do Tratamento</p>
                        <p style={{ fontSize: '14px', fontWeight: '600' }}>
                          {new Date(patientInfo.data_inicio_tratamento).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="stats-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.title} className={`stat-card ${stat.color}`}>
                  <div className="stat-header">
                    <span className="stat-label">{stat.title}</span>
                    <div className="stat-icon-wrapper">
                      <Icon className="stat-icon" />
                    </div>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value-wrapper">
                      <p className="stat-value">{stat.value}</p>
                      <p className="stat-unit">{stat.unit}</p>
                    </div>
                    {stat.trend && stat.trend !== "stable" && (
                      <div className="stat-trend">
                        <span style={{ fontSize: '20px' }}>{stat.trendIcon}</span>
                      </div>
                    )}
                  </div>
                  {stat.average && (
                    <div style={{ 
                      marginTop: '8px', 
                      paddingTop: '8px', 
                      borderTop: '1px solid rgba(0,0,0,0.1)',
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      {stat.average}
                    </div>
                  )}
                </div>
              );
            })}
          </div>











          {/* <button 
              className="action-button"
              onClick={() => setShowRemindersModal(true)}
            >
              <Clock className="icon-small" />
              Ver Lembretes
            </button> */}

















          <div className="content-grid">
            
            {detailedStats?.averages && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Resumo do Tratamento</h2>
                    <p className="card-description">Médias dos últimos 30 dias</p>
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {detailedStats.averages.pressao_sistolica.value && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <p style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                            Pressão Arterial
                          </p>
                          <p style={{ fontSize: '16px', fontWeight: '600' }}>
                            {detailedStats.averages.pressao_sistolica.value}/{detailedStats.averages.pressao_diastolica.value} mmHg
                          </p>
                          <p style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            Faixa: {detailedStats.averages.pressao_sistolica.min}-{detailedStats.averages.pressao_sistolica.max} / 
                            {detailedStats.averages.pressao_diastolica.min}-{detailedStats.averages.pressao_diastolica.max}
                          </p>
                        </div>
                        <Heart style={{ width: '24px', height: '24px', color: '#10b981' }} />
                      </div>
                    )}

                    {detailedStats.averages.uf_total.value && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <p style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                            Ultrafiltração Média
                          </p>
                          <p style={{ fontSize: '16px', fontWeight: '600' }}>
                            {detailedStats.averages.uf_total.value} L
                          </p>
                        </div>
                        <Droplet style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                      </div>
                    )}

                    {detailedStats.averages.glicose.value && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <p style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                            Glicose Média
                          </p>
                          <p style={{ fontSize: '16px', fontWeight: '600' }}>
                            {detailedStats.averages.glicose.value} mg/dL
                          </p>
                        </div>
                        <Activity style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
                      </div>
                    )}

                    {detailedStats.averages.tempo_permanencia.value && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <p style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                            Tempo Médio de Permanência
                          </p>
                          <p style={{ fontSize: '16px', fontWeight: '600' }}>
                            {detailedStats.averages.tempo_permanencia.value} horas
                          </p>
                        </div>
                        <Clock style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="card card-large">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Registros Recentes</h2>
                  <p className="card-description">Últimos parâmetros registrados</p>
                </div>
              </div>
              <div className="card-body">
                <div className="records-list">
                  {recentRecords.length > 0 ? (
                    recentRecords.map((record, i) => (
                      <div key={i} className="record-item">
                        <div className="record-info">
                          <p className="record-date">{record.date}</p>
                          <div className="record-details">
                            <span>PA: {record.pa}</span>
                            <span>UF: {record.uf}</span>
                            <span>Glicose: {record.glicose}</span>
                          </div>
                        </div>
                        <div className={`status-badge ${record.status === "Normal" ? "status-normal" : "status-warning"}`}>
                          {record.status}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                      Nenhum registro encontrado. Adicione seu primeiro registro!
                    </p>
                  )}
                </div>
                {/* <button className="btn-outline">
                  <FileText className="icon-small" />
                  Ver Histórico Completoqqqqq
                </button> */}
                <button 
                  className="action-button"
                  onClick={() => navigate('/historico')}
                >
                  <FileText className="icon-small" />
                  Ver Histórico Completo
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Ações Rápidas</h2>
                  <p className="card-description">Acesso rápido às funcionalidades</p>
                </div>
              </div>
              <div className="card-body">
                <div className="actions-list">
                  {/* <button className="action-button">
                    <Activity className="icon-small" />
                    Registrar Sintomas
                  </button> */}
                  <button 
                    className="action-button"
                    onClick={() => setShowSymptomsModal(true)}
                  >
                    <Activity className="icon-small" />
                    Registrar Sintomas
                  </button>
                  {/* <button className="action-button">
                    <Clock className="icon-small" />
                    Ver Lembretes
                  </button> */}
                  <button 
                      className="action-button"
                      onClick={() => setShowRemindersModal(true)}
                    >
                      <Clock className="icon-small" />
                      Ver Lembretes
                    </button>
                  {/* <button className="action-button">
                    <FileText className="icon-small" />
                    Upload de Exames
                  </button> */}
                  <button 
                    className="action-button"
                    onClick={() => setShowChartsModal(true)}
                  >
                    <TrendingUp className="icon-small" />
                    Visualizar Gráficos
                  </button>
                  {/* <button className="action-button">
                    <TrendingUp className="icon-small" />
                    Visualizar Gráficos
                  </button> */}
                </div>
              </div>
            </div>
          </div>
          









        <div className="card reminders-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Próximos Lembretes</h2>
              <p className="card-description">Não esqueça de suas atividades</p>
            </div>
          </div>
          <div className="card-body">
            {remindersData.length > 0 ? (
              <div className="reminders-grid">
                {remindersData.map((reminder, i) => {
                  // DEBUG - Ver o que está vindo
                  // console.log('Lembrete:', reminder);
                  // console.log('Data/Hora:', reminder.data_hora);
                  // console.log('Tipo da data:', typeof reminder.data_hora);
                  
                  const getTipoIcon = (tipo) => {
                    switch (tipo) {
                      case 'medicacao': return Activity;
                      case 'dialise': return Heart;
                      case 'consulta': return Heart;
                      default: return Clock;
                    }
                  };
                  
                  const Icon = getTipoIcon(reminder.tipo);
                  
                  // Formatar data de forma segura
                  const formatarData = (dataHora) => {
                    console.log('Tentando formatar:', dataHora);
                    
                    if (!dataHora) {
                      console.log('Data vazia');
                      return 'Data não definida';
                    }
                    
                    try {
                      const data = new Date(dataHora);
                      // console.log('Data criada:', data);
                      // console.log('getTime:', data.getTime());
                      
                      if (isNaN(data.getTime())) {
                        console.log('Data é NaN');
                        return `Data inválida: ${dataHora}`;
                      }
                      
                      const dia = String(data.getDate()).padStart(2, '0');
                      const mes = String(data.getMonth() + 1).padStart(2, '0');
                      const hora = String(data.getHours()).padStart(2, '0');
                      const minuto = String(data.getMinutes()).padStart(2, '0');
                      
                      return `${dia}/${mes} às ${hora}:${minuto}`;
                    } catch (error) {
                      console.error('Erro ao formatar data:', error);
                      return `Erro: ${dataHora}`;
                    }
                  };
                  
                  return (
                    <div key={i} className="reminder-item">
                      <div className="reminder-icon-wrapper reminder-primary">
                        <Icon className="reminder-icon" />
                      </div>
                      <div className="reminder-content">
                        <p className="reminder-title">{reminder.titulo}</p>
                        <p className="reminder-time">
                          {formatarData(reminder.data_hora)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                Nenhum lembrete próximo nos próximos 2 dias
              </p>
            )}
          </div>
        </div>

          {/* <div className="card reminders-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Próximos Lembretes</h2>
                <p className="card-description">Não esqueça de suas atividades</p>
              </div>
            </div>
            <div className="card-body">
              <div className="reminders-grid">
                {remindersData.map((reminder, i) => {
                  const Icon = reminder.icon;
                  return (
                    <div key={i} className="reminder-item">
                      <div className={`reminder-icon-wrapper ${reminder.color}`}>
                        <Icon className="reminder-icon" />
                      </div>
                      <div className="reminder-content">
                        <p className="reminder-title">{reminder.title}</p>
                        <p className="reminder-time">{reminder.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div> */}

        </div>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Novo Registro de Diálise</h2>
                <p className="modal-subtitle">Registre seus parâmetros diários</p>
              </div>
              <button 
                className="modal-close" 
                onClick={() => !loading && setShowModal(false)}
                disabled={loading}
              >
                <X className="icon" />
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div style={{
                  backgroundColor: '#fee',
                  color: '#c33',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  backgroundColor: '#efe',
                  color: '#3a3',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  
                  <div className="form-section">
                    <div className="section-header">
                      <Heart className="section-icon" />
                      <h3 className="section-title">Pressão Arterial *</h3>
                    </div>
                    <div className="form-row">
                      <div className="form-field">
                        <label>Sistólica</label>
                        <div className="input-group">
                          <input
                            type="number"
                            name="pressaoSistolica"
                            value={formData.pressaoSistolica}
                            onChange={handleInputChange}
                            placeholder="120"
                            className="form-control"
                            required
                            disabled={loading}
                          />
                          <span className="input-suffix">mmHg</span>
                        </div>
                      </div>
                      <div className="form-field">
                        <label>Diastólica</label>
                        <div className="input-group">
                          <input
                            type="number"
                            name="pressaoDiastolica"
                            value={formData.pressaoDiastolica}
                            onChange={handleInputChange}
                            placeholder="80"
                            className="form-control"
                            required
                            disabled={loading}
                          />
                          <span className="input-suffix">mmHg</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="section-header">
                      <Droplet className="section-icon" />
                      <h3 className="section-title">Volumes</h3>
                    </div>
                    <div className="form-row">
                      <div className="form-field">
                        <label>Drenagem Inicial</label>
                        <div className="input-group">
                          <input
                            type="number"
                            step="0.1"
                            name="drenagemInicial"
                            value={formData.drenagemInicial}
                            onChange={handleInputChange}
                            placeholder="1.5"
                            className="form-control"
                            disabled={loading}
                          />
                          <span className="input-suffix">L</span>
                        </div>
                      </div>
                      <div className="form-field">
                        <label>UF Total</label>
                        <div className="input-group">
                          <input
                            type="number"
                            step="0.1"
                            name="ufTotal"
                            value={formData.ufTotal}
                            onChange={handleInputChange}
                            placeholder="2.1"
                            className="form-control"
                            disabled={loading}
                          />
                          <span className="input-suffix">L</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="section-header">
                      <Clock className="section-icon" />
                      <h3 className="section-title">Tempo e Glicemia</h3>
                    </div>
                    <div className="form-row">
                      <div className="form-field">
                        <label>Tempo de Permanência</label>
                        <div className="input-group">
                          <input
                            type="number"
                            step="0.5"
                            name="tempoPermanencia"
                            value={formData.tempoPermanencia}
                            onChange={handleInputChange}
                            placeholder="4.5"
                            className="form-control"
                            disabled={loading}
                          />
                          <span className="input-suffix">horas</span>
                        </div>
                      </div>
                      <div className="form-field">
                        <label>Glicose</label>
                        <div className="input-group">
                          <input
                            type="number"
                            name="glicose"
                            value={formData.glicose}
                            onChange={handleInputChange}
                            placeholder="95"
                            className="form-control"
                            disabled={loading}
                          />
                          <span className="input-suffix">mg/dL</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-section form-section-full">
                    <div className="section-header">
                      <Activity className="section-icon" />
                      <h3 className="section-title">Concentração de Dextrose</h3>
                    </div>
                    <div className="form-field">
                      <label>Selecione a concentração</label>
                      <select
                        name="dextrose"
                        value={formData.dextrose}
                        onChange={handleInputChange}
                        className="form-select"
                        disabled={loading}
                      >
                        <option value="">Selecione...</option>
                        <option value="1.5">1.5%</option>
                        <option value="2.5">2.5%</option>
                        <option value="4.25">4.25%</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-section form-section-full">
                    <div className="section-header">
                      <FileText className="section-icon" />
                      <h3 className="section-title">Observações</h3>
                    </div>
                    <div className="form-field">
                      <label>Adicione observações (opcional)</label>
                      <textarea
                        name="observacoes"
                        value={formData.observacoes}
                        onChange={handleInputChange}
                        placeholder="Descreva sintomas, mal-estar ou qualquer observação relevante..."
                        className="form-textarea"
                        rows="4"
                        disabled={loading}
                      />
                    </div>
                  </div>

                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                className="btn-save" 
                onClick={handleSubmit}
                disabled={loading}
              >
                <Save className="icon-small" />
                {loading ? 'Salvando...' : 'Salvar Registro'}
              </button>
            </div>
          </div>
        </div>
      )};
      {showRemindersModal && (
        <RemindersModal
          isOpen={showRemindersModal}
          onClose={() => setShowRemindersModal(false)}
        />
      )};
      {showSymptomsModal && (
        <SymptomsModal
          isOpen={showSymptomsModal}
          onClose={() => setShowSymptomsModal(false)}
          onSymptomRegistered={loadDashboardData}
        />
      )};

      {showChartsModal && (
        <ChartsModal
          isOpen={showChartsModal}
          onClose={() => setShowChartsModal(false)}
        />
      )};
      {/* <MessagingComponent userRole="paciente" /> */}

    </div>
    
  );
};

export default PatientDashboard;
