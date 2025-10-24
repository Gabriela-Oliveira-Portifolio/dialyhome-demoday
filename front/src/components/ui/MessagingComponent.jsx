import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, X, User, Search, ChevronLeft,
  MoreVertical, Trash2, Check, CheckCheck, Clock
} from 'lucide-react';
import {
  sendMessage,
  getConversations,
  getMessages,
  getContactInfo
} from '../../services/messaging';

const MessagingComponent = ({ userRole }) => {
  const [showMessaging, setShowMessaging] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const messagesEndRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (showMessaging) {
      loadConversations();
      loadContacts();
    }
  }, [showMessaging]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.outro_usuario_id);
      // Polling para novas mensagens a cada 5 segundos
      const interval = setInterval(() => {
        loadMessages(selectedConversation.outro_usuario_id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Atualizar contador de não lidas
    const total = conversations.reduce((sum, conv) => sum + (conv.mensagens_nao_lidas || 0), 0);
    setUnreadCount(total);
  }, [conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    }
  };

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      console.log('🔍 Carregando contatos... userRole:', userRole);
      
      // Timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao carregar contatos')), 10000)
      );
      
      const dataPromise = getContactInfo();
      const data = await Promise.race([dataPromise, timeoutPromise]);
      
      console.log('✅ Dados recebidos:', data);
      
      if (userRole === 'medico') {
        setContacts(data.contacts || []);
        console.log('👨‍⚕️ Médico - Contatos:', data.contacts?.length || 0);
      } else {
        const contactArray = data.contact ? [data.contact] : [];
        setContacts(contactArray);
        console.log('👤 Paciente - Contato:', contactArray);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar contatos:', err);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadMessages = async (userId) => {
    try {
      const data = await getMessages(userId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);
    try {
      await sendMessage(
        selectedConversation.outro_usuario_id,
        null,
        newMessage
      );
      setNewMessage('');
      await loadMessages(selectedConversation.outro_usuario_id);
      await loadConversations();
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      alert('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewConversation = (contact) => {
    setSelectedConversation({
      outro_usuario_id: contact.id,
      nome: contact.nome
    });
    loadMessages(contact.id);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMessaging(!showMessaging);
        }}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageCircle size={28} color="white" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Messaging Window */}
      {showMessaging && (
        <div 
          style={{
            position: 'fixed',
            bottom: '6rem',
            right: '2rem',
            width: '400px',
            height: '600px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedConversation && (
                <button
                  onClick={() => setSelectedConversation(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex'
                  }}
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              <MessageCircle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                {selectedConversation ? selectedConversation.nome : 'Mensagens'}
              </h3>
            </div>
            <button
              onClick={() => setShowMessaging(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex'
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          {!selectedConversation ? (
            /* Conversations List */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Search */}
              <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={20} color="#6b7280" style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }} />
                  <input
                    type="text"
                    placeholder="Buscar conversa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* New Conversation Button (apenas para médicos) */}
              {userRole === 'medico' && contacts.length > 0 && (
                <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280', 
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    letterSpacing: '0.05em'
                  }}>
                    Nova Conversa
                  </p>
                  <select
                    onChange={(e) => {
                      const contact = contacts.find(c => c.id === parseInt(e.target.value));
                      if (contact) {
                        startNewConversation(contact);
                        e.target.value = ''; // Reset select
                      }
                    }}
                    value=""
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #14b8a6',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      outline: 'none',
                      background: 'white',
                      color: '#111827',
                      fontWeight: '500'
                    }}
                  >
                    <option value="">Selecione um paciente...</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.nome} {contact.idade ? `(${contact.idade} anos)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conversations */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredConversations.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    <MessageCircle size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ marginBottom: '1rem' }}>Nenhuma conversa ainda</p>
                    {userRole === 'paciente' && contacts.length > 0 ? (
                      <div>
                        <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                          Clique abaixo para iniciar uma conversa com seu médico
                        </p>
                        <button
                          onClick={() => startNewConversation(contacts[0])}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            margin: '0 auto'
                          }}
                        >
                          <MessageCircle size={18} />
                          Conversar com Dr(a). {contacts[0].nome}
                        </button>
                      </div>
                    ) : userRole === 'medico' && contacts.length > 0 ? (
                      <p style={{ fontSize: '0.875rem' }}>
                        Use o seletor acima para iniciar uma conversa com um paciente
                      </p>
                    ) : loadingContacts ? (
                      <div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          border: '3px solid #e5e7eb',
                          borderTop: '3px solid #14b8a6',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          margin: '0 auto 1rem'
                        }} />
                        <p style={{ fontSize: '0.875rem' }}>
                          Carregando contatos...
                        </p>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`}</style>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>
                        Erro ao carregar contatos. Tente recarregar a página.
                      </p>
                    )}
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <div
                      key={conv.outro_usuario_id}
                      onClick={() => setSelectedConversation(conv)}
                      style={{
                        padding: '1rem',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        background: conv.mensagens_nao_lidas > 0 ? '#f0fdf4' : 'white'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseOut={(e) => e.currentTarget.style.background = conv.mensagens_nao_lidas > 0 ? '#f0fdf4' : 'white'}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'start',
                        gap: '0.75rem'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '1rem',
                          flexShrink: 0
                        }}>
                          {conv.nome.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.25rem'
                          }}>
                            <p style={{
                              fontSize: '0.95rem',
                              fontWeight: conv.mensagens_nao_lidas > 0 ? '600' : '500',
                              margin: 0,
                              color: '#111827'
                            }}>
                              {conv.nome}
                            </p>
                            <span style={{
                              fontSize: '0.75rem',
                              color: '#6b7280'
                            }}>
                              {formatTime(conv.data_criacao)}
                            </span>
                          </div>
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {conv.remetente_id === parseInt(sessionStorage.getItem('userId')) ? 'Você: ' : ''}
                            {conv.mensagem}
                          </p>
                          {conv.mensagens_nao_lidas > 0 && (
                            <span style={{
                              marginTop: '0.25rem',
                              display: 'inline-block',
                              padding: '0.125rem 0.5rem',
                              background: '#10b981',
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {conv.mensagens_nao_lidas} nova{conv.mensagens_nao_lidas > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Chat View */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                background: '#f9fafb'
              }}>
                {messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: '#6b7280',
                    padding: '2rem'
                  }}>
                    <p>Nenhuma mensagem ainda</p>
                    <p style={{ fontSize: '0.875rem' }}>Envie a primeira mensagem!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn = msg.remetente_id === parseInt(sessionStorage.getItem('userId'));
                    const showDate = index === 0 || 
                      new Date(messages[index - 1].data_criacao).toDateString() !== 
                      new Date(msg.data_criacao).toDateString();

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div style={{
                            textAlign: 'center',
                            margin: '1rem 0',
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            {new Date(msg.data_criacao).toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long'
                            })}
                          </div>
                        )}
                        <div style={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{
                            maxWidth: '70%',
                            padding: '0.75rem',
                            borderRadius: isOwn ? '12px 12px 0 12px' : '12px 12px 12px 0',
                            background: isOwn 
                              ? 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)' 
                              : 'white',
                            color: isOwn ? 'white' : '#111827',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}>
                            {msg.assunto && (
                              <p style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                margin: '0 0 0.5rem 0',
                                opacity: 0.9
                              }}>
                                {msg.assunto}
                              </p>
                            )}
                            <p style={{
                              margin: 0,
                              fontSize: '0.875rem',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {msg.mensagem}
                            </p>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              justifyContent: 'flex-end',
                              marginTop: '0.25rem',
                              fontSize: '0.7rem',
                              opacity: 0.8
                            }}>
                              <span>
                                {new Date(msg.data_criacao).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isOwn && (
                                msg.lida ? <CheckCheck size={14} /> : <Check size={14} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: '1rem',
                borderTop: '1px solid #e5e7eb',
                background: 'white',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      outline: 'none',
                      resize: 'none',
                      minHeight: '44px',
                      maxHeight: '120px',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      overflowY: 'auto'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !newMessage.trim()}
                    style={{
                      width: '44px',
                      height: '44px',
                      flexShrink: 0,
                      borderRadius: '12px',
                      border: 'none',
                      background: loading || !newMessage.trim()
                        ? '#e5e7eb'
                        : 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
                      color: 'white',
                      cursor: loading || !newMessage.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (!loading && newMessage.trim()) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default MessagingComponent;
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   MessageCircle, Send, X, User, Search, ChevronLeft,
//   MoreVertical, Trash2, Check, CheckCheck, Clock
// } from 'lucide-react';
// import {
//   sendMessage,
//   getConversations,
//   getMessages,
//   getContactInfo
// } from '../../services/messaging';

// const MessagingComponent = ({ userRole }) => {
//   const [showMessaging, setShowMessaging] = useState(false);
//   const [conversations, setConversations] = useState([]);
//   const [selectedConversation, setSelectedConversation] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [contacts, setContacts] = useState([]);
//   const messagesEndRef = useRef(null);
//   const [unreadCount, setUnreadCount] = useState(0);

//   useEffect(() => {
//     if (showMessaging) {
//       loadConversations();
//       loadContacts();
//     }
//   }, [showMessaging]);

//   useEffect(() => {
//     if (selectedConversation) {
//       loadMessages(selectedConversation.outro_usuario_id);
//       // Polling para novas mensagens a cada 5 segundos
//       const interval = setInterval(() => {
//         loadMessages(selectedConversation.outro_usuario_id);
//       }, 5000);
//       return () => clearInterval(interval);
//     }
//   }, [selectedConversation]);

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     // Atualizar contador de não lidas
//     const total = conversations.reduce((sum, conv) => sum + (conv.mensagens_nao_lidas || 0), 0);
//     setUnreadCount(total);
//   }, [conversations]);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   const loadConversations = async () => {
//     try {
//       const data = await getConversations();
//       setConversations(data.conversations || []);
//     } catch (err) {
//       console.error('Erro ao carregar conversas:', err);
//     }
//   };

//   const loadContacts = async () => {
//     try {
//       const data = await getContactInfo();
//       if (userRole === 'medico') {
//         setContacts(data.contacts || []);
//       } else {
//         setContacts([data.contact]);
//       }
//     } catch (err) {
//       console.error('Erro ao carregar contatos:', err);
//     }
//   };

//   const loadMessages = async (userId) => {
//     try {
//       const data = await getMessages(userId);
//       setMessages(data.messages || []);
//     } catch (err) {
//       console.error('Erro ao carregar mensagens:', err);
//     }
//   };

//   const handleSendMessage = async () => {
//     if (!newMessage.trim() || !selectedConversation) return;

//     setLoading(true);
//     try {
//       await sendMessage(
//         selectedConversation.outro_usuario_id,
//         null,
//         newMessage
//       );
//       setNewMessage('');
//       await loadMessages(selectedConversation.outro_usuario_id);
//       await loadConversations();
//     } catch (err) {
//       console.error('Erro ao enviar mensagem:', err);
//       alert('Erro ao enviar mensagem');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSendMessage();
//     }
//   };

//   const startNewConversation = (contact) => {
//     setSelectedConversation({
//       outro_usuario_id: contact.id,
//       nome: contact.nome
//     });
//     loadMessages(contact.id);
//   };

//   const filteredConversations = conversations.filter(conv =>
//     conv.nome.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const formatTime = (date) => {
//     const d = new Date(date);
//     const now = new Date();
//     const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

//     if (diffDays === 0) {
//       return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
//     } else if (diffDays === 1) {
//       return 'Ontem';
//     } else if (diffDays < 7) {
//       return d.toLocaleDateString('pt-BR', { weekday: 'short' });
//     } else {
//       return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
//     }
//   };

//   return (
//     <>
//       {/* Floating Button */}
//       <button
//         onClick={(e) => {
//           e.stopPropagation();
//           setShowMessaging(!showMessaging);
//         }}
//         style={{
//           position: 'fixed',
//           bottom: '2rem',
//           right: '2rem',
//           width: '60px',
//           height: '60px',
//           borderRadius: '50%',
//           background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
//           border: 'none',
//           boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
//           cursor: 'pointer',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           zIndex: 999,
//           transition: 'transform 0.2s'
//         }}
//         onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
//         onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
//       >
//         <MessageCircle size={28} color="white" />
//         {unreadCount > 0 && (
//           <span style={{
//             position: 'absolute',
//             top: '-5px',
//             right: '-5px',
//             background: '#ef4444',
//             color: 'white',
//             borderRadius: '50%',
//             width: '24px',
//             height: '24px',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             fontSize: '12px',
//             fontWeight: '700'
//           }}>
//             {unreadCount > 9 ? '9+' : unreadCount}
//           </span>
//         )}
//       </button>

//       {/* Messaging Window */}
//       {showMessaging && (
//         <div 
//           style={{
//             position: 'fixed',
//             bottom: '6rem',
//             right: '2rem',
//             width: '400px',
//             height: '600px',
//             background: 'white',
//             borderRadius: '16px',
//             boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
//             zIndex: 1000,
//             display: 'flex',
//             flexDirection: 'column',
//             overflow: 'hidden'
//           }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           {/* Header */}
//           <div style={{
//             padding: '1rem',
//             background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
//             color: 'white',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'space-between'
//           }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//               {selectedConversation && (
//                 <button
//                   onClick={() => setSelectedConversation(null)}
//                   style={{
//                     background: 'transparent',
//                     border: 'none',
//                     color: 'white',
//                     cursor: 'pointer',
//                     padding: '0.25rem',
//                     display: 'flex'
//                   }}
//                 >
//                   <ChevronLeft size={24} />
//                 </button>
//               )}
//               <MessageCircle size={24} />
//               <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
//                 {selectedConversation ? selectedConversation.nome : 'Mensagens'}
//               </h3>
//             </div>
//             <button
//               onClick={() => setShowMessaging(false)}
//               style={{
//                 background: 'transparent',
//                 border: 'none',
//                 color: 'white',
//                 cursor: 'pointer',
//                 padding: '0.25rem',
//                 display: 'flex'
//               }}
//             >
//               <X size={24} />
//             </button>
//           </div>

//           {/* Content */}
//           {!selectedConversation ? (
//             /* Conversations List */
//             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
//               {/* Search */}
//               <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
//                 <div style={{ position: 'relative' }}>
//                   <Search size={20} color="#6b7280" style={{
//                     position: 'absolute',
//                     left: '0.75rem',
//                     top: '50%',
//                     transform: 'translateY(-50%)'
//                   }} />
//                   <input
//                     type="text"
//                     placeholder="Buscar conversa..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     style={{
//                       width: '100%',
//                       padding: '0.5rem 0.75rem 0.5rem 2.5rem',
//                       border: '1px solid #e5e7eb',
//                       borderRadius: '8px',
//                       fontSize: '0.875rem',
//                       outline: 'none'
//                     }}
//                   />
//                 </div>
//               </div>

//               {/* New Conversation Button (apenas para médicos) */}
//               {userRole === 'medico' && contacts.length > 0 && (
//                 <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
//                   <p style={{ 
//                     fontSize: '0.75rem', 
//                     color: '#6b7280', 
//                     marginBottom: '0.5rem',
//                     textTransform: 'uppercase',
//                     fontWeight: '600',
//                     letterSpacing: '0.05em'
//                   }}>
//                     Nova Conversa
//                   </p>
//                   <select
//                     onChange={(e) => {
//                       const contact = contacts.find(c => c.id === parseInt(e.target.value));
//                       if (contact) {
//                         startNewConversation(contact);
//                         e.target.value = ''; // Reset select
//                       }
//                     }}
//                     value=""
//                     style={{
//                       width: '100%',
//                       padding: '0.75rem',
//                       border: '2px solid #14b8a6',
//                       borderRadius: '8px',
//                       fontSize: '0.875rem',
//                       cursor: 'pointer',
//                       outline: 'none',
//                       background: 'white',
//                       color: '#111827',
//                       fontWeight: '500'
//                     }}
//                   >
//                     <option value="">Selecione um paciente...</option>
//                     {contacts.map(contact => (
//                       <option key={contact.id} value={contact.id}>
//                         {contact.nome} {contact.idade ? `(${contact.idade} anos)` : ''}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               )}

//               {/* Conversations */}
//               <div style={{ flex: 1, overflowY: 'auto' }}>
//                 {filteredConversations.length === 0 ? (
//                   <div style={{
//                     padding: '2rem',
//                     textAlign: 'center',
//                     color: '#6b7280'
//                   }}>
//                     <MessageCircle size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
//                     <p style={{ marginBottom: '1rem' }}>Nenhuma conversa ainda</p>
//                     {userRole === 'paciente' && contacts.length > 0 ? (
//                       <div>
//                         <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
//                           Clique abaixo para iniciar uma conversa com seu médico
//                         </p>
//                         <button
//                           onClick={() => startNewConversation(contacts[0])}
//                           style={{
//                             padding: '0.75rem 1.5rem',
//                             background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
//                             color: 'white',
//                             border: 'none',
//                             borderRadius: '8px',
//                             cursor: 'pointer',
//                             fontSize: '0.875rem',
//                             fontWeight: '600',
//                             display: 'flex',
//                             alignItems: 'center',
//                             gap: '0.5rem',
//                             margin: '0 auto'
//                           }}
//                         >
//                           <MessageCircle size={18} />
//                           Conversar com Dr(a). {contacts[0].nome}
//                         </button>
//                       </div>
//                     ) : userRole === 'medico' && contacts.length > 0 ? (
//                       <p style={{ fontSize: '0.875rem' }}>
//                         Use o seletor acima para iniciar uma conversa com um paciente
//                       </p>
//                     ) : (
//                       <p style={{ fontSize: '0.875rem' }}>
//                         Carregando contatos...
//                       </p>
//                     )}
//                   </div>
//                 ) : (
//                   filteredConversations.map(conv => (
//                     <div
//                       key={conv.outro_usuario_id}
//                       onClick={() => setSelectedConversation(conv)}
//                       style={{
//                         padding: '1rem',
//                         borderBottom: '1px solid #f3f4f6',
//                         cursor: 'pointer',
//                         transition: 'background 0.2s',
//                         background: conv.mensagens_nao_lidas > 0 ? '#f0fdf4' : 'white'
//                       }}
//                       onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
//                       onMouseOut={(e) => e.currentTarget.style.background = conv.mensagens_nao_lidas > 0 ? '#f0fdf4' : 'white'}
//                     >
//                       <div style={{
//                         display: 'flex',
//                         alignItems: 'start',
//                         gap: '0.75rem'
//                       }}>
//                         <div style={{
//                           width: '40px',
//                           height: '40px',
//                           borderRadius: '50%',
//                           background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           color: 'white',
//                           fontWeight: '600',
//                           fontSize: '1rem',
//                           flexShrink: 0
//                         }}>
//                           {conv.nome.charAt(0).toUpperCase()}
//                         </div>
//                         <div style={{ flex: 1, minWidth: 0 }}>
//                           <div style={{
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                             marginBottom: '0.25rem'
//                           }}>
//                             <p style={{
//                               fontSize: '0.95rem',
//                               fontWeight: conv.mensagens_nao_lidas > 0 ? '600' : '500',
//                               margin: 0,
//                               color: '#111827'
//                             }}>
//                               {conv.nome}
//                             </p>
//                             <span style={{
//                               fontSize: '0.75rem',
//                               color: '#6b7280'
//                             }}>
//                               {formatTime(conv.data_criacao)}
//                             </span>
//                           </div>
//                           <p style={{
//                             fontSize: '0.875rem',
//                             color: '#6b7280',
//                             margin: 0,
//                             overflow: 'hidden',
//                             textOverflow: 'ellipsis',
//                             whiteSpace: 'nowrap'
//                           }}>
//                             {conv.remetente_id === parseInt(sessionStorage.getItem('userId')) ? 'Você: ' : ''}
//                             {conv.mensagem}
//                           </p>
//                           {conv.mensagens_nao_lidas > 0 && (
//                             <span style={{
//                               marginTop: '0.25rem',
//                               display: 'inline-block',
//                               padding: '0.125rem 0.5rem',
//                               background: '#10b981',
//                               color: 'white',
//                               borderRadius: '12px',
//                               fontSize: '0.75rem',
//                               fontWeight: '600'
//                             }}>
//                               {conv.mensagens_nao_lidas} nova{conv.mensagens_nao_lidas > 1 ? 's' : ''}
//                             </span>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </div>
//           ) : (
//             /* Chat View */
//             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
//               {/* Messages */}
//               <div style={{
//                 flex: 1,
//                 overflowY: 'auto',
//                 padding: '1rem',
//                 background: '#f9fafb'
//               }}>
//                 {messages.length === 0 ? (
//                   <div style={{
//                     textAlign: 'center',
//                     color: '#6b7280',
//                     padding: '2rem'
//                   }}>
//                     <p>Nenhuma mensagem ainda</p>
//                     <p style={{ fontSize: '0.875rem' }}>Envie a primeira mensagem!</p>
//                   </div>
//                 ) : (
//                   messages.map((msg, index) => {
//                     const isOwn = msg.remetente_id === parseInt(sessionStorage.getItem('userId'));
//                     const showDate = index === 0 || 
//                       new Date(messages[index - 1].data_criacao).toDateString() !== 
//                       new Date(msg.data_criacao).toDateString();

//                     return (
//                       <div key={msg.id}>
//                         {showDate && (
//                           <div style={{
//                             textAlign: 'center',
//                             margin: '1rem 0',
//                             fontSize: '0.75rem',
//                             color: '#6b7280'
//                           }}>
//                             {new Date(msg.data_criacao).toLocaleDateString('pt-BR', {
//                               weekday: 'long',
//                               day: 'numeric',
//                               month: 'long'
//                             })}
//                           </div>
//                         )}
//                         <div style={{
//                           display: 'flex',
//                           justifyContent: isOwn ? 'flex-end' : 'flex-start',
//                           marginBottom: '0.5rem'
//                         }}>
//                           <div style={{
//                             maxWidth: '70%',
//                             padding: '0.75rem',
//                             borderRadius: isOwn ? '12px 12px 0 12px' : '12px 12px 12px 0',
//                             background: isOwn 
//                               ? 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)' 
//                               : 'white',
//                             color: isOwn ? 'white' : '#111827',
//                             boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
//                           }}>
//                             {msg.assunto && (
//                               <p style={{
//                                 fontSize: '0.75rem',
//                                 fontWeight: '600',
//                                 margin: '0 0 0.5rem 0',
//                                 opacity: 0.9
//                               }}>
//                                 {msg.assunto}
//                               </p>
//                             )}
//                             <p style={{
//                               margin: 0,
//                               fontSize: '0.875rem',
//                               lineHeight: '1.5',
//                               whiteSpace: 'pre-wrap',
//                               wordBreak: 'break-word'
//                             }}>
//                               {msg.mensagem}
//                             </p>
//                             <div style={{
//                               display: 'flex',
//                               alignItems: 'center',
//                               gap: '0.25rem',
//                               justifyContent: 'flex-end',
//                               marginTop: '0.25rem',
//                               fontSize: '0.7rem',
//                               opacity: 0.8
//                             }}>
//                               <span>
//                                 {new Date(msg.data_criacao).toLocaleTimeString('pt-BR', {
//                                   hour: '2-digit',
//                                   minute: '2-digit'
//                                 })}
//                               </span>
//                               {isOwn && (
//                                 msg.lida ? <CheckCheck size={14} /> : <Check size={14} />
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })
//                 )}
//                 <div ref={messagesEndRef} />
//               </div>

//               {/* Input */}
//               <div style={{
//                 padding: '1rem',
//                 borderTop: '1px solid #e5e7eb',
//                 background: 'white',
//                 flexShrink: 0
//               }}>
//                 <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
//                   <textarea
//                     value={newMessage}
//                     onChange={(e) => {
//                       setNewMessage(e.target.value);
//                       // Auto-resize
//                       e.target.style.height = 'auto';
//                       e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
//                     }}
//                     onKeyPress={handleKeyPress}
//                     placeholder="Digite sua mensagem..."
//                     disabled={loading}
//                     style={{
//                       flex: 1,
//                       padding: '0.75rem',
//                       border: '2px solid #e5e7eb',
//                       borderRadius: '12px',
//                       fontSize: '0.875rem',
//                       outline: 'none',
//                       resize: 'none',
//                       minHeight: '44px',
//                       maxHeight: '120px',
//                       fontFamily: 'inherit',
//                       lineHeight: '1.5',
//                       overflowY: 'auto'
//                     }}
//                   />
//                   <button
//                     onClick={handleSendMessage}
//                     disabled={loading || !newMessage.trim()}
//                     style={{
//                       width: '44px',
//                       height: '44px',
//                       flexShrink: 0,
//                       borderRadius: '12px',
//                       border: 'none',
//                       background: loading || !newMessage.trim()
//                         ? '#e5e7eb'
//                         : 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
//                       color: 'white',
//                       cursor: loading || !newMessage.trim() ? 'not-allowed' : 'pointer',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       transition: 'transform 0.2s'
//                     }}
//                     onMouseOver={(e) => {
//                       if (!loading && newMessage.trim()) {
//                         e.currentTarget.style.transform = 'scale(1.05)';
//                       }
//                     }}
//                     onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
//                   >
//                     <Send size={20} />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </>
//   );
// };

// export default MessagingComponent;



// // import React, { useState, useEffect, useRef } from 'react';
// // import {
// //   MessageCircle, Send, X, User, Search, ChevronLeft,
// //   MoreVertical, Trash2, Check, CheckCheck, Clock
// // } from 'lucide-react';
// // import {
// //   sendMessage,
// //   getConversations,
// //   getMessages,
// //   getContactInfo
// // } from '../../services/messaging';

// // const MessagingComponent = ({ userRole }) => {
// //   const [showMessaging, setShowMessaging] = useState(false);
// //   const [conversations, setConversations] = useState([]);
// //   const [selectedConversation, setSelectedConversation] = useState(null);
// //   const [messages, setMessages] = useState([]);
// //   const [newMessage, setNewMessage] = useState('');
// //   const [loading, setLoading] = useState(false);
// //   const [searchTerm, setSearchTerm] = useState('');
// //   const [contacts, setContacts] = useState([]);
// //   const messagesEndRef = useRef(null);
// //   const [unreadCount, setUnreadCount] = useState(0);

// //   useEffect(() => {
// //     if (showMessaging) {
// //       loadConversations();
// //       loadContacts();
// //     }
// //   }, [showMessaging]);

// //   useEffect(() => {
// //     if (selectedConversation) {
// //       loadMessages(selectedConversation.outro_usuario_id);
// //       // Polling para novas mensagens a cada 5 segundos
// //       const interval = setInterval(() => {
// //         loadMessages(selectedConversation.outro_usuario_id);
// //       }, 5000);
// //       return () => clearInterval(interval);
// //     }
// //   }, [selectedConversation]);

// //   useEffect(() => {
// //     scrollToBottom();
// //   }, [messages]);

// //   useEffect(() => {
// //     // Atualizar contador de não lidas
// //     const total = conversations.reduce((sum, conv) => sum + (conv.mensagens_nao_lidas || 0), 0);
// //     setUnreadCount(total);
// //   }, [conversations]);

// //   const scrollToBottom = () => {
// //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
// //   };

// //   const loadConversations = async () => {
// //     try {
// //       const data = await getConversations();
// //       setConversations(data.conversations || []);
// //     } catch (err) {
// //       console.error('Erro ao carregar conversas:', err);
// //     }
// //   };

// //   const loadContacts = async () => {
// //     try {
// //       const data = await getContactInfo();
// //       if (userRole === 'medico') {
// //         setContacts(data.contacts || []);
// //       } else {
// //         setContacts([data.contact]);
// //       }
// //     } catch (err) {
// //       console.error('Erro ao carregar contatos:', err);
// //     }
// //   };

// //   const loadMessages = async (userId) => {
// //     try {
// //       const data = await getMessages(userId);
// //       setMessages(data.messages || []);
// //     } catch (err) {
// //       console.error('Erro ao carregar mensagens:', err);
// //     }
// //   };

// //   const handleSendMessage = async () => {
// //     if (!newMessage.trim() || !selectedConversation) return;

// //     setLoading(true);
// //     try {
// //       await sendMessage(
// //         selectedConversation.outro_usuario_id,
// //         null,
// //         newMessage
// //       );
// //       setNewMessage('');
// //       await loadMessages(selectedConversation.outro_usuario_id);
// //       await loadConversations();
// //     } catch (err) {
// //       console.error('Erro ao enviar mensagem:', err);
// //       alert('Erro ao enviar mensagem');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleKeyPress = (e) => {
// //     if (e.key === 'Enter' && !e.shiftKey) {
// //       e.preventDefault();
// //       handleSendMessage();
// //     }
// //   };

// //   const startNewConversation = (contact) => {
// //     setSelectedConversation({
// //       outro_usuario_id: contact.id,
// //       nome: contact.nome,
// //       role: contact.role
// //     });
// //     loadMessages(contact.id);
// //   };

// //   const filteredConversations = conversations.filter(conv =>
// //     conv.nome.toLowerCase().includes(searchTerm.toLowerCase())
// //   );

// //   const formatTime = (date) => {
// //     const d = new Date(date);
// //     const now = new Date();
// //     const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

// //     if (diffDays === 0) {
// //       return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
// //     } else if (diffDays === 1) {
// //       return 'Ontem';
// //     } else if (diffDays < 7) {
// //       return d.toLocaleDateString('pt-BR', { weekday: 'short' });
// //     } else {
// //       return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
// //     }
// //   };

// //   return (
// //     <>
// //       {/* Floating Button */}
// //       <button
// //         onClick={(e) => {
// //           e.stopPropagation();
// //           setShowMessaging(!showMessaging);
// //         }}
// //         style={{
// //           position: 'fixed',
// //           bottom: '2rem',
// //           right: '2rem',
// //           width: '60px',
// //           height: '60px',
// //           borderRadius: '50%',
// //           background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
// //           border: 'none',
// //           boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
// //           cursor: 'pointer',
// //           display: 'flex',
// //           alignItems: 'center',
// //           justifyContent: 'center',
// //           zIndex: 999,
// //           transition: 'transform 0.2s'
// //         }}
// //         onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
// //         onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
// //       >
// //         <MessageCircle size={28} color="white" />
// //         {unreadCount > 0 && (
// //           <span style={{
// //             position: 'absolute',
// //             top: '-5px',
// //             right: '-5px',
// //             background: '#ef4444',
// //             color: 'white',
// //             borderRadius: '50%',
// //             width: '24px',
// //             height: '24px',
// //             display: 'flex',
// //             alignItems: 'center',
// //             justifyContent: 'center',
// //             fontSize: '12px',
// //             fontWeight: '700'
// //           }}>
// //             {unreadCount > 9 ? '9+' : unreadCount}
// //           </span>
// //         )}
// //       </button>

// //       {/* Messaging Window */}
// //       {showMessaging && (
// //         <div style={{
// //           position: 'fixed',
// //           bottom: '6rem',
// //           right: '2rem',
// //           width: '400px',
// //           height: '600px',
// //           background: 'white',
// //           borderRadius: '16px',
// //           boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
// //           zIndex: 1000,
// //           display: 'flex',
// //           flexDirection: 'column',
// //           overflow: 'hidden'
// //         }}>
// //           {/* Header */}
// //           <div style={{
// //             padding: '1rem',
// //             background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
// //             color: 'white',
// //             display: 'flex',
// //             alignItems: 'center',
// //             justifyContent: 'space-between'
// //           }}>
// //             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
// //               {selectedConversation && (
// //                 <button
// //                   onClick={() => setSelectedConversation(null)}
// //                   style={{
// //                     background: 'transparent',
// //                     border: 'none',
// //                     color: 'white',
// //                     cursor: 'pointer',
// //                     padding: '0.25rem',
// //                     display: 'flex'
// //                   }}
// //                 >
// //                   <ChevronLeft size={24} />
// //                 </button>
// //               )}
// //               <MessageCircle size={24} />
// //               <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
// //                 {selectedConversation ? selectedConversation.nome : 'Mensagens'}
// //               </h3>
// //             </div>
// //             <button
// //               onClick={() => setShowMessaging(false)}
// //               style={{
// //                 background: 'transparent',
// //                 border: 'none',
// //                 color: 'white',
// //                 cursor: 'pointer',
// //                 padding: '0.25rem',
// //                 display: 'flex'
// //               }}
// //             >
// //               <X size={24} />
// //             </button>
// //           </div>

// //           {/* Content */}
// //           {!selectedConversation ? (
// //             /* Conversations List */
// //             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// //               {/* Search */}
// //               <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
// //                 <div style={{ position: 'relative' }}>
// //                   <Search size={20} color="#6b7280" style={{
// //                     position: 'absolute',
// //                     left: '0.75rem',
// //                     top: '50%',
// //                     transform: 'translateY(-50%)'
// //                   }} />
// //                   <input
// //                     type="text"
// //                     placeholder="Buscar conversa..."
// //                     value={searchTerm}
// //                     onChange={(e) => setSearchTerm(e.target.value)}
// //                     style={{
// //                       width: '100%',
// //                       padding: '0.5rem 0.75rem 0.5rem 2.5rem',
// //                       border: '1px solid #e5e7eb',
// //                       borderRadius: '8px',
// //                       fontSize: '0.875rem',
// //                       outline: 'none'
// //                     }}
// //                   />
// //                 </div>
// //               </div>

// //               {/* New Conversation Button (apenas para médicos) */}
// //               {userRole === 'medico' && contacts.length > 0 && (
// //                 <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
// //                   <select
// //                     onChange={(e) => {
// //                       const contact = contacts.find(c => c.id === parseInt(e.target.value));
// //                       if (contact) startNewConversation(contact);
// //                     }}
// //                     style={{
// //                       width: '100%',
// //                       padding: '0.5rem',
// //                       border: '1px solid #e5e7eb',
// //                       borderRadius: '8px',
// //                       fontSize: '0.875rem',
// //                       cursor: 'pointer'
// //                     }}
// //                   >
// //                     <option value="">Nova conversa com...</option>
// //                     {contacts.map(contact => (
// //                       <option key={contact.id} value={contact.id}>
// //                         {contact.nome}
// //                       </option>
// //                     ))}
// //                   </select>
// //                 </div>
// //               )}

// //               {/* Conversations */}
// //               <div style={{ flex: 1, overflowY: 'auto' }}>
// //                 {filteredConversations.length === 0 ? (
// //                   <div style={{
// //                     padding: '2rem',
// //                     textAlign: 'center',
// //                     color: '#6b7280'
// //                   }}>
// //                     <MessageCircle size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
// //                     <p>Nenhuma conversa ainda</p>
// //                     {userRole === 'paciente' && contacts.length > 0 && (
// //                       <button
// //                         onClick={() => startNewConversation(contacts[0])}
// //                         style={{
// //                           marginTop: '1rem',
// //                           padding: '0.5rem 1rem',
// //                           background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
// //                           color: 'white',
// //                           border: 'none',
// //                           borderRadius: '8px',
// //                           cursor: 'pointer',
// //                           fontSize: '0.875rem',
// //                           fontWeight: '600'
// //                         }}
// //                       >
// //                         Iniciar conversa com seu médico
// //                       </button>
// //                     )}
// //                   </div>
// //                 ) : (
// //                   filteredConversations.map(conv => (
// //                     <div
// //                       key={conv.outro_usuario_id}
// //                       onClick={() => setSelectedConversation(conv)}
// //                       style={{
// //                         padding: '1rem',
// //                         borderBottom: '1px solid #f3f4f6',
// //                         cursor: 'pointer',
// //                         transition: 'background 0.2s',
// //                         background: conv.mensagens_nao_lidas > 0 ? '#f0fdf4' : 'white'
// //                       }}
// //                       onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
// //                       onMouseOut={(e) => e.currentTarget.style.background = conv.mensagens_nao_lidas > 0 ? '#f0fdf4' : 'white'}
// //                     >
// //                       <div style={{
// //                         display: 'flex',
// //                         alignItems: 'start',
// //                         gap: '0.75rem'
// //                       }}>
// //                         <div style={{
// //                           width: '40px',
// //                           height: '40px',
// //                           borderRadius: '50%',
// //                           background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
// //                           display: 'flex',
// //                           alignItems: 'center',
// //                           justifyContent: 'center',
// //                           color: 'white',
// //                           fontWeight: '600',
// //                           fontSize: '1rem',
// //                           flexShrink: 0
// //                         }}>
// //                           {conv.nome.charAt(0).toUpperCase()}
// //                         </div>
// //                         <div style={{ flex: 1, minWidth: 0 }}>
// //                           <div style={{
// //                             display: 'flex',
// //                             justifyContent: 'space-between',
// //                             alignItems: 'center',
// //                             marginBottom: '0.25rem'
// //                           }}>
// //                             <p style={{
// //                               fontSize: '0.95rem',
// //                               fontWeight: conv.mensagens_nao_lidas > 0 ? '600' : '500',
// //                               margin: 0,
// //                               color: '#111827'
// //                             }}>
// //                               {conv.nome}
// //                             </p>
// //                             <span style={{
// //                               fontSize: '0.75rem',
// //                               color: '#6b7280'
// //                             }}>
// //                               {formatTime(conv.data_criacao)}
// //                             </span>
// //                           </div>
// //                           <p style={{
// //                             fontSize: '0.875rem',
// //                             color: '#6b7280',
// //                             margin: 0,
// //                             overflow: 'hidden',
// //                             textOverflow: 'ellipsis',
// //                             whiteSpace: 'nowrap'
// //                           }}>
// //                             {conv.remetente_id === parseInt(sessionStorage.getItem('userId')) ? 'Você: ' : ''}
// //                             {conv.mensagem}
// //                           </p>
// //                           {conv.mensagens_nao_lidas > 0 && (
// //                             <span style={{
// //                               marginTop: '0.25rem',
// //                               display: 'inline-block',
// //                               padding: '0.125rem 0.5rem',
// //                               background: '#10b981',
// //                               color: 'white',
// //                               borderRadius: '12px',
// //                               fontSize: '0.75rem',
// //                               fontWeight: '600'
// //                             }}>
// //                               {conv.mensagens_nao_lidas} nova{conv.mensagens_nao_lidas > 1 ? 's' : ''}
// //                             </span>
// //                           )}
// //                         </div>
// //                       </div>
// //                     </div>
// //                   ))
// //                 )}
// //               </div>
// //             </div>
// //           ) : (
// //             /* Chat View */
// //             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// //               {/* Messages */}
// //               <div style={{
// //                 flex: 1,
// //                 overflowY: 'auto',
// //                 padding: '1rem',
// //                 background: '#f9fafb'
// //               }}>
// //                 {messages.length === 0 ? (
// //                   <div style={{
// //                     textAlign: 'center',
// //                     color: '#6b7280',
// //                     padding: '2rem'
// //                   }}>
// //                     <p>Nenhuma mensagem ainda</p>
// //                     <p style={{ fontSize: '0.875rem' }}>Envie a primeira mensagem!</p>
// //                   </div>
// //                 ) : (
// //                   messages.map((msg, index) => {
// //                     const isOwn = msg.remetente_id === parseInt(sessionStorage.getItem('userId'));
// //                     const showDate = index === 0 || 
// //                       new Date(messages[index - 1].data_criacao).toDateString() !== 
// //                       new Date(msg.data_criacao).toDateString();

// //                     return (
// //                       <div key={msg.id}>
// //                         {showDate && (
// //                           <div style={{
// //                             textAlign: 'center',
// //                             margin: '1rem 0',
// //                             fontSize: '0.75rem',
// //                             color: '#6b7280'
// //                           }}>
// //                             {new Date(msg.data_criacao).toLocaleDateString('pt-BR', {
// //                               weekday: 'long',
// //                               day: 'numeric',
// //                               month: 'long'
// //                             })}
// //                           </div>
// //                         )}
// //                         <div style={{
// //                           display: 'flex',
// //                           justifyContent: isOwn ? 'flex-end' : 'flex-start',
// //                           marginBottom: '0.5rem'
// //                         }}>
// //                           <div style={{
// //                             maxWidth: '70%',
// //                             padding: '0.75rem',
// //                             borderRadius: isOwn ? '12px 12px 0 12px' : '12px 12px 12px 0',
// //                             background: isOwn 
// //                               ? 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)' 
// //                               : 'white',
// //                             color: isOwn ? 'white' : '#111827',
// //                             boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
// //                           }}>
// //                             {msg.assunto && (
// //                               <p style={{
// //                                 fontSize: '0.75rem',
// //                                 fontWeight: '600',
// //                                 margin: '0 0 0.5rem 0',
// //                                 opacity: 0.9
// //                               }}>
// //                                 {msg.assunto}
// //                               </p>
// //                             )}
// //                             <p style={{
// //                               margin: 0,
// //                               fontSize: '0.875rem',
// //                               lineHeight: '1.5',
// //                               whiteSpace: 'pre-wrap',
// //                               wordBreak: 'break-word'
// //                             }}>
// //                               {msg.mensagem}
// //                             </p>
// //                             <div style={{
// //                               display: 'flex',
// //                               alignItems: 'center',
// //                               gap: '0.25rem',
// //                               justifyContent: 'flex-end',
// //                               marginTop: '0.25rem',
// //                               fontSize: '0.7rem',
// //                               opacity: 0.8
// //                             }}>
// //                               <span>
// //                                 {new Date(msg.data_criacao).toLocaleTimeString('pt-BR', {
// //                                   hour: '2-digit',
// //                                   minute: '2-digit'
// //                                 })}
// //                               </span>
// //                               {isOwn && (
// //                                 msg.lida ? <CheckCheck size={14} /> : <Check size={14} />
// //                               )}
// //                             </div>
// //                           </div>
// //                         </div>
// //                       </div>
// //                     );
// //                   })
// //                 )}
// //                 <div ref={messagesEndRef} />
// //               </div>

// //               {/* Input */}
// //               <div style={{
// //                 padding: '1rem',
// //                 borderTop: '1px solid #e5e7eb',
// //                 background: 'white'
// //               }}>
// //                 <div style={{ display: 'flex', gap: '0.5rem' }}>
// //                   <textarea
// //                     value={newMessage}
// //                     onChange={(e) => setNewMessage(e.target.value)}
// //                     onKeyPress={handleKeyPress}
// //                     placeholder="Digite sua mensagem..."
// //                     disabled={loading}
// //                     style={{
// //                       flex: 1,
// //                       padding: '0.75rem',
// //                       border: '1px solid #e5e7eb',
// //                       borderRadius: '12px',
// //                       fontSize: '0.875rem',
// //                       outline: 'none',
// //                       resize: 'none',
// //                       minHeight: '44px',
// //                       maxHeight: '120px'
// //                     }}
// //                     rows={1}
// //                   />
// //                   <button
// //                     onClick={handleSendMessage}
// //                     disabled={loading || !newMessage.trim()}
// //                     style={{
// //                       width: '44px',
// //                       height: '44px',
// //                       borderRadius: '12px',
// //                       border: 'none',
// //                       background: loading || !newMessage.trim()
// //                         ? '#e5e7eb'
// //                         : 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
// //                       color: 'white',
// //                       cursor: loading || !newMessage.trim() ? 'not-allowed' : 'pointer',
// //                       display: 'flex',
// //                       alignItems: 'center',
// //                       justifyContent: 'center',
// //                       transition: 'transform 0.2s'
// //                     }}
// //                     onMouseOver={(e) => {
// //                       if (!loading && newMessage.trim()) {
// //                         e.currentTarget.style.transform = 'scale(1.05)';
// //                       }
// //                     }}
// //                     onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
// //                   >
// //                     <Send size={20} />
// //                   </button>
// //                 </div>
// //               </div>
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </>
// //   );
// // };

// // export default MessagingComponent;
// // // import React, { useState, useEffect, useRef } from 'react';
// // // import {
// // //   MessageCircle, Send, X, User, Search, ChevronLeft,
// // //   MoreVertical, Trash2, Check, CheckCheck, Clock
// // // } from 'lucide-react';
// // // import {
// // //   sendMessage,
// // //   getConversations,
// // //   getMessages,
// // //   getContactInfo
// // // } from '../../services/messaging';

// // // const MessagingComponent = ({ userRole }) => {
// // //   const [showMessaging, setShowMessaging] = useState(false);
// // //   const [conversations, setConversations] = useState([]);
// // //   const [selectedConversation, setSelectedConversation] = useState(null);
// // //   const [messages, setMessages] = useState([]);
// // //   const [newMessage, setNewMessage] = useState('');
// // //   const [loading, setLoading] = useState(false);
// // //   const [searchTerm, setSearchTerm] = useState('');
// // //   const [contacts, setContacts] = useState([]);
// // //   const messagesEndRef = useRef(null);
// // //   const [unreadCount, setUnreadCount] = useState(0);

// // //   useEffect(() => {
// // //     if (showMessaging) {
// // //       loadConversations();
// // //       loadContacts();
// // //     }
// // //   }, [showMessaging]);

// // //   useEffect(() => {
// // //     if (selectedConversation) {
// // //       loadMessages(selectedConversation.outro_usuario_id);
// // //       // Polling para novas mensagens a cada 5 segundos
// // //       const interval = setInterval(() => {
// // //         loadMessages(selectedConversation.outro_usuario_id);
// // //       }, 5000);
// // //       return () => clearInterval(interval);
// // //     }
// // //   }, [selectedConversation]);

// // //   useEffect(() => {
// // //     scrollToBottom();
// // //   }, [messages]);

// // //   useEffect(() => {
// // //     // Atualizar contador de não lidas
// // //     const total = conversations.reduce((sum, conv) => sum + (conv.mensagens_nao_lidas || 0), 0);
// // //     setUnreadCount(total);
// // //   }, [conversations]);

// // //   const scrollToBottom = () => {
// // //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
// // //   };

// // //   const loadConversations = async () => {
// // //     try {
// // //       const data = await getConversations();
// // //       setConversations(data.conversations || []);
// // //     } catch (err) {
// // //       console.error('Erro ao carregar conversas:', err);
// // //     }
// // //   };

// // //   const loadContacts = async () => {
// // //     try {
// // //       const data = await getContactInfo();
// // //       if (userRole === 'medico') {
// // //         setContacts(data.contacts || []);
// // //       } else {
// // //         setContacts([data.contact]);
// // //       }
// // //     } catch (err) {
// // //       console.error('Erro ao carregar contatos:', err);
// // //     }
// // //   };

// // //   const loadMessages = async (userId) => {
// // //     try {
// // //       const data = await getMessages(userId);
// // //       setMessages(data.messages || []);
// // //     } catch (err) {
// // //       console.error('Erro ao carregar mensagens:', err);
// // //     }
// // //   };

// // //   const handleSendMessage = async () => {
// // //     if (!newMessage.trim() || !selectedConversation) return;

// // //     setLoading(true);
// // //     try {
// // //       await sendMessage(
// // //         selectedConversation.outro_usuario_id,
// // //         null,
// // //         newMessage
// // //       );
// // //       setNewMessage('');
// // //       await loadMessages(selectedConversation.outro_usuario_id);
// // //       await loadConversations();
// // //     } catch (err) {
// // //       console.error('Erro ao enviar mensagem:', err);
// // //       alert('Erro ao enviar mensagem');
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   const handleKeyPress = (e) => {
// // //     if (e.key === 'Enter' && !e.shiftKey) {
// // //       e.preventDefault();
// // //       handleSendMessage();
// // //     }
// // //   };

// // //   const startNewConversation = (contact) => {
// // //     setSelectedConversation({
// // //       outro_usuario_id: contact.id,
// // //       nome: contact.nome,
// // //       role: contact.role
// // //     });
// // //     loadMessages(contact.id);
// // //   };

// // //   const filteredConversations = conversations.filter(conv =>
// // //     conv.nome.toLowerCase().includes(searchTerm.toLowerCase())
// // //   );

// // //   const formatTime = (date) => {
// // //     const d = new Date(date);
// // //     const now = new Date();
// // //     const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

// // //     if (diffDays === 0) {
// // //       return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
// // //     } else if (diffDays === 1) {
// // //       return 'Ontem';
// // //     } else if (diffDays < 7) {
// // //       return d.toLocaleDateString('pt-BR', { weekday: 'short' });
// // //     } else {
// // //       return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
// // //     }
// // //   };

// // //   return (
// // //     <>
// // //       {/* Floating Button */}
// // //       <button
// // //         onClick={() => setShowMessaging(!showMessaging)}
// // //         style={{
// // //           position: 'fixed',
// // //           bottom: '2rem',
// // //           right: '2rem',
// // //           width: '60px',
// // //           height: '60px',
// // //           borderRadius: '50%',
// // //           background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
// // //           border: 'none',
// // //           boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.4)',
// // //           cursor: 'pointer',
// // //           display: 'flex',
// // //           alignItems: 'center',
// // //           justifyContent: 'center',
// // //           zIndex: 999,
// // //           transition: 'transform 0.2s'
// // //         }}
// // //         onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
// // //         onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
// // //       >
// // //         <MessageCircle size={28} color="white" />
// // //         {unreadCount > 0 && (
// // //           <span style={{
// // //             position: 'absolute',
// // //             top: '-5px',
// // //             right: '-5px',
// // //             background: '#ef4444',
// // //             color: 'white',
// // //             borderRadius: '50%',
// // //             width: '24px',
// // //             height: '24px',
// // //             display: 'flex',
// // //             alignItems: 'center',
// // //             justifyContent: 'center',
// // //             fontSize: '12px',
// // //             fontWeight: '700'
// // //           }}>
// // //             {unreadCount > 9 ? '9+' : unreadCount}
// // //           </span>
// // //         )}
// // //       </button>

// // //       {/* Messaging Window */}
// // //       {showMessaging && (
// // //         <div style={{
// // //           position: 'fixed',
// // //           bottom: '6rem',
// // //           right: '2rem',
// // //           width: '400px',
// // //           height: '600px',
// // //           background: 'white',
// // //           borderRadius: '16px',
// // //           boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
// // //           zIndex: 1000,
// // //           display: 'flex',
// // //           flexDirection: 'column',
// // //           overflow: 'hidden'
// // //         }}>
// // //           {/* Header */}
// // //           <div style={{
// // //             padding: '1rem',
// // //             background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
// // //             color: 'white',
// // //             display: 'flex',
// // //             alignItems: 'center',
// // //             justifyContent: 'space-between'
// // //           }}>
// // //             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
// // //               {selectedConversation && (
// // //                 <button
// // //                   onClick={() => setSelectedConversation(null)}
// // //                   style={{
// // //                     background: 'transparent',
// // //                     border: 'none',
// // //                     color: 'white',
// // //                     cursor: 'pointer',
// // //                     padding: '0.25rem',
// // //                     display: 'flex'
// // //                   }}
// // //                 >
// // //                   <ChevronLeft size={24} />
// // //                 </button>
// // //               )}
// // //               <MessageCircle size={24} />
// // //               <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
// // //                 {selectedConversation ? selectedConversation.nome : 'Mensagens'}
// // //               </h3>
// // //             </div>
// // //             <button
// // //               onClick={() => setShowMessaging(false)}
// // //               style={{
// // //                 background: 'transparent',
// // //                 border: 'none',
// // //                 color: 'white',
// // //                 cursor: 'pointer',
// // //                 padding: '0.25rem',
// // //                 display: 'flex'
// // //               }}
// // //             >
// // //               <X size={24} />
// // //             </button>
// // //           </div>

// // //           {/* Content */}
// // //           {!selectedConversation ? (
// // //             /* Conversations List */
// // //             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// // //               {/* Search */}
// // //               <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
// // //                 <div style={{ position: 'relative' }}>
// // //                   <Search size={20} color="#6b7280" style={{
// // //                     position: 'absolute',
// // //                     left: '0.75rem',
// // //                     top: '50%',
// // //                     transform: 'translateY(-50%)'
// // //                   }} />
// // //                   <input
// // //                     type="text"
// // //                     placeholder="Buscar conversa..."
// // //                     value={searchTerm}
// // //                     onChange={(e) => setSearchTerm(e.target.value)}
// // //                     style={{
// // //                       width: '100%',
// // //                       padding: '0.5rem 0.75rem 0.5rem 2.5rem',
// // //                       border: '1px solid #e5e7eb',
// // //                       borderRadius: '8px',
// // //                       fontSize: '0.875rem',
// // //                       outline: 'none'
// // //                     }}
// // //                   />
// // //                 </div>
// // //               </div>

// // //               {/* New Conversation Button (apenas para médicos) */}
// // //               {userRole === 'medico' && contacts.length > 0 && (
// // //                 <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
// // //                   <select
// // //                     onChange={(e) => {
// // //                       const contact = contacts.find(c => c.id === parseInt(e.target.value));
// // //                       if (contact) startNewConversation(contact);
// // //                     }}
// // //                     style={{
// // //                       width: '100%',
// // //                       padding: '0.5rem',
// // //                       border: '1px solid #e5e7eb',
// // //                       borderRadius: '8px',
// // //                       fontSize: '0.875rem',
// // //                       cursor: 'pointer'
// // //                     }}
// // //                   >
// // //                     <option value="">Nova conversa com...</option>
// // //                     {contacts.map(contact => (
// // //                       <option key={contact.id} value={contact.id}>
// // //                         {contact.nome}
// // //                       </option>
// // //                     ))}
// // //                   </select>
// // //                 </div>
// // //               )}

// // //               {/* Conversations */}
// // //               <div style={{ flex: 1, overflowY: 'auto' }}>
// // //                 {filteredConversations.length === 0 ? (
// // //                   <div style={{
// // //                     padding: '2rem',
// // //                     textAlign: 'center',
// // //                     color: '#6b7280'
// // //                   }}>
// // //                     <MessageCircle size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
// // //                     <p>Nenhuma conversa ainda</p>
// // //                     {userRole === 'paciente' && contacts.length > 0 && (
// // //                       <button
// // //                         onClick={() => startNewConversation(contacts[0])}
// // //                         style={{
// // //                           marginTop: '1rem',
// // //                           padding: '0.5rem 1rem',
// // //                           background: 'linear-gradient(90deg, #14b8a6 0%, #10b981 100%)',
// // //                           color: 'white',
// // //                           border: 'none',
// // //                           borderRadius: '8px',
// // //                           cursor: 'pointer',
// // //                           fontSize: '0.875rem',
// // //                           fontWeight: '600'
// // //                         }}
// // //                       >
// // //                         Iniciar conversa com seu médico
// // //                       </button>
// // //                     )}
// // //                   </div>
// // //                 ) : (
// // //                   filteredConversations.map(conv => (
// // //                     <div
// // //                       key={conv.outro_usuario_id}
// // //                       onClick={() => setSelectedConversation(conv)}
// // //                       style={{
// // //                         padding: '1rem',
// // //                         borderBottom: '1px solid #f3f4f6',
// // //                         cursor: 'pointer',
// // //                         transition: 'background 0.2s',
// // //                         background: conv.mensagens_nao_lidas > 0 ? '#f0fdf4' : 'white'
// // //                       }}
// // //                       onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
// // //                       onMouseOut={(e) => e.currentTarget.style.background = conv.mensagens_nao_lidas > 0 ? '#f0fdf4' : 'white'}
// // //                     >
// // //                       <div style={{
// // //                         display: 'flex',
// // //                         alignItems: 'start',
// // //                         gap: '0.75rem'
// // //                       }}>
// // //                         <div style={{
// // //                           width: '40px',
// // //                           height: '40px',
// // //                           borderRadius: '50%',
// // //                           background: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
// // //                           display: 'flex',
// // //                           alignItems: 'center',
// // //                           justifyContent: 'center',
// // //                           color: 'white',
// // //                           fontWeight: '600',
// // //                           fontSize: '1rem',
// // //                           flexShrink: 0
// // //                         }}>
// // //                           {conv.nome.charAt(0).toUpperCase()}
// // //                         </div>
// // //                         <div style={{ flex: 1, minWidth: 0 }}>
// // //                           <div style={{
// // //                             display: 'flex',
// // //                             justifyContent: 'space-between',
// // //                             alignItems: 'center',
// // //                             marginBottom: '0.25rem'
// // //                           }}>
// // //                             <p style={{
// // //                               fontSize: '0.95rem',
// // //                               fontWeight: conv.mensagens_nao_lidas > 0 ? '600' : '500',
// // //                               margin: 0,
// // //                               color: '#111827'
// // //                             }}>
// // //                               {conv.nome}
// // //                             </p>
// // //                             <span style={{
// // //                               fontSize: '0.75rem',
// // //                               color: '#6b7280'
// // //                             }}>
// // //                               {formatTime(conv.data_criacao)}
// // //                             </span>
// // //                           </div>
// // //                           <p style={{
// // //                             fontSize: '0.875rem',
// // //                             color: '#6b7280',
// // //                             margin: 0,
// // //                             overflow: 'hidden',
// // //                             textOverflow: 'ellipsis',
// // //                             whiteSpace: 'nowrap'
// // //                           }}>
// // //                             {conv.remetente_id === parseInt(sessionStorage.getItem('userId')) ? 'Você: ' : ''}
// // //                             {conv.mensagem}
// // //                           </p>
// // //                           {conv.mensagens_nao_lidas > 0 && (
// // //                             <span style={{
// // //                               marginTop: '0.25rem',
// // //                               display: 'inline-block',
// // //                               padding: '0.125rem 0.5rem',
// // //                               background: '#10b981',
// // //                               color: 'white',
// // //                               borderRadius: '12px',
// // //                               fontSize: '0.75rem',
// // //                               fontWeight: '600'
// // //                             }}>
// // //                               {conv.mensagens_nao_lidas} nova{conv.mensagens_nao_lidas > 1 ? 's' : ''}
// // //                             </span>
// // //                           )}
// // //                         </div>
// // //                       </div>
// // //                     </div>
// // //                   ))
// // //                 )}
// // //               </div>
// // //             </div>
// // //           ) : (
// // //             /* Chat View */
// // //             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// // //               {/* Messages */}
// // //               <div style={{
// // //                 flex: 1,
// // //                 overflowY: 'auto',
// // //                 padding: '1rem',
// // //                 background: '#f9fafb'
// // //               }}>
// // //                 {messages.length === 0 ? (
// // //                   <div style={{
// // //                     textAlign: 'center',
// // //                     color: '#6b7280',
// // //                     padding: '2rem'
// // //                   }}>
// // //                     <p>Nenhuma mensagem ainda</p>
// // //                     <p style={{ fontSize: '0.875rem' }}>Envie a primeira mensagem!</p>
// // //                   </div>
// // //                 ) : (
// // //                   messages.map((msg, index) => {
// // //                     const isOwn = msg.remetente_id === parseInt(sessionStorage.getItem('userId'));
// // //                     const showDate = index === 0 || 
// // //                       new Date(messages[index - 1].data_criacao).toDateString() !== 
// // //                       new Date(msg.data_criacao).toDateString();

// // //                     return (
// // //                       <div key={msg.id}>
// // //                         {showDate && (
// // //                           <div style={{
// // //                             textAlign: 'center',
// // //                             margin: '1rem 0',
// // //                             fontSize: '0.75rem',
// // //                             color: '#6b7280'
// // //                           }}>
// // //                             {new Date(msg.data_criacao).toLocaleDateString('pt-BR', {
// // //                               weekday: 'long',
// // //                               day: 'numeric',
// // //                               month: 'long'
// // //                             })}
// // //                           </div>
// // //                         )}
// // //                         <div style={{
// // //                           display: 'flex',
// // //                           justifyContent: isOwn ? 'flex-end' : 'flex-start',
// // //                           marginBottom: '0.5rem'
// // //                         }}>
// // //                           <div style={{
// // //                             maxWidth: '70%',
// // //                             padding: '0.75rem',
// // //                             borderRadius: isOwn ? '12px 12px 0 12px' : '12px 12px 12px 0',
// // //                             background: isOwn 
// // //                               ? 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)' 
// // //                               : 'white',
// // //                             color: isOwn ? 'white' : '#111827',
// // //                             boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
// // //                           }}>
// // //                             {msg.assunto && (
// // //                               <p style={{
// // //                                 fontSize: '0.75rem',
// // //                                 fontWeight: '600',
// // //                                 margin: '0 0 0.5rem 0',
// // //                                 opacity: 0.9
// // //                               }}>
// // //                                 {msg.assunto}
// // //                               </p>
// // //                             )}
// // //                             <p style={{
// // //                               margin: 0,
// // //                               fontSize: '0.875rem',
// // //                               lineHeight: '1.5',
// // //                               whiteSpace: 'pre-wrap',
// // //                               wordBreak: 'break-word'
// // //                             }}>
// // //                               {msg.mensagem}
// // //                             </p>
// // //                             <div style={{
// // //                               display: 'flex',
// // //                               alignItems: 'center',
// // //                               gap: '0.25rem',
// // //                               justifyContent: 'flex-end',
// // //                               marginTop: '0.25rem',
// // //                               fontSize: '0.7rem',
// // //                               opacity: 0.8
// // //                             }}>
// // //                               <span>
// // //                                 {new Date(msg.data_criacao).toLocaleTimeString('pt-BR', {
// // //                                   hour: '2-digit',
// // //                                   minute: '2-digit'
// // //                                 })}
// // //                               </span>
// // //                               {isOwn && (
// // //                                 msg.lida ? <CheckCheck size={14} /> : <Check size={14} />
// // //                               )}
// // //                             </div>
// // //                           </div>
// // //                         </div>
// // //                       </div>
// // //                     );
// // //                   })
// // //                 )}
// // //                 <div ref={messagesEndRef} />
// // //               </div>

// // //               {/* Input */}
// // //               <div style={{
// // //                 padding: '1rem',
// // //                 borderTop: '1px solid #e5e7eb',
// // //                 background: 'white'
// // //               }}>
// // //                 <div style={{ display: 'flex', gap: '0.5rem' }}>
// // //                   <textarea
// // //                     value={newMessage}
// // //                     onChange={(e) => setNewMessage(e.target.value)}
// // //                     onKeyPress={handleKeyPress}
// // //                     placeholder="Digite sua mensagem..."
// // //                     disabled={loading}
// // //                     style={{
// // //                       flex: 1,
// // //                       padding: '0.75rem',
// // //                       border: '1px solid #e5e7eb',
// // //                       borderRadius: '12px',
// // //                       fontSize: '0.875rem',
// // //                       outline: 'none',
// // //                       resize: 'none',
// // //                       minHeight: '44px',
// // //                       maxHeight: '120px'
// // //                     }}
// // //                     rows={1}
// // //                   />
// // //                   <button
// // //                     onClick={handleSendMessage}
// // //                     disabled={loading || !newMessage.trim()}
// // //                     style={{
// // //                       width: '44px',
// // //                       height: '44px',
// // //                       borderRadius: '12px',
// // //                       border: 'none',
// // //                       background: loading || !newMessage.trim()
// // //                         ? '#e5e7eb'
// // //                         : 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
// // //                       color: 'white',
// // //                       cursor: loading || !newMessage.trim() ? 'not-allowed' : 'pointer',
// // //                       display: 'flex',
// // //                       alignItems: 'center',
// // //                       justifyContent: 'center',
// // //                       transition: 'transform 0.2s'
// // //                     }}
// // //                     onMouseOver={(e) => {
// // //                       if (!loading && newMessage.trim()) {
// // //                         e.currentTarget.style.transform = 'scale(1.05)';
// // //                       }
// // //                     }}
// // //                     onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
// // //                   >
// // //                     <Send size={20} />
// // //                   </button>
// // //                 </div>
// // //               </div>
// // //             </div>
// // //           )}
// // //         </div>
// // //       )}
// // //     </>
// // //   );
// // // };

// // // export default MessagingComponent;