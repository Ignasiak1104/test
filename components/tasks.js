// components/tasks.js
import { supabaseClient as supabase } from '../auth/init.js';

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

// --- Funkcja do wyświetlania formularza edycji zadania (istniejąca) ---
async function displayEditTaskForm(taskId, container, currentUser, onSaveCallback) { // Dodano onSaveCallback
  container.innerHTML = ''; 
  try {
    // ... (reszta kodu displayEditTaskForm bez zmian aż do onsubmit) ...
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`*, contact_id, company_id, contacts (id), companies (id)`) // Usunięto pełne dane kontaktów/firm, wystarczą ID
      .eq('id', taskId)
      .eq('user_id', currentUser.id)
      .single();

    if (taskError || !task) {
      throw taskError || new Error("Nie znaleziono zadania lub brak uprawnień.");
    }

    const allContactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'All Contacts for edit task');
    const allCompaniesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'All Companies for edit task');

    let html = `
      <div class="edit-form-container">
        <h3>Edytuj Zadanie</h3>
        <form id="specificEditTaskForm" class="data-form">
          <input type="hidden" id="editTaskFormIdField" value="${task.id}">
          <div class="form-group">
            <label for="editTaskFormTitleField">Tytuł zadania:</label>
            <input type="text" id="editTaskFormTitleField" value="${task.title}" required />
          </div>
          <div class="form-group">
            <label for="editTaskFormDueDateField">Termin wykonania:</label>
            <input type="date" id="editTaskFormDueDateField" value="${task.due_date || ''}" />
          </div>
          <div class="form-group">
            <label for="editTaskFormStatusField">Status:</label>
            <select id="editTaskFormStatusField">
              <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Do zrobienia</option>
              <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>W trakcie</option>
              <option value="done" ${task.status === 'done' ? 'selected' : ''}>Zrobione</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editTaskFormContactField">Powiąż z kontaktem:</label>
            <select id="editTaskFormContactField">
              <option value="">Wybierz kontakt...</option>
              ${allContactsForSelect.map(c => `<option value="${c.id}" ${task.contact_id === c.id ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="editTaskFormCompanyField">Powiąż z firmą:</label>
            <select id="editTaskFormCompanyField">
              <option value="">Wybierz firmę...</option>
              ${allCompaniesForSelect.map(c => `<option value="${c.id}" ${task.company_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="edit-form-buttons">
            <button type="submit" class="btn btn-primary">Zapisz Zmiany</button>
            <button type="button" class="btn btn-secondary cancel-btn" id="cancelEditTaskBtnAction">Anuluj</button>
          </div>
        </form>
      </div>
    `;
    container.innerHTML = html;

    const editForm = document.getElementById('specificEditTaskForm');
    if (editForm) {
        editForm.onsubmit = async (e) => {
          e.preventDefault();
          const updatedTitle = document.getElementById('editTaskFormTitleField').value;
          const updatedDueDate = document.getElementById('editTaskFormDueDateField').value || null;
          const updatedStatus = document.getElementById('editTaskFormStatusField').value;
          const updatedContactId = document.getElementById('editTaskFormContactField').value || null;
          const updatedCompanyId = document.getElementById('editTaskFormCompanyField').value || null;

          const { error: updateError } = await supabase
            .from('tasks')
            .update({
              title: updatedTitle, due_date: updatedDueDate, status: updatedStatus,
              contact_id: updatedContactId, company_id: updatedCompanyId
            })
            .eq('id', task.id).eq('user_id', currentUser.id);

          if (updateError) {
            showToast("Błąd aktualizacji zadania: " + updateError.message, 'error');
          } else {
            showToast("Zadanie zaktualizowane pomyślnie!");
            if (onSaveCallback) onSaveCallback(); else renderTasks(container.closest('#content-area') || container);
          }
        };
    }
    const cancelBtn = document.getElementById('cancelEditTaskBtnAction');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            if (onSaveCallback) onSaveCallback(); // Wróć do widoku detali kontaktu, jeśli stamtąd przyszliśmy
            else renderTasks(container.closest('#content-area') || container);
        };
    }
  } catch (err) {
    showToast(`Błąd ładowania formularza edycji zadania: ${err.message}`, 'error');
  }
}


// --- NOWA EKSPORTOWANA Funkcja do wyświetlania formularza DODAWANIA zadania ---
export async function displayAddTaskForm(formContainer, currentUser, preselectedContactId = null, preselectedCompanyId = null, onSaveCallback) {
    formContainer.innerHTML = `<p class="loading-message">Ładowanie formularza dodawania zadania...</p>`;
    try {
        const contactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'Contacts for add task');
        const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for add task');

        let html = `
          <form id="modularAddTaskForm" class="data-form">
            <h3>Dodaj nowe zadanie</h3>
            <div class="form-group">
                <label for="addTaskFormTitleField">Tytuł zadania:</label>
                <input type="text" id="addTaskFormTitleField" placeholder="Tytuł zadania" required />
            </div>
            <div class="form-group">
                <label for="addTaskFormDueDateField">Termin wykonania:</label>
                <input type="date" id="addTaskFormDueDateField" />
            </div>
            <div class="form-group">
                <label for="addTaskFormStatusField">Status:</label>
                <select id="addTaskFormStatusField">
                    <option value="todo">Do zrobienia</option>
                    <option value="in_progress">W trakcie</option>
                    <option value="done">Zrobione</option>
                </select>
            </div>
            <div class="form-group">
                <label for="addTaskFormContactField">Powiąż z kontaktem:</label>
                <select id="addTaskFormContactField" ${preselectedContactId ? 'disabled' : ''}>
                    <option value="">Wybierz kontakt...</option>
                    ${contactsForSelect.map(c => `<option value="${c.id}" ${preselectedContactId === c.id ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="addTaskFormCompanyField">Powiąż z firmą:</label>
                <select id="addTaskFormCompanyField" ${preselectedCompanyId ? 'disabled' : ''}>
                    <option value="">Wybierz firmę...</option>
                    ${companiesForSelect.map(c => `<option value="${c.id}" ${preselectedCompanyId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="edit-form-buttons">
                <button type="submit" class="btn btn-success">Dodaj Zadanie</button>
                <button type="button" class="btn btn-secondary" id="cancelModularAddTaskBtn">Anuluj</button>
            </div>
          </form>
        `;
        formContainer.innerHTML = html;
        // Jeśli ID są przekazane, upewnij się, że są wybrane i zablokowane
        if (preselectedContactId) document.getElementById('addTaskFormContactField').value = preselectedContactId;
        if (preselectedCompanyId) document.getElementById('addTaskFormCompanyField').value = preselectedCompanyId;


        document.getElementById('modularAddTaskForm').onsubmit = async (e) => {
            e.preventDefault();
            const title = document.getElementById('addTaskFormTitleField').value;
            const due_date = document.getElementById('addTaskFormDueDateField').value || null;
            const status = document.getElementById('addTaskFormStatusField').value;
            const contact_id = preselectedContactId || document.getElementById('addTaskFormContactField').value || null;
            const company_id = preselectedCompanyId || document.getElementById('addTaskFormCompanyField').value || null;
            
            const { error: insertError } = await supabase.from('tasks').insert([
              { title, due_date, status, user_id: currentUser.id, contact_id, company_id }
            ]);
            if (insertError) {
              showToast("Błąd podczas dodawania zadania: " + insertError.message, 'error');
            } else {
              showToast("Zadanie dodane pomyślnie!");
              formContainer.innerHTML = ''; // Czyścimy formularz
              if (onSaveCallback) onSaveCallback(); // Wywołaj callback, jeśli istnieje
              else renderTasks(formContainer.closest('#content-area') || formContainer); // Domyślnie odśwież listę zadań
            }
        };
        document.getElementById('cancelModularAddTaskBtn').onclick = () => {
            formContainer.innerHTML = ''; // Ukryj formularz
            if (onSaveCallback) onSaveCallback(); // Wywołaj callback, jeśli istnieje (np. odświeżenie widoku detali kontaktu)
        }

    } catch (error) {
        console.error("Błąd wyświetlania formularza dodawania zadania:", error);
        formContainer.innerHTML = `<p class="error-message">Błąd ładowania formularza: ${error.message}</p>`;
    }
}


// --- Główna funkcja renderująca listę zadań (zmodyfikowana) ---
export async function renderTasks(container) {
  container.innerHTML = ''; 
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      container.innerHTML = "<p class='error-message'>Proszę się zalogować.</p>";
      return;
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`*, contacts (id, first_name, last_name), companies (id, name)`)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      container.innerHTML = `<p class="error-message">Błąd ładowania zadań: ${error.message}</p>`;
      return;
    }

    let html = '<h2>Zadania</h2>';
    if (tasks && tasks.length > 0) {
      html += '<ul>' + tasks.map(t => {
        const contactName = t.contacts ? `${t.contacts.first_name} ${t.contacts.last_name}` : 'Brak';
        const companyName = t.companies ? t.companies.name : 'Brak';
        return `<li class="list-item">
                    <div>
                        <p><span class="label">Tytuł:</span> ${t.title}</p>
                        <p><span class="label">Status:</span> ${t.status}</p>
                        <p><span class="label">Termin:</span> ${t.due_date || 'Brak terminu'}</p>
                        <p><span class="label">Kontakt:</span> ${contactName}</p>
                        <p><span class="label">Firma:</span> ${companyName}</p>
                    </div>
                    <div class="list-item-actions">
                        <button class="edit-btn" data-id="${t.id}">Edytuj</button>
                    </div>
                </li>`;
      }).join('') + '</ul>';
    } else {
      html += '<p>Nie masz jeszcze żadnych zadań.</p>';
    }
    
    // Kontener dla formularza dodawania, który będzie wypełniany przez displayAddTaskForm
    html += `<div id="addTaskFormContainerPlaceholder" class="mt-6"></div>`; 
    html += `<button id="showMainAddTaskFormBtn" class="btn btn-success mt-4">Dodaj Nowe Zadanie</button>`;
    
    container.innerHTML = html;

    container.querySelectorAll('.edit-btn').forEach(button => {
      button.onclick = (e) => {
        const taskId = e.target.dataset.id;
        // Formularz edycji zajmie cały kontener #content-area lub specjalny sub-kontener
        displayEditTaskForm(taskId, container, currentUser, () => renderTasks(container));
      };
    });

    const addTaskFormContainer = document.getElementById('addTaskFormContainerPlaceholder');
    const showMainAddTaskFormBtn = document.getElementById('showMainAddTaskFormBtn');
    if(showMainAddTaskFormBtn && addTaskFormContainer){
        showMainAddTaskFormBtn.onclick = () => {
            displayAddTaskForm(addTaskFormContainer, currentUser, null, null, () => renderTasks(container));
            showMainAddTaskFormBtn.style.display = 'none'; // Ukryj przycisk po pokazaniu formularza
        }
    }

  } catch (err) {
    console.error("General error in renderTasks:", err.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}.</p>`;
  }
}
