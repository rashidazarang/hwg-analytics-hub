import { createClient } from '@supabase/supabase-js';
import { ExtendedDatabase } from './rpc-types';

// Use environment variables for Supabase connection
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that Supabase credentials are available
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

console.log('🔗 PaperworkFlows connected to Supabase database');

// Create Supabase client
export const supabase = createClient<ExtendedDatabase>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Remove mock data functionality completely
// All data will now come from Supabase
