import { supabase } from './supabase';

export type ActivityType = 'LOGIN' | 'LOGOUT' | 'TRANSLATE' | 'TRANSLATE_LETTER' | 'VIEW_HISTORY' | 'EXPORT_PDF';

export const logActivity = async (
    userId: string,
    action: ActivityType,
    metadata: Record<string, any> = {}
): Promise<boolean> => {
    try {
        // Attempt to get user email from metadata or session if possible
        // But for now, we expect metadata.email to be passed from the caller
        const { error } = await supabase
            .from('activity')
            .insert({
                user_id: userId,
                action: action,
                details: metadata
            });

        if (error) {
            console.error('Error logging activity:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Exception logging activity:', err);
        return false;
    }
};

export const getGlobalActivity = async (limit: number = 20): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('activity')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching global activity:', error);
            return [];
        }
        return data;
    } catch (err) {
        console.error('Exception fetching global activity:', err);
        return [];
    }
};
