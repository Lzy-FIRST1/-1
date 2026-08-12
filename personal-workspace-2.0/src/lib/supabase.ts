import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const LS_URL = 'pw_sb_url';
const LS_KEY = 'pw_sb_key';

export interface SbConfig {
  url: string;
  key: string;
  configured: boolean;
}

export function getSupabaseConfig(): SbConfig {
  const url = localStorage.getItem(LS_URL) || envUrl || '';
  const key = localStorage.getItem(LS_KEY) || envKey || '';
  return { url, key, configured: Boolean(url && key) };
}

export function setSupabaseConfig(url: string, key: string): void {
  if (url) localStorage.setItem(LS_URL, url.trim());
  else localStorage.removeItem(LS_URL);
  if (key) localStorage.setItem(LS_KEY, key.trim());
  else localStorage.removeItem(LS_KEY);
}

export function getSupabase(): SupabaseClient | null {
  const { url, key, configured } = getSupabaseConfig();
  if (!configured) return null;
  return createClient(url, key);
}

export const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
