import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Heart, ArrowLeft, Save, Eye, EyeOff,
  Phone, MapPin, Weight, Ruler, CreditCard, AlertCircle,
  CheckCircle, Bell, LogOut, Shield, Stethoscope, Calendar
} from 'lucide-react';
import { getUserProfile, updateUserProfile, changePassword } from '../services/Userservice';
import './PatientProfile.css';

// ==================== COMPONENTES REUTILIZÁVEIS ====================

const InputField = ({ 
  label, 
  icon: Icon, 
  name, 
  value, 
  onChange, 
  type = 'text',
  placeholder,
  rows,
  ...props 
}) => {
  const isTextarea = type === 'textarea';
  const InputComponent = isTextarea ? 'textarea' : 'input';

  return (
    <div>
      <label style={styles.label}>
        <Icon size={18} color="#14b8a6" />
        {label}
      </label>
      <InputComponent
        type={isTextarea ? undefined : type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...styles.input,
          ...(isTextarea && { resize: 'vertical' })
        }}
        onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        {...props}
      />
    </div>
  );
};

const PasswordField = ({ 
  label, 
  name, 
  value, 
  onChange, 
  placeholder,
  showPassword,
  onTogglePassword
}) => {
  return (
    <div>
      <label style={styles.label}>
        <Lock size={18} color="#14b8a6" />
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={styles.passwordInput}
          onFocus={(e) => e.target.style.borderColor = '#14b8a6'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />
        <button
          type="button"
          onClick={onTogglePassword}
          style={styles.passwordToggle}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, children }) => {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabButton,
        background: active 
          ? 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)' 
          : 'transparent',
        color: active ? 'white' : '#6b7280'
      }}
    >
      <Icon size={18} />
      {children}
    </button>
  );
};

const SubmitButton = ({ saving, children, icon: Icon }) => {
  return (
    <button
      type="submit"
      disabled={saving}
      style={{
        ...styles.submitButton,
        background: saving 
          ? '#d1d5db' 
          : 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
        cursor: saving ? 'not-allowed' : 'pointer'
      }}
    >
      <Icon size={18} />
      {children}
    </button>
  );
};

const Alert = ({ type, children }) => {
  const isError = type === 'error';
  return (
    <div style={{
      ...styles.alert,
      backgroundColor: isError ? '#fee2e2' : '#d1fae5',
      color: isError ? '#dc2626' : '#065f46',
      border: isError ? '1px solid #fecaca' : '1px solid #a7f3d0'
    }}>
      {isError ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
      {children}
    </div>
  );
};

// ==================== ESTILOS ====================

const styles = {
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  passwordInput: {
    width: '100%',
    padding: '0.75rem 3rem 0.75rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  passwordToggle: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280'
  },
  tabButton: {
    flex: 1,
    padding: '1rem',
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
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
    transition: 'all 0.2s'
  },
  alert: {
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  }
};

// ==================== COMPONENTE PRINCIPAL ====================

const UserProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('personal');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userType, setUserType] = useState('');

  const [profileData, setProfileData] = useState({
    cpf: '',
    telefone: '',
    endereco: '',
    peso_inicial: '',
    altura: '',
    data_inicio_tratamento: '',
    crm: '',
    especialidade: '',
    telefone_contato: '',
    local_atendimento: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getUserProfile();
      
      const user = response.user || response.patient || response.doctor || response.data;
      
      if (!user) {
        console.error('Estrutura da resposta:', response);
        throw new Error('Dados do usuário não encontrados na resposta');
      }
      
      const tipo = sessionStorage.getItem('userType') || 
                   user.tipo_usuario || 
                   response.tipo_usuario ||
                   'paciente';
      
      setUserType(tipo);

      const data = {
        cpf: user.cpf || '',
        telefone: user.telefone || '',
        endereco: user.endereco || '',
        peso_inicial: user.peso_inicial || '',
        altura: user.altura || '',
        data_inicio_tratamento: user.data_inicio_tratamento ? 
          user.data_inicio_tratamento.split('T')[0] : '',
        crm: user.crm || '',
        especialidade: user.especialidade || '',
        telefone_contato: user.telefone_contato || user.telefone || '',
        local_atendimento: user.local_atendimento || ''
      };

      setProfileData(data);
      setOriginalData(data);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      setError(err.message || err.error || 'Erro ao carregar dados do perfil');
      
      if (err.error?.includes('Token') || err.error?.includes('autenticação') || err.message?.includes('Token')) {
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

  const formatCPF = (value) => {
    const numbers = value.replaceAll(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+$/, '$1');
  };

  const formatPhone = (value) => {
    const numbers = value.replaceAll(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+$/, '$1');
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setProfileData(prev => ({ ...prev, cpf: formatted }));
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setProfileData(prev => ({ ...prev, telefone: formatted }));
  };

  const validateProfileData = () => {
    if (profileData.cpf && profileData.cpf.length < 14) {
      setError('CPF inválido');
      return false;
    }

    if (profileData.telefone && profileData.telefone.length < 14) {
      setError('Telefone inválido');
      return false;
    }

    if (userType === 'paciente') {
      if (profileData.peso_inicial && (Number.parseFloat(profileData.peso_inicial) < 20 || Number.parseFloat(profileData.peso_inicial) > 300)) {
        setError('Peso deve estar entre 20 e 300 kg');
        return false;
      }

      if (profileData.altura && (Number.parseFloat(profileData.altura) < 0.5 || Number.parseFloat(profileData.altura) > 2.5)) {
        setError('Altura deve estar entre 0,5 e 2,5 metros');
        return false;
      }
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
      const changedData = {};
      Object.keys(profileData).forEach(key => {
        if (profileData[key] !== originalData[key] && profileData[key] !== '') {
          changedData[key] = profileData[key];
        }
      });

      if (Object.keys(changedData).length === 0) {
        setError('Nenhuma alteração detectada');
        setSaving(false);
        return;
      }

      await updateUserProfile(changedData);
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
      await changePassword({
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
    if (userType === 'admin') {
      navigate('/admin/dashboard');
    } else if (userType === 'medico') {
      navigate('/medico/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const getIcon = () => {
    if (userType === 'admin') return Shield;
    if (userType === 'medico') return Stethoscope;
    return Heart;
  };

  const getTitle = () => {
    if (userType === 'admin') return 'DialyHome Admin';
    if (userType === 'medico') return 'DialCare Médico';
    return 'DialyHome';
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

  const IconComponent = getIcon();

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
              <IconComponent size={22} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
              {getTitle()} - Meu Perfil
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
              Gerencie suas informações pessoais e segurança
            </p>
          </div>

          {/* Messages */}
          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

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
            <TabButton
              active={activeTab === 'personal'}
              onClick={() => setActiveTab('personal')}
              icon={User}
            >
              Dados Pessoais
            </TabButton>
            <TabButton
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
              icon={Lock}
            >
              Segurança
            </TabButton>
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
                  
                  <InputField
                    label="CPF"
                    icon={CreditCard}
                    name="cpf"
                    value={profileData.cpf}
                    onChange={handleCPFChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />

                  <InputField
                    label="Telefone"
                    icon={Phone}
                    name="telefone"
                    value={profileData.telefone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />

                  <InputField
                    label="Endereço"
                    icon={MapPin}
                    name="endereco"
                    value={profileData.endereco}
                    onChange={handleInputChange}
                    type="textarea"
                    placeholder="Rua, número, bairro, cidade, estado"
                    rows={3}
                  />

                  {/* Campos específicos de PACIENTE */}
                  {userType === 'paciente' && (
                    <>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem'
                      }}>
                        <InputField
                          label="Peso (kg)"
                          icon={Weight}
                          name="peso_inicial"
                          type="number"
                          value={profileData.peso_inicial}
                          onChange={handleInputChange}
                          placeholder="70.5"
                          step="0.1"
                          min="20"
                          max="300"
                        />

                        <InputField
                          label="Altura (m)"
                          icon={Ruler}
                          name="altura"
                          type="number"
                          value={profileData.altura}
                          onChange={handleInputChange}
                          placeholder="1.75"
                          step="0.01"
                          min="0.5"
                          max="2.5"
                        />
                      </div>

                      <InputField
                        label="Data Início do Tratamento"
                        icon={Calendar}
                        name="data_inicio_tratamento"
                        type="date"
                        value={profileData.data_inicio_tratamento}
                        onChange={handleInputChange}
                      />
                    </>
                  )}

                  {/* Campos específicos de MÉDICO */}
                  {userType === 'medico' && (
                    <>
                      <InputField
                        label="CRM"
                        icon={Stethoscope}
                        name="crm"
                        value={profileData.crm}
                        onChange={handleInputChange}
                        placeholder="CRM-12345/SC"
                      />

                      <InputField
                        label="Especialidade"
                        icon={Heart}
                        name="especialidade"
                        value={profileData.especialidade}
                        onChange={handleInputChange}
                        placeholder="Ex: Nefrologia"
                      />

                      <InputField
                        label="Telefone de Contato"
                        icon={Phone}
                        name="telefone_contato"
                        value={profileData.telefone_contato}
                        onChange={handleInputChange}
                        placeholder="(00) 00000-0000"
                      />

                      <InputField
                        label="Local de Atendimento"
                        icon={MapPin}
                        name="local_atendimento"
                        value={profileData.local_atendimento}
                        onChange={handleInputChange}
                        placeholder="Ex: Hospital Regional"
                      />
                    </>
                  )}

                  <SubmitButton saving={saving} icon={Save}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangePassword}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  <PasswordField
                    label="Senha Atual"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite sua senha atual"
                    showPassword={showCurrentPassword}
                    onTogglePassword={() => setShowCurrentPassword(!showCurrentPassword)}
                  />

                  <PasswordField
                    label="Nova Senha"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite sua nova senha (mín. 6 caracteres)"
                    showPassword={showNewPassword}
                    onTogglePassword={() => setShowNewPassword(!showNewPassword)}
                  />

                  <PasswordField
                    label="Confirmar Nova Senha"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirme sua nova senha"
                    showPassword={showConfirmPassword}
                    onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                  />

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

                  <SubmitButton saving={saving} icon={Lock}>
                    {saving ? 'Alterando...' : 'Alterar Senha'}
                  </SubmitButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;