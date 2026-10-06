(() => {
  const MAX_FILES = 5;
  const MB = 1024 * 1024;
  const RULES = Object.freeze({
    jpg: { type: 'image', mimeType: 'image/jpeg', maxBytes: 10 * MB },
    jpeg: { type: 'image', mimeType: 'image/jpeg', maxBytes: 10 * MB },
    png: { type: 'image', mimeType: 'image/png', maxBytes: 10 * MB },
    webp: { type: 'image', mimeType: 'image/webp', maxBytes: 10 * MB },
    mp4: { type: 'video', mimeType: 'video/mp4', maxBytes: 50 * MB },
    mov: { type: 'video', mimeType: 'video/quicktime', maxBytes: 50 * MB }
  });

  const uniqueId = () => globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    return (character === 'x' ? random : (random & 3 | 8)).toString(16);
  });
  const extensionOf = (name) => String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  const formatSize = (bytes) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(bytes / MB)} MB`;

  function createCitizenAttachmentUploader(root) {
    if (!root) return null;
    const dropzone = root.querySelector('[data-attachment-dropzone]');
    const input = root.querySelector('input[type="file"]');
    const previewList = root.querySelector('[data-attachment-list]');
    const counter = root.querySelector('[data-attachment-count]');
    const errorBox = root.querySelector('[data-attachment-error]');
    let entries = [];
    let busy = false;

    function setError(message = '') {
      errorBox.textContent = message;
      dropzone.classList.toggle('is-invalid', Boolean(message));
      input.setAttribute('aria-invalid', String(Boolean(message)));
    }

    function validate(file) {
      const rule = RULES[extensionOf(file.name)];
      if (!rule) return `${file.name}: formato não permitido. Use JPG, JPEG, PNG, WEBP, MP4 ou MOV.`;
      if (!file.size) return `${file.name}: o arquivo está vazio.`;
      if (file.size > rule.maxBytes) return `${file.name}: ${rule.type === 'image' ? 'imagens' : 'vídeos'} podem ter no máximo ${rule.maxBytes / MB} MB.`;
      return '';
    }

    function draw() {
      previewList.replaceChildren();
      entries.forEach((entry) => {
        const item = document.createElement('li');
        item.className = 'attachment-preview';
        const media = document.createElement('div');
        media.className = `attachment-preview__media is-${entry.rule.type}`;
        if (entry.rule.type === 'image') {
          const image = document.createElement('img');
          image.src = entry.previewUrl;
          image.alt = '';
          media.append(image);
        } else {
          media.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h7a3 3 0 0 1 3 3v1.5l4-2v11l-4-2V17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z"/></svg>';
        }
        const details = document.createElement('div');
        details.className = 'attachment-preview__details';
        const name = document.createElement('strong');
        name.textContent = entry.file.name;
        name.title = entry.file.name;
        const size = document.createElement('span');
        size.textContent = formatSize(entry.file.size);
        details.append(name, size);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'attachment-preview__remove';
        remove.setAttribute('aria-label', `Remover ${entry.file.name}`);
        remove.disabled = busy;
        remove.innerHTML = '<span aria-hidden="true">×</span><span>Remover</span>';
        remove.addEventListener('click', () => {
          URL.revokeObjectURL(entry.previewUrl);
          entries = entries.filter((candidate) => candidate.id !== entry.id);
          setError();
          draw();
        });
        item.append(media, details, remove);
        previewList.append(item);
      });
      counter.textContent = `${entries.length} de ${MAX_FILES} ${entries.length === 1 ? 'arquivo adicionado' : 'arquivos adicionados'}`;
      counter.hidden = entries.length === 0;
    }

    function addFiles(fileList) {
      if (busy) return;
      const incoming = Array.from(fileList || []);
      const messages = [];
      for (const file of incoming) {
        if (entries.length >= MAX_FILES) {
          messages.push(`Você pode adicionar no máximo ${MAX_FILES} arquivos.`);
          break;
        }
        const error = validate(file);
        if (error) { messages.push(error); continue; }
        const rule = RULES[extensionOf(file.name)];
        entries.push({ id: uniqueId(), file, rule, previewUrl: URL.createObjectURL(file) });
      }
      input.value = '';
      setError(messages[0] || '');
      draw();
    }

    dropzone.addEventListener('click', () => { if (!busy) input.click(); });
    dropzone.addEventListener('keydown', (event) => {
      if (!busy && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); input.click(); }
    });
    input.addEventListener('change', () => addFiles(input.files));
    for (const eventName of ['dragenter', 'dragover']) dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (!busy) dropzone.classList.add('is-dragging');
    });
    for (const eventName of ['dragleave', 'drop']) dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
    });
    dropzone.addEventListener('drop', (event) => { if (!busy) addFiles(event.dataTransfer.files); });

    draw();
    return {
      get count() { return entries.length; },
      metadata() {
        return entries.map((entry) => ({
          client_id: entry.id,
          name: entry.file.name,
          size: entry.file.size,
          type: entry.rule.type,
          mime_type: entry.rule.mimeType
        }));
      },
      setBusy(value) {
        busy = Boolean(value);
        input.disabled = busy;
        dropzone.classList.toggle('is-disabled', busy);
        dropzone.setAttribute('aria-disabled', String(busy));
        draw();
      },
      async upload(uploadInstructions, onProgress = () => {}) {
        if (!Array.isArray(uploadInstructions) || uploadInstructions.length !== entries.length) throw new Error('Não foi possível preparar todos os anexos para envio.');
        for (let index = 0; index < entries.length; index += 1) {
          const entry = entries[index];
          const instruction = uploadInstructions.find((item) => item.client_id === entry.id);
          if (!instruction?.signed_url) throw new Error(`Não foi possível preparar o envio de ${entry.file.name}.`);
          onProgress(index + 1, entries.length, entry.file.name);
          const typedFile = entry.file.type === entry.rule.mimeType
            ? entry.file
            : new File([entry.file], entry.file.name, { type: entry.rule.mimeType, lastModified: entry.file.lastModified });
          let response;
          try {
            // Cada armazenamento aceita cabeçalhos diferentes; o servidor informa quais usar.
            response = await fetch(instruction.signed_url, {
              method: 'PUT',
              headers: instruction.headers || { 'x-upsert': 'true', 'Content-Type': entry.rule.mimeType },
              body: typedFile
            });
          } catch {
            throw new Error(`A conexão falhou durante o envio de ${entry.file.name}. Tente novamente.`);
          }
          if (!response.ok) throw new Error(`Não foi possível enviar ${entry.file.name}. Verifique sua conexão e tente novamente.`);
        }
      },
      reset() {
        entries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
        entries = [];
        input.value = '';
        setError();
        draw();
      }
    };
  }

  window.createCitizenAttachmentUploader = createCitizenAttachmentUploader;
})();
