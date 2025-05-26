// components/tasks.js
import { supabaseClient as supabase } from '../auth/init.js'; // ZMIANA TUTAJ

export async function renderTasks(container) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
        console.log("renderTasks: User not logged in.");
        container.innerHTML = "<p>Proszę się zalogować, aby zobaczyć zadania.</p>";
        return;
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    let html = '<h2>Zadania</h2>';
    if (tasks && tasks.length > 0) {
        html += '<ul>' + tasks.map(t => 
        `<li>${t.title} - ${t.status} - Termin: ${t.due_date || 'Brak terminu'}</li>`).join('') + '</ul>';
    } else {
        html += '<p>Nie masz jeszcze żadnych zadań.</p>';
    }

    html += `
      <form id="addTaskForm">
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
        <button type="submit">Dodaj Zadanie</button>
      </form>
    `;

    container.innerHTML = html;

    document.getElementById('addTaskForm').onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('taskTitle').value;
      const due_date = document.getElementById('taskDueDate').value || null; // Wyślij null, jeśli data nie jest ustawiona
      const status = document.getElementById('taskStatus').value;
      
      const { error: insertError } = await supabase.from('tasks').insert([{ title, due_date, status, user_id: user.id }]);
      if (insertError) {
        console.error("Error adding task:", insertError.message);
        alert("Błąd podczas dodawania zadania: " + insertError.message);
      } else {
        renderTasks(container);
      }
    };
  } catch (error) {
    console.error("Error rendering tasks:", error.message);
    container.innerHTML = `<p>Wystąpił błąd podczas ładowania zadań: ${error.message}. Spróbuj ponownie później.</p>`;
  }
}
