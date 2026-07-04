import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import userService from '../services/userService';
import toast from 'react-hot-toast';
import { User, Mail, Building, GraduationCap, Github, Linkedin, Info, Tag, UserCog, Sparkles, ArrowLeft, Calendar, Upload, Image, Heart, Target } from 'lucide-react';

const ProfileEditPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    college: '',
    department: '',
    graduationYear: '',
    bio: '',
    skills: '',
    interests: '',
    careerGoals: '',
    github: '',
    linkedin: '',
    profilePicture: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        college: user.college || '',
        department: user.department || '',
        graduationYear: user.graduationYear || '',
        bio: user.bio || '',
        skills: user.skills || '',
        interests: user.interests || '',
        careerGoals: user.careerGoals || '',
        github: user.github || '',
        linkedin: user.linkedin || '',
        profilePicture: user.profilePicture || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profilePicture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (formData.github && !isValidUrl(formData.github)) {
      newErrors.github = 'Invalid GitHub URL';
    }
    if (formData.linkedin && !isValidUrl(formData.linkedin)) {
      newErrors.linkedin = 'Invalid LinkedIn URL';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await userService.updateProfile(formData);
      setUser(response.data);
      toast.success('Profile updated successfully!');
      navigate(`/profile/${user.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">

      {/* ─── Animated Page Header ─── */}
      <div className="glass-card p-7 mb-8 relative overflow-hidden animate-slide-up">
        <div aria-hidden="true" className="absolute -top-14 -right-14 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div aria-hidden="true" className="absolute -bottom-10 left-1/4 w-32 h-32 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <UserCog className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="gradient-badge flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Profile
              </span>
            </div>
            <h1 className="text-3xl font-black">
              <span className="gradient-text">Edit </span>
              <span className="text-[var(--clr-text-primary)]">Profile</span>
            </h1>
            <p className="text-sm text-[var(--clr-text-secondary)] mt-1">
              Update your personal information and professional details
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card p-7 animate-slide-up delay-100">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 mb-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Profile Picture
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Avatar Preview */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-900/50 shadow-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 relative group">
                {formData.profilePicture ? (
                  <img src={formData.profilePicture} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-white">
                    {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex flex-wrap gap-2.5">
                  <label className="btn-primary cursor-pointer px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow transition-all duration-150">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {formData.profilePicture && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, profilePicture: '' }))}
                      className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl hover:text-rose-500 transition-all duration-150"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div>
                  <label htmlFor="profilePicture" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Or paste image URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Image className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="profilePicture"
                      type="url"
                      name="profilePicture"
                      value={formData.profilePicture.startsWith('data:') ? '' : formData.profilePicture}
                      onChange={handleChange}
                      className="input pl-9 py-1.5 text-xs rounded-xl"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="college" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                College
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="college"
                  name="college"
                  type="text"
                  value={formData.college}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Your College Name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GraduationCap className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Computer Science"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Year of Passing / Year Studied
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="graduationYear"
                name="graduationYear"
                type="number"
                value={formData.graduationYear}
                onChange={handleChange}
                className="input pl-10"
                placeholder="2026"
                min="1900"
                max="2100"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <Info className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="input pl-10 resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label htmlFor="skills" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Skills (comma separated)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Tag className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="skills"
                name="skills"
                type="text"
                value={formData.skills}
                onChange={handleChange}
                className="input pl-10"
                placeholder="React, Java, Spring Boot, Python"
              />
            </div>
          </div>

          {/* Interests */}
          <div>
            <label htmlFor="interests" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Career Interests (comma separated)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Heart className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="interests"
                name="interests"
                type="text"
                value={formData.interests}
                onChange={handleChange}
                className="input pl-10"
                placeholder="Web Development, Artificial Intelligence, Cybersecurity"
              />
            </div>
          </div>

          {/* Career Goals */}
          <div>
            <label htmlFor="careerGoals" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Career Goals
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <Target className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                id="careerGoals"
                name="careerGoals"
                value={formData.careerGoals}
                onChange={handleChange}
                rows={3}
                className="input pl-10 resize-none"
                placeholder="Describe your long-term career aspirations (e.g., Become a Tech Lead, transition into Product Management, etc.)"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="github" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                GitHub URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Github className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="github"
                  name="github"
                  type="url"
                  value={formData.github}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.github ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="https://github.com/username"
                />
              </div>
              {errors.github && (
                <p className="mt-1 text-sm text-red-500">{errors.github}</p>
              )}
            </div>

            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                LinkedIn URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Linkedin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="linkedin"
                  name="linkedin"
                  type="url"
                  value={formData.linkedin}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.linkedin ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              {errors.linkedin && (
                <p className="mt-1 text-sm text-red-500">{errors.linkedin}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-8 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/profile/${user?.id}`)}
              className="btn-secondary px-8 py-3 text-base"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditPage;