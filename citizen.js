(() => {
  const form = document.querySelector('#citizen-form');
  const lookupForm = document.querySelector('#lookup-form');
  if (!form || !lookupForm) return;

  const STEPS = [
    { code: 'RECEBIDO', label: 'Recebido' },
    { code: 'EM_ANALISE', label: 'Em análise' },
    { code: 'EM_ANDAMENTO', label: 'Em andamento' },
    { code: 'AGUARDANDO_CLIENTE', label: 'Aguardando cliente' },
    { code: 'CONCLUIDO', label: 'Concluído' },
    { code: 'CANCELADO', label: 'Cancelado' }
  ];
  const LOOKUP_NOT_FOUND = 'Não encontramos uma solicitação com este protocolo e telefone. Confira os dados informados e tente novamente.';
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
  let isSubmitting = false;
  let isLookingUp = false;
  const isDevelopment = ['localhost', '127.0.0.1'].includes(location.hostname);

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
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
    return /^\d{10,11}$/.test(digits) ? digits : null;
  };
  const maskPhone = (value) => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
    digits = digits.slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  const maskProtocol = (value) => {
    const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!compact) return '';
    const body = compact.startsWith('AS') ? compact.slice(2) : compact;
    const date = body.slice(0, 8).replace(/\D/g, '');
    const suffix = body.slice(8, 14).replace(/[^A-Z0-9]/g, '');
    return `AS${date ? `-${date}` : ''}${suffix ? `-${suffix}` : ''}`;
  };
  const newSubmissionKey = () => globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    return (character === 'x' ? random : (random & 3 | 8)).toString(16);
  });
  const api = async (url, options = {}) => {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
    } catch (fetchError) {
      console.error('ERRO DE REDE:', fetchError);
      const error = new Error('Não foi possível conectar ao serviço agora. Verifique sua conexão e tente novamente.');
      error.kind = 'network';
      throw error;
    }

    const rawText = await response.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { raw_response: rawText };
    }

    if (!response.ok) {
      console.error('ERRO API ALÔ SANCHES', {
        url,
        method: options.method || 'GET',
        status: response.status,
        statusText: response.statusText,
        response: data
      });
      const error = new Error(data?.error || data?.message || `Erro HTTP ${response.status}: ${response.statusText}`);
      error.fields = data?.fields || {};
      error.status = response.status;
      error.code = data?.code;
      error.response = data;
      throw error;
    }
    return data;
  };
  const formatDate = (value) => value ? new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short'
  }).format(new Date(value)) : '';

  function prepareErrorAssociations(targetForm) {
    targetForm.querySelectorAll('.input').forEach((group) => {
      const control = group.querySelector('input,select,textarea');
      const error = group.querySelector('small');
      if (!control || !error || !control.name) return;
      if (!control.id) control.id = `${targetForm.id}-${control.name}`;
      if (!error.id) error.id = `${control.id}-error`;
      control.setAttribute('aria-describedby', error.id);
    });
  }
  prepareErrorAssociations(form);
  prepareErrorAssociations(lookupForm);
  const privacyError = document.querySelector('[data-error-for="privacy_consent"]');
  privacyError.id = 'privacy-consent-error';
  form.elements.privacy_consent.setAttribute('aria-describedby', privacyError.id);

  function fieldGroup(targetForm, name) {
    return targetForm.elements[name]?.closest('.input') || null;
  }
  function setError(targetForm, name, message = '') {
    if (targetForm === form && name === 'privacy_consent') {
      const target = document.querySelector('[data-error-for="privacy_consent"]');
      target.textContent = message;
      form.elements.privacy_consent.setAttribute('aria-invalid', String(Boolean(message)));
      return;
    }
    if (targetForm === form && name === 'birthday') {
      setError(form, 'birthday_day', message);
      setError(form, 'birthday_month', message);
      return;
    }
    const group = fieldGroup(targetForm, name);
    if (!group) return;
    group.classList.toggle('invalid', Boolean(message));
    const control = targetForm.elements[name];
    control?.setAttribute('aria-invalid', String(Boolean(message)));
    const target = group.querySelector('small');
    if (target) target.textContent = message;
  }
  function clearErrors(targetForm) {
    targetForm.querySelectorAll('.input').forEach((group) => group.classList.remove('invalid'));
    targetForm.querySelectorAll('.input small').forEach((node) => { node.textContent = ''; });
    targetForm.querySelectorAll('[aria-invalid]').forEach((node) => node.setAttribute('aria-invalid', 'false'));
    if (targetForm === form) document.querySelector('[data-error-for="privacy_consent"]').textContent = '';
  }
  function validBirthday(day, month) {
    const limits = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return month >= 1 && month <= 12 && day >= 1 && day <= limits[month - 1];
  }
  function validateForm() {
    clearErrors(form);
    const payload = {
      submission_key: submissionKey || newSubmissionKey(),
      name: text(form.elements.name.value, 120),
      phone: form.elements.phone.value,
      email: text(form.elements.email.value, 160),
      neighborhood: text(form.elements.neighborhood.value, 100),
      demand_location: text(form.elements.demand_location.value, 180),
      subject: text(form.elements.subject.value, 160),
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
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email)) errors.email = 'Informe um e-mail válido ou deixe o campo vazio.';
    if (payload.neighborhood.length < 2) errors.neighborhood = 'Informe o bairro.';
    if (payload.demand_location.length < 3) errors.demand_location = 'Informe a rua, quadra, setor ou ponto de referência.';
    if (payload.subject.length < 3) errors.subject = 'Resuma o assunto da demanda.';
    if (payload.instagram && !/^@?[A-Za-z0-9._]{1,30}$/.test(payload.instagram)) errors.instagram = 'Informe um usuário válido, com ou sem @.';
    if (!payload.category) errors.category = 'Selecione o assunto da demanda.';
    if (payload.category === 'Outro' && payload.category_other.length < 2) errors.category_other = 'Especifique o assunto.';
    if (payload.message.length < 10) errors.message = 'Descreva a situação com pelo menos 10 caracteres.';
    if (!payload.privacy_consent) errors.privacy_consent = 'É necessário aceitar o Aviso de Privacidade.';
    const day = Number(payload.birthday_day), month = Number(payload.birthday_month);
    if (Boolean(payload.birthday_day) !== Boolean(payload.birthday_month)) errors.birthday = 'Selecione o dia e o mês ou deixe ambos vazios.';
    else if (payload.birthday_day && !validBirthday(day, month)) errors.birthday = 'O dia não é válido para o mês selecionado.';
    Object.entries(errors).forEach(([name, message]) => setError(form, name, message));
    const first = Object.keys(errors)[0];
    if (first) {
      form.querySelector('.form-status').className = 'form-status full error';
      form.querySelector('.form-status').textContent = 'Revise os campos destacados antes de enviar.';
      form.elements[first === 'birthday' ? 'birthday_day' : first]?.focus();
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
      setError(form, 'category_other');
    }
  }
  category.addEventListener('change', toggleOtherCategory);
  toggleOtherCategory();

  for (const phoneInput of [form.elements.phone, lookupForm.elements.phone]) {
    phoneInput.addEventListener('input', () => { phoneInput.value = maskPhone(phoneInput.value); });
  }
  lookupForm.elements.protocol.addEventListener('input', () => {
    lookupForm.elements.protocol.value = maskProtocol(lookupForm.elements.protocol.value);
  });
  form.addEventListener('input', (event) => {
    if (event.target.name) setError(form, event.target.name);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const status = form.querySelector('.form-status');
    const payload = validateForm();
    if (!payload) return;
    isSubmitting = true;
    let whatsappWindow = null;
    try {
      whatsappWindow = window.open('', '_blank');
      if (whatsappWindow) {
        whatsappWindow.opener = null;
        whatsappWindow.document.title = 'Abrindo WhatsApp…';
        whatsappWindow.document.body.textContent = 'Registrando sua demanda com segurança…';
      }
    } catch (error) {
      if (isDevelopment) console.warn('O navegador bloqueou a janela do WhatsApp:', error);
    }
    const submittedPhone = form.elements.phone.value;
    submitButton.disabled = true;
    submitButton.classList.add('is-loading');
    submitButton.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Registrando demanda…';
    status.className = 'form-status full';
    status.textContent = 'Salvando sua demanda com segurança…';
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      const result = await api('/api/citizen/requests', { method: 'POST', body: JSON.stringify(payload) });
      if (!/^AS-\d{8}-[A-Z0-9]{6}$/.test(result.protocol || '') || !/^https:\/\/wa\.me\/\d+\?text=/.test(result.whatsapp_url || '')) {
        throw new Error('Resposta inválida do serviço de demandas.');
      }
      successProtocol.textContent = result.protocol;
      successWhatsApp.href = result.whatsapp_url;
      copyStatus.textContent = '';
      lookupForm.elements.protocol.value = result.protocol;
      lookupForm.elements.phone.value = submittedPhone;
      status.classList.add('success');
      status.textContent = `Demanda enviada com sucesso. Protocolo: ${result.protocol}`;
      form.reset();
      toggleOtherCategory();
      submissionKey = null;
      if (typeof successDialog.showModal === 'function') successDialog.showModal();
      else successDialog.setAttribute('open', '');
      if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.replace(result.whatsapp_url);
      else status.textContent += ' Se o WhatsApp não abriu, use o botão no comprovante.';
    } catch (error) {
      whatsappWindow?.close();
      if (isDevelopment) console.error('Falha ao registrar demanda:', error);
      Object.entries(error.fields || {}).forEach(([name, message]) => setError(form, name, message));
      status.classList.add('error');
      status.textContent = Object.keys(error.fields || {}).length || error.status === 400 || error.status === 429
        ? error.message
        : 'Não foi possível registrar sua demanda. Tente novamente.';
      const first = Object.keys(error.fields || {})[0];
      if (first) form.elements[first === 'birthday' ? 'birthday_day' : first]?.focus();
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
      submitButton.classList.remove('is-loading');
      submitButton.removeAttribute('aria-busy');
      submitLabel.textContent = 'Registrar demanda e abrir WhatsApp';
    }
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => {
    if (typeof successDialog.close === 'function') successDialog.close();
    else successDialog.removeAttribute('open');
  }));
  document.querySelector('#copy-protocol').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(successProtocol.textContent);
      copyStatus.textContent = 'Protocolo copiado!';
    } catch {
      const fallback = document.createElement('textarea');
      fallback.value = successProtocol.textContent;
      fallback.setAttribute('readonly', '');
      fallback.style.position = 'fixed';
      fallback.style.opacity = '0';
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand('copy');
      fallback.remove();
      copyStatus.textContent = copied ? 'Protocolo copiado!' : 'Não foi possível copiar. Selecione o protocolo manualmente.';
    }
  });
  document.querySelector('#success-lookup').addEventListener('click', () => {
    if (typeof successDialog.close === 'function') successDialog.close();
    else successDialog.removeAttribute('open');
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
    addSummary(summary, 'Assunto', request.subject);
    addSummary(summary, 'Categoria', request.category);
    addSummary(summary, 'Local', `${request.neighborhood} — ${request.demand_location}`);
    addSummary(summary, 'Data do envio', formatDate(request.created_at));
    addSummary(summary, 'Última atualização', formatDate(request.updated_at));
    addSummary(summary, 'Status atual', request.status_label || STEPS.find((step) => step.code === request.status)?.label || request.status);
    lookupResult.append(title, summary);

    const currentIndex = Math.max(0, STEPS.findIndex((step) => step.code === request.status));
    const updatesByStatus = new Map();
    for (const update of request.history || []) {
      if (!updatesByStatus.has(update.status)) updatesByStatus.set(update.status, []);
      updatesByStatus.get(update.status).push(update);
    }
    const timelineTitle = document.createElement('h5');
    timelineTitle.textContent = 'Andamento';
    const timeline = document.createElement('ol');
    timeline.className = 'public-timeline';
    STEPS.forEach((step, index) => {
      const item = document.createElement('li');
      item.className = index < currentIndex ? 'is-complete' : index === currentIndex ? 'is-current' : 'is-future';
      if (index === currentIndex) item.setAttribute('aria-current', 'step');
      const marker = document.createElement('span');
      marker.className = 'timeline-marker';
      marker.textContent = index < currentIndex ? '✓' : String(index + 1);
      marker.setAttribute('aria-hidden', 'true');
      const body = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = step.label;
      body.append(heading);
      const updates = updatesByStatus.get(step.code) || [];
      if (updates[0]?.created_at) {
        const date = document.createElement('time');
        date.dateTime = updates[0].created_at;
        date.textContent = formatDate(updates[0].created_at);
        body.append(date);
      }
      updates.filter((update) => update.public_message).forEach((update) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = update.public_message;
        body.append(paragraph);
      });
      item.append(marker, body);
      timeline.append(item);
    });
    lookupResult.append(timelineTitle, timeline);
    lookupResult.hidden = false;
    lookupResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  lookupForm.addEventListener('input', (event) => {
    if (event.target.name) setError(lookupForm, event.target.name);
  });
  lookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isLookingUp) return;
    clearErrors(lookupForm);
    const status = lookupForm.querySelector('.lookup-status');
    const button = lookupForm.querySelector('[type="submit"]');
    const buttonLabel = button.querySelector('span');
    const protocol = text(lookupForm.elements.protocol.value, 24).toUpperCase();
    const phone = lookupForm.elements.phone.value;
    let invalid = false;
    if (!/^AS-\d{8}-[A-Z0-9]{6}$/.test(protocol)) {
      setError(lookupForm, 'protocol', 'Informe um protocolo no formato AS-AAAAMMDD-XXXXXX.');
      invalid = true;
    }
    if (!normalizePhone(phone)) {
      setError(lookupForm, 'phone', 'Informe um telefone válido com DDD.');
      invalid = true;
    }
    status.className = 'lookup-status';
    lookupResult.hidden = true;
    if (invalid) {
      status.classList.add('error');
      status.textContent = 'Revise os campos destacados.';
      lookupForm.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    isLookingUp = true;
    button.disabled = true;
    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');
    buttonLabel.textContent = 'Consultando…';
    status.textContent = 'Consultando o andamento…';
    try {
      const request = await api('/api/citizen/lookup', { method: 'POST', body: JSON.stringify({ protocol, phone }) });
      renderLookup(request);
      status.classList.add('success');
      status.textContent = 'Demanda localizada.';
    } catch (error) {
      if (isDevelopment) console.error('Falha ao consultar demanda:', error);
      status.classList.add('error');
      status.textContent = error.status === 404 ? LOOKUP_NOT_FOUND
        : error.kind === 'network' || error.status >= 500
          ? 'Não foi possível conectar ao serviço agora. Tente novamente em instantes.'
          : error.message;
    } finally {
      isLookingUp = false;
      button.disabled = false;
      button.classList.remove('is-loading');
      button.removeAttribute('aria-busy');
      buttonLabel.textContent = 'Consultar andamento';
    }
  });
})();
