import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wdjwvvukhirdkykwtich.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yFrwDH1QXNdpsCj_JitRmQ_VF6nQ6VB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
