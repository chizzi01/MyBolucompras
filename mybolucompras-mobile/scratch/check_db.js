const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log("Checking viaje_pagos table...");
    const { data: selectData, error: selectError } = await supabase
      .from('viaje_pagos')
      .select('*');
    
    if (selectError) {
      console.error("Error reading viaje_pagos:", selectError);
    } else {
      console.log("viaje_pagos content:", selectData);
    }

    console.log("Checking tables or schema...");
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_tables'); // standard helper if exists, or just query profiles
    
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    console.log("Profiles count/data:", profiles ? profiles.length : null, profError);

  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

test();
