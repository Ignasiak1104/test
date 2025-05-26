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

async function displayEditTaskForm(taskId, container, currentUser) {
  container.innerHTML = `<p class="loading-message">Ładowanie danych zadania...</p>`;
  try {
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`*, contacts (id), companies (id)`)
      .eq('id', taskId)
      .eq('user_id', currentUser.id)
      .single();

    if (taskError || !task) {
      throw taskError || new Error("Nie znaleziono zadania lub brak uprawnień.");
    }

    const contactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'Contacts for edit select');
    const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for edit select');

    let html = `
      <div class="edit-form-container">
        <h3>Edytuj Zadanie</h3>
        <form id="specificEditTaskForm" class="data-form"> <input type="hidden" id="editTaskFormIdField" value="${task.id}"> <div class="form-group">
            <label for="editTaskFormTitleField">Tytuł zadania:</label> <input type="text" id="editTaskFormTitleField" value="${task.title}" required />
          </div>
          <div class="form-group">
            <label for="editTaskFormDueDateField">Termin wykonania:</label> <input type="date" id="editTaskFormDueDateField" value="${task.due_date || ''}" />
          </div>
          <div class="form-group">
            <label for="editTaskFormStatusField">Status:</label> <select id="editTaskFormStatusField">
              <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Do zrobienia</option>
              <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>W trakcie</option>
              <option value="done" ${task.status === 'done' ? 'selected' : ''}>Zrobione</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editTaskFormContactField">Powiąż z kontaktem:</label> <select id="editTaskFormContactField">
              <option value="">Wybierz kontakt...</option>
              ${contactsForSelect.map(c => `<option value="${c.id}" ${task.contact_id === c.id ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="editTaskFormCompanyField">Powiąż z firmą:</label> <select id="editTaskFormCompanyField">
              <option value="">Wybierz firmę...</option>
              ${companiesForSelect.map(c => `<option value="${c.id}" ${task.company_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="edit-form-buttons">
            <button type="submit">Zapisz Zmiany</button>
            <button type="button" class="cancel-btn" id="cancelEditTaskBtnAction">Anuluj</button> </div>
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
              title: updatedTitle,
              due_date: updatedDueDate,
              status: updatedStatus,
              contact_id: updatedContactId,
              company_id: updatedCompanyId
            })
            .eq('id', task.id)
            .eq('user_id', currentUser.id);

          if (updateError) {
            console.error("Error updating task:", updateError.message);
            alert("Błąd podczas aktualizacji zadania: " + updateError.message);
          } else {
            renderTasks(container);
          }
        };
    }
    const cancelBtn = document.getElementById('cancelEditTaskBtnAction');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
          renderTasks(container);
        };
    }
  } catch (err) {
    console.error("Error displaying edit task form:", err.message);
    container.innerHTML = `<p class="error-message">Błąd ładowania formularza edycji: ${err.message}</p>`;
  }
}

export async function renderTasks(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie zadań...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.error("Error fetching user for tasks:", userError.message);
        container.innerHTML = "<p class='error-message'>Błąd pobierania danych użytkownika.</p>";
        return;
    }
    if (!currentUser) {
      console.log("renderTasks: User not logged in.");
      container.innerHTML = "<p class='error-message'>Proszę się zalogować.</p>";
      return;
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`*, contacts (id, first_name, last_name), companies (id, name)`)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error.message);
      container.innerHTML = `<p class="error-message">Błąd ładowania zadań: ${error.message}</p>`;
      return;
    }

    const contactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'Contacts for add select');
    const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for add select');

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
                        <p><span class="label">Powiązany kontakt:</span> ${contactName}</p>
                        <p><span class="label">Powiązana firma:</span> ${companyName}</p>
                    </div>
                    <div class="list-item-actions">
                        <button class="edit-btn" data-id="${t.id}">Edytuj</button>
                    </div>
                </li>`;
      }).join('') + '</ul>';
    } else {
      html += '<p>Nie masz jeszcze żadnych zadań.</p>';
    }

    html += `
      <form id="mainAddTaskForm" class="data-form"> <h3>Dodaj nowe zadanie</h3>
        <div class="form-group">
            <label for="addTaskFormTitleField">Tytuł zadania:</label> <input type="text" id="addTaskFormTitleField" placeholder="Tytuł zadania" required />
        </div>
        <div class="form-group">
            <label for="addTaskFormDueDateField">Termin wykonania:</label> <input type="date" id="addTaskFormDueDateField" />
        </div>
        <div class="form-group">
            <label for="addTaskFormStatusField">Status:</label> <select id="addTaskFormStatusField">
                <option value="todo">Do zrobienia</option>
                <option value="in_progress">W trakcie</option>
                <option value="done">Zrobione</option>
            </select>
        </div>
        <div class="form-group">
            <label for="addTaskFormContactField">Powiąż z kontaktem:</label> <select id="addTaskFormContactField">
                <option value="">Wybierz kontakt...</option>
                ${contactsForSelect.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="addTaskFormCompanyField">Powiąż z firmą:</label> <select id="addTaskFormCompanyField">
                <option value="">Wybierz firmę...</option>
                ${companiesForSelect.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <button type="submit">Dodaj Zadanie</button>
      </form>
    `;
    container.innerHTML = html;

    container.querySelectorAll('.edit-btn').forEach(button => {
      button.onclick = (e) => {
        const taskId = e.target.dataset.id;
        displayEditTaskForm(taskId, container, currentUser);
      };
    });

    const addTaskForm = document.getElementById('mainAddTaskForm');
    if (addTaskForm) {
      addTaskForm.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('addTaskFormTitleField').value;
        const due_date = document.getElementById('addTaskFormDueDateField').value || null;
        const status = document.getElementById('addTaskFormStatusField').value;
        const contact_id = document.getElementById('addTaskFormContactField').value || null;
        const company_id = document.getElementById('addTaskFormCompanyField').value || null;
        const { error: insertError } = await supabase.from('tasks').insert([
          { title, due_date, status, user_id: currentUser.id, contact_id, company_id }
        ]);
        if (insertError) {
          console.error("Error adding task:", insertError.message);
          alert("Błąd podczas dodawania zadania: " + insertError.message);
        } else {
          renderTasks(container);
        }
      };
    }
  } catch (err) {
    console.error("General error in renderTasks:", err.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}.</p>`;
  }
}
