(() => {
  const input = document.querySelector('#phone-search');
  const groups = [...document.querySelectorAll('[data-phone-group]')];
  const contacts = [...document.querySelectorAll('[data-phone-contact]')];
  const status = document.querySelector('#phone-search-status');
  const empty = document.querySelector('#phones-empty');
  if (!input || !groups.length || !contacts.length || !status || !empty) return;

  const normalize = value => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  contacts.forEach(contact => {
    const category = contact.closest('[data-phone-group]')?.querySelector('h3')?.textContent || '';
    contact.dataset.search = normalize(`${category} ${contact.textContent}`);
  });

  function filterContacts() {
    const query = normalize(input.value);
    let visibleCount = 0;
    contacts.forEach(contact => {
      const visible = !query || contact.dataset.search.includes(query);
      contact.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    groups.forEach(group => {
      group.hidden = !group.querySelector('[data-phone-contact]:not([hidden])');
    });
    empty.hidden = visibleCount !== 0;
    status.textContent = query
      ? `${visibleCount} ${visibleCount === 1 ? 'contato encontrado' : 'contatos encontrados'}.`
      : `${contacts.length} contatos disponíveis.`;
  }

  input.addEventListener('input', filterContacts);
  input.addEventListener('search', filterContacts);
  filterContacts();
})();
