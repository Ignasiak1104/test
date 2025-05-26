import { supabase } from './init.js';
import { showAppUI } from '../app.js';

export function handleAuthState(session) {
  if (session) {
    showAppUI();
  } else {
    showLogin();
  }
}

export function showLogin() {
  const authDiv = document.getElementById('auth');
  authDiv.innerHTML = `
    <h2>Login / Register</h2>
    <input id="email" type="email" placeholder="Email" required />
    <input id="password" type="password" placeholder="Password" required />
    <button id="loginBtn">Login</button>
    <button id="registerBtn">Register</button>
  `;

  document.getElementById('loginBtn').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await supabase.auth.signInWithPassword({ email, password });
    location.reload();
  };

  document.getElementById('registerBtn').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await supabase.auth.signUp({ email, password });
    alert("Check your email to confirm registration.");
  };
}
