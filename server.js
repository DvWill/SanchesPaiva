require('dotenv').config();
const express=require('express'),path=require('path'),crypto=require('crypto'),bcrypt=require('bcryptjs'),multer=require('multer'),fs=require('fs');
const {Pool}=require('pg');
const {CATEGORIES,STATUSES,cleanText,normalizePhone,validateCitizenRequest,formatSequentialProtocol,displayCategory,statusLabel,createWhatsAppUrl}=require('./citizen-service');
const {ALLOWED_FILES,VIDEO_MAX_BYTES,validateAttachmentDescriptors,storageConfig,createAttachmentPlan,createSignedUploads,verifyUploadedAttachments,signAttachmentDownloads,removeAttachmentObjects}=require('./citizen-attachments-service');
const app=express(),root=__dirname,port=Number(process.env.PORT||3000);
const databaseUrl=process.env.DATABASE_URL;
const isProduction=process.env.NODE_ENV==='production'||process.env.VERCEL==='1';
const environmentErrors=[...(!databaseUrl?['DATABASE_URL']:[]),...(isProduction&&!process.env.RATE_LIMIT_SECRET?['RATE_LIMIT_SECRET']:[])];
const localDatabase=/^(?:postgres(?:ql)?:\/\/)?(?:[^@]+@)?(?:localhost|127\.0\.0\.1)(?::|\/)/i.test(databaseUrl||'');
const pool=new Pool({connectionString:databaseUrl,ssl:localDatabase?false:{rejectUnauthorized:process.env.DATABASE_SSL_REJECT_UNAUTHORIZED!=='false'}});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:12},fileFilter:(_r,f,cb)=>cb(null,['image/jpeg','image/png','image/webp','image/avif'].includes(f.mimetype))});
app.use(express.json({limit:'1mb'}));
app.set('trust proxy',process.env.TRUST_PROXY==='1'?1:false);
app.disable('x-powered-by');
app.use((_req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});next()});
app.use(['/api/citizen','/api/admin'],(req,res,next)=>{res.set('Cache-Control','no-store');const origin=req.get('origin');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&origin){try{if(new URL(origin).host!==req.get('host'))return res.status(403).json({error:'Origem da solicitação não permitida.'})}catch{return res.status(403).json({error:'Origem da solicitação não permitida.'})}}next()});
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),decodeURIComponent(x.slice(i+1))]}));
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
const fields=['title','slug','excerpt','content','cover_url','cover_alt','category','tags','gallery','status','featured','source_url','seo_title','seo_description','published_at'];
const publicRequestFields='id,protocol,subject,category,category_other,neighborhood,demand_location,status,created_at,updated_at';
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROTOCOL_PATTERN=/^AS-[0-9]{8}-[A-Z0-9]{6}$/;
const rateSecret=process.env.RATE_LIMIT_SECRET||'configure-rate-limit-secret';
const rateIdentifier=(req,scope,phone='')=>hash(`${rateSecret}|${scope}|${req.ip||req.socket.remoteAddress||'unknown'}|${phone}`);
const sameSecret=(left,right)=>{const a=Buffer.from(String(left||'')),b=Buffer.from(String(right||''));return a.length===b.length&&a.length>0&&crypto.timingSafeEqual(a,b)};
const protocolRetryLimit=5;
const logEvent=(scope,message,details)=>console.info(`[${scope}] ${message}`,details||'');
const logValidation=(body,errors)=>Object.entries(errors).forEach(([field,error])=>console.error('Erro de validação',{field,value:body?.[field],error}));
async function reserveProtocol(client){
  logEvent('PROTOCOL','Tentando gerar protocolo');
  const {rows}=await client.query(`
    with protocol_day as (
      select (now() at time zone 'America/Sao_Paulo')::date as value,
             to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD') as date_key
    ), existing_protocols as (
      select protocol from citizen_requests
      union all
      select protocol from citizen_upload_sessions
    ), sequence_seed as (
      select day.value as protocol_date,
             coalesce(max(case
               when existing.protocol ~ '^AS-[0-9]{8}-[0-9]{6}$'
               then substring(existing.protocol from 13 for 6)::bigint
             end),0)+2 as next_value
      from protocol_day day
      left join existing_protocols existing on substring(existing.protocol from 4 for 8)=day.date_key
      group by day.value
    )
    insert into citizen_protocol_sequences(protocol_date,next_value,updated_at)
    select protocol_date,next_value,now() from sequence_seed
    on conflict(protocol_date) do update
    set next_value=greatest(citizen_protocol_sequences.next_value,excluded.next_value-1)+1,
        updated_at=now()
    returning to_char(protocol_date,'YYYYMMDD') as date_key,next_value-1 as sequence
  `.trim());
  const protocol=formatSequentialProtocol(rows[0].date_key,Number(rows[0].sequence));
  logEvent('PROTOCOL',`Protocolo criado: ${protocol}`);
  return protocol;
}
const isUniqueViolation=error=>error?.code==='23505';
const isProtocolUniqueViolation=error=>isUniqueViolation(error)&&['citizen_requests_protocol_key','citizen_upload_sessions_protocol_key'].includes(error.constraint);
const protocolRetryError=()=>Object.assign(new Error('protocol_reservation_retry_exhausted'),{code:'PROTOCOL_COLLISION',status:409});
async function consumeRateLimit(req,scope,phone,maxHits,windowMinutes){const identifier=rateIdentifier(req,scope,phone);const {rows}=await pool.query("insert into citizen_rate_limits(identifier_hash,window_started_at,hits) values($1,now(),1) on conflict(identifier_hash) do update set hits=case when citizen_rate_limits.window_started_at<now()-($2::text||' minutes')::interval then 1 else citizen_rate_limits.hits+1 end,window_started_at=case when citizen_rate_limits.window_started_at<now()-($2::text||' minutes')::interval then now() else citizen_rate_limits.window_started_at end returning hits",[identifier,String(windowMinutes)]);return rows[0].hits<=maxHits}
async function requireAdmin(req,res,next){try{const token=cookies(req).admin_session;if(!token)return res.status(401).json({error:'Não autenticado.'});const {rows}=await pool.query('select a.id,a.email from admin_sessions s join admins a on a.id=s.admin_id where s.token_hash=$1 and s.expires_at>now()',[hash(token)]);if(!rows[0])return res.status(401).json({error:'Sessão expirada.'});req.admin=rows[0];next()}catch(e){next(e)}}
async function requireAdminPage(req,res,next){try{const token=cookies(req).admin_session;if(!token)return res.redirect(303,'/admin/login');const {rows}=await pool.query('select a.id,a.email from admin_sessions s join admins a on a.id=s.admin_id where s.token_hash=$1 and s.expires_at>now()',[hash(token)]);if(!rows[0])return res.redirect(303,'/admin/login');req.admin=rows[0];next()}catch(e){next(e)}}
const statusPosition=status=>STATUSES.indexOf(status);
const publicLookupError='Não encontramos uma solicitação com este protocolo e telefone. Confira os dados informados e tente novamente.';
app.get('/api/health',async(_q,res,next)=>{if(environmentErrors.length)return res.status(503).json({ok:false,error:`Configuração ausente: ${environmentErrors.join(', ')}`,code:'ENVIRONMENT_NOT_CONFIGURED'});try{await pool.query('select 1');res.json({ok:true})}catch(e){next(e)}});
app.use('/api',(req,res,next)=>isProduction&&environmentErrors.length?res.status(503).json({error:'Serviço temporariamente indisponível por configuração incompleta.',code:'ENVIRONMENT_NOT_CONFIGURED'}):next());

app.get('/api/citizen/attachments/local',requireAdmin,async(req,res)=>{
  try{
    if(storageConfig().configured)return res.status(404).end();
    const storagePath=String(req.query.path||'').slice(0,500);
    const {rows}=await pool.query('select mime_type,data from citizen_attachment_blobs where storage_path=$1',[storagePath]);
    if(!rows[0])return res.status(404).json({error:'Anexo não encontrado.'});
    res.set({'Content-Type':rows[0].mime_type,'Content-Disposition':'inline','Cache-Control':'private, no-store'}).send(rows[0].data);
  }catch(error){if(!isProduction)console.error('Falha ao abrir anexo local:',error);res.status(500).json({error:'Não foi possível abrir o anexo.'})}
});

app.put('/api/citizen/requests/upload-local',express.raw({type:()=>true,limit:VIDEO_MAX_BYTES}),async(req,res)=>{
  try{
    if(storageConfig().configured)return res.status(404).end();
    const storagePath=String(req.query.path||'').slice(0,500),token=String(req.query.token||'');
    if(!storagePath||!token)return res.status(400).json({error:'Autorizacao de upload invalida.',code:'UPLOAD_AUTH_INVALID'});
    const {rows}=await pool.query('select attachments from citizen_upload_sessions where attachments @> $1::jsonb and expires_at>now() order by created_at desc limit 1',[JSON.stringify([{storage_path:storagePath}])]);
    const attachments=rows[0]?(Array.isArray(rows[0].attachments)?rows[0].attachments:JSON.parse(rows[0].attachments)):[];
    const attachment=attachments.find(item=>item.storage_path===storagePath);
    if(!attachment||!sameSecret(token,attachment.upload_token))return res.status(403).json({error:'Autorizacao de upload expirada ou invalida.',code:'UPLOAD_AUTH_INVALID'});
    const mimeType=String(req.get('content-type')||'').split(';')[0].toLowerCase();
    const allowed=Object.values(ALLOWED_FILES).some(file=>file.mimeType===mimeType);
    const data=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
    if(!allowed||mimeType!==attachment.mime_type||data.length!==Number(attachment.size))return res.status(400).json({error:'O arquivo enviado nao corresponde ao anexo selecionado.',code:'ATTACHMENT_TYPE_MISMATCH'});
    await pool.query('insert into citizen_attachment_blobs(storage_path,mime_type,size_bytes,data) values($1,$2,$3,$4) on conflict(storage_path) do update set mime_type=excluded.mime_type,size_bytes=excluded.size_bytes,data=excluded.data,created_at=now()',[storagePath,mimeType,data.length,data]);
    logEvent('UPLOAD','Anexo salvo',{storagePath});
    res.status(204).end();
  }catch(error){if(!isProduction)console.error('Falha ao receber anexo local:',error);res.status(error.status||503).json({error:'Nao foi possivel receber o arquivo. Tente novamente.',code:error.code||'UPLOAD_FAILED'})}
});

const sessionAttachments=session=>Array.isArray(session.attachments)?session.attachments:JSON.parse(session.attachments);
const sameAttachmentList=(current,next)=>current.length===next.length&&current.every((file,index)=>file.client_id===next[index].client_id&&file.name===next[index].name&&Number(file.size)===Number(next[index].size));
async function reserveUploadSession(submissionKey,data,descriptors,requestData){
  const current=(await pool.query('select * from citizen_upload_sessions where submission_key=$1 and expires_at>now()',[submissionKey])).rows[0];
  if(current&&current.phone_normalized===data.phone_normalized&&sameAttachmentList(sessionAttachments(current),descriptors)){
    await pool.query('update citizen_upload_sessions set request_data=$2::jsonb where id=$1',[current.id,JSON.stringify(requestData)]);
    return current;
  }
  for(let attempt=1;attempt<=protocolRetryLimit;attempt++){
    const protocol=await reserveProtocol(pool);
    const attachments=createAttachmentPlan(protocol,descriptors);
    const client=await pool.connect();
    let replaced=[];
    try{
      await client.query('begin');
      const existing=(await client.query('select * from citizen_upload_sessions where submission_key=$1 for update',[submissionKey])).rows[0];
      if(existing&&existing.expires_at>new Date()&&existing.phone_normalized===data.phone_normalized&&sameAttachmentList(sessionAttachments(existing),descriptors)){
        await client.query('update citizen_upload_sessions set request_data=$2::jsonb where id=$1',[existing.id,JSON.stringify(requestData)]);
        await client.query('commit');
        return existing;
      }
      if(existing){replaced=sessionAttachments(existing);await client.query('delete from citizen_upload_sessions where id=$1',[existing.id]);}
      const {rows}=await client.query('insert into citizen_upload_sessions(submission_key,protocol,phone_normalized,request_data,attachments) values($1,$2,$3,$4::jsonb,$5::jsonb) returning *',[submissionKey,protocol,data.phone_normalized,JSON.stringify(requestData),JSON.stringify(attachments)]);
      await client.query('commit');
      if(replaced.length)await removeAttachmentObjects(replaced,pool).catch(()=>{});
      return rows[0];
    }catch(error){
      await client.query('rollback').catch(()=>{});
      if(isUniqueViolation(error)){
        console.error(isProtocolUniqueViolation(error)?'[PROTOCOL] Erro de unicidade original durante reserva':'[DATABASE] Erro de unicidade original durante reserva',error);
        if(isProtocolUniqueViolation(error))continue;
        if(error.constraint==='citizen_upload_sessions_submission_key_key'){
          const concurrent=(await pool.query('select * from citizen_upload_sessions where submission_key=$1 and expires_at>now()',[submissionKey])).rows[0];
          if(concurrent&&concurrent.phone_normalized===data.phone_normalized&&sameAttachmentList(sessionAttachments(concurrent),descriptors))return concurrent;
        }
      }
      throw error;
    }finally{client.release();}
  }
  throw protocolRetryError();
}

app.post('/api/citizen/requests/upload-plan',async(req,res)=>{
  try{
    logEvent('REQUEST','Nova demanda com anexos');
    const submissionKey=cleanText(req.body?.submission_key,36);
    const validation=validateCitizenRequest(req.body);
    const attachmentValidation=validateAttachmentDescriptors(req.body?.attachments);
    if(!UUID_PATTERN.test(submissionKey))validation.errors.submission_key='Não foi possível identificar este envio. Atualize a página e tente novamente.';
    if(!attachmentValidation.valid)validation.errors.attachments=attachmentValidation.errors[0];
    if(Object.keys(validation.errors).length){logValidation(req.body,validation.errors);return res.status(400).json({error:'Revise os campos destacados.',code:'VALIDATION_ERROR',fields:validation.errors});}
    const data=validation.data;
    const prior=await pool.query('select r.*,(select count(*)::int from citizen_request_attachments a where a.request_id=r.id) as attachment_count from citizen_requests r where r.submission_key=$1 and phone_normalized=$2',[submissionKey,data.phone_normalized]);
    if(prior.rows[0])return res.json({complete:true,protocol:prior.rows[0].protocol,created_at:prior.rows[0].created_at,whatsapp_url:createWhatsAppUrl(prior.rows[0])});
    if(!await consumeRateLimit(req,'attachment-plan',data.phone_normalized,10,15))return res.status(429).json({error:'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',code:'RATE_LIMITED'});
    const expired=await pool.query('select attachments from citizen_upload_sessions where expires_at<now()');
    for(const item of expired.rows)await removeAttachmentObjects(sessionAttachments(item),pool).catch(()=>{});
    await pool.query('delete from citizen_upload_sessions where expires_at<now()');
    const session=await reserveUploadSession(submissionKey,data,attachmentValidation.files,req.body);
    const uploads=await createSignedUploads(sessionAttachments(session));
    logEvent('UPLOAD','Envio preparado',{protocol:session.protocol,files:uploads.length});
    res.status(201).json({protocol:session.protocol,upload_session_id:session.id,uploads});
  }catch(error){
    console.error('[UPLOAD] Falha ao preparar anexos',error);
    res.status(error.status||503).json({error:error.code==='PROTOCOL_COLLISION'?'Não foi possível reservar um protocolo único. Tente enviar novamente.':'Não foi possível preparar o envio dos arquivos. Nenhuma demanda foi registrada. Tente novamente.',code:error.code||'ATTACHMENT_PLAN_FAILED'});
  }
});

app.post('/api/citizen/requests',async(req,res)=>{
  let client;
  try{
    logEvent('REQUEST','Nova demanda');
    const submissionKey=cleanText(req.body?.submission_key,36);
    const uploadSessionId=cleanText(req.body?.upload_session_id,36);
    let uploadSession=null;
    if(uploadSessionId){
      if(!UUID_PATTERN.test(uploadSessionId)||!UUID_PATTERN.test(submissionKey))return res.status(400).json({error:'Não foi possível identificar o envio dos anexos. Tente novamente.',code:'VALIDATION_ERROR'});
      uploadSession=(await pool.query('select * from citizen_upload_sessions where id=$1 and submission_key=$2 and expires_at>now()',[uploadSessionId,submissionKey])).rows[0];
      if(!uploadSession){
        const prior=await pool.query('select r.*,(select count(*)::int from citizen_request_attachments a where a.request_id=r.id) as attachment_count from citizen_requests r where r.submission_key=$1',[submissionKey]);
        if(prior.rows[0])return res.json({protocol:prior.rows[0].protocol,created_at:prior.rows[0].created_at,whatsapp_url:createWhatsAppUrl(prior.rows[0])});
        return res.status(409).json({error:'A autorização de upload expirou. Tente enviar a demanda novamente.',code:'UPLOAD_SESSION_EXPIRED'});
      }
    }
    const requestBody=uploadSession?(typeof uploadSession.request_data==='string'?JSON.parse(uploadSession.request_data):uploadSession.request_data):req.body;
    const validation=validateCitizenRequest(requestBody);
    if(!UUID_PATTERN.test(submissionKey))validation.errors.submission_key='Não foi possível identificar este envio. Atualize a página e tente novamente.';
    if(Object.keys(validation.errors).length){logValidation(requestBody,validation.errors);return res.status(400).json({error:'Revise os campos destacados.',code:'VALIDATION_ERROR',fields:validation.errors});}
    const data=validation.data;
    const prior=await pool.query(uploadSession?'select r.*,(select count(*)::int from citizen_request_attachments a where a.request_id=r.id) as attachment_count from citizen_requests r where r.submission_key=$1 and r.phone_normalized=$2':'select * from citizen_requests where submission_key=$1 and phone_normalized=$2',[submissionKey,data.phone_normalized]);
    if(prior.rows[0])return res.json({protocol:prior.rows[0].protocol,created_at:prior.rows[0].created_at,whatsapp_url:createWhatsAppUrl(prior.rows[0])});
    if(!await consumeRateLimit(req,'register',data.phone_normalized,5,15))return res.status(429).json({error:'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',code:'RATE_LIMITED'});

    const attachments=uploadSession?(Array.isArray(uploadSession.attachments)?uploadSession.attachments:JSON.parse(uploadSession.attachments)):[];
    if(attachments.length)await verifyUploadedAttachments(attachments,pool);

    for(let attempt=1;attempt<=protocolRetryLimit;attempt++){
      const protocol=uploadSession?uploadSession.protocol:await reserveProtocol(pool);
      client=await pool.connect();
      try{
        await client.query('begin');
        const {rows}=await client.query(`insert into citizen_requests(submission_key,protocol,name,phone_normalized,email,neighborhood,demand_location,subject,instagram,birthday_day,birthday_month,category,category_other,message,privacy_consent_at,marketing_consent,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),$15,'RECEBIDO') returning *`,[submissionKey,protocol,data.name,data.phone_normalized,data.email,data.neighborhood,data.demand_location,data.subject,data.instagram,data.birthday_day,data.birthday_month,data.category,data.category_other,data.message,data.marketing_consent]);
        const request=rows[0];
        const history=await client.query('select 1 from citizen_request_updates where request_id=$1 limit 1',[request.id]);
        if(!history.rows[0])await client.query("insert into citizen_request_updates(request_id,status,public_message,is_public) values($1,'RECEBIDO','Demanda registrada e recebida pela equipe do gabinete.',true)",[request.id]);
        for(const attachment of attachments){await client.query('insert into citizen_request_attachments(request_id,type,storage_bucket,storage_path,original_name,mime_type,size_bytes) values($1,$2,$3,$4,$5,$6,$7) on conflict(request_id,storage_path) do nothing',[request.id,attachment.type,storageConfig().bucket,attachment.storage_path,attachment.name,attachment.mime_type,attachment.size]);logEvent('UPLOAD','Anexo salvo',{protocol,type:attachment.type});}
        if(uploadSession)await client.query('delete from citizen_upload_sessions where id=$1',[uploadSession.id]);
        await client.query('commit');
        request.attachment_count=attachments.length;
        logEvent('DATABASE','Demanda salva',{protocol:request.protocol});
        logEvent('SUCCESS','Demanda registrada',{protocol:request.protocol});
        return res.status(201).json({protocol:request.protocol,created_at:request.created_at,whatsapp_url:createWhatsAppUrl(request),attachment_count:attachments.length});
      }catch(error){
        await client.query('rollback').catch(()=>{});
        if(!isUniqueViolation(error))throw error;
        console.error(isProtocolUniqueViolation(error)?'[PROTOCOL] Erro de unicidade original antes do retry':'[DATABASE] Erro de unicidade original durante o registro',error);
        const duplicate=(await pool.query('select r.*,(select count(*)::int from citizen_request_attachments a where a.request_id=r.id) as attachment_count from citizen_requests r where r.submission_key=$1 and phone_normalized=$2',[submissionKey,data.phone_normalized])).rows[0];
        if(duplicate)return res.json({protocol:duplicate.protocol,created_at:duplicate.created_at,whatsapp_url:createWhatsAppUrl(duplicate),attachment_count:duplicate.attachment_count});
        if(uploadSession||!isProtocolUniqueViolation(error))throw error;
      }finally{client.release();client=null;}
    }
    throw protocolRetryError();
  }catch(error){if(client)await client.query('rollback').catch(()=>{});if(!isProduction)console.error('Falha ao registrar demanda:',error);else console.error('Falha ao registrar demanda.',{code:error.code||'DATABASE_INSERT_FAILED'});const collision=error.code==='PROTOCOL_COLLISION';const attachmentError=String(error.code||'').startsWith('ATTACHMENT_');res.status(collision?409:(error.status||500)).json({error:collision?'Não foi possível reservar um protocolo único. Tente enviar novamente.':attachmentError?error.message:'Erro ao salvar demanda.',code:collision?'PROTOCOL_COLLISION':(attachmentError?error.code:'DATABASE_INSERT_FAILED')})}finally{client?.release()}
});

app.post('/api/citizen/lookup',async(req,res)=>{
  try{
    const protocol=cleanText(req.body?.protocol,24).toUpperCase();
    const phone=normalizePhone(req.body?.phone);
    if(!PROTOCOL_PATTERN.test(protocol)||!phone)return res.status(400).json({error:'Informe um protocolo e um telefone válidos.',code:'VALIDATION_ERROR'});
    if(!await consumeRateLimit(req,'lookup',phone,12,15))return res.status(429).json({error:'Muitas consultas em pouco tempo. Aguarde alguns minutos e tente novamente.',code:'RATE_LIMITED'});
    const {rows}=await pool.query(`select ${publicRequestFields} from citizen_requests where protocol=$1 and phone_normalized=$2`,[protocol,phone]);
    if(!rows[0])return res.status(404).json({error:publicLookupError,code:'DEMAND_NOT_FOUND'});
    const request=rows[0];
    const history=await pool.query('select status,public_message,created_at from citizen_request_updates where request_id=$1 and is_public=true order by created_at',[request.id]);
    res.json({protocol:request.protocol,subject:request.subject,category:displayCategory(request),neighborhood:request.neighborhood,demand_location:request.demand_location,created_at:request.created_at,updated_at:request.updated_at,status:request.status,status_label:statusLabel(request.status),history:history.rows.map(update=>({...update,status_label:statusLabel(update.status)}))});
  }catch(error){if(!isProduction)console.error('Falha ao consultar demanda:',error);else console.error('Falha ao consultar demanda.',{code:error.code||'DATABASE_LOOKUP_FAILED'});res.status(500).json({error:'Não foi possível consultar o andamento agora. Tente novamente em instantes.',code:'DATABASE_LOOKUP_FAILED'})}
});

app.get('/api/admin/citizen-requests',requireAdmin,async(req,res,next)=>{try{
  const conditions=[],values=[];
  const search=cleanText(req.query.search,120),category=cleanText(req.query.category,80),status=cleanText(req.query.status,80),from=cleanText(req.query.from,10),to=cleanText(req.query.to,10);
  if(search){values.push(`%${search}%`);const textIndex=values.length,parts=[`protocol ilike $${textIndex}`,`name ilike $${textIndex}`,`subject ilike $${textIndex}`,`category ilike $${textIndex}`,`coalesce(category_other,'') ilike $${textIndex}`],digits=search.replace(/\D/g,'');if(digits){values.push(`%${digits}%`);parts.push(`phone_normalized like $${values.length}`)}conditions.push(`(${parts.join(' or ')})`)}
  if(category){if(!CATEGORIES.includes(category))return res.status(400).json({error:'Categoria inválida.'});values.push(category);conditions.push(`category=$${values.length}`)}
  if(status){if(!STATUSES.includes(status))return res.status(400).json({error:'Status inválido.'});values.push(status);conditions.push(`status=$${values.length}`)}
  if(from){if(!/^\d{4}-\d{2}-\d{2}$/.test(from))return res.status(400).json({error:'Data inicial inválida.'});values.push(from);conditions.push(`created_at>=$${values.length}::date`)}
  if(to){if(!/^\d{4}-\d{2}-\d{2}$/.test(to))return res.status(400).json({error:'Data final inválida.'});values.push(to);conditions.push(`created_at<$${values.length}::date+interval '1 day'`)}
  const where=conditions.length?`where ${conditions.join(' and ')}`:'';
  const {rows}=await pool.query(`select id,protocol,name,phone_normalized,subject,neighborhood,category,category_other,status,forwarded_to,created_at,updated_at from citizen_requests ${where} order by created_at desc limit 200`,values);
  res.json(rows);
}catch(e){next(e)}});

app.get('/api/admin/citizen-request-stats',requireAdmin,async(_req,res,next)=>{try{
  const {rows}=await pool.query('select status,count(*)::int as count from citizen_requests group by status');
  const counts=Object.fromEntries(STATUSES.map((status)=>[status,0]));
  rows.forEach((row)=>{if(statusPosition(row.status)>=0)counts[row.status]=row.count});
  res.json({total:Object.values(counts).reduce((sum,count)=>sum+count,0),counts});
}catch(e){next(e)}});

app.get('/api/admin/citizen-requests/:id',requireAdmin,async(req,res,next)=>{try{
  if(!UUID_PATTERN.test(req.params.id))return res.status(400).json({error:'Identificador inválido.'});
  const {rows}=await pool.query('select * from citizen_requests where id=$1',[req.params.id]);
  if(!rows[0])return res.status(404).json({error:'Demanda não encontrada.'});
  const history=await pool.query('select u.*,a.email as admin_email from citizen_request_updates u left join admins a on a.id=u.created_by where u.request_id=$1 order by u.created_at',[req.params.id]);
  const attachmentResult=await pool.query('select id,type,storage_path,original_name as name,mime_type,size_bytes as size,created_at from citizen_request_attachments where request_id=$1 order by created_at',[req.params.id]);
  const attachments=await signAttachmentDownloads(attachmentResult.rows);
  res.json({...rows[0],history:history.rows,attachments});
}catch(e){next(e)}});

app.patch('/api/admin/citizen-requests/:id',requireAdmin,async(req,res,next)=>{let client;try{
  if(!UUID_PATTERN.test(req.params.id))return res.status(400).json({error:'Identificador inválido.'});
  const status=cleanText(req.body?.status,24),visibility=cleanText(req.body?.visibility,12),observation=cleanText(req.body?.observation,2000,true),forwardedTo=cleanText(req.body?.forwarded_to,160);
  const publicUpdate=visibility==='public'?cleanText(observation,1500,true):cleanText(req.body?.public_update,1500,true);
  const internalNote=visibility==='internal'?observation:cleanText(req.body?.internal_note,2000,true);
  if(status&&!STATUSES.includes(status))return res.status(400).json({error:'Status inválido.'});
  if(observation&&!['public','internal'].includes(visibility))return res.status(400).json({error:'Escolha se a observação é pública ou interna.'});
  if(!status&&!publicUpdate&&!internalNote&&req.body?.forwarded_to===undefined)return res.status(400).json({error:'Informe ao menos uma atualização.'});
  client=await pool.connect();await client.query('begin');
  const currentResult=await client.query('select * from citizen_requests where id=$1 for update',[req.params.id]);const current=currentResult.rows[0];
  if(!current){await client.query('rollback');return res.status(404).json({error:'Demanda não encontrada.'})}
  const nextStatus=status||current.status,nextForwarded=req.body?.forwarded_to===undefined?current.forwarded_to:(forwardedTo||null);
  if(statusPosition(nextStatus)<statusPosition(current.status)&&req.body?.confirm_regression!==true){await client.query('rollback');return res.status(409).json({error:'Confirme o retorno para uma etapa anterior.',code:'STATUS_REGRESSION_CONFIRMATION_REQUIRED'})}
  const changed=nextStatus!==current.status||nextForwarded!==current.forwarded_to||publicUpdate||internalNote;
  if(!changed){await client.query('rollback');return res.status(400).json({error:'Nenhuma alteração foi informada.'})}
  const updated=await client.query('update citizen_requests set status=$1,forwarded_to=$2,public_response=case when $3<>\'\' then $3 else public_response end where id=$4 returning *',[nextStatus,nextForwarded,publicUpdate,current.id]);
  await client.query('insert into citizen_request_updates(request_id,previous_status,status,public_message,internal_note,forwarded_to,is_public,created_by) values($1,$2,$3,$4,$5,$6,$7,$8)',[current.id,current.status,nextStatus,publicUpdate||null,internalNote||null,nextForwarded,Boolean(publicUpdate||nextStatus!==current.status),req.admin.id]);
  await client.query('commit');res.json(updated.rows[0]);
}catch(e){if(client)await client.query('rollback').catch(()=>{});next(e)}finally{client?.release()}});
app.get('/api/posts',async(req,res,next)=>{try{if(req.query.status!=='published')return requireAdmin(req,res,async()=>{const {rows}=await pool.query('select * from posts order by created_at desc');res.json(rows)});const {rows}=await pool.query("select * from posts where status='published' and published_at<=now() order by published_at desc");res.json(rows)}catch(e){next(e)}});
app.get('/api/posts/:value',async(req,res,next)=>{try{const pub=req.query.public==='1',value=req.params.value,selector=/^[0-9a-f-]{36}$/i.test(value)?'id':'slug';const send=async()=>{const {rows}=await pool.query(`select * from posts where ${selector}=$1${pub?" and status='published' and published_at<=now()":''}`,[value]);if(!rows[0])return res.status(404).json({error:'Notícia não encontrada.'});res.json(rows[0])};if(pub)return send();return requireAdmin(req,res,send)}catch(e){next(e)}});
app.post('/api/posts/:slug/view',async(req,res,next)=>{try{await pool.query("update posts set views_count=views_count+1 where slug=$1 and status='published'",[req.params.slug]);res.status(204).end()}catch(e){next(e)}});
async function ensureConfiguredAdmin(email){
  const configuredEmail=process.env.ADMIN_EMAIL?.trim();
  const configuredPassword=process.env.ADMIN_PASSWORD;
  if(!configuredEmail||!configuredPassword||typeof email!=='string'||email.trim().toLowerCase()!==configuredEmail.toLowerCase())return;
  const existing=await pool.query('select 1 from admins where lower(email)=lower($1)',[configuredEmail]);
  if(existing.rows.length)return;
  const passwordHash=await bcrypt.hash(configuredPassword,12);
  await pool.query('insert into admins(email,password_hash) values($1,$2) on conflict(email) do nothing',[configuredEmail,passwordHash]);
}
app.post('/api/auth/login',async(req,res,next)=>{try{const email=cleanText(req.body?.email,160).toLowerCase(),password=String(req.body?.password||'');if(!await consumeRateLimit(req,'login-ip','',30,15)||!await consumeRateLimit(req,'login-account',email,8,15))return res.status(429).json({error:'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.'});await ensureConfiguredAdmin(email);const {rows}=await pool.query('select * from admins where lower(email)=lower($1)',[email]);if(!rows[0]||!await bcrypt.compare(password,rows[0].password_hash))return res.status(401).json({error:'E-mail ou senha inválidos.'});const token=crypto.randomBytes(32).toString('base64url');await pool.query("insert into admin_sessions(admin_id,token_hash,expires_at) values($1,$2,now()+interval '7 days')",[rows[0].id,hash(token)]);res.setHeader('Set-Cookie',`admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV==='production'?'; Secure':''}`);res.json({email:rows[0].email})}catch(e){next(e)}});
app.get('/api/auth/session',requireAdmin,(req,res)=>res.json(req.admin));
app.post('/api/auth/logout',async(req,res,next)=>{try{const token=cookies(req).admin_session;if(token)await pool.query('delete from admin_sessions where token_hash=$1',[hash(token)]);res.setHeader('Set-Cookie','admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');res.status(204).end()}catch(e){next(e)}});
app.post('/api/uploads',requireAdmin,upload.array('images',12),async(req,res,next)=>{try{if(!req.files?.length)return res.status(400).json({error:'Selecione uma imagem válida.'});const urls=[];for(const f of req.files){const {rows}=await pool.query('insert into post_images(mime_type,data) values($1,$2) returning id',[f.mimetype,f.buffer]);urls.push(`/api/images/${rows[0].id}`)}res.status(201).json({urls})}catch(e){next(e)}});
app.get('/api/images/:id',async(req,res,next)=>{try{const {rows}=await pool.query('select mime_type,data from post_images where id=$1',[req.params.id]);if(!rows[0])return res.status(404).end();res.set({'Content-Type':rows[0].mime_type,'Cache-Control':'public,max-age=31536000,immutable'}).send(rows[0].data)}catch(e){next(e)}});
function normalize(body){const p={};for(const k of fields)p[k]=body[k]??null;p.tags=Array.isArray(p.tags)?p.tags:[];p.gallery=Array.isArray(p.gallery)?p.gallery:[];p.featured=Boolean(p.featured);p.status=p.status==='published'?'published':'draft';if(p.status==='published'&&!p.published_at)p.published_at=new Date().toISOString();return p}
app.post('/api/posts',requireAdmin,async(req,res,next)=>{try{const p=normalize(req.body),vals=fields.map(k=>['tags','gallery'].includes(k)?JSON.stringify(p[k]):p[k]);const {rows}=await pool.query(`insert into posts(${fields.join(',')},created_by) values(${fields.map((_,i)=>'$'+(i+1)).join(',')},$${fields.length+1}) returning *`,[...vals,req.admin.id]);res.status(201).json(rows[0])}catch(e){next(e)}});
app.put('/api/posts/:id',requireAdmin,async(req,res,next)=>{try{const p=normalize(req.body),vals=fields.map(k=>['tags','gallery'].includes(k)?JSON.stringify(p[k]):p[k]),sets=fields.map((k,i)=>`${k}=$${i+1}`).join(',');const {rows}=await pool.query(`update posts set ${sets},updated_at=now() where id=$${fields.length+1} returning *`,[...vals,req.params.id]);if(!rows[0])return res.status(404).json({error:'Notícia não encontrada.'});res.json(rows[0])}catch(e){next(e)}});
app.patch('/api/posts/:id/status',requireAdmin,async(req,res,next)=>{try{const status=req.body.status==='published'?'published':'draft',{rows}=await pool.query("update posts set status=$1,published_at=case when $1='published' then coalesce(published_at,now()) else published_at end,updated_at=now() where id=$2 returning *",[status,req.params.id]);res.json(rows[0])}catch(e){next(e)}});
app.delete('/api/posts/:id',requireAdmin,async(req,res,next)=>{try{await pool.query('delete from posts where id=$1',[req.params.id]);res.status(204).end()}catch(e){next(e)}});
app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint da API não encontrado.',code:'API_ROUTE_NOT_FOUND'}));
for(const [route,file] of Object.entries({'/':'index.html','/blog':'blog.html','/privacidade':'privacidade.html','/telefones-uteis':'telefones-uteis.html','/admin/login':'admin/login.html'}))app.get(route,(_q,res)=>res.sendFile(path.join(root,file)));
for(const [route,file] of Object.entries({'/admin':'admin/index.html','/admin/index.html':'admin/index.html','/admin/noticias/nova':'admin/editor.html','/admin/editor.html':'admin/editor.html','/admin/demandas':'admin/demandas.html','/admin/demandas.html':'admin/demandas.html','/admin/demanda.html':'admin/demanda.html'}))app.get(route,requireAdminPage,(_q,res)=>res.sendFile(path.join(root,file)));
app.get('/blog/:slug',(_q,res)=>res.sendFile(path.join(root,'post.html')));
app.get('/admin/noticias/:id/editar',requireAdminPage,(_q,res)=>res.sendFile(path.join(root,'admin/editor.html')));
app.get('/admin/demandas/:id',requireAdminPage,(_q,res)=>res.sendFile(path.join(root,'admin','demanda.html')));
app.use((req,res,next)=>/\/(?:server\.js|citizen-(?:service|attachments-service|tests)\.js|package(?:-lock)?\.json|database|tests\.js|build\.js|\.env)/.test(req.path)?res.status(404).end():next());
app.use(express.static(root,{index:false,cacheControl:false,dotfiles:'ignore'}));
app.use((err,req,res,_next)=>{if(!isProduction)console.error(err);else console.error('Erro interno da aplicação.',{code:err.code||'INTERNAL_ERROR'});if(err instanceof SyntaxError&&err.status===400)return res.status(400).json({error:'O corpo JSON da solicitação é inválido.',code:'INVALID_JSON'});if(err.code==='23505')return res.status(409).json({error:'Já existe um registro com esses dados.',code:'UNIQUE_CONSTRAINT_VIOLATION'});res.status(err.status||500).json({error:'Não foi possível concluir a operação.',code:req.path.startsWith('/api/')?'INTERNAL_API_ERROR':'INTERNAL_ERROR'})});
async function start(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL não configurada no .env');await pool.query(fs.readFileSync(path.join(root,'database','schema.sql'),'utf8'));if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){const passwordHash=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);await pool.query('insert into admins(email,password_hash) values($1,$2) on conflict(email) do nothing',[process.env.ADMIN_EMAIL,passwordHash])}app.listen(port,'127.0.0.1',()=>console.log(`Site disponível em http://localhost:${port}`))}
if(require.main===module)start().catch(e=>{console.error('Falha ao iniciar:',e.message);process.exit(1)});
module.exports=app;
module.exports.pool=pool;
