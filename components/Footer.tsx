import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark py-10">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-10 flex flex-col gap-8 items-center text-center">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white opacity-80">
          <span className="material-symbols-outlined text-2xl">edit_note</span>
          <span className="text-base font-bold">Letter Translator</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
          <a href="#" className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-primary dark:hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-primary dark:hover:text-primary transition-colors">Terms of Service</a>
          <a href="#" className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-primary dark:hover:text-primary transition-colors">Help Center</a>
        </div>
        <div className="text-slate-400 dark:text-slate-600 text-sm">
          © 2024 Letter Translator. Powered by Google Gemini.
        </div>
      </div>
    </footer>
  );
};
