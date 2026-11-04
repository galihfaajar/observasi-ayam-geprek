/**
 * Konfigurasi Supabase Tertanam (Hardcoded / Environment Variable)
 */

export const DEFAULT_SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://gjfbllunjzlywquacnxn.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_rqjC-3c2a2fVVrJETVVnfQ_LHVPIVbB';

export const isSupabaseConfiguredInCode = () => {
  return Boolean(DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY);
};
