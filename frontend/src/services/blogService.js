import api from './api';

const blogService = {
  getAllBlogs: (params) => api.get('/blogs', { params }),
  getBlog: (id) => api.get(`/blogs/${id}`),
  incrementView: (id) => api.post(`/blogs/${id}/view`),
  createBlog: (data) => {
    console.log('Creating blog with data:', data);
    return api.post('/blogs', data);
  },
  updateBlog: (id, data) => api.put(`/blogs/${id}`, data),
  deleteBlog: (id) => api.delete(`/blogs/${id}`),
  searchBlogs: (query, params) => api.get('/blogs/search', { params: { query, ...params } }),
  likeBlog: (id) => api.post(`/blogs/${id}/like`),
  unlikeBlog: (id) => api.delete(`/blogs/${id}/like`),
  bookmarkBlog: (id) => api.post(`/blogs/${id}/bookmark`),
  unbookmarkBlog: (id) => api.delete(`/blogs/${id}/bookmark`),
  getComments: (blogId, params) => api.get(`/blogs/${blogId}/comments`, { params }),
  addComment: (blogId, data) => api.post(`/blogs/${blogId}/comments`, data),
  deleteComment: (id) => api.delete(`/comments/${id}`),
  getBookmarks: () => api.get('/bookmarks'),
};

export default blogService;