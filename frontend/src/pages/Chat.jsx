import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChatById, sendMessage, pollMessages, deleteChat } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const Chat = () => {
  const { chatId } = useParams();
  const { token } = useAuth();
  const [chat, setChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const chatReadyRef = useRef(false);
  const pendingMessagesRef = useRef([]);
  const lastMessageIdRef = useRef(null);

  // Add polling as fallback
  const pollingIntervalRef = useRef(null);
  const socketConnectedRef = useRef(false);
  
  // Add a new ref to track updates
  const messageCountRef = useRef(0);
  
  // Agregar nuevos estados y refs para funcionalidades mejoradas
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messageInputRef = useRef(null);
  
  useEffect(() => {
    const initializeChat = async () => {
      try {
        await loadChat();
        await initSocket();
      } catch (err) {
        console.error("Error initializing chat:", err);
        setError("Error al cargar el chat");
        setLoading(false);
      }
    };
    
    initializeChat();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [chatId]);

  useEffect(() => {
    if (chat) {
      // El chat está listo - marcar como preparado
      chatReadyRef.current = true;
      
      // Procesamos los mensajes pendientes si hay alguno
      if (pendingMessagesRef.current.length > 0) {
        console.log(`Procesando ${pendingMessagesRef.current.length} mensajes pendientes`);
        
        // Actualizar de una sola vez para evitar múltiples renderizados
        setChat(prevChat => {
          if (!prevChat) return prevChat;
          
          // Añadir todos los mensajes pendientes de una vez
          const updatedMessages = [
            ...prevChat.messages,
            ...pendingMessagesRef.current
          ];
          
          // Limpiar la cola después de actualizar
          pendingMessagesRef.current = [];
          
          return {
            ...prevChat,
            messages: updatedMessages
          };
        });
      }
    }
  }, [chat]);

  // Evitar scroll innecesario
  useEffect(() => {
    if (chat?.messages?.length > 0) {
      const lastMessageId = chat.messages[chat.messages.length - 1].timestamp || '';
      
      // Solo scroll si hay un nuevo mensaje
      if (lastMessageId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMessageId;
        scrollToBottom();
      }
    }
  }, [chat?.messages?.length]);

  // Start polling if socket connection fails
  useEffect(() => {
    if (chat && !socketConnectedRef.current) {
      console.log('Socket not connected, starting polling fallback');
      startPolling();
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [chat, socketConnectedRef.current]);
  
  const startPolling = () => {
    // Clear existing interval if any
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Start new polling interval
    pollingIntervalRef.current = setInterval(async () => {
      if (!chat) return;
      
      try {
        const result = await pollMessages(chatId, chat.messages.length);
        
        if (result.hasNewMessages) {
          console.log('Polling found new messages:', result.messages);
          
          if (chatReadyRef.current) {
            setChat(prev => ({
              ...prev,
              messages: [...prev.messages, ...result.messages]
            }));
          } else {
            // Guardar mensajes para procesarlos cuando el chat esté listo
            pendingMessagesRef.current = [
              ...pendingMessagesRef.current,
              ...result.messages
            ];
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
  };

  const loadChat = async () => {
    try {
      setLoading(true);
      const data = await getChatById(chatId);
      setChat(data);
    } catch (err) {
      setError('Failed to load chat');
      console.error(err);
      setLoading(false);
    }
  };

  const initSocket = async () => {
    try {
      console.log('Initializing socket connection');
      
      // Close existing connection if any
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Create new connection
      socketRef.current = io({
        auth: {
          token
        },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      return new Promise((resolve) => {
        socketRef.current.on('connect', () => {
          console.log('Socket connected', socketRef.current.id);
          socketRef.current.emit('join-chat', chatId);
          socketConnectedRef.current = true;
          
          // If we have an active polling, clear it
          if (pollingIntervalRef.current) {
            console.log('Socket connected, stopping polling');
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setLoading(false);
          resolve();
        });

        socketRef.current.on('message', (message) => {
          console.log('Received message via socket:', message);
          
          if (chatReadyRef.current) {
            console.log('Chat is ready, updating state with new message');
            
            setChat((prevChat) => {
              if (!prevChat) {
                console.warn('Chat state is still null, storing message for later');
                pendingMessagesRef.current.push(message);
                return prevChat;
              }
              
              // Añadir un ID único para evitar renderizados duplicados
              const messageWithId = {
                ...message,
                _id: message._id || Date.now() + Math.random().toString(36).substring(2, 9)
              };
              
              const updatedMessages = [...prevChat.messages, messageWithId];
              
              return {
                ...prevChat,
                messages: updatedMessages
              };
            });
            
            // Actualizar el último mensaje ID para el scrolling
            if (message.timestamp) {
              lastMessageIdRef.current = message.timestamp;
            }
          } else {
            console.log('Chat not ready yet, storing message for later');
            pendingMessagesRef.current.push(message);
          }
        });

        socketRef.current.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setLoading(false);
          resolve();
        });
        
        socketRef.current.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          socketConnectedRef.current = false;
          
          // Start polling as fallback
          startPolling();
        });
        
        socketRef.current.on('error', (err) => {
          console.error('Socket error:', err);
        });
        
        // Si el socket no se conecta en 5 segundos, continuamos
        setTimeout(() => {
          if (!socketConnectedRef.current) {
            console.log('Socket connection timeout, continuing anyway');
            setLoading(false);
            resolve();
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Error initializing socket:', error);
      socketConnectedRef.current = false;
      setLoading(false);
      
      // Start polling as fallback
      startPolling();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || sending) return;

    try {
      setSending(true);
      setError(null);
      const userMessage = { content: messageInput, role: 'user' };
      
      // Timestamp único para este mensaje
      const timestamp = new Date().toISOString();
      
      // Optimistic update
      setChat(prev => ({
        ...prev,
        messages: [...prev.messages, { 
          sender: chat.user,
          content: messageInput,
          role: 'user',
          timestamp,
          _id: `temp-${Date.now()}`
        }]
      }));
      
      // Actualizar el último mensaje ID para el scrolling
      lastMessageIdRef.current = timestamp;
      
      setMessageInput('');
      
      try {
        // Send message to backend
        await sendMessage(chatId, userMessage.content);
      } catch (err) {
        console.error('Failed to send message:', err);
        setError('Error al enviar el mensaje. Por favor intenta nuevamente.');
        
        if (err.response?.status !== 401) {
          setTimeout(() => {
            setChat(prev => ({
              ...prev,
              messages: [...prev.messages, { 
                sender: chat.user,
                content: "Lo siento, hubo un problema al procesar tu mensaje. Por favor, intenta nuevamente.",
                role: 'assistant',
                timestamp: new Date().toISOString(),
                _id: `error-${Date.now()}`
              }]
            }));
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Send message error:', err);
      setError('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Añadir función para manejar la eliminación del chat
  const handleDeleteChat = async () => {
    try {
      await deleteChat(chatId);
      navigate('/dashboard');
    } catch (err) {
      setError('Error al eliminar el chat');
      console.error(err);
    } finally {
      setShowDeleteModal(false);
    }
  };
  
  // Añadir función para refrescar el chat
  const handleRefreshChat = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await loadChat();
    } catch (err) {
      setError('Error al refrescar el chat');
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Añadir función para compartir el chat
  const handleShareChat = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        // Mostrar un mensaje temporal
        const tempError = 'URL copiada al portapapeles';
        setError(tempError);
        setTimeout(() => {
          if (error === tempError) {
            setError(null);
          }
        }, 2000);
      })
      .catch(err => {
        setError('Error al copiar la URL');
        console.error(err);
      });
  };

  // Optimizar el renderizado de mensajes con memo
  const renderMessages = useMemo(() => {
    if (!chat?.messages?.length) {
      return (
        <div className="empty-chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
            <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9.06 9.06 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.437 10.437 0 0 1-.524 2.318l-.003.011a10.722 10.722 0 0 1-.244.637c-.079.186.074.394.273.362a21.673 21.673 0 0 0 .693-.125zm.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6c0 3.193-3.004 6-7 6a8.06 8.06 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a10.97 10.97 0 0 0 .398-2z"/>
          </svg>
          <p>No hay mensajes aún. ¡Comienza la conversación!</p>
        </div>
      );
    }
    
    return chat.messages.map((message, index) => {
      // Solo aplicar clase de animación al último mensaje
      const isLastMessage = index === chat.messages.length - 1;
      const messageClass = `message ${message.role === 'user' ? 'user' : 'assistant'} ${isLastMessage ? 'message-new' : ''}`;
      
      // Formateo de la marca de tiempo
      const timestamp = message.timestamp ? new Date(message.timestamp) : null;
      const formattedTime = timestamp ? 
        timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      
      return (
        <div 
          key={message._id || `msg-${index}-${message.timestamp || Date.now()}`} 
          className={messageClass}
        >
          <div className="message-content">{message.content}</div>
          {timestamp && (
            <div className="message-timestamp">
              {formattedTime}
            </div>
          )}
        </div>
      );
    });
  }, [chat?.messages]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="chat-container h-100">
      <div className="row h-100">
        {/* Chat Sidebar */}
        <div className="col-md-3 col-lg-2 p-0 chat-sidebar">
          <div className="chat-sidebar-content">
            <div className="sidebar-header mb-3">
              <h4 className="chat-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-chat-square-text me-2" viewBox="0 0 16 16">
                  <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .8.4l1.9 2.533a1 1 0 0 0 1.6 0l1.9-2.533a1 1 0 0 1 .8-.4H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                  <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                </svg>
                {chat.title}
              </h4>
              <div className="sidebar-badges">
                <span className="sidebar-badge model-badge">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="bi bi-cpu me-1" viewBox="0 0 16 16">
                    <path d="M5 0a.5.5 0 0 1 .5.5V2h1V.5a.5.5 0 0 1 1 0V2h1V.5a.5.5 0 0 1 1 0V2h1V.5a.5.5 0 0 1 1 0V2A2.5 2.5 0 0 1 14 4.5h1.5a.5.5 0 0 1 0 1H14v1h1.5a.5.5 0 0 1 0 1H14v1h1.5a.5.5 0 0 1 0 1H14v1h1.5a.5.5 0 0 1 0 1H14a2.5 2.5 0 0 1-2.5 2.5v1.5a.5.5 0 0 1-1 0V14h-1v1.5a.5.5 0 0 1-1 0V14h-1v1.5a.5.5 0 0 1-1 0V14h-1v1.5a.5.5 0 0 1-1 0V14A2.5 2.5 0 0 1 2 11.5H.5a.5.5 0 0 1 0-1H2v-1H.5a.5.5 0 0 1 0-1H2v-1H.5a.5.5 0 0 1 0-1H2v-1H.5a.5.5 0 0 1 0-1H2A2.5 2.5 0 0 1 4.5 2V.5A.5.5 0 0 1 5 0zm-.5 3A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 11.5 3h-7zM5 6.5A1.5 1.5 0 0 1 6.5 5h3A1.5 1.5 0 0 1 11 6.5v3A1.5 1.5 0 0 1 9.5 11h-3A1.5 1.5 0 0 1 5 9.5v-3zM6.5 6a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
                  </svg>
                  {chat.model}
                </span>
                <span className="sidebar-badge msg-badge">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="bi bi-chat-text me-1" viewBox="0 0 16 16">
                    <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
                    <path d="M4 5.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8zm0 2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z"/>
                  </svg>
                  {chat.messages.length}
                </span>
              </div>
            </div>
            
            
            <div className="sidebar-section">
              <div className="sidebar-section-title">Estado</div>
              <div className="connection-status">
                <div className={`status-indicator ${socketConnectedRef.current ? 'connected' : 'disconnected'}`}></div>
                <span className="status-text">
                  {socketConnectedRef.current ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
            
            <div className="sidebar-actions mt-auto">
              <button 
                className="sidebar-btn btn-dashboard w-100 d-flex align-items-center justify-content-center mb-2"
                onClick={() => navigate('/dashboard')}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="14" 
                  height="14" 
                  fill="currentColor" 
                  className="bi bi-columns-gap me-2" 
                  viewBox="0 0 16 16"
                >
                  <path d="M6 1v3H1V1h5zM1 0a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1H1zm14 12v3h-5v-3h5zm-5-1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-5zM6 8v7H1V8h5zM1 7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H1zm14-6v7h-5V1h5zm-5-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1h-5z"/>
                </svg>
                Dashboard
              </button>

            </div>
          </div>
        </div>
        
        {/* Chat Content */}
        <div className="col-md-9 col-lg-10 p-0 chat-main-content">
          <div className="chat-content-container">
            {/* Chat Messages */}
            <div className="chat-messages-container">
              <div className="message-container">
                {renderMessages}
                
                {/* Error message display */}
                {error && (
                  <div className={`notification-message ${error.includes('URL copiada') ? 'success' : 'error'}`}>
                    {error}
                  </div>
                )}
                
                {/* Typing indicator */}
                {sending && (
                  <div className="message assistant">
                    <div className="typing-indicator">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* Input Area */}
            <div className="chat-input-container">
              <form onSubmit={handleSendMessage}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Escribe tu mensaje..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={sending}
                    ref={messageInputRef}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={sending || !messageInput.trim()}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      fill="currentColor" 
                      className="bi bi-send" 
                      viewBox="0 0 16 16"
                    >
                      <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/>
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-confirm-modal">
            <div className="modal-header">
              <h5>¿Eliminar chat?</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowDeleteModal(false)}
              ></button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que deseas eliminar este chat? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline-secondary" 
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteChat}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat; 