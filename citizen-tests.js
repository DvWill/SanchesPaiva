const assert = require('node:assert/strict');
const fs = require('fs');
const {
  CATEGORIES,
  STATUSES,
  STATUS_LABELS,
  cleanText,
  normalizePhone,
  normalizeEmail,
  validateCitizenRequest,
  formatSequentialProtocol,
  createWhatsAppUrl
} = require('./citizen-service');
const { validateAttachmentDescriptors, createAttachmentPlan, storageConfig } = require('./citizen-attachments-service');

const validPayload = {
  name: 'Maria da Silva',
  phone: '(61) 99999-9999',
  email: 'Maria@Example.com',
  neighborhood: 'Centro',
  demand_location: 'Rua 10, próximo à praça',
  subject: 'Poste apagado na Rua 10',
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
assert.equal(valid.data.phone_normalized, '61999999999', 'Telefone não foi normalizado');
assert.equal(normalizePhone('+55 (61) 99999-9999'), '61999999999', 'Código do país não foi removido da chave de comparação');
assert.equal(valid.data.email, 'maria@example.com', 'E-mail não foi normalizado');
assert.equal(valid.data.instagram, null, 'Instagram vazio não permaneceu opcional');
assert.equal(valid.data.birthday_day, null, 'Aniversário vazio não permaneceu opcional');

const empty = validateCitizenRequest({});
for (const field of ['name','phone','neighborhood','demand_location','subject','category','message','privacy_consent']) {
  assert(empty.errors[field], `Campo obrigatório sem validação: ${field}`);
}
assert(validateCitizenRequest({...validPayload,email:'inválido'}).errors.email, 'E-mail inválido foi aceito');
assert.equal(normalizeEmail(''), null, 'E-mail opcional vazio foi recusado');
assert(validateCitizenRequest({...validPayload,birthday_day:'31',birthday_month:'4'}).errors.birthday, 'Dia incompatível com o mês foi aceito');
assert(validateCitizenRequest({...validPayload,category:'Outro',category_other:''}).errors.category_other, 'Assunto Outro sem especificação foi aceito');
assert(!normalizePhone('123'), 'Telefone incorreto foi aceito');
assert(!cleanText('<script>\u0000alert(1)</script>', 100).includes('\u0000'), 'Caractere de controle não foi removido');

assert.deepEqual(STATUSES, ['RECEBIDO','EM_ANALISE','EM_ANDAMENTO','AGUARDANDO_CLIENTE','CONCLUIDO','CANCELADO']);
assert.equal(STATUS_LABELS.AGUARDANDO_CLIENTE, 'Aguardando cliente');
assert(CATEGORIES.includes('Meio ambiente'), 'Categoria Meio ambiente ausente');
assert.equal(formatSequentialProtocol('20260921', 1), 'AS-20260921-000001');
assert.equal(formatSequentialProtocol('20260921', 999999), 'AS-20260921-999999');
assert.throws(() => formatSequentialProtocol('20260921', 0), /invalid_protocol_sequence/);

const whatsapp = createWhatsAppUrl({...valid.data,protocol:'AS-20260921-K7M4Q2',created_at:'2026-09-21T15:00:00Z'});
const whatsappText = new URL(whatsapp).searchParams.get('text');
assert(whatsapp.startsWith('https://wa.me/5561998451844?text='), 'Número oficial do WhatsApp incorreto');
assert.equal(whatsappText,'Olá! Registrei uma demanda pelo Alô, Sanches. Meu protocolo é AS-20260921-K7M4Q2.','Mensagem do WhatsApp deve conter somente o protocolo');
const whatsappWithAttachments = createWhatsAppUrl({...valid.data,protocol:'AS-20260921-K7M4Q2',attachment_count:3,attachments:[{},{}]});
assert.equal(whatsappWithAttachments,whatsapp,'Presença de anexos alterou a mensagem enviada ao WhatsApp');

const attachmentDescriptors = [
  {client_id:'51994d24-6c1c-4afb-9e2d-4c39d9a1568c',name:'rua alagada.jpg',size:Math.round(2.4*1024*1024)},
  {client_id:'61994d24-6c1c-4afb-9e2d-4c39d9a1568c',name:'problema.MOV',size:Math.round(18.7*1024*1024)}
];
const validAttachments = validateAttachmentDescriptors(attachmentDescriptors);
assert(validAttachments.valid && validAttachments.files[0].type==='image' && validAttachments.files[1].type==='video','Anexos válidos foram recusados');
assert(!validateAttachmentDescriptors([{...attachmentDescriptors[0],name:'documento.pdf'}]).valid,'Extensão de anexo não permitida foi aceita');
assert(!validateAttachmentDescriptors([{...attachmentDescriptors[0],size:11*1024*1024}]).valid,'Imagem acima de 10 MB foi aceita');
assert(!validateAttachmentDescriptors(Array.from({length:6},(_,index)=>({...attachmentDescriptors[0],client_id:`${index}1994d24-6c1c-4afb-9e2d-4c39d9a1568c`}))).valid,'Mais de cinco anexos foram aceitos');
const attachmentPlan=createAttachmentPlan('AS-20260921-K7M4Q2',validAttachments.files);
assert(attachmentPlan.every((item)=>item.storage_path.startsWith('demandas/AS-20260921-K7M4Q2/')),'Caminho dos anexos não usa o protocolo');
const storageEnv=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','BLOB_READ_WRITE_TOKEN'].map((key)=>[key,process.env[key]]);
const withStorageEnv=(values,check)=>{for(const [key] of storageEnv)delete process.env[key];Object.assign(process.env,values);try{check(storageConfig())}finally{for(const [key,value] of storageEnv){if(value===undefined)delete process.env[key];else process.env[key]=value}}};
withStorageEnv({},(config)=>assert(config.provider==='database'&&!config.configured,'Sem armazenamento externo os anexos devem usar o banco'));
withStorageEnv({BLOB_READ_WRITE_TOKEN:'vercel_blob_rw_teste'},(config)=>assert(config.provider==='vercel-blob'&&config.configured&&config.bucket==='vercel-blob','Vercel Blob não foi selecionado para os anexos'));
withStorageEnv({BLOB_READ_WRITE_TOKEN:'vercel_blob_rw_teste',SUPABASE_URL:'https://exemplo.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'chave'},(config)=>assert(config.provider==='supabase','Supabase configurado deve ter prioridade sobre o Vercel Blob'));
assert(!fs.readFileSync('citizen-attachments.js','utf8').includes("headers: { 'x-upsert'")||fs.readFileSync('citizen-attachments.js','utf8').includes('instruction.headers'),'Upload deve usar os cabeçalhos informados pelo servidor');

const serverSource = fs.readFileSync('server.js','utf8');
const clientSource = fs.readFileSync('citizen.js','utf8');
const adminSource = fs.readFileSync('citizen-admin.js','utf8');
const html = fs.readFileSync('index.html','utf8');
const css = fs.readFileSync('styles.css','utf8');
const schema = fs.readFileSync('database/schema.sql','utf8');

assert(serverSource.includes("app.post('/api/citizen/requests'") && serverSource.includes("app.post('/api/citizen/lookup'"), 'Endpoints públicos ausentes');
assert(serverSource.includes('citizen_protocol_sequences') && serverSource.includes('reserveProtocol') && serverSource.includes('protocolRetryLimit'), 'Reserva atômica e retry de protocolo ausentes');
assert(serverSource.includes('DATABASE_INSERT_FAILED') && clientSource.indexOf("window.open('', '_blank')") < clientSource.indexOf("api('/api/citizen/requests'"), 'Reserva da janela do WhatsApp ausente ou tardia');
assert(clientSource.includes('whatsappWindow.location.replace(result.whatsapp_url)') && clientSource.includes('whatsappWindow?.close()'), 'WhatsApp não depende do sucesso persistido');
assert(clientSource.includes("console.error('Erro de validação'") && serverSource.includes("console.error('Erro de validação'"), 'Falhas de validação não identificam o campo no console/log');
assert(serverSource.includes('protocol=$1 and phone_normalized=$2'), 'Consulta não exige protocolo e telefone');
assert(serverSource.includes("app.patch('/api/admin/citizen-requests/:id'") && serverSource.includes('STATUS_REGRESSION_CONFIRMATION_REQUIRED'), 'Atualização administrativa não protege regressão de status');
assert(adminSource.includes('visibility') && adminSource.includes('observation') && adminSource.includes('admin_email'), 'Painel não separa observação pública e interna');
assert(STATUSES.every((status) => schema.includes(status)), 'Status obrigatório ausente no banco');
assert(html.includes('name="email"') && html.includes('E-mail <em>Opcional</em>'), 'E-mail opcional ausente');
assert(html.includes('privacy_consent') && html.includes('marketing_consent'), 'Consentimentos separados ausentes');
assert(html.includes('Fotos ou vídeos da demanda — opcional') && html.includes('data-attachment-dropzone') && html.includes('multiple'), 'Interface de anexos ausente ou incompleta');
assert(clientSource.includes("'/api/citizen/requests/upload-plan'") && clientSource.includes('Enviando arquivos…'), 'Fluxo de upload do formulário ausente');
assert(serverSource.includes('citizen_request_attachments') && serverSource.includes('verifyUploadedAttachments'), 'Persistência segura dos anexos ausente');
assert(adminSource.includes('request.attachments') && adminSource.includes('demand-attachment'), 'Exibição administrativa dos anexos ausente');
assert(clientSource.includes("request.status === 'CANCELADO' ? 'CONCLUIDO' : 'CANCELADO'") && clientSource.includes('timelineSteps.forEach') && clientSource.includes('is-current') && clientSource.includes('is-future'), 'Linha do tempo condicional não foi implementada');
assert(css.includes('@media(max-width:720px)') && css.includes('.public-timeline li'), 'Responsividade do atendimento ausente');
assert(schema.includes('citizen_requests_protocol_idx') && schema.includes('protocol varchar(24) unique not null') && schema.includes('citizen_protocol_sequences'), 'Unicidade ou sequência de protocolo ausente');
assert(schema.includes('select protocol from citizen_upload_sessions') && schema.includes('greatest(citizen_protocol_sequences.next_value,excluded.next_value)'), 'Contador não foi reconciliado com protocolos já reservados');
assert(serverSource.includes('on conflict(protocol_date) do update') && serverSource.includes('greatest(citizen_protocol_sequences.next_value,excluded.next_value-1)+1'), 'Alocação do protocolo não é atômica ou não avança além dos protocolos existentes');
assert(schema.includes('enable row level security') && schema.includes('revoke all on citizen_requests'), 'RLS ou bloqueio de acesso público direto ausente');
assert(schema.includes('create table if not exists citizen_request_attachments') && schema.includes('create table if not exists citizen_upload_sessions'), 'Estrutura de banco dos anexos ausente');
assert(fs.readFileSync('api/index.js','utf8').includes("require('../server')"), 'Entrada serverless da Vercel ausente');
assert(JSON.parse(fs.readFileSync('vercel.json','utf8')).functions['api/index.js'], 'Função serverless não configurada');

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
    let nextProtocolSequence = 1;
    pool.query = async (sql) => {
      if (sql.startsWith('with protocol_day as')) return {rows:[{date_key:'20260921',sequence:nextProtocolSequence++}]};
      if (sql.startsWith('select * from citizen_requests where submission_key')) return {rows:[]};
      if (sql.startsWith('select r.*')) return {rows:[]};
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      throw new Error(`Consulta inesperada: ${sql}`);
    };
    const validationLogs=[];
    console.error=(...args)=>validationLogs.push(args);
    let response=await post('/api/citizen/requests',{...submission,phone:'123',email:'invalido'});
    let body=await response.json();
    assert.equal(response.status,400,'Telefone e e-mail inválidos foram aceitos');
    assert(validationLogs.some(([message,details])=>message==='Erro de validação'&&details.field==='phone'&&details.value==='123'&&details.error),'Log da validação não identificou telefone, valor e erro');
    assert(validationLogs.some(([message,details])=>message==='Erro de validação'&&details.field==='email'&&details.value==='invalido'&&details.error),'Log da validação não identificou e-mail, valor e erro');
    console.error=originalError;
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
            subject:params[7],
            instagram:params[8],
            birthday_day:params[9],
            birthday_month:params[10],
            category:params[11],
            category_other:params[12],
            message:params[13],
            marketing_consent:params[14],
            status:'RECEBIDO',
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
    response = await post('/api/citizen/requests', submission);
    body = await response.json();
    assert.equal(response.status,201,'Cadastro válido não foi persistido');
    assert(/^AS-[0-9]{8}-[A-Z0-9]{6}$/.test(body.protocol) && body.whatsapp_url,'Cadastro não retornou protocolo e WhatsApp');
    assert.equal(storedRequest.email,'maria@example.com');
    assert.equal(storedRequest.status,'RECEBIDO');

    let retryAttempts = 0;
    pool.query = async (sql) => {
      if (sql.startsWith('with protocol_day as')) return {rows:[{date_key:'20260921',sequence:nextProtocolSequence++}]};
      if (sql.startsWith('select * from citizen_requests where submission_key') || sql.startsWith('select r.*')) return {rows:[]};
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      throw new Error(`Consulta inesperada durante retry: ${sql}`);
    };
    pool.connect = async () => ({
      async query(sql,params) {
        if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('insert into citizen_requests') && retryAttempts++ === 0) {
          const error = new Error('duplicate key value violates unique constraint "citizen_requests_protocol_key"');
          error.code = '23505';
          error.constraint = 'citizen_requests_protocol_key';
          throw error;
        }
        if (sql.startsWith('insert into citizen_requests')) return {rows:[{...storedRequest,id:'31994d24-6c1c-4afb-9e2d-4c39d9a1568c',protocol:params[1]}]};
        if (sql.startsWith('select 1 from citizen_request_updates')) return {rows:[]};
        if (sql.startsWith('insert into citizen_request_updates')) return {rows:[]};
        throw new Error(`Consulta transacional inesperada durante retry: ${sql}`);
      },
      release() {}
    });
    response = await post('/api/citizen/requests', {...submission,submission_key:'21994d24-6c1c-4afb-9e2d-4c39d9a1568c'});
    body = await response.json();
    assert.equal(response.status,201,'Colisão de protocolo não foi repetida automaticamente');
    assert.equal(retryAttempts,2,'Backend não tentou um novo protocolo após colisão');
    assert.notEqual(body.protocol,storedRequest.protocol,'Retry reutilizou protocolo já existente');

    let rapidInsertCount = 0;
    pool.query = async (sql) => {
      if (sql.startsWith('with protocol_day as')) return {rows:[{date_key:'20260921',sequence:nextProtocolSequence++}]};
      if (sql.startsWith('select * from citizen_requests where submission_key') || sql.startsWith('select r.*')) return {rows:[]};
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      throw new Error(`Consulta inesperada durante envios rápidos: ${sql}`);
    };
    pool.connect = async () => ({
      async query(sql,params) {
        if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('insert into citizen_requests')) return {rows:[{...storedRequest,id:`41994d24-6c1c-4afb-9e2d-4c39d9a1568${++rapidInsertCount}`,protocol:params[1]}]};
        if (sql.startsWith('select 1 from citizen_request_updates')) return {rows:[]};
        if (sql.startsWith('insert into citizen_request_updates')) return {rows:[]};
        throw new Error(`Consulta transacional inesperada durante envios rápidos: ${sql}`);
      },
      release() {}
    });
    const rapidResponses = await Promise.all(Array.from({length:5},(_,index)=>post('/api/citizen/requests',{...submission,submission_key:`51994d24-6c1c-4afb-9e2d-4c39d9a1568${index}`})));
    const rapidBodies = await Promise.all(rapidResponses.map((item)=>item.json()));
    assert(rapidResponses.every((item)=>item.status===201),'Envios rápidos válidos não foram concluídos');
    assert.equal(new Set(rapidBodies.map((item)=>item.protocol)).size,rapidBodies.length,'Envios rápidos receberam protocolos repetidos');

    const savedSupabaseUrl=process.env.SUPABASE_URL,savedServiceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    let uploadSession=null;
    let uploadBlobs=new Map();
    const savedAttachmentRows=[];
    pool.query = async (sql,params=[]) => {
      if (sql.startsWith('with protocol_day as')) return {rows:[{date_key:'20260921',sequence:nextProtocolSequence++}]};
      if (sql.startsWith('select * from citizen_requests where submission_key') || sql.startsWith('select r.*')) return {rows:[]};
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      if (sql.startsWith('select attachments from citizen_upload_sessions where expires_at<now()')) return {rows:[]};
      if (sql.startsWith('delete from citizen_upload_sessions where expires_at<now()')) return {rows:[]};
      if (sql.startsWith('select * from citizen_upload_sessions where submission_key=$1 and expires_at>now()')) return {rows:[]};
      if (sql.startsWith('select * from citizen_upload_sessions where id=$1 and submission_key=$2')) return {rows:[uploadSession]};
      if (sql.startsWith('select attachments from citizen_upload_sessions where attachments @>')) return {rows:[{attachments:uploadSession.attachments}]};
      if (sql.startsWith('insert into citizen_attachment_blobs')) {
        uploadBlobs.set(params[0],{storage_path:params[0],mime_type:params[1],size_bytes:params[2]});
        return {rows:[]};
      }
      if (sql.startsWith('select storage_path,mime_type,size_bytes from citizen_attachment_blobs')) return {rows:params[0].map((storagePath)=>uploadBlobs.get(storagePath)).filter(Boolean)};
      throw new Error(`Consulta inesperada no teste de anexos: ${sql}`);
    };
    pool.connect = async () => ({
      async query(sql,params) {
        if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('select * from citizen_upload_sessions where submission_key=$1 for update')) return {rows:[]};
        if (sql.startsWith('insert into citizen_upload_sessions')) {
          uploadSession={id:'61994d24-6c1c-4afb-9e2d-4c39d9a1568c',submission_key:params[0],protocol:params[1],phone_normalized:params[2],request_data:JSON.parse(params[3]),attachments:JSON.parse(params[4]),expires_at:new Date(Date.now()+3600000)};
          return {rows:[uploadSession]};
        }
        if (sql.startsWith('insert into citizen_requests')) return {rows:[{...storedRequest,id:'71994d24-6c1c-4afb-9e2d-4c39d9a1568c',protocol:params[1],created_at:'2026-09-21T15:00:00Z'}]};
        if (sql.startsWith('select 1 from citizen_request_updates')) return {rows:[]};
        if (sql.startsWith('insert into citizen_request_updates')) return {rows:[]};
        if (sql.startsWith('insert into citizen_request_attachments')) {savedAttachmentRows.push(params);return {rows:[]};}
        if (sql.startsWith('delete from citizen_upload_sessions')) return {rows:[]};
        throw new Error(`Consulta transacional inesperada no teste de anexos: ${sql}`);
      },
      release() {}
    });
    for (const [index,file] of [{name:'foto.jpg',type:'image/jpeg',size:4},{name:'video.mp4',type:'video/mp4',size:6}].entries()) {
      const attachmentSubmission={...submission,submission_key:`81994d24-6c1c-4afb-9e2d-4c39d9a1568${index}`};
      const planResponse=await post('/api/citizen/requests/upload-plan',{...attachmentSubmission,attachments:[{client_id:`91994d24-6c1c-4afb-9e2d-4c39d9a1568${index}`,name:file.name,size:file.size}]});
      const plan=await planResponse.json();
      assert.equal(planResponse.status,201,`upload-plan recusou ${file.name}`);
      const uploadResponse=await fetch(`${base}${plan.uploads[0].signed_url}`,{method:'PUT',headers:{'Content-Type':file.type},body:Buffer.alloc(file.size,1)});
      assert.equal(uploadResponse.status,204,`Upload local falhou para ${file.name}`);
      const savedResponse=await post('/api/citizen/requests',{submission_key:attachmentSubmission.submission_key,upload_session_id:plan.upload_session_id});
      const savedBody=await savedResponse.json();
      assert.equal(savedResponse.status,201,`Demanda com ${file.type} não foi registrada`);
      assert.equal(savedBody.attachment_count,1,`Anexo ${file.name} não foi associado à demanda`);
    }
    assert.deepEqual(savedAttachmentRows.map((params)=>params[1]),['image','video'],'Tipos de anexo foram persistidos incorretamente');
    process.env.SUPABASE_URL=savedSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY=savedServiceRoleKey;

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
    assert.equal(response.status,500,'Falha no banco não foi tratada');
    assert.equal(body.code,'DATABASE_INSERT_FAILED','Falha no banco não retornou código útil');
    assert(!body.protocol && !body.whatsapp_url,'Falha no banco retornou protocolo ou WhatsApp');

    pool.query = async (sql) => {
      if (sql.startsWith('with protocol_day as')) return {rows:[{date_key:'20260921',sequence:nextProtocolSequence++}]};
      if (sql.startsWith('select * from citizen_requests where submission_key')) return {rows:[]};
      if (sql.startsWith('select r.*')) return {rows:[]};
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      throw new Error(`Consulta inesperada: ${sql}`);
    };
    pool.connect = async () => ({
      async query(sql) {
        if (sql === 'begin' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('insert into citizen_requests')) {
          const error = new Error('duplicate key value violates unique constraint "citizen_requests_protocol_key"');
          error.code = '23505';
          error.constraint = 'citizen_requests_protocol_key';
          throw error;
        }
        throw new Error(`Consulta transacional inesperada: ${sql}`);
      },
      release() {}
    });
    response = await post('/api/citizen/requests', {...submission,submission_key:'32994d24-6c1c-4afb-9e2d-4c39d9a1568c'});
    body = await response.json();
    assert.equal(response.status,409,'Esgotamento de colisões de protocolo não retornou conflito');
    assert(!body.protocol && !body.whatsapp_url,'Colisão retornou protocolo ou WhatsApp');
    console.error = originalError;

    pool.query = async (sql, params) => {
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      if (sql.startsWith('select id,protocol')) {
        return params[1] === storedRequest.phone_normalized ? {rows:[storedRequest]} : {rows:[]};
      }
      if (sql.startsWith('select status,public_message')) return {rows:[
        {status:'RECEBIDO',public_message:'Demanda registrada.',created_at:'2026-09-21T15:00:00Z'},
        {status:'EM_ANALISE',public_message:null,created_at:'2026-09-21T16:00:00Z'}
      ]};
      throw new Error(`Consulta inesperada: ${sql}`);
    };
    response = await post('/api/citizen/lookup',{protocol:storedRequest.protocol,phone:'(61) 99999-9999'});
    body = await response.json();
    assert.equal(response.status,200,'Consulta correta falhou');
    assert.equal(body.subject,'Poste apagado na Rua 10');
    assert.equal(body.category,'Iluminação pública');
    assert.equal(body.demand_location,'Rua 10, próximo à praça');
    assert.equal(body.status_label,'Recebido');
    assert(!('phone_normalized' in body) && !('email' in body) && !('name' in body) && !('message' in body),'Consulta pública expôs dados pessoais');
    response = await post('/api/citizen/lookup',{protocol:storedRequest.protocol,phone:'(61) 98888-8888'});
    body = await response.json();
    assert.equal(response.status,404,'Telefone incorreto revelou ou localizou a demanda');
    assert.equal(body.error,'Não encontramos uma solicitação com este protocolo e telefone. Confira os dados informados e tente novamente.');

    const adminId='41994d24-6c1c-4afb-9e2d-4c39d9a1568c',requestId=storedRequest.id;
    pool.query = async (sql) => sql.startsWith('select a.id,a.email') ? {rows:[{id:adminId,email:'admin@example.com'}]} : (()=>{throw new Error(`Consulta administrativa inesperada: ${sql}`)})();
    let auditParams;
    pool.connect = async () => ({
      async query(sql,params) {
        if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('select * from citizen_requests')) return {rows:[{...storedRequest,status:'RECEBIDO',forwarded_to:null}]};
        if (sql.startsWith('update citizen_requests')) return {rows:[{...storedRequest,status:params[0],forwarded_to:params[1]}]};
        if (sql.startsWith('insert into citizen_request_updates')) { auditParams=params; return {rows:[]}; }
        throw new Error(`Transação administrativa inesperada: ${sql}`);
      },release(){}
    });
    response = await fetch(`${base}/api/admin/citizen-requests/${requestId}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','Cookie':'admin_session=test'},
      body:JSON.stringify({status:'EM_ANALISE',forwarded_to:'Secretaria responsável',visibility:'public',observation:'Demanda em análise.'})
    });
    assert.equal(response.status,200,'Atualização administrativa falhou');
    assert.equal(auditParams[7],adminId,'Histórico não identificou o administrador');
    assert.equal(auditParams[6],true,'Atualização pública não foi marcada como pública');
    assert.equal(auditParams[3],'Demanda em análise.');

    pool.query = async (sql) => {
      if (sql.startsWith('insert into citizen_rate_limits')) return {rows:[{hits:1}]};
      if (sql.startsWith('select id,protocol')) return {rows:[{...storedRequest,status:'EM_ANALISE',updated_at:'2026-09-21T16:00:00Z'}]};
      if (sql.startsWith('select status,public_message')) return {rows:[
        {status:'RECEBIDO',public_message:'Demanda registrada.',created_at:'2026-09-21T15:00:00Z'},
        {status:'EM_ANALISE',public_message:auditParams[3],created_at:'2026-09-21T16:00:00Z'}
      ]};
      throw new Error(`Consulta pública inesperada: ${sql}`);
    };
    response = await post('/api/citizen/lookup',{protocol:storedRequest.protocol,phone:'(61) 99999-9999'});
    body = await response.json();
    assert.equal(body.status,'EM_ANALISE','Mudança administrativa não apareceu na consulta pública');
    assert(body.history.some((update)=>update.status==='EM_ANALISE'&&update.public_message==='Demanda em análise.'),'Linha do tempo pública não recebeu a atualização');

    pool.query = async (sql) => sql.startsWith('select a.id,a.email') ? {rows:[{id:adminId,email:'admin@example.com'}]} : (()=>{throw new Error(`Consulta administrativa inesperada: ${sql}`)})();
    pool.connect = async () => ({
      async query(sql) {
        if (sql === 'begin' || sql === 'rollback') return {rows:[]};
        if (sql.startsWith('select * from citizen_requests')) return {rows:[{...storedRequest,status:'EM_ANDAMENTO',forwarded_to:null}]};
        throw new Error(`Regressão não confirmada tentou alterar o banco: ${sql}`);
      },release(){}
    });
    response = await fetch(`${base}/api/admin/citizen-requests/${requestId}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','Cookie':'admin_session=test'},
      body:JSON.stringify({status:'EM_ANALISE',visibility:'internal',observation:'Revisar classificação.'})
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
