import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const missingSupabaseEnv = () => {
  return new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
};

const stubChannel = () => {
  const chain = {
    on: () => chain,
    subscribe: () => {
      /* no-op */
    },
  };
  return chain;
};

const stub = {
  auth: {
    async getSession() {
      return { data: { session: null }, error: null };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe: () => {} } }, error: null };
    },
    async signOut() {
      /* no-op */
    },
    async signInWithPassword() {
      throw missingSupabaseEnv();
    },
    async signUp() {
      throw missingSupabaseEnv();
    },
    async resetPasswordForEmail() {
      throw missingSupabaseEnv();
    },
  },
  channel: () => stubChannel(),
  removeChannel: () => {
    /* no-op */
  },
  from: () => {
    throw missingSupabaseEnv();
  },
} as unknown as SupabaseClient;

let client: SupabaseClient;
try {
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[Enqueue] Supabase env missing; using stub client.');
    client = stub;
  } else {
    client = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.error('[Enqueue] Failed to initialize Supabase; using stub client.', e);
  client = stub;
}

export const supabase = client;
