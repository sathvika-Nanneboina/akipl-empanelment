import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardHat, Eye, EyeOff, ShieldAlert, User, CheckCircle, Users } from 'lucide-react';
import { api } from '../utils/api';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STAFF');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Sign up state variables
  const [isSignUp, setIsSignUp] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Clear errors on role or view change
  useEffect(() => {
    setError('');
  }, [role, isSignUp]);

  const toggleForm = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setSignupName('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.login(email, password);
      if (data.user.role !== role) {
        setError(`Warning: Login successful but role is registered as ${data.user.role}. Proceeding...`);
      }
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 500);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!signupName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.register(signupName, email, password);
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 500);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSuccess(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSuccess(false);
      setForgotEmail('');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Dynamic Grid Background Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

      {/* Decorative Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />

      {/* Login Card */}
      <motion.div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-8 z-10 relative"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Animated hard-hat Logo Reveal */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            className="bg-accent text-white p-3.5 rounded-2xl shadow-lg shadow-accent/20 mb-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 120, delay: 0.15 }}
          >
            <HardHat className="w-8 h-8" />
          </motion.div>
          
          <motion.h2 
            className="text-lg font-extrabold text-slate-800 text-center uppercase tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            AVINASH KANAPARTHI INFRA
          </motion.h2>
          <motion.p
            className="text-xs text-slate-400 font-semibold tracking-widest mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            PRE-QUALIFICATION & EMPANELMENT
          </motion.p>
        </div>

        {isSignUp ? (
          /* Sign Up Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 text-left uppercase mb-1">Contractor Sign Up</h3>
            <p className="text-xs text-slate-400 text-left mb-4">Register your company profile to apply for pre-qualification.</p>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs p-3 rounded-r-lg text-left"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase">Company Name / Name</label>
              <input
                type="text"
                required
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="e.g. Apex Civil Constructors Ltd"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-slate-800 transition-colors"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contractor@company.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-slate-800 transition-colors"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-slate-800 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-slate-800 transition-colors"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark disabled:bg-slate-300 text-white py-3 rounded-xl font-semibold shadow-lg shadow-accent/20 text-sm transition-all flex items-center justify-center"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Register & Create Profile'
              )}
            </motion.button>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={toggleForm}
                className="text-xs font-bold text-accent hover:text-accent-dark transition-colors"
              >
                Already have an account? Sign In
              </button>
            </div>
          </form>
        ) : (
          /* Login Form */
          <>
            {/* Role Selector Dropdown */}
            <div className="mb-6 space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase">Choose Portal Access</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm bg-slate-50 focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-slate-800 transition-colors font-semibold cursor-pointer"
              >
                <option value="CONTRACTOR">Contractor Portal</option>
                <option value="STAFF">Staff Reviewer Portal</option>
                <option value="ADMIN">System Administrator Portal</option>
              </select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs p-3 rounded-r-lg text-left"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. staff@akipl.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-slate-800 transition-colors"
                />
              </div>

              <div className="space-y-1.5 text-left relative">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-accent hover:text-accent-dark transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-slate-800 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent-dark disabled:bg-slate-300 text-white py-3 rounded-xl font-semibold shadow-lg shadow-accent/20 text-sm transition-all flex items-center justify-center"
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  `Access Portal as ${role.charAt(0) + role.slice(1).toLowerCase()}`
                )}
              </motion.button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={toggleForm}
                  className="text-xs font-bold text-accent hover:text-accent-dark transition-colors"
                >
                  Don't have an account? Sign Up here
                </button>
              </div>
            </form>
          </>
        )}

        <div className="mt-8 text-center">
          <span className="text-xs text-slate-400">© 2026 AVINASH KANAPARTHI INFRA PRIVATE LIMITED.</span>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
            />
            
            <motion.div 
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative z-10 border border-slate-100"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <h3 className="text-base font-bold text-slate-800 mb-2">Reset Password</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Enter your registered email below, and we will send you a password recovery link.
              </p>

              {forgotSuccess ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 flex gap-3 text-left">
                  <CheckCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold">Reset Email Sent</p>
                    <p className="mt-1">Check your inbox. A temporary link will arrive shortly (simulated).</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-primary-light"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-md shadow-accent/10"
                    >
                      Send Reset Link
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
