const crypto = require('crypto');

const WHATSAPP_NUMBER = '5561998451844';
const CATEGORIES = Object.freeze([
  'Iluminação pública',
  'Buracos e pavimentação',
  'Limpeza urbana',
  'Saúde',
  'Educação',
  'Transporte',
  'Segurança',
  'Esporte e lazer',
  'Emprego e empreendedorismo',
  'Sugestão',
  'Outro'
]);
const STATUSES = Object.freeze([
  'Recebida',
  'Em triagem',
  'Encaminhada ao órgão responsável',
  'Em andamento',
  'Aguardando informações do cidadão',
  'Concluída',
  'Arquivada'
]);

function cleanText(value, maxLength, multiline = false) {
  const normalized = String(value ?? '').normalize('NFKC').replace(/\u0000/g, '');
  const cleaned = multiline
    ? normalized.replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    : normalized.replace(/[\u0001-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, maxLength);
}

function normalizePhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!/^55\d{10,11}$/.test(digits)) return null;
  return digits;
}

function normalizeInstagram(value) {
  const username = cleanText(value, 32).replace(/^@+/, '');
  if (!username) return null;
  return /^[A-Za-z0-9._]{1,30}$/.test(username) ? `@${username}` : false;
}

function isValidBirthday(day, month) {
  const numericDay = Number(day);
  const numericMonth = Number(month);
  if (!Number.isInteger(numericDay) || !Number.isInteger(numericMonth)) return false;
  const daysPerMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return numericMonth >= 1 && numericMonth <= 12 && numericDay >= 1 && numericDay <= daysPerMonth[numericMonth - 1];
}

function validateCitizenRequest(body = {}) {
  const errors = {};
  const name = cleanText(body.name, 120);
  const phone = normalizePhone(body.phone);
  const neighborhood = cleanText(body.neighborhood, 100);
  const demandLocation = cleanText(body.demand_location, 180);
  const instagram = normalizeInstagram(body.instagram);
  const category = cleanText(body.category, 80);
  const categoryOther = cleanText(body.category_other, 100);
  const message = cleanText(body.message, 3000, true);
  const birthdayDay = body.birthday_day === '' || body.birthday_day == null ? null : Number(body.birthday_day);
  const birthdayMonth = body.birthday_month === '' || body.birthday_month == null ? null : Number(body.birthday_month);

  if (name.length < 3) errors.name = 'Informe o nome completo.';
  if (!phone) errors.phone = 'Informe um telefone ou WhatsApp válido com DDD.';
  if (neighborhood.length < 2) errors.neighborhood = 'Informe o bairro.';
  if (demandLocation.length < 3) errors.demand_location = 'Informe a rua, quadra, setor ou ponto de referência.';
  if (instagram === false) errors.instagram = 'Informe apenas um nome de usuário válido, com ou sem @.';
  if (!CATEGORIES.includes(category)) errors.category = 'Selecione uma categoria válida.';
  if (category === 'Outro' && categoryOther.length < 2) errors.category_other = 'Especifique a categoria da demanda.';
  if (message.length < 10) errors.message = 'Descreva a situação com pelo menos 10 caracteres.';
  if (body.privacy_consent !== true) errors.privacy_consent = 'É necessário aceitar o Aviso de Privacidade.';
  if ((birthdayDay == null) !== (birthdayMonth == null)) errors.birthday = 'Selecione o dia e o mês do aniversário ou deixe ambos vazios.';
  if (birthdayDay != null && birthdayMonth != null && !isValidBirthday(birthdayDay, birthdayMonth)) errors.birthday = 'O dia não é válido para o mês selecionado.';
  if (cleanText(body.website, 200)) errors.website = 'Não foi possível registrar a solicitação.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      name,
      phone_normalized: phone,
      neighborhood,
      demand_location: demandLocation,
      instagram: instagram || null,
      birthday_day: birthdayDay,
      birthday_month: birthdayMonth,
      category,
      category_other: category === 'Outro' ? categoryOther : null,
      message,
      privacy_consent: body.privacy_consent === true,
      marketing_consent: body.marketing_consent === true
    }
  };
}

function protocolDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}`;
}

function createProtocol(date = new Date(), randomBytes = crypto.randomBytes) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let suffix = '';
  for (const byte of bytes) suffix += alphabet[byte & 31];
  return `AS-${protocolDate(date)}-${suffix}`;
}

function displayCategory(request) {
  return request.category === 'Outro' && request.category_other
    ? `Outro — ${request.category_other}`
    : request.category;
}

function createWhatsAppUrl(request) {
  const createdAt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short'
  }).format(new Date(request.created_at));
  const text = [
    'Olá, equipe do gabinete do vereador Sanches Paiva!',
    '',
    'Registrei uma solicitação pelo Alô, Sanches.',
    '',
    `Protocolo: ${request.protocol}`,
    `Nome: ${request.name}`,
    `Telefone: ${request.phone_normalized}`,
    `Bairro: ${request.neighborhood}`,
    `Local da demanda: ${request.demand_location}`,
    `Categoria: ${displayCategory(request)}`,
    '',
    'Demanda:',
    request.message,
    '',
    `Data do registro: ${createdAt}`,
    '',
    'Gostaria de acompanhar o encaminhamento desta solicitação.'
  ].join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

module.exports = {
  CATEGORIES,
  STATUSES,
  WHATSAPP_NUMBER,
  cleanText,
  normalizePhone,
  normalizeInstagram,
  isValidBirthday,
  validateCitizenRequest,
  protocolDate,
  createProtocol,
  displayCategory,
  createWhatsAppUrl
};
