const assert = require('assert');
const fs = require('fs');
const {
  STATUSES,
  cleanText,
  normalizePhone,
  validateCitizenRequest,
  createProtocol,
  createWhatsAppUrl
} = require('./citizen-service');

const validPayload = {
  name: 'Maria da Silva', phone: '(61) 99999-9999', neighborhood: 'Centro',
  demand_location: 'Rua 10, próximo à praça', category: 'Iluminação pública',
  message: 'O poste está apagado há três noites.', privacy_consent: true,
  instagram: '', birthday_day: '', birthday_month: '', website: ''
};

const valid = validateCitizenRequest(validPayload);
assert(valid.valid, 'Cadastro válido foi recusado');
assert.strictEqual(valid.data.phone_normalized, '5561999999999', 'Telefone não foi normalizado');
assert.strictEqual(valid.data.instagram, null, 'Instagram vazio não permaneceu opcional');
assert.strictEqual(valid.data.birthday_day, null, 'Aniversário vazio não permaneceu opcional');

const empty = validateCitizenRequest({});
for (const field of ['name','phone','neighborhood','demand_location','category','message','privacy_consent']) assert(empty.errors[field], `Campo obrigatório sem validação: ${field}`);
assert(validateCitizenRequest({...validPayload,birthday_day:'31',birthday_month:'4'}).errors.birthday, 'Dia incompatível com o mês foi aceito');
assert(validateCitizenRequest({...validPayload,category:'Outro',category_other:''}).errors.category_other, 'Categoria Outro sem especificação foi aceita');
assert(!normalizePhone('123'), 'Telefone incorreto foi aceito');
assert(!cleanText('<script>\u0000alert(1)</script>', 100).includes('\u0000'), 'Caractere de controle não foi removido');

const protocols = new Set(Array.from({length:5000}, () => createProtocol(new Date('2026-09-15T12:00:00-03:00'))));
assert.strictEqual(protocols.size, 5000, 'Protocolos aleatórios repetidos no teste');
for (const protocol of protocols) assert(/^AS-20260915-[A-Z2-9]{6}$/.test(protocol), `Formato inválido: ${protocol}`);

const whatsapp = createWhatsAppUrl({...valid.data,protocol:'AS-20260915-K7M4Q2',created_at:'2026-09-15T15:00:00Z'});
const whatsappText = decodeURIComponent(whatsapp);
assert(whatsapp.startsWith('https://wa.me/5561998451844?text='), 'Número oficial do WhatsApp incorreto');
assert(whatsappText.includes('AS-20260915-K7M4Q2') && whatsappText.includes('Iluminação pública'), 'Mensagem do WhatsApp incompleta');
assert(!whatsappText.includes('Instagram') && !whatsappText.includes('aniversário'), 'Dados opcionais vazaram para o WhatsApp');

const server = fs.readFileSync('server.js','utf8');
const client = fs.readFileSync('citizen.js','utf8');
const admin = fs.readFileSync('citizen-admin.js','utf8');
const html = fs.readFileSync('index.html','utf8');
const css = fs.readFileSync('styles.css','utf8');
const schema = fs.readFileSync('database/schema.sql','utf8');

assert(server.includes("app.post('/api/citizen/requests'") && server.includes("app.post('/api/citizen/lookup'"), 'Endpoints públicos ausentes');
assert(server.includes('on conflict do nothing returning *') && server.includes('submission_key'), 'Proteção contra envio duplicado ausente');
assert(server.includes('Nenhum protocolo foi gerado') && client.indexOf('await api(\'/api/citizen/requests\'') < client.indexOf('window.open(result.whatsapp_url'), 'Falha no banco pode abrir WhatsApp ou gerar protocolo indevido');
assert(client.includes('A abertura automática foi bloqueada') && client.includes('Abrir WhatsApp'), 'Fallback de popup bloqueado ausente');
assert(server.includes('protocol=$1 and phone_normalized=$2'), 'Consulta não exige protocolo e telefone');
assert(server.includes("app.patch('/api/admin/citizen-requests/:id'") && server.includes('citizen_request_updates'), 'Atualização administrativa ou histórico ausente');
assert(admin.includes('public_update') && admin.includes('internal_note') && admin.includes('admin_email'), 'Painel não separa histórico público e interno');
assert(STATUSES.every((status) => schema.includes(status)), 'Status obrigatório ausente no banco');
assert(html.includes('Instagram <em>Opcional</em>') && html.includes('Aniversário — <em>Opcional</em>'), 'Campos opcionais não estão identificados');
assert(html.includes('privacy_consent') && html.includes('marketing_consent'), 'Consentimentos separados ausentes');
assert(css.includes('@media(max-width:720px)') && css.includes('.form-fields,.birthday-fields,.demand-lookup form,.lookup-summary{grid-template-columns:1fr}'), 'Responsividade do atendimento ausente');
assert(schema.includes('citizen_requests') && schema.includes('citizen_request_updates') && schema.includes('citizen_rate_limits'), 'Estrutura de banco incompleta');
assert(schema.includes('enable row level security') && schema.includes('revoke all on citizen_requests'), 'RLS ou bloqueio de acesso público direto ausente');

(async () => {
  const app = require('./server');
  const pool = app.pool;
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const originalError = console.error;
  const http = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => http.once('listening', resolve));
  const base = `http://127.0.0.1:${http.address().port}`;
  const post = (path, body, headers = {}) => fetch(`${base}${path}`, {method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  const submission = {...validPayload,submission_key:'01994d24-6c1c-4afb-9e2d-4c39d9a1568c'};
  try {
    let storedRequest;
    pool.query = async (sql) => {
      if (sql.startsWith('select * from citizen_requests where submission_key')) return {rows:[]};
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      throw new Error(`Consulta inesperada: ${sql}`);
    };
    pool.connect = async () => ({
      async query(sql,params) {
        if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('insert into citizen_requests')) {
          storedRequest={id:'21994d24-6c1c-4afb-9e2d-4c39d9a1568c',protocol:params[1],name:params[2],phone_normalized:params[3],neighborhood:params[4],demand_location:params[5],category:params[9],category_other:params[10],message:params[11],created_at:'2026-09-15T15:00:00Z'};
          return {rows:[storedRequest]};
        }
        if (sql.startsWith('select 1 from citizen_request_updates')) return {rows:[]};
        if (sql.startsWith('insert into citizen_request_updates')) return {rows:[]};
        throw new Error(`Consulta transacional inesperada: ${sql}`);
      },
      release() {}
    });
    let response = await post('/api/citizen/requests', submission);
    let body = await response.json();
    assert.strictEqual(response.status,201,'Cadastro válido não foi persistido');
    assert(/^AS-[0-9]{8}-[A-Z2-9]{6}$/.test(body.protocol) && body.whatsapp_url,'Cadastro não retornou protocolo e WhatsApp');

    pool.query = async (sql) => {
      if (sql.startsWith('select * from citizen_requests where submission_key')) return {rows:[storedRequest]};
      throw new Error('Reenvio duplicado tentou gravar novamente');
    };
    pool.connect = async () => { throw new Error('Reenvio duplicado abriu transação'); };
    response = await post('/api/citizen/requests', submission);
    body = await response.json();
    assert.strictEqual(response.status,200,'Reenvio idempotente falhou');
    assert.strictEqual(body.protocol,storedRequest.protocol,'Reenvio gerou outro protocolo');

    console.error = () => {};
    pool.query = async () => { throw new Error('database offline'); };
    response = await post('/api/citizen/requests', {...submission,submission_key:'31994d24-6c1c-4afb-9e2d-4c39d9a1568c'});
    body = await response.json();
    assert.strictEqual(response.status,503,'Falha no banco não foi tratada');
    assert(!body.protocol && !body.whatsapp_url,'Falha no banco retornou protocolo ou WhatsApp');
    console.error = originalError;

    pool.query = async (sql) => {
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      if (sql.startsWith('select protocol,category')) return {rows:[{protocol:storedRequest.protocol,category:'Saúde',category_other:null,neighborhood:'Centro',status:'Em triagem',created_at:'2026-09-15T15:00:00Z',updated_at:'2026-09-15T16:00:00Z',public_response:'Em análise.'}]};
      if (sql.startsWith('select status,public_message')) return {rows:[{status:'Recebida',public_message:'Solicitação recebida.',created_at:'2026-09-15T15:00:00Z'}]};
      throw new Error(`Consulta inesperada: ${sql}`);
    };
    response = await post('/api/citizen/lookup',{protocol:storedRequest.protocol,phone:'(61) 99999-9999'});
    body = await response.json();
    assert.strictEqual(response.status,200,'Consulta correta falhou');
    assert(!('phone_normalized' in body) && !('instagram' in body) && !('birthday_day' in body),'Consulta pública expôs dados pessoais');
    response = await post('/api/citizen/lookup',{protocol:storedRequest.protocol,phone:'123'});
    assert.strictEqual(response.status,400,'Consulta com telefone incorreto foi aceita');

    const adminId='41994d24-6c1c-4afb-9e2d-4c39d9a1568c',requestId=storedRequest.id;
    pool.query = async (sql) => sql.startsWith('select a.id,a.email') ? {rows:[{id:adminId,email:'admin@example.com'}]} : (()=>{throw new Error(`Consulta administrativa inesperada: ${sql}`)})();
    let auditParams;
    pool.connect = async () => ({
      async query(sql,params) {
        if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('select * from citizen_requests')) return {rows:[{...storedRequest,status:'Recebida',forwarded_to:null}]};
        if (sql.startsWith('update citizen_requests')) return {rows:[{...storedRequest,status:params[0],forwarded_to:params[1]}]};
        if (sql.startsWith('insert into citizen_request_updates')) { auditParams=params; return {rows:[]}; }
        throw new Error(`Transação administrativa inesperada: ${sql}`);
      },release(){}
    });
    response = await fetch(`${base}/api/admin/citizen-requests/${requestId}`,{method:'PATCH',headers:{'Content-Type':'application/json','Cookie':'admin_session=test'},body:JSON.stringify({status:'Em andamento',forwarded_to:'Secretaria responsável',public_update:'Serviço encaminhado.',internal_note:'Contato interno realizado.'})});
    assert.strictEqual(response.status,200,'Atualização administrativa falhou');
    assert.strictEqual(auditParams[7],adminId,'Histórico não identificou o administrador');
    assert.strictEqual(auditParams[6],true,'Atualização pública não foi marcada como pública');
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    console.error = originalError;
    await new Promise((resolve) => http.close(resolve));
  }
  console.log('Todos os testes do Alô, Sanches passaram.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
