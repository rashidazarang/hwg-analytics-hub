-- Drop existing duplicate functions to allow new implementations
DROP FUNCTION IF EXISTS count_agreements_by_date(timestamp, timestamp, uuid, text);
DROP FUNCTION IF EXISTS fetch_monthly_agreement_counts_with_status(timestamp, timestamp, uuid);

-- You can check if they were successfully dropped with:
-- SELECT proname, nspname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE proname IN ('count_agreements_by_date', 'fetch_monthly_agreement_counts_with_status');