import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jfeczgatcagmctawpkbj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Vs9jhtunPthaC7iAM0PAlw_DI__HEej';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
