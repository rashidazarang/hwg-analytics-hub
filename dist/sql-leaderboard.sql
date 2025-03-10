-- Create a function to get top agents by contracts
CREATE OR REPLACE FUNCTION public.get_top_agents_by_contracts(start_date timestamp without time zone, end_date timestamp without time zone, limit_count integer DEFAULT 10)
 RETURNS TABLE(agent_name text, contracts_closed bigint, total_revenue numeric, cancelled_contracts bigint)
 LANGUAGE sql
AS $function$
  SELECT 
    COALESCE("HolderFirstName", '') || ' ' || COALESCE("HolderLastName", '') AS agent_name,
    COUNT("AgreementID") AS contracts_closed,
    COALESCE(SUM("Total"), 0) AS total_revenue,
    COUNT(CASE WHEN "AgreementStatus" = 'CANCELLED' THEN "AgreementID" END) AS cancelled_contracts
  FROM agreements
  WHERE 
    "EffectiveDate" BETWEEN start_date AND end_date
    AND ("HolderFirstName" IS NOT NULL OR "HolderLastName" IS NOT NULL)
  GROUP BY "HolderFirstName", "HolderLastName"
  HAVING TRIM(COALESCE("HolderFirstName", '') || ' ' || COALESCE("HolderLastName", '')) <> ''
  ORDER BY contracts_closed DESC
  LIMIT limit_count;
$function$;

-- Create a function to get top dealers by revenue
CREATE OR REPLACE FUNCTION public.get_top_dealers_by_revenue(start_date timestamp without time zone, end_date timestamp without time zone, limit_count integer DEFAULT 10)
 RETURNS TABLE(dealer_name text, total_contracts bigint, total_revenue numeric, cancelled_contracts bigint)
 LANGUAGE sql
AS $function$
  SELECT 
    d."Payee" AS dealer_name,
    COUNT(a."AgreementID") AS total_contracts,
    COALESCE(SUM(a."Total"), 0) AS total_revenue,
    COUNT(CASE WHEN a."AgreementStatus" = 'CANCELLED' THEN a."AgreementID" END) AS cancelled_contracts
  FROM agreements a
  JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
  WHERE 
    a."EffectiveDate" BETWEEN start_date AND end_date
    AND d."Payee" IS NOT NULL
  GROUP BY d."Payee"
  ORDER BY total_revenue DESC
  LIMIT limit_count;
$function$;

-- Create a function to get revenue growth rates
CREATE OR REPLACE FUNCTION public.calculate_revenue_growth(current_start_date timestamp without time zone, current_end_date timestamp without time zone, previous_start_date timestamp without time zone, previous_end_date timestamp without time zone)
 RETURNS TABLE(current_revenue numeric, previous_revenue numeric, growth_rate numeric)
 LANGUAGE sql
AS $function$
  WITH current_period AS (
    SELECT COALESCE(SUM("Total"), 0) AS revenue
    FROM agreements
    WHERE "EffectiveDate" BETWEEN current_start_date AND current_end_date
      AND "AgreementStatus" = 'ACTIVE'
  ),
  previous_period AS (
    SELECT COALESCE(SUM("Total"), 0) AS revenue
    FROM agreements
    WHERE "EffectiveDate" BETWEEN previous_start_date AND previous_end_date
      AND "AgreementStatus" = 'ACTIVE'
  )
  SELECT 
    cp.revenue AS current_revenue,
    pp.revenue AS previous_revenue,
    CASE 
      WHEN pp.revenue = 0 THEN 
        CASE WHEN cp.revenue > 0 THEN 100 ELSE 0 END
      ELSE
        ((cp.revenue - pp.revenue) / pp.revenue * 100)
    END AS growth_rate
  FROM current_period cp, previous_period pp;
$function$;

-- Create a function to get leaderboard summary data
CREATE OR REPLACE FUNCTION public.get_leaderboard_summary(start_date timestamp without time zone, end_date timestamp without time zone)
 RETURNS TABLE(active_contracts bigint, total_revenue numeric, cancellation_rate numeric, top_dealer text, top_agent text)
 LANGUAGE sql
AS $function$
  WITH summary AS (
    SELECT 
      COUNT(CASE WHEN "AgreementStatus" = 'ACTIVE' THEN "AgreementID" END) AS active_contracts,
      COUNT(CASE WHEN "AgreementStatus" = 'CANCELLED' THEN "AgreementID" END) AS cancelled_contracts,
      COUNT("AgreementID") AS total_contracts,
      COALESCE(SUM(CASE WHEN "AgreementStatus" = 'ACTIVE' THEN "Total" ELSE 0 END), 0) AS total_revenue
    FROM agreements
    WHERE "EffectiveDate" BETWEEN start_date AND end_date
  ),
  top_dealer AS (
    SELECT d."Payee" AS dealer_name
    FROM agreements a
    JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
    WHERE a."EffectiveDate" BETWEEN start_date AND end_date
      AND a."AgreementStatus" = 'ACTIVE'
    GROUP BY d."Payee"
    ORDER BY SUM(a."Total") DESC
    LIMIT 1
  ),
  top_agent AS (
    SELECT COALESCE("HolderFirstName", '') || ' ' || COALESCE("HolderLastName", '') AS agent_name
    FROM agreements
    WHERE "EffectiveDate" BETWEEN start_date AND end_date
      AND "AgreementStatus" = 'ACTIVE'
      AND (COALESCE("HolderFirstName", '') <> '' OR COALESCE("HolderLastName", '') <> '')
    GROUP BY "HolderFirstName", "HolderLastName"
    ORDER BY COUNT("AgreementID") DESC
    LIMIT 1
  )
  
  SELECT 
    s.active_contracts,
    s.total_revenue,
    CASE 
      WHEN s.total_contracts = 0 THEN 0 
      ELSE (s.cancelled_contracts::numeric / s.total_contracts::numeric * 100)
    END AS cancellation_rate,
    td.dealer_name,
    ta.agent_name
  FROM 
    summary s,
    top_dealer td,
    top_agent ta;
$function$;
