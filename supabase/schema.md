# Supabase Database Schema

This document provides a comprehensive overview of the database schema used in the Claim Analytics Hub application.

## Tables

| Table Name | Description |
|------------|-------------|
| agreements | Stores agreement/contract information |
| claims | Stores claim information related to agreements |
| contracts | Stores detailed contract information |
| contracts_agreements_primary | Primary mapping between contracts and agreements |
| dealers | Stores dealer information |
| option_surcharge_price | Stores pricing information for optional features |
| processed_claims_timestamps | Tracks processing timestamps for claims |
| processed_md5s | Tracks processed MD5 hashes for agreements |
| profiles | User profile information |
| subclaim_parts | Parts information for subclaims |
| subclaims | Subclaim information related to claims |

## Schema Details

### agreements

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| id | uuid | Primary key |
| AgreementID | character varying | Unique identifier for the agreement |
| AgreementNumber | character varying | Agreement number |
| DealerID | character varying | Dealer identifier |
| AgreementStatus | character varying | Status of the agreement (ACTIVE, PENDING, CANCELLED, etc.) |
| ExpireDate | timestamp without time zone | Expiration date of the agreement |
| Md5 | character varying | MD5 hash for data integrity |
| StatusChangeDate | timestamp without time zone | Date when status was last changed |
| HolderFirstName | character varying | First name of the agreement holder |
| HolderLastName | character varying | Last name of the agreement holder |
| HolderEmail | character varying | Email of the agreement holder |
| DocumentURL | text | URL to the agreement document |
| Total | numeric | Total amount of the agreement |
| DealerCost | numeric | Cost to the dealer |
| ReserveAmount | numeric | Reserve amount |
| IsActive | boolean | Whether the agreement is active |
| DealerUUID | text | UUID of the dealer |
| EffectiveDate | timestamp without time zone | Date when the agreement becomes effective |
| SerialVIN | text | Serial number or VIN |
| ProductType | text | Type of product |
| Product | text | Product identifier |
| Option1 | text | Option 1 identifier |
| Option2 | text | Option 2 identifier |
| Option3 | text | Option 3 identifier |
| Option4 | text | Option 4 identifier |
| Option5 | text | Option 5 identifier |
| Option6 | text | Option 6 identifier |
| Option7 | text | Option 7 identifier |
| Option8 | text | Option 8 identifier |

### claims

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| id | uuid | Primary key |
| ClaimID | character varying | Unique identifier for the claim |
| AgreementID | character varying | Reference to the agreement |
| IncurredDate | timestamp without time zone | Date when the claim was incurred |
| ReportedDate | timestamp without time zone | Date when the claim was reported |
| Closed | timestamp without time zone | Date when the claim was closed |
| Deductible | numeric | Deductible amount |
| Complaint | text | Description of the complaint |
| Cause | text | Description of the cause |
| Correction | text | Description of the correction |
| CauseID | character varying | Identifier for the cause |
| LastModified | timestamp without time zone | Last modification timestamp |
| ComplaintID | character varying | Identifier for the complaint |
| CorrectionID | character varying | Identifier for the correction |

### dealers

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| DealerUUID | text | Primary key |
| PayeeID | text | Payee identifier |
| Payee | text | Payee name |
| PayeeType | text | Type of payee |
| Address | text | Address |
| City | text | City |
| Region | text | Region/State |
| Country | text | Country |
| PostalCode | text | Postal code |
| Contact | text | Contact person |
| Phone | text | Phone number |
| Fax | text | Fax number |
| EMail | text | Email address |

### option_surcharge_price

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| _id | text | Primary key |
| md5 | text | MD5 hash for data integrity |
| product | text | Product identifier |
| Option | text | Option identifier |
| cost | numeric | Cost of the option |
| mandatory | boolean | Whether the option is mandatory |
| inserted_at | timestamp with time zone | Insertion timestamp |
| updated_at | timestamp with time zone | Update timestamp |

### subclaims

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| _id | text | Primary key |
| Md5 | text | MD5 hash for data integrity |
| ClaimID | character varying | Reference to the claim |
| SubClaimID | character varying | Unique identifier for the subclaim |
| Reference | text | Reference information |
| Status | text | Status of the subclaim |
| Created | timestamp without time zone | Creation timestamp |
| Odometer | numeric | Odometer reading |
| Closed | timestamp without time zone | Closing timestamp |
| PayeeID | character varying | Payee identifier |
| Payee | text | Payee name |
| Deductible | numeric | Deductible amount |
| RepairOrder | text | Repair order information |
| Complaint | text | Description of the complaint |
| Cause | text | Description of the cause |
| Correction | text | Description of the correction |
| LastModified | timestamp without time zone | Last modification timestamp |
| job_run | uuid | Job run identifier |
| ServiceWriter | text | Service writer name |
| ServiceWriterPhone | text | Service writer phone |
| ApprovalCode | text | Approval code |
| SecurityCode | text | Security code |
| LicensePlate | text | License plate |
| ComplaintID | character varying | Complaint identifier |
| CauseID | character varying | Cause identifier |
| CorrectionID | character varying | Correction identifier |

### subclaim_parts

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| _id | text | Primary key |
| SubClaimID | character varying | Reference to the subclaim |
| PartNumber | text | Part number |
| Description | text | Description of the part |
| Quantity | numeric | Quantity |
| job_run | uuid | Job run identifier |
| QuotedPrice | numeric | Quoted price |
| ApprovedPrice | numeric | Approved price |
| PaidPrice | numeric | Paid price |
| PartType | text | Type of part |
| Md5 | text | MD5 hash for data integrity |

### profiles

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| id | uuid | Primary key |
| email | text | User email |
| is_admin | boolean | Whether the user is an admin |
| created_at | timestamp with time zone | Creation timestamp |
| updated_at | timestamp with time zone | Update timestamp |
| first_name | text | User's first name |
| last_name | text | User's last name |

## Indexes

The following indexes are created to improve query performance:

- `idx_agreements_agreementid` on `agreements("AgreementID")`
- `idx_agreements_dealeruuid` on `agreements("DealerUUID")`
- `idx_agreements_effectivedate` on `agreements("EffectiveDate")`
- `idx_agreements_agreementstatus` on `agreements("AgreementStatus")`
- `idx_claims_agreementid` on `claims("AgreementID")`
- `idx_claims_claimid` on `claims("ClaimID")`
- `idx_claims_reporteddate` on `claims("ReportedDate")`
- `idx_claims_lastmodified` on `claims("LastModified")`
- `idx_subclaims_claimid` on `subclaims("ClaimID")`
- `idx_subclaims_status` on `subclaims("Status")`
- `idx_subclaims_closed` on `subclaims("Closed")`
- `idx_subclaim_parts_subclaimid` on `subclaim_parts("SubClaimID")` 