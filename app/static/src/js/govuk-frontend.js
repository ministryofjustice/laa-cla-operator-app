import { initAll } from 'govuk-frontend/dist/govuk/all.bundle.js';
initAll();


function clearInputFields() {
  const ids = ['full_name', 'phone', 'postcode', 'date_of_birth-day', 'date_of_birth-month', 'date_of_birth-year'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

document.getElementById('clear-all-link').addEventListener('click', function(event) {
  event.preventDefault();
  clearInputFields();
});