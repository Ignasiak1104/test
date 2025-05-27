// components/settings_sales_processes.js
import { supabaseClient as supabase } from '../auth/init.js';

let currentEditingProcess = null; 

async function renderStagesForProcess(process, stagesContainer, currentUser) {
    if (!process || !process.id) {
        stagesContainer.innerHTML = "<p>Wybierz proces, aby zobaczyć jego etapy.</p>";
        return;
    }
    stagesContainer.innerHTML = `<p class="loading-message">Ładowanie etapów dla procesu: ${process.name}...</p>`;
    
    try {
        const { data: stages, error: stagesError } = await supabase
            .from('sales_stages')
            .select('*')
            .eq('process_id', process.id)
            .eq('user_id', currentUser.id)
            .order('stage_order', { ascending: true });

        if (stagesError) throw stagesError;

        let stagesHtml = `<h4 class="text-lg font-semibold mt-4 mb-3">Etapy dla procesu: "${process.name}"</h4>`;
        if (stages && stages.length > 0) {
            stagesHtml += '<ul class="list-none mb-6">';
            stages.forEach(stage => {
                stagesHtml += `
                    <li class="list-item">
                        <div>
                            <p><span class="label">Nazwa etapu:</span> ${stage.name}</p>
                            <p><span class="label">Kolejność:</span> ${stage.stage_order}</p>
                            <p><span class="label">Typ:</span> ${stage.stage_type}</p>
                        </div>
                        <div class="list-item-actions">
                            <button class="edit-stage-btn edit-btn" data-stage-id="${stage.id}" data-process-id="${process.id}">Edytuj</button>
                            <button class="delete-stage-btn btn btn-danger btn-sm" data-stage-id="${stage.id}" data-process-id="${process.id}">Usuń</button>
                        </div>
                    </li>
                `;
            });
            stagesHtml += '</ul>';
        } else {
            stagesHtml += '<p class="text-sm text-gray-600 mt-2">Brak zdefiniowanych etapów dla tego procesu.</p>';
        }
        stagesHtml += `<button id="showAddStageFormBtn" data-process-id="${process.id}" class="btn btn-success mt-2">Dodaj Nowy Etap do "${process.name}"</button>`;
        stagesContainer.innerHTML = stagesHtml;

        stagesContainer.querySelectorAll('.edit-stage-btn').forEach(btn => {
            btn.onclick = () => displayEditStageForm(btn.dataset.stageId, btn.dataset.processId, stagesContainer.closest('#content-area'), currentUser);
        });
        stagesContainer.querySelectorAll('.delete-stage-btn').forEach(btn => {
            btn.onclick = () => handleDeleteStage(btn.dataset.stageId, btn.dataset.processId, stagesContainer.closest('#content-area'), currentUser);
        });
        
        const showAddStageBtn = document.getElementById('showAddStageFormBtn');
        if (showAddStageBtn) {
            showAddStageBtn.onclick = () => {
                currentEditingProcess = process;
                displayAddStageForm(process, stagesContainer.closest('#content-area'), currentUser);
            }
        }

    } catch (error) {
        console.error("Błąd ładowania etapów:", error.message);
        stagesContainer.innerHTML = `<p class="error-message">Nie można załadować etapów: ${error.message}</p>`;
    }
}

async function displayAddStageForm(process, mainContainer, currentUser) {
    let stageFormSection = mainContainer.querySelector('#stageFormSection');
    if (!stageFormSection) {
        stageFormSection = document.createElement('div');
        stageFormSection.id = 'stageFormSection';
        const stagesContainer = mainContainer.querySelector('#stagesForProcessContainer');
        if (stagesContainer && stagesContainer.nextSibling) {
            mainContainer.insertBefore(stageFormSection, stagesContainer.nextSibling);
        } else {
            mainContainer.appendChild(stageFormSection);
        }
    }
    const stageEditFormSection = mainContainer.querySelector('#stageEditFormSection');
    if (stageEditFormSection) stageEditFormSection.innerHTML = '';

    const formHtml = `
        <div class="edit-form-container mt-4">
            <h3>Dodaj Nowy Etap do procesu "${process.name}"</h3>
            <form id="addStageFormInstance" class="data-form">
                <div class="form-group">
                    <label for="addStageName">Nazwa Etapu:</label>
                    <input type="text" id="addStageName" required placeholder="Np. Kwalifikacja">
                </div>
                <div class="form-group">
                    <label for="addStageOrder">Kolejność (liczba):</label>
                    <input type="number" id="addStageOrder" required placeholder="Np. 1, 2, 3...">
                </div>
                <div class="form-group">
                    <label for="addStageType">Typ Etapu:</label>
                    <select id="addStageType">
                        <option value="open">Otwarty (Open)</option>
                        <option value="won">Wygrany (Won)</option>
                        <option value="lost">Przegrany (Lost)</option>
                    </select>
                </div>
                <div class="edit-form-buttons">
                    <button type="submit" class="btn btn-success">Dodaj Etap</button>
                    <button type="button" class="btn btn-secondary" id="cancelAddStageBtn">Anuluj</button>
                </div>
            </form>
        </div>
    `;
    stageFormSection.innerHTML = formHtml;

    document.getElementById('addStageFormInstance').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('addStageName').value;
        const stage_order_val = document.getElementById('addStageOrder').value;
        const stage_type = document.getElementById('addStageType').value; // Pobieramy wartość z selecta

        console.log('Próba dodania etapu z typem:', stage_type); // DODATKOWE LOGOWANIE

        if (stage_order_val === '' || isNaN(parseInt(stage_order_val))) {
            showToast("Kolejność musi być poprawną liczbą.", 'error');
            return;
        }
        const stage_order = parseInt(stage_order_val);

        const { error } = await supabase.from('sales_stages').insert({
            process_id: process.id,
            user_id: currentUser.id,
            name,
            stage_order,
            stage_type // Wartość powinna być 'open', 'won', lub 'lost'
        });

        if (error) {
            console.error("Błąd dodawania etapu (Supabase):", error); // Logujemy cały obiekt błędu
            showToast(`Nie można dodać etapu: ${error.message} (Kod: ${error.code})`, 'error', 5000); // Dłuższy czas wyświetlania dla błędu
        } else {
            showToast("Etap dodany pomyślnie!");
             if (currentEditingProcess && mainContainer.querySelector('#stagesForProcessContainer')) {
                await renderStagesForProcess(currentEditingProcess, mainContainer.querySelector('#stagesForProcessContainer'), currentUser);
            }
            stageFormSection.innerHTML = '';
        }
    };
    document.getElementById('cancelAddStageBtn').onclick = () => {
        stageFormSection.innerHTML = '';
    };
}

async function displayEditStageForm(stageId, processId, mainContainer, currentUser) {
    const stageFormSection = mainContainer.querySelector('#stageFormSection');
    if (stageFormSection) stageFormSection.innerHTML = '';

    let stageEditFormSection = mainContainer.querySelector('#stageEditFormSection');
    if (!stageEditFormSection) {
        stageEditFormSection = document.createElement('div');
        stageEditFormSection.id = 'stageEditFormSection';
        const stagesContainer = mainContainer.querySelector('#stagesForProcessContainer');
        if (stagesContainer && stagesContainer.nextSibling) {
            mainContainer.insertBefore(stageEditFormSection, stagesContainer.nextSibling.nextSibling);
        } else {
             mainContainer.appendChild(stageEditFormSection);
        }
    }
    
    stageEditFormSection.innerHTML = `<p class="loading-message">Ładowanie danych etapu...</p>`;

    try {
        const { data: stage, error: stageFetchError } = await supabase
            .from('sales_stages')
            .select('*')
            .eq('id', stageId)
            .eq('user_id', currentUser.id)
            .single();

        if (stageFetchError || !stage) throw stageFetchError || new Error("Nie znaleziono etapu.");
        
        const { data: parentProcess, error: processFetchError } = await supabase
            .from('sales_processes')
            .select('id, name')
            .eq('id', processId)
            .single();
        
        if (processFetchError || !parentProcess) throw processFetchError || new Error("Nie znaleziono procesu nadrzędnego.");

        const formHtml = `
            <div class="edit-form-container mt-4">
                <h3>Edytuj Etap: "${stage.name}" (w procesie "${parentProcess.name}")</h3>
                <form id="editStageFormInstance" class="data-form">
                    <div class="form-group">
                        <label for="editStageName">Nazwa Etapu:</label>
                        <input type="text" id="editStageName" value="${stage.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="editStageOrder">Kolejność (liczba):</label>
                        <input type="number" id="editStageOrder" value="${stage.stage_order}" required>
                    </div>
                    <div class="form-group">
                        <label for="editStageType">Typ Etapu:</label>
                        <select id="editStageType">
                            <option value="open" ${stage.stage_type === 'open' ? 'selected' : ''}>Otwarty (Open)</option>
                            <option value="won" ${stage.stage_type === 'won' ? 'selected' : ''}>Wygrany (Won)</option>
                            <option value="lost" ${stage.stage_type === 'lost' ? 'selected' : ''}>Przegrany (Lost)</option>
                        </select>
                    </div>
                    <div class="edit-form-buttons">
                        <button type="submit" class="btn btn-primary">Zapisz Zmiany</button>
                        <button type="button" class="btn btn-secondary" id="cancelEditStageBtn">Anuluj</button>
                    </div>
                </form>
            </div>
        `;
        stageEditFormSection.innerHTML = formHtml;

        document.getElementById('editStageFormInstance').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('editStageName').value;
            const stage_order_val = document.getElementById('editStageOrder').value;
            const stage_type = document.getElementById('editStageType').value; // Pobieramy wartość

            console.log('Próba aktualizacji etapu z typem:', stage_type); // DODATKOWE LOGOWANIE

            if (stage_order_val === '' || isNaN(parseInt(stage_order_val))) {
                showToast("Kolejność musi być poprawną liczbą.", 'error');
                return;
            }
            const stage_order = parseInt(stage_order_val);

            const { error } = await supabase.from('sales_stages').update({
                name,
                stage_order,
                stage_type // Wartość powinna być 'open', 'won', lub 'lost'
            }).eq('id', stageId).eq('user_id', currentUser.id);

            if (error) {
                console.error("Błąd aktualizacji etapu (Supabase):", error); // Logujemy cały obiekt błędu
                showToast(`Nie można zaktualizować etapu: ${error.message} (Kod: ${error.code})`, 'error', 5000);
            } else {
                showToast("Etap zaktualizowany pomyślnie!");
                if (currentEditingProcess && mainContainer.querySelector('#stagesForProcessContainer')) {
                    await renderStagesForProcess(currentEditingProcess, mainContainer.querySelector('#stagesForProcessContainer'), currentUser);
                }
                stageEditFormSection.innerHTML = '';
            }
        };
        document.getElementById('cancelEditStageBtn').onclick = () => {
            stageEditFormSection.innerHTML = '';
        };

    } catch (error) {
        console.error("Błąd wyświetlania formularza edycji etapu:", error.message);
        stageEditFormSection.innerHTML = `<p class="error-message">Nie można załadować formularza edycji etapu: ${error.message}</p>`;
    }
}

async function handleDeleteStage(stageId, processId, mainContainer, currentUser) {
    if (!confirm("Czy na pewno chcesz usunąć ten etap? Tej operacji nie można cofnąć.\nUWAGA: Jeśli jakieś szanse sprzedaży są na tym etapie, ich powiązanie z etapem zostanie usunięte (ustawione na NULL).")) return;

    try {
        const { data: processOwner, error: ownerError } = await supabase
            .from('sales_processes')
            .select('user_id')
            .eq('id', processId)
            .single();

        if (ownerError || !processOwner || processOwner.user_id !== currentUser.id) {
            throw new Error("Brak uprawnień lub proces nie istnieje.");
        }
        
        const { error } = await supabase.from('sales_stages').delete()
            .eq('id', stageId)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        showToast("Etap usunięty pomyślnie.");
        if (currentEditingProcess && mainContainer.querySelector('#stagesForProcessContainer')) {
            await renderStagesForProcess(currentEditingProcess, mainContainer.querySelector('#stagesForProcessContainer'), currentUser);
        } else {
            renderSalesProcessSettings(mainContainer);
        }
        const stageFormSection = mainContainer.querySelector('#stageFormSection');
        if (stageFormSection) stageFormSection.innerHTML = '';
        const stageEditFormSection = mainContainer.querySelector('#stageEditFormSection');
        if (stageEditFormSection) stageEditFormSection.innerHTML = '';

    } catch (error) {
        console.error("Błąd usuwania etapu:", error.message);
        showToast(`Nie można usunąć etapu: ${error.message}`, 'error');
    }
}

async function displayAddProcessForm(container, currentUser) {
    const stagesContainer = container.querySelector('#stagesForProcessContainer');
    if (stagesContainer) stagesContainer.innerHTML = '';
    const stageFormSection = container.querySelector('#stageFormSection');
    if (stageFormSection) stageFormSection.innerHTML = '';
    const stageEditFormSection = container.querySelector('#stageEditFormSection');
    if (stageEditFormSection) stageEditFormSection.innerHTML = '';

    let processFormSection = container.querySelector('#processFormSection');
    if (!processFormSection) {
        processFormSection = document.createElement('div');
        processFormSection.id = 'processFormSection';
        const processListContainer = container.querySelector('#processListContainer');
        if (processListContainer && processListContainer.nextSibling) {
            container.insertBefore(processFormSection, processListContainer.nextSibling);
        } else {
            container.appendChild(processFormSection);
        }
    }
    
    const formHtml = `
        <div class="edit-form-container mt-6">
            <h3>Dodaj Nowy Proces Sprzedaży</h3>
            <form id="addProcessFormInstance" class="data-form">
                <div class="form-group">
                    <label for="addProcessName">Nazwa Procesu:</label>
                    <input type="text" id="addProcessName" required placeholder="Np. Proces dla Klientów VIP">
                </div>
                <div class="form-group">
                    <label for="addProcessIsDefault" class="flex items-center">
                        <input type="checkbox" id="addProcessIsDefault" class="mr-2 h-4 w-4" style="width:auto; height:auto;">
                        Ustaw jako domyślny proces
                    </label>
                </div>
                <div class="edit-form-buttons">
                    <button type="submit" class="btn btn-success">Dodaj Proces</button>
                    <button type="button" class="btn btn-secondary" id="cancelAddProcessBtn">Anuluj</button>
                </div>
            </form>
        </div>
    `;
    processFormSection.innerHTML = formHtml;

    document.getElementById('addProcessFormInstance').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('addProcessName').value;
        const is_default = document.getElementById('addProcessIsDefault').checked;

        const { data, error } = await supabase.from('sales_processes').insert({
            user_id: currentUser.id,
            name,
            is_default
        }).select().single();

        if (error) {
            console.error("Błąd dodawania procesu:", error.message);
            showToast(`Nie można dodać procesu: ${error.message}`, 'error');
        } else {
            showToast("Proces dodany pomyślnie!");
            if(data) currentEditingProcess = data;
            renderSalesProcessSettings(container);
        }
    };
    document.getElementById('cancelAddProcessBtn').onclick = () => {
        processFormSection.innerHTML = '';
    };
}

async function displayEditProcessForm(process, container, currentUser) {
    const stagesContainer = container.querySelector('#stagesForProcessContainer');
    if (stagesContainer) stagesContainer.innerHTML = '<p class="text-gray-600 italic">Edytowanie procesu. Zarządzanie etapami będzie dostępne po zapisaniu zmian lub anulowaniu edycji procesu.</p>';
    const stageFormSection = container.querySelector('#stageFormSection');
    if (stageFormSection) stageFormSection.innerHTML = '';
    const stageEditFormSection = container.querySelector('#stageEditFormSection');
    if (stageEditFormSection) stageEditFormSection.innerHTML = '';

    let processFormSection = container.querySelector('#processFormSection');
     if (!processFormSection) {
        processFormSection = document.createElement('div');
        processFormSection.id = 'processFormSection';
        const processListContainer = container.querySelector('#processListContainer');
        if (processListContainer && processListContainer.nextSibling) {
            container.insertBefore(processFormSection, processListContainer.nextSibling);
        } else {
            container.appendChild(processFormSection);
        }
    }

    const formHtml = `
        <div class="edit-form-container mt-6">
            <h3>Edytuj Proces: "${process.name}"</h3>
            <form id="editProcessFormInstance" class="data-form">
                <div class="form-group">
                    <label for="editProcessName">Nazwa Procesu:</label>
                    <input type="text" id="editProcessName" value="${process.name}" required>
                </div>
                <div class="form-group">
                    <label for="editProcessIsDefault" class="flex items-center">
                        <input type="checkbox" id="editProcessIsDefault" class="mr-2 h-4 w-4" style="width:auto; height:auto;" ${process.is_default ? 'checked' : ''}>
                        Ustaw jako domyślny proces
                    </label>
                </div>
                <div class="edit-form-buttons">
                    <button type="submit" class="btn btn-primary">Zapisz Zmiany</button>
                    <button type="button" class="btn btn-secondary" id="cancelEditProcessBtn">Anuluj</button>
                </div>
            </form>
        </div>
    `;
    processFormSection.innerHTML = formHtml;

    document.getElementById('editProcessFormInstance').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('editProcessName').value;
        const is_default = document.getElementById('editProcessIsDefault').checked;

        const { error } = await supabase.from('sales_processes').update({
            name,
            is_default
        }).eq('id', process.id).eq('user_id', currentUser.id);

        if (error) {
            console.error("Błąd aktualizacji procesu:", error.message);
            showToast(`Nie można zaktualizować procesu: ${error.message}`, 'error');
        } else {
            showToast("Proces zaktualizowany pomyślnie!");
            currentEditingProcess = { ...process, name, is_default };
            renderSalesProcessSettings(container);
        }
    };
    document.getElementById('cancelEditProcessBtn').onclick = () => {
        processFormSection.innerHTML = '';
        if (currentEditingProcess && currentEditingProcess.id && container.querySelector('#stagesForProcessContainer')) {
             renderStagesForProcess(currentEditingProcess, container.querySelector('#stagesForProcessContainer'), currentUser);
        }
    };
}

async function handleDeleteProcess(processId, currentUser, container) {
    const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('sales_process_id', processId)
        .eq('user_id', currentUser.id);

    if (dealsError) {
        showToast(`Błąd sprawdzania powiązanych szans sprzedaży: ${dealsError.message}`, 'error');
        return;
    }

    let confirmationMessage = "Czy na pewno chcesz usunąć ten proces sprzedaży? Spowoduje to również usunięcie wszystkich jego etapów.";
    // Używamy deals.count, ponieważ head:true zwraca tylko liczbę
    if (deals && deals.count > 0) { 
        confirmationMessage += `\n\nUWAGA: ${deals.count} szans(e) sprzedaży jest aktualnie powiązanych z tym procesem. Po usunięciu procesu, te szanse stracą swoje powiązanie z procesem i etapem (zostaną ustawione na NULL).`;
    }

    if (!confirm(confirmationMessage)) return;

    try {
        const { error } = await supabase.from('sales_processes').delete()
        .eq('id', processId)
        .eq('user_id', currentUser.id);

        if (error) throw error;

        showToast("Proces sprzedaży usunięty pomyślnie.");
        if (currentEditingProcess && currentEditingProcess.id === processId) {
            currentEditingProcess = null; 
        }
        renderSalesProcessSettings(container);
    } catch (error) {
        console.error("Błąd usuwania procesu:", error.message);
        showToast(`Nie można usunąć procesu: ${error.message}`, 'error');
    }
}

export async function renderSalesProcessSettings(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie ustawień procesów sprzedaży...</p>`;
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      console.error("Błąd pobierania użytkownika lub użytkownik niezalogowany:", userError?.message);
      container.innerHTML = "<p class='error-message'>Musisz być zalogowany, aby zarządzać procesami sprzedaży.</p>";
      return;
    }

    const { data: processes, error: processesError } = await supabase
      .from('sales_processes')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (processesError) throw processesError;

    let html = `<h2>Ustawienia Procesów Sprzedaży</h2>`;
    html += `<button id="showAddProcessFormBtn" class="btn btn-success mb-6">Dodaj Nowy Proces Sprzedaży</button>`;
    
    html += `<div id="processListContainer" class="mb-8">`;
    if (processes && processes.length > 0) {
      html += '<h3 class="text-xl font-semibold mb-3">Twoje Procesy Sprzedaży:</h3><ul>';
      processes.forEach(process => {
        html += `
          <li class="list-item mb-3 p-4">
            <div>
                <p class="text-lg font-medium">${process.name} ${process.is_default ? '<span class="text-xs bg-blue-100 text-blue-700 p-1 rounded ml-2">DOMYŚLNY</span>' : ''}</p>
            </div>
            <div class="list-item-actions">
                <button class="view-stages-btn btn btn-secondary btn-sm" data-process-id="${process.id}" data-process-name="${process.name}">Zarządzaj Etapami</button>
                <button class="edit-process-btn edit-btn" data-process-id="${process.id}">Edytuj Proces</button>
                <button class="delete-process-btn btn btn-danger btn-sm" data-process-id="${process.id}">Usuń Proces</button>
            </div>
          </li>
        `;
      });
      html += '</ul>';
    } else {
      html += '<p>Nie zdefiniowano jeszcze żadnych procesów sprzedaży. Zacznij od dodania nowego!</p>';
    }
    html += `</div>`;

    html += `<div id="processFormSection"></div>`;
    html += `<hr class="my-8 border-t border-gray-300">`;
    html += `<div id="stagesForProcessContainer" class="mt-6">`;
    if (!currentEditingProcess && processes && processes.length > 0) {
         html += "<p class='text-gray-600'>Wybierz proces z listy powyżej (kliknij 'Zarządzaj Etapami'), aby zobaczyć i edytować jego etapy.</p>";
    } else if (!processes || processes.length === 0) {
        html += "<p class='text-gray-600'>Najpierw dodaj proces sprzedaży, aby móc zdefiniować dla niego etapy.</p>";
    }
    html += `</div>`;
    html += `<div id="stageFormSection"></div>`;
    html += `<div id="stageEditFormSection"></div>`;

    container.innerHTML = html;

    document.getElementById('showAddProcessFormBtn').onclick = () => {
        currentEditingProcess = null; // Czyścimy, gdy dodajemy nowy proces
        displayAddProcessForm(container, currentUser);
    }
    
    container.querySelectorAll('.view-stages-btn').forEach(btn => {
        btn.onclick = async () => {
            const processId = btn.dataset.processId;
            const processToView = processes.find(p => p.id === processId);
            if (processToView) {
                currentEditingProcess = processToView;
                const processFormSection = container.querySelector('#processFormSection');
                if (processFormSection) processFormSection.innerHTML = '';
                const stageFormSection = container.querySelector('#stageFormSection');
                if (stageFormSection) stageFormSection.innerHTML = '';
                const stageEditFormSection = container.querySelector('#stageEditFormSection');
                if (stageEditFormSection) stageEditFormSection.innerHTML = '';

                const stagesContainer = container.querySelector('#stagesForProcessContainer');
                if (stagesContainer) {
                    await renderStagesForProcess(currentEditingProcess, stagesContainer, currentUser);
                }
            }
        };
    });

    container.querySelectorAll('.edit-process-btn').forEach(btn => {
        btn.onclick = () => {
            const processId = btn.dataset.processId;
            const processToEdit = processes.find(p => p.id === processId);
            if (processToEdit) {
                currentEditingProcess = processToEdit;
                const stagesContainer = container.querySelector('#stagesForProcessContainer');
                if (stagesContainer) stagesContainer.innerHTML = '<p class="text-gray-600 italic">Edytowanie procesu. Zarządzanie etapami będzie dostępne po zapisaniu zmian lub anulowaniu edycji procesu.</p>';
                const stageFormSection = container.querySelector('#stageFormSection');
                if (stageFormSection) stageFormSection.innerHTML = '';
                const stageEditFormSection = container.querySelector('#stageEditFormSection');
                if (stageEditFormSection) stageEditFormSection.innerHTML = '';
                displayEditProcessForm(processToEdit, container, currentUser);
            }
        };
    });
    container.querySelectorAll('.delete-process-btn').forEach(btn => {
        btn.onclick = () => handleDeleteProcess(btn.dataset.processId, currentUser, container);
    });

    if (currentEditingProcess && currentEditingProcess.id && container.querySelector('#stagesForProcessContainer')) {
        await renderStagesForProcess(currentEditingProcess, container.querySelector('#stagesForProcessContainer'), currentUser);
    }

  } catch (error) {
    console.error("Błąd renderowania ustawień procesów sprzedaży:", error.message);
    container.innerHTML = `<p class="error-message">Nie można załadować ustawień: ${error.message}</p>`;
    showToast(`Błąd ładowania ustawień: ${error.message}`, 'error');
  }
}
