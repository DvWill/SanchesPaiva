(() => {
  const CATEGORIES = ['Iluminação pública','Buracos e pavimentação','Limpeza urbana','Meio ambiente','Saúde','Educação','Transporte','Segurança','Esporte e lazer','Emprego e empreendedorismo','Sugestão','Outro'];
  const STATUS_LABELS = {
    RECEBIDO: 'Recebido',
    EM_ANALISE: 'Em análise',
    EM_ANDAMENTO: 'Em andamento',
    AGUARDANDO_CLIENTE: 'Aguardando cliente',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado'
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
  const formatSize = (bytes) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(bytes || 0) / 1024 / 1024)} MB`;
  // Visualizador de imagens dos anexos, criado sob demanda.
  let attachmentViewer;
  const openAttachmentViewer = (attachment) => {
    if (!attachmentViewer) {
      attachmentViewer = document.createElement('dialog');
      attachmentViewer.className = 'attachment-viewer';
      attachmentViewer.innerHTML = '<button type="button" class="attachment-viewer__close" aria-label="Fechar imagem">×</button><img alt=""><p></p>';
      attachmentViewer.querySelector('button').addEventListener('click', () => attachmentViewer.close());
      attachmentViewer.addEventListener('click', (event) => { if (event.target === attachmentViewer) attachmentViewer.close(); });
      document.body.append(attachmentViewer);
    }
    attachmentViewer.querySelector('img').src = attachment.url;
    attachmentViewer.querySelector('img').alt = attachment.name;
    attachmentViewer.querySelector('p').textContent = attachment.name;
    attachmentViewer.showModal();
  };
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
        const stats = await APP.api('/api/admin/citizen-request-stats');
        const count = (status) => stats.counts[status] || 0;
        document.querySelector('#demand-stats').innerHTML = `<div class="stat"><strong>${stats.total}</strong>Total</div><div class="stat"><strong>${count('RECEBIDO') + count('EM_ANALISE')}</strong>Pendentes</div><div class="stat"><strong>${count('EM_ANDAMENTO') + count('AGUARDANDO_CLIENTE')}</strong>Em andamento</div><div class="stat"><strong>${count('CONCLUIDO')}</strong>Concluídas</div>`;
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
  let currentStatus = 'RECEBIDO';

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
    const attachmentSection = document.querySelector('#demand-attachments');
    const attachmentList = document.querySelector('#demand-attachments-list');
    const attachments = Array.isArray(request.attachments) ? request.attachments : [];
    attachmentList.replaceChildren();
    attachmentSection.hidden = attachments.length === 0;
    document.querySelector('#demand-attachments-count').textContent = `${attachments.length} de 5`;
    attachments.forEach((attachment) => {
      const card = document.createElement('article');
      card.className = 'demand-attachment';
      const media = document.createElement('div');
      media.className = 'demand-attachment__media';
      if (attachment.type === 'image' && attachment.url) {
        // A imagem abre ampliada no próprio painel.
        const zoom = document.createElement('button');
        zoom.type = 'button';
        zoom.className = 'demand-attachment__zoom';
        zoom.setAttribute('aria-label', `Ampliar ${attachment.name}`);
        const image = document.createElement('img');
        image.src = attachment.url;
        image.alt = '';
        image.loading = 'lazy';
        zoom.append(image);
        zoom.addEventListener('click', () => openAttachmentViewer(attachment));
        media.append(zoom);
      } else if (attachment.type === 'video' && attachment.url) {
        const video = document.createElement('video');
        video.src = attachment.url;
        video.controls = true;
        video.preload = 'metadata';
        video.playsInline = true;
        video.setAttribute('aria-label', `Vídeo ${attachment.name}`);
        media.append(video);
      } else {
        media.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h7a3 3 0 0 1 3 3v1.5l4-2v11l-4-2V17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z"/></svg>';
      }
      const details = document.createElement('div');
      details.className = 'demand-attachment__details';
      const name = document.createElement('strong');
      const meta = document.createElement('span');
      name.textContent = attachment.name;
      name.title = attachment.name;
      meta.textContent = `${attachment.type === 'image' ? 'Imagem' : 'Vídeo'} · ${formatSize(attachment.size)}${attachment.url ? '' : ' · Indisponível'}`;
      details.append(name, meta);
      if (attachment.url) {
        const download = document.createElement('a');
        download.className = 'demand-attachment__download';
        download.href = attachment.url;
        download.target = '_blank';
        download.rel = 'noopener';
        download.textContent = 'Baixar original';
        details.append(download);
      }
      card.append(media, details);
      attachmentList.append(card);
    });
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
