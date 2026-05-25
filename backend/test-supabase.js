const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    const { data: students, error: studErr } = await supabase.from('students').select('count', { count: 'exact' });
    if (studErr) {
      console.log('Error querying students:', studErr);
    } else {
      console.log('Students count:', students);
    }

    const { data: occurrences, error: occErr } = await supabase.from('occurrences').select('count', { count: 'exact' });
    if (occErr) {
      console.log('Error querying occurrences:', occErr);
    } else {
      console.log('Occurrences count:', occurrences);
    }

    const { data: settings, error: setErr } = await supabase.from('settings').select('*');
    if (setErr) {
      console.log('Error querying settings:', setErr);
    } else {
      console.log('Settings:', settings);
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
