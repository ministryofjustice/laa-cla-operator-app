import { initAll } from 'govuk-frontend/dist/govuk/all.bundle.js';
initAll();


function clearInputFields() {
  const ids = ['name', 'phone', 'postcode', 'date'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

document.getElementById('clear-all-link').addEventListener('click', function(event) {
  event.preventDefault();
  clearInputFields();
});