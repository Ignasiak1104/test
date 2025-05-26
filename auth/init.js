// auth/init.js

// Sprawdź, czy globalny obiekt supabase istnieje (powinien, jeśli CDN w index.html działa)
if (typeof supabase === 'undefined' || typeof supabase.createClient === 'undefined') {
  console.error("Supabase client library not loaded from CDN or not available globally!");
  document.body.innerHTML = "<h1>Krytyczny błąd: Biblioteka Supabase nie została załadowana. Sprawdź połączenie internetowe i konsolę.</h1>";
  throw new Error("Supabase client library not available.");
}

// Użyj globalnie dostępnego supabase.createClient
export const supabaseClient = supabase.createClient(
  'https://gvljotkckbyohhoiggtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bGpvdGtja2J5b2hob2lnZ3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTk2MjcsImV4cCI6MjA2MzgzNTYyN30.3XxVnogLpMcnPRefmkjGWpfD7EiQiP5kVPelBBIOvio'
);
