import React, { useEffect, useState } from 'react';
import { User, TranslationRecord } from '../types';
import { getTranslations, toggleGoldenStatus } from '../services/translationService';

interface HistoryViewProps {
    user: User;
    onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ user, onBack }) => {
    const [history, setHistory] = useState<TranslationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<TranslationRecord | null>(null);

    useEffect(() => {
        loadHistory();
    }, [user.id]);

    const loadHistory = async () => {
        setLoading(true);
        const data = await getTranslations(user.id);
        setHistory(data);
        setLoading(false);
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

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700 mb-4">history_toggle_off</span>
                    <p className="text-lg text-slate-400">No translations found.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 w-12"></th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">File Name</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">Languages</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">Date</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {history.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleGolden(item.id, item.is_golden || false)}
                                            className={`transition-all duration-200 ${item.is_golden ? 'text-yellow-500 scale-110' : 'text-slate-200 dark:text-slate-700 hover:text-slate-400'}`}
                                            title={item.is_golden ? "Unmark as Golden" : "Mark as Golden Reference"}
                                        >
                                            <span className="material-symbols-outlined fill-current">
                                                {item.is_golden ? 'star' : 'star_border'}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900 dark:text-white">{item.file_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            {item.source_language} <span className="material-symbols-outlined text-xs text-slate-400">arrow_forward</span> {item.target_language}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                        {formatDate(item.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedRecord(item)}
                                            className="text-primary hover:text-blue-700 dark:hover:text-blue-400 font-medium text-sm"
                                        >
                                            View
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
                    <div className="bg-white dark:bg-card-dark w-full max-w-4xl h-[80vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
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
                                        {selectedRecord.file_name}
                                        {selectedRecord.is_golden && (
                                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Golden Reference</span>
                                        )}
                                    </h3>
                                    <span className="text-sm text-slate-500">{formatDate(selectedRecord.created_at)}</span>
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
