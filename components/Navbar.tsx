import React from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  onNavigateHistory: () => void;
  onNavigateAnalytics: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onSignIn, onSignOut, onNavigateHome, onNavigateHistory, onNavigateAnalytics }) => {
  return (
    <header className="w-full bg-primary sticky top-0 z-50 shadow-md">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-10 h-16 flex items-center justify-between text-white">
        {/* Logo Section Left */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={onNavigateHome}
        >
          <div className="flex flex-col leading-none">
            <h1 className="text-xl font-black tracking-[0.1em] text-white uppercase sm:text-2xl">Children Believe</h1>
            <span className="text-[9px] text-white/70 font-bold uppercase tracking-widest mt-1">Letter Translator</span>
          </div>
        </div>

        {/* Actions Right */}
        <div className="flex items-center gap-4 sm:gap-10">
          {user && (
            <nav className="flex items-center gap-6">
              <button
                onClick={onNavigateHistory}
                className="text-sm font-bold text-white/90 hover:text-white transition-colors border-b-2 border-transparent hover:border-white/40 pb-1"
              >
                History
              </button>
              <button
                onClick={onNavigateAnalytics}
                className="text-sm font-bold text-white/90 hover:text-white transition-colors border-b-2 border-transparent hover:border-white/40 pb-1"
              >
                Analytics
              </button>
            </nav>
          )}

          {user ? (
            <div className="flex items-center gap-4 border-l border-white/20 pl-4 sm:pl-10">
              <div className="hidden lg:flex flex-col items-end leading-tight">
                <span className="text-[10px] uppercase text-white/60 font-bold">Authenticated</span>
                <span className="text-sm font-bold text-white">{user.name}</span>
              </div>
              <button
                onClick={onSignOut}
                className="flex cursor-pointer items-center justify-center rounded-lg h-9 px-4 border border-white/30 hover:bg-white/10 transition-colors text-xs font-bold text-white uppercase tracking-wider"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="flex cursor-pointer items-center justify-center rounded-lg h-9 px-6 bg-white text-primary hover:bg-white/90 transition-colors text-sm font-black shadow-lg"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
