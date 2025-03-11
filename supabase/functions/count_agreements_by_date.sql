-- Function to count agreements by date grouping
CREATE OR REPLACE FUNCTION count_agreements_by_date(
  from_date DATE,
  to_date DATE,
  group_by TEXT DEFAULT 'month',
  dealer_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
  date_group TEXT,
  total_count BIGINT,
  pending_count BIGINT,
  active_count BIGINT,
  claimable_count BIGINT,
  cancelled_count BIGINT,
  void_count BIGINT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_agreements_by_date(DATE, DATE, TEXT, UUID) TO authenticated; 