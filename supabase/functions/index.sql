-- Index file to run all SQL functions
-- This ensures all our functions are registered in the database

-- Include the get_claims_with_payment_in_date_range function
\i 'get_claims_with_payment_date_range.sql'

-- Include the get_claims_payment_info function
\i 'get_claims_payment_info.sql'

-- Add an index on subclaims.ClaimID to improve query performance
CREATE INDEX IF NOT EXISTS idx_subclaims_claimid ON public.subclaims ("ClaimID");

-- Add an index on subclaims.Status to improve filtering by status
CREATE INDEX IF NOT EXISTS idx_subclaims_status ON public.subclaims ("Status");

-- Add an index on subclaims.Closed to improve date range queries
CREATE INDEX IF NOT EXISTS idx_subclaims_closed ON public.subclaims ("Closed");

-- Add an index on subclaim_parts.SubClaimID to improve joins
CREATE INDEX IF NOT EXISTS idx_subclaim_parts_subclaimid ON public.subclaim_parts ("SubClaimID");

-- Analyze tables to update statistics for query planner
ANALYZE public.claims;
ANALYZE public.subclaims;
ANALYZE public.subclaim_parts; 