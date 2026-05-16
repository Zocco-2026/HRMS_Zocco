import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qoenrdrnvqcrxwjwtaud.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZW5yZHJudnFjcnh3and0YXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjcwMTgsImV4cCI6MjA5MzU0MzAxOH0.fE20ULpkfYbrTnyHXQN9ukbFCuqHEgrrcgUCaXXVOsg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('employees').select('*').eq('id', 'f2be5952-f6a8-4f06-935a-3f46b9128ade').single()
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Employee:', data)
  }
}

check()
