import React from 'react';

export const Features: React.FC = () => {
  return (
    <section className="flex flex-col gap-10 py-10">
      <div className="flex flex-col gap-4 text-center items-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          How It Works
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-[700px]">
          Our advanced AI handles the complexity of varied handwriting styles and archaic vocabulary so you don't have to.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="group flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark p-6 hover:border-primary/50 transition-colors duration-300">
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-outlined">cloud_upload</span>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Simply upload a high-quality photo or scan of your handwritten letter. We accept JPG, PNG, and WEBP formats.
            </p>
          </div>
        </div>
        {/* Card 2 */}
        <div className="group flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark p-6 hover:border-primary/50 transition-colors duration-300">
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Processing</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Secure Gemini AI analyzes the handwriting strokes, context, and language nuances to generate an accurate translation.
            </p>
          </div>
        </div>
        {/* Card 3 */}
        <div className="group flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark p-6 hover:border-primary/50 transition-colors duration-300">
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
            <span className="material-symbols-outlined">article</span>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Review & Export</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Read the side-by-side English translation, make manual edits if needed, and export the result as a text document.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
