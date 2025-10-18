import React, { useState, useEffect } from 'react';
import { ThumbsUp, MessageSquare, TrendingUp, Sparkles, X, Zap, Search, Filter, Clock, CheckCircle, PlayCircle, AlertCircle, GitPullRequest, Shield, Twitter, ExternalLink, User, Trash2, Calendar, Heart } from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';

// Your Firebase config - REPLACE WITH YOUR ACTUAL CONFIG
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

  // Rate limiting state (still local since it's per user)
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
    
    // Create query based on sort
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

  // CHANGED: Keyboard shortcut for admin mode (Ctrl+Alt+H / Cmd+Alt+H)
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

  // Check if user can submit feedback (rate limiting: 1 per week)
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

  // Enhanced Voting with Animations - NOW UPDATES FIREBASE
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
        votes: currentItem.votes + 1
      });
      
      setVotedItems(new Set([...votedItems, id]));
    } catch (error) {
      console.error('Error updating vote:', error);
    }
    
    setTimeout(() => setVoteAnimations(prev => ({ ...prev, [id]: false })), 600);
  };

  // Status change handler - NOW UPDATES FIREBASE
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

  // Delete feedback handler - NOW UPDATES FIREBASE
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

  // Submit feedback - SAVES TO FIREBASE
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
      
      setNewFeedback({ 
        title: '', 
        description: '', 
        author: '', 
        category: 'Feature', 
        status: 'under_review',
        tweetUrl: '',
        twitterHandle: ''
      });
      setShowModal(false);
      
      setCurrentUser(authorName);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    }
  };

  // Enhanced filtering (client-side since Firebase querying is more complex)
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
          
          {/* CHANGED: Title from "Fluent Feedback Portal" to "Feedback Friday Portal" */}
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

        {/* Success Toast */}
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

        {/* Enhanced Header with Search & Filters */}
        {!loading && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-purple-400 animate-pulse" />
              <h2 className="text-2xl font-bold">Community Feedback Portal</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-purple-500/50 via-blue-500/50 to-transparent" />
            </div>
            
            {/* Search and Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Search Input */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none transition-all font-mono text-sm group-hover:border-purple-500/50"
                />
                <div className="absolute inset-0 bg-purple-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              
              {/* Category Filter */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none transition-all font-mono text-sm group-hover:border-purple-500/50 appearance-none"
                >
                  <option value="All">All Categories</option>
                  <option>Feature</option>
                  <option>Bug</option>
                  <option>Developer Experience</option>
                  <option>Infrastructure</option>
                  <option>Documentation</option>
                </select>
                <div className="absolute inset-0 bg-blue-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              
              {/* Status Filter */}
              <div className="relative group">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none transition-all font-mono text-sm group-hover:border-purple-500/50 appearance-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="under_review">Under Review</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <div className="absolute inset-0 bg-cyan-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              
              {/* Sort Options */}
              <div className="relative group">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none transition-all font-mono text-sm group-hover:border-purple-500/50 appearance-none"
                >
                  <option value="votes">Sort by Votes</option>
                  <option value="newest">Sort by Newest</option>
                  <option value="oldest">Sort by Oldest</option>
                </select>
                <div className="absolute inset-0 bg-purple-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
            </div>
            
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm font-mono">
                Showing {filteredAndSortedFeedback.length} feedback items
              </span>
              {(searchTerm || selectedCategory !== 'All' || selectedStatus !== 'All') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                    setSelectedStatus('All');
                  }}
                  className="text-purple-400 hover:text-purple-300 text-sm font-mono transition-colors flex items-center gap-1"
                >
                  Clear filters
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Feedback List */}
        {!loading && (
          <div className="space-y-4">
            {filteredAndSortedFeedback.map((item, idx) => {
              const statusConfig = statusOptions.find(s => s.value === item.status) || statusOptions[0];
              const StatusIcon = statusConfig.icon;
              
              return (
                <div 
                  key={item.id} 
                  className="group relative bg-gradient-to-br from-purple-900/5 to-blue-900/5 hover:from-purple-900/20 hover:to-blue-900/20 rounded-xl border border-gray-800 hover:border-purple-500/50 p-6 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-blue-600/0 to-cyan-600/0 group-hover:from-purple-600/10 group-hover:via-blue-600/10 group-hover:to-cyan-600/10 rounded-xl blur-xl transition-all opacity-0 group-hover:opacity-100" />
                  
                  <div className="relative flex gap-6">
                    {/* Enhanced Vote Column */}
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => handleVote(item.id)}
                        disabled={votedItems.has(item.id)}
                        className={`relative flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-all ${
                          votedItems.has(item.id)
                            ? 'bg-purple-500/20 text-purple-400 cursor-not-allowed shadow-lg shadow-purple-500/50'
                            : 'bg-gray-900 hover:bg-purple-900/30 text-gray-400 hover:text-purple-400 border border-gray-800 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-110'
                        } ${pulseAnimations[item.id] ? 'animate-pulse-scale' : ''}`}
                      >
                        <ThumbsUp className={`w-5 h-5 transition-all ${votedItems.has(item.id) ? 'fill-current' : ''} ${votedItems.has(item.id) ? '' : 'group-hover:scale-110'} ${voteAnimations[item.id] ? 'animate-bounce' : ''}`} />
                        <span className={`font-bold text-lg font-mono transition-all ${voteAnimations[item.id] ? 'animate-bounce text-purple-300' : ''}`}>
                          {item.votes}
                        </span>
                      </button>
                      {idx === 0 && item.votes > 0 && (
                        <div className="flex items-center gap-1 text-xs text-purple-400 font-mono animate-pulse">
                          <Zap className="w-3 h-3" />
                          <span>#1 Trending</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="text-xl font-semibold group-hover:text-purple-300 transition-colors">
                          {item.title}
                        </h3>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
                            item.category === 'Feature' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            item.category === 'Bug' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            item.category === 'Developer Experience' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                            item.category === 'Infrastructure' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/30'
                          }`}>
                            {item.category}
                          </span>
                          
                          {/* Status Display - Only editable in Admin Mode */}
                          {isAdmin ? (
                            <div className="relative group">
                              <select
                                value={item.status}
                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                className={`shrink-0 px-3 py-1 rounded-full text-xs font-mono font-medium border cursor-pointer transition-all ${statusConfig.color} hover:scale-105`}
                              >
                                {statusOptions.map(option => {
                                  const OptionIcon = option.icon;
                                  return (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  );
                                })}
                              </select>
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Change status (Admin)
                              </div>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-medium border ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-400 leading-relaxed mb-3">
                        {item.description}
                      </p>
                      
                      {/* Author and Twitter Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="font-mono">by</span>
                            <span className="text-purple-400 font-mono group-hover:text-purple-300 transition-colors">
                              {item.author}
                            </span>
                            
                            {/* Twitter Handle */}
                            {item.twitterHandle && (
                              <a
                                href={`https://twitter.com/${item.twitterHandle.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-xs"
                              >
                                <Twitter className="w-3 h-3" />
                                {item.twitterHandle}
                              </a>
                            )}
                            
                            {item.author === currentUser && (
                              <span className="flex items-center gap-1 text-blue-400 text-xs">
                                <Sparkles className="w-3 h-3" />
                                Your feedback
                              </span>
                            )}
                            {item.votes > 10 && (
                              <span className="flex items-center gap-1 text-orange-400 text-xs">
                                <Zap className="w-3 h-3" />
                                Popular
                              </span>
                            )}
                            
                            {/* Submission Date */}
                            <span className="flex items-center gap-1 text-gray-500 text-xs">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Tweet Link */}
                          {item.tweetUrl && (
                            <a
                              href={item.tweetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-mono transition-all group/tweet"
                            >
                              <Twitter className="w-3 h-3" />
                              View on X
                              <ExternalLink className="w-3 h-3 group-hover/tweet:translate-x-0.5 transition-transform" />
                            </a>
                          )}
                          
                          {/* Admin Delete Button */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteFeedback(item.id)}
                              className="flex items-center gap-2 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg text-xs font-mono transition-all group/delete"
                              title="Delete this feedback"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAndSortedFeedback.length === 0 && (
          <div className="text-center py-20">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No feedback yet</h3>
            <p className="text-gray-500 mb-6">Be the first to share your ideas with the community!</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Submit First Feedback
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="text-center">
            <p className="text-gray-500 text-sm font-mono flex items-center justify-center gap-2 mb-4">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Powered by the Fluent community · Built for builders
            </p>
            
            {/* Subtle credit line */}
            <div className="flex items-center justify-center gap-2 text-gray-600 text-xs">
              <span>Built with</span>
              <Heart className="w-3 h-3 text-red-400 fill-current" />
              <span>by</span>
              <a 
                href="https://twitter.com/heisashx" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <Twitter className="w-3 h-3" />
                @heisashx
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0, -8px, 0);
          }
          70% {
            transform: translate3d(0, -4px, 0);
          }
          90% {
            transform: translate3d(0, -2px, 0);
          }
        }
        
        @keyframes pulse-scale {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(139, 92, 246, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        
        .animate-bounce {
          animation: bounce 0.6s ease-in-out;
        }
        
        .animate-pulse-scale {
          animation: pulse-scale 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}