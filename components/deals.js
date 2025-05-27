// components/deals.js
import { supabaseClient as supabase } from '../auth/init.js';

// Funkcja pomocnicza
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

// Funkcja edycji szansy (zakładamy, że jest kompletna z poprzednich wersji)
async function displayEditDealForm(dealId, container, currentUser, onSaveCallback) {
  container.innerHTML = `<p class="loading-message">Ładowanie danych szansy do edycji...</p>`;
  try {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`*, sales_process_id, current_stage_id, contacts (id), companies (id)`)
      .eq('id', dealId)
      .eq('user_id', currentUser.id)
      .single();

    if (dealError || !deal) {
      throw dealError || new Error("Nie znaleziono szansy lub brak uprawnień.");
    }

    let stagesForCurrentProcess = [];
    if (deal.sales_process_id) {
        const {data: stages, error: stagesFetchError} = await supabase
            .from('sales_stages')
            .select('id, name, stage_type')
            .eq('process_id', deal.sales_process_id)
            .eq('user_id', currentUser.id)
            .order('stage_order', {ascending: true});
        if (stagesFetchError) console.error("Błąd pobierania etapów dla edycji szansy:", stagesFetchError);
        else stagesForCurrentProcess = stages || [];
    }

    const allContactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'All Contacts for edit deal');
    const allCompaniesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'All Companies for edit deal');

    const {data: currentProcessInfo, error: pError} = await supabase.from('sales_processes').select('name').eq('id', deal.sales_process_id).single();
    const currentProcessName = pError || !currentProcessInfo ? "Nieznany Proces" : currentProcessInfo.name;

    let html = `
      <div class="edit-form-container">
        <h3>Edytuj Szansę Sprzedaży (w procesie: ${currentProcessName})</h3>
        <form id="specificEditDealForm" class="data-form">
          <input type="hidden" id="editDealFormIdField" value="${deal.id}">
          <div class="form-group"> <label for="editDealFormTitleField">Tytuł:</label> <input type="text" id="editDealFormTitleField" value="${deal.title}" required /> </div>
          <div class="form-group"> <label for="editDealFormValueField">Wartość ($):</label> <input type="number" id="editDealFormValueField" value="${deal.value || ''}" step="0.01" /> </div>
          <div class="form-group"> <label for="editDealFormStageField">Aktualny Etap:</label> <select id="editDealFormStageField" required>
              ${stagesForCurrentProcess.map(s => `<option value="${s.id}" ${deal.current_stage_id === s.id ? 'selected' : ''}>${s.name} (${s.stage_type})</option>`).join('')}
              ${stagesForCurrentProcess.length === 0 ? '<option value="" disabled>Brak etapów dla tego procesu</option>' : ''} </select> </div>
          <div class="form-group"> <label for="editDealFormContactField">Kontakt:</label> <select id="editDealFormContactField"> <option value="">Wybierz...</option>
              ${allContactsForSelect.map(c => `<option value="${c.id}" ${deal.contact_id === c.id ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`).join('')} </select> </div>
          <div class="form-group"> <label for="editDealFormCompanyField">Firma:</label> <select id="editDealFormCompanyField"> <option value="">Wybierz...</option>
              ${allCompaniesForSelect.map(c => `<option value="${c.id}" ${deal.company_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')} </select> </div>
          <div class="edit-form-buttons">
            <button type="submit" class="btn btn-primary">Zapisz Zmiany</button>
            <button type="button" class="btn btn-secondary cancel-btn" id="cancelEditDealBtnAction">Anuluj</button>
          </div>
        </form>
      </div>`;
    container.innerHTML = html;

    document.getElementById('specificEditDealForm').onsubmit = async (e) => {
      e.preventDefault();
      const updates = {
        title: document.getElementById('editDealFormTitleField').value,
        value: parseFloat(document.getElementById('editDealFormValueField').value) || null,
        current_stage_id: document.getElementById('editDealFormStageField').value,
        contact_id: document.getElementById('editDealFormContactField').value || null,
        company_id: document.getElementById('editDealFormCompanyField').value || null,
      };
      if (!updates.current_stage_id) { showToast("Proszę wybrać etap.", "error"); return; }
      const { error: updateError } = await supabase.from('deals').update(updates).eq('id', deal.id).eq('user_id', currentUser.id);
      if (updateError) showToast("Błąd aktualizacji szansy: " + updateError.message, 'error');
      else {
        showToast("Szansa zaktualizowana!");
        if (onSaveCallback) onSaveCallback(); else renderDeals(container.closest('#content-area') || container);
      }
    };
    document.getElementById('cancelEditDealBtnAction').onclick = () => {
        if (onSaveCallback) onSaveCallback(); else renderDeals(container.closest('#content-area') || container);
    };
  } catch (err) { 
      console.error("Error displaying edit deal form:", err.message);
      showToast(`Błąd formularza edycji szansy: ${err.message}`, 'error'); 
      if (onSaveCallback) onSaveCallback(); else renderDeals(container.closest('#content-area') || container);
    }
}


// ***** UPEWNIJ SIĘ, ŻE TA LINIA ZAWIERA 'export' *****
export async function displayAddDealForm(formContainer, currentUser, preselectedContactId = null, preselectedCompanyId = null, onSaveCallback) {
    formContainer.innerHTML = `<p class="loading-message">Ładowanie formularza dodawania szansy...</p>`;
    try {
        const {data: salesProcesses, error: spError} = await supabase.from('sales_processes').select('id, name, is_default').eq('user_id', currentUser.id).order('name');
        if(spError) throw spError;

        const allContacts = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'All Contacts');
        const allCompanies = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'All Companies');

        let defaultProcessForAdd = (salesProcesses || []).find(p => p.is_default) || ((salesProcesses || []).length > 0 ? salesProcesses[0] : null);
        let defaultProcessId = defaultProcessForAdd ? defaultProcessForAdd.id : null;
        
        let initialStagesOptionsHtml = '<option value="" disabled>Najpierw wybierz proces</option>';

        async function populateStages(processId) {
            if (!processId) return '<option value="" disabled>Wybierz proces</option>';
            const { data: stages } = await supabase.from('sales_stages').select('id, name')
                .eq('process_id', processId).eq('user_id', currentUser.id).eq('stage_type', 'open').order('stage_order');
            return (stages && stages.length > 0)
                ? stages.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
                : '<option value="" disabled>Brak etapów "open"</option>';
        }

        if (defaultProcessId) {
            initialStagesOptionsHtml = await populateStages(defaultProcessId);
        }
        
        let html = `
          <form id="modularAddDealForm" class="data-form">
            <h3>Dodaj Nową Szansę Sprzedaży</h3>
            <div class="form-group">
                <label for="modularAddDealProcessSelect">Proces Sprzedaży:</label>
                <select id="modularAddDealProcessSelect" required>
                    <option value="">Wybierz proces...</option>
                    ${(salesProcesses || []).map(p => `<option value="${p.id}" ${p.id === defaultProcessId ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="modularAddDealStageSelect">Początkowy Etap ('open'):</label>
                <select id="modularAddDealStageSelect" required>${initialStagesOptionsHtml}</select>
            </div>
            <div class="form-group"> <label for="modularAddDealTitle">Tytuł:</label> <input type="text" id="modularAddDealTitle" required /> </div>
            <div class="form-group"> <label for="modularAddDealValue">Wartość ($):</label> <input type="number" id="modularAddDealValue" step="0.01" /> </div>
            <div class="form-group"> <label for="modularAddDealContact">Kontakt:</label> <select id="modularAddDealContact" ${preselectedContactId ? 'disabled' : ''}> <option value="">Wybierz...</option>
                ${allContacts.map(c => `<option value="${c.id}" ${preselectedContactId === c.id ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`).join('')} </select> </div>
            <div class="form-group"> <label for="modularAddDealCompany">Firma:</label> <select id="modularAddDealCompany" ${preselectedCompanyId ? 'disabled' : ''}> <option value="">Wybierz...</option>
                ${allCompanies.map(c => `<option value="${c.id}" ${preselectedCompanyId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')} </select> </div>
            <div class="edit-form-buttons">
                <button type="submit" class="btn btn-success">Dodaj Szansę</button>
                <button type="button" class="btn btn-secondary" id="cancelModularAddDealBtn">Anuluj</button>
            </div>
          </form>
        `;
        formContainer.innerHTML = html;

        if (preselectedContactId) document.getElementById('modularAddDealContact').value = preselectedContactId;
        if (preselectedCompanyId) document.getElementById('modularAddDealCompany').value = preselectedCompanyId;

        const processSelect = document.getElementById('modularAddDealProcessSelect');
        const stageSelect = document.getElementById('modularAddDealStageSelect');
        if (processSelect) {
            processSelect.onchange = async () => {
                stageSelect.innerHTML = await populateStages(processSelect.value);
            };
        }

        document.getElementById('modularAddDealForm').onsubmit = async (e) => {
            e.preventDefault();
            const dealData = {
                title: document.getElementById('modularAddDealTitle').value,
                value: parseFloat(document.getElementById('modularAddDealValue').value) || null,
                sales_process_id: processSelect.value,
                current_stage_id: stageSelect.value,
                contact_id: preselectedContactId || document.getElementById('modularAddDealContact').value || null,
                company_id: preselectedCompanyId || document.getElementById('modularAddDealCompany').value || null,
                user_id: currentUser.id
            };
            if (!dealData.sales_process_id || !dealData.current_stage_id) {
                showToast("Proszę wybrać proces i etap.", "error"); return;
            }
            const { error } = await supabase.from('deals').insert(dealData);
            if (error) showToast("Błąd dodawania szansy: " + error.message, 'error');
            else {
                showToast("Szansa dodana!");
                formContainer.innerHTML = '';
                if (onSaveCallback) onSaveCallback();
                else renderDeals(formContainer.closest('#content-area') || formContainer);
            }
        };
        document.getElementById('cancelModularAddDealBtn').onclick = () => {
            formContainer.innerHTML = '';
             if (onSaveCallback) onSaveCallback();
        };

    } catch (error) {
        console.error("Błąd wyświetlania formularza dodawania szansy:", error.message);
        formContainer.innerHTML = `<p class="error-message">Błąd ładowania formularza: ${error.message}</p>`;
    }
}


async function updateDealStageOnDrop(dealId, newStageId, container, currentUser) {
    console.log(`Attempting to update deal ${dealId} to stage ${newStageId}`);
    try {
        const { error } = await supabase
            .from('deals')
            .update({ current_stage_id: newStageId })
            .eq('id', dealId)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        
        showToast(`Etap szansy zaktualizowany!`);
        await renderDeals(container);
    } catch (error) {
        console.error('Error updating deal stage on drop:', error.message);
        showToast('Błąd aktualizacji etapu szansy: ' + error.message, 'error');
        await renderDeals(container);
    }
}

let currentSelectedSalesProcessId = null;
console.log('deals.js: Inicjalizacja currentSelectedSalesProcessId na poziomie modułu:', currentSelectedSalesProcessId);


export async function renderDeals(container) {
  console.log('renderDeals: Rozpoczęto renderowanie. Aktualnie wybrany proces ID (przed logiką):', currentSelectedSalesProcessId);
  container.innerHTML = `<p class="loading-message">Ładowanie szans sprzedaży...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      console.error("renderDeals: Błąd użytkownika lub użytkownik niezalogowany.", userError?.message);
      container.innerHTML = "<p class='error-message'>Proszę się zalogować, aby zobaczyć szanse sprzedaży.</p>";
      return;
    }

    const { data: salesProcesses, error: processError } = await supabase
        .from('sales_processes')
        .select('id, name, is_default')
        .eq('user_id', currentUser.id)
        .order('name', { ascending: true });

    if (processError) {
        console.error("Błąd pobierania procesów sprzedaży:", processError.message);
        container.innerHTML = `<p class="error-message">Błąd pobierania procesów sprzedaży: ${processError.message}</p>`;
        return;
    }

    if (!salesProcesses || salesProcesses.length === 0) {
        currentSelectedSalesProcessId = null; 
        container.innerHTML = `<h2>Szanse Sprzedaży (Kanban)</h2>
                             <p class="error-message">Nie zdefiniowano żadnych procesów sprzedaży. 
                             Musisz najpierw skonfigurować przynajmniej jeden proces w ustawieniach.</p>
                             <button id="goToProcessSettingsBtn" class="btn btn-primary mt-4">Przejdź do Ustawień Procesów</button>`;
        const goToSettingsBtn = container.querySelector('#goToProcessSettingsBtn');
        if(goToSettingsBtn) {
            goToSettingsBtn.onclick = (e) => {
                e.preventDefault();
                const settingsButton = document.getElementById('settingsSalesProcessesBtn');
                if (settingsButton) settingsButton.click();
                else showToast("Nie można automatycznie przejść do ustawień.", "info");
            };
        }
        return;
    }
    
    let activeProcess = null;
    if (currentSelectedSalesProcessId) { 
        activeProcess = salesProcesses.find(p => p.id === currentSelectedSalesProcessId);
    }
    if (!activeProcess) activeProcess = salesProcesses.find(p => p.is_default === true);
    if (!activeProcess) activeProcess = salesProcesses[0];
    
    if (activeProcess) {
        currentSelectedSalesProcessId = activeProcess.id;
    } else {
        currentSelectedSalesProcessId = null; 
        console.error("renderDeals: Nie udało się ustalić aktywnego procesu sprzedaży.");
        container.innerHTML = `<p class="error-message">Nie można ustalić aktywnego procesu sprzedaży.</p>`;
        return;
    }

    console.log("renderDeals: Aktywny proces ID:", currentSelectedSalesProcessId, "Nazwa:", activeProcess.name);

    let stagesForActiveProcess = [];
    if (currentSelectedSalesProcessId) {
        const { data: stages, error: stagesError } = await supabase
            .from('sales_stages')
            .select('*')
            .eq('process_id', currentSelectedSalesProcessId)
            .eq('user_id', currentUser.id)
            .order('stage_order', { ascending: true });
        if (stagesError) {
            console.error("Błąd pobierania etapów dla aktywnego procesu:", stagesError.message);
            showToast(`Błąd pobierania etapów: ${stagesError.message}`, 'error');
        } else {
            stagesForActiveProcess = stages || [];
        }
    }

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

    let html = `<h2>Szanse Sprzedaży (Kanban)</h2>`;
    html += `<div class="form-group mb-6">
               <label for="salesProcessSelector" class="text-base font-semibold text-gray-700 mb-2 block">Aktualny Proces Sprzedaży:</label>
               <select id="salesProcessSelector" class="mt-1 block w-full md:w-2/3 lg:w-1/2 p-3">`;
    salesProcesses.forEach(process => {
        html += `<option value="${process.id}" ${process.id === currentSelectedSalesProcessId ? 'selected' : ''}>${process.name}</option>`;
    });
    html += `</select></div>`;

    html += '<div id="kanban-board">';
    if (stagesForActiveProcess.length > 0) {
        stagesForActiveProcess.forEach(stage => {
            const dealsInStage = (dealsData || []).filter(deal => deal.current_stage_id === stage.id);
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
                                    <p><span class="label">Kontakt:</span> ${contactName}</p>
                                    <p><span class="label">Firma:</span> ${companyName}</p>
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
    
    html += `<div id="addDealFormContainerPlaceholder" class="mt-8"></div>`;
    html += `<button id="showMainAddDealFormBtn" class="btn btn-success mt-4">Dodaj Nową Szansę Sprzedaży</button>`;
    
    container.innerHTML = html;

    const salesProcessSelector = document.getElementById('salesProcessSelector');
    if (salesProcessSelector) {
        salesProcessSelector.onchange = async (e) => {
            currentSelectedSalesProcessId = e.target.value;
            await renderDeals(container); 
        };
    }
    
    const addDealFormContainer = document.getElementById('addDealFormContainerPlaceholder');
    const showMainAddDealFormBtn = document.getElementById('showMainAddDealFormBtn');
    if(showMainAddDealFormBtn && addDealFormContainer){
        showMainAddDealFormBtn.onclick = () => {
            displayAddDealForm(addDealFormContainer, currentUser, null, null, () => renderDeals(container));
            showMainAddDealFormBtn.style.display = 'none';
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
        button.onclick = (e) => { e.stopPropagation(); const dealId = e.target.dataset.dealId; displayEditDealForm(dealId, container, currentUser, () => renderDeals(container)); };
    });

  } catch (err) {
    console.error("General error in renderDeals:", err.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${err.message}.</p>`;
    showToast(`Błąd renderowania szans: ${err.message}`, 'error');
  }
}
