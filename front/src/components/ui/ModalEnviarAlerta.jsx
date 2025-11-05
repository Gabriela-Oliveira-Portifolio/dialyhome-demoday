import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, CheckCircle, Mail, Calendar, FileText } from 'lucide-react';
import { sendPatientAlert } from '../../services/doctor';
import { getPatientDialysisHistory } from '../../services/doctor';

// ===============================
// COMPONENTES AUXILIARES
// ===============================

const AlertMessage = ({ type, message }) => {
  const isError = type === 'error';
  
  return (
    <div style={{
      backgroundColor: isError ? '#fee2e2' : '#d1fae5',
      color: isError ? '#dc2626' : '#065f46',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem'
    }}>
      {isError ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
      {message}
    </div>
  );
};

const ModalHeader = ({ paciente, onClose, loading }) => (
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
);

const TipoAlertaButtons = ({ tipo, onChange, loading }) => (
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
        onClick={() => onChange('geral')}
        disabled={loading}
        style={{
          flex: 1,
          padding: '0.75rem',
          border: tipo === 'geral' ? '2px solid #14b8a6' : '2px solid #e5e7eb',
          borderRadius: '10px',
          background: tipo === 'geral' ? '#f0fdfa' : 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: tipo === 'geral' ? '#14b8a6' : '#6b7280',
          transition: 'all 0.2s'
        }}
      >
        Mensagem Geral
      </button>
      <button
        type="button"
        onClick={() => onChange('especifico')}
        disabled={loading}
        style={{
          flex: 1,
          padding: '0.75rem',
          border: tipo === 'especifico' ? '2px solid #14b8a6' : '2px solid #e5e7eb',
          borderRadius: '10px',
          background: tipo === 'especifico' ? '#f0fdfa' : 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: tipo === 'especifico' ? '#14b8a6' : '#6b7280',
          transition: 'all 0.2s'
        }}
      >
        Relacionado à Sessão
      </button>
    </div>
  </div>
);

const SessaoDialiseSelect = ({ sessoes, loading, loadingSessoes, value, onChange, required }) => {
  if (loadingSessoes) {
    return (
      <div style={{
        padding: '1rem',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '0.875rem'
      }}>
        Carregando sessões...
      </div>
    );
  }

  if (sessoes.length === 0) {
    return (
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
    );
  }

  return (
    <select
      name="sessao_dialise_id"
      value={value}
      onChange={onChange}
      disabled={loading}
      required={required}
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
  );
};

const PrioridadeButtons = ({ prioridade, onChange, loading }) => {
  const prioridades = [
    { value: 'baixa', label: 'Baixa', color: '#10b981' },
    { value: 'media', label: 'Média', color: '#f59e0b' },
    { value: 'alta', label: 'Alta', color: '#ef4444' }
  ];

  return (
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
        {prioridades.map(p => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.625rem',
              border: prioridade === p.value ? `2px solid ${p.color}` : '2px solid #e5e7eb',
              borderRadius: '8px',
              background: prioridade === p.value ? `${p.color}10` : 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: prioridade === p.value ? p.color : '#6b7280',
              transition: 'all 0.2s'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const TituloInput = ({ value, onChange, loading, maxLength = 100 }) => (
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
      value={value}
      onChange={onChange}
      placeholder="Ex: Atenção aos valores de pressão arterial"
      disabled={loading}
      required
      maxLength={maxLength}
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
      {value.length}/{maxLength} caracteres
    </p>
  </div>
);

const MensagemTextarea = ({ value, onChange, loading, maxLength = 1000 }) => (
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
      value={value}
      onChange={onChange}
      placeholder="Digite a mensagem que será enviada por email ao paciente..."
      disabled={loading}
      required
      rows={6}
      maxLength={maxLength}
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
      {value.length}/{maxLength} caracteres
    </p>
  </div>
);

const InfoBox = () => (
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
);

const ModalFooter = ({ onCancel, onSubmit, loading, success }) => (
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
      onClick={onCancel}
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
      onClick={onSubmit}
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
);

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

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
      resetForm();
    }
  }, [isOpen, paciente]);

  const resetForm = () => {
    setFormData({
      titulo: '',
      mensagem: '',
      prioridade: 'media',
      tipo: 'geral',
      sessao_dialise_id: ''
    });
    setError('');
    setSuccess('');
  };

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
  };

  const handleTipoChange = (tipo) => {
    setFormData(prev => ({
      ...prev,
      tipo,
      sessao_dialise_id: tipo === 'geral' ? '' : prev.sessao_dialise_id
    }));
  };

  const handlePrioridadeChange = (prioridade) => {
    setFormData(prev => ({ ...prev, prioridade }));
  };

  const validateForm = () => {
    if (!formData.titulo.trim()) {
      setError('O título é obrigatório');
      return false;
    }

    if (!formData.mensagem.trim()) {
      setError('A mensagem é obrigatória');
      return false;
    }

    if (formData.tipo === 'especifico' && !formData.sessao_dialise_id) {
      setError('Selecione uma sessão de diálise');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

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
        <ModalHeader 
          paciente={paciente} 
          onClose={onClose} 
          loading={loading} 
        />

        <div style={{ padding: '1.5rem' }}>
          {error && <AlertMessage type="error" message={error} />}
          {success && <AlertMessage type="success" message={success} />}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <TipoAlertaButtons 
                tipo={formData.tipo} 
                onChange={handleTipoChange} 
                loading={loading} 
              />

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
                  <SessaoDialiseSelect
                    sessoes={sessoes}
                    loading={loading}
                    loadingSessoes={loadingSessoes}
                    value={formData.sessao_dialise_id}
                    onChange={handleInputChange}
                    required={formData.tipo === 'especifico'}
                  />
                </div>
              )}

              <PrioridadeButtons 
                prioridade={formData.prioridade} 
                onChange={handlePrioridadeChange} 
                loading={loading} 
              />

              <TituloInput 
                value={formData.titulo} 
                onChange={handleInputChange} 
                loading={loading} 
              />

              <MensagemTextarea 
                value={formData.mensagem} 
                onChange={handleInputChange} 
                loading={loading} 
              />

              <InfoBox />
            </div>
          </form>
        </div>

        <ModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          loading={loading}
          success={success}
        />
      </div>
    </div>
  );
};

export default ModalEnviarAlerta;