// auth/login.js
import { supabaseClient as supabase } from './init.js';
import { showAppUI } from '../app.js'; // showAppUI jest eksportowane z app.js

export function handleAuthState(session) {
  console.log("login.js: handleAuthState called with session:", session);
  const appContainer = document.getElementById('app-container'); // Celujemy w nowy kontener
  const authDiv = document.getElementById('auth');

  if (!authDiv || !appContainer) {
      console.error("login.js: Critical error - authDiv or appContainer not found.");
      return;
  }

  if (session) {
    authDiv.style.display = 'none';
    appContainer.style.display = 'flex'; // Pokaż główny kontener aplikacji
    showAppUI(); // showAppUI zbuduje wewnętrzną strukturę appContainer
  } else {
    authDiv.style.display = 'flex'; // Pokaż kontener logowania
    appContainer.style.display = 'none'; // Ukryj główny kontener aplikacji
    showLogin();
  }
}

export function showLogin() {
  console.log("login.js: showLogin called");
  const authDiv = document.getElementById('auth');
  if (!authDiv) {
    console.error("login.js: Auth div not found for login form!");
    if (document.body) {
        const errorMsg = document.createElement('p');
        errorMsg.textContent = "Krytyczny błąd: Brak kontenera UI (#auth) dla formularza logowania. Sprawdź konsolę.";
        errorMsg.style.color = "red";
        document.body.appendChild(errorMsg);
    }
    return;
  }

  // Upewnij się, że appContainer jest ukryty, gdy pokazujemy logowanie
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
    appContainer.style.display = 'none';
  }
  authDiv.style.display = 'flex'; // Używamy flex dla authDiv, aby login-container był wycentrowany

  authDiv.innerHTML = `
    <div class="login-container">
      <h2>Login / Rejestracja</h2>
      <div class="form-group">
        <label for="email">Email:</label>
        <input id="email" type="email" placeholder="Twój email" required />
      </div>
      <div class="form-group">
        <label for="password">Hasło:</label>
        <input id="password" type="password" placeholder="Twoje hasło" required />
      </div>
      <div class="button-group">
        <button id="loginBtn" class="auth-button">Zaloguj</button>
        <button id="registerBtn" class="auth-button register">Zarejestruj</button>
      </div>
      <p id="auth-message" class="auth-message"></p>
    </div>
  `;

  const messageEl = document.getElementById('auth-message');

  document.getElementById('loginBtn').onclick = async () => {
    messageEl.textContent = '';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    console.log("login.js: Login attempt for:", email);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      console.log("login.js: Login successful (onAuthStateChange will handle UI)");
    } catch (error) {
      console.error("login.js: Login error:", error.message);
      messageEl.textContent = "Logowanie nie powiodło się: " + error.message;
    }
  };

  document.getElementById('registerBtn').onclick = async () => {
    messageEl.textContent = '';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    console.log("login.js: Register attempt for:", email);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      console.log("login.js: Registration successful, pending confirmation:", data);
      messageEl.textContent = "Sprawdź email, aby potwierdzić rejestrację.";
    } catch (error) {
      console.error("login.js: Registration error:", error.message);
      messageEl.textContent = "Rejestracja nie powiodła się: " + error.message;
    }
  };
}
