export interface User {
  id: string; // Add ID from Supabase Auth
  email: string;
  name: string;
}

export interface TranslationResult {
  transcription: string;
  translation: string;
  detectedLanguage?: string;
  confidenceScore?: number;
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
  HISTORY = 'HISTORY'
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
}
