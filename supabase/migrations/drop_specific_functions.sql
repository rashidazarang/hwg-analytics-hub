-- Drop the specific function variants that are causing conflicts
DROP FUNCTION IF EXISTS count_agreements_by_date(timestamp, timestamp, text, text);
DROP FUNCTION IF EXISTS count_agreements_by_date(timestamp, timestamp, uuid, text);
DROP FUNCTION IF EXISTS fetch_monthly_agreement_counts_with_status(timestamp, timestamp, text);
DROP FUNCTION IF EXISTS fetch_monthly_agreement_counts_with_status(timestamp, timestamp, uuid);

-- Keep the variants that use uuid (2950) parameter types, as they're the ones our frontend expects:
-- count_agreements_by_date(timestamp, timestamp, uuid, text)
-- fetch_monthly_agreement_counts_with_status(timestamp, timestamp, uuid)

-- After running this, you should only have the uuid versions of these functions remaining