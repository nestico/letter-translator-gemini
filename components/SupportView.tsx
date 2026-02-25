
import React from 'react';

interface LegalViewProps {
    onBack: () => void;
}

export const SupportView: React.FC<LegalViewProps> = ({ onBack }) => {
    return (
        <div className="w-full max-w-4xl px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button
                onClick={onBack}
                className="group mb-8 flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold text-sm uppercase tracking-widest"
            >
                <span className="p-2 rounded-full bg-slate-100 group-hover:bg-primary/10 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                </span>
                Back to Home
            </button>

            <div className="bg-white dark:bg-card-dark rounded-3xl shadow-premium border border-slate-200 dark:border-border-dark p-8 md:p-12 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary shadow-inner">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>

                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Need Support?</h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-lg mx-auto leading-relaxed">
                    Our team is here to help you with technical issues, feature requests, or scaling inquiries for your regional office.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    <a
                        href="mailto:askus@childrenbelieve.ca"
                        className="flex flex-col items-center p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-primary hover:text-white transition-all duration-300 group border border-slate-100 dark:border-slate-800"
                    >
                        <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:bg-white/20">
                            <svg className="w-6 h-6 text-primary group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="font-bold mb-1">Email Support</h3>
                        <p className="text-sm opacity-80">askus@childrenbelieve.ca</p>
                    </a>

                    <div className="flex flex-col items-center p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-600 hover:text-white transition-all duration-300 group border border-slate-100 dark:border-slate-800">
                        <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:bg-white/20">
                            <svg className="w-6 h-6 text-primary group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <h3 className="font-bold mb-1">Call Us</h3>
                        <p className="text-sm opacity-80">1.800.263.5437</p>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 text-slate-500 text-sm">
                    <p className="font-bold">Head Office</p>
                    <p>90 Allstate Parkway, Suite 101, Markham, ON, Canada L3R 6H3</p>
                </div>
            </div>
        </div>
    );
};
