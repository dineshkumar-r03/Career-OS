import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import BlogPage from './pages/BlogPage';
import CreateBlogPage from './pages/CreateBlogPage';
import EditBlogPage from './pages/EditBlogPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import DashboardPage from './pages/DashboardPage';
import BookmarksPage from './pages/BookmarksPage';
import SearchPage from './pages/SearchPage';
import MessagesPage from './pages/MessagesPage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from './components/common/PrivateRoute';
import CareerAgentPage from './pages/CareerAgentPage';
import CareerMentorPage from './pages/CareerMentorPage';

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/home" /> : <AuthLayout><Login /></AuthLayout>
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/home" /> : <AuthLayout><Register /></AuthLayout>
      } />
      
      {/* Protected Routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/home" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/feed" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/blog/:id" element={<MainLayout><BlogPage /></MainLayout>} />
        <Route path="/create" element={<MainLayout><CreateBlogPage /></MainLayout>} />
        <Route path="/edit/:id" element={<MainLayout><EditBlogPage /></MainLayout>} />
        <Route path="/profile/:id?" element={<MainLayout><ProfilePage /></MainLayout>} />
        <Route path="/profile/edit" element={<MainLayout><ProfileEditPage /></MainLayout>} />
        <Route path="/dashboard" element={<MainLayout><DashboardPage /></MainLayout>} />
        <Route path="/bookmarks" element={<MainLayout><BookmarksPage /></MainLayout>} />
        <Route path="/messages" element={<MainLayout><MessagesPage /></MainLayout>} />
        <Route path="/search" element={<MainLayout><SearchPage /></MainLayout>} />
        <Route path="/career-agent" element={<MainLayout><CareerAgentPage /></MainLayout>} />
        <Route path="/career-mentor" element={<MainLayout><CareerMentorPage /></MainLayout>} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;