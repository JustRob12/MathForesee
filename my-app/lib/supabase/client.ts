import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://vmekbymwpzuljzkzlnnz.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_xi0qA5OQXbMfo2OXzQVPjg_wvO86G-h';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
