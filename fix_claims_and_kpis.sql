-- Script to fix claims data and KPIs
-- Run this in the Supabase SQL Editor

-- Fix the get_claims_payment_info function
CREATE OR REPLACE FUNCTION public.get_claims_payment_info(
    claim_ids text[],
    max_results int DEFAULT 5000  -- Increased from 1000 to 5000
)
RETURNS TABLE(
    "ClaimID" text,
    "AgreementID" text,
    totalpaid numeric,
    lastpaymentdate timestamp without time zone
)
LANGUAGE sql
AS $$
    -- Get payment data with an explicit limit to prevent timeouts
    WITH payment_data AS (
        SELECT 
            s."ClaimID",
            SUM(COALESCE(CAST(sp."PaidPrice" AS numeric), 0)) AS claim_paid_amount,
            MAX(s."Closed") AS last_payment_date
        FROM 
            subclaims s
        JOIN 
            subclaim_parts sp ON s."SubClaimID" = sp."SubClaimID"
        WHERE 
            s."ClaimID" = ANY(claim_ids)
            AND s."Status" = 'PAID'
        GROUP BY 
            s."ClaimID"
    )
    
    SELECT 
        c."ClaimID",
        c."AgreementID",
        COALESCE(pd.claim_paid_amount, 0) AS totalpaid,
        pd.last_payment_date AS lastpaymentdate
    FROM 
        claims c
    LEFT JOIN 
        payment_data pd ON c."ClaimID" = pd."ClaimID"
    WHERE
        c."ClaimID" = ANY(claim_ids)
    GROUP BY 
        c."ClaimID", c."AgreementID", pd.claim_paid_amount, pd.last_payment_date
    LIMIT max_results;
$$;

-- Fix the get_claims_with_payment_in_date_range function
CREATE OR REPLACE FUNCTION public.get_claims_with_payment_in_date_range(
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    max_results int DEFAULT 10000  -- Increased from 5000 to 10000
)
RETURNS TABLE(
    "ClaimID" text
)
LANGUAGE sql
AS $$
    -- Much simpler query with better performance characteristics
    SELECT DISTINCT sc."ClaimID"
    FROM subclaims sc
    WHERE 
        sc."Status" = 'PAID'
        AND sc."Closed" BETWEEN start_date AND end_date
        AND EXISTS (
            SELECT 1 
            FROM subclaim_parts sp
            WHERE sp."SubClaimID" = sc."SubClaimID"
            LIMIT 1
        )
    LIMIT max_results;
$$;

-- Create a new helper function to ensure proper dealership information retrieval
CREATE OR REPLACE FUNCTION public.get_claims_with_dealer_info(
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    dealer_uuid text DEFAULT NULL,
    max_results int DEFAULT 5000  -- Increased to show more claims
)
RETURNS TABLE(
    "id" uuid,
    "ClaimID" text,
    "AgreementID" text,
    "ReportedDate" timestamp without time zone,
    "IncurredDate" timestamp without time zone,
    "Closed" timestamp without time zone,
    "Complaint" text,
    "Cause" text, 
    "Correction" text,
    "Deductible" numeric,
    "LastModified" timestamp without time zone,
    "DealerUUID" text,
    "DealerName" text
)
LANGUAGE sql
AS $$
    SELECT 
        c.id,
        c."ClaimID",
        c."AgreementID",
        c."ReportedDate",
        c."IncurredDate",
        c."Closed",
        c."Complaint",
        c."Cause",
        c."Correction",
        c."Deductible",
        c."LastModified",
        a."DealerUUID",
        d."Payee" as "DealerName"
    FROM 
        claims c
    JOIN 
        agreements a ON c."AgreementID" = a."AgreementID"
    LEFT JOIN 
        dealers d ON a."DealerUUID" = d."DealerUUID"
    WHERE 
        (c."LastModified" BETWEEN start_date AND end_date OR
         c."ReportedDate" BETWEEN start_date AND end_date)
        AND (dealer_uuid IS NULL OR a."DealerUUID" = dealer_uuid)
    ORDER BY 
        c."LastModified" DESC
    LIMIT max_results;
$$;

-- Create indexes for better performance (if they don't already exist)
DO $$
BEGIN
    -- Check and create index on subclaims.ClaimID if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'subclaims' AND indexname = 'idx_subclaims_claimid'
    ) THEN
        CREATE INDEX idx_subclaims_claimid ON subclaims("ClaimID");
    END IF;
    
    -- Check and create index on subclaims.Status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'subclaims' AND indexname = 'idx_subclaims_status'
    ) THEN
        CREATE INDEX idx_subclaims_status ON subclaims("Status");
    END IF;
    
    -- Check and create index on subclaims.Closed if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'subclaims' AND indexname = 'idx_subclaims_closed'
    ) THEN
        CREATE INDEX idx_subclaims_closed ON subclaims("Closed");
    END IF;
    
    -- Check and create index on subclaim_parts.SubClaimID if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'subclaim_parts' AND indexname = 'idx_subclaim_parts_subclaimid'
    ) THEN
        CREATE INDEX idx_subclaim_parts_subclaimid ON subclaim_parts("SubClaimID");
    END IF;
    
    -- Check and create index on agreements.AgreementID if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'agreements' AND indexname = 'idx_agreements_agreementid'
    ) THEN
        CREATE INDEX idx_agreements_agreementid ON agreements("AgreementID");
    END IF;
    
    -- Check and create index on claims.AgreementID if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'claims' AND indexname = 'idx_claims_agreementid'
    ) THEN
        CREATE INDEX idx_claims_agreementid ON claims("AgreementID");
    END IF;
    
    -- Check and create composite index for common query pattern
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'subclaims' AND indexname = 'idx_subclaims_status_closed'
    ) THEN
        CREATE INDEX idx_subclaims_status_closed ON subclaims("Status", "Closed");
    END IF;
END$$; 