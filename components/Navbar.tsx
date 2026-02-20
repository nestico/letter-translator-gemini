import React from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  onNavigateHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onSignIn, onSignOut, onNavigateHome, onNavigateHistory }) => {
  return (
    <header className="w-full border-b border-solid border-slate-200 dark:border-border-dark bg-background-light dark:bg-background-dark sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-10 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-3 text-slate-900 dark:text-white cursor-pointer"
          onClick={onNavigateHome}
        >
          <span className="material-symbols-outlined text-primary text-3xl">edit_note</span>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold leading-tight tracking-tight">Letter Translator</h2>
            <span className="text-[10px] text-slate-400 font-mono">v1.0.5 (Build: Feb20)</span>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-8">
          {user && (
            <nav className="hidden sm:flex items-center gap-6">
              <button
                onClick={onNavigateHistory}
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              >
                History
              </button>
              {/* <button className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">Settings</button> */}
            </nav>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium hidden sm:block">Hello, {user.name}</span>
              <button
                onClick={onSignOut}
                className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-bold"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary hover:bg-blue-600 transition-colors text-white text-sm font-bold shadow-lg shadow-primary/20"
            >
              <span className="truncate">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
