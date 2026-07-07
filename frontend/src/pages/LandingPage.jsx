import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  BookOpen,
  Users,
  Award,
  TrendingUp,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  // Scroll reveal effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <BookOpen className="w-6 h-6 text-primary-500" />,
      title: 'Real Stories',
      description: 'Read authentic placement and internship experiences from seniors.',
      gradient: 'from-blue-50 to-indigo-50',
      iconBg: 'bg-blue-100',
    },
    {
      icon: <Users className="w-6 h-6 text-violet-500" />,
      title: 'Community Learning',
      description: 'Connect with peers, ask questions, and learn from the community.',
      gradient: 'from-violet-50 to-purple-50',
      iconBg: 'bg-violet-100',
    },
    {
      icon: <Award className="w-6 h-6 text-pink-500" />,
      title: 'Career Guidance',
      description: 'Get insights on DSA, development, resume building, and more.',
      gradient: 'from-pink-50 to-rose-50',
      iconBg: 'bg-pink-100',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-amber-500" />,
      title: 'Stay Updated',
      description: 'Follow trends, company insights, and success stories.',
      gradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-amber-100',
    },
  ];

  const categories = [
    'Placement', 'Internship', 'DSA', 'Development',
    'Resume', 'Open Source', 'Projects', 'Higher Studies',
    'Career Advice', 'Success Stories', 'Hackathons',
  ];

  const stats = [
    { value: '10K+', label: 'Students' },
    { value: '500+', label: 'Stories' },
    { value: '50+', label: 'Companies' },
    { value: '4.9★', label: 'Rating' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--clr-bg)' }}>

      {/* ── Navigation ─────────────────────────── */}
      <nav className="navbar-glass fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand-sm">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-black gradient-text tracking-tight">Connect</span>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link
                  to="/home"
                  className="btn btn-primary animate-fade-in"
                >
                  Go to Feed <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors px-3 py-2"
                  >
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-primary text-sm">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────── */}
      <section className="hero-gradient pt-36 pb-24 px-4 overflow-hidden relative">
        {/* Decorative orbs */}
        <div
          className="absolute top-20 right-[10%] w-80 h-80 rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute bottom-0 left-[5%] w-60 h-60 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)', filter: 'blur(50px)' }}
        />

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 border border-primary-100 dark:border-primary-900/40 shadow-brand-sm mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              #1 Career Platform for Students
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 animate-slide-up leading-tight">
            Learn from{' '}
            <span className="gradient-text">Seniors.</span>
            <br />
            Build Your{' '}
            <span className="gradient-text-pink">Future.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 animate-slide-up delay-100 leading-relaxed">
            Connect is the ultimate career guidance platform where final-year students
            and graduates share their journey, experiences, and advice.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-200">
            <Link to="/home" className="btn btn-primary text-base px-8 py-3.5 rounded-2xl">
              Explore Blogs
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register" className="btn btn-outline text-base px-8 py-3.5 rounded-2xl">
              Start Writing
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-6 mt-16 animate-slide-up delay-300">
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center px-6 py-4 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-brand-sm border border-white/60 dark:border-slate-700 min-w-[90px]"
              >
                <span className="text-2xl font-black gradient-text">{s.value}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 mb-4">
              <Star className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">Why Choose Us</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black">
              Why <span className="gradient-text">Connect?</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-xl mx-auto">
              Everything you need to navigate your career journey, all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`card p-7 text-center reveal delay-${(index + 1) * 100}`}
              >
                <div className={`feature-icon-wrap mx-auto ${feature.iconBg}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories Section ───────────────────── */}
      <section className="py-24 px-4" style={{ backgroundColor: 'var(--clr-surface-2)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 reveal">
            <h2 className="text-4xl font-black">
              Popular <span className="gradient-text">Categories</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3">
              Browse content tailored to your career needs
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 reveal">
            {categories.map((category, index) => (
              <span key={index} className="category-pill">
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────── */}
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-violet-600 to-pink-500" />
        <div
          className="absolute top-0 left-0 w-full h-full opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="max-w-3xl mx-auto text-center text-white relative reveal">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 mb-6">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-semibold">Free to join. Always.</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl mb-10 text-white/80 leading-relaxed">
            Join thousands of students learning from real experiences and building their careers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-600 font-bold px-8 py-3.5 rounded-2xl hover:bg-gray-50 transition-all duration-200 hover:-translate-y-1 shadow-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/home"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-2xl border border-white/30 transition-all duration-200 hover:-translate-y-1"
            >
              Browse Stories
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────── */}
      <footer style={{ backgroundColor: '#0f0a1e' }} className="text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-black gradient-text">Connect</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Learn from seniors. Build your future. The community for ambitious students.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Platform</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link to="/home" className="hover:text-primary-400 transition-colors">Explore</Link></li>
                <li><Link to="/create" className="hover:text-primary-400 transition-colors">Write</Link></li>
                <li><Link to="/bookmarks" className="hover:text-primary-400 transition-colors">Bookmarks</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Resources</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-primary-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Connect</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-primary-400 transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">LinkedIn</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} Connect. All rights reserved.</p>
            <p>Made with <span className="text-pink-400">♥</span> for students</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;