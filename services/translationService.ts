import { supabase } from './supabase';
import { TranslationRecord } from '../types';

export const saveTranslation = async (
    userId: string,
    fileName: string,
    transcription: string,
    translation: string,
    sourceLanguage: string,
    targetLanguage: string,
    imageUrls: string[] = []
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
                target_language: targetLanguage,
                image_urls: imageUrls,
                is_golden: false
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

export const toggleGoldenStatus = async (id: string, isGolden: boolean): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('translations')
            .update({ is_golden: isGolden })
            .eq('id', id);

        if (error) {
            console.error('Error updating golden status:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Exception updating golden status:', err);
        return false;
    }
};

export const getGoldenReferences = async (language: string, limit: number = 3): Promise<TranslationRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('translations')
            .select('*')
            .eq('is_golden', true)
            .eq('source_language', language)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching golden references:', error);
            return [];
        }
        return data as TranslationRecord[];
    } catch (err) {
        console.error('Exception fetching golden references:', err);
        return [];
    }
};
