// Simple script to check if environment variables are loaded
console.log("Environment Variables:");
console.log("VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL ? "✅ Defined" : "❌ Not defined");
console.log("VITE_SUPABASE_ANON_KEY:", process.env.VITE_SUPABASE_ANON_KEY ? "✅ Defined" : "❌ Not defined");
console.log("VITE_SUPABASE_SERVICE_KEY:", process.env.VITE_SUPABASE_SERVICE_KEY ? "✅ Defined" : "❌ Not defined");