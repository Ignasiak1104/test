// app.js
import { supabaseClient as supabase } from './auth/init.js';
import { showLogin, handleAuthState } from './auth/login.js';
import { renderContacts } from './components/contacts.js';
import { renderCompanies } from './components/companies.js';
import { renderDeals } from './components/deals.js';
import { renderTasks } from './components/tasks.js';

// Przenieś deklaracje zmiennych appContainer i authDiv do wnętrza funkcji,
// która będzie wywołana po załadowaniu DOM.
let appContainer = null;
let authDiv = null;
let currentActiveButton = null;

function setActiveButton(button) {
    if (currentActiveButton) {
        currentActiveButton.classList.remove('active');
    }
    if (button) { // Dodano sprawdzenie, czy przycisk istnieje
        button.classList.add('active');
        currentActiveButton = button;
    }
}

// Funkcja showAppUI pozostaje taka sama, ale będzie wywoływana,
// gdy appContainer i authDiv na pewno istnieją.
export function showAppUI() {
  // Upewnij się, że kontenery są pobrane, jeśli jeszcze nie są
  if (!appContainer) appContainer = document.getElementById('app-container');
  if (!authDiv) authDiv = document.getElementById('auth');

  console.log("app.js: showAppUI called");
  if (!authDiv || !appContainer) {
    console.error('app.js: Auth or App container div not found in showAppUI!');
    return;
  }
  authDiv.style.display = 'none';
  appContainer.style.display = 'flex';
  appContainer.innerHTML = '';

  const nav = document.createElement('nav');
  nav.id = 'side-nav';
  nav.innerHTML = `
    <button id="contactsBtn" class="nav-button">Kontakty</button>
    <button id="companiesBtn" class="nav-button">Firmy</button>
    <button id="dealsBtn" class="nav-button">Szanse (Kanban)</button>
    <button id="tasksBtn" class="nav-button">Zadania</button>
    <button id="logoutBtn" class="nav-button logout">Wyloguj</button>
  `;
  
  const contentArea = document.createElement('div');
  contentArea.id = 'content-area';
  
  appContainer.appendChild(nav);
  appContainer.appendChild(contentArea);

  const contactsBtn = document.getElementById('contactsBtn');
  const companiesBtn = document.getElementById('companiesBtn');
  const dealsBtn = document.getElementById('dealsBtn');
  const tasksBtn = document.getElementById('tasksBtn');

  if (contactsBtn) contactsBtn.onclick = () => { renderContacts(contentArea); setActiveButton(contactsBtn); };
  if (companiesBtn) companiesBtn.onclick = () => { renderCompanies(contentArea); setActiveButton(companiesBtn); };
  if (dealsBtn) dealsBtn.onclick = () => { renderDeals(contentArea); setActiveButton(dealsBtn); };
  if (tasksBtn) tasksBtn.onclick = () => { renderTasks(contentArea); setActiveButton(tasksBtn); };
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
        console.log("app.js: Logout button clicked");
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('app.js: Error logging out:', error);
            alert('Wystąpił błąd podczas wylogowywania: ' + error.message);
        }
    };
  }

  // Render initial content and set active button
  if (contactsBtn) { // Upewnij się, że przycisk istnieje przed wywołaniem
    renderContacts(contentArea);
    setActiveButton(contactsBtn);
  } else {
    // Jeśli domyślny przycisk nie istnieje, załaduj np. pusty contentArea
    contentArea.innerHTML = "<p>Wybierz opcję z menu.</p>";
  }
}

// Główna logika aplikacji uruchamiana po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log("app.js: DOMContentLoaded event fired");

  // Teraz bezpiecznie pobieramy elementy DOM
  appContainer = document.getElementById('app-container');
  authDiv = document.getElementById('auth');

  if (!appContainer) console.error("app.js (DOMContentLoaded): appContainer not found!");
  if (!authDiv) console.error("app.js (DOMContentLoaded): authDiv not found!");

  // Jeśli kontenery istnieją, kontynuuj z logiką autoryzacji
  if (appContainer && authDiv) {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('app.js (onAuthStateChange): Auth state changed:', event, session);
      // Przekazujemy appContainer i authDiv do handleAuthState, aby nie polegać na globalnych zmiennych
      // wewnątrz tej funkcji, jeśli jest ona zdefiniowana w innym module (login.js)
      handleAuthState(session, authDiv, appContainer); // Zmodyfikuj handleAuthState w login.js, aby przyjmowała te argumenty
    });

    (async () => {
      try {
        console.log("app.js (DOMContentLoaded): Attempting to get initial session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('app.js (DOMContentLoaded): Error getting initial session object:', error);
        }
        console.log('app.js (DOMContentLoaded): Initial session:', session);
        handleAuthState(session, authDiv, appContainer); // Zmodyfikuj handleAuthState w login.js
      } catch (error) {
        console.error('app.js (DOMContentLoaded): Critical error getting initial session:', error);
        if (authDiv) {
            console.log("app.js (DOMContentLoaded): Fallback to showLogin() due to error.");
            showLogin(); // showLogin również powinno być świadome authDiv
        } else if (document.body) {
            document.body.innerHTML = "<h1>Krytyczny błąd podczas inicjalizacji. Sprawdź konsolę.</h1>";
        }
      }
    })();
  } else {
    console.error("app.js (DOMContentLoaded): Critical - core containers #app-container or #auth not found. App cannot start.");
    if (document.body) {
        document.body.innerHTML = "<h1>Krytyczny błąd: Brak podstawowych kontenerów aplikacji. Sprawdź HTML i konsolę.</h1>";
    }
  }
});

console.log("app.js: Script finished parsing (event listeners set up)");
