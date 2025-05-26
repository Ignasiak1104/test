// components/companies.js
import { supabaseClient as supabase } from '../auth/init.js';

// --- Funkcja do wyświetlania formularza edycji firmy ---
async function displayEditCompanyForm(companyId, container, currentUser) {
  container.innerHTML = `<p class="loading-message">Ładowanie danych firmy...</p>`;
  try {
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('user_id', currentUser.id)
      .single();

    if (error || !company) {
      throw error || new Error("Nie znaleziono firmy lub brak uprawnień.");
    }

    let html = `
      <div class="edit-form-container">
        <h3>Edytuj Firmę</h3>
        <form id="editCompanyFormInstance" class="data-form">
          <input type="hidden" id="editCompanyId" value="${company.id}">
          <div class="form-group">
            <label for="editCompanyName">Nazwa firmy:</label>
            <input type="text" id="editCompanyName" value="${company.name}" required />
          </div>
          <div class="form-group">
            <label for="editCompanyIndustry">Branża:</label>
            <input type="text" id="editCompanyIndustry" value="${company.industry || ''}" />
          </div>
          <div class="edit-form-buttons">
            <button type="submit">Zapisz Zmiany</button>
            <button type="button" class="cancel-btn" id="cancelEditCompanyBtn">Anuluj</button>
          </div>
        </form>
      </div>
    `;
    container.innerHTML = html;

    document.getElementById('editCompanyFormInstance').onsubmit = async (e) => {
      e.preventDefault();
      const updatedName = document.getElementById('editCompanyName').value;
      const updatedIndustry = document.getElementById('editCompanyIndustry').value;

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          name: updatedName,
          industry: updatedIndustry
        })
        .eq('id', company.id)
        .eq('user_id', currentUser.id);

      if (updateError) {
        console.error("Error updating company:", updateError.message);
        alert("Błąd podczas aktualizacji firmy: " + updateError.message);
      } else {
        renderCompanies(container);
      }
    };

    document.getElementById('cancelEditCompanyBtn').onclick = () => {
      renderCompanies(container);
    };

  } catch (err) {
    console.error("Error displaying edit company form:", err.message);
    container.innerHTML = `<p class="error-message">Błąd ładowania formularza edycji: ${err.message}</p>`;
  }
}

// --- Główna funkcja renderująca listę firm ---
export async function renderCompanies(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie firm...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!currentUser) {
      console.log("renderCompanies: User not logged in.");
      container.innerHTML = "<p class='error-message'>Proszę się zalogować, aby zobaczyć firmy.</p>";
      return;
    }

    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    let html = '<h2>Firmy</h2>';
    if (companies && companies.length > 0) {
      html += '<ul>' + companies.map(c =>
        `<li class="list-item">
            <div>
                <p><span class="label">Nazwa:</span> ${c.name}</p>
                <p><span class="label">Branża:</span> ${c.industry || 'Brak informacji'}</p>
            </div>
            <div class="list-item-actions">
                <button class="edit-btn" data-id="${c.id}">Edytuj</button>
            </div>
        </li>`).join('') + '</ul>';
    } else {
      html += '<p>Nie masz jeszcze żadnych firm.</p>';
    }

    html += `
      <form id="addCompanyForm" class="data-form">
        <h3>Dodaj nową firmę</h3>
        <div class="form-group">
            <label for="companyFormName">Nazwa firmy:</label>
            <input type="text" id="companyFormName" placeholder="Nazwa firmy" required />
        </div>
        <div class="form-group">
            <label for="companyFormIndustry">Branża:</label>
            <input type="text" id="companyFormIndustry" placeholder="Branża" />
        </div>
        <button type="submit">Dodaj Firmę</button>
      </form>
    `;
    container.innerHTML = html;

    container.querySelectorAll('.edit-btn').forEach(button => {
      button.onclick = (e) => {
        const companyId = e.target.dataset.id;
        displayEditCompanyForm(companyId, container, currentUser);
      };
    });

    const addCompanyForm = document.getElementById('addCompanyForm');
    if (addCompanyForm) {
      addCompanyForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('companyFormName').value;
        const industry = document.getElementById('companyFormIndustry').value;
        const { error: insertError } = await supabase.from('companies').insert([
          { name, industry, user_id: currentUser.id }
        ]);
        if (insertError) {
          console.error("Error adding company:", insertError.message);
          alert("Błąd podczas dodawania firmy: " + insertError.message);
        } else {
          renderCompanies(container);
        }
      };
    }
  } catch (err) {
    console.error("General error in renderCompanies:", err.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}. Spróbuj odświeżyć stronę.</p>`;
  }
}
