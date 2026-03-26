// =============================================================
// Azure Service — SECURITY HARDENED (H-2)
// All Azure OpenAI calls now proxy through /api/chat on the server.
// No API keys are exposed to the browser.
// =============================================================

import { supabase } from './supabase';

export const createChatSession = () => {
    let history: { role: "system" | "user" | "assistant"; content: string }[] = [
        {
            role: "system",
            content: "You are an expert historian and archivist assistant. You help users understand historical contexts, archaic vocabulary, and details about handwritten letters they are translating. Keep answers concise and helpful."
        }
    ];

    return {
        sendMessage: async (message: string) => {
            try {
                history.push({ role: "user", content: message });

                // Get session token for authenticated server call
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token || '';

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({ messages: history })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ error: 'Chat service unavailable' }));
                    throw new Error(errData.error || `Chat error (${response.status})`);
                }

                const data = await response.json();
                const reply = data.reply;

                history.push({ role: "assistant", content: reply });

                return {
                    response: {
                        text: () => reply
                    }
                };
            } catch (error) {
                console.error("Azure Chat Error:", error);
                throw error;
            }
        }
    };
};
