import React, { useEffect, useState } from 'react';
import { User, TranslationRecord } from '../types';
import { getTranslations, toggleGoldenStatus } from '../services/translationService';
import { logActivity } from '../services/activityService';

interface HistoryViewProps {
    user: User;
    onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ user, onBack }) => {
    const [history, setHistory] = useState<TranslationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<TranslationRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadHistory();
        // Log view history event
        logActivity(user.id, 'VIEW_HISTORY').catch(() => { });
    }, [user.id]);

    const loadHistory = async () => {
        // Safety timeout - force close loading after 10 seconds no matter what
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn("History fetch timed out. Forcing loading state to false.");
                setLoading(false);
            }
        }, 10000);

        try {
            setLoading(true);
            const data = await getTranslations(user.id);
            setHistory(data || []);
        } catch (err) {
            console.error("Critical error loading history:", err);
            setHistory([]);
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    const handleToggleGolden = async (id: string, currentVal: boolean) => {
        const success = await toggleGoldenStatus(id, !currentVal);
        if (success) {
            setHistory(prev => prev.map(item =>
                item.id === id ? { ...item, is_golden: !currentVal } : item
            ));
            if (selectedRecord?.id === id) {
                setSelectedRecord(prev => prev ? { ...prev, is_golden: !currentVal } : null);
            }
        }
    };

    const filteredHistory = history.filter(item => {
        const searchLow = searchTerm.toLowerCase();
        return (
            item.file_name?.toLowerCase().includes(searchLow) ||
            item.source_language?.toLowerCase().includes(searchLow) ||
            (item.header_info as any)?.childName?.toLowerCase().includes(searchLow) ||
            (item.header_info as any)?.childId?.toLowerCase().includes(searchLow)
        );
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="w-full max-w-[1280px] px-4 lg:px-10 py-8 flex flex-col gap-6 min-h-[calc(100vh-64px)]">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">History</h1>
                        <p className="text-slate-500 dark:text-slate-400">Your past translations.</p>
                    </div>
                </div>

                <div className="md:ml-auto w-full max-w-sm relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Search ID, Name or Language..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700 mb-4">{searchTerm ? 'search_off' : 'history_toggle_off'}</span>
                    <p className="text-lg text-slate-400 mb-2">{searchTerm ? `No matches found for "${searchTerm}"` : 'No translations found.'}</p>
                    {searchTerm ? (
                        <button onClick={() => setSearchTerm('')} className="text-primary font-bold hover:underline">Clear Search</button>
                    ) : (
                        <button onClick={loadHistory} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm">
                            <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh History
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 w-12"></th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">Beneficiary</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">Language</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">Date</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredHistory.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleGolden(record.id, record.is_golden || false)}
                                            className={`transition-all duration-200 ${record.is_golden ? 'text-yellow-500 scale-110' : 'text-slate-200 dark:text-slate-700 hover:text-slate-400'}`}
                                            title={record.is_golden ? "Unmark as Golden" : "Mark as Golden Reference"}
                                        >
                                            <span className="material-symbols-outlined fill-current">
                                                {record.is_golden ? 'star' : 'star_border'}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{(record.header_info as any)?.childName || 'N/A'}</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-tight">{(record.header_info as any)?.childId || record.file_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                            {record.source_language}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                        {formatDate(record.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedRecord(record)}
                                            className="px-4 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* View Detail Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card-dark w-full max-w-4xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleToggleGolden(selectedRecord.id, selectedRecord.is_golden || false)}
                                    className={`transition-all duration-200 ${selectedRecord.is_golden ? 'text-yellow-500 scale-110' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'}`}
                                >
                                    <span className="material-symbols-outlined fill-current text-2xl">
                                        {selectedRecord.is_golden ? 'star' : 'star_border'}
                                    </span>
                                </button>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        {(selectedRecord.header_info as any)?.childName || selectedRecord.file_name}
                                        {selectedRecord.is_golden && (
                                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Golden Reference</span>
                                        )}
                                    </h3>
                                    <span className="text-sm text-slate-500 tracking-tight">{(selectedRecord.header_info as any)?.childId ? `Child ID: ${(selectedRecord.header_info as any).childId} | ` : ''}{formatDate(selectedRecord.created_at)}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100 dark:border-slate-700">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Original Transcription</h4>
                                <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-serif italic text-lg leading-relaxed whitespace-pre-wrap">
                                    {selectedRecord.transcription}
                                </div>
                            </div>
                            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/30 dark:bg-black/20">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-primary mb-4">Translation ({selectedRecord.target_language})</h4>
                                <div className="prose dark:prose-invert max-w-none text-slate-900 dark:text-white font-serif text-lg leading-relaxed whitespace-pre-wrap">
                                    {selectedRecord.translation}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
