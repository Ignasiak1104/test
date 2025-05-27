// components/contacts.js
import { supabaseClient as supabase } from '../auth/init.js';

async function displayEditContactForm(contactId, container, currentUser) {
  container.innerHTML = `<p class="loading-message">Ładowanie danych kontaktu...</p>`;
  try {
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', currentUser.id)
      .single();

    if (error || !contact) {
      throw error || new Error("Nie znaleziono kontaktu lub brak uprawnień.");
    }

    let html = `
      <div class="edit-form-container">
        <h3>Edytuj Kontakt</h3>
        <form id="specificEditContactForm" class="data-form">
          <input type="hidden" id="editContactFormIdField" value="${contact.id}">
          <div class="form-group">
            <label for="editContactFormFirstNameField">Imię:</label>
            <input type="text" id="editContactFormFirstNameField" value="${contact.first_name}" required />
          </div>
          <div class="form-group">
            <label for="editContactFormLastNameField">Nazwisko:</label>
            <input type="text" id="editContactFormLastNameField" value="${contact.last_name}" required />
          </div>
          <div class="form-group">
            <label for="editContactFormEmailField">Email:</label>
            <input type="email" id="editContactFormEmailField" value="${contact.email}" required />
          </div>
          <div class="edit-form-buttons">
            <button type="submit" class="btn btn-primary">Zapisz Zmiany</button>
            <button type="button" class="btn btn-secondary cancel-btn" id="cancelEditContactBtnAction">Anuluj</button>
          </div>
        </form>
      </div>
    `;
    container.innerHTML = html;

    const editForm = document.getElementById('specificEditContactForm');
    if (editForm) {
        editForm.onsubmit = async (e) => {
          e.preventDefault();
          const updatedFirstName = document.getElementById('editContactFormFirstNameField').value;
          const updatedLastName = document.getElementById('editContactFormLastNameField').value;
          const updatedEmail = document.getElementById('editContactFormEmailField').value;

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
            showToast("Błąd podczas aktualizacji kontaktu: " + updateError.message, 'error');
          } else {
            showToast("Kontakt zaktualizowany pomyślnie!");
            renderContacts(container);
          }
        };
    }

    const cancelBtn = document.getElementById('cancelEditContactBtnAction');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
          renderContacts(container);
        };
    }

  } catch (err) {
    console.error("Error displaying edit contact form:", err.message);
    container.innerHTML = `<p class="error-message">Błąd ładowania formularza edycji: ${err.message}</p>`;
    showToast(`Błąd ładowania formularza edycji: ${err.message}`, 'error');
  }
}

export async function renderContacts(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie kontaktów...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.error("Error fetching user for contacts:", userError.message);
        container.innerHTML = "<p class='error-message'>Błąd pobierania danych użytkownika.</p>";
        return;
    }
    if (!currentUser) {
      console.log("renderContacts: User not logged in.");
      container.innerHTML = "<p class='error-message'>Proszę się zalogować.</p>";
      return;
    }

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching contacts:", error.message);
      container.innerHTML = `<p class="error-message">Błąd ładowania kontaktów: ${error.message}</p>`;
      return;
    }

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
      <form id="mainAddContactForm" class="data-form">
        <h3>Dodaj nowy kontakt</h3>
        <div class="form-group">
          <label for="addContactFormFirstName">Imię:</label>
          <input type="text" id="addContactFormFirstName" placeholder="Imię" required />
        </div>
        <div class="form-group">
          <label for="addContactFormLastName">Nazwisko:</label>
          <input type="text" id="addContactFormLastName" placeholder="Nazwisko" required />
        </div>
        <div class="form-group">
          <label for="addContactFormEmailInput">Email:</label>
          <input type="email" id="addContactFormEmailInput" placeholder="Email" required />
        </div>
        <button type="submit" class="btn btn-success">Dodaj Kontakt</button>
      </form>
    `;
    container.innerHTML = html;

    container.querySelectorAll('.edit-btn').forEach(button => {
      button.onclick = (e) => {
        const contactId = e.target.dataset.id;
        displayEditContactForm(contactId, container, currentUser);
      };
    });

    const addContactForm = document.getElementById('mainAddContactForm');
    if (addContactForm) {
      addContactForm.onsubmit = async (e) => {
        e.preventDefault();
        const first_name = document.getElementById('addContactFormFirstName').value;
        const last_name = document.getElementById('addContactFormLastName').value;
        const email = document.getElementById('addContactFormEmailInput').value;

        const { error: insertError } = await supabase.from('contacts').insert([
          { first_name, last_name, email, user_id: currentUser.id }
        ]);

        if (insertError) {
          console.error("Error adding contact:", insertError.message);
          showToast("Błąd podczas dodawania kontaktu: " + insertError.message, 'error');
        } else {
          showToast("Kontakt dodany pomyślnie!");
          renderContacts(container);
        }
      };
    }
  } catch (err) {
    console.error("General error in renderContacts:", err.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}.</p>`;
  }
}
