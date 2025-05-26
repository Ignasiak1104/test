// auth/login.js
import { supabaseClient as supabase } from './init.js';
import { showAppUI } from '../app.js';

export function handleAuthState(session, authDivPassed, appContainerPassed) {
  console.log("login.js: handleAuthState wywołane. Sesja:", session);

  const authDiv = authDivPassed;
  const appContainer = appContainerPassed;
  const mainTitle = document.getElementById('main-title');

  if (!authDiv || !appContainer) {
      console.error("login.js (handleAuthState): Krytyczny błąd - authDiv lub appContainer nie zostały przekazane.");
      if (document.body) {
          document.body.innerHTML = "<h1>Błąd UI: Brak kontenerów do zarządzania stanem logowania.</h1>";
      }
      return;
  }

  if (session) {
    console.log("login.js (handleAuthState): Sesja istnieje. Pokazywanie UI aplikacji.");
    document.body.classList.remove('auth-active');
    authDiv.classList.remove('fullscreen-auth');
    authDiv.style.display = 'none';
    authDiv.innerHTML = ''; // Czyścimy zawartość #auth po wylogowaniu

    if (mainTitle) mainTitle.classList.remove('hidden');

    appContainer.style.display = 'flex';
    showAppUI();
  } else {
    console.log("login.js (handleAuthState): Brak sesji. Pokazywanie formularza logowania.");
    document.body.classList.add('auth-active');
    if (mainTitle) mainTitle.classList.add('hidden');
    
    authDiv.classList.add('fullscreen-auth');
    authDiv.style.display = 'flex';
    appContainer.style.display = 'none';
    showLogin(authDiv);
  }
}

export function showLogin(authDiv) {
  console.log("login.js: showLogin wywołane - renderowanie nowego interfejsu logowania.");

  if (!authDiv) {
    console.error("login.js (showLogin): Element authDiv nie został przekazany!");
    return;
  }

  authDiv.innerHTML = `
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 md:p-10 relative">
      <div id="loginFormContainer" class="fade-toggle visible-opacity">
        <h2 class="text-3xl font-bold mb-6 text-center text-gray-800">Logowanie</h2>
        <form id="actualLoginForm">
          <div class="mb-4">
            <label for="loginEmailInput" class="sr-only">Email</label>
            <input id="loginEmailInput" type="email" placeholder="Email" class="w-full px-4 py-3 mb-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" required autocomplete="email">
          </div>
          <div class="mb-6">
            <label for="loginPasswordInput" class="sr-only">Hasło</label>
            <input id="loginPasswordInput" type="password" placeholder="Hasło" class="w-full px-4 py-3 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" required autocomplete="current-password">
          </div>
          <button id="loginSubmitButton" type="submit" class="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors font-semibold">Zaloguj się</button>
        </form>
        <p class="mt-6 text-sm text-center text-gray-600">Nie masz konta? <button id="toggleToRegister" class="text-blue-600 font-semibold hover:underline focus:outline-none">Zarejestruj się</button></p>
      </div>

      <div id="registerFormContainer" class="fade-toggle hidden-opacity absolute top-0 left-0 w-full h-full bg-white p-8 md:p-10 rounded-2xl">
        <h2 class="text-3xl font-bold mb-6 text-center text-gray-800">Rejestracja</h2>
        <form id="actualRegisterForm">
          <div class="mb-4">
            <label for="registerEmailInput" class="sr-only">Email</label>
            <input id="registerEmailInput" type="email" placeholder="Email" class="w-full px-4 py-3 mb-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow" required autocomplete="email">
          </div>
          <div class="mb-6">
            <label for="registerPasswordInput" class="sr-only">Hasło</label>
            <input id="registerPasswordInput" type="password" placeholder="Hasło (min. 6 znaków)" class="w-full px-4 py-3 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow" required autocomplete="new-password">
          </div>
          <button id="registerSubmitButton" type="submit" class="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors font-semibold">Zarejestruj się</button>
        </form>
        <p class="mt-6 text-sm text-center text-gray-600">Masz już konto? <button id="toggleToLogin" class="text-green-600 font-semibold hover:underline focus:outline-none">Zaloguj się</button></p>
      </div>
      <p id="authFormMessageArea" class="auth-message text-center mt-4 text-sm"></p>
    </div>
  `;

  const toggleToRegisterBtn = document.getElementById('toggleToRegister');
  const toggleToLoginBtn = document.getElementById('toggleToLogin');
  const loginFormCont = document.getElementById('loginFormContainer');
  const registerFormCont = document.getElementById('registerFormContainer');
  
  const loginForm = document.getElementById('actualLoginForm');
  const registerForm = document.getElementById('actualRegisterForm');
  
  const loginEmailEl = document.getElementById('loginEmailInput');
  const loginPasswordEl = document.getElementById('loginPasswordInput');

  const registerEmailEl = document.getElementById('registerEmailInput');
  const registerPasswordEl = document.getElementById('registerPasswordInput');

  const messageArea = document.getElementById('authFormMessageArea');

  if (toggleToRegisterBtn && loginFormCont && registerFormCont) {
    toggleToRegisterBtn.addEventListener('click', () => {
      loginFormCont.classList.remove('visible-opacity');
      loginFormCont.classList.add('hidden-opacity');
      registerFormCont.classList.remove('hidden-opacity');
      registerFormCont.classList.add('visible-opacity');
      if (messageArea) messageArea.textContent = '';
      // Ustawienie focusa na pierwszym polu formularza rejestracji
      if(registerEmailEl) registerEmailEl.focus();
    });
  }

  if (toggleToLoginBtn && loginFormCont && registerFormCont) {
    toggleToLoginBtn.addEventListener('click', () => {
      registerFormCont.classList.remove('visible-opacity');
      registerFormCont.classList.add('hidden-opacity');
      loginFormCont.classList.remove('hidden-opacity');
      loginFormCont.classList.add('visible-opacity');
      if (messageArea) messageArea.textContent = '';
      // Ustawienie focusa na pierwszym polu formularza logowania
      if(loginEmailEl) loginEmailEl.focus();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (messageArea) messageArea.textContent = '';
      if (!loginEmailEl || !loginPasswordEl) return;
      const email = loginEmailEl.value;
      const password = loginPasswordEl.value;
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange obsłuży resztę
      } catch (error) {
        console.error("login.js: Błąd logowania:", error.message);
        if (messageArea) messageArea.textContent = "Logowanie nie powiodło się: " + error.message;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (messageArea) messageArea.textContent = '';
      if (!registerEmailEl || !registerPasswordEl) return;
      const email = registerEmailEl.value;
      const password = registerPasswordEl.value;
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (messageArea) messageArea.textContent = "Sprawdź email ("+email+"), aby potwierdzić rejestrację.";
      } catch (error) {
        console.error("login.js: Błąd rejestracji:", error.message);
        if (messageArea) messageArea.textContent = "Rejestracja nie powiodła się: " + error.message;
      }
    });
  }
   // Ustawienie focusa na pierwszym polu formularza logowania po załadowaniu
   if(loginEmailEl) loginEmailEl.focus();
}
