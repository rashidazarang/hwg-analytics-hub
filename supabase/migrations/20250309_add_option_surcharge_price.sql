-- Set timezone to CST for consistency
SET timezone = 'America/Chicago';

-- Create the option_surcharge_price table to store costs for each product option
CREATE TABLE IF NOT EXISTS option_surcharge_price (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product TEXT NOT NULL,
  option_name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Create a unique constraint on product + option combination
  CONSTRAINT option_surcharge_product_option_unique UNIQUE (product, option_name)
);

-- Add comment to the table
COMMENT ON TABLE option_surcharge_price IS 'Stores the cost surcharge for each option per product';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_option_surcharge_product ON option_surcharge_price (product);
CREATE INDEX IF NOT EXISTS idx_option_surcharge_option ON option_surcharge_price (option_name);

-- Add Option columns to the agreements table if they don't exist
ALTER TABLE agreements 
  ADD COLUMN IF NOT EXISTS "Product" TEXT,
  ADD COLUMN IF NOT EXISTS "Option1" TEXT,
  ADD COLUMN IF NOT EXISTS "Option2" TEXT,
  ADD COLUMN IF NOT EXISTS "Option3" TEXT,
  ADD COLUMN IF NOT EXISTS "Option4" TEXT,
  ADD COLUMN IF NOT EXISTS "Option5" TEXT,
  ADD COLUMN IF NOT EXISTS "Option6" TEXT,
  ADD COLUMN IF NOT EXISTS "Option7" TEXT,
  ADD COLUMN IF NOT EXISTS "Option8" TEXT;

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_option_surcharge_price_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_option_surcharge_price_timestamp
BEFORE UPDATE ON option_surcharge_price
FOR EACH ROW
EXECUTE FUNCTION update_option_surcharge_price_updated_at();