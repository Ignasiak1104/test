// auth/login.js
import { supabaseClient as supabase } from './init.js';
import { showAppUI } from '../app.js'; // showAppUI jest eksportowane z app.js

export function handleAuthState(session, authDivFromApp, appContainerFromApp) {
  console.log("login.js: handleAuthState wywołane. Sesja:", session);

  const authDiv = authDivFromApp; // Używamy przekazanych referencji
  const appContainer = appContainerFromApp; // Używamy przekazanych referencji

  if (!authDiv || !appContainer) {
      console.error("login.js (handleAuthState): Krytyczny błąd - authDiv lub appContainer nie zostały przekazane lub są null.");
      if (document.body) { // Ostateczny fallback, jeśli UI jest kompletnie zepsute
          document.body.innerHTML = "<h1>Błąd UI: Brak kontenerów do zarządzania stanem logowania.</h1>";
      }
      return;
  }

  if (session) {
    console.log("login.js (handleAuthState): Sesja istnieje. Pokazywanie UI aplikacji.");
    authDiv.style.display = 'none';
    appContainer.style.display = 'flex';
    showAppUI();
  } else {
    console.log("login.js (handleAuthState): Brak sesji. Pokazywanie formularza logowania.");
    authDiv.style.display = 'flex'; // Używamy flex dla login-container
    appContainer.style.display = 'none';
    showLogin(authDiv); // Przekazujemy authDiv do showLogin
  }
}

export function showLogin(authDivPassed) {
  console.log("login.js: showLogin wywołane.");
  const authDiv = authDivPassed; // Używamy przekazanego elementu

  if (!authDiv) {
    console.error("login.js (showLogin): Element authDiv nie został przekazany lub jest null!");
    if (document.body) {
        const errorMsgEl = document.createElement('p');
        errorMsgEl.textContent = "Krytyczny błąd UI: Nie można wyświetlić formularza logowania (brak kontenera #auth).";
        errorMsgEl.style.color = "red";
        errorMsgEl.style.textAlign = "center";
        errorMsgEl.style.padding = "20px";
        document.body.insertBefore(errorMsgEl, document.body.firstChild); // Dodaj na górze body
    }
    return;
  }

  // Upewniamy się, że główny kontener aplikacji jest ukryty
  // Możemy go pobrać tutaj ponownie, jeśli app.js nie zarządza jego widocznością w tym momencie
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
    appContainer.style.display = 'none';
  }
  // Ustawiamy styl wyświetlania dla authDiv, jeśli nie był już ustawiony przez handleAuthState
  if (authDiv.style.display !== 'flex') {
      authDiv.style.display = 'flex';
  }


  authDiv.innerHTML = `
    <div class="login-container">
      <h2>Login / Rejestracja</h2>
      <div class="form-group">
        <label for="loginEmail">Email:</label> <input id="loginEmail" type="email" placeholder="Twój email" required />
      </div>
      <div class="form-group">
        <label for="loginPassword">Hasło:</label> <input id="loginPassword" type="password" placeholder="Twoje hasło" required />
      </div>
      <div class="button-group">
        <button id="loginBtn">Zaloguj</button>
        <button id="registerBtn" class="register">Zarejestruj</button>
      </div>
      <p id="auth-message" class="auth-message"></p>
    </div>
  `;

  const messageEl = document.getElementById('auth-message');
  const loginEmailEl = document.getElementById('loginEmail');
  const loginPasswordEl = document.getElementById('loginPassword');

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.onclick = async () => {
        if(messageEl) messageEl.textContent = '';
        const email = loginEmailEl.value;
        const password = loginPasswordEl.value;
        console.log("login.js: Próba logowania dla:", email);
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          console.log("login.js: Logowanie udane (onAuthStateChange obsłuży UI)");
        } catch (error) {
          console.error("login.js: Błąd logowania:", error.message);
          if(messageEl) messageEl.textContent = "Logowanie nie powiodło się: " + error.message;
        }
    };
  }

  const registerBtn = document.getElementById('registerBtn');
  if (registerBtn) {
    registerBtn.onclick = async () => {
        if(messageEl) messageEl.textContent = '';
        const email = loginEmailEl.value;
        const password = loginPasswordEl.value;
        console.log("login.js: Próba rejestracji dla:", email);
        try {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          console.log("login.js: Rejestracja udana, oczekiwanie na potwierdzenie:", data);
          if(messageEl) messageEl.textContent = "Sprawdź email, aby potwierdzić rejestrację.";
        } catch (error) {
          console.error("login.js: Błąd rejestracji:", error.message);
          if(messageEl) messageEl.textContent = "Rejestracja nie powiodła się: " + error.message;
        }
    };
  }
}
