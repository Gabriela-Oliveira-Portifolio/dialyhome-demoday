import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Heart, ArrowLeft, Save, Eye, EyeOff,
  Phone, MapPin, Stethoscope, CreditCard, AlertCircle,
  CheckCircle, Bell, LogOut, Plus, X
} from 'lucide-react';
import { getDoctorProfile, updateDoctorProfile, changeDoctorPassword } from '../services/doctor';
import './PatientProfile.css';

const DoctorProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('personal');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    crm: '',
    telefone: '',
    endereco: '',
    especialidades: []
  });

  const [newEspecialidade, setNewEspecialidade] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    loadDoctorProfile();
  }, []);

  const loadDoctorProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getDoctorProfile();
      const doctor = response.doctor;

      const data = {
        crm: doctor.crm || '',
        telefone: doctor.telefone || '',
        endereco: doctor.endereco || '',
        especialidades: doctor.especialidade ? doctor.especialidade.split(',').map(e => e.trim()) : []
      };

      setProfileData(data);
      setOriginalData(data);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      setError('Erro ao carregar dados do perfil');
      
      if (err.error?.includes('Token') || err.error?.includes('autenticação')) {
        sessionStorage.clear();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setProfileData(prev => ({ ...prev, telefone: formatted }));
  };

  const handleAddEspecialidade = () => {
    if (newEspecialidade.trim()) {
      setProfileData(prev => ({
        ...prev,
        especialidades: [...prev.especialidades, newEspecialidade.trim()]
      }));
      setNewEspecialidade('');
    }
  };

  const handleRemoveEspecialidade = (index) => {
    setProfileData(prev => ({
      ...prev,
      especialidades: prev.especialidades.filter((_, i) => i !== index)
    }));
  };

  const validateProfileData = () => {
    if (profileData.crm && profileData.crm.length < 4) {
      setError('CRM inválido');
      return false;
    }

    if (profileData.telefone && profileData.telefone.length < 14) {
      setError('Telefone inválido');
      return false;
    }

    if (profileData.especialidades.length === 0) {
      setError('Adicione pelo menos uma especialidade');
      return false;
    }

    return true;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!validateProfileData()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Verificar se houve alterações
      const especialidadesChanged = 
        JSON.stringify(profileData.especialidades.sort()) !== 
        JSON.stringify(originalData.especialidades.sort());

      const changedData = {};
      
      if (profileData.crm !== originalData.crm) {
        changedData.crm = profileData.crm;
      }
      if (profileData.telefone !== originalData.telefone) {
        changedData.telefone = profileData.telefone;
      }
      if (profileData.endereco !== originalData.endereco) {
        changedData.endereco = profileData.endereco;
      }
      if (especialidadesChanged) {
        changedData.especialidade = profileData.especialidades.join(', ');
      }

      if (Object.keys(changedData).length === 0) {
        setError('Nenhuma alteração detectada');
        setSaving(false);
        return;
      }

      await updateDoctorProfile(changedData);
      setSuccess('Perfil atualizado com sucesso!');
      setOriginalData(profileData);
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      setError(err.error || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('Preencha todos os campos de senha');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await changeDoctorPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSuccess('Senha alterada com sucesso!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setError(err.error || 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/DoctorDashboard');
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
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
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>Carregando perfil...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

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
              DialCare - Meu Perfil
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button style={{
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
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          
          {/* Title */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              background: 'linear-gradient(90deg, #0d9488 0%, #059669 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Configurações do Perfil
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Gerencie suas informações profissionais e segurança
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: '#d1fae5',
              color: '#065f46',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle size={20} />
              {success}
            </div>
          )}

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
            <button
              onClick={() => setActiveTab('personal')}
              style={{
                flex: 1,
                padding: '1rem',
                background: activeTab === 'personal' 
                  ? 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)' 
                  : 'transparent',
                color: activeTab === 'personal' ? 'white' : '#6b7280',
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
              <User size={18} />
              Dados Profissionais
            </button>
            <button
              onClick={() => setActiveTab('security')}
              style={{
                flex: 1,
                padding: '1rem',
                background: activeTab === 'security' 
                  ? 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)' 
                  : 'transparent',
                color: activeTab === 'security' ? 'white' : '#6b7280',
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
              <Lock size={18} />
              Segurança
            </button>
          </div>

          {/* Content */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            {activeTab === 'personal' ? (
              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* CRM */}
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
                      <CreditCard size={18} color="#14b8a6" />
                      CRM
                    </label>
                    <input
                      type="text"
                      name="crm"
                      value={profileData.crm}
                      onChange={handleInputChange}
                      placeholder="CRM 12345"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {/* Telefone */}
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
                      <Phone size={18} color="#14b8a6" />
                      Telefone
                    </label>
                    <input
                      type="text"
                      name="telefone"
                      value={profileData.telefone}
                      onChange={handlePhoneChange}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {/* Endereço */}
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
                      <MapPin size={18} color="#14b8a6" />
                      Endereço do Consultório
                    </label>
                    <textarea
                      name="endereco"
                      value={profileData.endereco}
                      onChange={handleInputChange}
                      placeholder="Rua, número, bairro, cidade, estado"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        outline: 'none',
                        resize: 'vertical',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {/* Especialidades */}
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
                      <Stethoscope size={18} color="#14b8a6" />
                      Especialidades
                    </label>
                    
                    {/* Lista de especialidades */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}>
                      {profileData.especialidades.map((esp, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background: '#e0f2fe',
                            borderRadius: '20px',
                            fontSize: '0.875rem',
                            color: '#0369a1'
                          }}
                        >
                          <span>{esp}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEspecialidade(index)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: 0
                            }}
                          >
                            <X size={16} color="#0369a1" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Adicionar nova especialidade */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={newEspecialidade}
                        onChange={(e) => setNewEspecialidade(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEspecialidade();
                          }
                        }}
                        placeholder="Digite uma especialidade"
                        style={{
                          flex: 1,
                          padding: '0.75rem 1rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                      <button
                        type="button"
                        onClick={handleAddEspecialidade}
                        style={{
                          padding: '0.75rem 1rem',
                          background: '#14b8a6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        <Plus size={18} />
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      background: saving 
                        ? '#d1d5db' 
                        : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Save size={18} />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangePassword}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Senha Atual */}
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
                      <Lock size={18} color="#14b8a6" />
                      Senha Atual
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Digite sua senha atual"
                        style={{
                          width: '100%',
                          padding: '0.75rem 3rem 0.75rem 1rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{
                          position: 'absolute',
                          right: '1rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                      >
                        {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Nova Senha */}
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
                      <Lock size={18} color="#14b8a6" />
                      Nova Senha
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Digite sua nova senha (mín. 6 caracteres)"
                        style={{
                          width: '100%',
                          padding: '0.75rem 3rem 0.75rem 1rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '1rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                      >
                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Senha */}
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
                      <Lock size={18} color="#14b8a6" />
                      Confirmar Nova Senha
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirme sua nova senha"
                        style={{
                          width: '100%',
                          padding: '0.75rem 3rem 0.75rem 1rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '1rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280'
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
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
                    <strong>Dicas de segurança:</strong>
                    <ul style={{ margin: '0.5rem 0 0 1.5rem', paddingLeft: 0 }}>
                      <li>Use pelo menos 6 caracteres</li>
                      <li>Combine letras, números e símbolos</li>
                      <li>Não use senhas óbvias ou fáceis de adivinhar</li>
                    </ul>
                  </div>

                  {/* Button */}
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      background: saving 
                        ? '#d1d5db' 
                        : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Lock size={18} />
                    {saving ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorProfile;