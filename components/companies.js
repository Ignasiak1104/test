// components/companies.js
import { supabaseClient as supabase } from '../auth/init.js';

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
        <form id="specificEditCompanyForm" class="data-form">
          <input type="hidden" id="editCompanyFormIdField" value="${company.id}">
          <div class="form-group">
            <label for="editCompanyFormNameField">Nazwa firmy:</label>
            <input type="text" id="editCompanyFormNameField" value="${company.name}" required />
          </div>
          <div class="form-group">
            <label for="editCompanyFormIndustryField">Branża:</label>
            <input type="text" id="editCompanyFormIndustryField" value="${company.industry || ''}" />
          </div>
          <div class="edit-form-buttons">
            <button type="submit" class="btn btn-primary">Zapisz Zmiany</button>
            <button type="button" class="btn btn-secondary cancel-btn" id="cancelEditCompanyBtnAction">Anuluj</button>
          </div>
        </form>
      </div>
    `;
    container.innerHTML = html;

    const editForm = document.getElementById('specificEditCompanyForm');
    if (editForm) {
        editForm.onsubmit = async (e) => {
          e.preventDefault();
          const updatedName = document.getElementById('editCompanyFormNameField').value;
          const updatedIndustry = document.getElementById('editCompanyFormIndustryField').value;

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
            showToast("Błąd podczas aktualizacji firmy: " + updateError.message, 'error');
          } else {
            showToast("Firma zaktualizowana pomyślnie!");
            renderCompanies(container);
          }
        };
    }
    const cancelBtn = document.getElementById('cancelEditCompanyBtnAction');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
          renderCompanies(container);
        };
    }
  } catch (err) {
    console.error("Error displaying edit company form:", err.message);
    container.innerHTML = `<p class="error-message">Błąd ładowania formularza edycji: ${err.message}</p>`;
    showToast(`Błąd ładowania formularza edycji: ${err.message}`, 'error');
  }
}

export async function renderCompanies(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie firm...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.error("Error fetching user for companies:", userError.message);
        container.innerHTML = "<p class='error-message'>Błąd pobierania danych użytkownika.</p>";
        return;
    }
    if (!currentUser) {
      console.log("renderCompanies: User not logged in.");
      container.innerHTML = "<p class='error-message'>Proszę się zalogować.</p>";
      return;
    }

    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching companies:", error.message);
      container.innerHTML = `<p class="error-message">Błąd ładowania firm: ${error.message}</p>`;
      return;
    }

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
      <form id="mainAddCompanyForm" class="data-form">
        <h3>Dodaj nową firmę</h3>
        <div class="form-group">
            <label for="addCompanyFormNameField">Nazwa firmy:</label>
            <input type="text" id="addCompanyFormNameField" placeholder="Nazwa firmy" required />
        </div>
        <div class="form-group">
            <label for="addCompanyFormIndustryField">Branża:</label>
            <input type="text" id="addCompanyFormIndustryField" placeholder="Branża" />
        </div>
        <button type="submit" class="btn btn-success">Dodaj Firmę</button>
      </form>
    `;
    container.innerHTML = html;

    container.querySelectorAll('.edit-btn').forEach(button => {
      button.onclick = (e) => {
        const companyId = e.target.dataset.id;
        displayEditCompanyForm(companyId, container, currentUser);
      };
    });

    const addCompanyForm = document.getElementById('mainAddCompanyForm');
    if (addCompanyForm) {
      addCompanyForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('addCompanyFormNameField').value;
        const industry = document.getElementById('addCompanyFormIndustryField').value;
        const { error: insertError } = await supabase.from('companies').insert([
          { name, industry, user_id: currentUser.id }
        ]);
        if (insertError) {
          console.error("Error adding company:", insertError.message);
          showToast("Błąd podczas dodawania firmy: " + insertError.message, 'error');
        } else {
          showToast("Firma dodana pomyślnie!");
          renderCompanies(container);
        }
      };
    }
  } catch (err) {
    console.error("General error in renderCompanies:", err.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}.</p>`;
  }
}
