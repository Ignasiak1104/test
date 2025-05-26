import { supabase } from '../auth/init.js';

export async function renderCompanies(container) {
  const user = (await supabase.auth.getUser()).data.user;
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user.id);

  let html = '<h2>Companies</h2><ul>' + companies.map(c => 
    `<li>${c.name} - ${c.industry || ''}</li>`).join('') + '</ul>';

  html += `
    <form id="addCompanyForm">
      <input type="text" id="companyName" placeholder="Company Name" required />
      <input type="text" id="companyIndustry" placeholder="Industry" />
      <button type="submit">Add Company</button>
    </form>
  `;

  container.innerHTML = html;

  document.getElementById('addCompanyForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('companyName').value;
    const industry = document.getElementById('companyIndustry').value;
    await supabase.from('companies').insert([{ name, industry, user_id: user.id }]);
    renderCompanies(container);
  };
}
