import { supabase } from '../auth/init.js';

export async function renderDeals(container) {
  const user = (await supabase.auth.getUser()).data.user;
  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .eq('user_id', user.id);

  let html = '<h2>Deals</h2><ul>' + deals.map(d => 
    `<li>${d.title} - $${d.value} - ${d.status}</li>`).join('') + '</ul>';

  html += `
    <form id="addDealForm">
      <input type="text" id="dealTitle" placeholder="Title" required />
      <input type="number" id="dealValue" placeholder="Value" />
      <select id="dealStatus">
        <option value="open">Open</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>
      <button type="submit">Add Deal</button>
    </form>
  `;

  container.innerHTML = html;

  document.getElementById('addDealForm').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('dealTitle').value;
    const value = parseFloat(document.getElementById('dealValue').value || 0);
    const status = document.getElementById('dealStatus').value;
    await supabase.from('deals').insert([{ title, value, status, user_id: user.id }]);
    renderDeals(container);
  };
}
