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

// --- Funkcja do wyświetlania formularza edycji szansy (istniejąca) ---
async function displayEditDealForm(dealId, container, currentUser, onSaveCallback) { // Dodano onSaveCallback
  container.innerHTML = ''; 
  try {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`*, sales_process_id, current_stage_id, contacts (id), companies (id)`)
      .eq('id', dealId)
      .eq('user_id', currentUser.id)
      .single();

    if (dealError || !deal) throw dealError || new Error("Nie znaleziono szansy lub brak uprawnień.");

    let stagesForCurrentProcess = [];
    if (deal.sales_process_id) {
        const {data: stages} = await supabase.from('sales_stages').select('id, name, stage_type')
            .eq('process_id', deal.sales_process_id).eq('user_id', currentUser.id).order('stage_order', {ascending: true});
        stagesForCurrentProcess = stages || [];
    }
    const allContactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'All Contacts');
    const allCompaniesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'All Companies');
    const {data: currentProcessInfo} = await supabase.from('sales_processes').select('name').eq('id', deal.sales_process_id).single();
    const currentProcessName = currentProcessInfo ? currentProcessInfo.name : "Nieznany Proces";

    let html = `
      <div class="edit-form-container">
        <h3>Edytuj Szansę Sprzedaży (w procesie: ${currentProcessName})</h3>
        <form id="specificEditDealForm" class="data-form">
          <input type="hidden" id="editDealFormIdField" value="${deal.id}">
          <div class="form-group"> <label for="editDealFormTitleField">Tytuł:</label> <input type="text" id="editDealFormTitleField" value="${deal.title}" required /> </div>
          <div class="form-group"> <label for="editDealFormValueField">Wartość ($):</label> <input type="number" id="editDealFormValueField" value="${deal.value || ''}" step="0.01" /> </div>
          <div class="form-group"> <label for="editDealFormStageField">Aktualny Etap:</label> <select id="editDealFormStageField" required>
              ${stagesForCurrentProcess.map(s => `<option value="${s.id}" ${deal.current_stage_id === s.id ? 'selected' : ''}>${s.name} (${s.stage_type})</option>`).join('')}
              ${stagesForCurrentProcess.length === 0 ? '<option value="" disabled>Brak etapów</option>' : ''} </select> </div>
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
  } catch (err) { showToast(`Błąd formularza edycji szansy: ${err.message}`, 'error'); }
}


// --- NOWA EKSPORTOWANA Funkcja do wyświetlania formularza DODAWANIA szansy ---
export async function displayAddDealForm(formContainer, currentUser, preselectedContactId = null, preselectedCompanyId = null, onSaveCallback) {
    formContainer.innerHTML = `<p class="loading-message">Ładowanie formularza dodawania szansy...</p>`;
    try {
        const salesProcesses = (await supabase.from('sales_processes').select('id, name, is_default').eq('user_id', currentUser.id).order('name')).data || [];
        const allContacts = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'All Contacts');
        const allCompanies = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'All Companies');

        let defaultProcessId = preselectedContactId ? null : (salesProcesses.find(p => p.is_default)?.id || (salesProcesses.length > 0 ? salesProcesses[0].id : null));
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
                    ${salesProcesses.map(p => `<option value="${p.id}" ${p.id === defaultProcessId ? 'selected' : ''}>${p.name}</option>`).join('')}
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
             if (onSaveCallback) onSaveCallback(); // np. odświeżenie widoku detali kontaktu
        };

    } catch (error) {
        console.error("Błąd wyświetlania formularza dodawania szansy:", error);
        formContainer.innerHTML = `<p class="error-message">Błąd ładowania formularza: ${error.message}</p>`;
    }
}


// --- Główna funkcja renderująca widok Kanban (zmodyfikowana) ---
export async function renderDeals(container) {
  container.innerHTML = ''; 
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) { /* obsługa braku użytkownika */ 
        container.innerHTML = "<p class='error-message'>Proszę się zalogować.</p>"; return;
    }

    const { data: salesProcesses } = await supabase.from('sales_processes').select('id, name, is_default')
        .eq('user_id', currentUser.id).order('name');

    if (!salesProcesses || salesProcesses.length === 0) {
        container.innerHTML = `<h2>Szanse Sprzedaży (Kanban)</h2><p class="error-message">Brak procesów sprzedaży. <button id="goToSettingsFromDeals" class="btn btn-link">Skonfiguruj</button></p>`;
        document.getElementById('goToSettingsFromDeals')?.addEventListener('click', () => document.getElementById('settingsSalesProcessesBtn')?.click());
        return;
    }
    
    let activeProcess = salesProcesses.find(p => p.id === currentSelectedSalesProcessId) || salesProcesses.find(p => p.is_default) || salesProcesses[0];
    currentSelectedSalesProcessId = activeProcess.id;

    const { data: stagesForActiveProcess } = await supabase.from('sales_stages').select('*')
        .eq('process_id', currentSelectedSalesProcessId).eq('user_id', currentUser.id).order('stage_order');

    const { data: dealsData } = await supabase.from('deals')
        .select(`*, contacts (id, first_name, last_name), companies (id, name)`)
        .eq('user_id', currentUser.id).eq('sales_process_id', currentSelectedSalesProcessId);

    let html = `<h2>Szanse Sprzedaży (Kanban)</h2>
                <div class="form-group mb-6">
                  <label for="salesProcessSelectorKanban" class="text-base font-semibold">Aktualny Proces:</label>
                  <select id="salesProcessSelectorKanban" class="mt-1 block w-full md:w-1/2 lg:w-1/3 p-3">
                    ${salesProcesses.map(p => `<option value="${p.id}" ${p.id === currentSelectedSalesProcessId ? 'selected' : ''}>${p.name}</option>`).join('')}
                  </select>
                </div>`;

    html += '<div id="kanban-board">';
    if (stagesForActiveProcess && stagesForActiveProcess.length > 0) {
        stagesForActiveProcess.forEach(stage => {
            const dealsInStage = (dealsData || []).filter(deal => deal.current_stage_id === stage.id);
            html += `
                <div class="kanban-column noselect" id="column-stage-${stage.id}" data-stage-id="${stage.id}" data-stage-type="${stage.stage_type}">
                    <h3>${stage.name} (${dealsInStage.length})</h3>
                    <div class="kanban-cards-container">
                        ${dealsInStage.map(deal => `
                            <div class="kanban-card noselect" draggable="true" data-deal-id="${deal.id}">
                                <h4>${deal.title}</h4>
                                <p class="value">Wartość: ${deal.value ? '$' + deal.value.toLocaleString() : 'Brak'}</p>
                                <p><span class="label">Kontakt:</span> ${deal.contacts ? `${deal.contacts.first_name} ${deal.contacts.last_name}` : 'Brak'}</p>
                                <p><span class="label">Firma:</span> ${deal.companies ? deal.companies.name : 'Brak'}</p>
                                <div class="kanban-card-actions"><button class="edit-deal-btn edit-btn" data-deal-id="${deal.id}">Edytuj</button></div>
                            </div>`).join('') || '<p class="text-sm text-gray-500 p-2">Brak szans.</p>'}
                    </div>
                </div>`;
        });
    } else if (currentSelectedSalesProcessId) {
        html += `<div class="w-full"><p class="error-message">Brak etapów dla procesu: "${activeProcess.name}".</p></div>`;
    }
    html += '</div>';
    
    html += `<div id="addDealFormContainerPlaceholder" class="mt-8"></div>`;
    html += `<button id="showMainAddDealFormBtn" class="btn btn-success mt-4">Dodaj Nową Szansę Sprzedaży</button>`;
    
    container.innerHTML = html;

    document.getElementById('salesProcessSelectorKanban').onchange = async (e) => {
        currentSelectedSalesProcessId = e.target.value;
        await renderDeals(container); 
    };
    
    const addDealFormContainer = document.getElementById('addDealFormContainerPlaceholder');
    const showMainAddDealFormBtn = document.getElementById('showMainAddDealFormBtn');
    if(showMainAddDealFormBtn && addDealFormContainer){
        showMainAddDealFormBtn.onclick = () => {
            displayAddDealForm(addDealFormContainer, currentUser, null, null, () => renderDeals(container));
            showMainAddDealFormBtn.style.display = 'none';
        }
    }

    // Re-attach drag & drop and edit button listeners
    const cards = container.querySelectorAll('.kanban-card');
    const columns = container.querySelectorAll('.kanban-column');
    cards.forEach(card => { /* ... (logika drag & drop bez zmian, tak jak była w ostatniej wersji) ... */ 
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
    columns.forEach(column => { /* ... (logika drag & drop bez zmian) ... */ 
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
