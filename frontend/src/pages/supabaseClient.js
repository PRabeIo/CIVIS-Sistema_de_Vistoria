// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;       // configure no .env
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;  // configure no .env

export const supabase = createClient(supabaseUrl, supabaseAnonKey);