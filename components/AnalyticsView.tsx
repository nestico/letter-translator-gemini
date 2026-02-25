import React, { useEffect, useState } from 'react';
import { User, ActivityRecord } from '../types';
import { getAllTranslations } from '../services/translationService';
import { getGlobalActivity } from '../services/activityService';
import { supabase } from '../services/supabase';

interface AnalyticsViewProps {
    user: User;
    onBack: () => void;
}

interface UserActivity {
    email: string;
    region: string;
    uploadCount: number;
}

interface Stats {
    totalLetters: number;
    topLanguages: { lang: string; count: number }[];
    lettersByDay: { date: string; count: number }[];
    goldenCount: number;
    uniqueUsers: number;
    topUsers: { email: string; count: number }[];
    recentActivity: ActivityRecord[];
    alerts: { id: string; type: 'low_confidence'; message: string; date: string; details: any }[];
    userActivities: UserActivity[];
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
            const data = await getAllTranslations();
            const activity = await getGlobalActivity(200); // Higher limit for better 30-day summary

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

            // User Uploads (Last 30 Days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            const userUploadMap: Record<string, { count: number, email?: string }> = {};

            // Check activity logs for recent translations to get emails
            activity.forEach(act => {
                const createdAt = new Date(act.created_at);
                if (act.action === 'TRANSLATE_LETTER' && createdAt >= thirtyDaysAgo) {
                    const uId = act.user_id;
                    const email = act.details?.email;
                    if (!userUploadMap[uId]) {
                        userUploadMap[uId] = { count: 0, email: email };
                    } else if (email && !userUploadMap[uId].email) {
                        userUploadMap[uId].email = email;
                    }
                    userUploadMap[uId].count++;
                }
            });

            // COMPUTE ALERTS: Find low confidence translations in activity
            const alerts: Stats['alerts'] = [];
            activity.forEach(act => {
                if (act.action === 'TRANSLATE_LETTER' && act.details?.confidence < 0.7) {
                    alerts.push({
                        id: act.id,
                        type: 'low_confidence',
                        message: `Low Confidence Alert: ${Math.round(act.details.confidence * 100)}% detection for Child ID ${act.details.child_id || 'Unknown'}`,
                        date: act.created_at,
                        details: act.details
                    });
                }
            });

            // Fetch Profiles to map IDs to Names/Emails/Regions
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, email, full_name, region');

            const profileMap: Record<string, { email: string, name: string, region: string }> = {};
            profiles?.forEach(p => {
                profileMap[p.id] = { email: p.email, name: p.full_name, region: p.region || 'Global' };
            });

            // Mapping for display
            const userActivities = Object.entries(userUploadMap).map(([id, data]) => {
                const profile = profileMap[id];
                return {
                    email: profile?.name || profile?.email || data.email || `Staff: ${id.split('-')[0]}...`,
                    region: profile?.region || 'Global',
                    uploadCount: data.count
                };
            }).sort((a, b) => b.uploadCount - a.uploadCount);

            setStats({
                totalLetters,
                topLanguages,
                lettersByDay,
                goldenCount,
                uniqueUsers: Object.keys(userUploadMap).length,
                topUsers: [], // Deprecated in favor of userActivities
                recentActivity: activity,
                alerts,
                userActivities
            });
        } catch (err) {
            console.error("Failed to load stats", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[1280px] px-4 lg:px-10 py-8 flex flex-col gap-8 min-h-[calc(100vh-64px)] overflow-y-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400">Global monitoring for 7 regional teams.</p>
                    </div>
                </div>
                <button
                    onClick={fetchStats}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    Refresh Data
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full shadow-lg"></div>
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Aggregating Global Activity...</p>
                </div>
            ) : !stats ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium text-lg">No global data detected yet.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {/* CRITICAL ALERTS SECTION */}
                    {stats.alerts.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-6">
                            <h4 className="text-red-800 dark:text-red-400 font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                System Alerts ({stats.alerts.length})
                            </h4>
                            <div className="flex flex-col gap-3">
                                {stats.alerts.map(alert => (
                                    <div key={alert.id} className="flex items-center justify-between bg-white dark:bg-black/20 p-4 rounded-xl border border-red-50 dark:border-red-900/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600">
                                                <span className="material-symbols-outlined">psychology_alt</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{alert.message}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Flagged on {new Date(alert.date).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-full uppercase">Action Required</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Stat Cards - Global Volume */}
                        <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-premium border border-slate-200 dark:border-border-dark relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:bg-primary/10 transition-colors"></div>
                            <span className="material-symbols-outlined text-primary mb-2">auto_awesome</span>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalLetters}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Translations</p>
                        </div>

                        <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-premium border border-slate-200 dark:border-border-dark relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-green-500/10 transition-colors"></div>
                            <span className="material-symbols-outlined text-green-500 mb-2">public</span>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.uniqueUsers}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Staff Members</p>
                        </div>

                        <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-premium border border-slate-200 dark:border-border-dark relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-yellow-500/10 transition-colors"></div>
                            <span className="material-symbols-outlined text-yellow-500 mb-2">verified</span>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.goldenCount}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ground Truth Samples</p>
                        </div>

                        <div className="bg-white dark:bg-card-dark p-6 rounded-2xl shadow-premium border border-slate-200 dark:border-border-dark relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors"></div>
                            <span className="material-symbols-outlined text-blue-500 mb-2">monitoring</span>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {stats.lettersByDay.reduce((acc, curr) => acc + curr.count, 0)}
                            </h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weekly Output</p>
                        </div>

                        {/* Breakdown Sections */}
                        <div className="lg:col-span-2 bg-white dark:bg-card-dark p-6 rounded-2xl shadow-premium border border-slate-200 dark:border-border-dark flex flex-col gap-6">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
                                    <span className="w-2 h-4 bg-primary rounded-full"></span>
                                    Geographic Distribution
                                </h4>
                            </div>
                            <div className="flex flex-col gap-4">
                                {stats.topLanguages.slice(0, 6).map((l, i) => (
                                    <div key={l.lang} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400 font-black text-xs min-w-[1.5rem]">#{i + 1}</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">{l.lang}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{l.count} <small className="text-slate-400">docs</small></span>
                                            <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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

                        <div className="lg:col-span-2 bg-white dark:bg-card-dark p-6 rounded-2xl shadow-premium border border-slate-200 dark:border-border-dark flex flex-col gap-6">
                            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center gap-2">
                                <span className="w-2 h-4 bg-blue-500 rounded-full"></span>
                                Regional Activity (Last 7 Days)
                            </h4>
                            <div className="flex items-end justify-between h-48 gap-3 mt-4">
                                {stats.lettersByDay.map(day => (
                                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                        <div
                                            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-primary/20 transition-all rounded-t-lg relative group cursor-pointer"
                                            style={{ height: `${(day.count / (Math.max(...stats.lettersByDay.map(d => d.count)) || 1)) * 100}%`, minHeight: '8px' }}
                                        >
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 shadow-xl transition-all pointer-events-none whitespace-nowrap">
                                                {day.count} Documents
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-black uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                                            {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* USER ACTIVITY SUMMARY (LAST 30 DAYS) */}
                        <div className="lg:col-span-4 bg-white dark:bg-card-dark p-6 rounded-2xl shadow-premium border border-slate-200 dark:border-border-dark">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
                                    <span className="w-2 h-4 bg-green-500 rounded-full"></span>
                                    User Activity Summary (Last 30 Days)
                                </h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 dark:border-slate-800">
                                            <th className="py-3 px-4">Staff Member</th>
                                            <th className="py-3 px-4">Regional Office</th>
                                            <th className="py-3 px-4">Files Uploaded</th>
                                            <th className="py-3 px-4">Impact Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.userActivities.map((act, i) => (
                                            <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                    {act.email}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500">
                                                        {act.region}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-slate-900 dark:text-white">{act.uploadCount}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Documents</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500"
                                                                style={{ width: `${Math.min((act.uploadCount / (stats.totalLetters || 1)) * 100 * 5, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {stats.userActivities.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-8 text-center text-slate-400 italic">No activity recorded in the last 30 days.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
