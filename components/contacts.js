// components/contacts.js
import { supabaseClient as supabase } from '../auth/init.js';

async function displayEditContactForm(contactId, container, currentUser) {
  // ... (reszta kodu funkcji bez zmian, aż do formularza) ...
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
            {/* ZMIANA KLAS PRZYCISKÓW */}
            <button type="submit" class="btn btn-primary">Zapisz Zmiany</button>
            <button type="button" class="btn btn-secondary cancel-btn" id="cancelEditContactBtnAction">Anuluj</button>
          </div>
        </form>
      </div>
    `;
  // ... (reszta kodu funkcji bez zmian) ...
}

export async function renderContacts(container) {
  // ... (reszta kodu funkcji bez zmian, aż do formularza dodawania) ...
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
        {/* ZMIANA KLAS PRZYCISKÓW */}
        <button type="submit" class="btn btn-success">Dodaj Kontakt</button>
      </form>
    `;
  // ... (reszta kodu funkcji, w tym dodawanie przycisków edycji, które dziedziczą styl z .edit-btn) ...
  // Przycisk edycji w liście:
  // <button class="edit-btn btn btn-primary" data-id="${c.id}">Edytuj</button>
  // Powyżej `.edit-btn` ma już swoje style, ale można dodać `.btn` dla spójności bazowej i np. `.btn-primary` lub `.btn-secondary`
  // Jednak `.edit-btn` zostało zdefiniowane jako mały przycisk, więc może wystarczyć:
  // <button class="edit-btn" data-id="${c.id}">Edytuj</button>
  // Jeśli chcesz, aby przyciski edycji były większe, możesz użyć np. <button class="btn btn-sm btn-primary edit-btn-action" data-id="${c.id}">Edytuj</button>
  // i dodać style dla .btn-sm oraz .edit-btn-action. Dla prostoty zostawiam .edit-btn jak był.
}
