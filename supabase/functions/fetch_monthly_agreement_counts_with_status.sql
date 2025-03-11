-- Function to fetch monthly agreement counts with status breakdown
CREATE OR REPLACE FUNCTION fetch_monthly_agreement_counts_with_status(
  start_date DATE,
  end_date DATE,
  dealer_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
  month TEXT,
  total BIGINT,
  pending BIGINT,
  active BIGINT,
  claimable BIGINT,
  cancelled BIGINT,
  void BIGINT
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
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fetch_monthly_agreement_counts_with_status(DATE, DATE, UUID) TO authenticated; 