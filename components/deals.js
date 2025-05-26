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

export async function renderDeals(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie szans sprzedaży...</p>`;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
        console.log("renderDeals: User not logged in.");
        container.innerHTML = "<p class='error-message'>Proszę się zalogować, aby zobaczyć szanse sprzedaży.</p>";
        return;
    }

    const { data: dealsData, error } = await supabase
      .from('deals')
      .select(`
        *,
        contacts (id, first_name, last_name),
        companies (id, name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const contactsForSelect = await fetchDataForSelect(user.id, 'contacts', 'id, first_name, last_name', 'Contacts for select');
    const companiesForSelect = await fetchDataForSelect(user.id, 'companies', 'id, name', 'Companies for select');

    // Przygotowanie danych dla Kanban
    const dealsByStatus = {
      open: [],
      won: [],
      lost: []
    };

    (dealsData || []).forEach(deal => {
      if (dealsByStatus[deal.status]) {
        dealsByStatus[deal.status].push(deal);
      } else {
        // Jeśli pojawi się nieznany status, można go np. dodać do 'open' lub zalogować błąd
        console.warn(`Unknown deal status: ${deal.status} for deal ID: ${deal.id}`);
        dealsByStatus.open.push(deal); 
      }
    });

    let html = '<h2>Szanse Sprzedaży (Kanban)</h2>';
    html += '<div id="kanban-board">';

    const statusLabels = {
        open: 'Otwarte',
        won: 'Wygrane',
        lost: 'Przegrane'
    };

    for (const status in dealsByStatus) {
      html += `
        <div class="kanban-column" id="column-${status}">
          <h3>${statusLabels[status] || status.toUpperCase()} (${dealsByStatus[status].length})</h3>
          ${dealsByStatus[status].map(deal => {
            const contactName = deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}` : 'Brak';
            const companyName = deal.companies ? deal.companies.name : 'Brak';
            return `
              <div class="kanban-card" draggable="true" data-id="${deal.id}">
                <h4>${deal.title}</h4>
                <p class="value">Wartość: ${deal.value ? '$' + deal.value.toLocaleString() : 'Brak'}</p>
                <p>Kontakt: ${contactName}</p>
                <p>Firma: ${companyName}</p>
              </div>`;
          }).join('')}
        </div>`;
    }
    html += '</div>'; // Zamknięcie kanban-board

    // Formularz dodawania nowej szansy
    html += `
      <form id="addDealForm" class="data-form">
        <h3>Dodaj nową szansę sprzedaży</h3>
        <div class="form-group">
            <label for="dealTitle">Tytuł:</label>
            <input type="text" id="dealTitle" placeholder="Tytuł szansy" required />
        </div>
        <div class="form-group">
            <label for="dealValue">Wartość ($):</label>
            <input type="number" id="dealValue" placeholder="Wartość" step="0.01" />
        </div>
        <div class="form-group">
            <label for="dealStatus">Status:</label>
            <select id="dealStatus">
                <option value="open">Otwarta</option>
                <option value="won">Wygrana</option>
                <option value="lost">Przegrana</option>
            </select>
        </div>
        <div class="form-group">
            <label for="dealContact">Powiąż z kontaktem:</label>
            <select id="dealContact">
                <option value="">Wybierz kontakt...</option>
                ${contactsForSelect.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="dealCompany">Powiąż z firmą:</label>
            <select id="dealCompany">
                <option value="">Wybierz firmę...</option>
                ${companiesForSelect.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <button type="submit">Dodaj Szansę</button>
      </form>
    `;

    container.innerHTML = html;

    // UWAGA: Implementacja drag & drop dla Kanban nie jest tutaj dodana,
    // to znacznie zwiększyłoby złożoność. Na razie jest to tylko widok.

    document.getElementById('addDealForm').onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('dealTitle').value;
      const valueInput = document.getElementById('dealValue').value;
      const value = valueInput ? parseFloat(valueInput) : null;
      const status = document.getElementById('dealStatus').value;
      const contact_id = document.getElementById('dealContact').value || null;
      const company_id = document.getElementById('dealCompany').value || null;

      const { error: insertError } = await supabase.from('deals').insert([
          { title, value, status, user_id: user.id, contact_id, company_id }
      ]);

      if (insertError) {
        console.error("Error adding deal:", insertError.message);
        alert("Błąd podczas dodawania szansy: " + insertError.message);
      } else {
        renderDeals(container); // Odśwież widok Kanban
      }
    };
  } catch (error) {
    console.error("Error rendering deals:", error.message);
    container.innerHTML = `<p class="error-message">Wystąpił błąd podczas ładowania szans sprzedaży: ${error.message}. Spróbuj ponownie później.</p>`;
  }
}
