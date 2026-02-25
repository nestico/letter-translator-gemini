import React from 'react';

interface FooterProps {
  onNavigatePrivacy?: () => void;
  onNavigateTerms?: () => void;
  onNavigateSupport?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigatePrivacy, onNavigateTerms, onNavigateSupport }) => {
  return (
    <footer className="w-full bg-primary text-white py-14">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-10 flex flex-col gap-10 items-center text-center">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-black tracking-[0.2em] uppercase">Children Believe</h2>
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">Letter Translator</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
          <button
            onClick={onNavigatePrivacy}
            className="text-sm font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider"
          >
            Privacy
          </button>
          <button
            onClick={onNavigateTerms}
            className="text-sm font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider"
          >
            Terms
          </button>
          <button
            onClick={onNavigateSupport}
            className="text-sm font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider"
          >
            Support
          </button>
        </div>
        <div className="h-px w-20 bg-white/20"></div>
        <div className="text-white/60 text-[11px] font-bold uppercase tracking-[0.3em]">
          © 2026 CHILDREN BELIEVE · POWERED BY GEMINI 3.1
        </div>
      </div>
    </footer>
  );
};
