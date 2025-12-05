// @ts-nocheck
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get Supabase credentials from environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
    });
  }

  try {
    const { email, business } = await req.json();

    // Server-side validation
    if (!email || !business) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { 
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), { 
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
      });
    }

    // Business type validation
    const validBusinessTypes = ['coffee', 'restaurant', 'shop', 'barbershop', 'other'];
    if (!validBusinessTypes.includes(business)) {
      return new Response(JSON.stringify({ error: "Invalid business type" }), { 
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
      });
    }

    // Insert into Supabase waitlist table
    const { data, error } = await supabase
      .from("waitlist")
      .insert([{ email: email.toLowerCase(), business }])
      .select();

    if (error) {
      // Handle unique constraint or other DB errors
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, data }), { 
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }
    });
  }
});
