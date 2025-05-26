// app.js
import { supabaseClient as supabase } from './auth/init.js';
import { showLogin, handleAuthState } from './auth/login.js';
import { renderContacts } from './components/contacts.js';
import { renderCompanies } from './components/companies.js';
import { renderDeals } from './components/deals.js';
import { renderTasks } from './components/tasks.js';

let appContainerElement = null; // Zmieniono nazwę, aby uniknąć konfliktu z potencjalną globalną zmienną
let authDivElement = null;      // Zmieniono nazwę
let currentActiveButton = null;

function setActiveButton(button) {
    if (currentActiveButton) {
        currentActiveButton.classList.remove('active');
    }
    if (button) {
        button.classList.add('active');
        currentActiveButton = button;
    } else {
        console.warn("setActiveButton: Próba ustawienia aktywnego przycisku na null");
    }
}

export function showAppUI() {
  // Te elementy powinny być już zainicjowane przez DOMContentLoaded
  if (!authDivElement || !appContainerElement) {
    console.error('app.js (showAppUI): Kluczowe kontenery (authDivElement lub appContainerElement) nie są zainicjowane!');
    // Awaryjnie spróbuj pobrać je ponownie, ale to nie powinno być potrzebne
    authDivElement = document.getElementById('auth');
    appContainerElement = document.getElementById('app-container');
    if (!authDivElement || !appContainerElement) {
        document.body.innerHTML = "<h1>Krytyczny błąd UI: Nie można wyświetlić interfejsu aplikacji.</h1>";
        return;
    }
  }

  console.log("app.js: showAppUI called");
  authDivElement.style.display = 'none';
  appContainerElement.style.display = 'flex';
  appContainerElement.innerHTML = ''; // Czyścimy tylko jeśli pewni, że to kontener aplikacji

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
        // handleAuthState zostanie wywołane przez onAuthStateChange
    };
  }

  if (contactsBtn) {
    renderContacts(contentArea);
    setActiveButton(contactsBtn);
  } else {
    console.warn("app.js (showAppUI): Domyślny przycisk kontaktów nie znaleziony. Nie można ustawić widoku początkowego.");
    contentArea.innerHTML = "<p>Wybierz opcję z menu lub sprawdź konsolę pod kątem błędów ładowania przycisków.</p>";
  }
}

// --- Główna logika aplikacji uruchamiana po załadowaniu DOM ---
document.addEventListener('DOMContentLoaded', () => {
  console.log("app.js: DOMContentLoaded event fired. Dokument powinien być w pełni załadowany.");

  // Pobieranie elementów DOM po załadowaniu strony
  appContainerElement = document.getElementById('app-container');
  authDivElement = document.getElementById('auth');

  if (!appContainerElement) {
    console.error("app.js (DOMContentLoaded): Element #app-container NIE ZOSTAŁ ZNALEZIONY W DOM!");
    // Można spróbować dodać bardziej widoczny błąd na stronie, jeśli to się dzieje
    if (document.body) document.body.innerHTML = "<h1>BŁĄD KRYTYCZNY: Brak elementu #app-container w HTML.</h1>" + document.body.innerHTML;
  } else {
    console.log("app.js (DOMContentLoaded): Element #app-container ZNALEZIONY.");
  }

  if (!authDivElement) {
    console.error("app.js (DOMContentLoaded): Element #auth NIE ZOSTAŁ ZNALEZIONY W DOM!");
    if (document.body) document.body.innerHTML = "<h1>BŁĄD KRYTYCZNY: Brak elementu #auth w HTML.</h1>" + document.body.innerHTML;
  } else {
    console.log("app.js (DOMContentLoaded): Element #auth ZNALEZIONY.");
  }

  // Kontynuuj tylko jeśli oba kluczowe kontenery istnieją
  if (appContainerElement && authDivElement) {
    console.log("app.js (DOMContentLoaded): Oba kontenery (#app-container, #auth) znalezione. Ustawianie obsługi Supabase...");

    supabase.auth.onAuthStateChange((event, session) => {
      console.log('app.js (onAuthStateChange): Zdarzenie zmiany stanu autoryzacji:', event, "Sesja:", session);
      handleAuthState(session, authDivElement, appContainerElement);
    });

    (async () => {
      try {
        console.log("app.js (DOMContentLoaded async): Próba pobrania sesji początkowej...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('app.js (DOMContentLoaded async): Błąd podczas pobierania obiektu sesji początkowej:', error);
        }
        console.log('app.js (DOMContentLoaded async): Sesja początkowa:', session);
        handleAuthState(session, authDivElement, appContainerElement);
      } catch (error) {
        console.error('app.js (DOMContentLoaded async): Krytyczny błąd podczas pobierania sesji początkowej:', error);
        // Jeśli jest błąd, ale authDivElement istnieje, pokaż logowanie
        if (authDivElement) {
            console.log("app.js (DOMContentLoaded async): Awaryjne wywołanie showLogin() z powodu błędu.");
            showLogin(authDivElement); // showLogin jest z login.js i powinno przyjąć authDivElement
        } else if (document.body) {
            document.body.innerHTML = "<h1>Krytyczny błąd podczas inicjalizacji sesji. Sprawdź konsolę.</h1>";
        }
      }
    })();
  } else {
    console.error("app.js (DOMContentLoaded): Jeden lub oba kluczowe kontenery (#app-container, #auth) nie istnieją. Aplikacja nie może poprawnie wystartować.");
    // Nie zmieniaj document.body.innerHTML tutaj, bo poprzednie logi już to zrobiłyby, jeśli tylko jeden brakował.
    // Jeśli oba brakują, to HTML jest poważnie uszkodzony.
  }
});

console.log("app.js: Skrypt zakończył parsowanie. Nasłuchiwanie na DOMContentLoaded ustawione.");
