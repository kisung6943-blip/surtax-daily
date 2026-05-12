import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdjwvvukhirdkykwtich.supabase.co';
const supabaseAnonKey = 'sb_publishable_yFrwDH1QXNdpsCj_JitRmQ_VF6nQ6VB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Force refresh for GitHub Desktop
