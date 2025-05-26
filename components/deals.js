// components/deals.js
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

// --- Funkcja do wyświetlania formularza edycji szansy sprzedaży ---
async function displayEditDealForm(dealId, container, currentUser) {
  container.innerHTML = `<p class="loading-message">Ładowanie danych szansy...</p>`;
  try {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`*, contacts (id), companies (id)`) // Pobieramy ID powiązanych obiektów
      .eq('id', dealId)
      .eq('user_id', currentUser.id)
      .single();

    if (dealError || !deal) {
      throw dealError || new Error("Nie znaleziono szansy lub brak uprawnień.");
    }

    const contactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'Contacts for select');
    const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for select');

    let html = `
      <div class="edit-form-container">
        <h3>Edytuj Szansę Sprzedaży</h3>
        <form id="editDealFormInstance" class="data-form">
          <input type="hidden" id="editDealId" value="${deal.id}">
          <div class="form-group">
            <label for="editDealTitle">Tytuł:</label>
            <input type="text" id="editDealTitle" value="${deal.title}" required />
          </div>
          <div class="form-group">
            <label for="editDealValue">Wartość ($):</label>
            <input type="number" id="editDealValue" value="${deal.value || ''}" step="0.01" />
          </div>
          <div class="form-group">
            <label for="editDealStatus">Status:</label>
            <select id="editDealStatus">
              <option value="open" ${deal.status === 'open' ? 'selected' : ''}>Otwarta</option>
              <option value="won" ${deal.status === 'won' ? 'selected' : ''}>Wygrana</option>
              <option value="lost" ${deal.status === 'lost' ? 'selected' : ''}>Przegrana</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editDealContact">Powiąż z kontaktem:</label>
            <select id="editDealContact">
              <option value="">Wybierz kontakt...</option>
              ${contactsForSelect.map(c => `<option value="${c.id}" ${deal.contact_id === c.id ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="editDealCompany">Powiąż z firmą:</label>
            <select id="editDealCompany">
              <option value="">Wybierz firmę...</option>
              ${companiesForSelect.map(c => `<option value="${c.id}" ${deal.company_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="edit-form-buttons">
            <button type="submit">Zapisz Zmiany</button>
            <button type="button" class="cancel-btn" id="cancelEditDealBtn">Anuluj</button>
          </div>
        </form>
      </div>
    `;
    container.innerHTML = html;

    document.getElementById('editDealFormInstance').onsubmit = async (e) => {
      e.preventDefault();
      const updatedTitle = document.getElementById('editDealTitle').value;
      const updatedValueInput = document.getElementById('editDealValue').value;
      const updatedValue = updatedValueInput ? parseFloat(updatedValueInput) : null;
      const updatedStatus = document.getElementById('editDealStatus').value;
      const updatedContactId = document.getElementById('editDealContact').value || null;
      const updatedCompanyId = document.getElementById('editDealCompany').value || null;

      const { error: updateError } = await supabase
        .from('deals')
        .update({
          title: updatedTitle,
          value: updatedValue,
          status: updatedStatus,
          contact_id: updatedContactId,
          company_id: updatedCompanyId
        })
        .eq('id', deal.id)
        .eq('user_id', currentUser.id);

      if (updateError) {
        console.error("Error updating deal:", updateError.message);
        alert("Błąd podczas aktualizacji szansy: " + updateError.message);
      } else {
        renderDeals(container);
      }
    };

    document.getElementById('cancelEditDealBtn').onclick = () => {
      renderDeals(container);
    };

  } catch (err) {
    console.error("Error displaying edit deal form:", err.message);
    container.innerHTML = `<p class="error-message">Błąd ładowania formularza edycji: ${err.message}</p>`;
  }
}


// --- Główna funkcja renderująca widok Kanban dla szans sprzedaży ---
export async function renderDeals(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie szans sprzedaży...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!currentUser) {
      console.log("renderDeals: User not logged in.");
      container.innerHTML = "<p class='error-message'>Proszę się zalogować, aby zobaczyć szanse sprzedaży.</p>";
      return;
    }

    const { data: dealsData, error } = await supabase
      .from('deals')
      .select(`*, contacts (id, first_name, last_name), companies (id, name)`)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const contactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'Contacts for select');
    const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for select');

    const dealsByStatus = { open: [], won: [], lost: [] };
    (dealsData || []).forEach(deal => {
      if (dealsByStatus[deal.status]) {
        dealsByStatus[deal.status].push(deal);
      } else {
        console.warn(`Unknown deal status: ${deal.status} for deal ID: ${deal.id}`);
        dealsByStatus.open.push(deal);
      }
    });

    let html = '<h2>Szanse Sprzedaży (Kanban)</h2>';
    html += '<div id="kanban-board">';
    const statusLabels = { open: 'Otwarte', won: 'Wygrane', lost: 'Przegrane' };

    for (const status in dealsByStatus) {
      html += `
        <div class="kanban-column" id="column-${status}">
          <h3>${statusLabels[status] || status.toUpperCase()} (${dealsByStatus[status].length})</h3>
          <div class="kanban-cards-container">
            ${dealsByStatus[status].map(deal => {
              const contactName = deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}` : 'Brak';
              const companyName = deal.companies ? deal.companies.name : 'Brak';
              return `
                <div class="kanban-card" data-id="${deal.id}"> <h4>${deal.title}</h4>
                  <p class="value">Wartość: ${deal.value ? '$' + deal.value.toLocaleString() : 'Brak'}</p>
                  <p>Kontakt: ${contactName}</p>
                  <p>Firma: ${companyName}</p>
                  <div class="kanban-card-actions">
                    <button class="edit-btn" data-id="${deal.id}">Edytuj</button>
                  </div>
                </div>`;
            }).join('') || '<p style="text-align:center; font-size:0.9em; color:#777;">Brak szans w tej kolumnie.</p>'}
          </div>
        </div>`;
    }
    html += '</div>';

    html += `
      <form id="addDealForm" class="data-form">
        <h3>Dodaj nową szansę sprzedaży</h3>
        <div class="form-group">
            <label for="dealFormTitle">Tytuł:</label>
            <input type="text" id="dealFormTitle" placeholder="Tytuł szansy" required />
        </div>
        <div class="form-group">
            <label for="dealFormValue">Wartość ($):</label>
            <input type="number" id="dealFormValue" placeholder="Wartość" step="0.01" />
        </div>
        <div class="form-group">
            <label for="dealFormStatus">Status:</label>
            <select id="dealFormStatus">
                <option value="open">Otwarta</option>
                <option value="won">Wygrana</option>
                <option value="lost">Przegrana</option>
            </select>
        </div>
        <div class="form-group">
            <label for="dealFormContact">Powiąż z kontaktem:</label>
            <select id="dealFormContact">
                <option value="">Wybierz kontakt...</option>
                ${contactsForSelect.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="dealFormCompany">Powiąż z firmą:</label>
            <select id="dealFormCompany">
                <option value="">Wybierz firmę...</option>
                ${companiesForSelect.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <button type="submit">Dodaj Szansę</button>
      </form>
    `;
    container.innerHTML = html;

    container.querySelectorAll('.kanban-card .edit-btn').forEach(button => {
        button.onclick = (e) => {
            const dealId = e.target.dataset.id;
            displayEditDealForm(dealId, container, currentUser);
        };
    });

    const addDealForm = document.getElementById('addDealForm');
    if (addDealForm) {
      addDealForm.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('dealFormTitle').value;
        const valueInput = document.getElementById('dealFormValue').value;
        const value = valueInput ? parseFloat(valueInput) : null;
        const status = document.getElementById('dealFormStatus').value;
        const contact_id = document.getElementById('dealFormContact').value || null;
        const company_id = document.getElementById('dealFormCompany').value || null;
        const { error: insertError } = await supabase.from('deals').insert([
          { title, value, status, user_id: currentUser.id, contact_id, company_id }
        ]);
        if (insertError) {
          console.error("Error adding deal:", insertError.message);
          alert("Błąd podczas dodawania szansy: " + insertError.message);
        } else {
          renderDeals(container);
        }
      };
    }
  } catch (err) {
    console.error("General error in renderDeals:", err.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}. Spróbuj odświeżyć stronę.</p>`;
  }
}
