import { createClient } from '@supabase/supabase-js';
import { ExtendedDatabase } from './rpc-types';

// Use environment variables instead of hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development mode with placeholder values
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

if (missingVars.length > 0) {
  console.warn(`⚠️ Missing Supabase environment variables: ${missingVars.join(', ')}.`);
  console.warn('🔧 Running in DEVELOPMENT MODE with mock data');
  console.warn('📝 For production deployment:');
  console.warn('1. Create a .env file in the project root directory');
  console.warn('2. Add the following variables:');
  console.warn('   VITE_SUPABASE_URL=your_supabase_url');
  console.warn('   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.warn('   VITE_SUPABASE_SERVICE_KEY=your_supabase_service_key');
  console.warn('3. Rebuild your application: npm run build');
} else if (IS_DEVELOPMENT_MODE) {
  console.warn('🔧 Running in DEVELOPMENT MODE with placeholder Supabase credentials');
  console.warn('📊 All data will be mocked for local development');
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
