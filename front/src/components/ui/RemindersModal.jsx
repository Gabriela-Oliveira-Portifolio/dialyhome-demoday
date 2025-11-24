import  { useState, useEffect } from 'react';
import { Plus, X, Trash2, Calendar, Bell } from 'lucide-react';
import { getReminders, createReminder, deleteReminder } from '../../services/reminder';

const RemindersModal = ({ isOpen, onClose }) => {
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    tipo: 'medicacao',
    titulo: '',
    descricao: '',
    data_hora: '',
    recorrente: false,
    frequencia_recorrencia: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadReminders();
    }
  }, [isOpen]);

  const loadReminders = async () => {
    try {
      const data = await getReminders();
      setReminders(data.reminders);
    } catch (err) {
      console.error('Erro ao carregar lembretes:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await createReminder(formData);
      setSuccess('Lembrete criado com sucesso!');
      await loadReminders();
      
      setTimeout(() => {
        setShowForm(false);
        setSuccess('');
        setFormData({
          tipo: 'medicacao',
          titulo: '',
          descricao: '',
          data_hora: '',
          recorrente: false,
          frequencia_recorrencia: ''
        });
      }, 1500);
    } catch (err) {
      setError(err.error || 'Erro ao criar lembrete');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm('Tem certeza que deseja deletar este lembrete?')) return;

    try {
      await deleteReminder(id);
      setSuccess('Lembrete deletado com sucesso!');
      await loadReminders();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.error || 'Erro ao deletar lembrete');
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'medicacao': return '💊';
      case 'dialise': return '🩺';
      case 'consulta': return '👨‍⚕️';
      default: return '📌';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              <Bell style={{ width: '24px', height: '24px', marginRight: '8px' }} />
              Meus Lembretes
            </h2>
            <p className="modal-subtitle">Gerencie seus lembretes e alertas</p>
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

          {!showForm ? (
            <>
              <button 
                className="btn-primary" 
                style={{ marginBottom: '20px', width: '100%' }}
                onClick={() => setShowForm(true)}
              >
                <Plus style={{ width: '18px', height: '18px' }} />
                Novo Lembrete
              </button>

              {reminders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      style={{
                        backgroundColor: '#f8fafc',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '20px' }}>{getTipoIcon(reminder.tipo)}</span>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                              {reminder.titulo}
                            </h3>
                          </div>

                          {reminder.descricao && (
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                              {reminder.descricao}
                            </p>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#999' }}>
                            <Calendar style={{ width: '14px', height: '14px' }} />
                            {formatDateTime(reminder.data_hora)}
                          </div>

                          {reminder.recorrente && (
                            <span style={{
                              display: 'inline-block',
                              marginTop: '8px',
                              padding: '4px 8px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              🔄 {reminder.frequencia_recorrencia}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleDelete(reminder.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Deletar lembrete"
                        >
                          <Trash2 style={{ width: '18px', height: '18px' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
                  Você ainda não tem lembretes cadastrados.
                </p>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Tipo de Lembrete *
                  </label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="medicacao">💊 Medicação</option>
                    <option value="dialise">🩺 Sessão de Diálise</option>
                    <option value="consulta">👨‍⚕️ Consulta Médica</option>
                    <option value="exame">🔬 Exame</option>
                    <option value="outro">📌 Outro</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Título *
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Ex: Tomar Losartana"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Descrição
                  </label>
                  <textarea
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleInputChange}
                    className="form-textarea"
                    placeholder="Adicione detalhes sobre o lembrete..."
                    rows="3"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Data e Hora *
                  </label>
                  <input
                    type="datetime-local"
                    name="data_hora"
                    value={formData.data_hora}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="recorrente"
                      checked={formData.recorrente}
                      onChange={handleInputChange}
                    />
                    <span style={{ fontWeight: '500' }}>Lembrete recorrente</span>
                  </label>
                </div>

                {formData.recorrente && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Frequência
                    </label>
                    <select
                      name="frequencia_recorrencia"
                      value={formData.frequencia_recorrencia}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">Selecione...</option>
                      <option value="diario">Diário</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({
                        tipo: 'medicacao',
                        titulo: '',
                        descricao: '',
                        data_hora: '',
                        recorrente: false,
                        frequencia_recorrencia: ''
                      });
                    }}
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    {loading ? 'Salvando...' : 'Salvar Lembrete'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemindersModal;