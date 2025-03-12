# ETL Script for HWG Claims Analytics

This document provides instructions for running the ETL (Extract, Transform, Load) script that imports data from MongoDB to Supabase.

## Prerequisites

- Node.js 18+ installed
- MongoDB Shell (mongosh) installed
- Access to the MongoDB Atlas cluster
- Access to the Supabase project
- VPN connection to DigitalOcean (if running remotely)

## Configuration

The ETL script requires the following environment variables:

- `MONGODB_URI`: The MongoDB connection string
- `SUPABASE_URL`: The Supabase project URL
- `SUPABASE_SERVICE_ROLE`: The Supabase service role key

These can be set in a `.env.etl` file in the project root.

## Running the ETL Script

### Option 1: Using the Shell Script (Recommended)

1. Make sure the shell script is executable:
   ```bash
   chmod +x run-etl.sh
   ```

2. Run the script:
   ```bash
   ./run-etl.sh
   ```

### Option 2: Running Manually

1. Connect to the VPN (if needed):
   ```bash
   ssh root@147.182.241.184
   ```

2. Test the MongoDB connection:
   ```bash
   mongosh "mongodb+srv://HstartProdRashid9012:AMmWuffqyHebTH5X@prod-headstart-cluster0.1qqz3.mongodb.net/?retryWrites=true&w=majority"
   ```

3. Run the ETL script:
   ```bash
   node etl.js
   ```

## Troubleshooting

### MongoDB Connection Issues

If you encounter MongoDB connection issues:

1. Verify that you're connected to the VPN (if running remotely)
2. Check that the MongoDB URI is correct
3. Ensure that your IP address is whitelisted in MongoDB Atlas

### Supabase Connection Issues

If you encounter Supabase connection issues:

1. Verify that the Supabase URL and service role key are correct
2. Check that the service role key has the necessary permissions

### Script Errors

If the script fails with errors:

1. Check the error message for specific issues
2. Verify that all required collections exist in MongoDB
3. Ensure that the Supabase schema matches the expected structure

## Data Deduplication

The ETL script includes logic to deduplicate subclaim-parts by:

1. Creating a unique key based on SubClaimID and PartNumber
2. Keeping only the most recent version of each part based on job_run or _id
3. Filtering out parts that already exist in Supabase with the same Md5 hash

This prevents duplicate entries in the Supabase database. 