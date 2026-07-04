import api from './api';

const mentorService = {
  getSessions: () => api.get('/mentor/sessions'),
  createSession: (title) => api.post('/mentor/sessions', { title }),
  deleteSession: (id) => api.delete(`/mentor/sessions/${id}`),
  getMessages: (id) => api.get(`/mentor/sessions/${id}/messages`),
  getStreamChatUrl: (sessionId, prompt) => {
    const token = localStorage.getItem('token');
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8090/api';
    return `${baseUrl}/mentor/sessions/${sessionId}/chat/stream?prompt=${encodeURIComponent(prompt)}&token=${encodeURIComponent(token)}`;
  }
};

export default mentorService;
