import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBlog } from '../hooks/useBlog';
import { useAuth } from '../hooks/useAuth';
import { formatDate, calculateReadingTime } from '../utils/helpers';
import CommentList from '../components/comments/CommentList';
import CommentForm from '../components/comments/CommentForm';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  Clock,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import blogService from '../services/blogService';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

const BlogPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchBlog, incrementView, deleteBlog } = useBlog();
  const lastViewedId = useRef(null);
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(true);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    loadBlog();
    if (lastViewedId.current !== id) {
      incrementView(id);
      lastViewedId.current = id;
    }
  }, [id]);

  useEffect(() => {
    if (blog) {
      const blocks = document.querySelectorAll('.prose pre code');
      blocks.forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }, [blog]);

  const loadBlog = async () => {
    setLoading(true);
    try {
      const data = await fetchBlog(id);
      setBlog(data);
      setLikeCount(data.likeCount || 0);
      setCommentCount(data.commentCount || 0);
      setLiked(data.likedByCurrentUser || false);
      setBookmarked(data.bookmarkedByCurrentUser || false);
      try {
        const commentsResponse = await blogService.getComments(id, { page: 0, size: 10 });
        setComments(commentsResponse.data.content || []);
      } catch (error) {
        setComments([]);
      }
    } catch (error) {
      toast.error('Failed to load blog');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) { toast.error('Please login to like this blog'); return; }
    try {
      if (liked) {
        await blogService.unlikeBlog(id);
        setLikeCount(prev => prev - 1);
      } else {
        await blogService.likeBlog(id);
        setLikeCount(prev => prev + 1);
      }
      setLiked(!liked);
    } catch (error) {
      toast.error('Failed to update like');
    }
  };

  const handleBookmark = async () => {
    if (!user) { toast.error('Please login to bookmark this blog'); return; }
    try {
      if (bookmarked) {
        await blogService.unbookmarkBlog(id);
      } else {
        await blogService.bookmarkBlog(id);
      }
      setBookmarked(!bookmarked);
      toast.success(bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    } catch (error) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this blog?')) {
      try {
        await deleteBlog(id);
        toast.success('Blog deleted successfully');
        navigate('/home');
      } catch (error) {
        toast.error('Failed to delete blog');
      }
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: blog.title, text: blog.subtitle || 'Check out this blog on Connect', url: window.location.href });
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="glass-card p-8 animate-pulse space-y-5">
          <div className="skeleton h-8 w-3/4 rounded-xl" />
          <div className="skeleton h-5 w-1/2 rounded-xl" />
          <div className="skeleton h-64 rounded-2xl" />
          <div className="space-y-3">
            <div className="skeleton h-4 rounded-lg" />
            <div className="skeleton h-4 w-5/6 rounded-lg" />
            <div className="skeleton h-4 w-4/5 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!blog) return null;

  const isAuthor = user?.id === blog.author?.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[var(--clr-text-secondary)] hover:text-indigo-600 transition-all duration-200 mb-6 group glass px-4 py-2 rounded-full text-sm font-medium hover:-translate-x-1"
      >
        <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        <span>Back</span>
      </button>

      {/* ─── Blog Header card ─── */}
      <div className="glass-card p-7 mb-6 relative overflow-hidden animate-slide-up">
        {/* Decorative top-right glow */}
        <div
          aria-hidden="true"
          className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        />

        {/* Category + meta row */}
        <div className="flex flex-wrap items-center gap-3 mb-4 relative z-10">
          <span className="gradient-badge flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {blog.category || 'General'}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--clr-text-muted)] bg-white/60 dark:bg-white/5 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/40">
            <Clock className="w-3.5 h-3.5" />
            {calculateReadingTime(blog.content)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--clr-text-muted)] bg-white/60 dark:bg-white/5 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/40">
            <Eye className="w-3.5 h-3.5" />
            {blog.viewCount || 0} views
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--clr-text-primary)] mb-3 leading-tight relative z-10">
          {blog.title}
        </h1>
        {blog.subtitle && (
          <p className="text-lg text-[var(--clr-text-secondary)] mb-5 relative z-10">{blog.subtitle}</p>
        )}

        {/* Author row */}
        <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 glow-ring flex-shrink-0">
              {blog.author?.profilePicture ? (
                <img src={blog.author.profilePicture} alt={blog.author.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-white font-bold text-base">
                  {blog.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-[var(--clr-text-primary)]">
                {blog.author?.name || 'Unknown Author'}
              </p>
              <p className="text-sm text-[var(--clr-text-muted)]">
                {formatDate(blog.createdAt)}
              </p>
            </div>
          </div>

          {isAuthor && (
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/edit/${blog.id}`)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all duration-200 hover:-translate-y-0.5"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all duration-200 hover:-translate-y-0.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cover Image */}
      {blog.coverImage && (
        <div className="mb-6 rounded-2xl overflow-hidden glass-card animate-slide-up delay-100">
          <img src={blog.coverImage} alt={blog.title} className="w-full h-auto object-cover" />
        </div>
      )}

      {/* Blog Content */}
      <div className="glass-card p-7 mb-6 animate-slide-up delay-200">
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: blog.content }} />
        </div>
      </div>

      {/* Tags */}
      {blog.tags && (
        <div className="flex flex-wrap gap-2 mb-6 animate-slide-up delay-200">
          {blog.tags.split(',').map((tag, index) => (
            <span
              key={index}
              className="px-3.5 py-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-sm text-[var(--clr-text-secondary)] border border-white/50 dark:border-white/10 rounded-full text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 cursor-pointer"
            >
              #{tag.trim()}
            </span>
          ))}
        </div>
      )}

      {/* ─── Glassmorphism Action Bar ─── */}
      <div className="flex items-center justify-center mb-8 animate-slide-up delay-300">
        <div className="glass-action-bar">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              liked
                ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'
                : 'text-[var(--clr-text-secondary)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
            }`}
          >
            <Heart className={`w-5 h-5 transition-all duration-200 ${liked ? 'fill-current scale-110' : ''}`} />
            <span>{likeCount}</span>
          </button>

          <div className="w-px h-6 bg-[var(--clr-border)] mx-1" />

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-[var(--clr-text-secondary)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentCount}</span>
          </button>

          <div className="w-px h-6 bg-[var(--clr-border)] mx-1" />

          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
              bookmarked
                ? 'text-violet-600 bg-violet-50 dark:bg-violet-900/20'
                : 'text-[var(--clr-text-secondary)] hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20'
            }`}
          >
            <Bookmark className={`w-5 h-5 transition-all duration-200 ${bookmarked ? 'fill-current scale-110' : ''}`} />
            <span>{bookmarked ? 'Saved' : 'Save'}</span>
          </button>

          <div className="w-px h-6 bg-[var(--clr-border)] mx-1" />

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-[var(--clr-text-secondary)] hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all duration-200"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="glass-card p-7 animate-slide-up delay-400">
          <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-500" />
            <span className="gradient-text">Comments</span>
            <span className="glass px-2.5 py-0.5 text-sm font-semibold text-[var(--clr-text-secondary)] rounded-full">
              {commentCount}
            </span>
          </h3>
          <CommentForm
            blogId={blog.id}
            onCommentAdded={(newComment) => {
              setComments([newComment, ...comments]);
              setCommentCount(prev => prev + 1);
            }}
          />
          <div className="mt-6">
            <CommentList
              comments={comments}
              blogId={blog.id}
              onCommentDeleted={() => { loadBlog(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPage;