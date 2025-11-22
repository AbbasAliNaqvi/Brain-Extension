const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Supabase URL and SERVICE_ROLE_KEY must be set in .env");
}

const supabase = createClient(url, key);

module.exports = supabase;