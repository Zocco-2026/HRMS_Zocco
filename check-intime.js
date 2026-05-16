import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qoenrdrnvqcrxwjwtaud.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZW5yZHJudnFjcnh3and0YXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjcwMTgsImV4cCI6MjA5MzU0MzAxOH0.fE20ULpkfYbrTnyHXQN9ukbFCuqHEgrrcgUCaXXVOsg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('employees').select('id, intime, outtime').limit(1)
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Data:', data)
  }
}

check()
