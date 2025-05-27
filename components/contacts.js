// components/contacts.js
import { supabaseClient as supabase } from '../auth/init.js';
// Importujemy funkcje wyświetlania formularzy dodawania z innych modułów
import { displayAddTaskForm } from './tasks.js';
import { displayAddDealForm } from './deals.js';


async function fetchDataForSelect(userId, fromTable, selectFields, errorMsgPrefix) {
    const { data, error } = await supabase
        .from(fromTable)
        .select(selectFields)
        .eq('user_id', userId);
    if (error) {
        console.error(`${errorMsgPrefix} error:`, error.message);
        return [];
    }
    return data || [];
}

async function renderContactDetails(contact, container, currentUser) { // Zmieniono: przekazujemy cały obiekt contact
    container.innerHTML = `<p class="loading-message">Ładowanie szczegółów kontaktu...</p>`;
    try {
        // Dane kontaktu są już przekazane, ale możemy chcieć odświeżyć powiązania
        const contactId = contact.id;

        const { data: linkedTasks, error: tasksError } = await supabase
            .from('tasks')
            .select('id, title, status, due_date')
            .eq('contact_id', contactId)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (tasksError) console.error("Błąd pobierania powiązanych zadań:", tasksError.message);

        const { data: linkedDeals, error: dealsError } = await supabase
            .from('deals')
            .select('id, title, value, current_stage_id, sales_stages (name, stage_type)')
            .eq('contact_id', contactId)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (dealsError) console.error("Błąd pobierania powiązanych szans:", dealsError.message);

        // Sprawdzamy, czy obiekt firmy istnieje (jeśli kontakt jest powiązany)
        const companyNameDisplay = contact.companies ? contact.companies.name : 'Brak przypisanej firmy';

        let html = `
            <div class="mb-6">
                <button id="backToContactsListBtn" class="btn btn-secondary btn-sm mb-4">&larr; Wróć do listy kontaktów</button>
                <h2 class="text-2xl font-bold text-gray-800">Szczegóły Kontaktu: ${contact.first_name} ${contact.last_name}</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white shadow-md rounded-lg p-6">
                    <h3 class="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Dane Główne</h3>
                    <p><span class="label">Email:</span> ${contact.email}</p>
                    <p><span class="label">Firma:</span> ${companyNameDisplay}</p>
                    <div class="mt-4">
                        <button class="edit-contact-from-detail-btn edit-btn" data-id="${contact.id}">Edytuj Kontakt</button>
                    </div>
                </div>

                <div class="bg-white shadow-md rounded-lg p-6">
                    <h3 class="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Powiązane Zadania (${(linkedTasks || []).length})</h3>
                    ${(linkedTasks && linkedTasks.length > 0)
                        ? `<ul class="list-none space-y-2">${linkedTasks.map(task => `
                            <li class="p-2 border-b border-gray-200">
                                <p class="font-medium">${task.title}</p>
                                <p class="text-sm text-gray-600">Status: ${task.status}, Termin: ${task.due_date || 'Brak'}</p>
                            </li>`).join('')}</ul>`
                        : '<p class="text-sm text-gray-500">Brak powiązanych zadań.</p>'
                    }
                    <button id="addTaskForContactBtn" class="btn btn-success btn-sm mt-4">Dodaj Zadanie dla Tego Kontaktu</button>
                </div>

                <div class="bg-white shadow-md rounded-lg p-6 md:col-span-2">
                    <h3 class="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Powiązane Szanse Sprzedaży (${(linkedDeals || []).length})</h3>
                    ${(linkedDeals && linkedDeals.length > 0)
                        ? `<ul class="list-none space-y-2">${linkedDeals.map(deal => `
                            <li class="p-2 border-b border-gray-200">
                                <p class="font-medium">${deal.title}</p>
                                <p class="text-sm text-gray-600">
                                    Wartość: ${deal.value ? '$' + deal.value.toLocaleString() : 'Brak'}, 
                                    Etap: ${deal.sales_stages ? deal.sales_stages.name : 'Nieznany'} 
                                    (${deal.sales_stages ? deal.sales_stages.stage_type : ''})
                                </p>
                            </li>`).join('')}</ul>`
                        : '<p class="text-sm text-gray-500">Brak powiązanych szans sprzedaży.</p>'
                    }
                    <button id="addDealForContactBtn" class="btn btn-success btn-sm mt-4">Dodaj Szansę dla Tego Kontaktu</button>
                </div>
            </div>
            <div id="contactActionFormContainer"></div> `;

        container.innerHTML = html;

        document.getElementById('backToContactsListBtn').onclick = () => renderContacts(container);
        
        container.querySelector('.edit-contact-from-detail-btn').onclick = (e) => {
            displayEditContactForm(e.target.dataset.id, container, currentUser, true /* isFromDetailsView */);
        };

        const contactActionFormContainer = document.getElementById('contactActionFormContainer');

        document.getElementById('addTaskForContactBtn').onclick = () => {
            // Wywołujemy funkcję z tasks.js, przekazując ID kontaktu
            displayAddTaskForm(contactActionFormContainer, currentUser, contact.id, contact.company_id);
            // Po dodaniu zadania, chcemy odświeżyć widok szczegółów kontaktu
            // Można to zrobić przez callback lub ponowne wywołanie renderContactDetails
            // Na razie zakładamy, że displayAddTaskForm po sukcesie samo odświeży listę zadań,
            // ale my potrzebujemy odświeżyć cały widok kontaktu.
            // Można to obsłużyć w displayAddTaskForm, dodając opcjonalny callback.
            // Na razie: po prostu odświeżamy detale kontaktu po zamknięciu formularza dodawania zadania.
            // Jest to uproszczenie; idealnie displayAddTaskForm miałby callback onSave.
        };
        
        document.getElementById('addDealForContactBtn').onclick = () => {
            displayAddDealForm(contactActionFormContainer, currentUser, contact.id, contact.company_id);
        };

    } catch (err) {
        console.error("Błąd wyświetlania szczegółów kontaktu:", err.message);
        container.innerHTML = `<p class="error-message">Nie można załadować szczegółów kontaktu: ${err.message}</p>`;
        showToast(`Błąd ładowania szczegółów: ${err.message}`, 'error');
    }
}

async function displayEditContactForm(contactId, container, currentUser, isFromDetailsView = false) {
  container.innerHTML = ''; 
  try {
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*, company_id, companies (id, name)')
      .eq('id', contactId)
      .eq('user_id', currentUser.id)
      .single();

    if (error || !contact) {
      throw error || new Error("Nie znaleziono kontaktu lub brak uprawnień.");
    }

    const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for edit contact');

    let html = `
      <div class="edit-form-container">
        ${isFromDetailsView 
            ? `<button id="backToContactDetailsBtn" data-contact-id="${contact.id}" class="btn btn-sm btn-secondary mb-4">&larr; Anuluj i wróć do szczegółów</button>` 
            : `<button id="backToContactsListFromEditBtn" class="btn btn-sm btn-secondary mb-4">&larr; Anuluj i wróć do listy</button>`
        }
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
          <div class="form-group">
            <label for="editContactFormCompanyField">Powiązana firma:</label>
            <select id="editContactFormCompanyField">
              <option value="">Wybierz firmę...</option>
              ${companiesForSelect.map(c => `<option value="${c.id}" ${contact.company_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="edit-form-buttons">
            <button type="submit" class="btn btn-primary">Zapisz Zmiany</button>
          </div>
        </form>
      </div>
    `;
    container.innerHTML = html;
    
    if (isFromDetailsView) {
        document.getElementById('backToContactDetailsBtn').onclick = () => renderContactDetails(contact, container, currentUser);
    } else {
        document.getElementById('backToContactsListFromEditBtn').onclick = () => renderContacts(container);
    }

    const editForm = document.getElementById('specificEditContactForm');
    if (editForm) {
        editForm.onsubmit = async (e) => {
          e.preventDefault();
          const updatedFirstName = document.getElementById('editContactFormFirstNameField').value;
          const updatedLastName = document.getElementById('editContactFormLastNameField').value;
          const updatedEmail = document.getElementById('editContactFormEmailField').value;
          const updatedCompanyId = document.getElementById('editContactFormCompanyField').value || null;

          const { error: updateError } = await supabase
            .from('contacts')
            .update({
              first_name: updatedFirstName,
              last_name: updatedLastName,
              email: updatedEmail,
              company_id: updatedCompanyId
            })
            .eq('id', contact.id)
            .eq('user_id', currentUser.id);

          if (updateError) {
            console.error("Error updating contact:", updateError.message);
            showToast("Błąd podczas aktualizacji kontaktu: " + updateError.message, 'error');
          } else {
            showToast("Kontakt zaktualizowany pomyślnie!");
            if (isFromDetailsView) {
                // Aby odświeżyć dane kontaktu (np. nazwę firmy, jeśli się zmieniła), pobieramy go ponownie
                const { data: updatedContactData } = await supabase.from('contacts').select('*, companies (id, name)').eq('id', contact.id).single();
                renderContactDetails(updatedContactData || contact, container, currentUser);
            } else {
                renderContacts(container);
            }
          }
        };
    }
  } catch (err) {
    console.error("Error displaying edit contact form:", err.message);
    container.innerHTML = `<p class="error-message">Błąd ładowania formularza edycji: ${err.message}</p>`;
    showToast(`Błąd ładowania formularza edycji: ${err.message}`, 'error');
  }
}

export async function renderContacts(container) {
  container.innerHTML = ''; 
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      console.error("renderContacts: Błąd użytkownika lub użytkownik niezalogowany.", userError?.message);
      container.innerHTML = "<p class='error-message'>Proszę się zalogować.</p>";
      return;
    }

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*, companies (id, name)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching contacts:", error.message);
      container.innerHTML = `<p class="error-message">Błąd ładowania kontaktów: ${error.message}</p>`;
      return;
    }

    const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for add contact');

    let html = '<h2>Kontakty</h2>';
    if (contacts && contacts.length > 0) {
      html += '<ul>' + contacts.map(c => {
        const companyName = c.companies ? c.companies.name : 'Brak';
        return `
        <li class="list-item">
            <div>
                <p><span class="label">Imię i Nazwisko:</span> 
                    <a href="#" class="text-blue-600 hover:underline view-contact-details" data-contact-id="${c.id}">
                        ${c.first_name} ${c.last_name}
                    </a>
                </p>
                <p><span class="label">Email:</span> ${c.email}</p>
                <p><span class="label">Firma:</span> ${companyName}</p>
            </div>
            <div class="list-item-actions">
                <button class="edit-btn" data-id="${c.id}">Edytuj</button>
            </div>
        </li>`;
        }).join('') + '</ul>';
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
        <div class="form-group">
            <label for="addContactFormCompanyField">Powiązana firma:</label>
            <select id="addContactFormCompanyField">
              <option value="">Wybierz firmę...</option>
              ${companiesForSelect.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <button type="submit" class="btn btn-success">Dodaj Kontakt</button>
      </form>
    `;
    container.innerHTML = html;

    container.querySelectorAll('.view-contact-details').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const contactId = e.currentTarget.dataset.contactId; // Użyj currentTarget
            const contactData = contacts.find(c => c.id === contactId); // Pobierz pełne dane kontaktu z już załadowanej listy
            if (contactData) {
                renderContactDetails(contactData, container, currentUser);
            } else {
                console.error("Nie znaleziono danych kontaktu dla ID:", contactId);
                showToast("Nie można wyświetlić szczegółów kontaktu.", "error");
            }
        };
    });

    container.querySelectorAll('.edit-btn').forEach(button => {
      button.onclick = (e) => {
        const contactId = e.target.dataset.id;
        displayEditContactForm(contactId, container, currentUser, false);
      };
    });

    const addContactForm = document.getElementById('mainAddContactForm');
    if (addContactForm) {
      addContactForm.onsubmit = async (e) => {
        e.preventDefault();
        const first_name = document.getElementById('addContactFormFirstName').value;
        const last_name = document.getElementById('addContactFormLastName').value;
        const email = document.getElementById('addContactFormEmailInput').value;
        const company_id = document.getElementById('addContactFormCompanyField').value || null;

        const { error: insertError } = await supabase.from('contacts').insert([
          { first_name, last_name, email, user_id: currentUser.id, company_id }
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
