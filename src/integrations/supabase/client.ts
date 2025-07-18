import { createClient } from '@supabase/supabase-js';
import { ExtendedDatabase } from './rpc-types';

// Use environment variables instead of hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development mode with placeholder values or missing credentials
export const IS_DEVELOPMENT_MODE = !SUPABASE_URL || 
  !SUPABASE_ANON_KEY || 
  SUPABASE_URL.includes('placeholder') || 
  SUPABASE_ANON_KEY.includes('placeholder');

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Better environment variable checking with detailed error messages
const missingVars = [];
if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
if (!SUPABASE_ANON_KEY) missingVars.push('VITE_SUPABASE_ANON_KEY');

// Show appropriate message based on connection status
if (IS_DEVELOPMENT_MODE) {
  console.log('🔧 PaperworkFlows running with mock data (Supabase not configured)');
} else {
  console.log('🔗 PaperworkFlows connected to Supabase database');
}

// Provide fallback values for development to prevent crashes,
// but in production these should always be properly set
export const supabase = createClient<ExtendedDatabase>(
  SUPABASE_URL as string || 'https://placeholder-url.supabase.co', 
  SUPABASE_ANON_KEY as string || 'placeholder-key'
);

// Mock data helper to simulate Supabase responses
export const createMockSupabaseResponse = <T>(data: T, error: any = null) => ({
  data,
  error,
  count: Array.isArray(data) ? data.length : null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK'
});

// Helper function to check if a query should use mock data
export const shouldUseMockData = () => IS_DEVELOPMENT_MODE;
