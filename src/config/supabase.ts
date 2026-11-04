/**
 * Konfigurasi Supabase Tertanam (Hardcoded / Environment Variable)
 */

export const DEFAULT_SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://gjfbllunjzlywquacnxn.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZmJsbHVuanpseXdxdWFjbnhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3NDMyMjUsImV4cCI6MjEwOTMxOTIyNX0.SBddExwu7TV3Hx8fWjSyllBI7ttagNFyQzYOJn203MA';

export const isSupabaseConfiguredInCode = () => {
  return Boolean(DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY);
};
