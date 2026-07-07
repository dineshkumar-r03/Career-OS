import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, Building, Calendar } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    college: '',
    department: '',
    graduationYear: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const result = await register(formData);
    setLoading(false);

    if (result.success) {
      navigate('/home');
    }
  };

  return (
    <section className="auth-panel auth-panel-wide animate-slide-up">
      <div className="auth-header">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join the Connect community</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-fields">
          <div>
            <label htmlFor="name" className="auth-label">
              Full Name
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <User size={20} />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={`input auth-input ${errors.name ? 'auth-input-error' : ''}`}
                placeholder="John Doe"
              />
            </div>
            {errors.name && (
              <p className="auth-field-error">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="auth-label">
              Email Address
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <Mail size={20} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`input auth-input ${errors.email ? 'auth-input-error' : ''}`}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="auth-field-error">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <Lock size={20} />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className={`input auth-input auth-input-password ${errors.password ? 'auth-input-error' : ''}`}
                placeholder="********"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="auth-field-error">{errors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="college" className="auth-label">
              College (Optional)
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <Building size={20} />
              </div>
              <input
                id="college"
                name="college"
                type="text"
                value={formData.college}
                onChange={handleChange}
                className="input auth-input"
                placeholder="Your College Name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="department" className="auth-label">
              Department (Optional)
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <GraduationCap size={20} />
              </div>
              <input
                id="department"
                name="department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                className="input auth-input"
                placeholder="Computer Science"
              />
            </div>
          </div>

          <div>
            <label htmlFor="graduationYear" className="auth-label">
              Year of Passing / Year Studied (Optional)
            </label>
            <div className="auth-input-wrap">
              <div className="auth-input-icon">
                <Calendar size={20} />
              </div>
              <input
                id="graduationYear"
                name="graduationYear"
                type="number"
                value={formData.graduationYear}
                onChange={handleChange}
                className="input auth-input"
                placeholder="2026"
                min="1900"
                max="2100"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary auth-submit"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </button>

        <div className="auth-switch">
          <span>Already have an account? </span>
          <Link to="/login">Sign in</Link>
        </div>
      </form>
    </section>
  );
};

export default Register;
