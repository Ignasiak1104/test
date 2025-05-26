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

async function displayEditDealForm(dealId, container, currentUser) {
  container.innerHTML = `<p class="loading-message">Ładowanie danych szansy...</p>`;
  try {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`*, contacts (id), companies (id)`)
      .eq('id', dealId)
      .eq('user_id', currentUser.id)
      .single();

    if (dealError || !deal) {
      throw dealError || new Error("Nie znaleziono szansy lub brak uprawnień.");
    }

    const contactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'Contacts for edit select');
    const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for edit select');

    let html = `
      <div class="edit-form-container">
        <h3>Edytuj Szansę Sprzedaży</h3>
        <form id="specificEditDealForm" class="data-form">
          <input type="hidden" id="editDealFormIdField" value="${deal.id}">
          <div class="form-group">
            <label for="editDealFormTitleField">Tytuł:</label>
            <input type="text" id="editDealFormTitleField" value="${deal.title}" required />
          </div>
          <div class="form-group">
            <label for="editDealFormValueField">Wartość ($):</label>
            <input type="number" id="editDealFormValueField" value="${deal.value || ''}" step="0.01" />
          </div>
          <div class="form-group">
            <label for="editDealFormStatusField">Status:</label>
            <select id="editDealFormStatusField">
              <option value="open" ${deal.status === 'open' ? 'selected' : ''}>Otwarta</option>
              <option value="won" ${deal.status === 'won' ? 'selected' : ''}>Wygrana</option>
              <option value="lost" ${deal.status === 'lost' ? 'selected' : ''}>Przegrana</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editDealFormContactField">Powiąż z kontaktem:</label>
            <select id="editDealFormContactField">
              <option value="">Wybierz kontakt...</option>
              ${contactsForSelect.map(c => `<option value="${c.id}" ${deal.contact_id === c.id ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="editDealFormCompanyField">Powiąż z firmą:</label>
            <select id="editDealFormCompanyField">
              <option value="">Wybierz firmę...</option>
              ${companiesForSelect.map(c => `<option value="${c.id}" ${deal.company_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="edit-form-buttons">
            <button type="submit" class="btn btn-primary">Zapisz Zmiany</button>
            <button type="button" class="btn btn-secondary cancel-btn" id="cancelEditDealBtnAction">Anuluj</button>
          </div>
        </form>
      </div>
    `;
    container.innerHTML = html;

    const editForm = document.getElementById('specificEditDealForm');
    if (editForm) {
        editForm.onsubmit = async (e) => {
          e.preventDefault();
          const updatedTitle = document.getElementById('editDealFormTitleField').value;
          const updatedValueInput = document.getElementById('editDealFormValueField').value;
          const updatedValue = updatedValueInput ? parseFloat(updatedValueInput) : null;
          const updatedStatus = document.getElementById('editDealFormStatusField').value;
          const updatedContactId = document.getElementById('editDealFormContactField').value || null;
          const updatedCompanyId = document.getElementById('editDealFormCompanyField').value || null;

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
    }
    const cancelBtn = document.getElementById('cancelEditDealBtnAction');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
          renderDeals(container);
        };
    }
  } catch (err) {
    console.error("Error displaying edit deal form:", err.message);
    container.innerHTML = `<p class="error-message">Błąd ładowania formularza edycji: ${err.message}</p>`;
  }
}

async function updateDealStatusOnDrop(dealId, newStatus, container, currentUser) {
    console.log(`Attempting to update deal ${dealId} to status ${newStatus}`);
    try {
        const { error } = await supabase
            .from('deals')
            .update({ status: newStatus })
            .eq('id', dealId)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        
        console.log(`Deal ${dealId} status successfully updated to ${newStatus}`);
        renderDeals(container);
    } catch (error) {
        console.error('Error updating deal status on drop:', error.message);
        alert('Błąd podczas aktualizacji statusu szansy: ' + error.message);
        renderDeals(container);
    }
}

export async function renderDeals(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie szans sprzedaży...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.error("Error fetching user for deals:", userError.message);
        container.innerHTML = "<p class='error-message'>Błąd pobierania danych użytkownika.</p>";
        return;
    }
    if (!currentUser) {
      console.log("renderDeals: User not logged in.");
      container.innerHTML = "<p class='error-message'>Proszę się zalogować.</p>";
      return;
    }

    const { data: dealsData, error } = await supabase
      .from('deals')
      .select(`*, contacts (id, first_name, last_name), companies (id, name)`)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching deals:", error.message);
        container.innerHTML = `<p class="error-message">Błąd ładowania szans sprzedaży: ${error.message}</p>`;
        return;
    }

    const contactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'Contacts for add select');
    const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for add select');

    const dealsByStatus = { open: [], won: [], lost: [] };
    (dealsData || []).forEach(deal => {
      if (dealsByStatus[deal.status]) {
        dealsByStatus[deal.status].push(deal);
      } else {
        console.warn(`Unknown deal status: ${deal.status} for deal ID: ${deal.id}. Assigning to 'open'.`);
        dealsByStatus.open.push(deal);
      }
    });

    let html = '<h2>Szanse Sprzedaży (Kanban)</h2>';
    html += '<div id="kanban-board">';
    const statusLabels = { open: 'Otwarte', won: 'Wygrane', lost: 'Przegrane' };

    for (const statusKey in dealsByStatus) {
      html += `
        <div class="kanban-column noselect" id="column-${statusKey}" data-status="${statusKey}">
          <h3>${statusLabels[statusKey] || statusKey.toUpperCase()} (${dealsByStatus[statusKey].length})</h3>
          <div class="kanban-cards-container">
            ${dealsByStatus[statusKey].map(deal => {
              const contactName = deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}` : 'Brak';
              const companyName = deal.companies ? deal.companies.name : 'Brak';
              return `
                <div class="kanban-card noselect" draggable="true" data-id="${deal.id}">
                  <h4>${deal.title}</h4>
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
      <form id="mainAddDealForm" class="data-form">
        <h3>Dodaj nową szansę sprzedaży</h3>
        <div class="form-group">
            <label for="addDealFormTitleField">Tytuł:</label>
            <input type="text" id="addDealFormTitleField" placeholder="Tytuł szansy" required />
        </div>
        <div class="form-group">
            <label for="addDealFormValueField">Wartość ($):</label>
            <input type="number" id="addDealFormValueField" placeholder="Wartość" step="0.01" />
        </div>
        <div class="form-group">
            <label for="addDealFormStatusField">Status:</label>
            <select id="addDealFormStatusField">
                <option value="open">Otwarta</option>
                <option value="won">Wygrana</option>
                <option value="lost">Przegrana</option>
            </select>
        </div>
        <div class="form-group">
            <label for="addDealFormContactField">Powiąż z kontaktem:</label>
            <select id="addDealFormContactField">
                <option value="">Wybierz kontakt...</option>
                ${contactsForSelect.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="addDealFormCompanyField">Powiąż z firmą:</label>
            <select id="addDealFormCompanyField">
                <option value="">Wybierz firmę...</option>
                ${companiesForSelect.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <button type="submit" class="btn btn-success">Dodaj Szansę</button>
      </form>
    `;
    container.innerHTML = html;

    const cards = container.querySelectorAll('.kanban-card');
    const columns = container.querySelectorAll('.kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', card.dataset.id);
        event.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
        document.body.classList.add('dragging-active');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.body.classList.remove('dragging-active');
        columns.forEach(col => col.classList.remove('over'));
      });
    });

    columns.forEach(column => {
      column.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      });

      column.addEventListener('dragenter', (event) => {
        event.stopPropagation();
        column.classList.add('over');
      });

      column.addEventListener('dragleave', (event) => {
        event.stopPropagation();
        if (event.currentTarget.contains(event.relatedTarget)) return;
        column.classList.remove('over');
      });

      column.addEventListener('drop', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        column.classList.remove('over');

        const dealId = event.dataTransfer.getData('text/plain');
        const newStatus = column.dataset.status;

        if (dealId && newStatus && ['open', 'won', 'lost'].includes(newStatus)) {
          const draggedCard = container.querySelector(`.kanban-card[data-id="${dealId}"]`);
          if (draggedCard) {
            const originalColumn = draggedCard.closest('.kanban-column');
            if (originalColumn && originalColumn.dataset.status === newStatus) {
              console.log("Szansa upuszczona w tej samej kolumnie. Bez aktualizacji.");
              return;
            }
          }
          await updateDealStatusOnDrop(dealId, newStatus, container, currentUser);
        } else {
          console.warn("Nieprawidłowe dealId lub nowy status dla operacji upuszczenia.", {dealId, newStatus});
        }
      });
    });

    container.querySelectorAll('.kanban-card .edit-btn').forEach(button => {
        button.onclick = (e) => {
            e.stopPropagation(); 
            const dealId = e.target.dataset.id;
            displayEditDealForm(dealId, container, currentUser);
        };
    });

    const addDealForm = document.getElementById('mainAddDealForm');
    if (addDealForm) {
      addDealForm.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('addDealFormTitleField').value;
        const valueInput = document.getElementById('addDealFormValueField').value;
        const value = valueInput ? parseFloat(valueInput) : null;
        const status = document.getElementById('addDealFormStatusField').value;
        const contact_id = document.getElementById('addDealFormContactField').value || null;
        const company_id = document.getElementById('addDealFormCompanyField').value || null;
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
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}.</p>`;
  }
}
