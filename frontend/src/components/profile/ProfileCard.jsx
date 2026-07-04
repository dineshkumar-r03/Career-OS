import React from 'react';
import { MapPin, GraduationCap, Github, Linkedin, Mail, Users, BookOpen, Heart, MessageSquare, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProfileCard = ({ user, isOwnProfile, onFollow, onUnfollow, isFollowing }) => {
  const { user: currentUser } = useAuth();

  return (
    <div className="card p-6">
      <div className="flex flex-col items-center text-center">
        {/* Profile Picture */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-primary-600">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          {isOwnProfile && (
            <Link
              to="/profile/edit"
              className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Link>
          )}
        </div>

        {/* Name and Bio */}
        <h2 className="text-2xl font-bold mt-4">{user?.name}</h2>
        {user?.bio && (
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md">{user.bio}</p>
        )}

        {/* Education */}
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {user?.college && (
            <span className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
              <GraduationCap className="w-4 h-4" />
              <span>{user.college}</span>
            </span>
          )}
          {user?.department && (
            <span className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
              <span>•</span>
              <span>{user.department}</span>
            </span>
          )}
          {user?.graduationYear && (
            <span className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
              <span>•</span>
              <span>Year of Passing: {user.graduationYear}</span>
            </span>
          )}
        </div>

        {/* Skills */}
        {user?.skills && (
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {user.skills.split(',').map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-sm"
              >
                {skill.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Interests */}
        {user?.interests && (
          <div className="mt-4 text-center">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Interests</h4>
            <div className="flex flex-wrap justify-center gap-1.5">
              {user.interests.split(',').map((interest, index) => (
                <span
                  key={index}
                  className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full text-xs font-semibold border border-purple-100 dark:border-purple-900/30"
                >
                  {interest.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Career Goals */}
        {user?.careerGoals && (
          <div className="mt-4 text-center px-2">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Career Goals</h4>
            <p className="text-sm italic text-slate-600 dark:text-slate-350 leading-relaxed">
              "{user.careerGoals}"
            </p>
          </div>
        )}

        {/* AI Career Guidance Button */}
        {isOwnProfile && (
          <Link
            to="/career-agent"
            className="mt-5 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
            <span>AI Career Guidance</span>
          </Link>
        )}

        {/* Social Links */}
        <div className="flex space-x-4 mt-4">
          {user?.github && (
            <a href={user.github} target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
          )}
          {user?.linkedin && (
            <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
          )}
          {user?.email && (
            <a href={`mailto:${user.email}`} className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-md mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{user?.followersCount || 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{user?.followingCount || 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Following</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{user?.blogsCount || 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Blogs</p>
          </div>
        </div>

        {/* Follow & Message Buttons */}
        {!isOwnProfile && currentUser && (
          <div className="flex gap-3 mt-4 w-full">
            <button
              onClick={isFollowing ? onUnfollow : onFollow}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex-1 text-sm ${
                isFollowing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'btn-primary'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <Link
              to={`/messages?user=${user?.id}`}
              className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex-1 text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;