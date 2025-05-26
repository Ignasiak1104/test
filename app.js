// app.js
import { supabaseClient as supabase } from './auth/init.js';
import { showLogin, handleAuthState } from './auth/login.js';
import { renderContacts } from './components/contacts.js';
import { renderCompanies } from './components/companies.js';
import { renderDeals } from './components/deals.js';
import { renderTasks } from './components/tasks.js';

const appContainer = document.getElementById('app-container'); // ZMIANA TUTAJ
const authDiv = document.getElementById('auth');

console.log("app.js: Script started");

if (!appContainer) console.error("app.js: appContainer not found!");
if (!authDiv) console.error("app.js: authDiv not found!");

supabase.auth.onAuthStateChange((event, session) => {
  console.log('app.js: Auth state changed:', event, session);
  if (authDiv && appContainer) {
    handleAuthState(session);
  } else {
    console.error("app.js: authDiv or appContainer is null in onAuthStateChange. Cannot handle auth state.");
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
    if (authDiv && appContainer) {
        handleAuthState(session);
    } else {
        console.error("app.js: authDiv or appContainer is null when trying to handle initial session.");
        if(document.body && !authDiv) document.body.innerHTML = "<h1>Krytyczny błąd: Brak kontenera #auth. Sprawdź konsolę.</h1>";
    }
  } catch (error) {
    console.error('app.js: Critical error getting initial session:', error);
    if (authDiv) {
        console.log("app.js: Fallback to showLogin() due to error.");
        showLogin(); // Funkcja showLogin jest zdefiniowana w login.js
    } else if (document.body) {
        document.body.innerHTML = "<h1>Krytyczny błąd podczas inicjalizacji. Sprawdź konsolę.</h1>";
    }
  }
})();

let currentActiveButton = null;

function setActiveButton(button) {
    if (currentActiveButton) {
        currentActiveButton.classList.remove('active');
    }
    button.classList.add('active');
    currentActiveButton = button;
}

export function showAppUI() {
  console.log("app.js: showAppUI called");
  if (!authDiv || !appContainer) {
    console.error('app.js: Auth or App container div not found in showAppUI!');
    return;
  }
  authDiv.style.display = 'none';
  appContainer.style.display = 'flex'; // ZMIANA: używamy flex dla układu bocznego
  appContainer.innerHTML = ''; // Czyścimy kontener

  const nav = document.createElement('nav');
  nav.id = 'side-nav'; // ID dla bocznej nawigacji
  nav.innerHTML = `
    <button id="contactsBtn" class="nav-button">Kontakty</button>
    <button id="companiesBtn" class="nav-button">Firmy</button>
    <button id="dealsBtn" class="nav-button">Szanse (Kanban)</button>
    <button id="tasksBtn" class="nav-button">Zadania</button>
    <button id="logoutBtn" class="nav-button logout">Wyloguj</button>
  `;
  
  const contentArea = document.createElement('div'); // Nowy div na treść
  contentArea.id = 'content-area';
  
  appContainer.appendChild(nav);
  appContainer.appendChild(contentArea);

  const contactsBtn = document.getElementById('contactsBtn');
  const companiesBtn = document.getElementById('companiesBtn');
  const dealsBtn = document.getElementById('dealsBtn');
  const tasksBtn = document.getElementById('tasksBtn');

  contactsBtn.onclick = () => { renderContacts(contentArea); setActiveButton(contactsBtn); };
  companiesBtn.onclick = () => { renderCompanies(contentArea); setActiveButton(companiesBtn); };
  dealsBtn.onclick = () => { renderDeals(contentArea); setActiveButton(dealsBtn); };
  tasksBtn.onclick = () => { renderTasks(contentArea); setActiveButton(tasksBtn); };
  
  document.getElementById('logoutBtn').onclick = async () => {
    console.log("app.js: Logout button clicked");
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('app.js: Error logging out:', error);
        alert('Wystąpił błąd podczas wylogowywania: ' + error.message);
    }
    // onAuthStateChange powinien przeładować UI do widoku logowania
    // location.reload(); // Można odkomentować, jeśli są problemy
  };

  // Render initial content (np. Kontakty) i ustaw aktywny przycisk
  renderContacts(contentArea);
  setActiveButton(contactsBtn);
}
