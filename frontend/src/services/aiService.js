import api from './api';

const aiService = {
  getCareerGuidance: (data) => api.post('/ai/guidance', data),
};

export default aiService;
