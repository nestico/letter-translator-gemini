import React from 'react';

interface HeroProps {
  onStartTranslation: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartTranslation }) => {
  return (
    <section className="w-full py-12 lg:py-20 @container">
      <div className="flex flex-col-reverse lg:flex-row gap-12 items-center">
        {/* Left Content */}
        <div className="flex flex-col gap-6 flex-1 w-full lg:max-w-[600px]">
          <div className="flex flex-col gap-4 text-left">
            {/* Badge */}
            <div className="inline-flex items-center self-start gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">Secure AI Integration</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white">
              Decipher Handwritten Letters <span className="text-primary">Instantly</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-[540px]">
              Translate complex handwritten correspondence from French, Spanish, or Hindi into clear, readable English. Preserving history, one letter at a time.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={onStartTranslation}
              className="flex items-center justify-center h-12 px-6 rounded-lg bg-primary hover:bg-blue-600 text-white text-base font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              <span className="material-symbols-outlined mr-2 text-[20px]">upload_file</span>
              Start New Translation
            </button>
            <button className="flex items-center justify-center h-12 px-6 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-base font-medium transition-colors">
              View Demo
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            * Your data is processed securely and never stored without permission.
          </p>
        </div>
        {/* Right Image */}
        <div className="flex-1 w-full relative">
          <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full opacity-30 pointer-events-none"></div>
          <div
            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-card-dark"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1516414447565-b14be071340a?auto=format&fit=crop&q=80&w=1000')",
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Simple clear overlay if needed, but keeping it clean for 'static' request */}
            <div className="absolute inset-0 bg-black/5 flex items-end p-6">
              <div className="bg-white/90 dark:bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20 shadow-xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary dark:text-blue-400">Sample Document</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
