/***************************************************
 * etl.js — Final Unified ETL
 *  - Nullifies placeholder timestamps
 *  - Imports dealers, claims, agreements
 *  - Adds CauseID for claims (if desired)
 *  - Normalizes AgreementStatus (new)
 ***************************************************/

// 1. Load Environment Variables and Required Modules
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.etl if it exists, otherwise from .env
const envFile = fs.existsSync('.env.etl') ? '.env.etl' : '.env';
dotenv.config({ path: envFile });

// 2. Configure MongoDB and Supabase
const MONGO_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// Log configuration (without sensitive data)
console.log('ETL Configuration:');
console.log(`- MongoDB URI: ${MONGO_URI ? '✅ Set' : '❌ Not set'}`);
console.log(`- Supabase URL: ${SUPABASE_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`- Supabase Service Role: ${SUPABASE_SERVICE_ROLE ? '✅ Set' : '❌ Not set'}`);

// Initialize MongoDB client with options
const mongoClient = new MongoClient(MONGO_URI, {
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  retryWrites: true,
  retryReads: true
});

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// 3. Constants
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);
const HEADSTART_PAYEE_ID = "1"; // Fallback PayeeID
const FALLBACK_AGREEMENT_ID = "FALLBACK-0001"; // Fallback AgreementID for claims with missing agreements
const PLACEHOLDER_TIMESTAMP = "0001-01-01T01:01:01";

/** Convert placeholder timestamps => null */
function normalizeTimestamp(dateVal) {
  if (!dateVal) return null;

  if (dateVal instanceof Date) {
    // Check if it's the placeholder
    if (dateVal.toISOString().startsWith("0001-01-01T01:01:01")) {
      return null;
    }
    return dateVal;
  }

  if (typeof dateVal === "string") {
    // If it starts with '0001-01-01 01:01:01' or '0001-01-01T01:01:01'
    if (
      dateVal.startsWith("0001-01-01 01:01:01") ||
      dateVal.startsWith("0001-01-01T01:01:01")
    ) {
      return null;
    }
    const parsed = new Date(dateVal);
    if (parsed.toISOString().startsWith("0001-01-01T01:01:01")) {
      return null;
    }
    return parsed;
  }

  // Fallback
  return null;
}

/**
 * Normalize AgreementStatus to one of:
 *  - ACTIVE, CANCELLED, CLAIMABLE, EXPIRED, PENDING,
 *    SUSPENDED, TERMINATED, VOID, or UNKNOWN.
 *  - Convert "void" → "VOID".
 *  - Convert "DUMMY", "FALLBACK", "HWG0001105", or anything not in the set → "UNKNOWN".
 *  - Ensure final result is uppercase.
 */
function normalizeAgreementStatus(status) {
  if (!status) return "UNKNOWN";

  // Convert raw status to uppercase
  const uppercaseStatus = status.toString().toUpperCase();

  // Valid set of known statuses
  const validStatuses = new Set([
    "ACTIVE",
    "CANCELLED",
    "CLAIMABLE",
    "EXPIRED",
    "PENDING",
    "SUSPENDED",
    "TERMINATED",
    "VOID",
  ]);

  // If it's in our known set, use it. Otherwise it's "UNKNOWN".
  return validStatuses.has(uppercaseStatus) ? uppercaseStatus : "UNKNOWN";
}

/** Generate DealerUUID = PayeeID + "-" + Mongo _id */
function generateDealerUUID(payeeID, mongoDealerId) {
  const assignedPayeeID = payeeID || HEADSTART_PAYEE_ID;
  return `${assignedPayeeID}-${mongoDealerId}`;
}

async function runETL() {
  try {
    /***************************************************
     * A) CONNECT TO MONGODB
     ***************************************************/
    await mongoClient.connect();
    console.log("✅ Connected to MongoDB");
    const db = mongoClient.db("conversion_ta");
    const dealersCollection = db.collection("dealers");
    const agreementsCollection = db.collection("agreements");
    const claimsCollection = db.collection("claims");
    const subclaimsCollection = db.collection("subclaims");
    const subclaimPartsCollection = db.collection("subclaim-parts");
    const optionSurchargePriceCollection = db.collection("option-surcharge-price");

    /***************************************************
     * 🌟 FIX: Declare `dealerIdToDealerUUID` before use
     ***************************************************/
    const dealerIdToDealerUUID = new Map();  // ✅ FIXED: Declared at the start

    /***************************************************
     * B) FETCH DEALERS -> UPSERT INTO SUPABASE
     ***************************************************/
    console.log("🔄 Loading existing dealers from Supabase (PayeeID -> DealerUUID)...");
    let existingDealers = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("dealers")
        .select("DealerUUID, PayeeID", { count: "exact" })
        .range(from, from + pageSize - 1);
      if (error) {
        console.error("❌ Error fetching existing dealers:", error.message);
        break;
      }
      if (!data || data.length === 0) break;
      existingDealers.push(...data);
      if (data.length < pageSize) break; // no more rows
      from += pageSize;
    }
    console.log("Existing dealers count:", existingDealers.length);


    // ✅ Step 1: Build a map from PayeeID -> DealerUUID
// Build a map from payeeid -> dealeruuid (using lower-case keys)
// Build a map from PayeeID -> DealerUUID using lower-case, trimmed keys
const existingDealerMap = new Map();
(existingDealers || []).forEach(row => {
  // Some responses might use lower-case keys (e.g., payeeid, dealeruuid)
  const payee = row.PayeeID || row.payeeid;
  const dealerUUID = row.DealerUUID || row.dealeruuid;
  if (payee) {
    existingDealerMap.set(payee.toString().trim().toLowerCase(), dealerUUID);
  }
});

console.log("Existing dealer keys sample:", Array.from(existingDealerMap.keys()).slice(0, 20));

    // Step 1: Deduplicate dealers based on PayeeID (keep the oldest entry)
    const uniqueDealersMap = new Map();
    const cursor = dealersCollection.find();

    // Iterate over all dealers and keep the **oldest** entry per PayeeID
    while (await cursor.hasNext()) {  
      const d = await cursor.next();
      if (!d.PayeeID) continue; 
      const payeeKey = d.PayeeID.toString().trim().toLowerCase();  // Added trim() for extra safety
      if (!uniqueDealersMap.has(payeeKey)) {
        uniqueDealersMap.set(payeeKey, d); // Keep the first occurrence
      }
    }

// Step 2: Prepare data for Supabase Upsert
// AFTER
const dealersToUpsert = Array.from(uniqueDealersMap.values()).map(d => {
  const assignedPayeeID = d.PayeeID.toString().trim().toLowerCase();
  let dealerUUID = existingDealerMap.get(assignedPayeeID);
  if (!dealerUUID) {
    dealerUUID = `${assignedPayeeID}-${d._id.toString()}`;
  }
  return {
    DealerUUID: dealerUUID,
    PayeeID: assignedPayeeID,
    Payee: d.Payee || null,
    PayeeType: d.PayeeType || null,
    Address: d.Address || null,
    City: d.City || null,
    Region: d.Region || null,
    Country: d.Country || null,
    PostalCode: d.PostalCode || null,
    Contact: d.Contact || null,
    Phone: d.Phone || null,
    Fax: d.Fax || null,
    EMail: d.EMail || null,
  };
});

// Remove any duplicates based on DealerUUID within the array
const dedupedDealers = Array.from(
  new Map(dealersToUpsert.map(d => [d.DealerUUID, d])).values()
);
console.log("Unique DealerUUID count:", dedupedDealers.length, "vs total:", dealersToUpsert.length);

// *** NEW CODE STARTS HERE ***
// Filter out dealers that already exist in Supabase based on PayeeID.
// (Remember: existingDealerMap keys are in lower-case.)
const newDealers = dedupedDealers.filter(d => !existingDealerMap.has(d.PayeeID));
console.log(`Found ${newDealers.length} new dealers out of ${dedupedDealers.length} unique dealers in MongoDB`);

// Now upsert only the new dealers. Use upsert with onConflict DO NOTHING.
console.log(`🚀 Upserting ${newDealers.length} new dealers into Supabase...`);
const { error: dealerUpsertError } = await supabase
  .from("dealers")
  .upsert(newDealers, { onConflict: '"DealerUUID"', updateColumns: [] });

if (dealerUpsertError) {
  console.error("❌ Error upserting dealers:", dealerUpsertError.message);
  return;
}
console.log("✅ Dealers upserted successfully.");
// *** NEW CODE ENDS HERE ***

dedupedDealers.forEach(d => {
  // Ensure the key is normalized (trim and lower-case)
  dealerIdToDealerUUID.set(d.PayeeID.toString().trim().toLowerCase(), d.DealerUUID);
});
console.log("✅ dealerIdToDealerUUID map updated with all dealers.");

    /***************************************************
     * C) FETCH & UPSERT CLAIMS USING LASTMODIFIED (Incremental Update)
     ***************************************************/
    // 1. Fetch processed claims timestamps from Supabase
    console.log("🔄 Fetching processed_claims_timestamps from Supabase...");
    const { data: processedClaimsData, error: processedClaimsError } = await supabase
      .from("processed_claims_timestamps")
      .select("ClaimID, LastModified");
    if (processedClaimsError) {
      console.error("❌ Error fetching processed_claims_timestamps:", processedClaimsError.message);
      return;
    }
    const processedClaimsMap = new Map();
    (processedClaimsData || []).forEach((row) => {
      processedClaimsMap.set(row.ClaimID, row.LastModified ? new Date(row.LastModified) : null);
    });

    // 2. Fetch all claims from MongoDB
    console.log("🔄 Fetching claims from MongoDB...");
    const allClaims = await claimsCollection.find({}).toArray();
    console.log(`✅ Found ${allClaims.length} claims.`);

    // 3. Filter claims: Only upsert those that are new or have a newer LastModified than already processed
    const claimsToUpsert = allClaims.filter((claim) => {
      const storedTimestamp = processedClaimsMap.get(claim.ClaimID);
      const claimTimestamp = normalizeTimestamp(claim.LastModified);
      // If not processed before, or claim has been updated, then process it
      if (!storedTimestamp) return true;
      return claimTimestamp > storedTimestamp;
    });
    console.log(`✅ ${claimsToUpsert.length} claims to upsert based on incremental updates.`);

    // 4. Upsert claims in batches into Supabase (including new fields)
    console.log("🚀 Upserting claims in batches...");
    
    // Fetch all existing agreement IDs from Supabase
    console.log("🔄 Fetching existing agreements from Supabase...");
    const existingAgreementIDs = new Set();
    let agreementFrom = 0;
    const agreementPageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("agreements")
        .select("AgreementID")
        .range(agreementFrom, agreementFrom + agreementPageSize - 1);
      if (error) {
        console.error("❌ Error fetching existing agreements:", error.message);
        break;
      }
      if (!data || data.length === 0) break;
      data.forEach(agreement => existingAgreementIDs.add(agreement.AgreementID));
      if (data.length < agreementPageSize) break; // no more rows
      agreementFrom += agreementPageSize;
    }
    console.log(`✅ Fetched ${existingAgreementIDs.size} existing agreements from Supabase.`);
    
    for (let i = 0; i < claimsToUpsert.length; i += BATCH_SIZE) {
      const batch = claimsToUpsert.slice(i, i + BATCH_SIZE);

      const formattedBatch = batch.map((claim) => {
        // Use fallback agreement ID if the claim does not have one or if the agreement doesn't exist in Supabase
        let finalAgreementID = claim.AgreementID;
        if (!finalAgreementID || !existingAgreementIDs.has(finalAgreementID)) {
          console.warn(`⚠️ WARNING: No valid agreement ID for ClaimID = ${claim.ClaimID}. Using fallback: ${FALLBACK_AGREEMENT_ID}`);
          finalAgreementID = FALLBACK_AGREEMENT_ID;
        }

        return {
          ClaimID: claim.ClaimID,
          AgreementID: finalAgreementID,
          IncurredDate: normalizeTimestamp(claim.IncurredDate),
          ReportedDate: normalizeTimestamp(claim.ReportedDate),
          Closed: normalizeTimestamp(claim.Closed),
          Deductible: claim.Deductible ? parseFloat(claim.Deductible.toString()) : null,
          Complaint: claim.Complaint || null,
          Cause: claim.Cause || null,
          Correction: claim.Correction || null,
          CauseID: claim.CauseID || null,
          LastModified: normalizeTimestamp(claim.LastModified),
          ComplaintID: claim.ComplaintID || null,
          CorrectionID: claim.CorrectionID || null,
        };
      });

      const { error: claimsError } = await supabase
        .from("claims")
        .upsert(formattedBatch, { onConflict: '"ClaimID"' });
      if (claimsError) {
        console.error(
          `❌ Error upserting claims batch ${i / BATCH_SIZE + 1}:`,
          claimsError.message
        );
        continue;
      }
      console.log(`✅ Claims batch ${i / BATCH_SIZE + 1} upserted.`);
    }

    // 5. Update processed_claims_timestamps with the latest LastModified for each processed claim
    console.log("🔄 Updating processed_claims_timestamps...");
    const timestampsToUpdate = claimsToUpsert.map((cl) => ({
      ClaimID: cl.ClaimID,
      LastModified: normalizeTimestamp(cl.LastModified),
    }));
    const { error: timestampError } = await supabase
      .from("processed_claims_timestamps")
      .upsert(timestampsToUpdate, { onConflict: '"ClaimID"' });
    if (timestampError) {
      console.error("❌ Error updating processed_claims_timestamps:", timestampError.message);
    } else {
      console.log("✅ processed_claims_timestamps updated successfully.");
    }

    /***************************************************
     * C.1) FETCH & UPSERT SUBCLAIMS
     ***************************************************/
    // IMPORTANT: Using exact column names from Supabase schema
    // Column names must match exactly as defined in Supabase, including case
    // See schema reference for all field names and data types
    console.log("🔄 Fetching subclaims from MongoDB...");
    const allSubclaims = await subclaimsCollection.find({}).toArray();
    console.log(`✅ Found ${allSubclaims.length} subclaims.`);

    // Create a map to deduplicate subclaims by SubClaimID
    const uniqueSubclaimsMap = new Map();
    
    // Process all subclaims and keep only the unique ones
    allSubclaims.forEach(subclaim => {
      const key = subclaim.SubClaimID;
      
      // If we already have this subclaim, only replace it if it's newer (based on job_run or LastModified)
      if (uniqueSubclaimsMap.has(key)) {
        const existingSubclaim = uniqueSubclaimsMap.get(key);
        const existingJobRun = existingSubclaim.job_run || 0;
        const newJobRun = subclaim.job_run || 0;
        
        const existingLastModified = existingSubclaim.LastModified ? new Date(existingSubclaim.LastModified).getTime() : 0;
        const newLastModified = subclaim.LastModified ? new Date(subclaim.LastModified).getTime() : 0;
        
        // Replace only if the new subclaim has a higher job_run number or a newer LastModified date
        if (newJobRun > existingJobRun || 
            (newJobRun === existingJobRun && newLastModified > existingLastModified) ||
            (newJobRun === existingJobRun && newLastModified === existingLastModified && 
             subclaim._id.toString() > existingSubclaim._id.toString())) {
          uniqueSubclaimsMap.set(key, subclaim);
        }
      } else {
        // First time seeing this subclaim, add it to the map
        uniqueSubclaimsMap.set(key, subclaim);
      }
    });
    
    // Convert the map back to an array
    const uniqueSubclaims = Array.from(uniqueSubclaimsMap.values());
    console.log(`✅ Deduplicated to ${uniqueSubclaims.length} unique subclaims.`);

    console.log("🔄 Loading processed_subclaims from Supabase...");
    let processedSubclaims = [];
    from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("subclaims")
        .select("_id, Md5, SubClaimID") // Also fetch SubClaimID
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("❌ Error fetching processed_subclaims:", error.message);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      processedSubclaims.push(...data);
      if (data.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    // Create maps for both _id and SubClaimID
    const processedSubclaimsMap = new Map(processedSubclaims.map((d) => [d._id, d.Md5]));
    const existingSubClaimIDs = new Set(processedSubclaims.map(d => d.SubClaimID));
    console.log(`✅ Found ${processedSubclaimsMap.size} records in processed_subclaims.`);
    console.log(`✅ Found ${existingSubClaimIDs.size} unique SubClaimIDs in processed_subclaims.`);

    // Filter out subclaims that would violate the unique constraint
    const subclaimsToUpsert = uniqueSubclaims.filter((sc) => {
      // Skip if this SubClaimID already exists in the database but with a different _id
      if (existingSubClaimIDs.has(sc.SubClaimID) && 
          !processedSubclaimsMap.has(sc._id.toString())) {
        console.log(`⚠️ Skipping subclaim with SubClaimID ${sc.SubClaimID} to avoid constraint violation`);
        return false;
      }
      
      // Otherwise, include it if it's new or has a different Md5
      if (!processedSubclaimsMap.has(sc._id.toString())) return true;
      return processedSubclaimsMap.get(sc._id.toString()) !== sc.Md5;
    });
    console.log(`🔄 Subclaims to upsert: ${subclaimsToUpsert.length}`);

    console.log("🚀 Uploading/Updating Subclaims in Supabase...");

    for (let i = 0; i < subclaimsToUpsert.length; i += BATCH_SIZE) {
      const batch = subclaimsToUpsert.slice(i, i + BATCH_SIZE).map((sc) => {
        // Map MongoDB documents to Supabase columns with exact column names
        return {
          _id: sc._id.toString(),
          Md5: sc.Md5,
          ClaimID: sc.ClaimID,
          SubClaimID: sc.SubClaimID,
          Reference: sc.Reference || null,
          Status: sc.Status || null,
          Created: normalizeTimestamp(sc.Created),
          Odometer: sc.Odometer || null,
          Closed: normalizeTimestamp(sc.Closed),
          PayeeID: sc.PayeeID || null,
          Payee: sc.Payee || null,
          Deductible: sc.Deductible ? parseFloat(sc.Deductible.toString()) : null,
          RepairOrder: sc.RepairOrder || null,
          Complaint: sc.Complaint || null,
          Cause: sc.Cause || null,
          Correction: sc.Correction || null,
          LastModified: normalizeTimestamp(sc.LastModified),
          job_run: sc.job_run || null,
          // Add optional fields that might be present in the schema
          ServiceWriter: sc.ServiceWriter || null,
          ServiceWriterPhone: sc.ServiceWriterPhone || null,
          ApprovalCode: sc.ApprovalCode || null,
          SecurityCode: sc.SecurityCode || null,
          LicensePlate: sc.LicensePlate || null,
          ComplaintID: sc.ComplaintID || null,
          CauseID: sc.CauseID || null,
          CorrectionID: sc.CorrectionID || null,
        };
      });

      const { error } = await supabase.from("subclaims").upsert(batch, { onConflict: '"_id"' });
      if (error) {
        console.error(`❌ Error upserting subclaims batch:`, error.message);
        continue;
      }
      console.log(`✅ Subclaims batch ${i / BATCH_SIZE + 1} upserted successfully.`);
    }

    /***************************************************
     * C.2) FETCH & UPSERT SUBCLAIM-PARTS
     ***************************************************/
    // IMPORTANT: Using exact column names from Supabase schema
    // See schema reference for all field names and data types
    console.log("🔄 Fetching subclaim-parts from MongoDB...");
    const allSubclaimParts = await subclaimPartsCollection.find({}).toArray();
    console.log(`✅ Found ${allSubclaimParts.length} subclaim-parts.`);

    // Create a map to deduplicate subclaim parts by SubClaimID and PartNumber
    const uniqueSubclaimPartsMap = new Map();
    
    // Process all subclaim parts and keep only the unique ones
    allSubclaimParts.forEach(part => {
      const key = `${part.SubClaimID}-${part.PartNumber || 'unknown'}`;
      
      // If we already have this part, only replace it if it's newer (based on job_run or _id)
      if (uniqueSubclaimPartsMap.has(key)) {
        const existingPart = uniqueSubclaimPartsMap.get(key);
        const existingJobRun = existingPart.job_run || 0;
        const newJobRun = part.job_run || 0;
        
        // Replace only if the new part has a higher job_run number or a newer _id
        if (newJobRun > existingJobRun || 
            (newJobRun === existingJobRun && part._id.toString() > existingPart._id.toString())) {
          uniqueSubclaimPartsMap.set(key, part);
        }
      } else {
        // First time seeing this part, add it to the map
        uniqueSubclaimPartsMap.set(key, part);
      }
    });
    
    // Convert the map back to an array
    const uniqueSubclaimParts = Array.from(uniqueSubclaimPartsMap.values());
    console.log(`✅ Deduplicated to ${uniqueSubclaimParts.length} unique subclaim-parts.`);

    console.log("🔄 Loading processed_subclaim_parts from Supabase...");
    let processedSubclaimParts = [];
    from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("subclaim_parts")
        .select("_id, Md5, SubClaimID, PartNumber")
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("❌ Error fetching processed_subclaim_parts:", error.message);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      processedSubclaimParts.push(...data);
      if (data.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    // Create maps for both _id and a composite key of SubClaimID+PartNumber
    const processedPartsMap = new Map(processedSubclaimParts.map((d) => [d._id, d.Md5]));
    const existingMd5Values = new Set(processedSubclaimParts.map(d => d.Md5));
    const existingPartKeys = new Set(
      processedSubclaimParts.map(d => `${d.SubClaimID}-${d.PartNumber || 'unknown'}`)
    );
    console.log(`✅ Found ${processedPartsMap.size} records in processed_subclaim_parts.`);
    console.log(`✅ Found ${existingMd5Values.size} unique Md5 values in processed_subclaim_parts.`);

    // Filter out parts that would violate unique constraints
    const partsToUpsert = uniqueSubclaimParts.filter((part) => {
      const partKey = `${part.SubClaimID}-${part.PartNumber || 'unknown'}`;
      
      // Skip if this part's Md5 already exists in the database but with a different _id
      if (existingMd5Values.has(part.Md5) && 
          !processedPartsMap.has(part._id.toString())) {
        console.log(`⚠️ Skipping part with Md5 ${part.Md5} to avoid constraint violation`);
        return false;
      }
      
      // Skip if this SubClaimID+PartNumber combination already exists with a different _id
      if (existingPartKeys.has(partKey) && 
          !processedPartsMap.has(part._id.toString())) {
        console.log(`⚠️ Skipping part with key ${partKey} to avoid constraint violation`);
        return false;
      }
      
      // Otherwise, include it if it's new or has a different Md5
      if (!processedPartsMap.has(part._id.toString())) return true;
      return processedPartsMap.get(part._id.toString()) !== part.Md5;
    });
    console.log(`🔄 Subclaim parts to upsert: ${partsToUpsert.length}`);

    console.log("🚀 Uploading/Updating Subclaim Parts in Supabase...");

    for (let i = 0; i < partsToUpsert.length; i += BATCH_SIZE) {
      const batch = partsToUpsert.slice(i, i + BATCH_SIZE).map((part) => {
        // Map MongoDB documents to Supabase columns with exact column names
        return {
          _id: part._id.toString(),
          Md5: part.Md5,
          SubClaimID: part.SubClaimID,
          PartNumber: part.PartNumber || null,
          Description: part.Description || null,
          Quantity: part.Quantity ? parseFloat(part.Quantity.toString()) : null,
          job_run: part.job_run || null,
          // Add columns from reference
          QuotedPrice: part.QuotedPrice ? parseFloat(part.QuotedPrice.toString()) : null,
          ApprovedPrice: part.ApprovedPrice ? parseFloat(part.ApprovedPrice.toString()) : null,
          PaidPrice: part.PaidPrice ? parseFloat(part.PaidPrice.toString()) : null,
          PartType: part.PartType || null,
        };
      });

      const { error } = await supabase.from("subclaim_parts").upsert(batch, { onConflict: '"_id"' });
      if (error) {
        console.error(`❌ Error upserting subclaim parts batch:`, error.message);
        continue;
      }
      console.log(`✅ Subclaim parts batch ${i / BATCH_SIZE + 1} upserted successfully.`);
    }

    /***************************************************
     * D) FETCH & MAP DEALERUUID (PayeeID -> DealerUUID)
     ***************************************************/
    console.log(
      "🔄 Building in-memory map: PayeeID -> DealerUUID from dealers we just upserted..."
    );
 

    const headstartDealer = dealersToUpsert.find(d => d.PayeeID === HEADSTART_PAYEE_ID);
    const headstartDealerUUID = headstartDealer ? headstartDealer.DealerUUID : null;

    /***************************************************
     * E) FETCH LATEST-VERSION AGREEMENTS VIA AGGREGATION
     ***************************************************/
    console.log("🔄 Aggregating agreements from MongoDB...");
    const agreementsCursor = agreementsCollection.aggregate([
      {
        $project: {
          AgreementID: 1,
          AgreementNumber: 1,
          DealerID: 1,
          AgreementStatus: 1,
          ExpireDate: 1,
          EffectiveDate: 1,
          Md5: 1,
          HolderFirstName: 1,
          HolderLastName: 1,
          SerialVIN: 1,  // 🔹 Added SerialVIN field
          ProductType: 1, // 🔹 Added ProductType field
          HolderEmail: "$HolderEMail",
          DocumentURL: 1,
          Total: 1,
          DealerCost: 1,
          ReserveAmount: 1,
          StatusChangeDate: {
            $switch: {
              branches: [
                {
                  case: {
                    $gt: [
                      "$StatusChangeDate4",
                      new Date(`${PLACEHOLDER_TIMESTAMP}Z`),
                    ],
                  },
                  then: "$StatusChangeDate4",
                },
                {
                  case: {
                    $gt: [
                      "$StatusChangeDate3",
                      new Date(`${PLACEHOLDER_TIMESTAMP}Z`),
                    ],
                  },
                  then: "$StatusChangeDate3",
                },
                {
                  case: {
                    $gt: [
                      "$StatusChangeDate2",
                      new Date(`${PLACEHOLDER_TIMESTAMP}Z`),
                    ],
                  },
                  then: "$StatusChangeDate2",
                },
              ],
              default: "$StatusChangeDate1",
            },
          },
        },
      },
      { $sort: { StatusChangeDate: -1 } },
      {
        $group: { _id: "$AgreementID", latest: { $first: "$$ROOT" } },
      },
      { $replaceRoot: { newRoot: "$latest" } },
    ]);
    const allAgreements = await agreementsCursor.toArray();
    console.log(`✅ Found ${allAgreements.length} deduplicated agreements.`);

    /***************************************************
     * F) FETCH processed_md5s
     ***************************************************/
    console.log("🔄 Loading processed_md5s from Supabase...");
    let processedData = [];
    from = 0;
    
    while (true) {
      const { data, error } = await supabase
        .from("processed_md5s")
        .select("AgreementID, Md5")
        .range(from, from + pageSize - 1);
        
      if (error) {
        console.error("❌ Error fetching processed_md5s:", error.message);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      processedData.push(...data);
      
      if (data.length < pageSize) break; // No more records
      from += pageSize;
    }
    
    const processedAgreementsMap = new Map(processedData.map((d) => [d.AgreementID, d.Md5]));
    console.log(`✅ Found ${processedAgreementsMap.size} records in processed_md5s.`);

    /***************************************************
     * G) Filter Agreements => Only New or Changed
     ***************************************************/
    const agreementsToUpsert = allAgreements.filter((ag) => {
      if (!processedAgreementsMap.has(ag.AgreementID)) return true;
      return processedAgreementsMap.get(ag.AgreementID) !== ag.Md5;
    });

    console.log(`🔄 Agreements to upsert: ${agreementsToUpsert.length}`);
    
    // Add detailed logging for agreement updates
    agreementsToUpsert.forEach((ag) => {
      console.log(`🔄 Processing Agreement: ${ag.AgreementID} | Status: ${ag.AgreementStatus} | DealerID: ${ag.DealerID}`);
    });

    /***************************************************
     * H) UPSERT AGREEMENTS
     ***************************************************/
    console.log("🚀 Uploading/Updating Agreements in Supabase...");

    for (let i = 0; i < agreementsToUpsert.length; i += BATCH_SIZE) {
      const batch = agreementsToUpsert.slice(i, i + BATCH_SIZE);

      const formattedBatch = batch.map((agreement) => {

        // Look up using the agreement's DealerID, which is the same as PayeeID in MongoDB
        const dealerKey = agreement.DealerID ? agreement.DealerID.toString().trim().toLowerCase() : null;
        const finalDealerUUID = dealerIdToDealerUUID.get(dealerKey) || headstartDealerUUID;
        if (!dealerIdToDealerUUID.has(dealerKey)) {
            console.warn(`⚠️ WARNING: No DealerUUID found for DealerID = ${dealerKey}. Using fallback.`);
        }

        return {
          AgreementID: agreement.AgreementID,
          AgreementNumber: agreement.AgreementNumber || null,
          DealerUUID: finalDealerUUID || null,
          DealerID: agreement.DealerID ? agreement.DealerID.toString() : null, // ✅ Fix: Ensure DealerID is assigned
          AgreementStatus: normalizeAgreementStatus(agreement.AgreementStatus),
          EffectiveDate: normalizeTimestamp(agreement.EffectiveDate),
          ExpireDate: normalizeTimestamp(agreement.ExpireDate),
          Md5: agreement.Md5,
          StatusChangeDate: normalizeTimestamp(agreement.StatusChangeDate),
          HolderFirstName: agreement.HolderFirstName || null,
          HolderLastName: agreement.HolderLastName || null,
          HolderEmail: agreement.HolderEmail || null,
          DocumentURL: agreement.DocumentURL || null,
          Total: agreement.Total ? parseFloat(agreement.Total.toString()) : null,
          DealerCost: agreement.DealerCost ? parseFloat(agreement.DealerCost.toString()) : null,
          ReserveAmount: agreement.ReserveAmount ? parseFloat(agreement.ReserveAmount.toString()) : null,
          SerialVIN: agreement.SerialVIN || null,  // 🔹 Added SerialVIN mapping
          ProductType: agreement.ProductType || null,  // 🔹 Added ProductType mapping          
          IsActive: true,
        };
      });

      const { error: agreementsUpsertError } = await supabase
        .from("agreements")
        .upsert(formattedBatch, { onConflict: '"AgreementID"' });
      if (agreementsUpsertError) {
        console.error(
          `❌ Error upserting agreements batch ${i / BATCH_SIZE + 1}:`,
          agreementsUpsertError.message
        );
        continue;
      }
      console.log(`✅ Agreements batch ${i / BATCH_SIZE + 1} upserted successfully.`);
    }

    /***************************************************
     * I) UPDATE PROCESSED_MD5s
     ***************************************************/
    console.log("🔄 Updating processed_md5s table...");
    for (let i = 0; i < agreementsToUpsert.length; i += BATCH_SIZE) {
      const batch = agreementsToUpsert.slice(i, i + BATCH_SIZE);

      const md5Rows = batch.map((ag) => ({
        AgreementID: ag.AgreementID,
        Md5: ag.Md5 || "",
      }));

      const { error: md5Error } = await supabase
        .from("processed_md5s")
        .upsert(md5Rows, { onConflict: '"AgreementID"' });
      if (md5Error) {
        console.error(
          `❌ Error updating processed_md5s batch ${i / BATCH_SIZE + 1}:`,
          md5Error.message
        );
        continue;
      }
      console.log(`✅ Processed_md5s batch ${i / BATCH_SIZE + 1} updated.`);
    }

    /***************************************************
     * J) Mark Missing Agreements Inactive
     ***************************************************/
    console.log("🔄 Checking for missing agreements in MongoDB...");
    const { data: existingAgreements, error: existingError } = await supabase
      .from("agreements")
      .select("AgreementID");
    if (existingError) {
      console.error("❌ Error fetching existing agreements:", existingError.message);
      return;
    }

    const supabaseSet = new Set(existingAgreements.map((ea) => ea.AgreementID));
    const mongoSet = new Set(allAgreements.map((ag) => ag.AgreementID));

    const missingAgreementIDs = Array.from(supabaseSet).filter(id => !mongoSet.has(id));

    if (missingAgreementIDs.length > 0) {
      const { error: inactivateError } = await supabase
        .from("agreements")
        .update({ AgreementStatus: "INACTIVE", IsActive: false })
        .in("AgreementID", missingAgreementIDs);
    
      if (inactivateError) {
        console.error(`❌ Error marking missing agreements as INACTIVE:`, inactivateError.message);
      } else {
        console.log(`✅ Marked ${missingAgreementIDs.length} missing agreements as INACTIVE.`);
      }
    }


/***************************************************
 * K) FETCH & UPSERT OPTION_SURCHARGE_PRICE
 ***************************************************/
// 1) Fetch existing records from Supabase to compare Md5
console.log("🔄 Loading existing surcharge records from Supabase...");
let existingSurcharges = [];
from = 0;

while (true) {
  const { data, error } = await supabase
    .from("option_surcharge_price")
    .select("_id, md5")
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("❌ Error fetching option_surcharge_price from Supabase:", error.message);
    break;
  }

  if (!data || data.length === 0) break;

  existingSurcharges.push(...data);
  
  if (data.length < pageSize) break; // No more records
  from += pageSize;
}

// Build a map of _id -> md5
const surchargeMap = new Map();
(existingSurcharges || []).forEach(rec => {
  surchargeMap.set(rec._id, rec.md5);
});

// 2) Fetch all surcharge records from Mongo
console.log("🔄 Fetching option-surcharge-price from MongoDB...");
const allOptionSurcharges = await optionSurchargePriceCollection.find({}).toArray();
console.log(`✅ Found ${allOptionSurcharges.length} option-surcharge-price docs.`);

// 3) Filter out unchanged rows (where Md5 is the same)
const changedOrNew = allOptionSurcharges.filter(doc => {
  const existingMd5 = surchargeMap.get(doc._id.toString());
  return !existingMd5 || existingMd5 !== doc.Md5; 
});

// 4) Upsert changed or new rows
console.log(`🔄 Need to upsert ${changedOrNew.length} new/updated surcharge docs into Supabase...`);

if (changedOrNew.length > 0) {
  // Convert to the format Supabase expects
  const upserts = changedOrNew.map(doc => ({
    _id: doc._id.toString(),
    md5: doc.Md5,
    product: doc.Product || null,
    Option: doc.Option || null,       // doc.Option might be "Maintenance Plan", etc.
    cost: doc.Cost ? parseFloat(doc.Cost.toString()) : 0,
    mandatory: !!doc.Mandatory,       // convert to boolean
  }));

  const { error: surchargeUpsertError } = await supabase
    .from("option_surcharge_price")
    .upsert(upserts, { onConflict: '"_id"' }); 
    // or onConflict: "_id", depending on how you set up your PK

  if (surchargeUpsertError) {
    console.error("❌ Error upserting option_surcharge_price:", surchargeUpsertError.message);
  } else {
    console.log("✅ option_surcharge_price upserted successfully.");
  }
} else {
  console.log("✅ No new or changed surcharge records to upsert.");
}

/***************************************************
 * L) FETCH & UPSERT CONTRACTS
 ***************************************************/
console.log("🔄 Loading existing contracts from Supabase...");
let existingContracts = [];
from = 0;

while (true) {
  const { data, error } = await supabase
    .from("contracts")
    .select("id")
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("❌ Error fetching contracts from Supabase:", error.message);
    break;
  }

  if (!data || data.length === 0) break;

  existingContracts.push(...data);
  
  if (data.length < pageSize) break; // No more records
  from += pageSize;
}

// Build a set of existing contract IDs
const existingContractIds = new Set(existingContracts.map(contract => contract.id));

// Fetch contracts from MongoDB
console.log("🔄 Fetching contracts from MongoDB...");
const contractsCollection = db.collection("contracts_warehouse_all_2024-03-25");
const allContracts = await contractsCollection.find({}).toArray();
console.log(`✅ Found ${allContracts.length} contracts in MongoDB.`);

// Map only fields that exist in Supabase and filter out existing contracts that haven't changed
const formattedContracts = allContracts.map(contract => ({
  id: contract._id.toString(),
  crm_source: contract.CRM_Source || null,
  job_run: contract.job_run || null,
  finance_source: contract.Finance_Source || null,
  tpa: contract.TPA || null,
  agent_nbr: contract.Agent_Nbr || null,
  dealer_nbr: contract.Dealer_Nbr || null,
  dealer_name: contract.Dealer_Name || null,
  contract_nbr: contract.Contract_Nbr || null,
  contract_nbr_alternate: contract.Contract_Nbr_Alternate || null,
  status: contract.Status || null,
  insurance_status: contract.Insurance_Status || null,
  inception_date: normalizeTimestamp(contract.Inception_Date),
  effective_date: normalizeTimestamp(contract.Effective_Date),
  sale_odom: contract.Sale_Odom || null,
  contract_form_nbr: contract.Contract_Form_Nbr || null,
  batch_nbr: contract.Batch_Nbr || null,
  register_nbr: contract.Register_Nbr || null,
  contract_holder_name_title: contract.Contract_Holder_Name_Title || null,
  contract_holder_first_name: contract.Contract_Holder_First_Name || null,
  contract_holder_last_name: contract.Contract_Holder_Last_Name || null,
  contract_holder_middle_name: contract.Contract_Holder_Middle_Name || null,
  contract_holder_spouse_name: contract.Contract_Holder_Spouse_Name || null,
  contract_holder_address: contract.Contract_Holder_Address || null,
  contract_holder_city: contract.Contract_Holder_City || null,
  contract_holder_state: contract.Contract_Holder_State || null,
  contract_holder_zip: contract.Contract_Holder_Zip || null,
  contract_holder_phone_nbr: contract.Contract_Holder_Phone_Nbr || null,
  contract_holder_work_nbr: contract.Contract_Holder_Work_Nbr || null,
  contract_holder_ext_1: contract.Contract_Holder_Ext_1 || null,
  contract_holder_ext_2: contract.Contract_Holder_Ext_2 || null,
  contract_holder_email: contract.Contract_Holder_email || null,
  contract_holder_mobile_nbr: contract.Contract_Holder_Mobile_Nbr || null,
  dealer_cost: contract.Dealer_Cost ? parseFloat(contract.Dealer_Cost.toString()) : null,
  sale_total: contract.Sale_Total ? parseFloat(contract.Sale_Total.toString()) : null,
  retail_rate: contract.Retail_Rate ? parseFloat(contract.Retail_Rate.toString()) : null,
  product_code: contract.Product_Code || null,
  product: contract.Product || null,
  rate_class: contract.Rate_Class || null,
  vin: contract.Vin || null,
  model_year: contract.Model_Year || null,
  vehicle_year: contract.Vehicle_Year || null,
  manufacturer_id: contract.Manufacturer_Id || null,
  model: contract.Model || null,
  expire_miles: contract.Expire_Miles || null,
  contract_term_months: contract.Contract_Term_Months || null,
  contract_term_mileage: contract.Contract_Term_Mileage || null,
  deductible_amount: contract.Deductible_Amount ? parseFloat(contract.Deductible_Amount.toString()) : null,
  deductible_type: contract.Deductible_Type || null,
  premium_amount: contract.Premium_Amount ? parseFloat(contract.Premium_Amount.toString()) : null,
  reserves: contract.Reserves ? parseFloat(contract.Reserves.toString()) : null,
  clip_fee: contract.Clip_Fee ? parseFloat(contract.Clip_Fee.toString()) : null,
  producer_bucket_total: contract.Producer_Bucket_Total ? parseFloat(contract.Producer_Bucket_Total.toString()) : null,
  mfg_warranty_term: contract.Mfg_Warranty_Term || null,
  mfg_mileage: contract.Mfg_Mileage || null,
  contract_sale_date: contract.Contract_Sale_Date || null,
  vehicle_purhase_price: contract.Vehicle_Purhase_Price || null,
  vehicle_auto_code: contract.Vehicle_Auto_Code || null,
  lienholder_nbr: contract.Lienholder_Nbr || null,
  reinsurance_id: contract.Reinsurance_Id || null,
  vehicle_in_service_date: contract.Vehicle_In_Service_Date || null,
  member_id: contract.Member_Id || null,
  no_charge_back: contract.No_Charge_Back || null,
  monthly_payment_effective_date: contract.Monthly_Payment_Effective_Date || null,
  fortegra_plan_code: contract.Fortegra_Plan_Code || null,
  rate_book_id: contract.Rate_Book_Id || null,
  new_used: contract.New_Used || null,
  plan_name: contract.Plan_Name || null,
  plan_code: contract.Plan_Code || null,
  language: contract.Language || null,
  s_lien_name: contract.S_Lien_Name || null,
  s_lien_address: contract.S_Lien_Address || null,
  s_lien_address_2: contract.S_Lien_Address_2 || null,
  s_lien_city: contract.S_Lien_City || null,
  s_lien_state: contract.S_Lien_State || null,
  s_lien_zip: contract.S_Lien_Zip || null,
  s_lien_phone_nbr: contract.S_Lien_Phone_Nbr || null,
  s_lien_contract: contract.S_Lien_contract || null,
  s_lien_fed_tax_id: contract.S_Lien_Fed_Tax_Id || null,
  s_contract_entry_app_name: contract.S_Contract_Entry_App_Name || null,
  payment_option: contract.Payment_Option || null,
  deal_type: contract.Deal_type || null,
  financed_amount: contract.Financed_Amount || null,
  apr: contract.Apr || null,
  financed_term: contract.Financed_Term || null,
  monthly_payment: contract.Monthly_Payment || null,
  first_payment_date: contract.First_Payment_Date || null,
  balloon_amount: contract.Balloon_Amount || null,
  residual_amount: contract.Residual_Amount || null,
  msrp: contract.Msrp || null,
  base_acv: contract.Base_Acv || null,
  nada_value: contract.Nada_Value || null,
  financed_account_number: contract.Financed_Account_Number || null,
  incoming_client_filename: contract.incoming_client_filename || null,
  mongo_id: contract.mongo_id || null,
  ins_form_plan_code: contract.ins_form_plan_code || null,
  ins_form_rate_book_id: contract.ins_form_rate_book_id || null,
  ins_form_plan_name: contract.ins_form_plan_name || null,
  new_used_field: contract.new_used || null,
  do_not_send_to_insurer: contract.Do_Not_Send_To_Insurer || false
}));

// Filter out contracts that already exist in Supabase
const contractsToUpsert = formattedContracts.filter(contract => !existingContractIds.has(contract.id));
console.log(`🔄 Contracts to upsert: ${contractsToUpsert.length} out of ${formattedContracts.length} total contracts`);

// Upsert contracts in batches
if (contractsToUpsert.length > 0) {
  console.log(`🚀 Upserting ${contractsToUpsert.length} contracts into Supabase...`);
  for (let i = 0; i < contractsToUpsert.length; i += BATCH_SIZE) {
    const batch = contractsToUpsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("contracts")
      .upsert(batch, { onConflict: "id" });
    
    if (error) {
      console.error(`❌ Error upserting contracts batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
    } else {
      console.log(`✅ Contracts batch ${Math.floor(i / BATCH_SIZE) + 1} upserted successfully.`);
    }
  }
} else {
  console.log("✅ No new contracts to upsert.");
}

/***************************************************
 * DONE
 ***************************************************/
console.log("✅ ETL complete. Closing MongoDB connection...");

try {
  await mongoClient.close();
  console.log("✅ MongoDB connection closed.");
} catch (err) {
  console.error("⚠️ Error closing MongoDB connection:", err.message);
}

// Catch any errors that occurred during ETL execution
} catch (err) {
  console.error("❌ ETL Error:", err); 

  try {
    if (mongoClient && mongoClient.topology) {
      await mongoClient.close();
      console.log("✅ MongoDB connection closed (after error).");
    }
  } catch (closeError) {
    console.error("⚠️ Error closing MongoDB connection after failure:", closeError.message);
  }
} // ✅ Fixed: Removed extra closing bracket
}
// 4. Run the ETL
runETL();