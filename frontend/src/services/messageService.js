import api from './api';

const messageService = {
  getConversations: () => api.get('/messages/conversations'),
  getChatHistory: (recipientId) => api.get(`/messages/chat/${recipientId}`),
  sendMessage: (data) => api.post('/messages', data),
  toggleLikeMessage: (messageId) => api.post(`/messages/${messageId}/like`),
};

export default messageService;
