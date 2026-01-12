/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GOOGLE_GENAI_API_KEY: string
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_AZURE_VISION_ENDPOINT: string
    readonly VITE_AZURE_VISION_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
