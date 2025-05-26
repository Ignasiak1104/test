// components/contacts.js
import { supabaseClient as supabase } from '../auth/init.js';

export async function renderContacts(container) {
  container.innerHTML = `<p class="loading-message">Ładowanie kontaktów...</p>`;
  try {
    const { data: { user } , error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.error("Error fetching user:", userError.message);
        container.innerHTML = "<p class='error-message'>Błąd podczas pobierania danych użytkownika. Spróbuj ponownie później.</p>";
        return;
    }
    if (!user) {
        console.log("renderContacts: User not logged in.");
        container.innerHTML = "<p class='error-message'>Proszę się zalogować, aby zobaczyć kontakty.</p>";
        return;
    }

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching contacts:", error.message);
        container.innerHTML = `<p class="error-message">Wystąpił błąd podczas ładowania kontaktów: ${error.message}</p>`;
        return;
    }

    let html = '<h2>Kontakty</h2>';
    if (contacts && contacts.length > 0) {
        html += '<ul>' + contacts.map(c => 
        `<li class="list-item">
            <p><span class="label">Imię i Nazwisko:</span> ${c.first_name} ${c.last_name}</p>
            <p><span class="label">Email:</span> ${c.email}</p>
        </li>`).join('') + '</ul>';
    } else {
        html += '<p>Nie masz jeszcze żadnych kontaktów.</p>';
    }
    
    html += `
      <form id="addContactForm" class="data-form">
        <h3>Dodaj nowy kontakt</h3>
        <div class="form-group">
          <label for="firstName">Imię:</label>
          <input type="text" id="firstName" placeholder="Imię" required />
        </div>
        <div class="form-group">
          <label for="lastName">Nazwisko:</label>
          <input type="text" id="lastName" placeholder="Nazwisko" required />
        </div>
        <div class="form-group">
          <label for="contactFormEmail">Email:</label> 
          <input type="email" id="contactFormEmail" placeholder="Email" required />
        </div>
        <button type="submit">Dodaj Kontakt</button>
      </form>
    `;
    
    container.innerHTML = html;

    const addContactForm = document.getElementById('addContactForm');
    if (addContactForm) {
        addContactForm.onsubmit = async (e) => {
          e.preventDefault();
          const first_name = document.getElementById('firstName').value;
          const last_name = document.getElementById('lastName').value;
          const email = document.getElementById('contactFormEmail').value; // Używamy unikalnego ID
          
          // Ponownie pobieramy użytkownika wewnątrz handlera, aby mieć pewność, że user.id jest aktualne
          // lub przekazujemy user.id z zasięgu renderContacts, jeśli jest to bezpieczne
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
              alert("Sesja wygasła, zaloguj się ponownie.");
              return;
          }

          const { error: insertError } = await supabase.from('contacts').insert([
              { first_name, last_name, email, user_id: currentUser.id }
          ]);

          if (insertError) {
            console.error("Error adding contact:", insertError.message);
            alert("Błąd podczas dodawania kontaktu: " + insertError.message);
          } else {
            renderContacts(container); // Odśwież listę
          }
        };
    }

  } catch (error) { // Ogólny catch dla błędów w funkcji renderContacts
    console.error("General error in renderContacts:", error.message);
    container.innerHTML = `<p class="error-message">Wystąpił nieoczekiwany błąd: ${error.message}. Spróbuj odświeżyć stronę.</p>`;
  }
}
