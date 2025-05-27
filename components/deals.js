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
  container.innerHTML = ''; 
  try {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`*, sales_process_id, current_stage_id, 
               contacts (id, first_name, last_name), 
               companies (id, name)`) // Pobieramy dane powiązanych kontaktów i firm
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
          <div class="form-group">
            <label for="editDealFormTitleField">Tytuł:</label>
            <input type="text" id="editDealFormTitleField" value="${deal.title}" required />
          </div>
          <div class="form-group">
            <label for="editDealFormValueField">Wartość ($):</label>
            <input type="number" id="editDealFormValueField" value="${deal.value || ''}" step="0.01" />
          </div>
          <div class="form-group">
            <label for="editDealFormStageField">Aktualny Etap:</label>
            <select id="editDealFormStageField" required>
              ${stagesForCurrentProcess.map(s => `<option value="${s.id}" ${deal.current_stage_id === s.id ? 'selected' : ''}>${s.name} (${s.stage_type})</option>`).join('')}
              ${stagesForCurrentProcess.length === 0 ? '<option value="" disabled>Brak etapów dla tego procesu</option>' : ''}
            </select>
          </div>
          <div class="form-group">
            <label for="editDealFormContactField">Powiąż z kontaktem:</label>
            <select id="editDealFormContactField">
              <option value="">Wybierz kontakt...</option>
              ${allContactsForSelect.map(c => `<option value="${c.id}" ${deal.contact_id === c.id ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="editDealFormCompanyField">Powiąż z firmą:</label>
            <select id="editDealFormCompanyField">
              <option value="">Wybierz firmę...</option>
              ${allCompaniesForSelect.map(c => `<option value="${c.id}" ${deal.company_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
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
          const updatedStageId = document.getElementById('editDealFormStageField').value;
          const updatedContactId = document.getElementById('editDealFormContactField').value || null;
          const updatedCompanyId = document.getElementById('editDealFormCompanyField').value || null;

          if (!updatedStageId) {
              showToast("Proszę wybrać etap dla szansy sprzedaży.", "error");
              return;
          }

          const { error: updateError } = await supabase
            .from('deals')
            .update({
              title: updatedTitle,
              value: updatedValue,
              current_stage_id: updatedStageId,
              contact_id: updatedContactId,
              company_id: updatedCompanyId
            })
            .eq('id', deal.id)
            .eq('user_id', currentUser.id);

          if (updateError) {
            console.error("Error updating deal:", updateError.message);
            showToast("Błąd podczas aktualizacji szansy: " + updateError.message, 'error');
          } else {
            showToast("Szansa sprzedaży zaktualizowana pomyślnie!");
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
    showToast(`Błąd ładowania formularza edycji: ${err.message}`, 'error');
  }
}


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
        await renderDeals(container);
    } catch (error) {
        console.error('Błąd aktualizacji etapu szansy po upuszczeniu:', error.message);
        showToast('Błąd aktualizacji etapu szansy: ' + error.message, 'error');
        await renderDeals(container);
    }
}

let currentSelectedSalesProcessId = null;

export async function renderDeals(container) {
  container.innerHTML = ''; 
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
    
    let activeProcess = salesProcesses.find(p => p.id === currentSelectedSalesProcessId);
    if (!activeProcess) activeProcess = salesProcesses.find(p => p.is_default === true);
    if (!activeProcess) activeProcess = salesProcesses[0];
    currentSelectedSalesProcessId = activeProcess.id;

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

    // Formularz dodawania: Pobierz wszystkie kontakty i firmy dla selectów
    const allContactsForSelect = await fetchDataForSelect(currentUser.id, 'contacts', 'id, first_name, last_name', 'All Contacts for add deal');
    const allCompaniesForSelect = await fetchDataForSelect(currentUser.id, 'companies', 'id, name', 'All Companies for add deal');
    
    let initialStagesForAddFormOptionsHtml = '<option value="" disabled>Najpierw wybierz proces</option>';
    if (currentSelectedSalesProcessId) {
        const openStages = stagesForActiveProcess.filter(s => s.stage_type === 'open');
        if (openStages.length > 0) {
            initialStagesForAddFormOptionsHtml = openStages.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        } else {
            initialStagesForAddFormOptionsHtml = '<option value="" disabled>Brak etapów "open" dla tego procesu</option>';
        }
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
            <label for="addDealStageSelect">Początkowy Etap (tylko etapy 'open'):</label>
            <select id="addDealStageSelect" required>
                ${initialStagesForAddFormOptionsHtml}
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
                ${allContactsForSelect.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="addDealFormCompanyField">Powiąż z firmą:</label>
            <select id="addDealFormCompanyField">
                <option value="">Wybierz firmę...</option>
                ${allCompaniesForSelect.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <button type="submit" class="btn btn-success">Dodaj Szansę</button>
      </form>
    `;
    container.innerHTML = html;

    const salesProcessSelector = document.getElementById('salesProcessSelector');
    if (salesProcessSelector) {
        salesProcessSelector.onchange = async (e) => {
            currentSelectedSalesProcessId = e.target.value;
            await renderDeals(container); 
        };
    }
    
    const addDealProcessSelectEl = document.getElementById('addDealProcessSelect');
    const addDealStageSelectEl = document.getElementById('addDealStageSelect');

    async function populateStagesForAddDealForm(processId) {
        if (!addDealStageSelectEl) return;
        addDealStageSelectEl.innerHTML = '<option value="">Ładowanie etapów...</option>';
        if (processId) {
            const { data: stages, error: stagesErr } = await supabase
                .from('sales_stages')
                .select('id, name')
                .eq('process_id', processId)
                .eq('user_id', currentUser.id)
                .eq('stage_type', 'open')
                .order('stage_order', { ascending: true });
            if (stagesErr) {
                console.error("Błąd ładowania etapów dla formularza dodawania:", stagesErr);
                addDealStageSelectEl.innerHTML = '<option value="" disabled>Błąd ładowania etapów</option>';
            } else {
                addDealStageSelectEl.innerHTML = stages.length > 0 
                    ? stages.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
                    : '<option value="" disabled>Brak etapów "open" dla tego procesu</option>';
            }
        } else {
             addDealStageSelectEl.innerHTML = '<option value="" disabled>Najpierw wybierz proces</option>';
        }
    }

    if (addDealProcessSelectEl) {
        addDealProcessSelectEl.onchange = async (e) => {
            await populateStagesForAddDealForm(e.target.value);
        };
        if (addDealProcessSelectEl.value) {
            await populateStagesForAddDealForm(addDealProcessSelectEl.value);
        }
    }

    const cards = container.querySelectorAll('.kanban-card');
    const columns = container.querySelectorAll('.kanban-column');
    cards.forEach(card => { /* logika drag & drop */ 
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
    columns.forEach(column => {  /* logika drag & drop */ 
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
        button.onclick = (e) => { e.stopPropagation(); const dealId = e.target.dataset.dealId; displayEditDealForm(dealId, container, currentUser); };
    });

    const addDealFormEl = document.getElementById('mainAddDealForm');
    if (addDealFormEl) {
      addDealFormEl.onsubmit = async (e) => {
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
