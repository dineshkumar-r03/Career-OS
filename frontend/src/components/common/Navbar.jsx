import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import {
  Home,
  BookOpen,
  Bookmark,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  Bell,
  Plus,
  LayoutDashboard,
  ChevronDown,
  Zap,
  Settings,
  MessageSquare,
  Sparkles,
  Brain
} from 'lucide-react';
import notificationService from '../../services/notificationService';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      const nextUnreadCount = response.data || 0;
      
      if (!isFirstLoadRef.current && nextUnreadCount > unreadCountRef.current) {
        try {
          const notifResponse = await notificationService.getNotifications();
          const latestNotifs = notifResponse.data || [];
          const newNotifs = latestNotifs.filter(n => !n.read && !n.isRead);
          if (newNotifs.length > 0) {
            const newest = newNotifs[0];
            let messageText = '';
            if (newest.type === 'LIKE') messageText = `${newest.senderName} liked your blog post`;
            else if (newest.type === 'COMMENT') messageText = `${newest.senderName} commented on your blog post`;
            else if (newest.type === 'FOLLOW') messageText = `${newest.senderName} started following you`;
            else if (newest.type === 'MESSAGE') messageText = `${newest.senderName} sent you a message`;
            
            if (messageText) {
              toast(messageText, {
                icon: newest.type === 'MESSAGE' ? '💬' : '🔔',
                duration: 4000
              });
            }
          }
        } catch (err) {
          console.error('Error fetching notifications for toast:', err);
        }
      }
      
      unreadCountRef.current = nextUnreadCount;
      isFirstLoadRef.current = false;
      setUnreadCount(nextUnreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      if (isNotificationOpen) {
        fetchNotifications();
      }

      const interval = setInterval(() => {
        fetchUnreadCount();
        if (isNotificationOpen) {
          fetchNotifications();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user, isNotificationOpen]);

  const handleToggleNotification = () => {
    const nextState = !isNotificationOpen;
    setIsNotificationOpen(nextState);
    if (nextState) {
      setIsProfileMenuOpen(false);
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.read && !notif.isRead) {
        await notificationService.markAsRead(notif.id);
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
    setIsNotificationOpen(false);
    
    if (notif.type === 'FOLLOW') {
      navigate(`/profile/${notif.senderId}`);
    } else if (notif.type === 'MESSAGE') {
      navigate(`/messages?user=${notif.senderId}`);
    } else if (notif.blogId) {
      navigate(`/blog/${notif.blogId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchUnreadCount();
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const navigation = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Feed', href: '/feed', icon: BookOpen },
    { name: 'Career AI', href: '/career-agent', icon: Sparkles },
    { name: 'AI Mentor', href: '/career-mentor', icon: Brain },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar-glass fixed top-0 w-full z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand-sm transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black gradient-text tracking-tight">Connect</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-brand-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">

            {/* Search */}
            <button
              onClick={() => navigate('/search')}
              className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-all duration-200"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-all duration-200"
              aria-label="Toggle theme"
            >
              {isDark
                ? <Sun className="w-5 h-5 text-amber-400" />
                : <Moon className="w-5 h-5" />
              }
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={handleToggleNotification}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-all duration-200"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="notification-dot dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold bg-rose-500 ring-2 ring-white dark:ring-slate-900 w-5 h-5 -top-1 -right-1 rounded-full absolute">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-brand-lg border border-slate-100 dark:border-slate-700 py-2 animate-scale-in z-50">
                  {/* Header */}
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-55" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const isUnread = !notif.read && !notif.isRead;
                        return (
                          <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-755 transition-colors duration-150 border-b border-slate-50 dark:border-slate-700/50 ${
                              isUnread ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-gradient-brand text-white font-bold text-xs shadow-brand-sm">
                              {notif.senderProfilePicture ? (
                                <img src={notif.senderProfilePicture} alt={notif.senderName} className="w-full h-full object-cover" />
                              ) : (
                                <span>{notif.senderName?.charAt(0)?.toUpperCase() || 'U'}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 dark:text-slate-200 leading-normal">
                                <span className="font-semibold">{notif.senderName}</span>{' '}
                                {notif.type === 'LIKE' && 'liked your blog post'}
                                {notif.type === 'COMMENT' && 'commented on your blog post'}
                                {notif.type === 'FOLLOW' && 'started following you'}
                                {notif.type === 'MESSAGE' && 'sent you a message'}
                                {notif.blogTitle && (
                                  <span className="font-medium text-primary-600 dark:text-primary-400 block truncate mt-0.5">
                                    "{notif.blogTitle}"
                                  </span>
                                )}
                              </p>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                                {formatTime(notif.createdAt)}
                              </span>
                            </div>
                            {isUnread && (
                              <div className="w-2 h-2 rounded-full bg-primary-500 self-center flex-shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Write button */}
            <Link
              to="/create"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-brand shadow-brand-sm hover:shadow-brand-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Write</span>
            </Link>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                  setIsNotificationOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
                aria-label="Profile menu"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gradient-brand text-white font-bold text-sm shadow-brand-sm ring-2 ring-white dark:ring-slate-900">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-brand-lg border border-slate-100 dark:border-slate-700 py-2 animate-scale-in z-50">
                  {/* User info header */}
                  <div className="px-4 py-2 mb-1 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{user?.email || ''}</p>
                  </div>

                  <Link
                    to={`/profile/${user?.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-colors duration-150 rounded-lg mx-1"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-colors duration-150 rounded-lg mx-1"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/profile/edit"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-colors duration-150 rounded-lg mx-1"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                  <hr className="my-1.5 border-slate-100 dark:border-slate-700" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors duration-150 rounded-lg mx-1 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-brand-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <Link
              to="/create"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-brand shadow-brand-sm"
              onClick={() => setIsMenuOpen(false)}
            >
              <Plus className="w-5 h-5" />
              <span>Write a Blog</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;