import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, CheckCircle, Mail, Calendar, FileText } from 'lucide-react';
import { sendPatientAlert } from '../../services/doctor';
import { getPatientDialysisHistory } from '../../services/doctor';

const ModalEnviarAlerta = ({ isOpen, onClose, paciente }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessoes, setSessoes] = useState([]);
  const [loadingSessoes, setLoadingSessoes] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    mensagem: '',
    prioridade: 'media',
    tipo: 'geral',
    sessao_dialise_id: ''
  });

  useEffect(() => {
    if (isOpen && paciente) {
      loadSessoes();
      // Reset form
      setFormData({
        titulo: '',
        mensagem: '',
        prioridade: 'media',
        tipo: 'geral',
        sessao_dialise_id: ''
      });
      setError('');
      setSuccess('');
    }
  }, [isOpen, paciente]);

  const loadSessoes = async () => {
    if (!paciente?.paciente_id && !paciente?.id) return;
    
    setLoadingSessoes(true);
    try {
      const patientId = paciente.paciente_id || paciente.id;
      const response = await getPatientDialysisHistory(patientId, { limit: 10 });
      setSessoes(response.records || []);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
    } finally {
      setLoadingSessoes(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Se mudar para tipo específico, limpa a sessão selecionada se mudar para geral
    if (name === 'tipo' && value === 'geral') {
      setFormData(prev => ({
        ...prev,
        sessao_dialise_id: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (!formData.titulo.trim()) {
      setError('O título é obrigatório');
      return;
    }

    if (!formData.mensagem.trim()) {
      setError('A mensagem é obrigatória');
      return;
    }

    if (formData.tipo === 'especifico' && !formData.sessao_dialise_id) {
      setError('Selecione uma sessão de diálise');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const patientId = paciente.paciente_id || paciente.id;
      
      const alertData = {
        titulo: formData.titulo.trim(),
        mensagem: formData.mensagem.trim(),
        prioridade: formData.prioridade,
        tipo: formData.tipo,
        sessao_dialise_id: formData.tipo === 'especifico' ? formData.sessao_dialise_id : null
      };

      await sendPatientAlert(patientId, alertData);
      
      setSuccess('Alerta enviado com sucesso! O paciente receberá um email.');
      
      // Fechar modal após 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Erro ao enviar alerta:', err);
      setError(err.error || 'Erro ao enviar alerta');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'white',
          zIndex: 10,
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0 0 0.25rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Mail size={24} color="#14b8a6" />
              Enviar Alerta por Email
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Para: {paciente?.nome}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Messages */}
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: '#d1fae5',
              color: '#065f46',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}>
              <CheckCircle size={18} />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Tipo de Alerta */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Tipo de Alerta *
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo: 'geral', sessao_dialise_id: '' }))}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: formData.tipo === 'geral' ? '2px solid #14b8a6' : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      background: formData.tipo === 'geral' ? '#f0fdfa' : 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: formData.tipo === 'geral' ? '#14b8a6' : '#6b7280',
                      transition: 'all 0.2s'
                    }}
                  >
                    Mensagem Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo: 'especifico' }))}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: formData.tipo === 'especifico' ? '2px solid #14b8a6' : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      background: formData.tipo === 'especifico' ? '#f0fdfa' : 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: formData.tipo === 'especifico' ? '#14b8a6' : '#6b7280',
                      transition: 'all 0.2s'
                    }}
                  >
                    Relacionado à Sessão
                  </button>
                </div>
              </div>

              {/* Sessão de Diálise (se tipo específico) */}
              {formData.tipo === 'especifico' && (
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <Calendar size={16} color="#14b8a6" />
                    Sessão de Diálise *
                  </label>
                  {loadingSessoes ? (
                    <div style={{
                      padding: '1rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      Carregando sessões...
                    </div>
                  ) : sessoes.length === 0 ? (
                    <div style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '10px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      Nenhuma sessão de diálise encontrada
                    </div>
                  ) : (
                    <select
                      name="sessao_dialise_id"
                      value={formData.sessao_dialise_id}
                      onChange={handleInputChange}
                      disabled={loading}
                      required={formData.tipo === 'especifico'}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        outline: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    >
                      <option value="">Selecione uma sessão...</option>
                      {sessoes.map(sessao => (
                        <option key={sessao.id} value={sessao.id}>
                          {new Date(sessao.data_registro).toLocaleDateString('pt-BR')} - 
                          PA: {sessao.pressao_arterial_sistolica}/{sessao.pressao_arterial_diastolica} - 
                          UF: {sessao.uf_total ? `${(sessao.uf_total / 1000).toFixed(1)}L` : 'N/A'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Prioridade */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Prioridade *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { value: 'baixa', label: 'Baixa', color: '#10b981' },
                    { value: 'media', label: 'Média', color: '#f59e0b' },
                    { value: 'alta', label: 'Alta', color: '#ef4444' }
                  ].map(prioridade => (
                    <button
                      key={prioridade.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, prioridade: prioridade.value }))}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '0.625rem',
                        border: formData.prioridade === prioridade.value ? `2px solid ${prioridade.color}` : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        background: formData.prioridade === prioridade.value ? `${prioridade.color}10` : 'white',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: formData.prioridade === prioridade.value ? prioridade.color : '#6b7280',
                        transition: 'all 0.2s'
                      }}
                    >
                      {prioridade.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  <FileText size={16} color="#14b8a6" />
                  Título do Alerta *
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleInputChange}
                  placeholder="Ex: Atenção aos valores de pressão arterial"
                  disabled={loading}
                  required
                  maxLength={100}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
                  {formData.titulo.length}/100 caracteres
                </p>
              </div>

              {/* Mensagem */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  <Mail size={16} color="#14b8a6" />
                  Mensagem *
                </label>
                <textarea
                  name="mensagem"
                  value={formData.mensagem}
                  onChange={handleInputChange}
                  placeholder="Digite a mensagem que será enviada por email ao paciente..."
                  disabled={loading}
                  required
                  rows={6}
                  maxLength={1000}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.2s',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
                  {formData.mensagem.length}/1000 caracteres
                </p>
              </div>

              {/* Info Box */}
              <div style={{
                padding: '1rem',
                background: '#f0f9ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                fontSize: '0.875rem',
                color: '#1e40af'
              }}>
                <strong>📧 Informações sobre o envio:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.5rem', paddingLeft: 0 }}>
                  <li>O paciente receberá um email no endereço cadastrado</li>
                  <li>Uma notificação também será criada no sistema</li>
                  <li>Você pode acompanhar se o paciente visualizou o alerta</li>
                </ul>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '1rem',
          position: 'sticky',
          bottom: 0,
          background: 'white',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px'
        }}>
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
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || success}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: loading || success 
                ? '#d1d5db' 
                : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: loading || success ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: loading || success ? 'none' : '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            <Send size={18} />
            {loading ? 'Enviando...' : success ? 'Enviado!' : 'Enviar Alerta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEnviarAlerta;


// import React, { useState, useEffect } from 'react';
// import { X, Send, AlertCircle, CheckCircle, Mail, Calendar, FileText } from 'lucide-react';
// import { sendPatientAlert } from '../../services/doctor';
// import { getPatientDialysisHistory } from '../../services/doctor';

// const ModalEnviarAlerta = ({ isOpen, onClose, paciente }) => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//   const [sessoes, setSessoes] = useState([]);
//   const [loadingSessoes, setLoadingSessoes] = useState(false);

//   const [formData, setFormData] = useState({
//     titulo: '',
//     mensagem: '',
//     prioridade: 'media',
//     tipo: 'geral',
//     sessao_dialise_id: ''
//   });

//   useEffect(() => {
//     if (isOpen && paciente) {
//       loadSessoes();
//       // Reset form
//       setFormData({
//         titulo: '',
//         mensagem: '',
//         prioridade: 'media',
//         tipo: 'geral',
//         sessao_dialise_id: ''
//       });
//       setError('');
//       setSuccess('');
//     }
//   }, [isOpen, paciente]);

//   const loadSessoes = async () => {
//     if (!paciente?.paciente_id && !paciente?.id) return;
    
//     setLoadingSessoes(true);
//     try {
//       const patientId = paciente.paciente_id || paciente.id;
//       const response = await getPatientDialysisHistory(patientId, { limit: 10 });
//       setSessoes(response.records || []);
//     } catch (err) {
//       console.error('Erro ao carregar sessões:', err);
//     } finally {
//       setLoadingSessoes(false);
//     }
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));

//     // Se mudar para tipo específico, limpa a sessão selecionada se mudar para geral
//     if (name === 'tipo' && value === 'geral') {
//       setFormData(prev => ({
//         ...prev,
//         sessao_dialise_id: ''
//       }));
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // Validações
//     if (!formData.titulo.trim()) {
//       setError('O título é obrigatório');
//       return;
//     }

//     if (!formData.mensagem.trim()) {
//       setError('A mensagem é obrigatória');
//       return;
//     }

//     if (formData.tipo === 'especifico' && !formData.sessao_dialise_id) {
//       setError('Selecione uma sessão de diálise');
//       return;
//     }

//     setLoading(true);
//     setError('');
//     setSuccess('');

//     try {
//       const patientId = paciente.paciente_id || paciente.id;
      
//       const alertData = {
//         titulo: formData.titulo.trim(),
//         mensagem: formData.mensagem.trim(),
//         prioridade: formData.prioridade,
//         tipo: formData.tipo,
//         sessao_dialise_id: formData.tipo === 'especifico' ? formData.sessao_dialise_id : null
//       };

//       await sendPatientAlert(patientId, alertData);
      
//       setSuccess('Alerta enviado com sucesso! O paciente receberá um email.');
      
//       // Fechar modal após 2 segundos
//       setTimeout(() => {
//         onClose();
//       }, 2000);
//     } catch (err) {
//       console.error('Erro ao enviar alerta:', err);
//       setError(err.error || 'Erro ao enviar alerta');
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <div
//       style={{
//         position: 'fixed',
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         background: 'rgba(0, 0, 0, 0.5)',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         zIndex: 1000,
//         padding: '1rem'
//       }}
//       onClick={onClose}
//     >
//       <div
//         style={{
//           background: 'white',
//           borderRadius: '20px',
//           maxWidth: '600px',
//           width: '100%',
//           maxHeight: '90vh',
//           overflow: 'auto',
//           boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
//         }}
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Header */}
//         <div style={{
//           padding: '1.5rem',
//           borderBottom: '1px solid #e5e7eb',
//           display: 'flex',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           position: 'sticky',
//           top: 0,
//           background: 'white',
//           zIndex: 10,
//           borderTopLeftRadius: '20px',
//           borderTopRightRadius: '20px'
//         }}>
//           <div>
//             <h2 style={{
//               fontSize: '1.5rem',
//               fontWeight: '700',
//               margin: '0 0 0.25rem 0',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.5rem'
//             }}>
//               <Mail size={24} color="#14b8a6" />
//               Enviar Alerta por Email
//             </h2>
//             <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
//               Para: {paciente?.nome}
//             </p>
//           </div>
//           <button
//             onClick={onClose}
//             disabled={loading}
//             style={{
//               background: '#f3f4f6',
//               border: 'none',
//               borderRadius: '8px',
//               width: '32px',
//               height: '32px',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               cursor: loading ? 'not-allowed' : 'pointer',
//               opacity: loading ? 0.5 : 1
//             }}
//           >
//             <X size={20} />
//           </button>
//         </div>

//         {/* Content */}
//         <div style={{ padding: '1.5rem' }}>
//           {/* Messages */}
//           {error && (
//             <div style={{
//               backgroundColor: '#fee2e2',
//               color: '#dc2626',
//               padding: '1rem',
//               borderRadius: '12px',
//               marginBottom: '1rem',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.5rem',
//               fontSize: '0.875rem'
//             }}>
//               <AlertCircle size={18} />
//               {error}
//             </div>
//           )}

//           {success && (
//             <div style={{
//               backgroundColor: '#d1fae5',
//               color: '#065f46',
//               padding: '1rem',
//               borderRadius: '12px',
//               marginBottom: '1rem',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.5rem',
//               fontSize: '0.875rem'
//             }}>
//               <CheckCircle size={18} />
//               {success}
//             </div>
//           )}

//           <form onSubmit={handleSubmit}>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
//               {/* Tipo de Alerta */}
//               <div>
//                 <label style={{
//                   display: 'block',
//                   fontSize: '0.875rem',
//                   fontWeight: '600',
//                   color: '#374151',
//                   marginBottom: '0.5rem'
//                 }}>
//                   Tipo de Alerta *
//                 </label>
//                 <div style={{ display: 'flex', gap: '0.75rem' }}>
//                   <button
//                     type="button"
//                     onClick={() => setFormData(prev => ({ ...prev, tipo: 'geral', sessao_dialise_id: '' }))}
//                     disabled={loading}
//                     style={{
//                       flex: 1,
//                       padding: '0.75rem',
//                       border: formData.tipo === 'geral' ? '2px solid #14b8a6' : '2px solid #e5e7eb',
//                       borderRadius: '10px',
//                       background: formData.tipo === 'geral' ? '#f0fdfa' : 'white',
//                       cursor: loading ? 'not-allowed' : 'pointer',
//                       fontSize: '0.875rem',
//                       fontWeight: '600',
//                       color: formData.tipo === 'geral' ? '#14b8a6' : '#6b7280',
//                       transition: 'all 0.2s'
//                     }}
//                   >
//                     Mensagem Geral
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => setFormData(prev => ({ ...prev, tipo: 'especifico' }))}
//                     disabled={loading}
//                     style={{
//                       flex: 1,
//                       padding: '0.75rem',
//                       border: formData.tipo === 'especifico' ? '2px solid #14b8a6' : '2px solid #e5e7eb',
//                       borderRadius: '10px',
//                       background: formData.tipo === 'especifico' ? '#f0fdfa' : 'white',
//                       cursor: loading ? 'not-allowed' : 'pointer',
//                       fontSize: '0.875rem',
//                       fontWeight: '600',
//                       color: formData.tipo === 'especifico' ? '#14b8a6' : '#6b7280',
//                       transition: 'all 0.2s'
//                     }}
//                   >
//                     Relacionado à Sessão
//                   </button>
//                 </div>
//               </div>

//               {/* Sessão de Diálise (se tipo específico) */}
//               {formData.tipo === 'especifico' && (
//                 <div>
//                   <label style={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '0.5rem',
//                     fontSize: '0.875rem',
//                     fontWeight: '600',
//                     color: '#374151',
//                     marginBottom: '0.5rem'
//                   }}>
//                     <Calendar size={16} color="#14b8a6" />
//                     Sessão de Diálise *
//                   </label>
//                   {loadingSessoes ? (
//                     <div style={{
//                       padding: '1rem',
//                       textAlign: 'center',
//                       color: '#6b7280',
//                       fontSize: '0.875rem'
//                     }}>
//                       Carregando sessões...
//                     </div>
//                   ) : sessoes.length === 0 ? (
//                     <div style={{
//                       padding: '1rem',
//                       background: '#f9fafb',
//                       borderRadius: '10px',
//                       textAlign: 'center',
//                       color: '#6b7280',
//                       fontSize: '0.875rem'
//                     }}>
//                       Nenhuma sessão de diálise encontrada
//                     </div>
//                   ) : (
//                     <select
//                       name="sessao_dialise_id"
//                       value={formData.sessao_dialise_id}
//                       onChange={handleInputChange}
//                       disabled={loading}
//                       required={formData.tipo === 'especifico'}
//                       style={{
//                         width: '100%',
//                         padding: '0.75rem 1rem',
//                         border: '2px solid #e5e7eb',
//                         borderRadius: '10px',
//                         fontSize: '0.95rem',
//                         outline: 'none',
//                         cursor: loading ? 'not-allowed' : 'pointer',
//                         transition: 'border-color 0.2s'
//                       }}
//                       onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
//                       onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
//                     >
//                       <option value="">Selecione uma sessão...</option>
//                       {sessoes.map(sessao => (
//                         <option key={sessao.id} value={sessao.id}>
//                           {new Date(sessao.data_registro).toLocaleDateString('pt-BR')} - 
//                           PA: {sessao.pressao_arterial_sistolica}/{sessao.pressao_arterial_diastolica} - 
//                           UF: {sessao.uf_total ? `${(sessao.uf_total / 1000).toFixed(1)}L` : 'N/A'}
//                         </option>
//                       ))}
//                     </select>
//                   )}
//                 </div>
//               )}

//               {/* Prioridade */}
//               <div>
//                 <label style={{
//                   display: 'block',
//                   fontSize: '0.875rem',
//                   fontWeight: '600',
//                   color: '#374151',
//                   marginBottom: '0.5rem'
//                 }}>
//                   Prioridade *
//                 </label>
//                 <div style={{ display: 'flex', gap: '0.5rem' }}>
//                   {[
//                     { value: 'baixa', label: 'Baixa', color: '#10b981' },
//                     { value: 'media', label: 'Média', color: '#f59e0b' },
//                     { value: 'alta', label: 'Alta', color: '#ef4444' }
//                   ].map(prioridade => (
//                     <button
//                       key={prioridade.value}
//                       type="button"
//                       onClick={() => setFormData(prev => ({ ...prev, prioridade: prioridade.value }))}
//                       disabled={loading}
//                       style={{
//                         flex: 1,
//                         padding: '0.625rem',
//                         border: formData.prioridade === prioridade.value ? `2px solid ${prioridade.color}` : '2px solid #e5e7eb',
//                         borderRadius: '8px',
//                         background: formData.prioridade === prioridade.value ? `${prioridade.color}10` : 'white',
//                         cursor: loading ? 'not-allowed' : 'pointer',
//                         fontSize: '0.8rem',
//                         fontWeight: '600',
//                         color: formData.prioridade === prioridade.value ? prioridade.color : '#6b7280',
//                         transition: 'all 0.2s'
//                       }}
//                     >
//                       {prioridade.label}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* Título */}
//               <div>
//                 <label style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '0.5rem',
//                   fontSize: '0.875rem',
//                   fontWeight: '600',
//                   color: '#374151',
//                   marginBottom: '0.5rem'
//                 }}>
//                   <FileText size={16} color="#14b8a6" />
//                   Título do Alerta *
//                 </label>
//                 <input
//                   type="text"
//                   name="titulo"
//                   value={formData.titulo}
//                   onChange={handleInputChange}
//                   placeholder="Ex: Atenção aos valores de pressão arterial"
//                   disabled={loading}
//                   required
//                   maxLength={100}
//                   style={{
//                     width: '100%',
//                     padding: '0.75rem 1rem',
//                     border: '2px solid #e5e7eb',
//                     borderRadius: '10px',
//                     fontSize: '0.95rem',
//                     outline: 'none',
//                     transition: 'border-color 0.2s'
//                   }}
//                   onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
//                   onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
//                 />
//                 <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
//                   {formData.titulo.length}/100 caracteres
//                 </p>
//               </div>

//               {/* Mensagem */}
//               <div>
//                 <label style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '0.5rem',
//                   fontSize: '0.875rem',
//                   fontWeight: '600',
//                   color: '#374151',
//                   marginBottom: '0.5rem'
//                 }}>
//                   <Mail size={16} color="#14b8a6" />
//                   Mensagem *
//                 </label>
//                 <textarea
//                   name="mensagem"
//                   value={formData.mensagem}
//                   onChange={handleInputChange}
//                   placeholder="Digite a mensagem que será enviada por email ao paciente..."
//                   disabled={loading}
//                   required
//                   rows={6}
//                   maxLength={1000}
//                   style={{
//                     width: '100%',
//                     padding: '0.75rem 1rem',
//                     border: '2px solid #e5e7eb',
//                     borderRadius: '10px',
//                     fontSize: '0.95rem',
//                     outline: 'none',
//                     resize: 'vertical',
//                     transition: 'border-color 0.2s',
//                     fontFamily: 'inherit'
//                   }}
//                   onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
//                   onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
//                 />
//                 <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
//                   {formData.mensagem.length}/1000 caracteres
//                 </p>
//               </div>

//               {/* Info Box */}
//               <div style={{
//                 padding: '1rem',
//                 background: '#f0f9ff',
//                 border: '1px solid #bfdbfe',
//                 borderRadius: '10px',
//                 fontSize: '0.875rem',
//                 color: '#1e40af'
//               }}>
//                 <strong>📧 Informações sobre o envio:</strong>
//                 <ul style={{ margin: '0.5rem 0 0 1.5rem', paddingLeft: 0 }}>
//                   <li>O paciente receberá um email no endereço cadastrado</li>
//                   <li>Uma notificação também será criada no sistema</li>
//                   <li>Você pode acompanhar se o paciente visualizou o alerta</li>
//                 </ul>
//               </div>
//             </div>
//           </form>
//         </div>

//         {/* Footer */}
//         <div style={{
//           padding: '1.5rem',
//           borderTop: '1px solid #e5e7eb',
//           display: 'flex',
//           gap: '1rem',
//           position: 'sticky',
//           bottom: 0,
//           background: 'white',
//           borderBottomLeftRadius: '20px',
//           borderBottomRightRadius: '20px'
//         }}>
//           <button
//             type="button"
//             onClick={onClose}
//             disabled={loading}
//             style={{
//               flex: 1,
//               padding: '0.75rem',
//               background: '#f3f4f6',
//               color: '#374151',
//               border: 'none',
//               borderRadius: '10px',
//               fontSize: '0.95rem',
//               fontWeight: '600',
//               cursor: loading ? 'not-allowed' : 'pointer',
//               transition: 'all 0.2s',
//               opacity: loading ? 0.5 : 1
//             }}
//           >
//             Cancelar
//           </button>
//           <button
//             type="submit"
//             onClick={handleSubmit}
//             disabled={loading || success}
//             style={{
//               flex: 1,
//               padding: '0.75rem',
//               background: loading || success 
//                 ? '#d1d5db' 
//                 : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
//               color: 'white',
//               border: 'none',
//               borderRadius: '10px',
//               fontSize: '0.95rem',
//               fontWeight: '600',
//               cursor: loading || success ? 'not-allowed' : 'pointer',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               gap: '0.5rem',
//               boxShadow: loading || success ? 'none' : '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
//               transition: 'all 0.2s'
//             }}
//           >
//             <Send size={18} />
//             {loading ? 'Enviando...' : success ? 'Enviado!' : 'Enviar Alerta'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ModalEnviarAlerta;
// // import React, { useState, useEffect } from 'react';
// // import { X, Send, AlertCircle } from 'lucide-react';
// // import { enviarAlerta } from '../../services/alertaMedico';

// // const ModalEnviarAlerta = ({ isOpen, onClose, paciente }) => {
// //   const [mensagem, setMensagem] = useState('');
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState('');
// //   const [success, setSuccess] = useState(false);

// //   // Reset form when modal opens/closes
// //   useEffect(() => {
// //     if (isOpen) {
// //       setMensagem('');
// //       setError('');
// //       setSuccess(false);
      
// //       // Debug: verificar estrutura do paciente
// //       console.log('Paciente recebido no modal:', paciente);
// //     }
// //   }, [isOpen, paciente]);

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
    
// //     // Obter ID do paciente (suporta ambos os formatos)
// //     const pacienteId = paciente?.id || paciente?.paciente_id;
    
// //     console.log('Validando dados:', {
// //       paciente,
// //       pacienteId,
// //       email: paciente?.email,
// //       mensagem: mensagem.trim()
// //     });

// //     // Validações
// //     if (!paciente) {
// //       setError('Paciente não identificado');
// //       return;
// //     }

// //     if (!pacienteId) {
// //       setError('ID do paciente não encontrado');
// //       console.error('Estrutura do paciente:', paciente);
// //       return;
// //     }

// //     if (!mensagem.trim()) {
// //       setError('Por favor, digite uma mensagem');
// //       return;
// //     }

// //     if (mensagem.trim().length < 10) {
// //       setError('A mensagem deve ter no mínimo 10 caracteres');
// //       return;
// //     }

// //     if (!paciente.email) {
// //       setError('Email do paciente não encontrado');
// //       return;
// //     }

// //     setLoading(true);
// //     setError('');

// //     try {
// //       console.log('Enviando alerta para:', {
// //         pacienteId: pacienteId,
// //         email: paciente.email,
// //         mensagem: mensagem
// //       });

// //       await enviarAlerta({
// //         pacienteId: pacienteId,
// //         mensagem: mensagem.trim(),
// //         email: paciente.email
// //       });

// //       setSuccess(true);
// //       setTimeout(() => {
// //         onClose();
// //       }, 2000);
// //     } catch (err) {
// //       console.error('Erro ao enviar alerta:', err);
// //       setError(err.error || err.message || 'Erro ao enviar alerta');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   if (!isOpen) return null;

// //   return (
// //     <div
// //       style={{
// //         position: 'fixed',
// //         top: 0,
// //         left: 0,
// //         right: 0,
// //         bottom: 0,
// //         background: 'rgba(0, 0, 0, 0.5)',
// //         display: 'flex',
// //         alignItems: 'center',
// //         justifyContent: 'center',
// //         zIndex: 1000,
// //         padding: '1rem'
// //       }}
// //       onClick={onClose}
// //     >
// //       <div
// //         style={{
// //           background: 'white',
// //           borderRadius: '16px',
// //           maxWidth: '500px',
// //           width: '100%',
// //           boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
// //           overflow: 'hidden'
// //         }}
// //         onClick={(e) => e.stopPropagation()}
// //       >
// //         {/* Header */}
// //         <div
// //           style={{
// //             padding: '1.5rem',
// //             borderBottom: '1px solid #e5e7eb',
// //             display: 'flex',
// //             justifyContent: 'space-between',
// //             alignItems: 'center',
// //             background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)'
// //           }}
// //         >
// //           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
// //             <AlertCircle size={24} color="white" />
// //             <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'white' }}>
// //               Enviar Alerta
// //             </h2>
// //           </div>
// //           <button
// //             onClick={onClose}
// //             style={{
// //               background: 'rgba(255, 255, 255, 0.2)',
// //               border: 'none',
// //               borderRadius: '8px',
// //               width: '32px',
// //               height: '32px',
// //               display: 'flex',
// //               alignItems: 'center',
// //               justifyContent: 'center',
// //               cursor: 'pointer',
// //               transition: 'background 0.2s'
// //             }}
// //             onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
// //             onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
// //           >
// //             <X size={20} color="white" />
// //           </button>
// //         </div>

// //         {/* Content */}
// //         <form onSubmit={handleSubmit}>
// //           <div style={{ padding: '1.5rem' }}>
// //             {/* Patient Info */}
// //             {paciente && (
// //               <div
// //                 style={{
// //                   padding: '1rem',
// //                   background: '#f9fafb',
// //                   borderRadius: '10px',
// //                   marginBottom: '1.5rem',
// //                   border: '1px solid #e5e7eb'
// //                 }}
// //               >
// //                 <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
// //                   Enviando para:
// //                 </p>
// //                 <p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.25rem 0' }}>
// //                   {paciente.nome}
// //                 </p>
// //                 <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
// //                   {paciente.email}
// //                 </p>
// //                 {/* Debug info - remover após testar */}
// //                 {process.env.NODE_ENV === 'development' && (
// //                   <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0.5rem 0 0 0' }}>
// //                     ID: {paciente.id || paciente.paciente_id || 'não encontrado'}
// //                   </p>
// //                 )}
// //               </div>
// //             )}

// //             {/* Message Textarea */}
// //             <div style={{ marginBottom: '1.5rem' }}>
// //               <label
// //                 htmlFor="mensagem"
// //                 style={{
// //                   display: 'block',
// //                   fontSize: '0.875rem',
// //                   fontWeight: '600',
// //                   color: '#374151',
// //                   marginBottom: '0.5rem'
// //                 }}
// //               >
// //                 Mensagem do Alerta
// //               </label>
// //               <textarea
// //                 id="mensagem"
// //                 value={mensagem}
// //                 onChange={(e) => setMensagem(e.target.value)}
// //                 placeholder="Digite a mensagem do alerta para o paciente... (mínimo 10 caracteres)"
// //                 rows={6}
// //                 style={{
// //                   width: '100%',
// //                   padding: '0.75rem',
// //                   border: '1px solid #e5e7eb',
// //                   borderRadius: '8px',
// //                   fontSize: '0.95rem',
// //                   outline: 'none',
// //                   resize: 'vertical',
// //                   fontFamily: 'inherit'
// //                 }}
// //                 disabled={loading}
// //               />
// //               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
// //                 <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
// //                   Esta mensagem será enviada por email para o paciente
// //                 </p>
// //                 <p style={{ 
// //                   fontSize: '0.75rem', 
// //                   color: mensagem.length < 10 ? '#dc2626' : '#6b7280',
// //                   margin: 0,
// //                   fontWeight: mensagem.length < 10 ? '600' : '400'
// //                 }}>
// //                   {mensagem.length}/10
// //                 </p>
// //               </div>
// //             </div>

// //             {/* Error Message */}
// //             {error && (
// //               <div
// //                 style={{
// //                   padding: '0.75rem 1rem',
// //                   background: '#fee2e2',
// //                   color: '#dc2626',
// //                   borderRadius: '8px',
// //                   marginBottom: '1rem',
// //                   fontSize: '0.875rem',
// //                   display: 'flex',
// //                   alignItems: 'center',
// //                   gap: '0.5rem'
// //                 }}
// //               >
// //                 <AlertCircle size={16} />
// //                 {error}
// //               </div>
// //             )}

// //             {/* Success Message */}
// //             {success && (
// //               <div
// //                 style={{
// //                   padding: '0.75rem 1rem',
// //                   background: '#d1fae5',
// //                   color: '#065f46',
// //                   borderRadius: '8px',
// //                   marginBottom: '1rem',
// //                   fontSize: '0.875rem',
// //                   display: 'flex',
// //                   alignItems: 'center',
// //                   gap: '0.5rem'
// //                 }}
// //               >
// //                 <Send size={16} />
// //                 Alerta enviado com sucesso!
// //               </div>
// //             )}
// //           </div>

// //           {/* Footer */}
// //           <div
// //             style={{
// //               padding: '1.5rem',
// //               borderTop: '1px solid #e5e7eb',
// //               display: 'flex',
// //               gap: '1rem',
// //               background: '#f9fafb'
// //             }}
// //           >
// //             <button
// //               type="button"
// //               onClick={onClose}
// //               disabled={loading}
// //               style={{
// //                 flex: 1,
// //                 padding: '0.75rem',
// //                 background: 'white',
// //                 color: '#374151',
// //                 border: '1px solid #e5e7eb',
// //                 borderRadius: '8px',
// //                 fontSize: '0.95rem',
// //                 fontWeight: '600',
// //                 cursor: loading ? 'not-allowed' : 'pointer',
// //                 opacity: loading ? 0.5 : 1
// //               }}
// //             >
// //               Cancelar
// //             </button>
// //             <button
// //               type="submit"
// //               disabled={loading || mensagem.trim().length < 10 || success}
// //               style={{
// //                 flex: 1,
// //                 padding: '0.75rem',
// //                 background: loading || mensagem.trim().length < 10 || success
// //                   ? '#d1d5db'
// //                   : 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
// //                 color: 'white',
// //                 border: 'none',
// //                 borderRadius: '8px',
// //                 fontSize: '0.95rem',
// //                 fontWeight: '600',
// //                 cursor: loading || mensagem.trim().length < 10 || success ? 'not-allowed' : 'pointer',
// //                 display: 'flex',
// //                 alignItems: 'center',
// //                 justifyContent: 'center',
// //                 gap: '0.5rem'
// //               }}
// //             >
// //               {loading ? (
// //                 <>
// //                   <div
// //                     style={{
// //                       width: '16px',
// //                       height: '16px',
// //                       border: '2px solid white',
// //                       borderTop: '2px solid transparent',
// //                       borderRadius: '50%',
// //                       animation: 'spin 1s linear infinite'
// //                     }}
// //                   />
// //                   Enviando...
// //                 </>
// //               ) : (
// //                 <>
// //                   <Send size={18} />
// //                   Enviar Alerta
// //                 </>
// //               )}
// //             </button>
// //           </div>
// //         </form>

// //         <style>{`
// //           @keyframes spin {
// //             0% { transform: rotate(0deg); }
// //             100% { transform: rotate(360deg); }
// //           }
// //         `}</style>
// //       </div>
// //     </div>
// //   );
// // };

// // export default ModalEnviarAlerta;


// // // import React, { useState, useEffect } from 'react';
// // // import { X, Send, AlertCircle } from 'lucide-react';
// // // import { enviarAlerta } from '../../services/alertaMedico';

// // // const ModalEnviarAlerta = ({ isOpen, onClose, paciente }) => {
// // //   const [mensagem, setMensagem] = useState('');
// // //   const [loading, setLoading] = useState(false);
// // //   const [error, setError] = useState('');
// // //   const [success, setSuccess] = useState(false);

// // //   // Reset form when modal opens/closes
// // //   useEffect(() => {
// // //     if (isOpen) {
// // //       setMensagem('');
// // //       setError('');
// // //       setSuccess(false);
// // //     }
// // //   }, [isOpen]);

// // //   const handleSubmit = async (e) => {
// // //     e.preventDefault();
    
// // //     // Validação
// // //     if (!paciente || !paciente.id) {
// // //       setError('Paciente não identificado');
// // //       return;
// // //     }

// // //     if (!mensagem.trim()) {
// // //       setError('Por favor, digite uma mensagem');
// // //       return;
// // //     }

// // //     if (!paciente.email) {
// // //       setError('Email do paciente não encontrado');
// // //       return;
// // //     }

// // //     setLoading(true);
// // //     setError('');

// // //     try {
// // //       console.log('Enviando alerta para:', {
// // //         pacienteId: paciente.id,
// // //         email: paciente.email,
// // //         mensagem: mensagem
// // //       });

// // //       await enviarAlerta({
// // //         pacienteId: paciente.id,
// // //         mensagem: mensagem,
// // //         email: paciente.email
// // //       });

// // //       setSuccess(true);
// // //       setTimeout(() => {
// // //         onClose();
// // //       }, 2000);
// // //     } catch (err) {
// // //       console.error('Erro ao enviar alerta:', err);
// // //       setError(err.error || err.message || 'Erro ao enviar alerta');
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   if (!isOpen) return null;

// // //   return (
// // //     <div
// // //       style={{
// // //         position: 'fixed',
// // //         top: 0,
// // //         left: 0,
// // //         right: 0,
// // //         bottom: 0,
// // //         background: 'rgba(0, 0, 0, 0.5)',
// // //         display: 'flex',
// // //         alignItems: 'center',
// // //         justifyContent: 'center',
// // //         zIndex: 1000,
// // //         padding: '1rem'
// // //       }}
// // //       onClick={onClose}
// // //     >
// // //       <div
// // //         style={{
// // //           background: 'white',
// // //           borderRadius: '16px',
// // //           maxWidth: '500px',
// // //           width: '100%',
// // //           boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
// // //           overflow: 'hidden'
// // //         }}
// // //         onClick={(e) => e.stopPropagation()}
// // //       >
// // //         {/* Header */}
// // //         <div
// // //           style={{
// // //             padding: '1.5rem',
// // //             borderBottom: '1px solid #e5e7eb',
// // //             display: 'flex',
// // //             justifyContent: 'space-between',
// // //             alignItems: 'center',
// // //             background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)'
// // //           }}
// // //         >
// // //           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
// // //             <AlertCircle size={24} color="white" />
// // //             <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'white' }}>
// // //               Enviar Alerta
// // //             </h2>
// // //           </div>
// // //           <button
// // //             onClick={onClose}
// // //             style={{
// // //               background: 'rgba(255, 255, 255, 0.2)',
// // //               border: 'none',
// // //               borderRadius: '8px',
// // //               width: '32px',
// // //               height: '32px',
// // //               display: 'flex',
// // //               alignItems: 'center',
// // //               justifyContent: 'center',
// // //               cursor: 'pointer',
// // //               transition: 'background 0.2s'
// // //             }}
// // //             onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
// // //             onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
// // //           >
// // //             <X size={20} color="white" />
// // //           </button>
// // //         </div>

// // //         {/* Content */}
// // //         <form onSubmit={handleSubmit}>
// // //           <div style={{ padding: '1.5rem' }}>
// // //             {/* Patient Info */}
// // //             {paciente && (
// // //               <div
// // //                 style={{
// // //                   padding: '1rem',
// // //                   background: '#f9fafb',
// // //                   borderRadius: '10px',
// // //                   marginBottom: '1.5rem',
// // //                   border: '1px solid #e5e7eb'
// // //                 }}
// // //               >
// // //                 <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
// // //                   Enviando para:
// // //                 </p>
// // //                 <p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.25rem 0' }}>
// // //                   {paciente.nome}
// // //                 </p>
// // //                 <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
// // //                   {paciente.email}
// // //                 </p>
// // //               </div>
// // //             )}

// // //             {/* Message Textarea */}
// // //             <div style={{ marginBottom: '1.5rem' }}>
// // //               <label
// // //                 htmlFor="mensagem"
// // //                 style={{
// // //                   display: 'block',
// // //                   fontSize: '0.875rem',
// // //                   fontWeight: '600',
// // //                   color: '#374151',
// // //                   marginBottom: '0.5rem'
// // //                 }}
// // //               >
// // //                 Mensagem do Alerta
// // //               </label>
// // //               <textarea
// // //                 id="mensagem"
// // //                 value={mensagem}
// // //                 onChange={(e) => setMensagem(e.target.value)}
// // //                 placeholder="Digite a mensagem do alerta para o paciente..."
// // //                 rows={6}
// // //                 style={{
// // //                   width: '100%',
// // //                   padding: '0.75rem',
// // //                   border: '1px solid #e5e7eb',
// // //                   borderRadius: '8px',
// // //                   fontSize: '0.95rem',
// // //                   outline: 'none',
// // //                   resize: 'vertical',
// // //                   fontFamily: 'inherit'
// // //                 }}
// // //                 disabled={loading}
// // //               />
// // //               <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
// // //                 Esta mensagem será enviada por email para o paciente
// // //               </p>
// // //             </div>

// // //             {/* Error Message */}
// // //             {error && (
// // //               <div
// // //                 style={{
// // //                   padding: '0.75rem 1rem',
// // //                   background: '#fee2e2',
// // //                   color: '#dc2626',
// // //                   borderRadius: '8px',
// // //                   marginBottom: '1rem',
// // //                   fontSize: '0.875rem',
// // //                   display: 'flex',
// // //                   alignItems: 'center',
// // //                   gap: '0.5rem'
// // //                 }}
// // //               >
// // //                 <AlertCircle size={16} />
// // //                 {error}
// // //               </div>
// // //             )}

// // //             {/* Success Message */}
// // //             {success && (
// // //               <div
// // //                 style={{
// // //                   padding: '0.75rem 1rem',
// // //                   background: '#d1fae5',
// // //                   color: '#065f46',
// // //                   borderRadius: '8px',
// // //                   marginBottom: '1rem',
// // //                   fontSize: '0.875rem',
// // //                   display: 'flex',
// // //                   alignItems: 'center',
// // //                   gap: '0.5rem'
// // //                 }}
// // //               >
// // //                 <AlertCircle size={16} />
// // //                 Alerta enviado com sucesso!
// // //               </div>
// // //             )}
// // //           </div>

// // //           {/* Footer */}
// // //           <div
// // //             style={{
// // //               padding: '1.5rem',
// // //               borderTop: '1px solid #e5e7eb',
// // //               display: 'flex',
// // //               gap: '1rem',
// // //               background: '#f9fafb'
// // //             }}
// // //           >
// // //             <button
// // //               type="button"
// // //               onClick={onClose}
// // //               disabled={loading}
// // //               style={{
// // //                 flex: 1,
// // //                 padding: '0.75rem',
// // //                 background: 'white',
// // //                 color: '#374151',
// // //                 border: '1px solid #e5e7eb',
// // //                 borderRadius: '8px',
// // //                 fontSize: '0.95rem',
// // //                 fontWeight: '600',
// // //                 cursor: loading ? 'not-allowed' : 'pointer',
// // //                 opacity: loading ? 0.5 : 1
// // //               }}
// // //             >
// // //               Cancelar
// // //             </button>
// // //             <button
// // //               type="submit"
// // //               disabled={loading || !mensagem.trim() || success}
// // //               style={{
// // //                 flex: 1,
// // //                 padding: '0.75rem',
// // //                 background: loading || !mensagem.trim() || success
// // //                   ? '#d1d5db'
// // //                   : 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
// // //                 color: 'white',
// // //                 border: 'none',
// // //                 borderRadius: '8px',
// // //                 fontSize: '0.95rem',
// // //                 fontWeight: '600',
// // //                 cursor: loading || !mensagem.trim() || success ? 'not-allowed' : 'pointer',
// // //                 display: 'flex',
// // //                 alignItems: 'center',
// // //                 justifyContent: 'center',
// // //                 gap: '0.5rem'
// // //               }}
// // //             >
// // //               {loading ? (
// // //                 <>
// // //                   <div
// // //                     style={{
// // //                       width: '16px',
// // //                       height: '16px',
// // //                       border: '2px solid white',
// // //                       borderTop: '2px solid transparent',
// // //                       borderRadius: '50%',
// // //                       animation: 'spin 1s linear infinite'
// // //                     }}
// // //                   />
// // //                   Enviando...
// // //                 </>
// // //               ) : (
// // //                 <>
// // //                   <Send size={18} />
// // //                   Enviar Alerta
// // //                 </>
// // //               )}
// // //             </button>
// // //           </div>
// // //         </form>

// // //         <style>{`
// // //           @keyframes spin {
// // //             0% { transform: rotate(0deg); }
// // //             100% { transform: rotate(360deg); }
// // //           }
// // //         `}</style>
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default ModalEnviarAlerta;

































// // // // front/src/components/ModalEnviarAlerta.jsx
// // // import React, { useState } from 'react';
// // // import { X, Send, AlertCircle } from 'lucide-react';
// // // import { enviarAlerta } from '../../services/alertaMedico';
// // // import './ModalEnviarAlerta.css';

// // // const ModalEnviarAlerta = ({ isOpen, onClose, paciente }) => {
// // //   const [mensagem, setMensagem] = useState('');
// // //   const [loading, setLoading] = useState(false);
// // //   const [error, setError] = useState('');
// // //   const [success, setSuccess] = useState(false);

// // //   const handleEnviar = async () => {
// // //     if (!mensagem || mensagem.trim().length < 10) {
// // //       setError('A mensagem deve ter no mínimo 10 caracteres');
// // //       return;
// // //     }

// // //     setLoading(true);
// // //     setError('');
// // //     setSuccess(false);

// // //     try {
// // //       await enviarAlerta(paciente.id, mensagem, paciente.email);
      
// // //       setSuccess(true);
// // //       setMensagem('');
      
// // //       // Fechar modal após 2 segundos
// // //       setTimeout(() => {
// // //         onClose();
// // //         setSuccess(false);
// // //       }, 2000);

// // //     } catch (err) {
// // //       console.error('Erro ao enviar alerta:', err);
// // //       setError(err.error || 'Erro ao enviar alerta. Tente novamente.');
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   if (!isOpen) return null;

// // //   return (
// // //     <div className="modal-overlay" onClick={onClose}>
// // //       <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
// // //         {/* Header */}
// // //         <div className="modal-header">
// // //           <div>
// // //             <h2 className="modal-title">Enviar Alerta por Email</h2>
// // //             <p className="modal-subtitle">
// // //               Paciente: <strong>{paciente?.nome}</strong>
// // //             </p>
// // //           </div>
// // //           <button onClick={onClose} className="btn-close">
// // //             <X size={24} />
// // //           </button>
// // //         </div>

// // //         {/* Body */}
// // //         <div className="modal-body">
          
// // //           {/* Informações do Paciente */}
// // //           <div className="patient-info-box">
// // //             <div className="info-row">
// // //               <span className="info-label">Nome:</span>
// // //               <span className="info-value">{paciente?.nome}</span>
// // //             </div>
// // //             <div className="info-row">
// // //               <span className="info-label">Email:</span>
// // //               <span className="info-value">{paciente?.email}</span>
// // //             </div>
// // //           </div>

// // //           {/* Campo de Mensagem */}
// // //           <div className="form-group">
// // //             <label htmlFor="mensagem" className="form-label">
// // //               Mensagem do Alerta *
// // //             </label>
// // //             <textarea
// // //               id="mensagem"
// // //               className="form-textarea"
// // //               placeholder="Digite sua recomendação ou alerta para o paciente. Mínimo de 10 caracteres."
// // //               value={mensagem}
// // //               onChange={(e) => setMensagem(e.target.value)}
// // //               rows={6}
// // //               disabled={loading}
// // //             />
// // //             <p className="char-counter">
// // //               {mensagem.length} caracteres {mensagem.length < 10 && '(mínimo 10)'}
// // //             </p>
// // //           </div>

// // //           {/* Mensagens de Erro/Sucesso */}
// // //           {error && (
// // //             <div className="alert alert-error">
// // //               <AlertCircle size={20} />
// // //               <span>{error}</span>
// // //             </div>
// // //           )}

// // //           {success && (
// // //             <div className="alert alert-success">
// // //               <Send size={20} />
// // //               <span>Alerta enviado com sucesso! 🎉</span>
// // //             </div>
// // //           )}

// // //           {/* Info Box */}
// // //           <div className="info-box">
// // //             <p>
// // //               📧 Um email será enviado para <strong>{paciente?.email}</strong> com sua mensagem.
// // //               O paciente também receberá uma notificação no sistema.
// // //             </p>
// // //           </div>
// // //         </div>

// // //         {/* Footer */}
// // //         <div className="modal-footer">
// // //           <button
// // //             onClick={onClose}
// // //             className="btn btn-secondary"
// // //             disabled={loading}
// // //           >
// // //             Cancelar
// // //           </button>
// // //           <button
// // //             onClick={handleEnviar}
// // //             className="btn btn-primary"
// // //             disabled={loading || mensagem.trim().length < 10}
// // //           >
// // //             {loading ? (
// // //               <>
// // //                 <div className="spinner"></div>
// // //                 Enviando...
// // //               </>
// // //             ) : (
// // //               <>
// // //                 <Send size={18} />
// // //                 Enviar Alerta
// // //               </>
// // //             )}
// // //           </button>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default ModalEnviarAlerta;