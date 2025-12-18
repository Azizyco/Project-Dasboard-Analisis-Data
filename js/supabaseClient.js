const SUPABASE_URL = "https://dkdpajqgwmatbyvmlvmh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZHBhanFnd21hdGJ5dm1sdm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTY2NTMsImV4cCI6MjA4MTYzMjY1M30.TyexRzdUYm6IKhe27UUbtCa6p14NobB0SDdavYWWvYA";

// Inisialisasi Supabase client dari global supabase (CDN)
// Hindari redeclare identifier "supabase" agar tidak bentrok dengan library CDN
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export untuk digunakan di file lain
window.supabaseClient = supabaseClient;
