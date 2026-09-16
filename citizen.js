(() => {
  const form = document.querySelector('#citizen-form');
  const lookupForm = document.querySelector('#lookup-form');
  if (!form || !lookupForm) return;

  const successDialog = document.querySelector('#demand-success');
  const successProtocol = document.querySelector('#success-protocol');
  const successWhatsApp = document.querySelector('#success-whatsapp');
  const copyStatus = document.querySelector('#copy-status');
  const lookupResult = document.querySelector('#lookup-result');
  const category = form.elements.category;
  const categoryOtherGroup = document.querySelector('#category-other-group');
  const birthdayDay = form.elements.birthday_day;
  const birthdayMonth = form.elements.birthday_month;
  const submitButton = form.querySelector('[type="submit"]');
  const submitLabel = submitButton.querySelector('span');
  let submissionKey = null;

  for (let day = 1; day <= 31; day += 1) {
    const option = document.createElement('option');
    option.value = String(day);
    option.textContent = String(day).padStart(2, '0');
    birthdayDay.append(option);
  }

  const text = (value, max, multiline = false) => {
    const normalized = String(value || '').normalize('NFKC').replace(/\u0000/g, '');
    const cleaned = multiline
      ? normalized.replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
      : normalized.replace(/[\u0001-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, max);
  };
  const normalizePhone = (value) => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    return /^55\d{10,11}$/.test(digits) ? digits : null;
  };
  const newSubmissionKey = () => globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    return (character === 'x' ? random : (random & 3 | 8)).toString(16);
  });
  const api = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Não foi possível concluir a operação.');
      error.fields = data.fields || {};
      throw error;
    }
    return data;
  };
  const formatDate = (value) => new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short'
  }).format(new Date(value));

  function fieldGroup(name) {
    return form.elements[name]?.closest('.input') || null;
  }
  function setError(name, message = '') {
    if (name === 'privacy_consent') {
      document.querySelector('[data-error-for="privacy_consent"]').textContent = message;
      return;
    }
    if (name === 'birthday') {
      setError('birthday_day', message);
      setError('birthday_month', message);
      return;
    }
    const group = fieldGroup(name);
    if (!group) return;
    group.classList.toggle('invalid', Boolean(message));
    const target = group.querySelector('small');
    if (target) target.textContent = message;
  }
  function clearErrors() {
    form.querySelectorAll('.input').forEach((group) => group.classList.remove('invalid'));
    form.querySelectorAll('.input small,[data-error-for="privacy_consent"]').forEach((node) => { node.textContent = ''; });
  }
  function validBirthday(day, month) {
    const limits = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return month >= 1 && month <= 12 && day >= 1 && day <= limits[month - 1];
  }
  function validateForm() {
    clearErrors();
    const payload = {
      submission_key: submissionKey || newSubmissionKey(),
      name: text(form.elements.name.value, 120),
      phone: form.elements.phone.value,
      neighborhood: text(form.elements.neighborhood.value, 100),
      demand_location: text(form.elements.demand_location.value, 180),
      instagram: text(form.elements.instagram.value, 31),
      birthday_day: birthdayDay.value,
      birthday_month: birthdayMonth.value,
      category: category.value,
      category_other: text(form.elements.category_other.value, 100),
      message: text(form.elements.message.value, 3000, true),
      privacy_consent: form.elements.privacy_consent.checked,
      marketing_consent: form.elements.marketing_consent.checked,
      website: form.elements.website.value
    };
    const errors = {};
    if (payload.name.length < 3) errors.name = 'Informe o nome completo.';
    if (!normalizePhone(payload.phone)) errors.phone = 'Informe um telefone ou WhatsApp válido com DDD.';
    if (payload.neighborhood.length < 2) errors.neighborhood = 'Informe o bairro.';
    if (payload.demand_location.length < 3) errors.demand_location = 'Informe a rua, quadra, setor ou ponto de referência.';
    if (payload.instagram && !/^@?[A-Za-z0-9._]{1,30}$/.test(payload.instagram)) errors.instagram = 'Informe um usuário válido, com ou sem @.';
    if (!payload.category) errors.category = 'Selecione a categoria da demanda.';
    if (payload.category === 'Outro' && payload.category_other.length < 2) errors.category_other = 'Especifique a categoria.';
    if (payload.message.length < 10) errors.message = 'Descreva a situação com pelo menos 10 caracteres.';
    if (!payload.privacy_consent) errors.privacy_consent = 'É necessário aceitar o Aviso de Privacidade.';
    const day = Number(payload.birthday_day), month = Number(payload.birthday_month);
    if (Boolean(payload.birthday_day) !== Boolean(payload.birthday_month)) errors.birthday = 'Selecione o dia e o mês ou deixe ambos vazios.';
    else if (payload.birthday_day && !validBirthday(day, month)) errors.birthday = 'O dia não é válido para o mês selecionado.';
    Object.entries(errors).forEach(([name, message]) => setError(name, message));
    const first = Object.keys(errors)[0];
    if (first) {
      const focusName = first === 'birthday' ? 'birthday_day' : first;
      form.elements[focusName]?.focus();
      return null;
    }
    submissionKey = payload.submission_key;
    return payload;
  }

  function toggleOtherCategory() {
    const active = category.value === 'Outro';
    categoryOtherGroup.hidden = !active;
    form.elements.category_other.required = active;
    if (!active) {
      form.elements.category_other.value = '';
      setError('category_other');
    }
  }
  category.addEventListener('change', toggleOtherCategory);
  toggleOtherCategory();

  form.addEventListener('input', (event) => {
    if (event.target.name) setError(event.target.name);
    if (event.target.name === 'privacy_consent') setError('privacy_consent');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const payload = validateForm();
    if (!payload) return;
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Registrando sua demanda…';
    status.className = 'form-status full';
    status.textContent = '';
    try {
      const result = await api('/api/citizen/requests', { method: 'POST', body: JSON.stringify(payload) });
      successProtocol.textContent = result.protocol;
      successWhatsApp.href = result.whatsapp_url;
      copyStatus.textContent = '';
      if (typeof successDialog.showModal === 'function') successDialog.showModal();
      else successDialog.setAttribute('open', '');
      try { localStorage.setItem('aloSanchesUltimoProtocolo', result.protocol); } catch {}
      lookupForm.elements.protocol.value = result.protocol;
      lookupForm.elements.phone.value = form.elements.phone.value;
      let popup = null;
      try { popup = window.open(result.whatsapp_url, '_blank'); } catch {}
      if (popup) try { popup.opener = null; } catch {}
      else copyStatus.textContent = 'A abertura automática foi bloqueada. Use o botão “Abrir WhatsApp”.';
      status.classList.add('success');
      status.textContent = `Demanda registrada. Protocolo: ${result.protocol}`;
      form.reset();
      toggleOtherCategory();
      submissionKey = null;
    } catch (error) {
      Object.entries(error.fields || {}).forEach(([name, message]) => setError(name, message));
      status.classList.add('error');
      status.textContent = error.message;
      const first = Object.keys(error.fields || {})[0];
      if (first) form.elements[first === 'birthday' ? 'birthday_day' : first]?.focus();
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      submitLabel.textContent = 'Registrar demanda e abrir WhatsApp';
    }
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => successDialog.close()));
  document.querySelector('#copy-protocol').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(successProtocol.textContent);
      copyStatus.textContent = 'Protocolo copiado.';
    } catch {
      const selection = getSelection();
      const range = document.createRange();
      range.selectNodeContents(successProtocol);
      selection.removeAllRanges();
      selection.addRange(range);
      copyStatus.textContent = 'Protocolo selecionado. Use Ctrl+C para copiar.';
    }
  });
  document.querySelector('#success-lookup').addEventListener('click', () => {
    successDialog.close();
    lookupForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lookupForm.elements.protocol.focus({ preventScroll: true });
  });

  function addSummary(container, label, value) {
    const item = document.createElement('div');
    const caption = document.createElement('span');
    const content = document.createElement('strong');
    caption.textContent = label;
    content.textContent = value;
    item.append(caption, content);
    container.append(item);
  }
  function renderLookup(request) {
    lookupResult.replaceChildren();
    const title = document.createElement('h4');
    title.textContent = request.protocol;
    const summary = document.createElement('div');
    summary.className = 'lookup-summary';
    addSummary(summary, 'Categoria', request.category);
    addSummary(summary, 'Bairro', request.neighborhood);
    addSummary(summary, 'Situação atual', request.status);
    addSummary(summary, 'Registrada em', formatDate(request.created_at));
    addSummary(summary, 'Última atualização', formatDate(request.updated_at));
    lookupResult.append(title, summary);
    if (request.public_response) {
      const response = document.createElement('div');
      response.className = 'lookup-response';
      const label = document.createElement('span');
      const paragraph = document.createElement('p');
      label.textContent = 'Resposta pública da equipe';
      paragraph.textContent = request.public_response;
      response.append(label, paragraph);
      lookupResult.append(response);
    }
    const timeline = document.createElement('ol');
    timeline.className = 'public-timeline';
    (request.history || []).forEach((update) => {
      const item = document.createElement('li');
      const heading = document.createElement('strong');
      const date = document.createElement('time');
      heading.textContent = update.status;
      date.dateTime = update.created_at;
      date.textContent = formatDate(update.created_at);
      item.append(heading, date);
      if (update.public_message) {
        const paragraph = document.createElement('p');
        paragraph.textContent = update.public_message;
        item.append(paragraph);
      }
      timeline.append(item);
    });
    lookupResult.append(timeline);
    lookupResult.hidden = false;
  }

  lookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = lookupForm.querySelector('.lookup-status');
    const button = lookupForm.querySelector('[type="submit"]');
    const protocol = text(lookupForm.elements.protocol.value, 24).toUpperCase();
    const phone = lookupForm.elements.phone.value;
    status.className = 'lookup-status';
    lookupResult.hidden = true;
    if (!/^AS-\d{8}-[A-Z2-9]{6}$/.test(protocol) || !normalizePhone(phone)) {
      status.classList.add('error');
      status.textContent = 'Informe um protocolo e um telefone válidos.';
      return;
    }
    button.disabled = true;
    button.textContent = 'Consultando…';
    status.textContent = '';
    try {
      const request = await api('/api/citizen/lookup', { method: 'POST', body: JSON.stringify({ protocol, phone }) });
      renderLookup(request);
      status.classList.add('success');
      status.textContent = 'Andamento localizado.';
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = 'Consultar andamento';
    }
  });

  let lastProtocol = null;
  try { lastProtocol = localStorage.getItem('aloSanchesUltimoProtocolo'); } catch {}
  if (lastProtocol && /^AS-\d{8}-[A-Z2-9]{6}$/.test(lastProtocol)) lookupForm.elements.protocol.value = lastProtocol;
})();
