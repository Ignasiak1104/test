// components/companies.js
import { supabaseClient as supabase } from '../auth/init.js'; // ZMIANA TUTAJ

export async function renderCompanies(container) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
        console.log("renderCompanies: User not logged in.");
        container.innerHTML = "<p>Proszę się zalogować, aby zobaczyć firmy.</p>";
        return;
    }

    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    let html = '<h2>Firmy</h2>';
    if (companies && companies.length > 0) {
        html += '<ul>' + companies.map(c => 
        `<li>${c.name} - ${c.industry || 'Brak branży'}</li>`).join('') + '</ul>';
    } else {
        html += '<p>Nie masz jeszcze żadnych firm.</p>';
    }

    html += `
      <form id="addCompanyForm">
        <h3>Dodaj nową firmę</h3>
        <div class="form-group">
            <label for="companyName">Nazwa firmy:</label>
            <input type="text" id="companyName" placeholder="Nazwa firmy" required />
        </div>
        <div class="form-group">
            <label for="companyIndustry">Branża:</label>
            <input type="text" id="companyIndustry" placeholder="Branża" />
        </div>
        <button type="submit">Dodaj Firmę</button>
      </form>
    `;

    container.innerHTML = html;

    document.getElementById('addCompanyForm').onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('companyName').value;
      const industry = document.getElementById('companyIndustry').value;
      
      const { error: insertError } = await supabase.from('companies').insert([{ name, industry, user_id: user.id }]);
      if (insertError) {
        console.error("Error adding company:", insertError.message);
        alert("Błąd podczas dodawania firmy: " + insertError.message);
      } else {
        renderCompanies(container);
      }
    };
  } catch (error) {
    console.error("Error rendering companies:", error.message);
    container.innerHTML = `<p>Wystąpił błąd podczas ładowania firm: ${error.message}. Spróbuj ponownie później.</p>`;
  }
}
