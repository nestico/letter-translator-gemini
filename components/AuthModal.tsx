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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Hard guard: reset loading and allow close after 2 seconds no matter what
      const safetyId = setTimeout(() => {
        setIsLoading(false);
        // We don't force onClose here yet to give it a chance
      }, 2000);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      clearTimeout(safetyId);
      if (error) throw error;

      // Success: wait a small moment for the global state to catch up then close
      setTimeout(onClose, 500);

    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || 'Authentication failed. Please check your credentials.');
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
              Welcome Back
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Sign in to access your translations.
            </p>
          </div>

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
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
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
