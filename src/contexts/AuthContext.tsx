import React, { createContext, useContext, useEffect, useState } from 'react';

export type AuthState = 'loading' | 'no_profile' | 'freelancer' | 'owner';

export interface Profile {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  phone?: string;
  role: 'owner' | 'admin' | 'employee';
  city?: string;
  status?: string;
  created_at?: string;
}

interface AuthContextType {
  state: AuthState;
  profile: Profile | null;
  error: string | null;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAuth = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData || (import.meta.env.DEV ? 'dev-mode' : '');

      if (!initData) {
        console.log('No initData found, user not authenticated');
        setState('no_profile');
        return;
      }

      console.log('Refreshing auth...');

      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
      if (!functionsUrl) {
        console.error('VITE_SUPABASE_FUNCTIONS_URL is not set (see .env.example)');
        setError('Configuration error');
        setState('no_profile');
        return;
      }

      const response = await fetch(`${functionsUrl}/tg-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      });

      if (!response.ok) {
        console.error('Auth error: HTTP', response.status);
        let errorData;
        try {
          errorData = await response.json();
          console.error('Error details:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }
        setError('Authentication failed');
        setState('no_profile');
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse auth response:', e);
        setError('Authentication failed: invalid response');
        setState('no_profile');
        return;
      }
      const authProfile = data.profile;

      if (!authProfile) {
        console.log('No profile found, user needs to register');
        setState('no_profile');
        return;
      }

      console.log('✅ User authenticated, role:', authProfile.role);
      setProfile(authProfile);

      // Determine auth state based on role
      const authState =
        authProfile.role === 'owner' || authProfile.role === 'admin' ? 'owner' : 'freelancer';
      setState(authState);
    } catch (err) {
      console.error('Auth refresh error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('no_profile');
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ state, profile, error, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
