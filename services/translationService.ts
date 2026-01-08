import { supabase } from './supabase';
import { TranslationRecord } from '../types';

export const saveTranslation = async (
    userId: string,
    fileName: string,
    transcription: string,
    translation: string,
    sourceLanguage: string,
    targetLanguage: string
): Promise<TranslationRecord | null> => {
    try {
        const { data, error } = await supabase
            .from('translations')
            .insert({
                user_id: userId,
                file_name: fileName,
                transcription,
                translation,
                source_language: sourceLanguage,
                target_language: targetLanguage
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving translation:', error);
            return null;
        }

        return data as TranslationRecord;
    } catch (err) {
        console.error('Exception saving translation:', err);
        return null;
    }
};

export const getTranslations = async (userId: string): Promise<TranslationRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('translations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching translations:', error);
            return [];
        }

        return data as TranslationRecord[];
    } catch (err) {
        console.error('Exception fetching translations:', err);
        return [];
    }
};
