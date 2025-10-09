import React, { useState } from "react";
import { Activity, Droplet, Heart, Clock, TrendingUp, FileText, Plus, Bell, User, LogOut, X, Save } from "lucide-react";
import './PatientDashboard2.css';

const PatientDashboard = () => {
  const [showModal, setShowModal] = useState(false);
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

  const stats = [
    { 
      title: "Pressão Arterial", 
      value: "120/80", 
      unit: "mmHg", 
      icon: Heart, 
      trend: "normal",
      color: "stat-success"
    },
    { 
      title: "UF Total", 
      value: "2.1", 
      unit: "L", 
      icon: Droplet, 
      trend: "up",
      color: "stat-info"
    },
    { 
      title: "Glicose", 
      value: "95", 
      unit: "mg/dL", 
      icon: Activity, 
      trend: "normal",
      color: "stat-primary"
    },
    { 
      title: "Tempo Permanência", 
      value: "4.5", 
      unit: "horas", 
      icon: Clock, 
      trend: "normal",
      color: "stat-warning"
    },
  ];

  const recentRecords = [
    { date: "06/01/2025", pa: "120/80", uf: "2.1L", glicose: "95 mg/dL", status: "Normal" },
    { date: "05/01/2025", pa: "118/78", uf: "2.0L", glicose: "92 mg/dL", status: "Normal" },
    { date: "04/01/2025", pa: "125/82", uf: "2.2L", glicose: "98 mg/dL", status: "Atenção" },
  ];

  const reminders = [
    { title: "Sessão de Diálise", time: "Hoje às 14:00", icon: Clock, color: "reminder-primary" },
    { title: "Tomar Medicamento", time: "Hoje às 16:00", icon: Activity, color: "reminder-info" },
    { title: "Consulta Médica", time: "Amanhã às 10:00", icon: Heart, color: "reminder-warning" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Dados do registro:', formData);
    // Aqui você faria a chamada para a API
    alert('Registro salvo com sucesso!');
    setShowModal(false);
    // Reset form
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
  };

  return (
    <div className="dashboard-container">
      {/* Header/Navbar */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-section">
              <div className="logo-icon-small">
                <Heart className="icon" />
              </div>
              <span className="logo-text">DialCare</span>
            </div>
          </div>
          
          <div className="header-right">
            <button className="icon-button">
              <Bell className="icon" />
              <span className="notification-badge">3</span>
            </button>
            <button className="icon-button">
              <User className="icon" />
            </button>
            <button className="icon-button">
              <LogOut className="icon" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-wrapper">
          
          {/* Welcome Section */}
          <div className="welcome-section">
            <div className="welcome-text">
              <h1 className="welcome-title">Olá, Maria!</h1>
              <p className="welcome-subtitle">Aqui está um resumo do seu tratamento</p>
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus className="icon" />
              Novo Registro
            </button>
          </div>

          {/* Stats Grid */}
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
                    {stat.trend === "up" && (
                      <div className="stat-trend">
                        <TrendingUp className="trend-icon" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content Grid */}
          <div className="content-grid">
            
            {/* Recent Records */}
            <div className="card card-large">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Registros Recentes</h2>
                  <p className="card-description">Últimos parâmetros registrados</p>
                </div>
              </div>
              <div className="card-body">
                <div className="records-list">
                  {recentRecords.map((record, i) => (
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
                  ))}
                </div>
                <button className="btn-outline">
                  <FileText className="icon-small" />
                  Ver Histórico Completo
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Ações Rápidas</h2>
                  <p className="card-description">Acesso rápido às funcionalidades</p>
                </div>
              </div>
              <div className="card-body">
                <div className="actions-list">
                  <button className="action-button">
                    <Activity className="icon-small" />
                    Registrar Sintomas
                  </button>
                  <button className="action-button">
                    <Clock className="icon-small" />
                    Ver Lembretes
                  </button>
                  <button className="action-button">
                    <FileText className="icon-small" />
                    Upload de Exames
                  </button>
                  <button className="action-button">
                    <TrendingUp className="icon-small" />
                    Visualizar Gráficos
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Reminders */}
          <div className="card reminders-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Próximos Lembretes</h2>
                <p className="card-description">Não esqueça de suas atividades</p>
              </div>
            </div>
            <div className="card-body">
              <div className="reminders-grid">
                {reminders.map((reminder, i) => {
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
          </div>

        </div>
      </main>

      {/* Modal de Novo Registro */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Novo Registro de Diálise</h2>
                <p className="modal-subtitle">Registre seus parâmetros diários</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X className="icon" />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                
                {/* Pressão Arterial */}
                <div className="form-section">
                  <div className="section-header">
                    <Heart className="section-icon" />
                    <h3 className="section-title">Pressão Arterial</h3>
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
                        />
                        <span className="input-suffix">mmHg</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Volumes */}
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
                        />
                        <span className="input-suffix">L</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tempo e Glicose */}
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
                        />
                        <span className="input-suffix">mg/dL</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dextrose */}
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
                    >
                      <option value="">Selecione...</option>
                      <option value="1.5">1.5%</option>
                      <option value="2.5">2.5%</option>
                      <option value="4.25">4.25%</option>
                    </select>
                  </div>
                </div>

                {/* Observações */}
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
                    />
                  </div>
                </div>

              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSubmit}>
                <Save className="icon-small" />
                Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;