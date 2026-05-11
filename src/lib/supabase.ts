import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://knmhoibddyiqykgmrnvg.supabase.co';
const supabaseAnonKey = 'sb_publishable_DwCnXcMBerTX0yIijOsGoQ_2fdPpg6t';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
