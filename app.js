// app.js
import { supabaseClient as supabase } from './auth/init.js';
import { showLogin, handleAuthState } from './auth/login.js';
import { renderContacts } from './components/contacts.js';
import { renderCompanies } from './components/companies.js';
import { renderDeals } from './components/deals.js';
import { renderTasks } from './components/tasks.js';

let appContainerElement = null;
let authDivElement = null;
let currentActiveButton = null;

function setActiveButton(buttonToActivate) {
    if (currentActiveButton) {
        currentActiveButton.classList.remove('active');
    }
    if (buttonToActivate) {
        buttonToActivate.classList.add('active');
        currentActiveButton = buttonToActivate;
    } else {
        console.warn("setActiveButton: Próba ustawienia aktywnego przycisku na null lub nieistniejący element.");
    }
}

export function showAppUI() {
  if (!authDivElement) authDivElement = document.getElementById('auth');
  if (!appContainerElement) appContainerElement = document.getElementById('app-container');

  if (!authDivElement || !appContainerElement) {
    console.error('app.js (showAppUI): Kluczowe kontenery (authDivElement lub appContainerElement) nie są dostępne!');
    if (document.body) document.body.innerHTML = "<h1>Krytyczny błąd UI: Nie można wyświetlić interfejsu aplikacji. Elementy #auth lub #app-container nie znalezione.</h1>";
    return;
  }

  console.log("app.js: showAppUI called");
  authDivElement.style.display = 'none';
  appContainerElement.style.display = 'flex';
  appContainerElement.innerHTML = '';

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
  
  appContainerElement.appendChild(nav);
  appContainerElement.appendChild(contentArea);

  const contactsBtn = document.getElementById('contactsBtn');
  const companiesBtn = document.getElementById('companiesBtn');
  const dealsBtn = document.getElementById('dealsBtn');
  const tasksBtn = document.getElementById('tasksBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (contactsBtn) contactsBtn.onclick = () => { renderContacts(contentArea); setActiveButton(contactsBtn); };
  if (companiesBtn) companiesBtn.onclick = () => { renderCompanies(contentArea); setActiveButton(companiesBtn); };
  if (dealsBtn) dealsBtn.onclick = () => { renderDeals(contentArea); setActiveButton(dealsBtn); };
  if (tasksBtn) tasksBtn.onclick = () => { renderTasks(contentArea); setActiveButton(tasksBtn); };
  
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
        console.log("app.js: Logout button clicked");
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('app.js: Error logging out:', error);
            alert('Wystąpił błąd podczas wylogowywania: ' + error.message);
        }
        // Stan zostanie obsłużony przez onAuthStateChange
    };
  }

  if (contactsBtn) {
    renderContacts(contentArea);
    setActiveButton(contactsBtn);
  } else {
    console.warn("app.js (showAppUI): Domyślny przycisk kontaktów nie znaleziony.");
    contentArea.innerHTML = "<p>Wybierz opcję z menu.</p>";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("app.js: DOMContentLoaded event fired.");

  appContainerElement = document.getElementById('app-container');
  authDivElement = document.getElementById('auth');

  if (!appContainerElement) {
    console.error("app.js (DOMContentLoaded): Element #app-container NIE ZOSTAŁ ZNALEZIONY!");
    if (document.body) document.body.innerHTML = "<h1>BŁĄD KRYTYCZNY: Brak elementu #app-container w HTML.</h1>" + (document.body.innerHTML || "");
  } else {
    console.log("app.js (DOMContentLoaded): Element #app-container ZNALEZIONY.");
  }

  if (!authDivElement) {
    console.error("app.js (DOMContentLoaded): Element #auth NIE ZOSTAŁ ZNALEZIONY!");
    if (document.body) document.body.innerHTML = "<h1>BŁĄD KRYTYCZNY: Brak elementu #auth w HTML.</h1>" + (document.body.innerHTML || "");
  } else {
    console.log("app.js (DOMContentLoaded): Element #auth ZNALEZIONY.");
  }

  if (appContainerElement && authDivElement) {
    console.log("app.js (DOMContentLoaded): Oba kontenery znalezione. Inicjalizacja Supabase auth...");

    supabase.auth.onAuthStateChange((event, session) => {
      console.log('app.js (onAuthStateChange): Zdarzenie:', event, "Sesja:", session);
      handleAuthState(session, authDivElement, appContainerElement);
    });

    (async () => {
      try {
        console.log("app.js (DOMContentLoaded async): Próba pobrania sesji początkowej...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('app.js (DOMContentLoaded async): Błąd podczas pobierania sesji początkowej:', error);
        }
        console.log('app.js (DOMContentLoaded async): Sesja początkowa:', session);
        handleAuthState(session, authDivElement, appContainerElement);
      } catch (error) {
        console.error('app.js (DOMContentLoaded async): Krytyczny błąd podczas pobierania sesji początkowej:', error);
        if (authDivElement) {
            console.log("app.js (DOMContentLoaded async): Awaryjne wywołanie showLogin().");
            showLogin(authDivElement);
        } else if (document.body) {
            document.body.innerHTML = "<h1>Krytyczny błąd inicjalizacji sesji.</h1>";
        }
      }
    })();
  } else {
    console.error("app.js (DOMContentLoaded): Jeden lub oba kluczowe kontenery nie istnieją. Aplikacja nie może wystartować.");
  }
});

console.log("app.js: Skrypt zakończył parsowanie.");
