import React, { useEffect, useState } from 'react';
import { User, TranslationRecord } from '../types';
import { getTranslations } from '../services/translationService';

interface AnalyticsViewProps {
    user: User;
    onBack: () => void;
}

interface Stats {
    totalLetters: number;
    topLanguages: { lang: string; count: number }[];
    lettersByDay: { date: string; count: number }[];
    goldenCount: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ user, onBack }) => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [user.id]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const data = await getTranslations(user.id);
            if (!data) return;

            // Compute Stats
            const totalLetters = data.length;
            const goldenCount = data.filter(r => r.is_golden).length;

            // Languages
            const langMap: Record<string, number> = {};
            data.forEach(r => {
                const lang = r.source_language || 'Unknown';
                langMap[lang] = (langMap[lang] || 0) + 1;
            });
            const topLanguages = Object.entries(langMap)
                .map(([lang, count]) => ({ lang, count }))
                .sort((a, b) => b.count - a.count);

            // Time - Last 7 days
            const dayMap: Record<string, number> = {};
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const key = d.toISOString().split('T')[0];
                dayMap[key] = 0;
            }

            data.forEach(r => {
                const key = r.created_at.split('T')[0];
                if (dayMap[key] !== undefined) {
                    dayMap[key]++;
                }
            });
            const lettersByDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

            setStats({ totalLetters, topLanguages, lettersByDay, goldenCount });
        } catch (err) {
            console.error("Failed to load stats", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[1280px] px-4 lg:px-10 py-8 flex flex-col gap-8 min-h-[calc(100vh-64px)]">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1>
                    <p className="text-slate-500 dark:text-slate-400">Application usage and performance metrics.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            ) : !stats ? (
                <div className="text-center py-20">
                    <p className="text-slate-400 font-medium">No data available for analytics.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Stat Cards */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-border-dark">
                        <span className="material-symbols-outlined text-primary mb-2">description</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalLetters}</h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Letters</p>
                    </div>

                    <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-border-dark">
                        <span className="material-symbols-outlined text-yellow-500 mb-2">star_rate</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.goldenCount}</h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Golden References</p>
                    </div>

                    <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-border-dark">
                        <span className="material-symbols-outlined text-green-500 mb-2">language</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.topLanguages.length}</h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Languages Supported</p>
                    </div>

                    <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-border-dark">
                        <span className="material-symbols-outlined text-blue-500 mb-2">trending_up</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                            {stats.lettersByDay.reduce((acc, curr) => acc + curr.count, 0)}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Letters (Last 7 Days)</p>
                    </div>

                    {/* Breakdown Sections */}
                    <div className="md:col-span-2 bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-border-dark flex flex-col gap-4">
                        <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Top Languages</h4>
                        <div className="flex flex-col gap-3">
                            {stats.topLanguages.slice(0, 5).map((l, i) => (
                                <div key={l.lang} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{l.lang}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{l.count}</span>
                                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${(l.count / stats.totalLetters) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-border-dark flex flex-col gap-4">
                        <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Activity (Last 7 Days)</h4>
                        <div className="flex items-end justify-between h-32 gap-2 mt-4">
                            {stats.lettersByDay.map(day => (
                                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                                    <div
                                        className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t-sm relative group"
                                        style={{ height: `${(day.count / (Math.max(...stats.lettersByDay.map(d => d.count)) || 1)) * 100}%`, minHeight: '4px' }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                            {day.count} letters
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold rotate-45 mt-2 origin-left">
                                        {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
