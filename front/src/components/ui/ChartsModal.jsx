import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, TrendingUp, Activity, Heart, Droplet, Clock } from 'lucide-react';
import { getPatientRecords } from '../../services/dialysis';
import { getDetailedStats } from '../../services/patient';

const ChartsModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [chartsData, setChartsData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [activeChart, setActiveChart] = useState('pressao');

  useEffect(() => {
    if (isOpen) {
      loadChartsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedPeriod]);

  const loadChartsData = async () => {
    setLoading(true);
    try {
      const [records] = await Promise.all([
        getPatientRecords(100),
        getDetailedStats(Number.parseInt(selectedPeriod, 10))
      ]);

      // Processar dados para os gráficos
      const processedData = processDataForCharts(records.records);
      setChartsData(processedData);
    } catch (error) {
      console.error('Erro ao carregar dados dos gráficos:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDataForCharts = (records) => {
    if (!records || records.length === 0) return null;

    // Ordenar por data
    const sorted = [...records].sort((a, b) => 
      new Date(a.data_registro) - new Date(b.data_registro)
    );

    // Limitar aos últimos N registros baseado no período
    let limit;
    if (selectedPeriod === '7') {
      limit = 7;
    } else if (selectedPeriod === '30') {
      limit = 30;
    } else {
      limit = 90;
    }
    
    const limited = sorted.slice(-limit);

    return {
      labels: limited.map(r => new Date(r.data_registro).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      })),
      pressaoSistolica: limited.map(r => r.pressao_arterial_sistolica),
      pressaoDiastolica: limited.map(r => r.pressao_arterial_diastolica),
      ufTotal: limited.map(r => r.uf_total ? (r.uf_total / 1000).toFixed(1) : 0),
      glicose: limited.map(r => r.concentracao_glicose || 0),
      tempo: limited.map(r => r.tempo_permanencia ? (r.tempo_permanencia / 60).toFixed(1) : 0)
    };
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0,
                background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Análise Gráfica do Tratamento
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                Visualize a evolução dos seus parâmetros clínicos
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: '#f3f4f6',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Filtros */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginTop: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '0.95rem',
                cursor: 'pointer',
                outline: 'none',
                background: 'white'
              }}
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          padding: '1rem 2rem',
          gap: '0.5rem',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto'
        }}>
          <ChartTab
            active={activeChart === 'pressao'}
            onClick={() => setActiveChart('pressao')}
            icon={Heart}
            label="Pressão Arterial"
          />
          <ChartTab
            active={activeChart === 'uf'}
            onClick={() => setActiveChart('uf')}
            icon={Droplet}
            label="Ultrafiltração"
          />
          <ChartTab
            active={activeChart === 'glicose'}
            onClick={() => setActiveChart('glicose')}
            icon={Activity}
            label="Glicose"
          />
          <ChartTab
            active={activeChart === 'tempo'}
            onClick={() => setActiveChart('tempo')}
            icon={Clock}
            label="Tempo"
          />
          <ChartTab
            active={activeChart === 'todos'}
            onClick={() => setActiveChart('todos')}
            icon={TrendingUp}
            label="Visão Geral"
          />
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto'
        }}>
          {loading ? (
            <LoadingState />
          ) : chartsData ? (
            <>
              {activeChart === 'pressao' && <PressaoChart data={chartsData} />}
              {activeChart === 'uf' && <UFChart data={chartsData} />}
              {activeChart === 'glicose' && <GlicoseChart data={chartsData} />}
              {activeChart === 'tempo' && <TempoChart data={chartsData} />}
              {activeChart === 'todos' && <OverviewCharts data={chartsData} />}
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
};

ChartsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

// Componente de Tab
const ChartTab = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.75rem 1.25rem',
      background: active ? 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)' : 'transparent',
      color: active ? 'white' : '#6b7280',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.9rem',
      fontWeight: '600',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap'
    }}
  >
    <Icon size={16} />
    {label}
  </button>
);

ChartTab.propTypes = {
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired
};

// Gráfico de Pressão Arterial
const PressaoChart = ({ data }) => {
  const maxValue = Math.max(...data.pressaoSistolica, ...data.pressaoDiastolica);
  const chartHeight = 300;

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
        Evolução da Pressão Arterial
      </h3>
      
      <div style={{ 
        background: '#f9fafb', 
        borderRadius: '12px', 
        padding: '2rem',
        position: 'relative'
      }}>
        <svg width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <line
              key={`grid-${percent}`}
              x1="0"
              y1={(chartHeight * percent) / 100}
              x2="100%"
              y2={(chartHeight * percent) / 100}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* Linha Sistólica */}
          <polyline
            points={data.pressaoSistolica.map((val, i) => {
              const x = (i / (data.pressaoSistolica.length - 1)) * 100;
              const y = chartHeight - (val / maxValue) * chartHeight;
              return `${x}%,${y}`;
            }).join(' ')}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Linha Diastólica */}
          <polyline
            points={data.pressaoDiastolica.map((val, i) => {
              const x = (i / (data.pressaoDiastolica.length - 1)) * 100;
              const y = chartHeight - (val / maxValue) * chartHeight;
              return `${x}%,${y}`;
            }).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontos Sistólica */}
          {data.pressaoSistolica.map((val, i) => {
            const x = (i / (data.pressaoSistolica.length - 1)) * 100;
            const y = chartHeight - (val / maxValue) * chartHeight;
            return (
              <circle
                key={`sist-point-${i}-${val}`}
                cx={`${x}%`}
                cy={y}
                r="4"
                fill="#ef4444"
              />
            );
          })}

          {/* Pontos Diastólica */}
          {data.pressaoDiastolica.map((val, i) => {
            const x = (i / (data.pressaoDiastolica.length - 1)) * 100;
            const y = chartHeight - (val / maxValue) * chartHeight;
            return (
              <circle
                key={`diast-point-${i}-${val}`}
                cx={`${x}%`}
                cy={y}
                r="4"
                fill="#3b82f6"
              />
            );
          })}
        </svg>

        {/* Labels */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          {data.labels.map((label, i) => (
            <span key={`label-${i}-${label}`}>{label}</span>
          ))}
        </div>

        {/* Legend */}
        <div style={{ 
          display: 'flex', 
          gap: '2rem', 
          marginTop: '1.5rem',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '3px', background: '#ef4444', borderRadius: '2px' }} />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Sistólica</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '3px', background: '#3b82f6', borderRadius: '2px' }} />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Diastólica</span>
          </div>
        </div>

        {/* Faixas de referência */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'white',
          borderRadius: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Normal</p>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10b981', margin: '0.25rem 0 0 0' }}>
              {'<120/80 mmHg'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Elevada</p>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f59e0b', margin: '0.25rem 0 0 0' }}>
              120-139/80-89
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Alta</p>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ef4444', margin: '0.25rem 0 0 0' }}>
              {'>140/90 mmHg'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

PressaoChart.propTypes = {
  data: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string).isRequired,
    pressaoSistolica: PropTypes.arrayOf(PropTypes.number).isRequired,
    pressaoDiastolica: PropTypes.arrayOf(PropTypes.number).isRequired
  }).isRequired
};

// Gráfico de UF
const UFChart = ({ data }) => {
  const maxValue = Math.max(...data.ufTotal.map(v => Number.parseFloat(v)));
  const chartHeight = 300;

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
        Evolução da Ultrafiltração
      </h3>
      
      <div style={{ 
        background: '#f9fafb', 
        borderRadius: '12px', 
        padding: '2rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: `${chartHeight}px` }}>
          {data.ufTotal.map((val, i) => {
            const height = (Number.parseFloat(val) / maxValue) * 100;
            return (
              <div
                key={`uf-bar-${i}-${val}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#14b8a6' }}>
                  {val}L
                </span>
                <div
                  style={{
                    width: '100%',
                    height: `${height}%`,
                    background: 'linear-gradient(180deg, #14b8a6 0%, #0d9488 100%)',
                    borderRadius: '8px 8px 0 0',
                    transition: 'all 0.3s',
                    position: 'relative'
                  }}
                  title={`${data.labels[i]}: ${val}L`}
                />
              </div>
            );
          })}
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          {data.labels.map((label, i) => (
            <span key={`uf-label-${i}-${label}`} style={{ flex: 1, textAlign: 'center' }}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

UFChart.propTypes = {
  data: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string).isRequired,
    ufTotal: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired
  }).isRequired
};

// Gráfico de Glicose
const GlicoseChart = ({ data }) => {
  const maxValue = Math.max(...data.glicose);
  const minValue = Math.min(...data.glicose.filter(v => v > 0));
  const chartHeight = 300;

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
        Evolução da Glicose
      </h3>
      
      <div style={{ 
        background: '#f9fafb', 
        borderRadius: '12px', 
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Faixa normal (70-100 mg/dL) */}
        <div style={{
          position: 'absolute',
          left: '2rem',
          right: '2rem',
          top: '2rem',
          height: `${chartHeight}px`,
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '4px',
          zIndex: 0
        }} />

        <svg width="100%" height={chartHeight} style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}>
          {/* Área do gráfico */}
          <defs>
            <linearGradient id="glicoseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          <polygon
            points={[
              '0,' + chartHeight,
              ...data.glicose.map((val, i) => {
                const x = (i / (data.glicose.length - 1)) * 100;
                const y = chartHeight - ((val - minValue) / (maxValue - minValue)) * chartHeight;
                return `${x}%,${y}`;
              }),
              '100%,' + chartHeight
            ].join(' ')}
            fill="url(#glicoseGradient)"
          />

          {/* Linha */}
          <polyline
            points={data.glicose.map((val, i) => {
              const x = (i / (data.glicose.length - 1)) * 100;
              const y = chartHeight - ((val - minValue) / (maxValue - minValue)) * chartHeight;
              return `${x}%,${y}`;
            }).join(' ')}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontos */}
          {data.glicose.map((val, i) => {
            const x = (i / (data.glicose.length - 1)) * 100;
            const y = chartHeight - ((val - minValue) / (maxValue - minValue)) * chartHeight;
            return (
              <circle
                key={`glicose-point-${i}-${val}`}
                cx={`${x}%`}
                cy={y}
                r="4"
                fill="#8b5cf6"
              />
            );
          })}
        </svg>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          {data.labels.map((label, i) => (
            <span key={`glicose-label-${i}-${label}`}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

GlicoseChart.propTypes = {
  data: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string).isRequired,
    glicose: PropTypes.arrayOf(PropTypes.number).isRequired
  }).isRequired
};

// Gráfico de Tempo
const TempoChart = ({ data }) => (
  <div>
    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
      Tempo de Permanência
    </h3>
    
    <div style={{ 
      background: '#f9fafb', 
      borderRadius: '12px', 
      padding: '2rem'
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {data.tempo.map((val, i) => (
          <div
            key={`tempo-card-${i}-${val}`}
            style={{
              flex: '1 1 calc(20% - 1rem)',
              minWidth: '100px',
              padding: '1rem',
              background: 'white',
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              textAlign: 'center'
            }}
          >
            <Clock size={24} color="#f59e0b" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0.5rem 0' }}>
              {val}h
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
              {data.labels[i]}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

TempoChart.propTypes = {
  data: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string).isRequired,
    tempo: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired
  }).isRequired
};

// Visão Geral
const OverviewCharts = ({ data }) => {
  const calculateAverage = (arr) => {
    const validValues = arr.filter(v => v > 0);
    if (validValues.length === 0) return 0;
    
    const sum = validValues.reduce((a, b) => Number.parseFloat(a) + Number.parseFloat(b), 0);
    return (sum / validValues.length).toFixed(1);
  };

  const stats = [
    {
      label: 'Pressão Sistólica Média',
      value: calculateAverage(data.pressaoSistolica),
      unit: 'mmHg',
      icon: Heart,
      color: '#ef4444'
    },
    {
      label: 'Pressão Diastólica Média',
      value: calculateAverage(data.pressaoDiastolica),
      unit: 'mmHg',
      icon: Heart,
      color: '#3b82f6'
    },
    {
      label: 'UF Média',
      value: calculateAverage(data.ufTotal),
      unit: 'L',
      icon: Droplet,
      color: '#14b8a6'
    },
    {
      label: 'Glicose Média',
      value: calculateAverage(data.glicose),
      unit: 'mg/dL',
      icon: Activity,
      color: '#8b5cf6'
    },
    {
      label: 'Tempo Médio',
      value: calculateAverage(data.tempo),
      unit: 'horas',
      icon: Clock,
      color: '#f59e0b'
    }
  ];

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
        Resumo Estatístico
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={`stat-card-${i}-${stat.label}`}
              style={{
                padding: '1.5rem',
                background: 'white',
                borderRadius: '16px',
                border: '2px solid #e5e7eb',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: `${stat.color}20`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Icon size={24} color={stat.color} />
              </div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                {stat.label}
              </p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {stat.value}
                <span style={{ fontSize: '1rem', fontWeight: '500', color: '#6b7280', marginLeft: '0.5rem' }}>
                  {stat.unit}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

OverviewCharts.propTypes = {
  data: PropTypes.shape({
    pressaoSistolica: PropTypes.arrayOf(PropTypes.number).isRequired,
    pressaoDiastolica: PropTypes.arrayOf(PropTypes.number).isRequired,
    ufTotal: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired,
    glicose: PropTypes.arrayOf(PropTypes.number).isRequired,
    tempo: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired
  }).isRequired
};

// Loading State
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
      Carregando gráficos...
    </p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Empty State
const EmptyState = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    textAlign: 'center'
  }}>
    <TrendingUp size={64} color="#d1d5db" style={{ marginBottom: '1rem' }} />
    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
      Sem dados suficientes
    </h3>
    <p style={{ color: '#6b7280', maxWidth: '400px' }}>
      Adicione mais registros de diálise para visualizar os gráficos de evolução do seu tratamento.
    </p>
  </div>
);

export default ChartsModal;