// components/contacts.js
import { supabaseClient as supabase } from '../auth/init.js';

// --- Funkcja do wyświetlania formularza edycji kontaktu ---
async function displayEditContactForm(contactId, container, currentUser) {
  container.innerHTML = `<p class="loading-message">Ładowanie danych kontaktu...</p>`;
  try {
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', currentUser.id) // Dodatkowe zabezpieczenie
      .single();

    if (error || !contact) {
      throw error || new Error("Nie znaleziono kontaktu lub brak uprawnień.");
    }

    let html = `
      <div class="edit-form-container">
        <h3>Edytuj Kontakt</h3>
        <form id="editContactFormInstance" class="data-form">
          <input type="hidden" id="editContactId" value="${contact.id}">
          <div class="form-group">
            <label for="editContactFirstName">Imię:</label>
            <input type="text" id="editContactFirstName" value="${contact.first_name}" required />
          </div>
          <div class="form-group">
            <label for="editContactLastName">Nazwisko:</label>
            <input type="text" id="editContactLastName" value="${contact.last_name}" required />
          </div>
          <div class="form-group">
            <label for="editContactFormEmailInput">Email:</label>
            <input type="email" id="editContactFormEmailInput" value="${contact.email}" required />
          </div>
          <div class="edit-form-buttons">
            <button type="submit">Zapisz Zmiany</button>
            <button type="button" class="cancel-btn" id="cancelEditContactBtn">Anuluj</button>
          </div>
        </form>
      </div>
    `;
    container.innerHTML = html;

    document.getElementById('editContactFormInstance').onsubmit = async (e) => {
      e.preventDefault();
      const updatedFirstName = document.getElementById('editContactFirstName').value;
      const updatedLastName = document.getElementById('editContactLastName').value;
      const updatedEmail = document.getElementById('editContactFormEmailInput').value;

      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          first_name: updatedFirstName,
          last_name: updatedLastName,
          email: updatedEmail
        })
        .eq('id', contact.id)
        .eq('user_id', currentUser.id);

      if (updateError) {
        console.error("Error updating contact:", updateError.message);
        alert("Błąd podczas aktualizacji kontaktu: " + updateError.message);
      } else {
        renderContacts(container); // Odśwież listę kontaktów
      }
    };

    document.getElementById('cancelEditContactBtn').onclick = () => {
      renderContacts(container); // Wróć do listy kontaktów
    };

  } catch (err) {
    console.error("Error displaying edit contact form:", err.message);
    container.innerHTML = `<p class="error-message">Błąd ładowania formularza edycji: ${err.message}</p>`;
  }
}

// --- Główna funkcja renderująca listę kontaktów ---
export async function renderContacts(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie kontaktów...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!currentUser) {
      console.log("renderContacts: User not logged in.");
      container.innerHTML = "<p class='error-message'>Proszę się zalogować, aby zobaczyć kontakty.</p>";
      return;
    }

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    let html = '<h2>Kontakty</h2>';
    if (contacts && contacts.length > 0) {
      html += '<ul>' + contacts.map(c =>
        `<li class="list-item">
            <div>
                <p><span class="label">Imię i Nazwisko:</span> ${c.first_name} ${c.last_name}</p>
                <p><span class="label">Email:</span> ${c.email}</p>
            </div>
            <div class="list-item-actions">
                <button class="edit-btn" data-id="${c.id}">Edytuj</button>
            </div>
        </li>`).join('') + '</ul>';
    } else {
      html += '<p>Nie masz jeszcze żadnych kontaktów.</p>';
    }

    html += `
      <form id="addContactForm" class="data-form">
        <h3>Dodaj nowy kontakt</h3>
        <div class="form-group">
          <label for="contactFormFirstName">Imię:</label>
          <input type="text" id="contactFormFirstName" placeholder="Imię" required />
        </div>
        <div class="form-group">
          <label for="contactFormLastName">Nazwisko:</label>
          <input type="text" id="contactFormLastName" placeholder="Nazwisko" required />
        </div>
        <div class="form-group">
          <label for="contactFormEmailInput">Email:</label>
          <input type="email" id="contactFormEmailInput" placeholder="Email" required />
        </div>
        <button type="submit">Dodaj Kontakt</button>
      </form>
    `;
    container.innerHTML = html;

    // Event listener dla przycisków edycji
    container.querySelectorAll('.edit-btn').forEach(button => {
      button.onclick = (e) => {
        const contactId = e.target.dataset.id;
        displayEditContactForm(contactId, container, currentUser);
      };
    });

    const addContactForm = document.getElementById('addContactForm');
    if (addContactForm) {
      addContactForm.onsubmit = async (e) => {
        e.preventDefault();
        const first_name = document.getElementById('contactFormFirstName').value;
        const last_name = document.getElementById('contactFormLastName').value;
        const email = document.getElementById('contactFormEmailInput').value;

        const { error: insertError } = await supabase.from('contacts').insert([
          { first_name, last_name, email, user_id: currentUser.id }
        ]);

        if (insertError) {
          console.error("Error adding contact:", insertError.message);
          alert("Błąd podczas dodawania kontaktu: " + insertError.message);
        } else {
          renderContacts(container);
        }
      };
    }
  } catch (err) {
    console.error("General error in renderContacts:", err.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}. Spróbuj odświeżyć stronę.</p>`;
  }
}
