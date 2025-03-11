// A simple script to test if Vite can access environment variables during build
// Run this with: node test-build-env.js
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Checking if .env file exists...');
if (!fs.existsSync('.env')) {
  console.error('❌ .env file is missing! Please create it with the necessary environment variables.');
  process.exit(1);
}

console.log('✅ .env file exists. Checking environment variables...');
try {
  // Use grep to check for env variables without showing their values
  const grepOutput = execSync("grep -E 'VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|VITE_SUPABASE_SERVICE_KEY' .env | wc -l").toString().trim();
  
  if (parseInt(grepOutput) < 3) {
    console.error(`❌ Not all environment variables are set in .env file. Found ${grepOutput}/3 variables.`);
    console.error('Please ensure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_SUPABASE_SERVICE_KEY are set.');
    process.exit(1);
  }
  
  console.log('✅ All environment variables are present in .env file.');
  console.log('✅ Environment check completed successfully.');
  console.log('');
  console.log('To fix the "Missing Supabase environment variables" error:');
  console.log('1. Ensure your .env file has all required variables');
  console.log('2. Rebuild your application with: npm run build');
  console.log('3. Start the server with: npm run dev (or your preferred start command)');
  
} catch (error) {
  console.error('❌ Error checking environment variables:', error.message);
  process.exit(1);
}