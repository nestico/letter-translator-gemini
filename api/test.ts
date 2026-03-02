
export default async function handler(req: any, res: any) {
    res.status(200).json({
        status: "Server is online",
        time: new Date().toISOString(),
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
        envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('SUPABASE') || k.includes('VITE_'))
    });
}
