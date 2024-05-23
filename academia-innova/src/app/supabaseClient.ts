import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://tjdeebtcwphyfvrlwgjc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqZGVlYnRjd3BoeWZ2cmx3Z2pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYzODgyODEsImV4cCI6MjAzMTk2NDI4MX0.R7Qaewo9gKFBiwPN1np1if2AFFldSjSKfETE5y6jBt8'

export const supabase = createClient(supabaseUrl, supabaseKey)