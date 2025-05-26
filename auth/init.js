// auth/init.js

if (typeof supabase === 'undefined' || typeof supabase.createClient === 'undefined') {
  console.error("Supabase client library (supabase.createClient) not loaded from CDN or not available globally!");
  const errorMsg = "<h1>Krytyczny błąd: Biblioteka Supabase (supabase.createClient) nie została załadowana. Sprawdź połączenie internetowe, konsolę i czy URL CDN w HTML jest poprawny.</h1>";
  if (document.body) {
    document.body.innerHTML = errorMsg;
  } else {
    alert("Krytyczny błąd ładowania Supabase - szczegóły w konsoli.");
  }
  throw new Error("Supabase client library (supabase.createClient) not available.");
}

export const supabaseClient = supabase.createClient(
  'https://gvljotkckbyohhoiggtm.supabase.co', // Twoje Supabase Project URL
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bGpvdGtja2J5b2hob2lnZ3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTk2MjcsImV4cCI6MjA2MzgzNTYyN30.3XxVnogLpMcnPRefmkjGWpfD7EiQiP5kVPelBBIOvio' // Twój Supabase Public Anon Key
);
