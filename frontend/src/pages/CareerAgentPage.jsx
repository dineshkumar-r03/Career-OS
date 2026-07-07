import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import aiService from '../services/aiService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Compass,
  Code,
  GraduationCap,
  Target,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  Loader2,
  Bookmark,
  Calendar,
  Layers,
  Heart,
  FileText
} from 'lucide-react';

const CareerAgentPage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  // Onboarding form state
  const [formData, setFormData] = useState({
    skills: '',
    interests: '',
    college: '',
    department: '',
    graduationYear: '',
    careerGoals: '',
    saveToProfile: true
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [guidance, setGuidance] = useState(null);
  const [activeTab, setActiveTab] = useState('paths');

  // Rotate loading messages to look professional and dynamic
  const loadingMessages = [
    "Analyzing your skills and credentials...",
    "Matching interests with industry demand patterns...",
    "Configuring step-by-step learning roadmaps...",
    "Sourcing tailored portfolio project ideas...",
    "Retrieving peer success stories from the platform...",
    "Finalizing your personalized career blueprint..."
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        skills: user.skills || '',
        interests: user.interests || '',
        college: user.college || '',
        department: user.department || '',
        graduationYear: user.graduationYear || '',
        careerGoals: user.careerGoals || '',
        saveToProfile: true
      });
    }
  }, [user]);

  // Loading animation intervals
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await aiService.getCareerGuidance(formData);
      setGuidance(response.data);
      
      // Update auth context if user checked saveToProfile
      if (formData.saveToProfile && response.data.updatedUser) {
        setUser(response.data.updatedUser);
      }
      
      toast.success('Your personalized career path is ready!');
      setActiveTab('paths');
    } catch (error) {
      console.error('Error generating career guidance:', error);
      toast.error(error.response?.data?.message || 'Failed to generate guidance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render keypoints / bullet points nicely
  const renderKeypoints = (text) => {
    if (!text) return null;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const hasBullets = lines.some(line => line.startsWith('-') || line.startsWith('*'));
    
    if (hasBullets) {
      return (
        <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-600 dark:text-slate-350">
          {lines.map((line, idx) => {
            const cleanLine = line.replace(/^[-*\s]+/, '');
            return (
              <li key={idx} className="text-sm leading-relaxed">
                {cleanLine}
              </li>
            );
          })}
        </ul>
      );
    }

    const sentences = text.split(/(?<=\.)\s+/).map(s => s.trim()).filter(s => s.length > 0);
    if (sentences.length > 1) {
      return (
        <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-600 dark:text-slate-350">
          {sentences.map((sentence, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              {sentence}
            </li>
          ))}
        </ul>
      );
    }

    return <span className="text-sm leading-relaxed">{text}</span>;
  };

  // Status mapping colors for Skills analysis
  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'ready':
        return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30';
      case 'intermediate':
        return 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30';
      default:
        return 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30';
    }
  };

  // Difficulty mapping colors for Projects
  const getDifficultyBadgeClass = (diff) => {
    switch (diff.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400';
      case 'medium':
        return 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400';
      default:
        return 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="glass-card p-8 mb-8 relative overflow-hidden animate-slide-up">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 pointer-events-none bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 filter blur-xl" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full opacity-15 pointer-events-none bg-gradient-to-br from-indigo-500 via-pink-500 to-amber-500 filter blur-xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0 animate-pulse">
              <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <span className="gradient-badge flex items-center gap-1.5 w-fit mb-1">
                <Compass className="w-3.5 h-3.5" />
                AI Career Copilot
              </span>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">
                AI Career <span className="gradient-text">Guidance Agent</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl">
                Get a customized roadmap, skills gap analysis, custom portfolio project recommendations, and learn from platform success stories.
              </p>
            </div>
          </div>
          
          {guidance && (
            <button
              onClick={() => setGuidance(null)}
              className="btn-secondary px-6 py-2.5 rounded-xl font-bold hover:border-indigo-500 hover:text-indigo-500 transition-all active:scale-95 flex-shrink-0"
            >
              Analyze New Profile
            </button>
          )}
        </div>
      </div>

      {loading ? (
        /* Loader Overlay */
        <div className="glass-card p-16 text-center flex flex-col items-center justify-center min-h-[500px] animate-scale-in">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-850 animate-ping absolute opacity-30" />
            <div className="w-24 h-24 rounded-full border-t-4 border-indigo-500 border-r-4 border-r-transparent animate-spin flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-indigo-500 animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold gradient-text mb-3">Consulting AI Guidance Counselor...</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm h-6 transition-all duration-300 font-medium">
            {loadingMessages[loadingStep]}
          </p>
          
          <div className="mt-8 flex gap-1 justify-center w-24">
            {loadingMessages.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === loadingStep ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      ) : !guidance ? (
        /* Onboarding On-Page Form */
        <div className="glass-card p-8 animate-slide-up delay-100 max-w-4xl mx-auto">
          <h2 className="text-xl font-black text-slate-850 dark:text-white mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            <span>Confirm Your Career Profile</span>
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g. React, Java, Python, SQL, Git"
                  className="input py-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Interests (comma separated)
                </label>
                <input
                  type="text"
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  placeholder="e.g. AI/ML, Web Development, Design, Cybersecurity"
                  className="input py-2.5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  College / Institution
                </label>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  placeholder="e.g. Stanford University"
                  className="input py-2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department / Major
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science"
                  className="input py-2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Graduation Year
                </label>
                <input
                  type="number"
                  name="graduationYear"
                  value={formData.graduationYear}
                  onChange={handleChange}
                  placeholder="e.g. 2026"
                  className="input py-2.5"
                  min="2000"
                  max="2100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Career Goals
              </label>
              <textarea
                name="careerGoals"
                value={formData.careerGoals}
                onChange={handleChange}
                placeholder="e.g. I want to work as a Full-Stack Engineer at a high-growth startup, or eventually build my own SaaS product in the AI space."
                rows={3}
                className="input py-2.5 resize-none"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="saveToProfile"
                name="saveToProfile"
                checked={formData.saveToProfile}
                onChange={handleChange}
                className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="saveToProfile" className="text-sm font-medium text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                Save updates back to my main profile
              </label>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all duration-150 active:scale-98"
            >
              <Sparkles className="w-5 h-5 text-white" />
              <span>Generate Career Blueprint</span>
            </button>
          </form>
        </div>
      ) : (
        /* Results Section */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Navigation Tab Panel */}
          <div className="lg:col-span-1 glass-card p-4 space-y-1 animate-slide-up">
            {[
              { id: 'paths', label: 'Career Paths', icon: Compass },
              { id: 'skills', label: 'Skills Gap Radar', icon: Code },
              { id: 'roadmap', label: 'Learning Roadmap', icon: GraduationCap },
              { id: 'projects', label: 'Portfolio Projects', icon: Target },
              { id: 'certifications', label: 'Certifications', icon: Award },
              { id: 'stories', label: 'Peer Stories', icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Details Content Box */}
          <div className="lg:col-span-3 space-y-6 animate-slide-up delay-75">
            
            {/* Tab: Career Paths */}
            {activeTab === 'paths' && (
              <div className="space-y-4">
                {guidance.careerPaths?.map((path, idx) => (
                  <div key={idx} className="glass-card p-6 border-l-4 border-l-indigo-500 hover:shadow-brand-md transition-shadow duration-200">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-850 dark:text-white">{path.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Outlook: <span className="text-indigo-500 font-bold">{path.outlook}</span></p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-black">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{path.matchRelevance}% Match</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed mb-4">
                      {renderKeypoints(path.description)}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Target Entry Roles</h4>
                        <div className="flex flex-wrap gap-2">
                          {path.entryRoles?.map((role, rIdx) => (
                            <span key={rIdx} className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-100 dark:border-slate-700">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>

                      {path.referenceLinks && path.referenceLinks.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">References & Jobs</h4>
                          <div className="flex flex-wrap gap-2">
                            {path.referenceLinks.map((link, lIdx) => (
                              <a
                                key={lIdx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold border border-indigo-100 dark:border-indigo-900/30 transition-all hover:-translate-y-0.5 active:scale-95"
                              >
                                <span>{link.title}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Skills Radar */}
            {activeTab === 'skills' && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-black text-slate-850 dark:text-white mb-4">Skills Gap Analysis</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Here is an evaluation of your current skills compared against standard requirements for your target paths:
                </p>
                
                <div className="space-y-4">
                  {guidance.skillsAnalysis?.map((skill, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Code className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{skill.skillName}</h4>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {renderKeypoints(skill.reason)}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold w-fit flex-shrink-0 ${getStatusBadgeClass(skill.status)}`}>
                        {skill.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Roadmap */}
            {activeTab === 'roadmap' && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h3 className="text-lg font-black text-slate-850 dark:text-white mb-1">Interactive Learning Roadmap</h3>
                  <p className="text-xs text-slate-400">Structured timeline curated by AI to fill gaps and reach your target milestone.</p>
                </div>
                
                <div className="relative pl-6 border-l-2 border-indigo-150 dark:border-indigo-900/40 space-y-8 ml-4">
                  {guidance.roadmap?.map((stage, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-950/50 flex items-center justify-center">
                        <CheckCircle className="w-2.5 h-2.5 text-white" />
                      </span>
                      
                      <div className="glass-card p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <h4 className="text-lg font-bold text-slate-800 dark:text-white">{stage.stage}</h4>
                          <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-black">
                            {stage.duration}
                          </span>
                        </div>

                        {/* Topics */}
                        <div className="mb-4">
                          <h5 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Key Areas</h5>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {stage.topics?.map((topic, tIdx) => (
                              <li key={tIdx} className="flex items-center gap-2 text-slate-600 dark:text-slate-350">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <span>{topic}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Resources */}
                        {stage.resources && stage.resources.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50">
                            <h5 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Suggested Free Resources</h5>
                            <div className="flex flex-wrap gap-2">
                              {stage.resources.map((res, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-450 rounded-lg text-xs border border-slate-100 dark:border-slate-700"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{res}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Project Lab */}
            {activeTab === 'projects' && (
              <div className="space-y-4">
                {guidance.projects?.map((project, idx) => (
                  <div key={idx} className="glass-card p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white">{project.title}</h4>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${getDifficultyBadgeClass(project.difficulty)}`}>
                        {project.difficulty}
                      </span>
                    </div>

                    <div className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed mb-4">
                      {renderKeypoints(project.description)}
                    </div>

                    <div>
                      <h5 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Core Skills Developed</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {project.skillsAddressed?.map((skill, sIdx) => (
                          <span key={sIdx} className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-full text-xs border border-indigo-100 dark:border-indigo-900/30">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Certifications */}
            {activeTab === 'certifications' && (
              <div className="glass-card p-6">
                <h3 className="text-lg font-black text-slate-850 dark:text-white mb-1">Recommended Professional Certifications</h3>
                <p className="text-xs text-slate-400 mb-6">Credential guidelines to bolster your resume and demonstrate subject mastery.</p>
                
                <div className="space-y-4">
                  {guidance.certifications?.map((cert, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Award className="w-5 h-5 text-purple-650 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{cert.name}</h4>
                          <p className="text-xs text-slate-400 font-semibold">{cert.provider}</p>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                            {renderKeypoints(cert.description)}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                        cert.relevance.toLowerCase() === 'high'
                          ? 'bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-455'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {cert.relevance} Relevance
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Relevant Stories */}
            {activeTab === 'stories' && (
              <div className="space-y-4 animate-slide-up">
                <div className="glass-card p-6">
                  <h3 className="text-lg font-black text-slate-850 dark:text-white mb-1">Platform Guidance & Success Stories</h3>
                  <p className="text-xs text-slate-400">Learn from actual experiences shared by fellow students and professionals on the Connect network.</p>
                </div>
                
                {guidance.relevantStories && guidance.relevantStories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {guidance.relevantStories.map((story) => (
                      <div
                        key={story.id}
                        onClick={() => navigate(`/blog/${story.id}`)}
                        className="glass-card p-5 cursor-pointer hover:shadow-brand-md transition-all duration-200 border border-slate-100 dark:border-slate-800/80 hover:-translate-y-0.5 group flex flex-col justify-between min-h-[160px]"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-405 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-900/35">
                              {story.category || 'Technology'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {story.readingTime ? `${story.readingTime} min read` : 'Quick read'}
                            </span>
                          </div>
                          
                          <h4 className="text-base font-bold text-slate-850 dark:text-white group-hover:text-indigo-500 transition-colors duration-150 line-clamp-2">
                            {story.title}
                          </h4>
                          
                          {story.subtitle && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {story.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-50 dark:border-slate-800/80">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center overflow-hidden">
                              {story.author?.profilePicture ? (
                                <img src={story.author.profilePicture} alt={story.author.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{story.author?.name?.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              {story.author?.name}
                            </span>
                          </div>
                          
                          <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-0.5 hover:underline">
                            Read Story <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-card p-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-400 animate-bounce" />
                    <p className="text-sm font-semibold">No relevant stories found in platform directory</p>
                    <p className="text-xs mt-1">Check back later or search blogs in the navigation feed!</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default CareerAgentPage;
