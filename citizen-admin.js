(() => {
  const CATEGORIES = ['Iluminação pública','Buracos e pavimentação','Limpeza urbana','Saúde','Educação','Transporte','Segurança','Esporte e lazer','Emprego e empreendedorismo','Sugestão','Outro'];
  const STATUS_LABELS = {
    ENVIADO: 'Enviado',
    ACEITO: 'Aceito',
    PROTOCOLADO: 'Protocolado',
    EM_ANDAMENTO: 'Serviço sendo feito',
    CONCLUIDO: 'Concluído'
  };
  const STATUSES = Object.keys(STATUS_LABELS);
  const message = (value, error = false) => {
    const target = document.querySelector('.admin-message');
    if (!target) return;
    target.textContent = value;
    target.style.color = error ? '#ffaaa5' : '#ffd56b';
  };
  const formatDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
  const formatPhone = (value = '') => {
    let digits = String(value).replace(/\D/g, '');
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
    return digits.length === 11 ? `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
      : digits.length === 10 ? `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}` : value;
  };
  const categoryLabel = (request) => request.category === 'Outro' && request.category_other ? `Outro — ${request.category_other}` : request.category;
  const statusLabel = (status) => STATUS_LABELS[status] || status;
  const fillOptions = (select, options, labels = {}) => options.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labels[value] || value;
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
    fillOptions(filters.elements.status, STATUSES, STATUS_LABELS);

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
        details.textContent = `${request.subject} · ${categoryLabel(request)} · ${request.neighborhood} · ${formatPhone(request.phone_normalized)} · ${formatDate(request.created_at)}`;
        main.append(protocol, title, details);
        const status = document.createElement('span');
        status.className = `status-pill status-${String(request.status).toLowerCase()}`;
        status.textContent = statusLabel(request.status);
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
        const sent = requests.filter((item) => item.status === 'ENVIADO').length;
        const inProgress = requests.filter((item) => ['ACEITO','PROTOCOLADO','EM_ANDAMENTO'].includes(item.status)).length;
        const completed = requests.filter((item) => item.status === 'CONCLUIDO').length;
        document.querySelector('#demand-stats').innerHTML = `<div class="stat"><strong>${requests.length}</strong>${requests.length === 1 ? 'Encontrada' : 'Encontradas'}</div><div class="stat"><strong>${sent}</strong>${sent === 1 ? 'Enviada' : 'Enviadas'}</div><div class="stat"><strong>${inProgress}</strong>Em atendimento</div><div class="stat"><strong>${completed}</strong>${completed === 1 ? 'Concluída' : 'Concluídas'}</div>`;
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
  fillOptions(updateForm.elements.status, STATUSES, STATUS_LABELS);
  let currentStatus = 'ENVIADO';

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
    currentStatus = request.status;
    document.querySelector('#demand-protocol').textContent = request.protocol;
    document.querySelector('#demand-status').textContent = statusLabel(request.status);
    document.querySelector('#demand-message').textContent = request.message;
    const data = document.querySelector('#demand-data');
    data.replaceChildren();
    addDetail(data, 'Nome', request.name);
    addDetail(data, 'Telefone/WhatsApp', formatPhone(request.phone_normalized));
    addDetail(data, 'E-mail', request.email || 'Não informado');
    addDetail(data, 'Bairro', request.neighborhood);
    addDetail(data, 'Local', request.demand_location);
    addDetail(data, 'Assunto', request.subject);
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
      heading.textContent = statusLabel(update.status);
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
        publicNote.textContent = `Observação pública: ${update.public_message}`;
        item.append(publicNote);
      }
      if (update.internal_note) {
        const internal = document.createElement('p');
        internal.className = 'history-internal';
        internal.textContent = `Observação interna: ${update.internal_note}`;
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
  updateForm.elements.visibility.addEventListener('change', () => {
    const publicNote = updateForm.elements.visibility.value === 'public';
    document.querySelector('#observation-help').textContent = publicNote ? 'Será exibida ao cidadão' : 'Somente administradores poderão ver';
    updateForm.elements.observation.placeholder = publicNote
      ? 'Registre o andamento de forma clara e sem dados pessoais desnecessários.'
      : 'Registre informações internas para a equipe.';
  });
  updateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = updateForm.querySelector('[type="submit"]');
    const formData = new FormData(updateForm);
    const nextStatus = String(formData.get('status'));
    const returning = STATUSES.indexOf(nextStatus) < STATUSES.indexOf(currentStatus);
    if (returning && !confirm(`Esta demanda voltará de “${statusLabel(currentStatus)}” para “${statusLabel(nextStatus)}”. Deseja continuar?`)) return;
    button.disabled = true;
    message('Salvando atualização…');
    try {
      await APP.api(`/api/admin/citizen-requests/${id}`, { method: 'PATCH', body: JSON.stringify({
        status: nextStatus,
        forwarded_to: formData.get('forwarded_to'),
        visibility: formData.get('visibility'),
        observation: formData.get('observation'),
        confirm_regression: returning
      }) });
      updateForm.elements.observation.value = '';
      message('Atualização registrada com sucesso.');
      await loadDetail();
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });
  requireSession().then((ready) => { if (ready) loadDetail(); });
})();
