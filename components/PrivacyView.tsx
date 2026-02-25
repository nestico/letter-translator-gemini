
import React from 'react';

interface LegalViewProps {
    onBack: () => void;
}

export const PrivacyView: React.FC<LegalViewProps> = ({ onBack }) => {
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
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Privacy Policy</h1>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                        At Children Believe, your privacy and the protection of sensitive information are our highest priorities. This Privacy Policy outlines how the Letter Translator Gemini application handles data.
                    </p>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Information Collection</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            The App processes handwritten letters and documents provided by authorized Children Believe staff. This includes images, transcriptions, and translations. We also collect basic profile information (name, email, region) for authentication and accountability.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. AI Data Processing</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Images are processed using Google Gemini models. We do not use the content of these letters to train public AI models. Data processing is transient and focused solely on providing accurate translations for humanitarian purposes.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. Child Protection</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Consistent with Children Believe’s global mission, this application follows strict Child Safeguarding protocols. We ensure that personally identifiable information of children is handled with the utmost care and only shared within the secure organizational context for sponsorship communication.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Data Storage and Security</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            All data is stored securely in Supabase with production-grade encryption. Access is restricted via Row Level Security (RLS) policies, ensuring staff can only access data relevant to their authorized work.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">5. Contact Us</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            If you have any questions about this Privacy Policy, please contact our support team at <a href="mailto:askus@childrenbelieve.ca" className="text-primary hover:underline font-bold">askus@childrenbelieve.ca</a>.
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
