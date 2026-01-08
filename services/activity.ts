import { supabase } from './supabase';

export const logActivity = async (userId: string, action: string, details?: any) => {
    try {
        const { error } = await supabase
            .from('activity')
            .insert({
                user_id: userId,
                action,
                details,
            });

        if (error) {
            console.error('Error logging activity:', error);
        }
    } catch (err) {
        console.error('Exception logging activity:', err);
    }
};
