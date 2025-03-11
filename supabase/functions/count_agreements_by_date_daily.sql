-- Function to count agreements by date with daily granularity
CREATE OR REPLACE FUNCTION count_agreements_by_date_daily(
  from_day DATE,
  to_day DATE,
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
  RETURN QUERY
  WITH filtered_agreements AS (
    SELECT 
      "EffectiveDate",
      "AgreementStatus"
    FROM 
      agreements
    WHERE 
      "EffectiveDate" BETWEEN from_day AND to_day
      AND (dealer_uuid IS NULL OR "DealerID" = dealer_uuid::VARCHAR)
  )
  SELECT
    TO_CHAR(DATE_TRUNC('day', "EffectiveDate"), 'YYYY-MM-DD') AS date_group,
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
GRANT EXECUTE ON FUNCTION count_agreements_by_date_daily(DATE, DATE, UUID) TO authenticated; 