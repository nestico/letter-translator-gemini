export interface User {
  id: string; // Add ID from Supabase Auth
  email: string;
  name: string;
  isAdmin?: boolean;
  region?: string;
}

export interface TranslationResult {
  transcription: string;
  translation: string;
  detectedLanguage?: string;
  confidenceScore?: number;
  ocrUsed?: boolean;
  rawOCR?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AppState {
  LANDING = 'LANDING',
  APP = 'APP',
  HISTORY = 'HISTORY',
  ANALYTICS = 'ANALYTICS',
  PRIVACY = 'PRIVACY',
  TERMS = 'TERMS',
  SUPPORT = 'SUPPORT'
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface TranslationRecord {
  id: string;
  user_id: string;
  file_name: string;
  transcription: string;
  translation: string;
  source_language: string;
  target_language: string;
  created_at: string;
  is_golden?: boolean;
  image_urls?: string[]; // To reference the images used for this translation
}
export interface ActivityRecord {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  username_cached?: string; // Opt-in field for analytics display
}
