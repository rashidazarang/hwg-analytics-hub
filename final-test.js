import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Test the corrected claims query
const today = new Date();
const oneYearAgo = new Date(today);
oneYearAgo.setFullYear(today.getFullYear() - 1);

console.log('🎯 Final Test: Corrected Claims Query');
console.log(`Date range: ${oneYearAgo.toLocaleDateString()} to ${today.toLocaleDateString()}`);

let query = supabase
  .from("claims")
  .select(`
    id,
    ClaimID, 
    AgreementID,
    ReportedDate, 
    Closed,
    Cause,
    Correction,
    Deductible,
    LastModified,
    agreements!inner(
      DealerUUID, 
      HolderFirstName,
      HolderLastName,
      AgreementID,
      dealers(Payee)
    )
  `, { count: 'exact' });

// Apply the OR date filter
query = query.or(
  `and(ReportedDate.gte.${oneYearAgo.toISOString()},ReportedDate.lte.${today.toISOString()}),` +
  `and(ReportedDate.is.null,LastModified.gte.${oneYearAgo.toISOString()},LastModified.lte.${today.toISOString()})`
);

query = query.order('ReportedDate', { ascending: false, nullsLast: true }).limit(5);

const result = await query;

if (result.error) {
  console.error('❌ Query failed:', result.error);
} else {
  console.log(`✅ SUCCESS! Found ${result.count} total claims`);
  console.log(`✅ Sample data (${result.data?.length || 0} shown):`);
  result.data?.forEach((claim, i) => {
    const dealer = claim.agreements?.dealers?.Payee || 'Unknown';
    console.log(`   ${i+1}. ${claim.ClaimID} - ${dealer}`);
  });
}

process.exit(0); 