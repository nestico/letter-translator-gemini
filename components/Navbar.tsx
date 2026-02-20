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
    <header className="w-full bg-primary sticky top-0 z-50 shadow-md">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-10 h-16 flex items-center justify-between text-white">
        <div className="flex items-center gap-4 sm:gap-8 flex-1">
          {user && (
            <nav className="hidden sm:flex items-center gap-6">
              <button
                onClick={onNavigateHistory}
                className="text-sm font-bold text-white/90 hover:text-white transition-colors"
              >
                History
              </button>
            </nav>
          )}
        </div>

        <div
          className="flex items-center gap-3 cursor-pointer justify-center flex-1"
          onClick={onNavigateHome}
        >
          <div className="flex flex-col items-center leading-none">
            <h1 className="text-xl font-black tracking-[0.2em] text-white uppercase">Children Believe</h1>
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1">Letter Translator</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 sm:gap-8 flex-1">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium hidden lg:block text-white/90">Hello, {user.name}</span>
              <button
                onClick={onSignOut}
                className="flex cursor-pointer items-center justify-center rounded-lg h-9 px-4 border border-white/30 hover:bg-white/10 transition-colors text-xs font-bold text-white"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="flex cursor-pointer items-center justify-center rounded-lg h-9 px-4 bg-white text-primary hover:bg-white/90 transition-colors text-sm font-bold shadow-md"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
