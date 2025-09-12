import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://fkzzboynzxzpbjqdybxl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrenpib3luenh6cGJqcWR5YnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjU1OTAsImV4cCI6MjA3MTA0MTU5MH0.4L2UeNzo_C22QAnu-__wbg04FxTT-fb01AgwY-IDnhc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);