// auth/login.js
import { supabaseClient as supabase } from './init.js';
import { showAppUI } from '../app.js';

export function handleAuthState(session, authDivPassed, appContainerPassed) {
  console.log("login.js: handleAuthState wywołane. Sesja:", session);

  const authDiv = authDivPassed;
  const appContainer = appContainerPassed;

  if (!authDiv || !appContainer) {
      console.error("login.js (handleAuthState): Krytyczny błąd - authDiv lub appContainer nie zostały przekazane.");
      if (document.body) {
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
    authDiv.style.display = 'flex';
    appContainer.style.display = 'none';
    showLogin(authDiv);
  }
}

export function showLogin(authDivPassed) {
  console.log("login.js: showLogin wywołane.");
  const authDiv = authDivPassed;

  if (!authDiv) {
    console.error("login.js (showLogin): Element authDiv nie został przekazany!");
    if (document.body) {
        const errorMsgEl = document.createElement('p');
        errorMsgEl.textContent = "Krytyczny błąd UI: Nie można wyświetlić formularza logowania (brak kontenera #auth).";
        errorMsgEl.style.color = "red";
        errorMsgEl.style.textAlign = "center";
        errorMsgEl.style.padding = "20px";
        if (document.body.firstChild) {
            document.body.insertBefore(errorMsgEl, document.body.firstChild);
        } else {
            document.body.appendChild(errorMsgEl);
        }
    }
    return;
  }
  
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
    appContainer.style.display = 'none';
  }
  if (authDiv.style.display !== 'flex') {
      authDiv.style.display = 'flex';
  }

  authDiv.innerHTML = `
    <div class="login-container">
      <h2>Login / Rejestracja</h2>
      <div class="form-group">
        <label for="loginFormEmail">Email:</label>
        <input id="loginFormEmail" type="email" placeholder="Twój email" required />
      </div>
      <div class="form-group">
        <label for="loginFormPassword">Hasło:</label>
        <input id="loginFormPassword" type="password" placeholder="Twoje hasło" required />
      </div>
      <div class="button-group">
        <button id="loginBtnElem" class="auth-button">Zaloguj</button> <button id="registerBtnElem" class="auth-button register">Zarejestruj</button> </div>
      <p id="authMessageArea" class="auth-message"></p> </div>
  `;

  const messageEl = document.getElementById('authMessageArea');
  const loginEmailEl = document.getElementById('loginFormEmail');
  const loginPasswordEl = document.getElementById('loginFormPassword');
  const loginButton = document.getElementById('loginBtnElem');
  const registerButton = document.getElementById('registerBtnElem');

  if (loginButton) {
    loginButton.onclick = async () => {
        if(messageEl) messageEl.textContent = '';
        if (!loginEmailEl || !loginPasswordEl) return;
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

  if (registerButton) {
    registerButton.onclick = async () => {
        if(messageEl) messageEl.textContent = '';
        if (!loginEmailEl || !loginPasswordEl) return;
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
