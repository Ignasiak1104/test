// init.js

// Nie potrzebujemy już tego importu, ponieważ Supabase jest ładowane globalnie z CDN w index.html
// import { createClient } from '@supabase/supabase-js';

// Sprawdź, czy globalny obiekt supabase istnieje (powinien, jeśli CDN działa)
if (typeof supabase === 'undefined' || typeof supabase.createClient === 'undefined') {
  console.error("Supabase client library not loaded from CDN or not available globally!");
  // Możesz tu dodać bardziej widoczny komunikat błędu na stronie, jeśli chcesz
  document.body.innerHTML = "<h1>Krytyczny błąd: Biblioteka Supabase nie została załadowana. Sprawdź połączenie internetowe i konsolę.</h1>";
  // Rzuć błąd, aby zatrzymać dalsze wykonywanie skryptów, które zależą od supabase
  throw new Error("Supabase client library not available.");
}

// Użyj globalnie dostępnego supabase.createClient
export const supabaseClient = supabase.createClient(
  'https://gvljotkckbyohhoiggtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bGpvdGtja2J5b2hob2lnZ3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTk2MjcsImV4cCI6MjA2MzgzNTYyN30.3XxVnogLpMcnPRefmkjGWpfD7EiQiP5kVPelBBIOvio'
);

// Zmieniamy nazwę eksportu na supabaseClient, aby uniknąć konfliktu z globalnym obiektem supabase.
// Alternatywnie, można by użyć innej nazwy zmiennej lokalnej, np.:
// const client = supabase.createClient(...);
// export { client as supabase };
// Ale użycie innej nazwy eksportu jest czytelniejsze.
