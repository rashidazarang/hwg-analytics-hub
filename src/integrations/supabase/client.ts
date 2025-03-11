import { createClient } from '@supabase/supabase-js';
import { ExtendedDatabase } from './rpc-types';

// Use environment variables instead of hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Better environment variable checking with detailed error messages
const missingVars = [];
if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
if (!SUPABASE_ANON_KEY) missingVars.push('VITE_SUPABASE_ANON_KEY');

if (missingVars.length > 0) {
  console.error(`Missing Supabase environment variables: ${missingVars.join(', ')}. Please check your .env file.`);
  console.error('Environment setup guide:');
  console.error('1. Create a .env file in the project root directory');
  console.error('2. Add the following variables:');
  console.error('   VITE_SUPABASE_URL=your_supabase_url');
  console.error('   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('   VITE_SUPABASE_SERVICE_KEY=your_supabase_service_key');
  console.error('3. Rebuild your application: npm run build');
}

// Provide fallback values for development to prevent crashes,
// but in production these should always be properly set
export const supabase = createClient<ExtendedDatabase>(
  SUPABASE_URL as string || 'https://placeholder-url.supabase.co', 
  SUPABASE_ANON_KEY as string || 'placeholder-key'
);
