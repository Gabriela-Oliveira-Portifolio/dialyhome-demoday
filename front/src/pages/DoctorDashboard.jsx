import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Activity, AlertCircle, FileText, Bell, User, LogOut, Search, Eye, Calendar, Clock, X, ClipboardList, Pill, TrendingDown, BarChart3 } from 'lucide-react';
import { getDoctorProfile, getPatients, getDashboardStats, getNotifications, markNotificationAsRead, getPatientDetails } from '../services/doctor';
import ModalEnviarAlerta from '../components/ui/ModalEnviarAlerta';
import PatientAnalytics from '../components/ui/Patientanalytics';


const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [patientForAlert, setPatientForAlert] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsPatientId, setAnalyticsPatientId] = useState(null);
  const [analyticsPatientName, setAnalyticsPatientName] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleViewAnalytics = (patient) => {
    setAnalyticsPatientId(patient.id || patient.paciente_id);
    setAnalyticsPatientName(patient.nome);
    setShowAnalytics(true);
    setShowPatientModal(false); // Fechar modal de detalhes
  };

  const handleCloseAnalytics = () => {
    setShowAnalytics(false);
    setAnalyticsPatientId(null);
    setAnalyticsPatientName('');
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileData, patientsData, statsData, notificationsData] = await Promise.all([
        getDoctorProfile(),
        getPatients(),
        getDashboardStats(),
        getNotifications({ limit: 10, lida: false })
      ]);

      setDoctorInfo(profileData.doctor);
      setPatients(patientsData.patients || []);
      setStats(statsData);
      setNotifications(notificationsData.notifications || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.error || 'Erro ao carregar dados do dashboard');
      if (err.error?.includes('Token') || err.error?.includes('autenticação')) {
        sessionStorage.clear();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      loadDashboardData();
    } catch (err) {
      console.error('Erro ao marcar notificação:', err);
    }
  };

  const handleViewPatient = async (patientId) => {
    try {
      setLoading(true);
      const details = await getPatientDetails(patientId);
      setPatientDetails(details);
      setSelectedPatient(patientId);
      setShowPatientModal(true);
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      setError('Erro ao carregar detalhes do paciente');
    } finally {
      setLoading(false);
    }
  };

  const closePatientModal = () => {
    setShowPatientModal(false);
    setSelectedPatient(null);
    setPatientDetails(null);
  };

  const handleEnviarAlerta = (paciente) => {
    setPatientForAlert(paciente);
    setModalOpen(true);
  };

  const handleCloseAlertaModal = () => {
    setModalOpen(false);
    setPatientForAlert(null);
  };

  const handleGenerateReport = async () => {
    if (!patientDetails) return;
    
    try {
      setLoading(true);
      
      // Data de 30 dias atrás até hoje
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Buscar relatório do backend
      const response = await fetch(
        `https://dialyhome.com.br/api/doctor/reports/patient/${selectedPatient}?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Erro ao gerar relatório');
      }
      
      const reportData = await response.json();
      
      // Gerar PDF
      generatePDF(reportData);
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      setError('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  
  const generatePDF = (reportData) => {
  const { jsPDF } = globalThis.jspdf;
  const doc = new jsPDF();
  
  const { patient, period, statistics, dialysisRecords, medications } = reportData;
  
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Função para verificar se precisa de nova página
  const checkPageBreak = (spaceNeeded = 25) => {
    if (yPos + spaceNeeded > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };
  
  // Função para truncar texto longo
  const truncateText = (text, maxWidth) => {
    const textWidth = doc.getTextWidth(text);
    if (textWidth <= maxWidth) return text;
    
    let truncated = text;
    while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  };
  
  // ==================== HEADER MINIMALISTA ====================
  
  // Fundo branco simples
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Logo e título
  doc.setTextColor(20, 184, 166);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('DialCare', margin, 20);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Monitoramento de Dialise', margin, 27);
  
  // Data de geração
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const dataGeracao = new Date().toLocaleDateString('pt-BR');
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Gerado em: ${dataGeracao} as ${horaGeracao}`, pageWidth - margin, 20, { align: 'right' });
  
  // Linha divisória sutil
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, 35, pageWidth - margin, 35);
  
  yPos = 50;
  
  // ==================== TÍTULO DO RELATÓRIO ====================
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Relatorio Medico do Paciente', margin, yPos);
  
  yPos += 8;
  
  // Período
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  const periodoTexto = `Periodo: ${new Date(period.startDate).toLocaleDateString('pt-BR')} a ${new Date(period.endDate).toLocaleDateString('pt-BR')}`;
  doc.text(periodoTexto, margin, yPos);
  
  yPos += 15;
  
  // ==================== DADOS DO PACIENTE ====================
  
  checkPageBreak(35);
  
  // Box simples
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(1);
  doc.rect(margin, yPos, contentWidth, 30, 'D');
  
  yPos += 8;
  
  // Título da seção
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 184, 166);
  doc.text('DADOS DO PACIENTE', margin + 5, yPos);
  
  yPos += 8;
  
  // Informações
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  
  // Nome
  doc.text('Nome:', margin + 5, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(truncateText(patient.nome, 90), margin + 20, yPos);
  
  yPos += 6;
  
  // Email
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Email:', margin + 5, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(truncateText(patient.email, 90), margin + 20, yPos);
  
  yPos += 6;
  
  // Idade
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Idade:', margin + 5, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  const idade = new Date().getFullYear() - new Date(patient.data_nascimento).getFullYear();
  doc.text(`${idade} anos`, margin + 20, yPos);
  
  yPos += 15;
  
  // ==================== RESUMO ESTATÍSTICO ====================
  
  checkPageBreak(55);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Resumo Estatistico', margin, yPos);
  
  yPos += 10;
  
  // Cards de estatísticas simples
  const statCards = [
    {
      label: 'Total de Sessoes',
      value: String(statistics.totalSessions || 0),
      color: [20, 184, 166]
    },
    {
      label: 'Pressao Arterial Media',
      value: `${Math.round(statistics.averageSystolic || 0)}/${Math.round(statistics.averageDiastolic || 0)} mmHg`,
      color: [239, 68, 68]
    },
    {
      label: 'UF Medio',
      value: statistics.averageUF ? `${parseFloat(statistics.averageUF).toFixed(1)} L` : 'N/A',
      color: [16, 185, 129]
    },
    {
      label: 'Glicose Media',
      value: statistics.averageGlucose ? `${Math.round(statistics.averageGlucose)} mg/dL` : 'N/A',
      color: [251, 191, 36]
    }
  ];
  
  const cardWidth = (contentWidth - 6) / 2;
  const cardHeight = 22;
  
  statCards.forEach((stat, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const xPos = margin + col * (cardWidth + 6);
    const currentY = yPos + row * (cardHeight + 4);
    
    // Borda simples
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(1);
    doc.rect(xPos, currentY, cardWidth, cardHeight, 'D');
    
    // Barra superior colorida
    doc.setFillColor(...stat.color);
    doc.rect(xPos, currentY, cardWidth, 3, 'F');
    
    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(stat.label, xPos + 5, currentY + 10);
    
    // Valor
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(truncateText(stat.value, cardWidth - 10), xPos + 5, currentY + 18);
  });
  
  yPos += (Math.ceil(statCards.length / 2) * (cardHeight + 4)) + 12;
  
  // ==================== MEDICAMENTOS ====================
  
  if (medications && medications.length > 0) {
    checkPageBreak(40);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Medicamentos Ativos', margin, yPos);
    
    yPos += 10;
    
    medications.forEach((med, index) => {
      checkPageBreak(18);
      
      // Box do medicamento
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, contentWidth, 14, 'D');
      
      // Barra lateral
      doc.setFillColor(16, 185, 129);
      doc.rect(margin, yPos, 3, 14, 'F');
      
      // Número
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`${index + 1}.`, margin + 6, yPos + 6);
      
      // Nome
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(truncateText(med.nome, 85), margin + 12, yPos + 6);
      
      // Dosagem e frequência
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const info = `${med.dosagem} - ${med.frequencia}`;
      doc.text(truncateText(info, 90), margin + 12, yPos + 11);
      
      yPos += 17;
    });
    
    yPos += 5;
  }
  
  // ==================== HISTÓRICO DE SESSÕES ====================
  
  if (dialysisRecords && dialysisRecords.length > 0) {
    checkPageBreak(40);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Historico de Sessoes de Dialise', margin, yPos);
    
    yPos += 10;
    
    dialysisRecords.forEach((record, index) => {
      const hasSintomas = record.sintomas && record.sintomas.trim().length > 0;
      const recordHeight = hasSintomas ? 28 : 22;
      
      checkPageBreak(recordHeight + 3);
      
      // Box do registro
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, contentWidth, recordHeight, 'D');
      
      // Barra lateral
      const corLateral = hasSintomas ? [251, 191, 36] : [59, 130, 246];
      doc.setFillColor(...corLateral);
      doc.rect(margin, yPos, 3, recordHeight, 'F');
      
      // Data
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      const dataRegistro = new Date(record.data_registro).toLocaleDateString('pt-BR');
      doc.text(dataRegistro, margin + 6, yPos + 6);
      
      // Horário
      if (record.horario_inicio) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(record.horario_inicio, margin + 6, yPos + 11);
      }
      
      // Dados da sessão
      yPos += 14;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      
      // PA
      doc.text('PA:', margin + 6, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`${record.pressao_arterial_sistolica}/${record.pressao_arterial_diastolica} mmHg`, margin + 14, yPos);
      
      // UF
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('UF:', margin + 55, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      const ufValue = record.uf_total ? `${(record.uf_total / 1000).toFixed(1)} L` : 'N/A';
      doc.text(ufValue, margin + 62, yPos);
      
      // Glicose
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('Glicose:', margin + 90, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`${record.concentracao_glicose || 'N/A'} mg/dL`, margin + 105, yPos);
      
      yPos += 5;
      
      // Sintomas
      if (hasSintomas) {
        yPos += 2;
        doc.setFillColor(255, 250, 230);
        doc.rect(margin + 6, yPos - 2, contentWidth - 12, 8, 'F');
        
        doc.setFontSize(7);
        doc.setTextColor(150, 100, 30);
        doc.setFont('helvetica', 'bold');
        doc.text('SINTOMAS:', margin + 8, yPos + 1);
        doc.setFont('helvetica', 'normal');
        doc.text(truncateText(record.sintomas, contentWidth - 35), margin + 8, yPos + 5);
      }
      
      yPos += recordHeight - 16;
    });
  }
  
  // ==================== FOOTER SIMPLES ====================
  
  const pageCount = doc.internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    const footerY = pageHeight - 20;
    
    // Linha divisória
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    // Textos do footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    
    doc.text('DialCare - Sistema de Monitoramento de Dialise', margin, footerY + 7);
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - margin, footerY + 7, { align: 'right' });
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Documento Confidencial - Uso Exclusivo do Medico Responsavel',
      pageWidth / 2,
      footerY + 12,
      { align: 'center' }
    );
  }
  
  // ==================== SALVAR PDF ====================
  
  const fileName = `Relatorio_${patient.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};



  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'risk' && patient.alertas_nao_lidos > 0) ||
      (filterStatus === 'recent' && patient.ultimo_registro &&
        new Date(patient.ultimo_registro) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    return matchesSearch && matchesFilter;
  });

  if (loading && !showPatientModal) {
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
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>Carregando...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #ecfdf5 100%)' }}>
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
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                DialCare Médico
              </span>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                Painel de Acompanhamento
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: '#f3f4f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              <Bell size={20} color="#6b7280" strokeWidth={2} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  background: '#ef4444',
                  borderRadius: '50%'
                }} />
              )}
            </button> */}
            <button
              onClick={() => navigate('/perfilDoutor')}
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
            <button
              onClick={handleLogout}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: '#fee2e2',
                color: '#dc2626',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LogOut size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div style={{
            position: 'absolute',
            top: '80px',
            right: '2rem',
            width: '400px',
            maxHeight: '500px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            zIndex: 100
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                Notificações ({notifications.length})
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex'
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  Nenhuma notificação não lida
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                      <AlertCircle size={20} color="#f59e0b" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
                          {notification.titulo}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                          {notification.mensagem}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {new Date(notification.criado_em || notification.data_criacao).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
        {error && (
          <div style={{
            padding: '1rem',
            background: '#fee2e2',
            color: '#dc2626',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Welcome Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            Olá, Dr(a). {doctorInfo?.nome || 'Médico'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            {doctorInfo?.crm && `CRM: ${doctorInfo.crm}`}
            {doctorInfo?.especialidade && ` • ${doctorInfo.especialidade}`}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                    Total de Pacientes
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {stats.total_pacientes || stats.totalPatients || 0}
                  </p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#dbeafe',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={24} color="#3b82f6" />
                </div>
              </div>
            </div>

            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                    Sessões Hoje
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {stats.sessoes_hoje || stats.sessionsToday || 0}
                  </p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#d1fae5',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Activity size={24} color="#10b981" />
                </div>
              </div>
            </div>

            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                    Alertas Ativos
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {stats.alertas_ativos || stats.unreadAlerts || 0}
                  </p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#fef3c7',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertCircle size={24} color="#f59e0b" />
                </div>
              </div>
            </div>

            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                    Pacientes Críticos
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {stats.pacientes_criticos || stats.patientsAtRisk || 0}
                  </p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#fee2e2',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingDown size={24} color="#ef4444" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patients Section */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          {/* Filters */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
              <Search size={20} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setFilterStatus('all')}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: filterStatus === 'all' ? '#14b8a6' : '#f3f4f6',
                  color: filterStatus === 'all' ? 'white' : '#6b7280'
                }}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('risk')}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: filterStatus === 'risk' ? '#14b8a6' : '#f3f4f6',
                  color: filterStatus === 'risk' ? 'white' : '#6b7280'
                }}
              >
                Com Alertas
              </button>
              <button
                onClick={() => setFilterStatus('recent')}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: filterStatus === 'recent' ? '#14b8a6' : '#f3f4f6',
                  color: filterStatus === 'recent' ? 'white' : '#6b7280'
                }}
              >
                Recentes
              </button>
            </div>
          </div>

          {/* Patients List */}
          <div style={{ padding: '1.5rem' }}>
            {filteredPatients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <Users size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
                  Nenhum paciente encontrado
                </p>
                <p style={{ fontSize: '0.95rem' }}>
                  Ajuste os filtros ou busque por outro termo
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredPatients.map(patient => (
                  <PatientCard
                    key={patient.id || patient.paciente_id}
                    patient={patient}
                    onView={() => handleViewPatient(patient.id || patient.paciente_id)}
                    onEnviarAlerta={() => handleEnviarAlerta(patient)}
                    onViewAnalytics={() => handleViewAnalytics(patient)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Patient Details Modal */}
      {showPatientModal && patientDetails && (
        <PatientDetailsModal
          patient={patientDetails.patient}
          recentDialysis={patientDetails.recent_dialysis || patientDetails.recentDialysis}
          medications={patientDetails.medications}
          stats={patientDetails.stats}
          onClose={closePatientModal}
          onGenerateReport={handleGenerateReport}
          onViewAnalytics={() => handleViewAnalytics(patientDetails.patient)}
        />
      )}

      {/* Modal de Analytics - FORA dos outros modais */}
      {showAnalytics && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            overflow: 'auto'
          }}
          onClick={handleCloseAnalytics}
        >
          <div
            style={{
              minHeight: '100vh',
              padding: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              maxWidth: '1400px',
              margin: '0 auto',
              background: 'white',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              {/* Header do Modal */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: 'white',
                  margin: 0
                }}>
                  📊 Análises Estratégicas
                </h2>
                <button
                  onClick={handleCloseAnalytics}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Conteúdo do Analytics */}
              <PatientAnalytics
                patientId={analyticsPatientId}
                patientName={analyticsPatientName}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Enviar Alerta */}
      <ModalEnviarAlerta
        isOpen={modalOpen}
        onClose={handleCloseAlertaModal}
        paciente={patientForAlert}
      />
    </div>
  );
};

// Patient Card Component
const PatientCard = ({ patient, onView, onEnviarAlerta, onViewAnalytics }) => (
  <div
    style={{
      padding: '1.5rem',
      background: '#f9fafb',
      borderRadius: '12px',
      border: patient.alertas_nao_lidos > 0 ? '2px solid #fbbf24' : '1px solid #e5e7eb',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.background = '#f3f4f6';
      e.currentTarget.style.transform = 'translateX(4px)';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.background = '#f9fafb';
      e.currentTarget.style.transform = 'translateX(0)';
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
            {patient.nome}
          </h3>
          {patient.alertas_nao_lidos > 0 && (
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              background: '#fef3c7',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <AlertCircle size={12} />
              {patient.alertas_nao_lidos} alerta{patient.alertas_nao_lidos > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          {patient.email}
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEnviarAlerta();
          }}
          style={{
            padding: '0.5rem 1rem',
            background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bell size={16} />
          Enviar Alerta
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewAnalytics();
          }}
          style={{
            padding: '0.5rem 1rem',
            background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <BarChart3 size={16} />
          Ver Análises
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          style={{
            padding: '0.5rem 1rem',
            background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Eye size={16} />
          Ver Detalhes
        </button>
      </div>
    </div>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '1rem',
      fontSize: '0.875rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={16} color="#6b7280" />
        <span style={{ color: '#6b7280' }}>
          {patient.idade} anos
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={16} color="#6b7280" />
        <span style={{ color: '#6b7280' }}>
          {patient.total_registros} registros
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={16} color="#6b7280" />
        <span style={{ color: '#6b7280' }}>
          {patient.ultimo_registro
            ? `Último: ${new Date(patient.ultimo_registro).toLocaleDateString('pt-BR')}`
            : 'Sem registros'}
        </span>
      </div>
    </div>
  </div>
);

// Patient Details Modal Component
const PatientDetailsModal = ({ patient, recentDialysis, medications, stats, onClose, onGenerateReport, onViewAnalytics }) => (
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
      padding: '2rem'
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: 'white',
        borderRadius: '20px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        background: 'white',
        zIndex: 10
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.25rem 0' }}>
            {patient.nome}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            {patient.email} • {patient.idade} anos
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Modal Content */}
      <div style={{ padding: '1.5rem' }}>
        {/* Statistics */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Estatísticas do Último Mês
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                Total de Sessões
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {stats.total_sessoes || 0}
              </p>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                Pressão Média
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {stats.media_sistolica
                  ? `${Math.round(stats.media_sistolica)}/${Math.round(stats.media_diastolica)}`
                  : 'N/A'}
              </p>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                UF Médio
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {stats.media_uf ? `${(stats.media_uf / 1000).toFixed(1)}L` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Dialysis */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ClipboardList size={20} />
            Últimos Registros de Diálise
          </h3>
          {recentDialysis && recentDialysis.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentDialysis.map((record, index) => (
                <div
                  key={record.id || index}
                  style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontWeight: '600', color: '#111827' }}>
                      {new Date(record.data_registro).toLocaleDateString('pt-BR')}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {record.horario_inicio} - {record.horario_fim}
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '0.75rem',
                    fontSize: '0.875rem'
                  }}>
                    <div>
                      <p style={{ color: '#6b7280', margin: '0 0 0.25rem 0' }}>PA</p>
                      <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.pressao_arterial_sistolica}/{record.pressao_arterial_diastolica}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', margin: '0 0 0.25rem 0' }}>UF</p>
                      <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.uf_total ? `${(record.uf_total / 1000).toFixed(1)}L` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', margin: '0 0 0.25rem 0' }}>Glicose</p>
                      <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>
                        {record.concentracao_glicose || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {record.sintomas && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: '#fef3c7',
                      borderRadius: '6px'
                    }}>
                      <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>
                        <strong>Sintomas:</strong> {record.sintomas}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              Nenhum registro de diálise encontrado
            </p>
          )}
        </div>

        {/* Medications */}
        <div>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Pill size={20} />
            Medicamentos Ativos
          </h3>
          {medications && medications.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              {medications.map((med, index) => (
                <div
                  key={med.id || index}
                  style={{
                    padding: '1rem',
                    background: '#f0f9ff',
                    borderRadius: '10px',
                    border: '1px solid #e0f2fe'
                  }}
                >
                  <p style={{ fontWeight: '600', color: '#111827', margin: '0 0 0.5rem 0' }}>
                    {med.nome}
                  </p>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>Dosagem:</strong> {med.dosagem}
                    </p>
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>Frequência:</strong> {med.frequencia}
                    </p>
                    {med.observacoes && (
                      <p style={{ margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                        {med.observacoes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              Nenhum medicamento cadastrado
            </p>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      <div style={{
        padding: '1.5rem',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '1rem',
        position: 'sticky',
        bottom: 0,
        background: 'white'
      }}>
        <button
          onClick={onClose}
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
          Fechar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewAnalytics();
          }}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
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
          <BarChart3 size={18} />
          Ver Análises Estratégicas
        </button>
        <button
          onClick={onGenerateReport}
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
          <FileText size={18} />
          Gerar Relatório PDF
        </button>
      </div>
    </div>
  </div>
);

export default DoctorDashboard;
