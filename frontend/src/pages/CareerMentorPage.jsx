import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, Send, Trash2, Plus, Sparkles, BookOpen, 
  ExternalLink, ArrowRight, RefreshCw, MessageSquare,
  Maximize2, Minimize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import mentorService from '../services/mentorService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CareerMentorPage = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [recommendedStories, setRecommendedStories] = useState([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const messageEndRef = useRef(null);

  // Suggestions to kickstart chat
  const suggestions = [
    { text: 'Mock Spring Boot Interview', icon: Sparkles, prompt: 'Run a mock technical interview for a Junior Spring Boot Developer. Start with question one.' },
    { text: 'Review Skills Gaps', icon: Brain, prompt: 'Review my skills gaps. I want to transition from React frontend to Full Stack engineering. What should I learn?' },
    { text: 'Suggest Backend Projects', icon: Sparkles, prompt: 'Suggest a detailed portfolio project blueprint for Java backend development.' },
    { text: 'Explain JPA Transactions', icon: BookOpen, prompt: 'Explain Spring Boot JPA @Transactional propagation levels with simple examples.' }
  ];

  // Fetch past chat sessions
  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
      setRecommendedStories([]);
    }
  }, [activeSessionId]);

  // Scroll to bottom of message feed
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await mentorService.getSessions();
      setSessions(res.data || []);
      if (res.data && res.data.length > 0) {
        setActiveSessionId(res.data[0].id);
      }
    } catch (err) {
      toast.error('Failed to load mentor chat sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchMessages = async (sessionId) => {
    setLoadingMessages(true);
    setRecommendedStories([]);
    try {
      const res = await mentorService.getMessages(sessionId);
      setMessages(res.data || []);
    } catch (err) {
      toast.error('Failed to load message history');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const res = await mentorService.createSession("New Career Conversation");
      setSessions(prev => [res.data, ...prev]);
      setActiveSessionId(res.data.id);
      setMessages([]);
      setRecommendedStories([]);
    } catch (err) {
      toast.error('Failed to create new conversation');
    }
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation session?')) return;
    
    try {
      await mentorService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        const remaining = sessions.filter(s => s.id !== id);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
        }
      }
      toast.success('Conversation deleted');
    } catch (err) {
      toast.error('Failed to delete conversation');
    }
  };

  const handleSend = async (customPrompt) => {
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || streaming) return;

    setInput('');
    setStreaming(true);

    let currentSessionId = activeSessionId;

    // 1. Transparently create a session if none exists
    if (!currentSessionId) {
      try {
        const res = await mentorService.createSession("New Career Conversation");
        const newSession = res.data;
        setSessions(prev => [newSession, ...prev]);
        currentSessionId = newSession.id;
        setActiveSessionId(currentSessionId);
      } catch (err) {
        toast.error('Failed to initialize a new conversation session');
        setStreaming(false);
        return;
      }
    }

    // 2. Insert user message and dynamic template response container
    const userMsg = { sender: 'USER', content: promptToSend, createdAt: new Date().toISOString() };
    const tempAiMsg = { sender: 'AI', content: '', createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg, tempAiMsg]);

    // Update active session title locally if it was a default conversation title
    const activeSession = sessions.find(s => s.id === currentSessionId);
    if (activeSession && (activeSession.title === "New Mentor Conversation" || activeSession.title === "New Career Conversation")) {
      const newTitle = promptToSend.length > 30 ? promptToSend.substring(0, 27) + '...' : promptToSend;
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: newTitle } : s));
    }

    // 3. Connect to SSE Stream
    let accumulated = '';
    const url = mentorService.getStreamChatUrl(currentSessionId, promptToSend);
    
    let retries = 0;
    const maxRetries = 2;

    const startStream = () => {
      const source = new EventSource(url);

      // Listen for matching blogs dynamically returned in "stories" metadata event
      source.addEventListener('stories', (e) => {
        try {
          const blogs = JSON.parse(e.data);
          if (blogs && blogs.length > 0) {
            setRecommendedStories(blogs);
          }
        } catch (err) {
          console.error('Error parsing recommended stories', err);
        }
      });

      source.onmessage = (e) => {
        let chunk = e.data;
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.content !== undefined) {
            chunk = payload.content;
          }
        } catch (err) {
          // Fallback if not JSON
        }
        accumulated += chunk;
        
        // Update latest AI message text token-by-token with new object references
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: accumulated
            };
          }
          return updated;
        });
      };

      source.onerror = (err) => {
        source.close();
        if (accumulated === '' && retries < maxRetries) {
          retries++;
          console.log(`Stream interrupted, retrying attempt ${retries}...`);
          setTimeout(startStream, 1000);
        } else {
          setStreaming(false);
          // If no content was accumulated, display a helpful error message
          if (accumulated === '') {
            setMessages(prev => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: "*System Error: Failed to receive response from the AI Mentor. Please check your connection or try again.*"
                };
              }
              return updated;
            });
          } else {
            // Silently synchronize messages from the database on successful stream completion
            mentorService.getMessages(currentSessionId)
              .then(res => {
                if (res.data) setMessages(res.data);
              })
              .catch(err => console.error('Silent sync failed', err));
          }
          // Re-fetch sessions to sync title changes in backend
          mentorService.getSessions().then(res => setSessions(res.data || []));
        }
      };
    };

    startStream();
  };

  // Custom markdown formatting parser for dynamic bubbles
  const renderFormattedContent = (content) => {
    if (!content) return <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse" />;
    
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeContent = part.slice(3, -3);
        const lines = codeContent.split('\n');
        const lang = lines[0].trim();
        const actualCode = lines.slice(1).join('\n').trim();
        return (
          <pre key={idx} className="bg-slate-900 dark:bg-black/40 text-slate-100 p-4 rounded-xl my-3 overflow-x-auto text-xs border border-slate-800 font-mono">
            {lang && <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">{lang}</div>}
            <code>{actualCode}</code>
          </pre>
        );
      }
      
      const lines = part.split('\n');
      return lines.map((line, lIdx) => {
        if (line.startsWith('### ')) {
          return <h4 key={lIdx} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-4 mb-1.5">{line.substring(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={lIdx} className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-5 mb-2">{line.substring(3)}</h3>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={lIdx} className="flex items-start gap-2 text-slate-600 dark:text-slate-350 my-1 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
              <span className="text-sm leading-relaxed">{renderBoldText(line.substring(2))}</span>
            </div>
          );
        }
        const numMatch = line.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 text-slate-600 dark:text-slate-350 my-1 pl-2">
              <span className="font-bold text-indigo-500 text-sm mt-0.5 flex-shrink-0 w-4">{numMatch[1]}.</span>
              <span className="text-sm leading-relaxed">{renderBoldText(numMatch[2])}</span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={lIdx} className="h-2" />;
        return <p key={lIdx} className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed my-1">{renderBoldText(line)}</p>;
      });
    });
  };

  const renderBoldText = (text) => {
    const pieces = text.split(/(\*\*.*?\*\*)/g);
    return pieces.map((piece, pIdx) => {
      if (piece.startsWith('**') && piece.endsWith('**')) {
        return <strong key={pIdx} className="font-bold text-slate-850 dark:text-white">{piece.slice(2, -2)}</strong>;
      }
      return piece;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="glass-card p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden animate-slide-up">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-white shadow-brand">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">AI Career Mentor</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your interactive career coach for mock interviews, portfolio projects, and skills analysis</p>
          </div>
        </div>
        <button 
          onClick={handleCreateSession}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-750 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Session</span>
        </button>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Sidebar: Session Logs */}
        {!isFullScreen && (
          <div className="lg:col-span-1 glass-card p-4 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Conversations</span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] rounded-full text-slate-500 dark:text-slate-400 font-bold">{sessions.length}</span>
            </div>

            {loadingSessions ? (
              <div className="py-8 flex justify-center">
                <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No conversations. Click 'New Session' above to begin.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        if (!streaming) {
                          setActiveSessionId(session.id);
                        }
                      }}
                      className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                        isActive
                          ? 'bg-indigo-50/70 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" />
                        <span className="text-xs truncate">{session.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        disabled={streaming}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 rounded transition-opacity disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Center Panel: Chat logs */}
        <div className={`lg:col-span-${isFullScreen ? '4' : (recommendedStories.length > 0 ? '2' : '3')} flex flex-col glass-card ${isFullScreen ? 'min-h-[700px]' : 'min-h-[580px]'} relative transition-all duration-300 animate-slide-up delay-75`}>
          
          {/* Chat Window Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">CareerOS AI Mentor</span>
            </div>
            <div className="flex items-center gap-3">
              {streaming && (
                <span className="text-[10px] text-indigo-500 font-bold animate-pulse mr-2">Streaming reply...</span>
              )}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? "Exit Full Screen" : "Full Screen Option"}
                className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg transition-colors duration-150 flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                {isFullScreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Messages Feed Container */}
          <div className={`flex-1 p-4 overflow-y-auto ${isFullScreen ? 'max-h-[500px]' : 'max-h-[380px]'} space-y-4`}>
            {loadingMessages ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400">Fetching history...</span>
              </div>
            ) : messages.length === 0 ? (
              /* Suggestion Interface */
              <div className="h-full flex flex-col justify-center items-center py-10 px-4">
                <Brain className="w-12 h-12 text-indigo-400 opacity-60 mb-3" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Ask your AI Career Mentor</h3>
                <p className="text-xs text-slate-400 text-center max-w-sm mt-1.5 mb-6">
                  Ask questions about job interviews, request resume optimizations, generate roadmaps, or suggestions for coding tasks.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestions.map((s, idx) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(s.prompt)}
                        disabled={streaming}
                        className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-850 hover:border-indigo-300 dark:hover:border-indigo-850 hover:bg-indigo-50/10 dark:hover:bg-slate-800/20 text-left transition-all active:scale-98 disabled:opacity-50"
                      >
                        <Icon className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">{s.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Message List Bubble */
              <div className="space-y-4">
                {messages.map((msg, idx) => {
                  const isUser = msg.sender === 'USER';
                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                        isUser
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-none shadow-md'
                          : 'glass-card text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-100 dark:border-slate-800/80 shadow-sm'
                      }`}>
                        {isUser ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        ) : (
                          <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-100 text-sm leading-relaxed">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({node, ...props}) => <h1 className="text-xl font-black text-slate-850 dark:text-white mt-4 mb-2" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-lg font-bold text-slate-850 dark:text-white mt-4 mb-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-base font-bold text-indigo-650 dark:text-indigo-405 mt-3 mb-1.5" {...props} />,
                                h4: ({node, ...props}) => <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-350 mt-2 mb-1" {...props} />,
                                p: ({node, ...props}) => <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed my-1.5" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2 text-slate-650 dark:text-slate-350" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1 my-2 text-slate-650 dark:text-slate-350" {...props} />,
                                li: ({node, ...props}) => <li className="text-sm leading-relaxed" {...props} />,
                                code: ({node, inline, className, children, ...props}) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <pre className="bg-slate-900 dark:bg-black/40 text-slate-100 p-4 rounded-xl my-3 overflow-x-auto text-xs border border-slate-800 font-mono">
                                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">{match[1]}</div>
                                      <code>{String(children).replace(/\n$/, '')}</code>
                                    </pre>
                                  ) : (
                                    <code className="bg-slate-100 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono text-xs" {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Prompt Entry Box */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !streaming) handleSend();
                }}
                disabled={streaming}
                placeholder={streaming ? "Mentor is typing..." : "Ask a career question..."}
                className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-850 dark:text-white placeholder-slate-400 disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={streaming || !input.trim()}
                className="p-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-750 text-white rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Dynamic RAG Recommended Blogs */}
        {!isFullScreen && recommendedStories.length > 0 && (
          <div className="lg:col-span-1 glass-card p-4 space-y-4 animate-slide-up delay-100">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <BookOpen className="w-4.5 h-4.5 text-indigo-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Related platform stories</span>
            </div>
            
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {recommendedStories.map((story) => (
                <div 
                  key={story.id}
                  className="p-3 border border-slate-100 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-900/35 hover:bg-indigo-50/5 dark:hover:bg-slate-800/10 rounded-xl transition-all"
                >
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-md text-[9px] font-bold uppercase mb-2">
                    {story.category || 'Career'}
                  </span>
                  <h4 className="text-xs font-bold text-slate-850 dark:text-white line-clamp-2 leading-snug">
                    {story.title}
                  </h4>
                  <a
                    href={`/blog/${story.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 mt-3"
                  >
                    <span>Read Story</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CareerMentorPage;
