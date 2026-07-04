import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import messageService from '../services/messageService';
import userService from '../services/userService';
import { Send, Search, MessageSquare, ArrowLeft, GraduationCap, Clock, Sparkles, Heart, Smile } from 'lucide-react';
import toast from 'react-hot-toast';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣']
  },
  {
    name: 'Gestures',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝']
  },
  {
    name: 'Hearts & Fun',
    emojis: ['❤️', '💔', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '🔥', '✨', '🎉', '🌟', '💥', '💯', '🚀', '💡', '💬', '👀', '👏', '🙌', '🎉']
  }
];

const MessagesPage = () => {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null); // The user entity we are currently chatting with
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const chatEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);

  // Handle click outside emoji picker to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Extract ?user=XX from URL query params
  const queryParams = new URLSearchParams(location.search);
  const targetUserId = queryParams.get('user');

  const conversationsRef = useRef([]);
  const activeUserRef = useRef(null);
  const messagesRef = useRef([]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activeUserRef.current = activeUser;
  }, [activeUser]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    fetchConversations();
    
    // Start polling every 3 seconds
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      pollMessagesAndConversations();
    }, 3000);

    // Clean up polling on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Handle URL change to select target user
  useEffect(() => {
    if (targetUserId && !loadingConv) {
      handleSelectTargetUser(targetUserId);
    }
  }, [targetUserId, loadingConv]);

  const fetchConversations = async () => {
    try {
      const response = await messageService.getConversations();
      const list = response.data || [];
      setConversations(list);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConv(false);
    }
  };

  const handleSelectTargetUser = async (targetId, currentList = conversations) => {
    const numericTargetId = parseInt(targetId);
    
    // Check if user is already in active conversation list
    const existingConv = currentList.find(c => c.user.id === numericTargetId);
    
    if (existingConv) {
      if (activeUser?.id !== numericTargetId) {
        selectConversation(existingConv.user);
      }
    } else {
      // Fetch details of this target user from backend since no conversation exists yet
      try {
        setLoadingChat(true);
        const userResp = await userService.getUser(numericTargetId);
        const targetUserDetails = userResp.data;
        
        // Add a temporary blank conversation to the list so they display
        const tempConv = {
          user: targetUserDetails,
          lastMessage: 'Start typing to send a message...',
          lastMessageTime: null,
          unreadCount: 0
        };
        
        setConversations(prev => {
          if (prev.some(c => c.user.id === numericTargetId)) return prev;
          return [tempConv, ...prev];
        });
        
        setActiveUser(targetUserDetails);
        setMessages([]);
        setLoadingChat(false);
      } catch (error) {
        console.error('Error opening user chat:', error);
        toast.error('Failed to start conversation');
        setLoadingChat(false);
      }
    }
  };

  const selectConversation = async (user) => {
    setActiveUser(user);
    setLoadingChat(true);
    try {
      const response = await messageService.getChatHistory(user.id);
      setMessages(response.data || []);
      
      // Clear URL query parameters cleanly
      if (location.search) {
        navigate('/messages', { replace: true });
      }
      
      // Reset unread count for this user locally
      setConversations(prev => 
        prev.map(c => c.user.id === user.id ? { ...c, unreadCount: 0 } : c)
      );
      
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoadingChat(false);
    }
  };

  const pollMessagesAndConversations = async () => {
    const activeUsr = activeUserRef.current;
    const msgs = messagesRef.current;
    const convs = conversationsRef.current;

    try {
      // 1. Fetch updated chat history if there is an active user
      if (activeUsr) {
        const chatResponse = await messageService.getChatHistory(activeUsr.id);
        const newMsgs = chatResponse.data || [];
        
        // Update state if message list length or any message property (e.g. like, read) changes
        const hasChanges = newMsgs.length !== msgs.length || newMsgs.some((msg, idx) => {
          const oldMsg = msgs[idx];
          return !oldMsg || oldMsg.id !== msg.id || oldMsg.isLiked !== msg.isLiked || oldMsg.isRead !== msg.isRead;
        });

        if (hasChanges) {
          setMessages(newMsgs);
          if (newMsgs.length !== msgs.length) {
            setTimeout(scrollToBottom, 50);
          }
        }
      }

      // 2. Fetch updated conversation list in background to keep sidebar fresh
      const convResponse = await messageService.getConversations();
      const newConvs = convResponse.data || [];
      
      // Check for incoming unread messages to display Toast notification
      newConvs.forEach(newConv => {
        const oldConv = convs.find(c => c.user.id === newConv.user.id);
        const oldUnread = oldConv ? oldConv.unreadCount : 0;
        
        if (newConv.unreadCount > oldUnread && (!activeUsr || activeUsr.id !== newConv.user.id)) {
          toast(`New message from ${newConv.user.name}: "${newConv.lastMessage}"`, {
            icon: '💬',
            duration: 4000
          });
        }
      });
      
      setConversations(newConvs);
    } catch (error) {
      console.warn('Background message poll error:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser) return;
    
    const contentToSend = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    try {
      const response = await messageService.sendMessage({
        recipientId: activeUser.id,
        content: contentToSend
      });
      
      setMessages(prev => [...prev, response.data]);
      setSending(false);
      setTimeout(scrollToBottom, 50);
      
      // Refresh conversations list to update lastMessage
      const convResponse = await messageService.getConversations();
      setConversations(convResponse.data || []);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(contentToSend); // Restore typed message
      setSending(false);
    }
  };

  const handleToggleLike = async (messageId) => {
    try {
      const response = await messageService.toggleLikeMessage(messageId);
      const updatedMessage = response.data;
      setMessages(prev => prev.map(m => m.id === messageId ? updatedMessage : m));
    } catch (error) {
      console.error('Error toggling like status:', error);
      toast.error('Failed to update message like');
    }
  };

  const handleEmojiClick = (emoji) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const updatedValue = before + emoji + after;
    setNewMessage(updatedValue);

    // Put focus back to input and set cursor position after the emoji
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + emoji.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = conversations.filter(c =>
    c.user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="glass-card overflow-hidden h-[calc(100vh-12rem)] flex flex-col md:flex-row relative">
        
        {/* Left pane: Conversations List */}
        <div className={`w-full md:w-80 border-r border-[var(--clr-border)] flex flex-col h-full ${activeUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-[var(--clr-border)] space-y-3 bg-white/20 dark:bg-slate-900/10">
            <h2 className="text-xl font-black gradient-text">Messages</h2>
            
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search direct messages..."
                className="input pl-9 py-2 text-xs rounded-xl"
              />
            </div>
          </div>
          
          {/* Conversation List Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--clr-border)]/50">
            {loadingConv ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  </div>
                </div>
              ))
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isActive = activeUser?.id === conv.user.id;
                return (
                  <button
                    key={conv.user.id}
                    onClick={() => selectConversation(conv.user)}
                    className={`w-full text-left p-4 flex items-center gap-3 transition-colors duration-150 relative ${
                      isActive
                        ? 'bg-primary-500/10 hover:bg-primary-500/15 border-l-4 border-primary-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* User Profile Avatar */}
                    <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                      {conv.user.profilePicture ? (
                        <img src={conv.user.profilePicture} alt={conv.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-sm">
                          {conv.user.name?.charAt(0)?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-sm font-bold text-[var(--clr-text-primary)] truncate">{conv.user.name}</h4>
                        {conv.lastMessageTime && (
                          <span className="text-[10px] text-[var(--clr-text-muted)]">
                            {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--clr-text-secondary)] truncate">
                        {conv.lastMessage}
                      </p>
                    </div>

                    {/* Unread count badge */}
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 animate-bounce">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 text-[var(--clr-text-secondary)]">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-xs">No conversations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Chat Area */}
        <div className={`flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/10 ${activeUser ? 'flex' : 'hidden md:flex'}`}>
          {activeUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[var(--clr-border)] flex items-center gap-3 bg-white/20 dark:bg-slate-900/10 relative z-10">
                {/* Back button for mobile */}
                <button
                  onClick={() => setActiveUser(null)}
                  className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                {/* User avatar */}
                <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                  {activeUser.profilePicture ? (
                    <img src={activeUser.profilePicture} alt={activeUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {activeUser.name?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Info block */}
                <div>
                  <h3 className="font-bold text-sm text-[var(--clr-text-primary)] leading-tight">{activeUser.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--clr-text-secondary)]">
                    {activeUser.college && (
                      <span className="flex items-center gap-0.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>{activeUser.college}</span>
                      </span>
                    )}
                    {activeUser.department && (
                      <span>• {activeUser.department}</span>
                    )}
                    {activeUser.graduationYear && (
                      <span>• Year: {activeUser.graduationYear}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Message log feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
                {loadingChat ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                    <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs">Loading chat history...</span>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isOwn = msg.senderId === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-center gap-2 group animate-scale-in relative py-1`}
                      >
                        {/* Outgoing Message: Like button on the left of bubble */}
                        {isOwn && (
                          <button
                            type="button"
                            onClick={() => handleToggleLike(msg.id)}
                            className={`opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 order-first cursor-pointer ${
                              msg.isLiked ? 'opacity-100 text-rose-500' : ''
                            }`}
                          >
                            <Heart className={`w-4 h-4 transition-transform active:scale-125 ${msg.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm relative ${
                            isOwn
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-tr-none'
                              : 'bg-white dark:bg-slate-800 text-[var(--clr-text-primary)] border border-slate-100 dark:border-slate-700/50 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <span className={`block text-[9px] text-right mt-1 opacity-70`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {/* Heart Icon Badge floating at bottom of bubble */}
                          {msg.isLiked && (
                            <div className={`absolute -bottom-1.5 ${isOwn ? 'left-3' : 'right-3'} bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-md rounded-full p-0.5 flex items-center justify-center animate-scale-in z-10`}>
                              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                            </div>
                          )}
                        </div>

                        {/* Incoming Message: Like button on the right of bubble */}
                        {!isOwn && (
                          <button
                            type="button"
                            onClick={() => handleToggleLike(msg.id)}
                            className={`opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 cursor-pointer ${
                              msg.isLiked ? 'opacity-100 text-rose-500' : ''
                            }`}
                          >
                            <Heart className={`w-4 h-4 transition-transform active:scale-125 ${msg.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--clr-text-secondary)]">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center mb-3">
                      <Sparkles className="w-7 h-7 text-indigo-500" />
                    </div>
                    <h3 className="font-bold text-sm">No messages yet</h3>
                    <p className="text-xs text-[var(--clr-text-muted)] mt-1">Start the conversation by sending a direct message.</p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Input Footer */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--clr-border)] bg-white/20 dark:bg-slate-900/10 flex items-center gap-3 relative">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a private message..."
                    className="input pr-12 py-2.5 rounded-xl text-sm w-full"
                    disabled={sending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer ${
                      showEmojiPicker ? 'text-indigo-500' : 'text-slate-400 hover:text-indigo-500'
                    }`}
                    disabled={sending}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="btn-primary p-2.5 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>

                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-20 right-4 z-50 glass-card p-3 shadow-xl border border-[var(--clr-border)] w-72 rounded-2xl animate-scale-in"
                  >
                    <div className="h-56 overflow-y-auto space-y-3 pr-1">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.name} className="space-y-1.5">
                          <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--clr-text-muted)] sticky top-0 bg-white/90 dark:bg-slate-900/90 py-0.5 backdrop-blur-xs">
                            {cat.name}
                          </h5>
                          <div className="grid grid-cols-8 gap-1">
                            {cat.emojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleEmojiClick(emoji)}
                                className="text-lg p-1 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 rounded-md transition-colors text-center cursor-pointer select-none"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold gradient-text">Your Inbox</h2>
              <p className="text-sm text-[var(--clr-text-secondary)] mt-1.5 max-w-sm">
                Select an existing conversation from the list or click 'Message' on a user's profile card to start chatting.
              </p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default MessagesPage;
