-- Function to get top dealers with aggregated data
CREATE OR REPLACE FUNCTION get_top_dealers_aggregated(
  start_date DATE,
  end_date DATE,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  dealer_uuid UUID,
  dealer_name TEXT,
  total_contracts INTEGER,
  active_contracts INTEGER,
  pending_contracts INTEGER,
  cancelled_contracts INTEGER,
  total_revenue NUMERIC,
  expected_revenue NUMERIC,
  funded_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d."DealerUUID"::UUID,
        d."Payee" AS dealer_name,
        COUNT(a."AgreementID")::INTEGER AS total_contracts,
        COUNT(CASE WHEN UPPER(a."AgreementStatus") IN ('ACTIVE', 'CLAIMABLE') THEN 1 END)::INTEGER AS active_contracts,
        COUNT(CASE WHEN UPPER(a."AgreementStatus") = 'PENDING' THEN 1 END)::INTEGER AS pending_contracts,
        COUNT(CASE WHEN UPPER(a."AgreementStatus") IN ('CANCELLED', 'VOID') THEN 1 END)::INTEGER AS cancelled_contracts,
        COALESCE(SUM(CAST(a."DealerCost" AS NUMERIC)), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN UPPER(a."AgreementStatus") = 'PENDING' THEN CAST(a."DealerCost" AS NUMERIC) ELSE 0 END), 0) AS expected_revenue,
        COALESCE(SUM(CASE WHEN UPPER(a."AgreementStatus") IN ('ACTIVE', 'CLAIMABLE') THEN CAST(a."DealerCost" AS NUMERIC) ELSE 0 END), 0) AS funded_revenue
    FROM 
        "agreements" a
    JOIN 
        "dealers" d ON a."DealerUUID" = d."DealerUUID"
    WHERE 
        a."EffectiveDate" >= start_date
        AND a."EffectiveDate" <= end_date
    GROUP BY 
        d."DealerUUID", d."Payee"
    ORDER BY 
        total_contracts DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_dealers_aggregated(DATE, DATE, INT) TO authenticated; 