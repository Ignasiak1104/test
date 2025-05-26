// components/tasks.js
import { supabaseClient as supabase } from '../auth/init.js';

async function fetchDataForSelect(userId, fromTable, selectFields, errorMsgPrefix) {
    const { data, error } = await supabase
        .from(fromTable)
        .select(selectFields)
        .eq('user_id', userId);
    if (error) {
        console.error(`${errorMsgPrefix} error:`, error.message);
        return []; // Zwróć pustą tablicę w przypadku błędu
    }
    return data || [];
}

export async function renderTasks(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie zadań...</p>`;
  try {
    const { data: { user } , error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
        console.log("renderTasks: User not logged in.");
        container.innerHTML = "<p class='error-message'>Proszę się zalogować, aby zobaczyć zadania.</p>";
        return;
    }

    // Pobieranie zadań wraz z powiązanymi danymi kontaktów i firm
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        contacts (id, first_name, last_name),
        companies (id, name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Pobieranie kontaktów i firm do selectów w formularzu
    const contactsForSelect = await fetchDataForSelect(user.id, 'contacts', 'id, first_name, last_name', 'Contacts for select');
    const companiesForSelect = await fetchDataForSelect(user.id, 'companies', 'id, name', 'Companies for select');

    let html = '<h2>Zadania</h2>';
    if (tasks && tasks.length > 0) {
        html += '<ul>' + tasks.map(t => {
            const contactName = t.contacts ? `${t.contacts.first_name} ${t.contacts.last_name}` : 'Brak';
            const companyName = t.companies ? t.companies.name : 'Brak';
            return `<li class="list-item">
                        <p><span class="label">Tytuł:</span> ${t.title}</p>
                        <p><span class="label">Status:</span> ${t.status}</p>
                        <p><span class="label">Termin:</span> ${t.due_date || 'Brak terminu'}</p>
                        <p><span class="label">Powiązany kontakt:</span> ${contactName}</p>
                        <p><span class="label">Powiązana firma:</span> ${companyName}</p>
                    </li>`;
        }).join('') + '</ul>';
    } else {
        html += '<p>Nie masz jeszcze żadnych zadań.</p>';
    }

    html += `
      <form id="addTaskForm" class="data-form">
        <h3>Dodaj nowe zadanie</h3>
        <div class="form-group">
            <label for="taskTitle">Tytuł zadania:</label>
            <input type="text" id="taskTitle" placeholder="Tytuł zadania" required />
        </div>
        <div class="form-group">
            <label for="taskDueDate">Termin wykonania:</label>
            <input type="date" id="taskDueDate" />
        </div>
        <div class="form-group">
            <label for="taskStatus">Status:</label>
            <select id="taskStatus">
                <option value="todo">Do zrobienia</option>
                <option value="in_progress">W trakcie</option>
                <option value="done">Zrobione</option>
            </select>
        </div>
        <div class="form-group">
            <label for="taskContact">Powiąż z kontaktem:</label>
            <select id="taskContact">
                <option value="">Wybierz kontakt...</option>
                ${contactsForSelect.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="taskCompany">Powiąż z firmą:</label>
            <select id="taskCompany">
                <option value="">Wybierz firmę...</option>
                ${companiesForSelect.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <button type="submit">Dodaj Zadanie</button>
      </form>
    `;

    container.innerHTML = html;

    document.getElementById('addTaskForm').onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('taskTitle').value;
      const due_date = document.getElementById('taskDueDate').value || null;
      const status = document.getElementById('taskStatus').value;
      const contact_id = document.getElementById('taskContact').value || null;
      const company_id = document.getElementById('taskCompany').value || null;
      
      const { error: insertError } = await supabase.from('tasks').insert([
          { title, due_date, status, user_id: user.id, contact_id, company_id }
      ]);

      if (insertError) {
        console.error("Error adding task:", insertError.message);
        alert("Błąd podczas dodawania zadania: " + insertError.message);
      } else {
        renderTasks(container); // Odśwież listę
      }
    };
  } catch (error) {
    console.error("Error rendering tasks:", error.message);
    container.innerHTML = `<p class="error-message">Wystąpił błąd podczas ładowania zadań: ${error.message}. Spróbuj ponownie później.</p>`;
  }
}
