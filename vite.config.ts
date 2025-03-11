import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log environment variables for debugging (without revealing values)
  console.log("Environment variables loaded:", {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ? "✅ Defined" : "❌ Not defined",
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ? "✅ Defined" : "❌ Not defined",
    VITE_SUPABASE_SERVICE_KEY: env.VITE_SUPABASE_SERVICE_KEY ? "✅ Defined" : "❌ Not defined"
  });
  
  return ({
  server: {
    host: true, // Listen on all addresses
    port: 3000,
    strictPort: true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Make env variables available to the client code
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    'import.meta.env.VITE_SUPABASE_SERVICE_KEY': JSON.stringify(env.VITE_SUPABASE_SERVICE_KEY)
  }
})});
