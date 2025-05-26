// components/companies.js
import { supabaseClient as supabase } from '../auth/init.js';

export async function renderCompanies(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie firm...</p>`;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.error("Error fetching user:", userError.message);
        container.innerHTML = "<p class='error-message'>Błąd podczas pobierania danych użytkownika. Spróbuj ponownie później.</p>";
        return;
    }
    if (!user) {
        console.log("renderCompanies: User not logged in.");
        container.innerHTML = "<p class='error-message'>Proszę się zalogować, aby zobaczyć firmy.</p>";
        return;
    }

    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching companies:", error.message);
        container.innerHTML = `<p class="error-message">Wystąpił błąd podczas ładowania firm: ${error.message}</p>`;
        return;
    }

    let html = '<h2>Firmy</h2>';
    if (companies && companies.length > 0) {
        html += '<ul>' + companies.map(c => 
        `<li class="list-item">
            <p><span class="label">Nazwa:</span> ${c.name}</p>
            <p><span class="label">Branża:</span> ${c.industry || 'Brak informacji'}</p>
        </li>`).join('') + '</ul>';
    } else {
        html += '<p>Nie masz jeszcze żadnych firm.</p>';
    }

    html += `
      <form id="addCompanyForm" class="data-form">
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

    const addCompanyForm = document.getElementById('addCompanyForm');
    if (addCompanyForm) {
        addCompanyForm.onsubmit = async (e) => {
          e.preventDefault();
          const name = document.getElementById('companyName').value;
          const industry = document.getElementById('companyIndustry').value;
          
          const { data: { user: currentUser } } = await supabase.auth.getUser();
           if (!currentUser) {
              alert("Sesja wygasła, zaloguj się ponownie.");
              return;
          }

          const { error: insertError } = await supabase.from('companies').insert([
              { name, industry, user_id: currentUser.id }
          ]);

          if (insertError) {
            console.error("Error adding company:", insertError.message);
            alert("Błąd podczas dodawania firmy: " + insertError.message);
          } else {
            renderCompanies(container); // Odśwież listę
          }
        };
    }

  } catch (error) { // Ogólny catch dla błędów w funkcji renderCompanies
    console.error("General error in renderCompanies:", error.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${error.message}. Spróbuj odświeżyć stronę.</p>`;
  }
}
