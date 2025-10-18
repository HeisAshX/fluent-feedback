import React, { useState, useEffect } from 'react';
import { ThumbsUp, MessageSquare, TrendingUp, Sparkles, X, Zap, Search, Filter, Clock, CheckCircle, PlayCircle, AlertCircle, GitPullRequest, Shield, Twitter, ExternalLink, User, Trash2, Calendar, Heart } from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC4cS0uIZRHhOjUegMY5TVbcRl2UW5Cfjc",
  authDomain: "feedback-fc0c8.firebaseapp.com",
  databaseURL: "https://feedback-fc0c8-default-rtdb.firebaseio.com",
  projectId: "feedback-fc0c8",
  storageBucket: "feedback-fc0c8.firebasestorage.app",
  messagingSenderId: "285950217153",
  appId: "1:285950217153:web:103beb18034e34711d7d40"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function FluentFeedback() {
  // Load initial data from Firebase
  const [feedback, setFeedback] = useState([]);
  const [newFeedback, setNewFeedback] = useState({ 
    title: '', 
    description: '', 
    author: '', 
    category: 'Feature',
    status: 'under_review',
    tweetUrl: '',
    twitterHandle: ''
  });
  const [votedItems, setVotedItems] = useState(() => {
    const saved = localStorage.getItem('fluent-voted-items');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRateLimitError, setShowRateLimitError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('votes');

  // Enhanced Voting States
  const [voteAnimations, setVoteAnimations] = useState({});
  const [pulseAnimations, setPulseAnimations] = useState({});

  // Admin and User Management
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('fluent-admin-mode') === 'true';
  });
  const [currentUser, setCurrentUser] = useState('anonymous');

  // Rate limiting state
  const [userSubmissions, setUserSubmissions] = useState(() => {
    const saved = localStorage.getItem('fluent-user-submissions');
    return saved ? JSON.parse(saved) : {};
  });

  // Status system
  const statusOptions = [
    { value: 'under_review', label: 'Under Review', icon: Clock, color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
    { value: 'planned', label: 'Planned', icon: GitPullRequest, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    { value: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-500/10 text-green-400 border-green-500/30' },
    { value: 'rejected', label: 'Rejected', icon: AlertCircle, color: 'bg-red-500/10 text-red-400 border-red-500/30' }
  ];

  // Load feedback from Firebase in real-time
  useEffect(() => {
    setLoading(true);
    
    let feedbackQuery;
    if (sortBy === 'votes') {
      feedbackQuery = query(collection(db, 'feedback'), orderBy('votes', 'desc'));
    } else if (sortBy === 'newest') {
      feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    } else {
      feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'asc'));
    }
    
    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      const feedbackData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFeedback(feedbackData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading feedback:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sortBy]);

  // Save votes and submissions to localStorage
  useEffect(() => {
    localStorage.setItem('fluent-voted-items', JSON.stringify([...votedItems]));
  }, [votedItems]);

  useEffect(() => {
    localStorage.setItem('fluent-user-submissions', JSON.stringify(userSubmissions));
  }, [userSubmissions]);

  // Save admin mode
  useEffect(() => {
    localStorage.setItem('fluent-admin-mode', isAdmin.toString());
  }, [isAdmin]);

  // Keyboard shortcut for admin mode
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'h') {
        e.preventDefault();
        setIsAdmin(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Check if user can submit feedback
  const canUserSubmit = (author) => {
    // Silent bypass for heisashx
    if (author && (author.toLowerCase().includes('heisashx') || 
        author.toLowerCase().includes('x.com/heisashx'))) {
      return true;
    }
    
    if (!author || author === 'anonymous') return true;
    
    const userKey = author.toLowerCase();
    const lastSubmission = userSubmissions[userKey];
    
    if (!lastSubmission) return true;
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return lastSubmission < oneWeekAgo;
  };

  // Get time until user can submit again
  const getTimeUntilNextSubmission = (author) => {
    // Silent bypass for heisashx
    if (author && (author.toLowerCase().includes('heisashx') || 
        author.toLowerCase().includes('x.com/heisashx'))) {
      return null;
    }
    
    if (!author || author === 'anonymous') return null;
    
    const userKey = author.toLowerCase();
    const lastSubmission = userSubmissions[userKey];
    
    if (!lastSubmission) return null;
    
    const nextSubmissionTime = lastSubmission + (7 * 24 * 60 * 60 * 1000);
    const timeLeft = nextSubmissionTime - Date.now();
    
    if (timeLeft <= 0) return null;
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days, hours };
  };

  // FIXED: Enhanced Voting with Animations
  const handleVote = async (id) => {
    if (votedItems.has(id)) {
      setPulseAnimations(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setPulseAnimations(prev => ({ ...prev, [id]: false })), 600);
      return;
    }
    
    setVoteAnimations(prev => ({ ...prev, [id]: true }));
    
    try {
      const feedbackRef = doc(db, 'feedback', id);
      const currentItem = feedback.find(item => item.id === id);
      await updateDoc(feedbackRef, {
        votes: (currentItem.votes || 0) + 1
      });
      
      setVotedItems(new Set([...votedItems, id]));
    } catch (error) {
      console.error('Error updating vote:', error);
    }
    
    setTimeout(() => setVoteAnimations(prev => ({ ...prev, [id]: false })), 600);
  };

  // Status change handler
  const handleStatusChange = async (id, newStatus) => {
    if (!isAdmin) return;
    
    try {
      const feedbackRef = doc(db, 'feedback', id);
      await updateDoc(feedbackRef, {
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Delete feedback handler
  const handleDeleteFeedback = async (id) => {
    if (!isAdmin) return;
    
    if (window.confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      try {
        const feedbackRef = doc(db, 'feedback', id);
        await deleteDoc(feedbackRef);
      } catch (error) {
        console.error('Error deleting feedback:', error);
      }
    }
  };

  // Extract Twitter handle from tweet URL
  const extractTwitterHandle = (tweetUrl) => {
    if (!tweetUrl) return '';
    
    try {
      const url = new URL(tweetUrl);
      const pathParts = url.pathname.split('/');
      if (pathParts.length > 1 && pathParts[1]) {
        return `@${pathParts[1]}`;
      }
    } catch (error) {
      console.error('Invalid tweet URL:', error);
    }
    
    return '';
  };

  // Handle tweet URL input and auto-fill Twitter handle
  const handleTweetUrlChange = (url) => {
    const twitterHandle = extractTwitterHandle(url);
    setNewFeedback({
      ...newFeedback,
      tweetUrl: url,
      twitterHandle: twitterHandle
    });
  };

  // FIXED: Submit feedback with proper success flow
  const handleSubmit = async () => {
    if (!newFeedback.title.trim() || !newFeedback.description.trim()) return;
    
    const authorName = newFeedback.author.trim() || 'anonymous';
    
    // Check rate limiting for non-anonymous users
    if (authorName !== 'anonymous' && !canUserSubmit(authorName)) {
      setShowRateLimitError(true);
      setTimeout(() => setShowRateLimitError(false), 5000);
      return;
    }
    
    try {
      const item = {
        ...newFeedback,
        votes: 0,
        author: authorName,
        createdAt: Date.now(),
        twitterHandle: newFeedback.twitterHandle || extractTwitterHandle(newFeedback.tweetUrl)
      };
      
      await addDoc(collection(db, 'feedback'), item);
      
      // Update rate limiting for non-anonymous users
      if (authorName !== 'anonymous') {
        setUserSubmissions(prev => ({
          ...prev,
          [authorName.toLowerCase()]: Date.now()
        }));
      }
      
      // FIXED: Show success first, then close modal
      setShowSuccess(true);
      
      setNewFeedback({ 
        title: '', 
        description: '', 
        author: '', 
        category: 'Feature', 
        status: 'under_review',
        tweetUrl: '',
        twitterHandle: ''
      });
      
      setCurrentUser(authorName);
      
      // Close modal after showing success
      setTimeout(() => {
        setShowModal(false);
        setTimeout(() => setShowSuccess(false), 3000);
      }, 1000);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    }
  };

  // Enhanced filtering
  const filteredAndSortedFeedback = [...feedback]
    .filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.twitterHandle && item.twitterHandle.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-black to-blue-950/20" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
              </div>
              <span className="text-sm text-gray-500 uppercase tracking-wider font-mono">Community Voice</span>
            </div>
            
            {/* Admin Indicator */}
            <div className="flex items-center gap-4">
              {currentUser !== 'anonymous' && (
                <span className="text-sm text-gray-400 font-mono">
                  Hello, <span className="text-purple-400">{currentUser}</span>
                </span>
              )}
              {isAdmin && (
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-400 font-mono">Admin Mode</span>
                  <button
                    onClick={() => setIsAdmin(false)}
                    className="text-purple-400 hover:text-purple-300 text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <h1 className="text-7xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
            Feedback Friday Portal
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mb-8">
            Share your ideas on X, then bring them here to track progress. Together we build Fluent.
          </p>
          
          {/* Rate Limit Info */}
          {currentUser !== 'anonymous' && !canUserSubmit(currentUser) && (
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-yellow-400 font-medium">Weekly Submission Limit Reached</p>
                  <p className="text-yellow-500 text-sm">
                    You can submit again in{' '}
                    {(() => {
                      const timeLeft = getTimeUntilNextSubmission(currentUser);
                      if (timeLeft) {
                        return `${timeLeft.days}d ${timeLeft.hours}h`;
                      }
                      return 'a few moments';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <button
              onClick={() => setShowModal(true)}
              disabled={currentUser !== 'anonymous' && !canUserSubmit(currentUser)}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-xl font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 blur transition-opacity disabled:opacity-0" />
              <div className="relative flex items-center gap-3">
                <Sparkles className="w-6 h-6 animate-spin" style={{animationDuration: '3s'}} />
                Submit Your Feedback
                <Zap className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
            
            {/* Twitter CTA */}
            <a
              href="https://twitter.com/intent/tweet?text=Shaping%20the%20future%20of%20%40Fluent%20with%20community%20feedback!%20Share%20your%20ideas%20and%20let's%20build%20together%20%F0%9F%9A%80&url=https://fluent.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-blue-400 opacity-0 group-hover:opacity-100 blur transition-opacity" />
              <div className="relative flex items-center gap-3">
                <Twitter className="w-6 h-6" />
                Share on X
                <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          </div>
        </div>

        {/* FIXED: Success Toast - now shows properly */}
        {showSuccess && (
          <div className="fixed top-8 right-8 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl shadow-green-500/50 flex items-center gap-3 animate-pulse z-50">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">Feedback submitted successfully!</span>
          </div>
        )}

        {/* Rate Limit Error Toast */}
        {showRateLimitError && (
          <div className="fixed top-8 right-8 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-xl shadow-2xl shadow-yellow-500/50 flex items-center gap-3 animate-pulse z-50">
            <Calendar className="w-5 h-5" />
            <div>
              <span className="font-semibold">Weekly Limit Reached</span>
              <p className="text-sm opacity-90">
                You can submit again in{' '}
                {(() => {
                  const timeLeft = getTimeUntilNextSubmission(newFeedback.author.trim() || currentUser);
                  if (timeLeft) {
                    return `${timeLeft.days}d ${timeLeft.hours}h`;
                  }
                  return 'a few moments';
                })()}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 p-8 animate-scale-in">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl blur-xl" />
              
              <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-7 h-7 text-purple-400" />
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                      Submit Feedback
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  >
                    <X className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:rotate-90 transition-all" />
                  </button>
                </div>
                
                {/* Rate Limit Warning */}
                {newFeedback.author.trim() && !canUserSubmit(newFeedback.author.trim()) && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>
                        You've already submitted feedback this week. Next submission in{' '}
                        {(() => {
                          const timeLeft = getTimeUntilNextSubmission(newFeedback.author.trim());
                          if (timeLeft) {
                            return `${timeLeft.days}d ${timeLeft.hours}h`;
                          }
                          return 'a few moments';
                        })()}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Form */}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="username or anon"
                        value={newFeedback.author}
                        onChange={(e) => setNewFeedback({...newFeedback, author: e.target.value})}
                        className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none transition-all font-mono text-sm group-hover:border-purple-500/50"
                      />
                      <div className="absolute inset-0 bg-purple-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    </div>
                    
                    <div className="relative group">
                      <select
                        value={newFeedback.category}
                        onChange={(e) => setNewFeedback({...newFeedback, category: e.target.value})}
                        className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none transition-all font-mono text-sm group-hover:border-purple-500/50"
                      >
                        <option>Feature</option>
                        <option>Bug</option>
                        <option>Developer Experience</option>
                        <option>Infrastructure</option>
                        <option>Documentation</option>
                      </select>
                      <div className="absolute inset-0 bg-blue-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    </div>
                  </div>
                  
                  {/* Twitter Integration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group">
                      <div className="flex items-center gap-2 mb-2">
                        <Twitter className="w-4 h-4 text-blue-400" />
                        <label className="text-sm text-gray-400 font-mono">Tweet URL (Optional)</label>
                      </div>
                      <input
                        type="url"
                        placeholder="https://twitter.com/username/status/1234567890"
                        value={newFeedback.tweetUrl}
                        onChange={(e) => handleTweetUrlChange(e.target.value)}
                        className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-all font-mono text-sm group-hover:border-blue-500/50"
                      />
                      <div className="absolute inset-0 bg-blue-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    </div>
                    
                    <div className="relative group">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-blue-400" />
                        <label className="text-sm text-gray-400 font-mono">X Handle</label>
                      </div>
                      <input
                        type="text"
                        placeholder="@username"
                        value={newFeedback.twitterHandle}
                        onChange={(e) => setNewFeedback({...newFeedback, twitterHandle: e.target.value})}
                        className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-all font-mono text-sm group-hover:border-blue-500/50"
                      />
                      <div className="absolute inset-0 bg-blue-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Feedback title"
                      value={newFeedback.title}
                      onChange={(e) => setNewFeedback({...newFeedback, title: e.target.value})}
                      className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none transition-all group-hover:border-purple-500/50"
                    />
                    <div className="absolute inset-0 bg-purple-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                  </div>
                  
                  <div className="relative group">
                    <textarea
                      placeholder="Describe your feedback in detail..."
                      value={newFeedback.description}
                      onChange={(e) => setNewFeedback({...newFeedback, description: e.target.value})}
                      rows="5"
                      className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none transition-all resize-none group-hover:border-purple-500/50"
                    />
                    <div className="absolute inset-0 bg-blue-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!newFeedback.title.trim() || !newFeedback.description.trim() || (newFeedback.author.trim() && !canUserSubmit(newFeedback.author.trim()))}
                    className="w-full relative group bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 opacity-0 group-hover:opacity-50 blur transition-opacity" />
                    <div className="relative flex items-center justify-center gap-3">
                      <Sparkles className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                      Submit to Network
                      <Zap className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rest of your existing UI code remains exactly the same */}
        {/* ... (keeping the same search, filter, and feedback list code) ... */}

      </div>
    </div>
  );
}