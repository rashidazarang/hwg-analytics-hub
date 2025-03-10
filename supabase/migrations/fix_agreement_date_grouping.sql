-- Fix the count_agreements_by_date function to properly group by day/month
CREATE OR REPLACE FUNCTION count_agreements_by_date(from_date timestamp, to_date timestamp, dealer_uuid uuid, group_by text)
RETURNS TABLE(
  date_group text,
  total_count bigint,
  pending_count bigint,
  active_count bigint,
  claimable_count bigint,
  cancelled_count bigint,
  void_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate group_by parameter
  IF group_by NOT IN ('day', 'month', 'week') THEN
    RAISE EXCEPTION 'group_by must be one of: day, month, week';
  END IF;

  RETURN QUERY
  WITH filtered_agreements AS (
    SELECT 
      "EffectiveDate",
      "AgreementStatus"
    FROM 
      agreements
    WHERE 
      "EffectiveDate" >= from_date
      AND "EffectiveDate" <= to_date
      AND (dealer_uuid IS NULL OR "DealerUUID"::text = dealer_uuid::text)
  )
  SELECT
    -- Format the date group based on the requested grouping
    CASE 
      WHEN group_by = 'day' THEN TO_CHAR(DATE_TRUNC('day', "EffectiveDate"), 'YYYY-MM-DD')
      WHEN group_by = 'month' THEN TO_CHAR(DATE_TRUNC('month', "EffectiveDate"), 'YYYY-MM')
      WHEN group_by = 'week' THEN TO_CHAR(DATE_TRUNC('week', "EffectiveDate"), 'YYYY-MM-DD')
    END AS date_group,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'PENDING') AS pending_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'ACTIVE') AS active_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'CLAIMABLE') AS claimable_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'CANCELLED') AS cancelled_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'VOID') AS void_count
  FROM 
    filtered_agreements
  GROUP BY 
    date_group
  ORDER BY 
    date_group;
END;
$$;

-- Fix the fetch_monthly_agreement_counts_with_status function
CREATE OR REPLACE FUNCTION fetch_monthly_agreement_counts_with_status(start_date timestamp, end_date timestamp, dealer_uuid uuid)
RETURNS TABLE(
  month text,
  total bigint,
  pending bigint,
  active bigint,
  claimable bigint,
  cancelled bigint,
  void bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_agreements AS (
    SELECT 
      "EffectiveDate",
      "AgreementStatus"
    FROM 
      agreements
    WHERE 
      "EffectiveDate" >= start_date
      AND "EffectiveDate" <= end_date
      AND (dealer_uuid IS NULL OR "DealerUUID"::text = dealer_uuid::text)
  )
  SELECT
    TO_CHAR(DATE_TRUNC('month', "EffectiveDate"), 'YYYY-MM') AS month,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'PENDING') AS pending,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'ACTIVE') AS active,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'CLAIMABLE') AS claimable,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'CANCELLED') AS cancelled,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'VOID') AS void
  FROM 
    filtered_agreements
  GROUP BY 
    month
  ORDER BY 
    month;
END;
$$;

-- Create an execute_sql utility function that can run dynamic SQL
-- This will help with more complex date filtering needs
CREATE OR REPLACE FUNCTION execute_sql(sql text)
RETURNS TABLE(result_json jsonb)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY EXECUTE sql;
END;
$$;