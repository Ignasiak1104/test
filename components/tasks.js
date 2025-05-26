import { supabase } from '../auth/init.js';

export async function renderTasks(container) {
  const user = (await supabase.auth.getUser()).data.user;
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id);

  let html = '<h2>Tasks</h2><ul>' + tasks.map(t => 
    `<li>${t.title} - ${t.status} - Due: ${t.due_date}</li>`).join('') + '</ul>';

  html += `
    <form id="addTaskForm">
      <input type="text" id="taskTitle" placeholder="Task Title" required />
      <input type="date" id="taskDueDate" />
      <select id="taskStatus">
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
      <button type="submit">Add Task</button>
    </form>
  `;

  container.innerHTML = html;

  document.getElementById('addTaskForm').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value;
    const due_date = document.getElementById('taskDueDate').value;
    const status = document.getElementById('taskStatus').value;
    await supabase.from('tasks').insert([{ title, due_date, status, user_id: user.id }]);
    renderTasks(container);
  };
}
