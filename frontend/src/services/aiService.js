import axios from 'axios';

const API_URL = '/api/ai';

// Función para obtener el token del localStorage
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Get available models
export const getModels = async () => {
  const response = await axios.get(`${API_URL}/models`, {
    headers: getAuthHeader()
  });
  return response.data.models;
};

// Create a new chat
export const createChat = async (title, model) => {
  const response = await axios.post(`${API_URL}/chats`, 
    { title, model },
    { headers: getAuthHeader() }
  );
  return response.data.chat;
};

// Get user's chats
export const getChats = async () => {
  const response = await axios.get(`${API_URL}/chats`, {
    headers: getAuthHeader()
  });
  return response.data.chats;
};

// Get chat by id
export const getChatById = async (chatId) => {
  const response = await axios.get(`${API_URL}/chats/${chatId}`, {
    headers: getAuthHeader()
  });
  return response.data.chat;
};

// Send message to chat with fallback mechanism
export const sendMessage = async (chatId, content) => {
  // Try sending message via regular API
  const response = await axios.post(
    `${API_URL}/chats/${chatId}/messages`, 
    { content },
    { headers: getAuthHeader() }
  );
  return response.data;
};

// Poll for new messages as a fallback if WebSockets fail
export const pollMessages = async (chatId, currentMessageCount) => {
  try {
    const response = await axios.get(`${API_URL}/chats/${chatId}`, {
      headers: getAuthHeader()
    });
    
    const chat = response.data.chat;
    
    // If we got new messages, return them
    if (chat.messages.length > currentMessageCount) {
      return {
        hasNewMessages: true,
        messages: chat.messages.slice(currentMessageCount)
      };
    }
    
    return { hasNewMessages: false, messages: [] };
  } catch (error) {
    console.error('Error polling messages:', error);
    return { hasNewMessages: false, messages: [], error };
  }
};

// Delete chat
export const deleteChat = async (chatId) => {
  const response = await axios.delete(`${API_URL}/chats/${chatId}`, {
    headers: getAuthHeader()
  });
  return response.data;
}; 