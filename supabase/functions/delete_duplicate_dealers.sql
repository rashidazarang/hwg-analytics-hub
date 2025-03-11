-- Function to delete duplicate dealers
CREATE OR REPLACE FUNCTION delete_duplicate_dealers()
RETURNS VOID AS $$
DECLARE
    deleted_count INT := 0;
BEGIN
    LOOP
        WITH duplicate_dealers AS (
            -- Get the oldest DealerUUID for each PayeeID (to keep)
            SELECT "PayeeID", MIN("DealerUUID") AS keep_uuid
            FROM public.dealers
            GROUP BY "PayeeID"
            HAVING COUNT(*) > 1
        ),
        unlinkable_dealers AS (
            -- Find all dealers NOT linked to agreements
            SELECT d."DealerUUID"
            FROM public.dealers d
            LEFT JOIN public.agreements a ON d."DealerUUID" = a."DealerUUID"
            WHERE a."DealerUUID" IS NULL
        ),
        dealers_to_delete AS (
            -- Find duplicate dealers that are safe to delete
            SELECT d."DealerUUID"
            FROM public.dealers d
            JOIN duplicate_dealers dd ON d."PayeeID" = dd."PayeeID"
            JOIN unlinkable_dealers ud ON d."DealerUUID" = ud."DealerUUID"
            WHERE d."DealerUUID" <> dd.keep_uuid  -- Keep the oldest one
            LIMIT 500  -- Batch size (adjust as needed)
        )
        DELETE FROM public.dealers
        WHERE "DealerUUID" IN (SELECT "DealerUUID" FROM dealers_to_delete)
        RETURNING COUNT(*) INTO deleted_count;

        -- Stop if nothing was deleted
        EXIT WHEN deleted_count = 0;
    END LOOP;
    
    RAISE NOTICE 'All duplicate dealers deleted successfully!';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_duplicate_dealers() TO authenticated; 