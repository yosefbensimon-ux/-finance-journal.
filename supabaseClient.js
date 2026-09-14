import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "חסרים משתני סביבה VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. צור קובץ .env לפי .env.example"
  );
}

export const supabase = createClient(url, anonKey);
