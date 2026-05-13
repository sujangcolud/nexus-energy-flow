import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://coacymsqarronnlytceu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvYWN5bXNxYXJyb25ubHl0Y2V1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjEzMDE3MiwiZXhwIjoyMDY3NzA2MTcyfQ.PEKZXP1S04y9NEp9roW5nNWabZSNpc6Jn-FO4NQbqPE'
const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
  const { data, error } = await supabase.rpc('execute_custom_query', {
    query_text: "SELECT column_name FROM information_schema.columns WHERE table_name = 'loan_summaries' AND user_id = ''"
  })

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Columns in loan_summaries:', data.map(c => c.column_name))
  }
}

verify()
