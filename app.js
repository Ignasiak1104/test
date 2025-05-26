// app.js
import { supabaseClient as supabase } from './auth/init.js'; // ZMIANA TUTAJ
import { showLogin, handleAuthState } from './auth/login.js';
import { renderContacts } from './components/contacts.js';
import { renderCompanies } from './components/companies.js';
import { renderDeals } from './components/deals.js';
import { renderTasks } from './components/tasks.js';

const appDiv = document.getElementById('app');
const authDiv = document.getElementById('auth');

console.log("app.js: Script started");

if (!appDiv) console.error("app.js: appDiv not found!");
if (!authDiv) console.error("app.js: authDiv not found!");

supabase.auth.onAuthStateChange((event, session) => {
  console.log('app.js: Auth state changed:', event, session);
  if (authDiv && appDiv) {
    handleAuthState(session);
  } else {
    console.error("app.js: authDiv or appDiv is null in onAuthStateChange. Cannot handle auth state.");
  }
});

(async () => {
  try {
    console.log("app.js: Attempting to get initial session...");
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('app.js: Error getting initial session object:', error);
    }
    console.log('app.js: Initial session:', session);
    if (authDiv && appDiv) {
        handleAuthState(session);
    } else {
        console.error("app.js: authDiv or appDiv is null when trying to handle initial session. Cannot handle auth state.");
        if(document.body && !authDiv) document.body.innerHTML = "<h1>Krytyczny błąd: Brak kontenera #auth. Sprawdź konsolę.</h1>";
    }
  } catch (error) {
    console.error('app.js: Critical error getting initial session:', error);
    if (authDiv) {
        console.log("app.js: Fallback to showLogin() due to error.");
        showLogin();
    } else if (document.body) {
        document.body.innerHTML = "<h1>Krytyczny błąd podczas inicjalizacji. Sprawdź konsolę.</h1>";
    }
  }
})();

export function showAppUI() {
  console.log("app.js: showAppUI called");
  if (!authDiv || !appDiv) {
    console.error('app.js: Auth or App div not found in showAppUI!');
    return;
  }
  authDiv.style.display = 'none';
  appDiv.style.display = 'flex';
  appDiv.innerHTML = '';

  const nav = document.createElement('nav');
  nav.innerHTML = `
    <button id="contactsBtn" class="nav-button">Kontakty</button>
    <button id="companiesBtn" class="nav-button">Firmy</button>
    <button id="dealsBtn" class="nav-button">Szanse</button>
    <button id="tasksBtn" class="nav-button">Zadania</button>
    <button id="logoutBtn" class="nav-button logout">Wyloguj</button>
  `;
  
  const content = document.createElement('div');
  content.id = 'content';
  
  appDiv.appendChild(nav);
  appDiv.appendChild(content);

  document.getElementById('contactsBtn').onclick = () => renderContacts(content);
  document.getElementById('companiesBtn').onclick = () => renderCompanies(content);
  document.getElementById('dealsBtn').onclick = () => renderDeals(content);
  document.getElementById('tasksBtn').onclick = () => renderTasks(content);
  document.getElementById('logoutBtn').onclick = async () => {
    console.log("app.js: Logout button clicked");
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('app.js: Error logging out:', error);
        alert('Wystąpił błąd podczas wylogowywania: ' + error.message);
    }
    // Po wylogowaniu onAuthStateChange powinien wywołać handleAuthState(null), co pokaże showLogin()
    // Jeśli to nie działa, można przywrócić location.reload();
    // location.reload(); 
  };

  console.log("app.js: Rendering initial contacts view");
  renderContacts(content);
}
