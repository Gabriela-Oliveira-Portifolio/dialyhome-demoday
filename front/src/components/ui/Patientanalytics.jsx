import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Heart, Droplet, AlertCircle, Calendar, Download } from 'lucide-react';

const PatientAnalytics = ({ patientId, patientName }) => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // 7, 30, 90 dias
  const [activeChart, setActiveChart] = useState('all'); // all, pressure, uf, glucose

  useEffect(() => {
    loadAnalyticsData();
  }, [patientId, selectedPeriod]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://dialyhome.com.br/api/doctor/patients/${patientId}/analytics?days=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Erro ao carregar análises');
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #14b8a6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <p style={{ color: '#6b7280' }}>Carregando análises...</p>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
        <p>Não foi possível carregar os dados de análise</p>
      </div>
    );
  }

  const {
    pressureData,
    ufData,
    glucoseData,
    sessionFrequency,
    symptomsDistribution,
    complianceScore,
    trends,
    predictions
  } = analyticsData;

  return (
    <div style={{ padding: '1.5rem', background: '#f9fafb', minHeight: '100vh' }}>
      {/* Header com Filtros */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '16px',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' }}>
              📊 Análise Estratégica - {patientName}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Tendências e insights baseados em {selectedPeriod} dias de dados
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['7', '30', '90'].map(days => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days)}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: selectedPeriod === days ? '#14b8a6' : '#f3f4f6',
                  color: selectedPeriod === days ? 'white' : '#6b7280',
                  transition: 'all 0.2s'
                }}
              >
                {days} dias
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Score de Aderência */}
        <MetricCard
          title="Aderência ao Tratamento"
          value={`${complianceScore}%`}
          trend={complianceScore >= 80 ? 'up' : 'down'}
          trendValue={`${complianceScore >= 80 ? '+' : '-'}${Math.abs(100 - complianceScore)}%`}
          icon={<Activity size={24} color={complianceScore >= 80 ? '#10b981' : '#f59e0b'} />}
          color={complianceScore >= 80 ? '#d1fae5' : '#fef3c7'}
        />

        {/* Tendência de Pressão */}
        <MetricCard
          title="Tendência de Pressão"
          value={trends.pressure.status}
          trend={trends.pressure.direction}
          trendValue={`${trends.pressure.change}%`}
          icon={<Heart size={24} color="#ef4444" />}
          color="#fee2e2"
        />

        {/* Tendência de UF */}
        <MetricCard
          title="Volume de UF"
          value={`${trends.uf.average.toFixed(1)}L`}
          trend={trends.uf.direction}
          trendValue={`${trends.uf.change}%`}
          icon={<Droplet size={24} color="#3b82f6" />}
          color="#dbeafe"
        />

        {/* Sessões Realizadas */}
        <MetricCard
          title="Sessões no Período"
          value={sessionFrequency.total}
          trend={sessionFrequency.total >= sessionFrequency.expected ? 'up' : 'down'}
          trendValue={`${sessionFrequency.expected} esperadas`}
          icon={<Calendar size={24} color="#8b5cf6" />}
          color="#ede9fe"
        />
      </div>

      {/* Gráfico de Pressão Arterial */}
      <ChartCard title="Evolução da Pressão Arterial" icon={<Heart size={20} />}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={pressureData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '0.75rem' }}
            />
            <Tooltip 
              contentStyle={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '0.875rem' }}
            />
            <Line 
              type="monotone" 
              dataKey="systolic" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Sistólica"
              dot={{ fill: '#ef4444', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="diastolic" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Diastólica"
              dot={{ fill: '#f59e0b', r: 4 }}
            />
            {/* Linhas de referência */}
            <Line 
              type="monotone" 
              dataKey="systolicIdeal" 
              stroke="#dc2626" 
              strokeWidth={1}
              strokeDasharray="5 5"
              name="Limite Sistólica"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="diastolicIdeal" 
              stroke="#ea580c" 
              strokeWidth={1}
              strokeDasharray="5 5"
              name="Limite Diastólica"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Insights de Pressão */}
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
            <strong>💡 Insight:</strong> {trends.pressure.insight}
          </p>
        </div>
      </ChartCard>

      {/* Gráficos em Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginTop: '1.5rem'
      }}>
        {/* Gráfico de UF */}
        <ChartCard title="Ultrafiltração (UF)" icon={<Droplet size={20} />}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={ufData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '0.75rem' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '0.75rem' }}
              />
              <Tooltip 
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
                formatter={(value) => `${(value / 1000).toFixed(1)}L`}
              />
              <Area 
                type="monotone" 
                dataKey="uf" 
                stroke="#3b82f6" 
                fill="#93c5fd"
                strokeWidth={2}
                name="Volume de UF"
              />
            </AreaChart>
          </ResponsiveContainer>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <div>
              <p style={{ color: '#6b7280', margin: '0 0 0.25rem 0' }}>Média</p>
              <p style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                {(trends.uf.average / 1000).toFixed(1)}L
              </p>
            </div>
            <div>
              <p style={{ color: '#6b7280', margin: '0 0 0.25rem 0' }}>Máximo</p>
              <p style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                {(trends.uf.max / 1000).toFixed(1)}L
              </p>
            </div>
            <div>
              <p style={{ color: '#6b7280', margin: '0 0 0.25rem 0' }}>Mínimo</p>
              <p style={{ fontWeight: '700', color: '#111827', margin: 0 }}>
                {(trends.uf.min / 1000).toFixed(1)}L
              </p>
            </div>
          </div>
        </ChartCard>

        {/* Gráfico de Glicose */}
        <ChartCard title="Controle Glicêmico" icon={<Activity size={20} />}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={glucoseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '0.75rem' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '0.75rem' }}
              />
              <Tooltip 
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
                formatter={(value) => `${value} mg/dL`}
              />
              <Bar 
                dataKey="glucose" 
                fill="#8b5cf6"
                name="Glicose"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: trends.glucose.status === 'Controlada' ? '#d1fae5' : '#fee2e2', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.875rem', color: trends.glucose.status === 'Controlada' ? '#065f46' : '#991b1b', margin: 0 }}>
              <strong>Status:</strong> {trends.glucose.status} - Média de {trends.glucose.average} mg/dL
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Análises Avançadas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginTop: '1.5rem'
      }}>
        {/* Distribuição de Sintomas */}
        <ChartCard title="Sintomas Relatados" icon={<AlertCircle size={20} />}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={symptomsDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {symptomsDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          
          <div style={{ marginTop: '1rem' }}>
            {symptomsDistribution.map((symptom, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem',
                marginBottom: '0.5rem',
                background: '#f9fafb',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    background: symptom.color,
                    borderRadius: '3px'
                  }} />
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                    {symptom.name}
                  </span>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                  {symptom.value} sessões
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Radar de Performance */}
        <ChartCard title="Radar de Indicadores" icon={<TrendingUp size={20} />}>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={[
              { subject: 'Aderência', A: complianceScore, fullMark: 100 },
              { subject: 'Pressão', A: trends.pressure.score, fullMark: 100 },
              { subject: 'UF', A: trends.uf.score, fullMark: 100 },
              { subject: 'Glicose', A: trends.glucose.score, fullMark: 100 },
              { subject: 'Sintomas', A: trends.symptoms.score, fullMark: 100 }
            ]}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis 
                dataKey="subject" 
                stroke="#6b7280"
                style={{ fontSize: '0.75rem' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                stroke="#6b7280"
                style={{ fontSize: '0.75rem' }}
              />
              <Radar 
                name="Performance" 
                dataKey="A" 
                stroke="#14b8a6" 
                fill="#14b8a6" 
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#ecfdf5', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.875rem', color: '#065f46', margin: 0 }}>
              <strong>Análise Geral:</strong> {predictions.overallStatus}
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Predições e Recomendações */}
      <div style={{
        marginTop: '1.5rem',
        background: 'white',
        padding: '1.5rem',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 1rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <TrendingUp size={24} color="#14b8a6" />
          Predições e Recomendações
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {predictions.recommendations.map((rec, index) => (
            <div
              key={index}
              style={{
                padding: '1rem',
                background: rec.priority === 'high' ? '#fef3c7' : rec.priority === 'medium' ? '#e0f2fe' : '#f0fdf4',
                border: `2px solid ${rec.priority === 'high' ? '#f59e0b' : rec.priority === 'medium' ? '#3b82f6' : '#10b981'}`,
                borderRadius: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: rec.priority === 'high' ? '#f59e0b' : rec.priority === 'medium' ? '#3b82f6' : '#10b981',
                  borderRadius: '50%'
                }} />
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  {rec.priority === 'high' ? 'Alta Prioridade' : rec.priority === 'medium' ? 'Média Prioridade' : 'Baixa Prioridade'}
                </span>
              </div>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 0.5rem 0'
              }}>
                {rec.title}
              </h4>
              <p style={{
                fontSize: '0.875rem',
                color: '#374151',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {rec.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Botão de Exportar
      <div style={{
        marginTop: '1.5rem',
        textAlign: 'center'
      }}>
        <button
          onClick={() => {/* Implementar exportação /}}
          style={{
            padding: '1rem 2rem',
            background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 6px rgba(20, 184, 166, 0.2)'
          }}
        >
          <Download size={20} />
          Exportar Análise Completa
        </button>
      </div> */}
    </div>
  );
};

// Componente de Card de Métrica
const MetricCard = ({ title, value, trend, trendValue, icon, color }) => (
  <div style={{
    background: 'white',
    padding: '1.25rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s'
  }}
  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '600' }}>
          {title}
        </p>
        <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827', margin: 0 }}>
          {value}
        </p>
      </div>
      <div style={{
        width: '48px',
        height: '48px',
        background: color,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
    </div>
    
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {trend === 'up' ? (
        <TrendingUp size={16} color="#10b981" />
      ) : trend === 'down' ? (
        <TrendingDown size={16} color="#ef4444" />
      ) : (
        <Activity size={16} color="#6b7280" />
      )}
      <span style={{
        fontSize: '0.875rem',
        color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280',
        fontWeight: '600'
      }}>
        {trendValue}
      </span>
    </div>
  </div>
);

// Componente de Card de Gráfico
const ChartCard = ({ title, icon, children }) => (
  <div style={{
    background: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }}>
    <h3 style={{
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#111827',
      margin: '0 0 1.5rem 0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}>
      {icon}
      {title}
    </h3>
    {children}
  </div>
);

export default PatientAnalytics;