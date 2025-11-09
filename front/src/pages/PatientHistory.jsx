import React, { useState, useEffect } from 'react';
import { 
  Heart, Activity, Droplet, FileText, Calendar, 
  ArrowLeft, Filter, Download,
  AlertCircle, CheckCircle, Bell, User, LogOut
} from 'lucide-react';
import { getPatientRecords } from '../services/dialysis';
import { getSymptomsHistory } from '../services/symptoms';
import { getDetailedStats } from '../services/patient';
import { useNavigate } from 'react-router-dom';

const PatientHistory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dialise');
  const [dateFilter, setDateFilter] = useState('30');
  const [error, setError] = useState('');
  
  const [historyData, setHistoryData] = useState({
    dialysisRecords: [],
    symptoms: [],
    stats: null
  });

  useEffect(() => {
    loadHistoryData();
  }, [dateFilter]);

  const loadHistoryData = async () => {
    setLoading(true);
    setError('');
    try {
      // Calcular a data de início do filtro
      const daysAgo = parseInt(dateFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      // Carregar dados reais da API
      const [dialysisData, symptomsData, statsData] = await Promise.all([
        getPatientRecords(100), // Buscar muitos registros para o histórico
        getSymptomsHistory(100, 0),
        getDetailedStats(daysAgo)
      ]);

      // Processar registros de diálise e filtrar por data
      const processedDialysis = dialysisData.records
        .filter(record => {
          const recordDate = new Date(record.data_registro);
          return recordDate >= startDate;
        })
        .map(record => ({
          id: record.id,
          data: new Date(record.data_registro).toLocaleDateString('pt-BR'),
          dataOriginal: record.data_registro, // Manter para ordenação
          pressaoSistolica: record.pressao_arterial_sistolica,
          pressaoDiastolica: record.pressao_arterial_diastolica,
          ufTotal: record.uf_total ? (record.uf_total / 1000).toFixed(1) : 'N/A',
          glicose: record.concentracao_glicose || 'N/A',
          tempoPermanencia: record.tempo_permanencia || 'N/A',
          dextrose: record.concentracao_dextrose || 'N/A',
          observacoes: record.observacoes,
          status: determineStatus(record)
        }))
        .sort((a, b) => new Date(b.dataOriginal) - new Date(a.dataOriginal)); // Ordenar do mais recente para o mais antigo

      // Processar sintomas e filtrar por data
      const processedSymptoms = symptomsData.symptoms
        .filter(symptom => {
          const symptomDate = new Date(symptom.data_registro);
          return symptomDate >= startDate;
        })
        .map(symptom => ({
          id: symptom.sintoma_registro_id,
          registroId: symptom.registro_id,
          data: new Date(symptom.data_registro).toLocaleDateString('pt-BR'),
          dataOriginal: symptom.data_registro, // Manter para ordenação
          sintoma: symptom.sintoma_nome,
          categoria: symptom.categoria,
          severidade: symptom.severidade,
          intensidade: getSeverityLevel(symptom.severidade),
          descricao: symptom.observacoes || 'Sem observações adicionais',
          resolvido: false // Você pode adicionar lógica para determinar isso
        }))
        .sort((a, b) => new Date(b.dataOriginal) - new Date(a.dataOriginal)); // Ordenar do mais recente para o mais antigo

      // Processar estatísticas
      const processedStats = {
        totalRegistros: statsData.summary?.total_registros || 0,
        mediaPA: statsData.averages?.pressao_sistolica?.value && statsData.averages?.pressao_diastolica?.value
          ? `${statsData.averages.pressao_sistolica.value}/${statsData.averages.pressao_diastolica.value}`
          : 'N/A',
        mediaUF: statsData.averages?.uf_total?.value || 'N/A',
        mediaGlicose: statsData.averages?.glicose?.value || 'N/A',
        mediaTempo: statsData.averages?.tempo_permanencia?.value || 'N/A'
      };

      setHistoryData({
        dialysisRecords: processedDialysis,
        symptoms: processedSymptoms,
        stats: processedStats
      });
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setError('Erro ao carregar dados do histórico');
      
      // Se for erro de autenticação, redirecionar
      if (err.error?.includes('Token') || err.error?.includes('autenticação')) {
        sessionStorage.clear();
        globalThis.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const determineStatus = (record) => {
    // Lógica para determinar o status baseado nos valores
    const sistolica = record.pressao_arterial_sistolica;
    const diastolica = record.pressao_arterial_diastolica;
    
    if (sistolica > 140 || diastolica > 90 || sistolica < 90 || diastolica < 60) {
      return 'atencao';
    }
    return 'normal';
  };

  const getSeverityLevel = (severity) => {
    // Converter severidade em número de 1-10
    const severityMap = {
      'leve': 3,
      'moderada': 6,
      'grave': 9,
      'muito_grave': 10
    };
    return severityMap[severity] || 5;
  };

  const handleBack = () => {
    globalThis.history.back();
  };

  const handleLogout = () => {
    sessionStorage.clear();
    globalThis.location.href = '/login';
  };

  const handleProfile = () => {
    navigate('/perfil');
  };
  const handleExport = () => {
    // Criar relatório para exportação
    const report = {
      dataExportacao: new Date().toISOString(),
      periodo: `Últimos ${dateFilter} dias`,
      estatisticas: historyData.stats,
      registrosDialise: historyData.dialysisRecords,
      sintomas: historyData.symptoms
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-dialise-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
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
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#374151',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
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
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
              DialyHome
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* <button style={{
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
              <Bell size={20} color="#6b7280" strokeWidth={2} />
            </button> */}
            <button onClick={handleProfile} style={{
              
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
              <User size={20} color="#6b7280" strokeWidth={2} />
            </button>
            <button
              onClick={handleLogout}
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
              <LogOut size={20} color="#6b7280" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Title Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Histórico Completo
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Acompanhe todo seu histórico de tratamento e sintomas
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c33',
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

          {/* Stats Summary Cards */}
          {historyData.stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <StatCard
                icon={FileText}
                title="Total de Registros"
                value={historyData.stats.totalRegistros}
                color="#14b8a6"
              />
              <StatCard
                icon={Heart}
                title="Pressão Média"
                value={historyData.stats.mediaPA}
                subtitle="mmHg"
                color="#10b981"
              />
              <StatCard
                icon={Droplet}
                title="UF Média"
                value={historyData.stats.mediaUF}
                subtitle="L"
                color="#3b82f6"
              />
              <StatCard
                icon={Activity}
                title="Glicose Média"
                value={historyData.stats.mediaGlicose}
                subtitle="mg/dL"
                color="#8b5cf6"
              />
            </div>
          )}

          {/* Filters */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Filter size={20} color="#6b7280" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Último ano</option>
              </select>
            </div>
            
            {/* <button
              onClick={handleExport}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: loading ? '#d1d5db' : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <Download size={18} />
              Exportar Relatório
            </button> */}
          </div>

          {/* Tabs */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            gap: '0.5rem'
          }}>
            <TabButton
              active={activeTab === 'dialise'}
              onClick={() => setActiveTab('dialise')}
              icon={Droplet}
              label="Diálise"
            />
            <TabButton
              active={activeTab === 'sintomas'}
              onClick={() => setActiveTab('sintomas')}
              icon={Activity}
              label="Sintomas"
            />
            {/* <TabButton
              active={activeTab === 'graficos'}
              onClick={() => setActiveTab('graficos')}
              icon={TrendingUp}
              label="Gráficos"
            /> */}
          </div>

          {/* Content Area */}
          {loading ? (
            <LoadingState />
          ) : (
            <>
              {activeTab === 'dialise' && (
                <DialysisHistory records={historyData.dialysisRecords} />
              )}
              {activeTab === 'sintomas' && (
                <SymptomsHistory symptoms={historyData.symptoms} />
              )}
              {/* {activeTab === 'graficos' && (
                <GraphicsView stats={historyData.stats} />
              )} */}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// Componentes auxiliares
const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f3f4f6',
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
      <div style={{
        width: '40px',
        height: '40px',
        background: `${color}20`,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
        {title}
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
      <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827' }}>
        {value}
      </span>
      {subtitle && (
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {subtitle}
        </span>
      )}
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      padding: '1rem',
      background: active ? 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)' : 'transparent',
      color: active ? 'white' : '#6b7280',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      fontSize: '0.95rem',
      fontWeight: '600',
      transition: 'all 0.2s'
    }}
  >
    <Icon size={18} />
    {label}
  </button>
);

const DialysisHistory = ({ records }) => {
  if (records.length === 0) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '3rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        textAlign: 'center'
      }}>
        <Droplet size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          Nenhum registro de diálise encontrado no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>
        Histórico de Diálise ({records.length} registros)
      </h2>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={tableHeaderStyle}>Data</th>
              <th style={tableHeaderStyle}>PA (mmHg)</th>
              <th style={tableHeaderStyle}>UF (L)</th>
              <th style={tableHeaderStyle}>Glicose</th>
              <th style={tableHeaderStyle}>Tempo</th>
              <th style={tableHeaderStyle}>Dextrose</th>
              <th style={tableHeaderStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={record.id} style={{
                borderBottom: '1px solid #f3f4f6',
                background: index % 2 === 0 ? 'white' : '#fafafa',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f0fdfa';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafafa';
              }}
              >
                <td style={tableCellStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="#6b7280" />
                    {record.data}
                  </div>
                </td>
                <td style={tableCellStyle}>
                  <strong>{record.pressaoSistolica}</strong>/{record.pressaoDiastolica}
                </td>
                <td style={tableCellStyle}>{record.ufTotal}</td>
                <td style={tableCellStyle}>{record.glicose}</td>
                <td style={tableCellStyle}>{record.tempoPermanencia}</td>
                <td style={tableCellStyle}>{record.dextrose}%</td>
                <td style={tableCellStyle}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    background: record.status === 'normal' ? '#dcfce7' : '#fef3c7',
                    color: record.status === 'normal' ? '#16a34a' : '#f59e0b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {record.status === 'normal' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {record.status === 'normal' ? 'Normal' : 'Atenção'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SymptomsHistory = ({ symptoms }) => {
  if (symptoms.length === 0) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '3rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        textAlign: 'center'
      }}>
        <Activity size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          Nenhum sintoma registrado no período selecionado.
        </p>
      </div>
    );
  }

  const getSeverityColor = (severidade) => {
    const colors = {
      'leve': '#10b981',
      'moderada': '#f59e0b',
      'grave': '#ef4444',
      'muito_grave': '#991b1b'
    };
    return colors[severidade] || '#6b7280';
  };

  const getSeverityLabel = (severidade) => {
    const labels = {
      'leve': 'Leve',
      'moderada': 'Moderada',
      'grave': 'Grave',
      'muito_grave': 'Muito Grave'
    };
    return labels[severidade] || severidade;
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>
        Histórico de Sintomas ({symptoms.length} registros)
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {symptoms.map((symptom) => (
          <div key={symptom.id} style={{
            padding: '1.25rem',
            background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#14b8a6';
            e.currentTarget.style.transform = 'translateX(4px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <AlertCircle size={20} color={getSeverityColor(symptom.severidade)} />
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {symptom.sintoma}
                  </h3>
                  {symptom.categoria && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: '#e0f2fe',
                      color: '#0891b2'
                    }}>
                      {symptom.categoria}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  {symptom.descricao}
                </p>
              </div>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: '600',
                background: `${getSeverityColor(symptom.severidade)}20`,
                color: getSeverityColor(symptom.severidade),
                whiteSpace: 'nowrap',
                marginLeft: '1rem'
              }}>
                {getSeverityLabel(symptom.severidade)}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} color="#6b7280" />
                <span style={{ color: '#6b7280' }}>{symptom.data}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#6b7280', fontWeight: '500' }}>Intensidade:</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} style={{
                      width: '8px',
                      height: '16px',
                      background: i < symptom.intensidade ? getSeverityColor(symptom.severidade) : '#e5e7eb',
                      borderRadius: '2px',
                      transition: 'background 0.2s'
                    }} />
                  ))}
                </div>
                <span style={{ color: getSeverityColor(symptom.severidade), fontWeight: '600', marginLeft: '0.5rem' }}>
                  {symptom.intensidade}/10
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// const GraphicsView = () => (
//   <div style={{
//     background: 'white',
//     borderRadius: '16px',
//     padding: '3rem 1.5rem',
//     boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
//     textAlign: 'center'
//   }}>
//     <div style={{
//       width: '80px',
//       height: '80px',
//       background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
//       borderRadius: '20px',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       margin: '0 auto 1.5rem',
//       boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.4)'
//     }}>
//       <TrendingUp size={40} color="white" strokeWidth={2} />
//     </div>
//     <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#111827' }}>
//       Visualização de Gráficos
//     </h2>
//     <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
//       Esta funcionalidade será implementada em breve com gráficos interativos mostrando tendências de pressão arterial, UF, glicose e outros parâmetros ao longo do tempo.
//     </p>
//     <div style={{
//       display: 'grid',
//       gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
//       gap: '1rem',
//       marginTop: '2rem',
//       maxWidth: '600px',
//       margin: '2rem auto 0'
//     }}>
//       <div style={{
//         padding: '1rem',
//         background: '#f0fdfa',
//         borderRadius: '12px',
//         border: '1px solid #ccfbf1'
//       }}>
//         <TrendingUp size={24} color="#14b8a6" style={{ marginBottom: '0.5rem' }} />
//         <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Tendências</p>
//       </div>
//       <div style={{
//         padding: '1rem',
//         background: '#f0fdfa',
//         borderRadius: '12px',
//         border: '1px solid #ccfbf1'
//       }}>
//         <Activity size={24} color="#10b981" style={{ marginBottom: '0.5rem' }} />
//         <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Comparações</p>
//       </div>
//       <div style={{
//         padding: '1rem',
//         background: '#f0fdfa',
//         borderRadius: '12px',
//         border: '1px solid #ccfbf1'
//       }}>
//         <FileText size={24} color="#0891b2" style={{ marginBottom: '0.5rem' }} />
//         <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Relatórios</p>
//       </div>
//     </div>
//   </div>
// );

const LoadingState = () => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '4rem',
    textAlign: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      border: '4px solid #e5e7eb',
      borderTop: '4px solid #14b8a6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 1rem'
    }} />
    <p style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '500' }}>Carregando histórico...</p>
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

export default PatientHistory;
