// app.js
import { supabase } from './auth/init.js';
import { showLogin, handleAuthState } from './auth/login.js';
import { renderContacts } from './components/contacts.js';
import { renderCompanies } from './components/companies.js';
import { renderDeals } from './components/deals.js';
import { renderTasks } from './components/tasks.js';

const appDiv = document.getElementById('app');
const authDiv = document.getElementById('auth');

console.log("app.js: Script started"); // Log: Start skryptu

if (!appDiv) console.error("app.js: appDiv not found!");
if (!authDiv) console.error("app.js: authDiv not found!");

supabase.auth.onAuthStateChange((event, session) => {
  console.log('app.js: Auth state changed:', event, session); // Log: Zmiana stanu autoryzacji
  if (authDiv && appDiv) {
    handleAuthState(session);
  } else {
    console.error("app.js: authDiv or appDiv is null in onAuthStateChange. Cannot handle auth state.");
  }
});

(async () => {
  try {
    console.log("app.js: Attempting to get initial session..."); // Log: Próba pobrania sesji
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('app.js: Error getting initial session object:', error);
        // Nawet jeśli jest błąd w obiekcie sesji, nadal próbuj obsłużyć (session może być null)
    }
    console.log('app.js: Initial session:', session); // Log: Odpowiedź z getSession
    if (authDiv && appDiv) {
        handleAuthState(session);
    } else {
        console.error("app.js: authDiv or appDiv is null when trying to handle initial session. Cannot handle auth state.");
        // Spróbuj wyświetlić błąd na stronie, jeśli podstawowe kontenery nie istnieją
        if(document.body && !authDiv) document.body.innerHTML = "<h1>Krytyczny błąd: Brak kontenera #auth. Sprawdź konsolę.</h1>";
    }
  } catch (error) {
    console.error('app.js: Critical error getting initial session:', error);
    // Awaryjnie pokaż formularz logowania, jeśli wszystko inne zawiedzie, a authDiv istnieje
    if (authDiv) {
        console.log("app.js: Fallback to showLogin() due to error.");
        showLogin();
    } else if (document.body) {
        document.body.innerHTML = "<h1>Krytyczny błąd podczas inicjalizacji. Sprawdź konsolę.</h1>";
    }
  }
})();

export function showAppUI() {
  console.log("app.js: showAppUI called"); // Log: Wywołanie showAppUI
  if (!authDiv || !appDiv) {
    console.error('app.js: Auth or App div not found in showAppUI!');
    return;
  }
  authDiv.style.display = 'none';
  appDiv.style.display = 'flex'; // Zmienione na flex dla lepszego układu nawigacji i treści
  appDiv.innerHTML = ''; // Clear previous content

  const nav = document.createElement('nav');
  nav.innerHTML = `
    <button id="contactsBtn" class="nav-button">Kontakty</button>
    <button id="companiesBtn" class="nav-button">Firmy</button>
    <button id="dealsBtn" class="nav-button">Szanse</button>
    <button id="tasksBtn" class="nav-button">Zadania</button>
    <button id="logoutBtn" class="nav-button logout">Wyloguj</button>
  `; //
  
  const content = document.createElement('div');
  content.id = 'content';
  
  appDiv.appendChild(nav);
  appDiv.appendChild(content);

  document.getElementById('contactsBtn').onclick = () => renderContacts(content);
  document.getElementById('companiesBtn').onclick = () => renderCompanies(content);
  document.getElementById('dealsBtn').onclick = () => renderDeals(content);
  document.getElementById('tasksBtn').onclick = () => renderTasks(content);
  document.getElementById('logoutBtn').onclick = async () => {
    console.log("app.js: Logout button clicked"); // Log: Kliknięcie wyloguj
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('app.js: Error logging out:', error);
        alert('Wystąpił błąd podczas wylogowywania: ' + error.message);
    }
    // location.reload(); // onAuthStateChange powinien to obsłużyć, ale zostawiamy dla pewności, jeśli są problemy
    // Po wylogowaniu onAuthStateChange powinien wywołać handleAuthState(null), co pokaże showLogin()
  };

  // Render initial content
  console.log("app.js: Rendering initial contacts view"); // Log: Renderowanie kontaktów
  renderContacts(content);
}
