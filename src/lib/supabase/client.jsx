import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config.jsx';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.key);