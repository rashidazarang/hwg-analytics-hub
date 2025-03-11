-- Function to count agreements by date with monthly granularity
CREATE OR REPLACE FUNCTION count_agreements_by_date_monthly(
  from_month DATE,
  to_month DATE,
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
      DATE_TRUNC('month', "EffectiveDate") BETWEEN DATE_TRUNC('month', from_month) AND DATE_TRUNC('month', to_month)
      AND (dealer_uuid IS NULL OR "DealerID" = dealer_uuid::VARCHAR)
  )
  SELECT
    TO_CHAR(DATE_TRUNC('month', "EffectiveDate"), 'YYYY-MM') AS date_group,
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
GRANT EXECUTE ON FUNCTION count_agreements_by_date_monthly(DATE, DATE, UUID) TO authenticated; 