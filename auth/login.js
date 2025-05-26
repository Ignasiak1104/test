// auth/login.js
import { supabaseClient as supabase } from './init.js'; // ZMIANA TUTAJ
import { showAppUI } from '../app.js';

export function handleAuthState(session) {
  console.log("login.js: handleAuthState called with session:", session);
  if (session) {
    showAppUI();
  } else {
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

  const appDiv = document.getElementById('app');
  if (appDiv) {
    appDiv.style.display = 'none';
  }
  authDiv.style.display = 'block';

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
