import { supabase } from './auth/init.js';
import { showLogin, handleAuthState } from './auth/login.js';
import { renderContacts } from './components/contacts.js';
import { renderCompanies } from './components/companies.js';
import { renderDeals } from './components/deals.js';
import { renderTasks } from './components/tasks.js';

const appDiv = document.getElementById('app');
const authDiv = document.getElementById('auth');

supabase.auth.onAuthStateChange((event, session) => {
  handleAuthState(session);
});

handleAuthState(await supabase.auth.getSession().then(res => res.data.session));

export function showAppUI() {
  authDiv.style.display = 'none';
  appDiv.style.display = 'block';
  appDiv.innerHTML = '';
  const nav = document.createElement('nav');
  nav.innerHTML = `
    <button id="contactsBtn">Contacts</button>
    <button id="companiesBtn">Companies</button>
    <button id="dealsBtn">Deals</button>
    <button id="tasksBtn">Tasks</button>
    <button id="logoutBtn">Logout</button>
    <hr/>
  `;
  const content = document.createElement('div');
  content.id = 'content';
  appDiv.appendChild(nav);
  appDiv.appendChild(content);

  document.getElementById('contactsBtn').onclick = () => renderContacts(content);
  document.getElementById('companiesBtn').onclick = () => renderCompanies(content);
  document.getElementById('dealsBtn').onclick = () => renderDeals(content);
  document.getElementById('tasksBtn').onclick = () => renderTasks(content);
  document.getElementById('logoutBtn').onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  renderContacts(content);
}
