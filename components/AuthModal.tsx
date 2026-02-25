import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';


interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  // Reset state whenever modal is opened or closed
  React.useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setError(null);
      setIsLoading(false);
      setFailedAttempts(0);
      setIsRecoveryMode(false);
      setRecoverySent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Success
      setFailedAttempts(0);
      setTimeout(onClose, 500);

    } catch (error: any) {
      console.error('Auth error:', error);
      setFailedAttempts(prev => prev + 1);
      setError(error.message || 'Invalid login credentials');
      setIsLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Check if email exists in our profiles (as requested)
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!data) {
        throw new Error("This email is not registered in our system. Please check with your administrator.");
      }

      // 2. Trigger reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;

      setRecoverySent(true);
    } catch (error: any) {
      console.error('Recovery error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-card-dark rounded-xl shadow-2xl p-8 border border-slate-200 dark:border-border-dark animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isRecoveryMode ? 'Reset Password' : 'Welcome Back'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {isRecoveryMode
                ? 'Enter your email to receive a recovery link.'
                : 'Sign in to access your translations.'}
            </p>
          </div>

          {!isRecoveryMode ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1">
                  <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-border-dark bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50"
                  placeholder="you@childrenbelieve.ca"
                  disabled={isLoading}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  {failedAttempts >= 2 && (
                    <button
                      type="button"
                      onClick={() => { setIsRecoveryMode(true); setError(null); }}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-border-dark bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full h-11 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : !recoverySent ? (
            <form onSubmit={handleRecovery} className="flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                  <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-border-dark bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="you@childrenbelieve.ca"
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Sending Link...' : 'Send Recovery Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRecoveryMode(false); setError(null); }}
                  className="text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4 animate-in fade-in zoom-in">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">mail</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Check Your Email</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                We've sent a recovery link to <strong>{email}</strong>. Please check your inbox (and spam folder) to reset your password.
              </p>
              <button
                type="button"
                onClick={() => { setIsRecoveryMode(false); setRecoverySent(false); }}
                className="w-full h-11 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Return to Login
              </button>
            </div>
          )}

          <div className="text-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              Corporate Access Only
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
