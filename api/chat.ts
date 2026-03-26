import { AzureOpenAI } from "openai";

export const maxDuration = 60;
export const config = { maxDuration: 60 };

export default async function handler(req: any, res: any) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Auth check: require valid Supabase session
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split('Bearer ')[1];
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
            const sbKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
            if (sbUrl && sbKey) {
                const sb = createClient(sbUrl, sbKey);
                const { error: authError } = await sb.auth.getUser(token);
                if (authError) {
                    return res.status(401).json({ error: 'Invalid session' });
                }
            }
        } catch {
            return res.status(401).json({ error: 'Auth verification failed' });
        }

        const { messages } = req.body;

        const endpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.VITE_AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.VITE_AZURE_OPENAI_API_KEY;
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

        if (!endpoint || !apiKey) {
            return res.status(503).json({ error: 'Azure OpenAI is not configured on this server.' });
        }

        const client = new AzureOpenAI({
            endpoint,
            apiKey,
            apiVersion: "2024-08-01-preview",
            deployment
        });

        const response = await client.chat.completions.create({
            messages,
            model: deployment
        });

        const reply = response.choices[0]?.message?.content || "I couldn't generate a response.";

        return res.status(200).json({ reply });
    } catch (error: any) {
        console.error("Chat API Error:", error);
        return res.status(500).json({ error: error.message || 'Chat service error' });
    }
}
