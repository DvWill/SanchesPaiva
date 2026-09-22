const assert = require('node:assert/strict');
const fs = require('fs');
const {
  STATUSES,
  STATUS_LABELS,
  cleanText,
  normalizePhone,
  normalizeEmail,
  validateCitizenRequest,
  createProtocol,
  createWhatsAppUrl
} = require('./citizen-service');

const validPayload = {
  name: 'Maria da Silva',
  phone: '(61) 99999-9999',
  email: 'Maria@Example.com',
  neighborhood: 'Centro',
  demand_location: 'Rua 10, próximo à praça',
  category: 'Iluminação pública',
  message: 'O poste está apagado há três noites.',
  privacy_consent: true,
  instagram: '',
  birthday_day: '',
  birthday_month: '',
  website: ''
};

const valid = validateCitizenRequest(validPayload);
assert(valid.valid, 'Cadastro válido foi recusado');
assert.equal(valid.data.phone_normalized, '5561999999999', 'Telefone não foi normalizado');
assert.equal(valid.data.email, 'maria@example.com', 'E-mail não foi normalizado');
assert.equal(valid.data.instagram, null, 'Instagram vazio não permaneceu opcional');
assert.equal(valid.data.birthday_day, null, 'Aniversário vazio não permaneceu opcional');

const empty = validateCitizenRequest({});
for (const field of ['name','phone','neighborhood','demand_location','category','message','privacy_consent']) {
  assert(empty.errors[field], `Campo obrigatório sem validação: ${field}`);
}
assert(validateCitizenRequest({...validPayload,email:'inválido'}).errors.email, 'E-mail inválido foi aceito');
assert.equal(normalizeEmail(''), null, 'E-mail opcional vazio foi recusado');
assert(validateCitizenRequest({...validPayload,birthday_day:'31',birthday_month:'4'}).errors.birthday, 'Dia incompatível com o mês foi aceito');
assert(validateCitizenRequest({...validPayload,category:'Outro',category_other:''}).errors.category_other, 'Assunto Outro sem especificação foi aceito');
assert(!normalizePhone('123'), 'Telefone incorreto foi aceito');
assert(!cleanText('<script>\u0000alert(1)</script>', 100).includes('\u0000'), 'Caractere de controle não foi removido');

assert.deepEqual(STATUSES, ['ENVIADO','ACEITO','PROTOCOLADO','EM_EXECUCAO','CONCLUIDO']);
assert.equal(STATUS_LABELS.EM_EXECUCAO, 'Serviço sendo feito');
const protocols = new Set(Array.from({length:5000}, () => createProtocol(new Date('2026-09-21T12:00:00-03:00'))));
assert.equal(protocols.size, 5000, 'Protocolos aleatórios repetidos no teste');
for (const protocol of protocols) assert(/^AS-20260921-[A-Z0-9]{6}$/.test(protocol), `Formato inválido: ${protocol}`);

const whatsapp = createWhatsAppUrl({...valid.data,protocol:'AS-20260921-K7M4Q2',created_at:'2026-09-21T15:00:00Z'});
const whatsappText = decodeURIComponent(whatsapp);
assert(whatsapp.startsWith('https://wa.me/5561998451844?text='), 'Número oficial do WhatsApp incorreto');
assert(whatsappText.includes('AS-20260921-K7M4Q2') && whatsappText.includes('Assunto: Iluminação pública'), 'Mensagem do WhatsApp incompleta');
assert(!whatsappText.includes('Instagram') && !whatsappText.includes('aniversário'), 'Dados opcionais vazaram para o WhatsApp');

const serverSource = fs.readFileSync('server.js','utf8');
const clientSource = fs.readFileSync('citizen.js','utf8');
const adminSource = fs.readFileSync('citizen-admin.js','utf8');
const html = fs.readFileSync('index.html','utf8');
const css = fs.readFileSync('styles.css','utf8');
const schema = fs.readFileSync('database/schema.sql','utf8');

assert(serverSource.includes("app.post('/api/citizen/requests'") && serverSource.includes("app.post('/api/citizen/lookup'"), 'Endpoints públicos ausentes');
assert(serverSource.includes('on conflict do nothing returning *') && serverSource.includes('submission_key'), 'Proteção contra envio duplicado ausente');
assert(serverSource.includes('Nenhum protocolo foi gerado') && !clientSource.includes('window.open('), 'WhatsApp pode abrir antes da confirmação persistida');
assert(serverSource.includes('protocol=$1 and phone_normalized=$2'), 'Consulta não exige protocolo e telefone');
assert(serverSource.includes("app.patch('/api/admin/citizen-requests/:id'") && serverSource.includes('STATUS_REGRESSION_CONFIRMATION_REQUIRED'), 'Atualização administrativa não protege regressão de status');
assert(adminSource.includes('visibility') && adminSource.includes('observation') && adminSource.includes('admin_email'), 'Painel não separa observação pública e interna');
assert(STATUSES.every((status) => schema.includes(status)), 'Status obrigatório ausente no banco');
assert(html.includes('name="email"') && html.includes('E-mail <em>Opcional</em>'), 'E-mail opcional ausente');
assert(html.includes('privacy_consent') && html.includes('marketing_consent'), 'Consentimentos separados ausentes');
assert(clientSource.includes('STEPS.forEach') && clientSource.includes('is-current') && clientSource.includes('is-future'), 'Linha do tempo fixa não foi implementada');
assert(css.includes('@media(max-width:720px)') && css.includes('.public-timeline li'), 'Responsividade do atendimento ausente');
assert(schema.includes('citizen_requests_protocol_idx') && schema.includes('protocol varchar(24) unique not null'), 'Unicidade ou índice de protocolo ausente');
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
  const post = (route, body, headers = {}) => fetch(`${base}${route}`, {
    method:'POST',
    headers:{'Content-Type':'application/json',...headers},
    body:JSON.stringify(body)
  });
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
          storedRequest={
            id:'21994d24-6c1c-4afb-9e2d-4c39d9a1568c',
            protocol:params[1],
            name:params[2],
            phone_normalized:params[3],
            email:params[4],
            neighborhood:params[5],
            demand_location:params[6],
            instagram:params[7],
            birthday_day:params[8],
            birthday_month:params[9],
            category:params[10],
            category_other:params[11],
            message:params[12],
            marketing_consent:params[13],
            status:'ENVIADO',
            created_at:'2026-09-21T15:00:00Z',
            updated_at:'2026-09-21T15:00:00Z'
          };
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
    assert.equal(response.status,201,'Cadastro válido não foi persistido');
    assert(/^AS-[0-9]{8}-[A-Z0-9]{6}$/.test(body.protocol) && body.whatsapp_url,'Cadastro não retornou protocolo e WhatsApp');
    assert.equal(storedRequest.email,'maria@example.com');
    assert.equal(storedRequest.status,'ENVIADO');

    pool.query = async (sql) => {
      if (sql.startsWith('select * from citizen_requests where submission_key')) return {rows:[storedRequest]};
      throw new Error('Reenvio duplicado tentou gravar novamente');
    };
    pool.connect = async () => { throw new Error('Reenvio duplicado abriu transação'); };
    response = await post('/api/citizen/requests', submission);
    body = await response.json();
    assert.equal(response.status,200,'Reenvio idempotente falhou');
    assert.equal(body.protocol,storedRequest.protocol,'Reenvio gerou outro protocolo');

    console.error = () => {};
    pool.query = async () => { throw new Error('database offline'); };
    response = await post('/api/citizen/requests', {...submission,submission_key:'31994d24-6c1c-4afb-9e2d-4c39d9a1568c'});
    body = await response.json();
    assert.equal(response.status,503,'Falha no banco não foi tratada');
    assert(!body.protocol && !body.whatsapp_url,'Falha no banco retornou protocolo ou WhatsApp');
    console.error = originalError;

    pool.query = async (sql, params) => {
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      if (sql.startsWith('select id,protocol')) {
        return params[1] === storedRequest.phone_normalized ? {rows:[storedRequest]} : {rows:[]};
      }
      if (sql.startsWith('select status,public_message')) return {rows:[
        {status:'ENVIADO',public_message:'Demanda enviada.',created_at:'2026-09-21T15:00:00Z'},
        {status:'ACEITO',public_message:null,created_at:'2026-09-21T16:00:00Z'}
      ]};
      throw new Error(`Consulta inesperada: ${sql}`);
    };
    response = await post('/api/citizen/lookup',{protocol:storedRequest.protocol,phone:'(61) 99999-9999'});
    body = await response.json();
    assert.equal(response.status,200,'Consulta correta falhou');
    assert.equal(body.subject,'Iluminação pública');
    assert.equal(body.status_label,'Enviado');
    assert(!('phone_normalized' in body) && !('email' in body) && !('name' in body) && !('message' in body),'Consulta pública expôs dados pessoais');
    response = await post('/api/citizen/lookup',{protocol:storedRequest.protocol,phone:'(61) 98888-8888'});
    body = await response.json();
    assert.equal(response.status,404,'Telefone incorreto revelou ou localizou a demanda');
    assert.equal(body.error,'Não foi possível localizar uma demanda com os dados informados. Verifique o protocolo e o telefone e tente novamente.');

    const adminId='41994d24-6c1c-4afb-9e2d-4c39d9a1568c',requestId=storedRequest.id;
    pool.query = async (sql) => sql.startsWith('select a.id,a.email') ? {rows:[{id:adminId,email:'admin@example.com'}]} : (()=>{throw new Error(`Consulta administrativa inesperada: ${sql}`)})();
    let auditParams;
    pool.connect = async () => ({
      async query(sql,params) {
        if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('select * from citizen_requests')) return {rows:[{...storedRequest,status:'ENVIADO',forwarded_to:null}]};
        if (sql.startsWith('update citizen_requests')) return {rows:[{...storedRequest,status:params[0],forwarded_to:params[1]}]};
        if (sql.startsWith('insert into citizen_request_updates')) { auditParams=params; return {rows:[]}; }
        throw new Error(`Transação administrativa inesperada: ${sql}`);
      },release(){}
    });
    response = await fetch(`${base}/api/admin/citizen-requests/${requestId}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','Cookie':'admin_session=test'},
      body:JSON.stringify({status:'ACEITO',forwarded_to:'Secretaria responsável',visibility:'public',observation:'Demanda aceita.'})
    });
    assert.equal(response.status,200,'Atualização administrativa falhou');
    assert.equal(auditParams[7],adminId,'Histórico não identificou o administrador');
    assert.equal(auditParams[6],true,'Atualização pública não foi marcada como pública');
    assert.equal(auditParams[3],'Demanda aceita.');

    pool.query = async (sql) => {
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      if (sql.startsWith('select id,protocol')) return {rows:[{...storedRequest,status:'ACEITO',updated_at:'2026-09-21T16:00:00Z'}]};
      if (sql.startsWith('select status,public_message')) return {rows:[
        {status:'ENVIADO',public_message:'Demanda enviada.',created_at:'2026-09-21T15:00:00Z'},
        {status:'ACEITO',public_message:auditParams[3],created_at:'2026-09-21T16:00:00Z'}
      ]};
      throw new Error(`Consulta pública inesperada: ${sql}`);
    };
    response = await post('/api/citizen/lookup',{protocol:storedRequest.protocol,phone:'(61) 99999-9999'});
    body = await response.json();
    assert.equal(body.status,'ACEITO','Mudança administrativa não apareceu na consulta pública');
    assert(body.history.some((update)=>update.status==='ACEITO'&&update.public_message==='Demanda aceita.'),'Linha do tempo pública não recebeu a atualização');

    pool.query = async (sql) => sql.startsWith('select a.id,a.email') ? {rows:[{id:adminId,email:'admin@example.com'}]} : (()=>{throw new Error(`Consulta administrativa inesperada: ${sql}`)})();
    pool.connect = async () => ({
      async query(sql) {
        if (sql === 'begin' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('select * from citizen_requests')) return {rows:[{...storedRequest,status:'PROTOCOLADO',forwarded_to:null}]};
        throw new Error(`Regressão não confirmada tentou alterar o banco: ${sql}`);
      },release(){}
    });
    response = await fetch(`${base}/api/admin/citizen-requests/${requestId}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','Cookie':'admin_session=test'},
      body:JSON.stringify({status:'ACEITO',visibility:'internal',observation:'Revisar classificação.'})
    });
    assert.equal(response.status,409,'Regressão de status sem confirmação foi aceita');
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    console.error = originalError;
    await new Promise((resolve) => http.close(resolve));
  }
  console.log('Todos os testes do Alô, Sanches passaram.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
