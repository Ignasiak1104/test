// auth/login.js
import { supabaseClient as supabase } from './init.js';
import { showAppUI } from '../app.js';

// ZMODYFIKOWANA FUNKCJA: przyjmuje authDiv i appContainer jako argumenty
export function handleAuthState(session, authDivElement, appContainerElement) {
  console.log("login.js: handleAuthState called with session:", session);

  // Użyj przekazanych elementów zamiast pobierać je ponownie
  const authDiv = authDivElement;
  const appContainer = appContainerElement;

  if (!authDiv || !appContainer) {
      console.error("login.js (handleAuthState): Critical error - authDiv or appContainer not provided or null.");
      return;
  }

  if (session) {
    authDiv.style.display = 'none';
    appContainer.style.display = 'flex';
    showAppUI(); // showAppUI nadal może używać globalnych referencji lub pobierać je sama,
                 // ale na tym etapie powinny już być dostępne
  } else {
    authDiv.style.display = 'flex';
    appContainer.style.display = 'none';
    showLogin(authDiv); // Przekaż authDiv do showLogin
  }
}

// ZMODYFIKOWANA FUNKCJA: przyjmuje authDiv jako argument
export function showLogin(authDivElement) {
  console.log("login.js: showLogin called");
  const authDiv = authDivElement; // Użyj przekazanego elementu

  if (!authDiv) {
    console.error("login.js (showLogin): Auth div not provided or null!");
    // Awaryjny fallback, jeśli jakimś cudem authDivElement jest null, a body istnieje
    if (document.body) {
        const errorMsg = document.createElement('p');
        errorMsg.textContent = "Krytyczny błąd: Brak kontenera UI (#auth) dla formularza logowania. Sprawdź konsolę.";
        errorMsg.style.color = "red";
        document.body.appendChild(errorMsg);
    }
    return;
  }

  // Upewnij się, że appContainer jest ukryty, gdy pokazujemy logowanie
  // Możemy go pobrać tutaj, jeśli nie jest przekazywany, ale lepiej być konsekwentnym
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
    appContainer.style.display = 'none';
  }
  authDiv.style.display = 'flex';

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

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.onclick = async () => {
        if(messageEl) messageEl.textContent = '';
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        console.log("login.js: Login attempt for:", email);
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          console.log("login.js: Login successful (onAuthStateChange will handle UI)");
        } catch (error) {
          console.error("login.js: Login error:", error.message);
          if(messageEl) messageEl.textContent = "Logowanie nie powiodło się: " + error.message;
        }
    };
  }

  const registerBtn = document.getElementById('registerBtn');
  if (registerBtn) {
    registerBtn.onclick = async () => {
        if(messageEl) messageEl.textContent = '';
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        console.log("login.js: Register attempt for:", email);
        try {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          console.log("login.js: Registration successful, pending confirmation:", data);
          if(messageEl) messageEl.textContent = "Sprawdź email, aby potwierdzić rejestrację.";
        } catch (error) {
          console.error("login.js: Registration error:", error.message);
          if(messageEl) messageEl.textContent = "Rejestracja nie powiodła się: " + error.message;
        }
    };
  }
}
