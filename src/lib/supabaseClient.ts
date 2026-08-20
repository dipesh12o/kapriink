import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn(
    "Supabase credentials are missing. The website will run in fallback/static mode."
  );
}

// Pass valid-looking fallback values to prevent Supabase JS SDK from crashing on startup
const finalUrl = supabaseUrl || "https://placeholder-project.supabase.co";
const finalAnonKey = supabaseAnonKey || "placeholder-anon-key";

export const supabase = createClient(finalUrl, finalAnonKey);
