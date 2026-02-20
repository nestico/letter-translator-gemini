import { supabase } from './supabase';

export type ActivityType = 'LOGIN' | 'LOGOUT' | 'TRANSLATE' | 'VIEW_HISTORY' | 'EXPORT_PDF';

export const logActivity = async (
    userId: string,
    action: ActivityType,
    metadata: Record<string, any> = {}
): Promise<boolean> => {
    try {
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
