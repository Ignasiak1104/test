// components/deals.js
import { supabaseClient as supabase } from '../auth/init.js'; // ZMIANA TUTAJ

export async function renderDeals(container) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
        console.log("renderDeals: User not logged in.");
        container.innerHTML = "<p>Proszę się zalogować, aby zobaczyć szanse sprzedaży.</p>";
        return;
    }

    const { data: deals, error } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    let html = '<h2>Szanse Sprzedaży</h2>';
    if (deals && deals.length > 0) {
        html += '<ul>' + deals.map(d => 
        `<li>${d.title} - ${d.value ? '$' + d.value : 'Brak wartości'} - ${d.status}</li>`).join('') + '</ul>';
    } else {
        html += '<p>Nie masz jeszcze żadnych szans sprzedaży.</p>';
    }

    html += `
      <form id="addDealForm">
        <h3>Dodaj nową szansę sprzedaży</h3>
        <div class="form-group">
            <label for="dealTitle">Tytuł:</label>
            <input type="text" id="dealTitle" placeholder="Tytuł szansy" required />
        </div>
        <div class="form-group">
            <label for="dealValue">Wartość ($):</label>
            <input type="number" id="dealValue" placeholder="Wartość" />
        </div>
        <div class="form-group">
            <label for="dealStatus">Status:</label>
            <select id="dealStatus">
                <option value="open">Otwarta</option>
                <option value="won">Wygrana</option>
                <option value="lost">Przegrana</option>
            </select>
        </div>
        <button type="submit">Dodaj Szansę</button>
      </form>
    `;

    container.innerHTML = html;

    document.getElementById('addDealForm').onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('dealTitle').value;
      const value = parseFloat(document.getElementById('dealValue').value || 0);
      const status = document.getElementById('dealStatus').value;
      
      const { error: insertError } = await supabase.from('deals').insert([{ title, value, status, user_id: user.id }]);
      if (insertError) {
        console.error("Error adding deal:", insertError.message);
        alert("Błąd podczas dodawania szansy: " + insertError.message);
      } else {
        renderDeals(container);
      }
    };
  } catch (error) {
    console.error("Error rendering deals:", error.message);
    container.innerHTML = `<p>Wystąpił błąd podczas ładowania szans sprzedaży: ${error.message}. Spróbuj ponownie później.</p>`;
  }
}
