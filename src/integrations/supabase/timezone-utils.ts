/**
 * Timezone utility functions for Supabase queries
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { CST_TIMEZONE } from '@/lib/dateUtils';

/**
 * Sets the session timezone to CST for subsequent queries
 * This needs to be called before any query that depends on timezone
 */
export async function setCSTTimezone(supabase: SupabaseClient): Promise<void> {
  // Set timezone to CST for this database session
  await supabase.rpc('set_timezone', { 
    timezone_name: CST_TIMEZONE 
  });
}

/**
 * Wrapper function to execute queries with CST timezone
 * @param supabase The Supabase client
 * @param queryFn The function that executes the actual query
 * @returns The result of the query
 */
export async function executeWithCSTTimezone<T>(
  supabase: SupabaseClient, 
  queryFn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  // Set timezone first
  await setCSTTimezone(supabase);
  
  // Then execute the query
  return queryFn(supabase);
}