import React, { useState, useEffect } from 'react';
import { Activity, X, AlertCircle, ThermometerSun, Wind, Heart } from 'lucide-react';
import { getPredefinedSymptoms, registerIsolatedSymptom } from '../../services/symptoms';

const SymptomsModal = ({ isOpen, onClose, onSymptomRegistered }) => {
  const [predefinedSymptoms, setPredefinedSymptoms] = useState([]);
  const [groupedSymptoms, setGroupedSymptoms] = useState({});
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSymptoms();
    }
  }, [isOpen]);

  const loadSymptoms = async () => {
    try {
      const data = await getPredefinedSymptoms();
      setPredefinedSymptoms(data.symptoms);
      setGroupedSymptoms(data.grouped);
    } catch (err) {
      console.error('Erro ao carregar sintomas:', err);
      setError('Erro ao carregar sintomas');
    }
  };

  const toggleSymptom = (symptomId) => {
    setSelectedSymptoms(prev => {
      const exists = prev.find(s => s.sintoma_id === symptomId);
      if (exists) {
        return prev.filter(s => s.sintoma_id !== symptomId);
      } else {
        const symptom = predefinedSymptoms.find(s => s.id === symptomId);
        return [...prev, {
          sintoma_id: symptomId,
          severidade: symptom.severidade_padrao || 'leve',
          observacoes: ''
        }];
      }
    });
  };

  const updateSeverity = (symptomId, severity) => {
    setSelectedSymptoms(prev => 
      prev.map(s => 
        s.sintoma_id === symptomId 
          ? { ...s, severidade: severity }
          : s
      )
    );
  };

  const updateObservation = (symptomId, observation) => {
    setSelectedSymptoms(prev => 
      prev.map(s => 
        s.sintoma_id === symptomId 
          ? { ...s, observacoes: observation }
          : s
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedSymptoms.length === 0) {
      setError('Selecione pelo menos um sintoma');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await registerIsolatedSymptom({ sintomas: selectedSymptoms });
      setSuccess('Sintomas registrados com sucesso!');
      
      setTimeout(() => {
        if (onSymptomRegistered) {
          onSymptomRegistered();
        }
        onClose();
        setSelectedSymptoms([]);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.error || 'Erro ao registrar sintomas');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'respiratório':
        return Wind;
      case 'gastrointestinal':
        return Activity;
      case 'circulatório':
        return Heart;
      default:
        return AlertCircle;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'grave':
        return '#ef4444';
      case 'moderado':
        return '#f59e0b';
      case 'leve':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              <Activity style={{ width: '24px', height: '24px', marginRight: '8px' }} />
              Registrar Sintomas
            </h2>
            <p className="modal-subtitle">Selecione os sintomas que está sentindo</p>
          </div>
          <button className="modal-close" onClick={onClose}>
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
              marginBottom: '16px'
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
              marginBottom: '16px'
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Lista de sintomas por categoria */}
            <div style={{ marginBottom: '24px' }}>
              {Object.entries(groupedSymptoms).map(([category, symptoms]) => {
                const CategoryIcon = getCategoryIcon(category);
                
                return (
                  <div key={category} style={{ marginBottom: '24px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '2px solid #e2e8f0'
                    }}>
                      <CategoryIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                      <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                        {category}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {symptoms.map(symptom => {
                        const isSelected = selectedSymptoms.some(s => s.sintoma_id === symptom.id);
                        
                        return (
                          <button
                            key={symptom.id}
                            type="button"
                            onClick={() => toggleSymptom(symptom.id)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '20px',
                              border: isSelected ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                              backgroundColor: isSelected ? '#eff6ff' : 'white',
                              color: isSelected ? '#1e40af' : '#374151',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: isSelected ? '600' : '400',
                              transition: 'all 0.2s'
                            }}
                          >
                            {symptom.nome}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sintomas selecionados - Detalhes */}
            {selectedSymptoms.length > 0 && (
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                  Sintomas Selecionados ({selectedSymptoms.length})
                </h3>

                {selectedSymptoms.map(selected => {
                  const symptom = predefinedSymptoms.find(s => s.id === selected.sintoma_id);
                  
                  return (
                    <div
                      key={selected.sintoma_id}
                      style={{
                        backgroundColor: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '15px' }}>{symptom.nome}</strong>
                          <button
                            type="button"
                            onClick={() => toggleSymptom(selected.sintoma_id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>
                          Severidade
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {['leve', 'moderado', 'grave'].map(sev => (
                            <button
                              key={sev}
                              type="button"
                              onClick={() => updateSeverity(selected.sintoma_id, sev)}
                              style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: '6px',
                                border: selected.severidade === sev ? `2px solid ${getSeverityColor(sev)}` : '1px solid #e2e8f0',
                                backgroundColor: selected.severidade === sev ? `${getSeverityColor(sev)}15` : 'white',
                                color: selected.severidade === sev ? getSeverityColor(sev) : '#6b7280',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: selected.severidade === sev ? '600' : '400',
                                textTransform: 'capitalize'
                              }}
                            >
                              {sev}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500' }}>
                          Observações (opcional)
                        </label>
                        <textarea
                          value={selected.observacoes}
                          onChange={(e) => updateObservation(selected.sintoma_id, e.target.value)}
                          placeholder="Descreva mais detalhes sobre este sintoma..."
                          className="form-textarea"
                          rows="2"
                          style={{ fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                style={{ flex: 1 }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={loading || selectedSymptoms.length === 0}
              >
                {loading ? 'Registrando...' : `Registrar ${selectedSymptoms.length} Sintoma(s)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SymptomsModal;