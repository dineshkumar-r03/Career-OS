import React, { createContext, useState } from 'react';
import blogService from '../services/blogService';
import toast from 'react-hot-toast';

export const BlogContext = createContext();

export const BlogProvider = ({ children }) => {
  const [blogs, setBlogs] = useState([]);
  const [currentBlog, setCurrentBlog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchBlogs = async (filters = {}) => {
    setLoading(true);
    try {
      const response = await blogService.getAllBlogs(filters);
      setBlogs(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
      setTotalElements(response.data.totalElements || 0);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load blogs');
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlog = async (id) => {
    setLoading(true);
    try {
      const response = await blogService.getBlog(id);
      setCurrentBlog(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error('Failed to load blog');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const incrementView = async (id) => {
    try {
      await blogService.incrementView(id);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const createBlog = async (data) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to create a blog');
        throw new Error('Not authenticated');
      }

      console.log('Creating blog with data:', data);
      console.log('Token being used:', token.substring(0, 20) + '...');
      
      const response = await blogService.createBlog(data);
      toast.success('Blog created successfully!');
      return response.data;
    } catch (error) {
      console.error('Error creating blog:', error);
      
      // Handle specific error cases
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        
        if (error.response.status === 401 || error.response.status === 403) {
          toast.error('Authentication failed. Please login again.');
          // Clear invalid token
          localStorage.removeItem('token');
          // Redirect to login
          window.location.href = '/login';
        } else {
          toast.error(error.response.data?.message || 'Failed to create blog');
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        toast.error('Server not responding. Please try again.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        toast.error('Failed to create blog. Please try again.');
      }
      throw error;
    }
  };

  const updateBlog = async (id, data) => {
    try {
      const response = await blogService.updateBlog(id, data);
      toast.success('Blog updated successfully!');
      return response.data;
    } catch (error) {
      console.error('Error updating blog:', error);
      toast.error(error.response?.data?.message || 'Failed to update blog');
      throw error;
    }
  };

  const deleteBlog = async (id) => {
    try {
      await blogService.deleteBlog(id);
      toast.success('Blog deleted successfully!');
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error(error.response?.data?.message || 'Failed to delete blog');
      throw error;
    }
  };

  const searchBlogs = async (query, filters = {}) => {
    setLoading(true);
    try {
      const response = await blogService.searchBlogs(query, filters);
      setBlogs(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
      setTotalElements(response.data.totalElements || 0);
      return response.data;
    } catch (error) {
      console.error('Error searching blogs:', error);
      toast.error('Failed to search blogs');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    blogs,
    setBlogs,
    currentBlog,
    setCurrentBlog,
    loading,
    setLoading,
    totalPages,
    totalElements,
    fetchBlogs,
    fetchBlog,
    incrementView,
    createBlog,
    updateBlog,
    deleteBlog,
    searchBlogs
  };

  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
};