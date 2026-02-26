import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { TranslationView } from './components/TranslationView';
import { UploadView } from './components/UploadView';
import { HistoryView } from './components/HistoryView';
import { AnalyticsView } from './components/AnalyticsView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { SupportView } from './components/SupportView';
import { PasswordResetModal } from './components/PasswordResetModal';

import { ChatBot } from './components/ChatBot';
import { User, AppState } from './types';
import { supabase } from './services/supabase';
import { logActivity } from './services/activityService';


console.log("App Module Loading...");
const fetchUserProfile = async (userId: string): Promise<{ isAdmin: boolean, region: string }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, region')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn("Profile not found or error, defaulting to staff:", error.message);
      return { isAdmin: false, region: 'Global' };
    }
    return {
      isAdmin: data?.role === 'admin',
      region: data?.region || 'Global'
    };
  } catch (err) {
    return { isAdmin: false, region: 'Global' };
  }
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isResetModalOpen, setResetModalOpen] = useState(false);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Set user immediately
        const initialUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.full_name || session.user.email!.split('@')[0],
          isAdmin: false,
        };
        setUser(initialUser);
        setAuthModalOpen(false);

        // Fetch admin status in background
        fetchUserProfile(session.user.id).then(profile => {
          if (profile.isAdmin || profile.region !== 'Global') {
            setUser(prev => prev ? { ...prev, isAdmin: profile.isAdmin, region: profile.region } : null);
          }
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Set basic user info immediately
        const newUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.full_name || session.user.email!.split('@')[0],
          isAdmin: false,
        };
        setUser(newUser);

        if (_event === 'SIGNED_IN') {
          logActivity(session.user.id, 'LOGIN', { email: session.user.email, method: 'email' }).catch(console.error);
          setAuthModalOpen(false);

          // Update role in background
          fetchUserProfile(session.user.id).then(profile => {
            if (profile.isAdmin || profile.region !== 'Global') {
              setUser(prev => prev ? { ...prev, isAdmin: profile.isAdmin, region: profile.region } : null);
            }
          });
        }

        if (_event === 'PASSWORD_RECOVERY') {
          console.log("Password recovery event detected!");
          setResetModalOpen(true);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isDemoModalOpen, setDemoModalOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; file: File }[] | null>(null);


  // CTA for content that requires auth
  const handleStartAction = () => {
    if (user) {
      setAppState(AppState.APP);
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleLogin = (newUser: User) => {
    // This is now primarily triggered by the auth state change, but we keep it for immediate UI updates if needed
    // or just let the effect handle it.
    // If we rely purely on the effect, we don't need to do anything here except navigation.
    if (appState === AppState.LANDING) {
      setAppState(AppState.APP);
    }
  };


  const handleSignOut = async () => {
    try {
      console.log("Starting sign out workflow...");

      // 1. Tell Supabase to end session officially
      await supabase.auth.signOut();

      // 2. Clear application state
      setUser(null);
      setAppState(AppState.LANDING);

      // 3. Clear transient storage (but avoid nuking everything that might break the client)
      sessionStorage.clear();

      console.log("Sign out completed successfully.");
    } catch (err) {
      console.error("Sign out error:", err);
      // Fallback reset
      setUser(null);
      setAppState(AppState.LANDING);
    }
  };


  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <Navbar
        user={user}
        onSignIn={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onNavigateHome={() => setAppState(AppState.LANDING)}
        onNavigateHistory={() => setAppState(AppState.HISTORY)}
        onNavigateAnalytics={() => setAppState(AppState.ANALYTICS)}
      />

      <main className="flex-1 w-full flex flex-col items-center">
        {appState === AppState.LANDING && (
          <div className="w-full max-w-[1280px] px-4 lg:px-10 flex flex-col gap-16 pb-20">
            <Hero
              onStartTranslation={handleStartAction}
              onViewDemo={() => setDemoModalOpen(true)}
            />
            <Features />

            {/* CTA Section */}
            <section className="w-full">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#0f4ac4] to-[#0b3691] px-6 py-16 sm:px-12 sm:py-20 text-center shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                  <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white blur-3xl"></div>
                  <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-blue-300 blur-3xl transform translate-x-1/3"></div>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl mx-auto">
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Ready to translate your first letter?
                  </h2>
                  <p className="text-blue-100 text-lg">
                    Join thousands of historians, genealogists, and families discovering their past. Your first 3 pages are free.
                  </p>
                  <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-4 pt-4">
                    <button
                      onClick={handleStartAction}
                      className="h-12 px-8 rounded-lg bg-white text-primary text-base font-bold hover:bg-blue-50 transition-colors shadow-lg"
                    >
                      Upload Letter
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {appState === AppState.APP && (
          uploadedImages ? (
            <TranslationView
              user={user}
              images={uploadedImages}
              onReset={() => setUploadedImages(null)}
            />
          ) : (
            <UploadView
              onProcess={(files, urls) => {
                setUploadedImages(files.map((file, i) => ({ file, url: urls[i] })));
              }}
              onCancel={() => setAppState(AppState.LANDING)}
            />
          )
        )}

        {appState === AppState.HISTORY && user && (
          <HistoryView
            user={user}
            onBack={() => setAppState(AppState.LANDING)}
          />
        )}

        {appState === AppState.ANALYTICS && user && (
          <AnalyticsView
            user={user}
            onBack={() => setAppState(AppState.LANDING)}
          />
        )}

        {appState === AppState.PRIVACY && (
          <PrivacyView onBack={() => setAppState(AppState.LANDING)} />
        )}

        {appState === AppState.TERMS && (
          <TermsView onBack={() => setAppState(AppState.LANDING)} />
        )}

        {appState === AppState.SUPPORT && (
          <SupportView onBack={() => setAppState(AppState.LANDING)} />
        )}
      </main>

      {/* Persistent Components */}
      <Footer
        onNavigatePrivacy={() => setAppState(AppState.PRIVACY)}
        onNavigateTerms={() => setAppState(AppState.TERMS)}
        onNavigateSupport={() => setAppState(AppState.SUPPORT)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
      />
      <PasswordResetModal
        isOpen={isResetModalOpen}
        onClose={() => setResetModalOpen(false)}
      />

      {/* Demo Video Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setDemoModalOpen(false)}></div>
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <iframe
              src="https://player.vimeo.com/video/1168591837"
              className="w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Letter Translator Demo"
            ></iframe>
          </div>
        </div>
      )}

      <ChatBot />
    </div>
  );
}

export default App;
