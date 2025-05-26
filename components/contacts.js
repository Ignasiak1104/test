import { supabase } from '../auth/init.js';

export async function renderContacts(container) {
  const user = (await supabase.auth.getUser()).data.user;
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id);

  let html = '<h2>Contacts</h2><ul>' + contacts.map(c => 
    `<li>${c.first_name} ${c.last_name} - ${c.email}</li>`).join('') + '</ul>';

  html += `
    <form id="addContactForm">
      <input type="text" id="firstName" placeholder="First Name" required />
      <input type="text" id="lastName" placeholder="Last Name" required />
      <input type="email" id="email" placeholder="Email" required />
      <button type="submit">Add Contact</button>
    </form>
  `;

  container.innerHTML = html;

  document.getElementById('addContactForm').onsubmit = async (e) => {
    e.preventDefault();
    const first_name = document.getElementById('firstName').value;
    const last_name = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    await supabase.from('contacts').insert([{ first_name, last_name, email, user_id: user.id }]);
    renderContacts(container);
  };
}
