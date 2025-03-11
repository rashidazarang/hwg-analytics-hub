import { createClient } from '@supabase/supabase-js';
import { ExtendedDatabase } from './rpc-types';

// Use environment variables instead of hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Ensure environment variables are defined
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<ExtendedDatabase>(
  SUPABASE_URL as string, 
  SUPABASE_ANON_KEY as string
);
