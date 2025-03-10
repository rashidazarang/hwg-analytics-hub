/***************************************************
 * etl.js — Final Unified ETL
 *  - Nullifies placeholder timestamps
 *  - Imports dealers, claims, agreements
 *  - Adds CauseID for claims (if desired)
 *  - Normalizes AgreementStatus (new)
 ***************************************************/

// 1. Load Environment Variables and Required Modules
require("dotenv").config();
const { MongoClient } = require("mongodb");
const { createClient } = require("@supabase/supabase-js");

// 2. Configure MongoDB and Supabase
const MONGO_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// Initialize MongoDB client
const mongoClient = new MongoClient(MONGO_URI);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// 3. Constants
const BATCH_SIZE = 500;
const HEADSTART_PAYEE_ID = "1"; // Fallback PayeeID
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
    for (let i = 0; i < claimsToUpsert.length; i += BATCH_SIZE) {
      const batch = claimsToUpsert.slice(i, i + BATCH_SIZE);

      const formattedBatch = batch.map((claim) => ({
        ClaimID: claim.ClaimID,
        AgreementID: claim.AgreementID,
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
      }));

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

    console.log("🔄 Loading processed_subclaims from Supabase...");
    let processedSubclaims = [];
    from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("subclaims")
        .select("_id, Md5")
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

    const processedSubclaimsMap = new Map(processedSubclaims.map((d) => [d._id, d.Md5]));
    console.log(`✅ Found ${processedSubclaimsMap.size} records in processed_subclaims.`);

    const subclaimsToUpsert = allSubclaims.filter((sc) => {
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

    console.log("🔄 Loading processed_subclaim_parts from Supabase...");
    let processedSubclaimParts = [];
    from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("subclaim_parts")
        .select("_id, Md5")
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

    const processedPartsMap = new Map(processedSubclaimParts.map((d) => [d._id, d.Md5]));
    console.log(`✅ Found ${processedPartsMap.size} records in processed_subclaim_parts.`);

    const partsToUpsert = allSubclaimParts.filter((part) => {
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