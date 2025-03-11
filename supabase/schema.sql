-- Supabase Schema Definition
-- This file contains the schema definition for all tables in the database

/*
Table structure based on the provided schema information
Format: table_name, column_name, data_type
*/

-- Table: agreements
CREATE TABLE IF NOT EXISTS agreements (
    id uuid PRIMARY KEY,
    "AgreementID" character varying,
    "AgreementNumber" character varying,
    "DealerID" character varying,
    "AgreementStatus" character varying,
    "ExpireDate" timestamp without time zone,
    "Md5" character varying,
    "StatusChangeDate" timestamp without time zone,
    "HolderFirstName" character varying,
    "HolderLastName" character varying,
    "HolderEmail" character varying,
    "DocumentURL" text,
    "Total" numeric,
    "DealerCost" numeric,
    "ReserveAmount" numeric,
    "IsActive" boolean,
    "DealerUUID" text,
    "EffectiveDate" timestamp without time zone,
    "SerialVIN" text,
    "ProductType" text,
    "Product" text,
    "Option1" text,
    "Option2" text,
    "Option3" text,
    "Option4" text,
    "Option5" text,
    "Option6" text,
    "Option7" text,
    "Option8" text
);

-- Table: claims
CREATE TABLE IF NOT EXISTS claims (
    id uuid PRIMARY KEY,
    "ClaimID" character varying,
    "AgreementID" character varying,
    "IncurredDate" timestamp without time zone,
    "ReportedDate" timestamp without time zone,
    "Closed" timestamp without time zone,
    "Deductible" numeric,
    "Complaint" text,
    "Cause" text,
    "Correction" text,
    "CauseID" character varying,
    "LastModified" timestamp without time zone,
    "ComplaintID" character varying,
    "CorrectionID" character varying
);

-- Table: contracts
CREATE TABLE IF NOT EXISTS contracts (
    id text PRIMARY KEY,
    crm_source text,
    job_run text,
    finance_source text,
    tpa text,
    agent_nbr text,
    dealer_nbr text,
    dealer_name text,
    contract_nbr text,
    contract_nbr_alternate text,
    status text,
    insurance_status text,
    inception_date timestamp without time zone,
    effective_date timestamp without time zone,
    sale_odom text,
    contract_form_nbr text,
    batch_nbr text,
    register_nbr text,
    contract_holder_name_title text,
    contract_holder_first_name text,
    contract_holder_last_name text,
    contract_holder_middle_name text,
    contract_holder_spouse_name text,
    contract_holder_address text,
    contract_holder_city text,
    contract_holder_state text,
    contract_holder_zip text,
    contract_holder_phone_nbr text,
    contract_holder_work_nbr text,
    contract_holder_ext_1 text,
    contract_holder_ext_2 text,
    contract_holder_email text,
    contract_holder_mobile_nbr text,
    dealer_cost numeric,
    sale_total numeric,
    retail_rate numeric,
    product_code text,
    product text,
    rate_class text,
    vin text,
    model_year integer,
    vehicle_year integer,
    manufacturer_id text,
    model text,
    expire_miles integer,
    contract_term_months integer,
    contract_term_mileage integer,
    deductible_amount numeric,
    deductible_type text,
    premium_amount numeric,
    reserves numeric,
    clip_fee numeric,
    producer_bucket_total numeric,
    mfg_warranty_term text,
    mfg_mileage text,
    contract_sale_date text,
    vehicle_purhase_price text,
    vehicle_auto_code text,
    lienholder_nbr text,
    reinsurance_id text,
    vehicle_in_service_date text,
    member_id text,
    no_charge_back text,
    monthly_payment_effective_date text,
    fortegra_plan_code text,
    rate_book_id text,
    new_used text,
    plan_name text,
    plan_code text,
    language text,
    s_lien_name text,
    s_lien_address text,
    s_lien_address_2 text,
    s_lien_city text,
    s_lien_state text,
    s_lien_zip text,
    s_lien_phone_nbr text,
    s_lien_contract text,
    s_lien_fed_tax_id text,
    s_contract_entry_app_name text,
    payment_option text,
    deal_type text,
    financed_amount text,
    apr text,
    financed_term text,
    monthly_payment text,
    first_payment_date text,
    balloon_amount text,
    residual_amount text,
    msrp text,
    base_acv text,
    nada_value text,
    financed_account_number text,
    incoming_client_filename text,
    mongo_id text,
    ins_form_plan_code text,
    ins_form_rate_book_id text,
    ins_form_plan_name text,
    new_used_field text,
    do_not_send_to_insurer boolean,
    crm_duplicate_agreement boolean,
    in_producer_bucket_file boolean,
    in_finance_company boolean,
    found_in_finance_company jsonb,
    in_tec_assured boolean,
    tec_assured_status text,
    contract_count_in_tec_assured integer,
    termdays integer,
    daysused integer,
    returnprorate integer,
    refund_amount numeric,
    net_reserve numeric,
    net_clip numeric,
    funding_cancel_date text,
    payee_name text,
    payee_addr1 text,
    payee_addr2 text,
    payee_city text,
    payee_state text,
    payee_zip text,
    date_funded text,
    creation_stamp timestamp without time zone,
    last_modified timestamp without time zone,
    obligor_fortegra text,
    "Agent_Nbr" text
);

-- Table: contracts_agreements_primary
CREATE TABLE IF NOT EXISTS contracts_agreements_primary (
    id uuid PRIMARY KEY,
    "AgreementID" character varying,
    "AgreementNumber" character varying,
    "DealerID" character varying,
    "AgreementStatus" character varying,
    "ExpireDate" timestamp without time zone,
    "Md5" character varying,
    "StatusChangeDate" timestamp without time zone,
    "HolderFirstName" character varying,
    "HolderLastName" character varying,
    "HolderEmail" character varying,
    "DocumentURL" text,
    "Total" numeric,
    "DealerCost" numeric,
    "ReserveAmount" numeric,
    "IsActive" boolean,
    "DealerUUID" text,
    "EffectiveDate" timestamp without time zone
);

-- Table: dealers
CREATE TABLE IF NOT EXISTS dealers (
    "DealerUUID" text PRIMARY KEY,
    "PayeeID" text,
    "Payee" text,
    "PayeeType" text,
    "Address" text,
    "City" text,
    "Region" text,
    "Country" text,
    "PostalCode" text,
    "Contact" text,
    "Phone" text,
    "Fax" text,
    "EMail" text
);

-- Table: option_surcharge_price
CREATE TABLE IF NOT EXISTS option_surcharge_price (
    _id text PRIMARY KEY,
    md5 text,
    product text,
    "Option" text,
    cost numeric,
    mandatory boolean,
    inserted_at timestamp with time zone,
    updated_at timestamp with time zone
);

-- Table: processed_claims_timestamps
CREATE TABLE IF NOT EXISTS processed_claims_timestamps (
    "ClaimID" text PRIMARY KEY,
    "LastModified" timestamp without time zone
);

-- Table: processed_md5s
CREATE TABLE IF NOT EXISTS processed_md5s (
    "AgreementID" character varying,
    "Md5" character varying,
    PRIMARY KEY ("AgreementID", "Md5")
);

-- Table: profiles
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY,
    email text,
    is_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    first_name text,
    last_name text
);

-- Table: subclaim_parts
CREATE TABLE IF NOT EXISTS subclaim_parts (
    _id text PRIMARY KEY,
    "SubClaimID" character varying,
    "PartNumber" text,
    "Description" text,
    "Quantity" numeric,
    job_run uuid,
    "QuotedPrice" numeric,
    "ApprovedPrice" numeric,
    "PaidPrice" numeric,
    "PartType" text,
    "Md5" text
);

-- Table: subclaims
CREATE TABLE IF NOT EXISTS subclaims (
    _id text PRIMARY KEY,
    "Md5" text,
    "ClaimID" character varying,
    "SubClaimID" character varying,
    "Reference" text,
    "Status" text,
    "Created" timestamp without time zone,
    "Odometer" numeric,
    "Closed" timestamp without time zone,
    "PayeeID" character varying,
    "Payee" text,
    "Deductible" numeric,
    "RepairOrder" text,
    "Complaint" text,
    "Cause" text,
    "Correction" text,
    "LastModified" timestamp without time zone,
    job_run uuid,
    "ServiceWriter" text,
    "ServiceWriterPhone" text,
    "ApprovalCode" text,
    "SecurityCode" text,
    "LicensePlate" text,
    "ComplaintID" character varying,
    "CauseID" character varying,
    "CorrectionID" character varying
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agreements_agreementid ON agreements ("AgreementID");
CREATE INDEX IF NOT EXISTS idx_agreements_dealeruuid ON agreements ("DealerUUID");
CREATE INDEX IF NOT EXISTS idx_agreements_effectivedate ON agreements ("EffectiveDate");
CREATE INDEX IF NOT EXISTS idx_agreements_agreementstatus ON agreements ("AgreementStatus");

CREATE INDEX IF NOT EXISTS idx_claims_agreementid ON claims ("AgreementID");
CREATE INDEX IF NOT EXISTS idx_claims_claimid ON claims ("ClaimID");
CREATE INDEX IF NOT EXISTS idx_claims_reporteddate ON claims ("ReportedDate");
CREATE INDEX IF NOT EXISTS idx_claims_lastmodified ON claims ("LastModified");

CREATE INDEX IF NOT EXISTS idx_subclaims_claimid ON subclaims ("ClaimID");
CREATE INDEX IF NOT EXISTS idx_subclaims_status ON subclaims ("Status");
CREATE INDEX IF NOT EXISTS idx_subclaims_closed ON subclaims ("Closed");

CREATE INDEX IF NOT EXISTS idx_subclaim_parts_subclaimid ON subclaim_parts ("SubClaimID");

-- Foreign key relationships (commented out - enable as needed)
-- ALTER TABLE claims ADD CONSTRAINT fk_claims_agreements FOREIGN KEY ("AgreementID") REFERENCES agreements("AgreementID");
-- ALTER TABLE subclaims ADD CONSTRAINT fk_subclaims_claims FOREIGN KEY ("ClaimID") REFERENCES claims("ClaimID");
-- ALTER TABLE subclaim_parts ADD CONSTRAINT fk_subclaim_parts_subclaims FOREIGN KEY ("SubClaimID") REFERENCES subclaims("SubClaimID");
-- ALTER TABLE agreements ADD CONSTRAINT fk_agreements_dealers FOREIGN KEY ("DealerUUID") REFERENCES dealers("DealerUUID"); 