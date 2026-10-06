const crypto = require('crypto');

const MAX_ATTACHMENTS = 5;
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_BUCKET = 'citizen-demand-attachments';
const VERCEL_BLOB_BUCKET = 'vercel-blob';
const ALLOWED_FILES = Object.freeze({
  '.jpg': { type: 'image', mimeType: 'image/jpeg', maxBytes: IMAGE_MAX_BYTES },
  '.jpeg': { type: 'image', mimeType: 'image/jpeg', maxBytes: IMAGE_MAX_BYTES },
  '.png': { type: 'image', mimeType: 'image/png', maxBytes: IMAGE_MAX_BYTES },
  '.webp': { type: 'image', mimeType: 'image/webp', maxBytes: IMAGE_MAX_BYTES },
  '.mp4': { type: 'video', mimeType: 'video/mp4', maxBytes: VIDEO_MAX_BYTES },
  '.mov': { type: 'video', mimeType: 'video/quicktime', maxBytes: VIDEO_MAX_BYTES }
});

let bucketReadyPromise;

function extensionOf(name = '') {
  const match = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

function safeFilename(name, fallback = 'arquivo') {
  const extension = extensionOf(name);
  const base = String(name).slice(0, extension ? -extension.length : undefined)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return base || fallback;
}

function validateAttachmentDescriptors(input) {
  const errors = [];
  if (!Array.isArray(input) || input.length < 1) errors.push('Selecione ao menos um arquivo.');
  if (Array.isArray(input) && input.length > MAX_ATTACHMENTS) errors.push(`Você pode enviar no máximo ${MAX_ATTACHMENTS} arquivos.`);
  const seenIds = new Set();
  const files = Array.isArray(input) ? input.slice(0, MAX_ATTACHMENTS).map((item, index) => {
    const name = String(item?.name || '').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180);
    const extension = extensionOf(name);
    const rule = ALLOWED_FILES[extension];
    const size = Number(item?.size);
    const clientId = String(item?.client_id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(clientId) || seenIds.has(clientId)) errors.push(`O arquivo ${index + 1} não pôde ser identificado. Selecione-o novamente.`);
    seenIds.add(clientId);
    if (!rule) errors.push(`${name || `Arquivo ${index + 1}`}: formato não permitido. Use JPG, PNG, WEBP, MP4 ou MOV.`);
    if (!Number.isInteger(size) || size <= 0) errors.push(`${name || `Arquivo ${index + 1}`}: o arquivo está vazio ou possui tamanho inválido.`);
    if (rule && size > rule.maxBytes) errors.push(`${name}: ${rule.type === 'image' ? 'imagens' : 'vídeos'} podem ter no máximo ${rule.maxBytes / 1024 / 1024} MB.`);
    return rule ? { client_id: clientId, name, size, type: rule.type, mime_type: rule.mimeType, extension } : null;
  }).filter(Boolean) : [];
  return { valid: errors.length === 0, errors, files };
}

// Provedores: Supabase Storage, Vercel Blob privado ou, sem nenhum dos dois, o próprio banco (desenvolvimento/testes).
function storageConfig() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = /^https:\/\//.test(url) && Boolean(serviceKey);
  const blob = !supabase && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const provider = supabase ? 'supabase' : blob ? 'vercel-blob' : 'database';
  const bucket = blob ? VERCEL_BLOB_BUCKET : process.env.CITIZEN_ATTACHMENTS_BUCKET || DEFAULT_BUCKET;
  return { provider, url, serviceKey, bucket, configured: provider !== 'database' };
}

// Carregado só quando o Vercel Blob está em uso.
const vercelBlob = () => require('@vercel/blob');

// URLs assinadas do Vercel Blob: o navegador envia direto ao armazenamento, sem passar pela função (limite de 4,5 MB).
async function presignVercelBlob(pathname, operation, options = {}) {
  const { issueSignedToken, presignUrl } = vercelBlob();
  const validUntil = Date.now() + (options.expiresIn || 3600) * 1000;
  const constraints = operation === 'put' ? { allowedContentTypes: [options.mimeType], maximumSizeInBytes: options.maxBytes } : {};
  const token = await issueSignedToken({ pathname, operations: [operation], validUntil, ...constraints });
  const extra = operation === 'put' ? { ...constraints, addRandomSuffix: false, allowOverwrite: true } : {};
  const { presignedUrl } = await presignUrl(token, { operation, pathname, access: 'private', validUntil, ...extra });
  return presignedUrl;
}

function uploadError(attachment, code) {
  const error = new Error(code === 'ATTACHMENT_TYPE_MISMATCH'
    ? `${attachment.name}: o formato recebido não corresponde ao tipo de arquivo selecionado.`
    : `${attachment.name}: o upload ficou incompleto. Remova o arquivo, selecione-o novamente e tente outra vez.`);
  error.code = code;
  error.status = 400;
  return error;
}

function encodedObjectPath(bucket, objectPath) {
  return [bucket, ...String(objectPath).split('/')].map(encodeURIComponent).join('/');
}

async function storageRequest(path, options = {}) {
  const config = storageConfig();
  if (!config.configured) {
    const error = new Error('Armazenamento de anexos não configurado.');
    error.code = 'ATTACHMENT_STORAGE_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }
  const response = await fetch(`${config.url}/storage/v1${path}`, {
    ...options,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      ...(options.body && !(options.body instanceof Buffer) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Falha no armazenamento de anexos.');
    error.code = 'ATTACHMENT_STORAGE_ERROR';
    error.status = response.status >= 500 ? 503 : response.status;
    throw error;
  }
  return data;
}

async function ensureAttachmentBucket() {
  if (!bucketReadyPromise) bucketReadyPromise = (async () => {
    const { bucket } = storageConfig();
    const bucketOptions = {
      public: false,
      file_size_limit: VIDEO_MAX_BYTES,
      allowed_mime_types: [...new Set(Object.values(ALLOWED_FILES).map((item) => item.mimeType))]
    };
    try {
      await storageRequest('/bucket', { method: 'POST', body: JSON.stringify({
        id: bucket,
        name: bucket,
        ...bucketOptions
      }) });
    } catch (error) {
      if (error.status !== 409 && !/already exists/i.test(error.message)) throw error;
    }
    await storageRequest(`/bucket/${encodeURIComponent(bucket)}`, { method: 'PUT', body: JSON.stringify(bucketOptions) });
    return true;
  })().catch((error) => { bucketReadyPromise = null; throw error; });
  return bucketReadyPromise;
}

function createAttachmentPlan(protocol, descriptors) {
  return descriptors.map((file, index) => ({
    ...file,
    storage_path: `demandas/${protocol}/${String(index + 1).padStart(2, '0')}-${safeFilename(file.name, file.type)}-${crypto.randomBytes(4).toString('hex')}${file.extension}`,
    upload_token: crypto.randomBytes(24).toString('hex')
  }));
}

function localUploadUrl(attachment) {
  const query = new URLSearchParams({ path: attachment.storage_path, token: attachment.upload_token });
  return `/api/citizen/requests/upload-local?${query}`;
}

async function createSignedUploads(attachments) {
  const { provider } = storageConfig();
  if (provider === 'database') {
    return attachments.map((attachment) => ({
      client_id: attachment.client_id,
      path: attachment.storage_path,
      mime_type: attachment.mime_type,
      signed_url: localUploadUrl(attachment),
      headers: { 'Content-Type': attachment.mime_type }
    }));
  }
  if (provider === 'vercel-blob') {
    return Promise.all(attachments.map(async (attachment) => ({
      client_id: attachment.client_id,
      path: attachment.storage_path,
      mime_type: attachment.mime_type,
      signed_url: await presignVercelBlob(attachment.storage_path, 'put', { mimeType: attachment.mime_type, maxBytes: Number(attachment.size) }),
      headers: { 'Content-Type': attachment.mime_type }
    })));
  }
  await ensureAttachmentBucket();
  const { bucket, url } = storageConfig();
  return Promise.all(attachments.map(async (attachment) => {
    const target = encodedObjectPath(bucket, attachment.storage_path);
    const data = await storageRequest(`/object/upload/sign/${target}`, { method: 'POST', headers: { 'x-upsert': 'true' }, body: '{}' });
    const signedPath = data.url || data.signedURL || data.signedUrl;
    if (!signedPath) throw new Error('O armazenamento não retornou uma autorização de upload.');
    return {
      client_id: attachment.client_id,
      path: attachment.storage_path,
      mime_type: attachment.mime_type,
      signed_url: signedPath.startsWith('http') ? signedPath : `${url}/storage/v1${signedPath}`,
      headers: { 'x-upsert': 'true', 'Content-Type': attachment.mime_type }
    };
  }));
}

async function verifyUploadedAttachments(attachments, database) {
  if (storageConfig().provider === 'vercel-blob') {
    const { head, BlobNotFoundError } = vercelBlob();
    await Promise.all(attachments.map(async (attachment) => {
      let stored;
      try {
        stored = await head(attachment.storage_path);
      } catch (error) {
        if (error instanceof BlobNotFoundError) throw uploadError(attachment, 'ATTACHMENT_UPLOAD_INCOMPLETE');
        throw Object.assign(new Error('Falha ao confirmar os anexos no armazenamento.'), { code: 'ATTACHMENT_STORAGE_ERROR', status: 503 });
      }
      if (Number(stored.size) !== Number(attachment.size)) throw uploadError(attachment, 'ATTACHMENT_UPLOAD_INCOMPLETE');
      if (String(stored.contentType || '').toLowerCase() !== attachment.mime_type) throw uploadError(attachment, 'ATTACHMENT_TYPE_MISMATCH');
    }));
    return;
  }
  if (!storageConfig().configured) {
    const paths = attachments.map((attachment) => attachment.storage_path);
    const { rows } = await database.query('select storage_path,mime_type,size_bytes from citizen_attachment_blobs where storage_path = any($1::text[])', [paths]);
    const uploaded = new Map(rows.map((row) => [row.storage_path, row]));
    for (const attachment of attachments) {
      const stored = uploaded.get(attachment.storage_path);
      if (!stored || Number(stored.size_bytes) !== Number(attachment.size)) {
        const error = new Error(`${attachment.name}: o upload ficou incompleto. Remova o arquivo, selecione-o novamente e tente outra vez.`);
        error.code = 'ATTACHMENT_UPLOAD_INCOMPLETE';
        error.status = 400;
        throw error;
      }
      if (stored.mime_type !== attachment.mime_type) {
        const error = new Error(`${attachment.name}: o formato recebido não corresponde ao tipo de arquivo selecionado.`);
        error.code = 'ATTACHMENT_TYPE_MISMATCH';
        error.status = 400;
        throw error;
      }
    }
    return;
  }
  const { bucket } = storageConfig();
  await ensureAttachmentBucket();
  await Promise.all(attachments.map(async (attachment) => {
    const data = await storageRequest(`/object/info/${encodedObjectPath(bucket, attachment.storage_path)}`);
    const metadata = data.metadata || {};
    const actualSize = Number(metadata.size ?? data.size);
    const actualMime = String(metadata.mimetype || metadata.mime_type || data.mimetype || '').toLowerCase();
    if (!Number.isFinite(actualSize) || actualSize !== attachment.size) {
      const error = new Error(`${attachment.name}: o upload ficou incompleto. Remova o arquivo, selecione-o novamente e tente outra vez.`);
      error.code = 'ATTACHMENT_UPLOAD_INCOMPLETE';
      error.status = 400;
      throw error;
    }
    if (actualMime && actualMime !== attachment.mime_type) {
      const error = new Error(`${attachment.name}: o formato recebido não corresponde ao tipo de arquivo selecionado.`);
      error.code = 'ATTACHMENT_TYPE_MISMATCH';
      error.status = 400;
      throw error;
    }
  }));
}

async function signAttachmentDownloads(attachments, expiresIn = 900) {
  if (!attachments.length) return [];
  if (storageConfig().provider === 'vercel-blob') {
    return Promise.all(attachments.map(async (attachment) => {
      try {
        return { ...attachment, url: await presignVercelBlob(attachment.storage_path, 'get', { expiresIn }) };
      } catch {
        return { ...attachment, url: null };
      }
    }));
  }
  if (!storageConfig().configured) return attachments.map((item) => ({
    ...item,
    url: `/api/citizen/attachments/local?${new URLSearchParams({ path: item.storage_path })}`
  }));
  const { bucket, url } = storageConfig();
  return Promise.all(attachments.map(async (attachment) => {
    try {
      const data = await storageRequest(`/object/sign/${encodedObjectPath(bucket, attachment.storage_path)}`, {
        method: 'POST', body: JSON.stringify({ expiresIn })
      });
      const signedPath = data.signedURL || data.signedUrl;
      return { ...attachment, url: signedPath ? `${url}/storage/v1${signedPath}` : null };
    } catch {
      return { ...attachment, url: null };
    }
  }));
}

async function removeAttachmentObjects(attachments, database) {
  const paths = attachments.map((attachment) => attachment.storage_path).filter(Boolean);
  if (!paths.length) return;
  if (!storageConfig().configured) {
    await database?.query('delete from citizen_attachment_blobs where storage_path = any($1::text[])', [paths]);
    return;
  }
  if (storageConfig().provider === 'vercel-blob') {
    await vercelBlob().del(paths);
    return;
  }
  const { bucket } = storageConfig();
  await storageRequest(`/object/${encodeURIComponent(bucket)}`, { method: 'DELETE', body: JSON.stringify({ prefixes: paths }) });
}

module.exports = {
  MAX_ATTACHMENTS,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  DEFAULT_BUCKET,
  ALLOWED_FILES,
  validateAttachmentDescriptors,
  storageConfig,
  createAttachmentPlan,
  createSignedUploads,
  verifyUploadedAttachments,
  signAttachmentDownloads,
  removeAttachmentObjects
};
