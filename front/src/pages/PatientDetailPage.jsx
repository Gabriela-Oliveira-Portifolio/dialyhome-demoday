// PatientDetailPage.jsx - Criar em src/pages/PatientDetailPage.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Activity, Heart, AlertCircle,
  Pill, FileText, TrendingUp, Send
} from 'lucide-react';
import {
  getPatientDetails,
  getPatientDialysisHistory,
  sendRecommendation
} from '../services/doctor';

const PatientDetailPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [dialysisHistory, setDialysisHistory] = useState([]);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [recommendation, setRecommendation] = useState({ titulo: '', mensagem: '' });

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    setError('');
    try {
      const [details, history] = await Promise.all([
        getPatientDetails(patientId),
        getPatientDialysisHistory(patientId, { limit: 30 })
      ]);
      
      setPatientData(details);
      setDialysisHistory(history.records || []);
    } catch (err) {
      console.error('Erro ao carregar dados do paciente:', err);
      setError(err.error || 'Erro ao carregar dados do paciente');
      
      // Se houver erro de autenticação, redirecionar para login
      if (err.error?.includes('Token') || err.error?.includes('autenticação')) {
        sessionStorage.clear();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendRecommendation = async () => {
    if (!recommendation.titulo || !recommendation.mensagem) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      await sendRecommendation(patientId, recommendation);
      alert('Recomendação enviada com sucesso!');
      setShowRecommendationModal(false);
      setRecommendation({ titulo: '', mensagem: '' });
    } catch (err) {
      alert('Erro ao enviar recomendação: ' + (err.error || 'Erro desconhecido'));
    }
  };

  if (loading) {
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
          <p style={{ color: '#6b7280' }}>Carregando dados do paciente...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #ecfdf5 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Erro ao Carregar
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={() => navigate('/medico/dashboard')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #ecfdf5 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <button
            onClick={() => navigate('/medico/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'transparent',
              border: 'none',
              color: '#14b8a6',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            <ArrowLeft size={20} />
            Voltar ao Dashboard
          </button>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '0.5rem'
              }}>
                {patientData?.patient?.nome}
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                {patientData?.patient?.email} • {patientData?.patient?.idade} anos
              </p>
            </div>
            
            <button
              onClick={() => setShowRecommendationModal(true)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Send size={18} />
              Enviar Recomendação
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {patientData?.stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#dbeafe',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Activity size={24} color="#3b82f6" />
              </div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                Total de Sessões (30 dias)
              </p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {patientData.stats.total_sessoes || 0}
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#fce7f3',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Heart size={24} color="#ec4899" />
              </div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                Pressão Arterial Média
              </p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {patientData.stats.media_sistolica 
                  ? `${Math.round(patientData.stats.media_sistolica)}/${Math.round(patientData.stats.media_diastolica)}`
                  : 'N/A'}
              </p>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#dcfce7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <TrendingUp size={24} color="#10b981" />
              </div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                UF Médio
              </p>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {patientData.stats.media_uf 
                  ? `${(patientData.stats.media_uf / 1000).toFixed(1)}L`
                  : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Medications */}
        {patientData?.medications && patientData.medications.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Pill size={24} />
              Medicamentos Ativos
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              {patientData.medications.map((med, index) => (
                <div key={index} style={{
                  padding: '1rem',
                  background: '#f0f9ff',
                  borderRadius: '10px',
                  border: '1px solid #e0f2fe'
                }}>
                  <p style={{ fontWeight: '600', color: '#111827', margin: '0 0 0.5rem 0', fontSize: '1.05rem' }}>
                    {med.nome}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0' }}>
                    <strong>Dosagem:</strong> {med.dosagem}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0' }}>
                    <strong>Frequência:</strong> {med.frequencia}
                  </p>
                  {med.observacoes && (
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                      {med.observacoes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dialysis History */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FileText size={24} />
            Histórico de Diálise ({dialysisHistory.length} registros)
          </h2>
          
          {dialysisHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {dialysisHistory.map((record, index) => (
                <div key={index} style={{
                  padding: '1.25rem',
                  background: '#f9fafb',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#111827', fontSize: '1.05rem' }}>
                        {new Date(record.data_registro).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <span style={{ color: '#6b7280' }}>
                      {record.horario_inicio && record.horario_fim 
                        ? `${record.horario_inicio.slice(0,5)} - ${record.horario_fim.slice(0,5)}`
                        : 'Horário não registrado'}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                        Pressão Arterial
                      </p>
                      <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.pressao_arterial_sistolica}/{record.pressao_arterial_diastolica} mmHg
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                        Peso Pré/Pós
                      </p>
                      <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.peso_pre_dialise || 'N/A'} / {record.peso_pos_dialise || 'N/A'} kg
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                        Ultrafiltração
                      </p>
                      <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.uf_total ? `${(record.uf_total / 1000).toFixed(1)}L` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                        Glicose
                      </p>
                      <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.concentracao_glicose ? `${record.concentracao_glicose}%` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {record.sintomas && (
                    <div style={{
                      padding: '0.75rem',
                      background: '#fef3c7',
                      borderRadius: '8px',
                      marginTop: '0.75rem'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                        <strong>Sintomas:</strong> {record.sintomas}
                      </p>
                    </div>
                  )}
                  
                  {record.observacoes && (
                    <div style={{
                      padding: '0.75rem',
                      background: '#e0f2fe',
                      borderRadius: '8px',
                      marginTop: '0.75rem'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#075985', margin: 0 }}>
                        <strong>Observações:</strong> {record.observacoes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '3rem' }}>
              Nenhum registro de diálise encontrado
            </p>
          )}
        </div>
      </div>

      {/* Recommendation Modal */}
      {showRecommendationModal && (
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
        onClick={() => setShowRecommendationModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
              Enviar Recomendação
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Título
              </label>
              <input
                type="text"
                value={recommendation.titulo}
                onChange={(e) => setRecommendation({ ...recommendation, titulo: e.target.value })}
                placeholder="Ex: Ajuste de medicação"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Mensagem
              </label>
              <textarea
                value={recommendation.mensagem}
                onChange={(e) => setRecommendation({ ...recommendation, mensagem: e.target.value })}
                placeholder="Descreva a recomendação médica..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowRecommendationModal(false)}
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
                Cancelar
              </button>
              <button
                onClick={handleSendRecommendation}
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
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetailPage;