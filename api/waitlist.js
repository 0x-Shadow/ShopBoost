const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = async (req, res) => {
  // Allow only POST (and basic OPTIONS for CORS if needed)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, business } = req.body || {};

    // Validation (mirror frontend)
    if (!email || !business) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Missing fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const validBusinessTypes = ['coffee', 'restaurant', 'shop', 'barbershop', 'other'];
    if (!validBusinessTypes.includes(business)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ error: 'Invalid business type' });
    }

    const { data, error } = await supabase
      .from('waitlist')
      .insert([{ email: String(email).toLowerCase(), business }])
      .select();

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: message });
  }
};
