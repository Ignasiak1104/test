// components/contacts.js
import { supabaseClient as supabase } from '../auth/init.js'; // ZMIANA TUTAJ

export async function renderContacts(container) {
  try {
    const { data: { user } , error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
        console.log("renderContacts: User not logged in.");
        container.innerHTML = "<p>Proszę się zalogować, aby zobaczyć kontakty.</p>";
        return;
    }

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    let html = '<h2>Kontakty</h2>';
    if (contacts && contacts.length > 0) {
        html += '<ul>' + contacts.map(c => 
        `<li>${c.first_name} ${c.last_name} - ${c.email}</li>`).join('') + '</ul>';
    } else {
        html += '<p>Nie masz jeszcze żadnych kontaktów.</p>';
    }
    

    html += `
      <form id="addContactForm">
        <h3>Dodaj nowy kontakt</h3>
        <div class="form-group">
          <label for="firstName">Imię:</label>
          <input type="text" id="firstName" placeholder="Imię" required />
        </div>
        <div class="form-group">
          <label for="lastName">Nazwisko:</label>
          <input type="text" id="lastName" placeholder="Nazwisko" required />
        </div>
        <div class="form-group">
          <label for="contactEmail">Email:</label>
          <input type="email" id="contactEmail" placeholder="Email" required />
        </div>
        <button type="submit">Dodaj Kontakt</button>
      </form>
    `;

    container.innerHTML = html;

    document.getElementById('addContactForm').onsubmit = async (e) => {
      e.preventDefault();
      const first_name = document.getElementById('firstName').value;
      const last_name = document.getElementById('lastName').value;
      const email = document.getElementById('contactEmail').value; // Zmieniono ID, aby uniknąć konfliktu z logowaniem
      
      const { error: insertError } = await supabase.from('contacts').insert([{ first_name, last_name, email, user_id: user.id }]);
      if (insertError) {
        console.error("Error adding contact:", insertError.message);
        alert("Błąd podczas dodawania kontaktu: " + insertError.message);
      } else {
        renderContacts(container); // Odśwież listę
      }
    };
  } catch (error) {
    console.error("Error rendering contacts:", error.message);
    container.innerHTML = `<p>Wystąpił błąd podczas ładowania kontaktów: ${error.message}. Spróbuj ponownie później.</p>`;
  }
}
