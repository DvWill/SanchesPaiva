(() => {
  const CATEGORIES = ['Iluminação pública','Buracos e pavimentação','Limpeza urbana','Saúde','Educação','Transporte','Segurança','Esporte e lazer','Emprego e empreendedorismo','Sugestão','Outro'];
  const STATUSES = ['Recebida','Em triagem','Encaminhada ao órgão responsável','Em andamento','Aguardando informações do cidadão','Concluída','Arquivada'];
  const message = (value, error = false) => {
    const target = document.querySelector('.admin-message');
    if (!target) return;
    target.textContent = value;
    target.style.color = error ? '#ffaaa5' : '#ffd56b';
  };
  const formatDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
  const formatPhone = (value = '') => {
    const digits = value.replace(/^55/, '');
    return digits.length === 11 ? `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}` : value;
  };
  const categoryLabel = (request) => request.category === 'Outro' && request.category_other ? `Outro — ${request.category_other}` : request.category;
  const fillOptions = (select, options) => options.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });

  async function requireSession() {
    try { await APP.api('/api/auth/session'); return true; }
    catch { location.replace('/admin/login'); return false; }
  }

  const list = document.querySelector('#demand-list');
  if (list) {
    const filters = document.querySelector('#demand-filters');
    fillOptions(filters.elements.category, CATEGORIES);
    fillOptions(filters.elements.status, STATUSES);

    const draw = (requests) => {
      list.replaceChildren();
      if (!requests.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Nenhuma demanda encontrada com esses filtros.';
        list.append(empty);
      }
      requests.forEach((request) => {
        const row = document.createElement('article');
        row.className = 'demand-row';
        const main = document.createElement('div');
        const protocol = document.createElement('strong');
        const title = document.createElement('h2');
        const details = document.createElement('p');
        protocol.textContent = request.protocol;
        title.textContent = request.name;
        details.textContent = `${categoryLabel(request)} · ${request.neighborhood} · ${formatPhone(request.phone_normalized)} · ${formatDate(request.created_at)}`;
        main.append(protocol, title, details);
        const status = document.createElement('span');
        status.className = 'status-pill';
        status.textContent = request.status;
        const link = document.createElement('a');
        link.href = `/admin/demandas/${request.id}`;
        link.textContent = 'Abrir demanda';
        row.append(main, status, link);
        list.append(row);
      });
      list.setAttribute('aria-busy', 'false');
    };
    const load = async () => {
      list.setAttribute('aria-busy', 'true');
      message('Carregando demandas…');
      const parameters = new URLSearchParams();
      new FormData(filters).forEach((value, key) => { if (String(value).trim()) parameters.set(key, String(value).trim()); });
      try {
        const requests = await APP.api(`/api/admin/citizen-requests?${parameters}`);
        draw(requests);
        const received = requests.filter((item) => item.status === 'Recebida').length;
        const inProgress = requests.filter((item) => ['Em triagem','Em andamento','Encaminhada ao órgão responsável'].includes(item.status)).length;
        const completed = requests.filter((item) => item.status === 'Concluída').length;
        document.querySelector('#demand-stats').innerHTML = `<div class="stat"><strong>${requests.length}</strong>${requests.length === 1 ? 'Encontrada' : 'Encontradas'}</div><div class="stat"><strong>${received}</strong>${received === 1 ? 'Recebida' : 'Recebidas'}</div><div class="stat"><strong>${inProgress}</strong>Em atendimento</div><div class="stat"><strong>${completed}</strong>${completed === 1 ? 'Concluída' : 'Concluídas'}</div>`;
        message('');
      } catch (error) {
        list.setAttribute('aria-busy', 'false');
        message(error.message, true);
      }
    };
    filters.addEventListener('submit', (event) => { event.preventDefault(); load(); });
    filters.addEventListener('reset', () => setTimeout(load));
    requireSession().then((ready) => { if (ready) load(); });
    return;
  }

  const detail = document.querySelector('#demand-detail');
  if (!detail) return;
  const id = location.pathname.match(/\/admin\/demandas\/([0-9a-f-]+)/i)?.[1];
  const updateForm = document.querySelector('#demand-update-form');
  fillOptions(updateForm.elements.status, STATUSES);

  const addDetail = (container, label, value) => {
    const wrapper = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value || '—';
    wrapper.append(term, description);
    container.append(wrapper);
  };
  const render = (request) => {
    document.querySelector('#demand-protocol').textContent = request.protocol;
    document.querySelector('#demand-status').textContent = request.status;
    document.querySelector('#demand-message').textContent = request.message;
    const data = document.querySelector('#demand-data');
    data.replaceChildren();
    addDetail(data, 'Nome', request.name);
    addDetail(data, 'Telefone/WhatsApp', formatPhone(request.phone_normalized));
    addDetail(data, 'Bairro', request.neighborhood);
    addDetail(data, 'Local', request.demand_location);
    addDetail(data, 'Categoria', categoryLabel(request));
    addDetail(data, 'Instagram', request.instagram || 'Não informado');
    addDetail(data, 'Aniversário', request.birthday_day ? `${String(request.birthday_day).padStart(2,'0')}/${String(request.birthday_month).padStart(2,'0')}` : 'Não informado');
    addDetail(data, 'Comunicações autorizadas', request.marketing_consent ? 'Sim' : 'Não');
    addDetail(data, 'Registrada em', formatDate(request.created_at));
    addDetail(data, 'Última atualização', formatDate(request.updated_at));
    addDetail(data, 'Encaminhada a', request.forwarded_to || 'Ainda não informado');
    updateForm.elements.status.value = request.status;
    updateForm.elements.forwarded_to.value = request.forwarded_to || '';
    const history = document.querySelector('#demand-history');
    history.replaceChildren();
    request.history.forEach((update) => {
      const item = document.createElement('li');
      const heading = document.createElement('strong');
      const meta = document.createElement('span');
      heading.textContent = update.status;
      meta.textContent = `${formatDate(update.created_at)} · ${update.admin_email || 'Registro automático'}`;
      item.append(heading, meta);
      if (update.forwarded_to) {
        const forwarded = document.createElement('p');
        forwarded.textContent = `Encaminhamento: ${update.forwarded_to}`;
        item.append(forwarded);
      }
      if (update.public_message) {
        const publicNote = document.createElement('p');
        publicNote.className = 'history-public';
        publicNote.textContent = `Atualização pública: ${update.public_message}`;
        item.append(publicNote);
      }
      if (update.internal_note) {
        const internal = document.createElement('p');
        internal.className = 'history-internal';
        internal.textContent = `Anotação interna: ${update.internal_note}`;
        item.append(internal);
      }
      history.append(item);
    });
    detail.setAttribute('aria-busy', 'false');
  };
  const loadDetail = async () => {
    if (!id) { message('Identificador da demanda inválido.', true); return; }
    try { render(await APP.api(`/api/admin/citizen-requests/${id}`)); }
    catch (error) { message(error.message, true); }
  };
  updateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = updateForm.querySelector('[type="submit"]');
    button.disabled = true;
    message('Salvando atualização…');
    try {
      const formData = new FormData(updateForm);
      await APP.api(`/api/admin/citizen-requests/${id}`, { method: 'PATCH', body: JSON.stringify({
        status: formData.get('status'),
        forwarded_to: formData.get('forwarded_to'),
        public_update: formData.get('public_update'),
        internal_note: formData.get('internal_note')
      }) });
      updateForm.elements.public_update.value = '';
      updateForm.elements.internal_note.value = '';
      message('Atualização registrada com sucesso.');
      await loadDetail();
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });
  requireSession().then((ready) => { if (ready) loadDetail(); });
})();
