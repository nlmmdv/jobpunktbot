import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://api.punktirpro.ru';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzaWN5ZXVta3d2bmZrcnl4ZmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDA4NDQsImV4cCI6MjA4NTE3Njg0NH0.kdDL3KjsoDatfeUpktyF4EdZdcPy6cMQ3KHTRfMgwd4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
    },
  },
  realtime: { params: { eventsPerSecond: 2 } },
});
