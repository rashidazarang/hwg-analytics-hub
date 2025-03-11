-- Index file to run all SQL functions
-- This ensures all our functions are registered in the database

-- Include all function files
\i 'check_auth_setup.sql'
\i 'update_timestamp.sql'
\i 'count_agreements_by_status.sql'
\i 'count_agreements_by_status_yearly.sql'
\i 'count_agreements_by_status_monthly.sql'
\i 'count_agreements_by_status_weekly.sql'
\i 'count_agreements_by_status_daily.sql'
\i 'get_top_agents_by_contracts.sql'
\i 'handle_new_user.sql'
\i 'calculate_agreement_revenue.sql'
\i 'calculate_revenue_growth.sql'
\i 'get_leaderboard_summary.sql'
\i 'get_agreements_with_revenue.sql'
\i 'set_timezone.sql'
\i 'get_top_dealers_by_revenue.sql'
\i 'get_top_dealers_aggregated.sql'
\i 'fetch_monthly_agreement_counts.sql'
\i 'get_top_dealers_optimized.sql'
\i 'delete_duplicate_dealers.sql'
\i 'execute_sql.sql'
\i 'count_agreements_by_date.sql'
\i 'count_agreements_by_date_daily.sql'
\i 'count_agreements_by_date_weekly.sql'
\i 'count_agreements_by_date_monthly.sql'
\i 'count_agreements_by_date_yearly.sql'
\i 'fetch_monthly_agreement_counts_with_status.sql'
\i 'get_top_dealers_with_kpis.sql'
\i 'get_claims_with_payment_in_date_range.sql'
\i 'get_claims_by_filter_type.sql'
\i 'get_claims_payment_info.sql'
\i 'get_claims_with_dealer_info.sql'

-- Include dealer profile related functions
\i 'get_dealer_profile.sql'
\i 'get_dealer_agreement_distribution.sql'
\i 'get_dealer_claims_distribution.sql'
\i 'get_dealer_monthly_revenue.sql'

-- Add an index on subclaims.ClaimID to improve query performance
CREATE INDEX IF NOT EXISTS idx_subclaims_claimid ON public.subclaims ("ClaimID");

-- Add an index on subclaims.Status to improve filtering by status
CREATE INDEX IF NOT EXISTS idx_subclaims_status ON public.subclaims ("Status");

-- Add an index on subclaims.Closed to improve date range queries
CREATE INDEX IF NOT EXISTS idx_subclaims_closed ON public.subclaims ("Closed");

-- Add an index on subclaim_parts.SubClaimID to improve joins
CREATE INDEX IF NOT EXISTS idx_subclaim_parts_subclaimid ON public.subclaim_parts ("SubClaimID");

-- Add an index on agreements.EffectiveDate to improve date range queries
CREATE INDEX IF NOT EXISTS idx_agreements_effectivedate ON public.agreements ("EffectiveDate");

-- Add an index on agreements.AgreementStatus to improve filtering by status
CREATE INDEX IF NOT EXISTS idx_agreements_agreementstatus ON public.agreements ("AgreementStatus");

-- Add an index on agreements.DealerUUID to improve joins with dealers
CREATE INDEX IF NOT EXISTS idx_agreements_dealeruuid ON public.agreements ("DealerUUID");

-- Add an index on claims.AgreementID to improve joins with agreements
CREATE INDEX IF NOT EXISTS idx_claims_agreementid ON public.claims ("AgreementID");

-- Add an index on claims.LastModified to improve date range queries
CREATE INDEX IF NOT EXISTS idx_claims_lastmodified ON public.claims ("LastModified");

-- Add an index on claims.ReportedDate to improve date range queries
CREATE INDEX IF NOT EXISTS idx_claims_reporteddate ON public.claims ("ReportedDate");

-- Analyze tables to update statistics for query planner
ANALYZE public.claims;
ANALYZE public.subclaims;
ANALYZE public.subclaim_parts;
ANALYZE public.agreements;
ANALYZE public.dealers; 