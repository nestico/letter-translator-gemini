
import React from 'react';

interface LegalViewProps {
    onBack: () => void;
}

export const TermsView: React.FC<LegalViewProps> = ({ onBack }) => {
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

            <div className="bg-white dark:bg-card-dark rounded-3xl shadow-premium border border-slate-200 dark:border-border-dark p-8 md:p-12">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Terms of Use</h1>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                        By using the Letter Translator, you agree to comply with the following terms and the broader organizational policies of Children Believe.
                    </p>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Authorized Use</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Access to this application is restricted to authorized employees and volunteers of Children Believe. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. Proper Documentation</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            You agree only to upload official Children Believe sponsorship documentation. Any misuse of this platform for personal or unauthorized purposes is strictly prohibited and may result in revocation of access.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. Accuracy of AI Output</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            While this application utilizes state-of-the-art AI, transcriptions and translations should be reviewed for accuracy, especially for critical information. The "Golden Reference" system is in place to continuously improve these outputs.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Data & Content Ownership</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            All sponsorship letters and data processed through this application remain the property of Children Believe. Users are granted a limited license to use this platform for authorized organizational purposes. This platform is provided "as is" to facilitate regional operations.
                        </p>
                    </section>

                    <p className="text-sm text-slate-400 mt-12 italic">
                        Last updated: February 25, 2026
                    </p>
                </div>
            </div>
        </div>
    );
};
