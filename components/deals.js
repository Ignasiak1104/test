// components/deals.js
import { supabaseClient as supabase } from '../auth/init.js';

// Funkcja fetchDataForSelect pozostaje bez zmian
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

// Funkcja displayEditDealForm - zakomentowana, wymaga aktualizacji do nowej struktury etapów
/*
async function displayEditDealForm(dealId, container, currentUser) {
  // ... logika formularza edycji szansy ...
}
*/

async function updateDealStageOnDrop(dealId, newStageId, container, currentUser) {
    console.log(`Próba aktualizacji etapu dla szansy ${dealId} na nowy etap ${newStageId}`);
    try {
        const { error } = await supabase
            .from('deals')
            .update({ current_stage_id: newStageId })
            .eq('id', dealId)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        
        showToast(`Etap szansy zaktualizowany!`);
        await renderDeals(container); // Odśwież tablicę Kanban
    } catch (error) {
        console.error('Błąd aktualizacji etapu szansy po upuszczeniu:', error.message);
        showToast('Błąd aktualizacji etapu szansy: ' + error.message, 'error');
        await renderDeals(container);
    }
}

// Przechowuje ID aktualnie wybranego procesu sprzedaży (na poziomie modułu)
let currentSelectedSalesProcessId = null;

export async function renderDeals(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie szans sprzedaży...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      console.error("renderDeals: Błąd użytkownika lub użytkownik niezalogowany.", userError?.message);
      container.innerHTML = "<p class='error-message'>Proszę się zalogować, aby zobaczyć szanse sprzedaży.</p>";
      return;
    }

    // 1. Pobierz dostępne procesy sprzedaży dla użytkownika
    const { data: salesProcesses, error: processError } = await supabase
        .from('sales_processes')
        .select('id, name, is_default') // Pobieramy tylko potrzebne pola
        .eq('user_id', currentUser.id)
        .order('name', { ascending: true }); // Sortuj alfabetycznie dla lepszej prezentacji

    if (processError) {
        console.error("Błąd pobierania procesów sprzedaży:", processError.message);
        container.innerHTML = `<p class="error-message">Błąd pobierania procesów sprzedaży: ${processError.message}</p>`;
        return;
    }

    console.log("Załadowane procesy sprzedaży:", salesProcesses);

    if (!salesProcesses || salesProcesses.length === 0) {
        container.innerHTML = `<h2>Szanse Sprzedaży (Kanban)</h2>
                             <p class="error-message">Nie zdefiniowano żadnych procesów sprzedaży. 
                             Musisz najpierw skonfigurować przynajmniej jeden proces w ustawieniach.</p>
                             <button id="goToProcessSettingsBtn" class="btn btn-primary mt-4">Przejdź do Ustawień Procesów</button>`;
        
        const goToSettingsBtn = container.querySelector('#goToProcessSettingsBtn');
        if(goToSettingsBtn) {
            goToSettingsBtn.onclick = (e) => {
                e.preventDefault();
                const settingsButton = document.getElementById('settingsSalesProcessesBtn');
                if (settingsButton) {
                    settingsButton.click();
                } else {
                    showToast("Nie można automatycznie przejść do ustawień. Wybierz 'Ustawienia Procesów' z menu.", "info");
                }
            };
        }
        return;
    }
    
    // Ustalanie, który proces powinien być aktywny
    // 1. Sprawdź, czy currentSelectedSalesProcessId jest nadal ważny
    let activeProcess = salesProcesses.find(p => p.id === currentSelectedSalesProcessId);
    
    // 2. Jeśli nie jest ważny (lub nie był ustawiony), spróbuj znaleźć domyślny
    if (!activeProcess) {
        activeProcess = salesProcesses.find(p => p.is_default === true);
    }
    // 3. Jeśli nie ma domyślnego, wybierz pierwszy z listy
    if (!activeProcess) {
        activeProcess = salesProcesses[0];
    }
    currentSelectedSalesProcessId = activeProcess.id; // Uaktualnij globalnie wybrany ID

    console.log("Aktywny proces sprzedaży ID:", currentSelectedSalesProcessId, "Nazwa:", activeProcess.name);

    // 2. Pobierz etapy dla aktywnego procesu sprzedaży
    let stagesForSelectedProcess = [];
    if (currentSelectedSalesProcessId) {
        const { data: stages, error: stagesError } = await supabase
            .from('sales_stages')
            .select('*')
            .eq('process_id', currentSelectedSalesProcessId)
            .eq('user_id', currentUser.id) 
            .order('stage_order', { ascending: true });
        if (stagesError) {
            console.error("Błąd pobierania etapów dla procesu:", stagesError.message);
            showToast(`Błąd pobierania etapów: ${stagesError.message}`, 'error');
        } else {
            stagesForSelectedProcess = stages || [];
        }
    }
    console.log(`Etapy dla procesu "${activeProcess.name}":`, stagesForSelectedProcess);


    // 3. Pobierz szanse sprzedaży (deals) przypisane do aktywnego procesu
    let dealsData = [];
    if (currentSelectedSalesProcessId) {
        const { data: deals, error: dealsFetchError } = await supabase
          .from('deals')
          .select(`*, contacts (id, first_name, last_name), companies (id, name)`)
          .eq('user_id', currentUser.id)
          .eq('sales_process_id', currentSelectedSalesProcessId)
          .order('created_at', { ascending: false });
        if (dealsFetchError) {
            console.error("Błąd pobierania szans sprzedaży:", dealsFetchError.message);
            showToast(`Błąd pobierania szans: ${dealsFetchError.message}`, 'error');
        } else {
            dealsData = deals || [];
        }
    }
    console.log("Szanse sprzedaży dla aktywnego procesu:", dealsData);

    // ----- Budowanie HTML -----
    let html = `<h2>Szanse Sprzedaży (Kanban)</h2>`;

    html += `<div class="form-group mb-6">
               <label for="salesProcessSelector" class="text-base font-semibold text-gray-700 mb-2 block">Aktualny Proces Sprzedaży:</label>
               <select id="salesProcessSelector" class="mt-1 block w-full md:w-2/3 lg:w-1/2 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">`;
    salesProcesses.forEach(process => {
        html += `<option value="${process.id}" ${process.id === currentSelectedSalesProcessId ? 'selected' : ''}>${process.name}</option>`;
    });
    html += `</select></div>`;

    html += '<div id="kanban-board">';
    if (stagesForSelectedProcess.length > 0) {
        stagesForSelectedProcess.forEach(stage => {
            const dealsInStage = dealsData.filter(deal => deal.current_stage_id === stage.id);
            html += `
                <div class="kanban-column noselect" id="column-stage-${stage.id}" data-stage-id="${stage.id}" data-stage-type="${stage.stage_type}">
                    <h3>${stage.name} (${dealsInStage.length})</h3>
                    <div class="kanban-cards-container">
                        ${dealsInStage.map(deal => {
                            const contactName = deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}` : 'Brak';
                            const companyName = deal.companies ? deal.companies.name : 'Brak';
                            return `
                                <div class="kanban-card noselect" draggable="true" data-deal-id="${deal.id}">
                                    <h4>${deal.title}</h4>
                                    <p class="value">Wartość: ${deal.value ? '$' + deal.value.toLocaleString() : 'Brak'}</p>
                                    <p>Kontakt: ${contactName}</p>
                                    <p>Firma: ${companyName}</p>
                                    <div class="kanban-card-actions">
                                        <button class="edit-deal-btn edit-btn" data-deal-id="${deal.id}">Edytuj</button>
                                    </div>
                                </div>`;
                        }).join('') || '<p style="text-align:center; font-size:0.9em; color:#777;">Brak szans w tym etapie.</p>'}
                    </div>
                </div>`;
        });
    } else if (currentSelectedSalesProcessId) {
        html += `<div class="w-full"><p class="error-message">Wybrany proces sprzedaży ("${activeProcess.name}") nie ma zdefiniowanych etapów. Dodaj etapy w ustawieniach.</p></div>`;
    }
    html += '</div>';

    // Formularz dodawania nowej szansy
    const contactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'Contacts for add select');
    const companiesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'Companies for add select');
    
    let initialStagesOptionsHtml = '<option value="" disabled>Najpierw wybierz proces dla szansy</option>';
    if (currentSelectedSalesProcessId) { // Używamy już załadowanych etapów dla aktywnego procesu
        const openStagesForCurrentProcess = stagesForSelectedProcess.filter(s => s.stage_type === 'open');
        initialStagesOptionsHtml = openStagesForCurrentProcess.length > 0 
            ? openStagesForCurrentProcess.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
            : '<option value="" disabled>Brak etapów "open" dla wybranego procesu</option>';
    }

    html += `
      <form id="mainAddDealForm" class="data-form mt-8">
        <h3>Dodaj Nową Szansę Sprzedaży</h3>
        <div class="form-group">
            <label for="addDealProcessSelect">Proces Sprzedaży dla nowej szansy:</label>
            <select id="addDealProcessSelect" required>
                ${salesProcesses.map(p => `<option value="${p.id}" ${p.id === currentSelectedSalesProcessId ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="addDealStageSelect">Początkowy Etap:</label>
            <select id="addDealStageSelect" required>
                ${initialStagesOptionsHtml}
            </select>
        </div>
        <div class="form-group">
            <label for="addDealFormTitleField">Tytuł:</label>
            <input type="text" id="addDealFormTitleField" placeholder="Tytuł szansy" required />
        </div>
        <div class="form-group">
            <label for="addDealFormValueField">Wartość ($):</label>
            <input type="number" id="addDealFormValueField" placeholder="Wartość" step="0.01" />
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

    const salesProcessSelector = document.getElementById('salesProcessSelector');
    if (salesProcessSelector) {
        salesProcessSelector.onchange = async (e) => {
            currentSelectedSalesProcessId = e.target.value; // Aktualizuj globalnie wybrany ID
            console.log("Zmieniono proces sprzedaży na:", currentSelectedSalesProcessId);
            await renderDeals(container); 
        };
    }
    
    const addDealProcessSelect = document.getElementById('addDealProcessSelect');
    const addDealStageSelect = document.getElementById('addDealStageSelect');

    async function populateInitialStagesForAddForm(processId) {
        if (!addDealStageSelect) return;
        addDealStageSelect.innerHTML = '<option value="">Ładowanie etapów...</option>';
        if (processId) {
            const { data: stages, error: stagesErr } = await supabase
                .from('sales_stages')
                .select('id, name, stage_type')
                .eq('process_id', processId)
                .eq('user_id', currentUser.id)
                .eq('stage_type', 'open')
                .order('stage_order', { ascending: true });
            if (stagesErr) {
                console.error("Błąd ładowania etapów dla formularza dodawania:", stagesErr);
                addDealStageSelect.innerHTML = '<option value="" disabled>Błąd ładowania etapów</option>';
            } else {
                addDealStageSelect.innerHTML = stages.length > 0 
                    ? stages.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
                    : '<option value="" disabled>Brak etapów "open" dla tego procesu</option>';
            }
        } else {
             addDealStageSelect.innerHTML = '<option value="" disabled>Najpierw wybierz proces</option>';
        }
    }

    if (addDealProcessSelect) {
        addDealProcessSelect.onchange = async (e) => {
            await populateInitialStagesForAddForm(e.target.value);
        };
        // Jeśli currentSelectedSalesProcessId jest już ustawiony, załaduj etapy dla niego
        if (currentSelectedSalesProcessId) {
            await populateInitialStagesForAddForm(currentSelectedSalesProcessId);
        }
    }

    const cards = container.querySelectorAll('.kanban-card');
    const columns = container.querySelectorAll('.kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', card.dataset.dealId);
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
      column.addEventListener('dragover', (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; });
      column.addEventListener('dragenter', (event) => { event.stopPropagation(); column.classList.add('over'); });
      column.addEventListener('dragleave', (event) => { event.stopPropagation(); if (event.currentTarget.contains(event.relatedTarget)) return; column.classList.remove('over'); });
      column.addEventListener('drop', async (event) => {
        event.preventDefault(); event.stopPropagation(); column.classList.remove('over');
        const dealId = event.dataTransfer.getData('text/plain');
        const newStageId = column.dataset.stageId;
        if (dealId && newStageId) {
          const draggedCard = container.querySelector(`.kanban-card[data-deal-id="${dealId}"]`);
          if (draggedCard) {
            const originalColumn = draggedCard.closest('.kanban-column');
            if (originalColumn && originalColumn.dataset.stageId === newStageId) { return; }
          }
          await updateDealStageOnDrop(dealId, newStageId, container, currentUser);
        } else { console.warn("Nieprawidłowe dealId lub newStageId.", {dealId, newStageId}); }
      });
    });

    container.querySelectorAll('.kanban-card .edit-deal-btn').forEach(button => {
        button.onclick = (e) => {
            e.stopPropagation(); 
            const dealId = e.target.dataset.dealId;
            showToast(`Edycja szansy ${dealId} - aktualizacja formularza edycji jest potrzebna.`, 'info', 4000);
            // displayEditDealForm(dealId, container, currentUser); // Funkcja wymaga aktualizacji
        };
    });

    const addDealForm = document.getElementById('mainAddDealForm');
    if (addDealForm) {
      addDealForm.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('addDealFormTitleField').value;
        const valueInput = document.getElementById('addDealFormValueField').value;
        const value = valueInput ? parseFloat(valueInput) : null;
        
        const processIdForNewDeal = document.getElementById('addDealProcessSelect').value;
        const stageIdForNewDeal = document.getElementById('addDealStageSelect').value;

        if (!processIdForNewDeal || !stageIdForNewDeal) {
            showToast("Proszę wybrać proces sprzedaży i etap początkowy.", "error");
            return;
        }

        const contact_id = document.getElementById('addDealFormContactField').value || null;
        const company_id = document.getElementById('addDealFormCompanyField').value || null;
        
        const { error: insertError } = await supabase.from('deals').insert([{ 
            title, value, user_id: currentUser.id, contact_id, company_id,
            sales_process_id: processIdForNewDeal,
            current_stage_id: stageIdForNewDeal
        }]);

        if (insertError) {
          console.error("Error adding deal:", insertError.message);
          showToast("Błąd podczas dodawania szansy: " + insertError.message, 'error');
        } else {
          showToast("Szansa sprzedaży dodana pomyślnie!");
          await renderDeals(container);
        }
      };
    }
  } catch (err) {
    console.error("General error in renderDeals:", err.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}.</p>`;
    showToast(`Błąd renderowania szans: ${err.message}`, 'error');
  }
}
