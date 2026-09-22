require('dotenv').config();
const express=require('express'),path=require('path'),crypto=require('crypto'),bcrypt=require('bcryptjs'),multer=require('multer'),fs=require('fs');
const {Pool}=require('pg');
const {CATEGORIES,STATUSES,cleanText,normalizePhone,validateCitizenRequest,createProtocol,displayCategory,statusLabel,createWhatsAppUrl}=require('./citizen-service');
const app=express(),root=__dirname,port=Number(process.env.PORT||3000);
const databaseUrl=process.env.DATABASE_URL;
const localDatabase=/^(?:postgres(?:ql)?:\/\/)?(?:[^@]+@)?(?:localhost|127\.0\.0\.1)(?::|\/)/i.test(databaseUrl||'');
const pool=new Pool({connectionString:databaseUrl,ssl:localDatabase?false:{rejectUnauthorized:process.env.DATABASE_SSL_REJECT_UNAUTHORIZED!=='false'}});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:12},fileFilter:(_r,f,cb)=>cb(null,['image/jpeg','image/png','image/webp','image/avif'].includes(f.mimetype))});
app.use(express.json({limit:'1mb'}));
if(process.env.NODE_ENV==='production'&&!process.env.RATE_LIMIT_SECRET)throw new Error('RATE_LIMIT_SECRET não configurado');
app.set('trust proxy',process.env.TRUST_PROXY==='1'?1:false);
app.disable('x-powered-by');
app.use((_req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});next()});
app.use(['/api/citizen','/api/admin'],(req,res,next)=>{res.set('Cache-Control','no-store');const origin=req.get('origin');if(!['GET','HEAD','OPTIONS'].includes(req.method)&&origin){try{if(new URL(origin).host!==req.get('host'))return res.status(403).json({error:'Origem da solicitação não permitida.'})}catch{return res.status(403).json({error:'Origem da solicitação não permitida.'})}}next()});
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),decodeURIComponent(x.slice(i+1))]}));
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
const fields=['title','slug','excerpt','content','cover_url','cover_alt','category','tags','gallery','status','featured','source_url','seo_title','seo_description','published_at'];
const publicRequestFields='id,protocol,category,category_other,status,created_at,updated_at';
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROTOCOL_PATTERN=/^AS-[0-9]{8}-[A-Z0-9]{6}$/;
const rateSecret=process.env.RATE_LIMIT_SECRET||'configure-rate-limit-secret';
const rateIdentifier=(req,scope,phone='')=>hash(`${rateSecret}|${scope}|${req.ip||req.socket.remoteAddress||'unknown'}|${phone}`);
async function consumeRateLimit(req,scope,phone,maxHits,windowMinutes){const identifier=rateIdentifier(req,scope,phone);const {rows}=await pool.query("insert into citizen_rate_limits(identifier_hash,window_started_at,hits) values($1,now(),1) on conflict(identifier_hash) do update set hits=case when citizen_rate_limits.window_started_at<now()-($2::text||' minutes')::interval then 1 else citizen_rate_limits.hits+1 end,window_started_at=case when citizen_rate_limits.window_started_at<now()-($2::text||' minutes')::interval then now() else citizen_rate_limits.window_started_at end returning hits",[identifier,String(windowMinutes)]);return rows[0].hits<=maxHits}
async function requireAdmin(req,res,next){try{const token=cookies(req).admin_session;if(!token)return res.status(401).json({error:'Não autenticado.'});const {rows}=await pool.query('select a.id,a.email from admin_sessions s join admins a on a.id=s.admin_id where s.token_hash=$1 and s.expires_at>now()',[hash(token)]);if(!rows[0])return res.status(401).json({error:'Sessão expirada.'});req.admin=rows[0];next()}catch(e){next(e)}}
async function requireAdminPage(req,res,next){try{const token=cookies(req).admin_session;if(!token)return res.redirect(303,'/admin/login');const {rows}=await pool.query('select a.id,a.email from admin_sessions s join admins a on a.id=s.admin_id where s.token_hash=$1 and s.expires_at>now()',[hash(token)]);if(!rows[0])return res.redirect(303,'/admin/login');req.admin=rows[0];next()}catch(e){next(e)}}
const statusPosition=status=>STATUSES.indexOf(status);
const publicLookupError='Não foi possível localizar uma demanda com os dados informados. Verifique o protocolo e o telefone e tente novamente.';
app.get('/api/health',async(_q,res,next)=>{try{await pool.query('select 1');res.json({ok:true})}catch(e){next(e)}});

app.post('/api/citizen/requests',async(req,res)=>{
  let client;
  try{
    const submissionKey=cleanText(req.body?.submission_key,36);
    const validation=validateCitizenRequest(req.body);
    if(!UUID_PATTERN.test(submissionKey))validation.errors.submission_key='Não foi possível identificar este envio. Atualize a página e tente novamente.';
    if(Object.keys(validation.errors).length)return res.status(400).json({error:'Revise os campos destacados.',fields:validation.errors});
    const data=validation.data;
    const prior=await pool.query('select * from citizen_requests where submission_key=$1 and phone_normalized=$2',[submissionKey,data.phone_normalized]);
    if(prior.rows[0])return res.json({protocol:prior.rows[0].protocol,created_at:prior.rows[0].created_at,whatsapp_url:createWhatsAppUrl(prior.rows[0])});
    if(!await consumeRateLimit(req,'register',data.phone_normalized,5,15))return res.status(429).json({error:'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'});

    client=await pool.connect();await client.query('begin');
    let request;
    for(let attempt=0;attempt<8&&!request;attempt++){
      const protocol=createProtocol();
      const {rows}=await client.query(`insert into citizen_requests(submission_key,protocol,name,phone_normalized,email,neighborhood,demand_location,instagram,birthday_day,birthday_month,category,category_other,message,privacy_consent_at,marketing_consent,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),$14,'ENVIADO') on conflict do nothing returning *`,[submissionKey,protocol,data.name,data.phone_normalized,data.email,data.neighborhood,data.demand_location,data.instagram,data.birthday_day,data.birthday_month,data.category,data.category_other,data.message,data.marketing_consent]);
      request=rows[0];
      if(!request){const duplicate=await client.query('select * from citizen_requests where submission_key=$1 and phone_normalized=$2',[submissionKey,data.phone_normalized]);request=duplicate.rows[0]}
    }
    if(!request)throw new Error('protocol_generation_failed');
    const history=await client.query('select 1 from citizen_request_updates where request_id=$1 limit 1',[request.id]);
    if(!history.rows[0])await client.query("insert into citizen_request_updates(request_id,status,public_message,is_public) values($1,'ENVIADO','Demanda enviada e recebida pela equipe do gabinete.',true)",[request.id]);
    await client.query('commit');
    res.status(201).json({protocol:request.protocol,created_at:request.created_at,whatsapp_url:createWhatsAppUrl(request)});
  }catch(error){if(client)await client.query('rollback').catch(()=>{});console.error('Falha ao registrar demanda:',error);res.status(503).json({error:'Não foi possível registrar a demanda agora. Nenhum protocolo foi gerado. Tente novamente em instantes.'})}finally{client?.release()}
});

app.post('/api/citizen/lookup',async(req,res)=>{
  try{
    const protocol=cleanText(req.body?.protocol,24).toUpperCase();
    const phone=normalizePhone(req.body?.phone);
    if(!PROTOCOL_PATTERN.test(protocol)||!phone)return res.status(400).json({error:'Informe um protocolo e um telefone válidos.'});
    if(!await consumeRateLimit(req,'lookup',phone,12,15))return res.status(429).json({error:'Muitas consultas em pouco tempo. Aguarde alguns minutos e tente novamente.'});
    const {rows}=await pool.query(`select ${publicRequestFields} from citizen_requests where protocol=$1 and phone_normalized=$2`,[protocol,phone]);
    if(!rows[0])return res.status(404).json({error:publicLookupError});
    const request=rows[0];
    const history=await pool.query('select status,public_message,created_at from citizen_request_updates where request_id=$1 and is_public=true order by created_at',[request.id]);
    res.json({protocol:request.protocol,subject:displayCategory(request),created_at:request.created_at,updated_at:request.updated_at,status:request.status,status_label:statusLabel(request.status),history:history.rows.map(update=>({...update,status_label:statusLabel(update.status)}))});
  }catch(error){console.error('Falha ao consultar demanda:',error);res.status(503).json({error:'Não foi possível consultar o andamento agora. Tente novamente em instantes.'})}
});

app.get('/api/admin/citizen-requests',requireAdmin,async(req,res,next)=>{try{
  const conditions=[],values=[];
  const search=cleanText(req.query.search,120),category=cleanText(req.query.category,80),status=cleanText(req.query.status,80),from=cleanText(req.query.from,10),to=cleanText(req.query.to,10);
  if(search){values.push(`%${search}%`);const textIndex=values.length,parts=[`protocol ilike $${textIndex}`,`name ilike $${textIndex}`,`category ilike $${textIndex}`,`coalesce(category_other,'') ilike $${textIndex}`],digits=search.replace(/\D/g,'');if(digits){values.push(`%${digits}%`);parts.push(`phone_normalized like $${values.length}`)}conditions.push(`(${parts.join(' or ')})`)}
  if(category){if(!CATEGORIES.includes(category))return res.status(400).json({error:'Categoria inválida.'});values.push(category);conditions.push(`category=$${values.length}`)}
  if(status){if(!STATUSES.includes(status))return res.status(400).json({error:'Status inválido.'});values.push(status);conditions.push(`status=$${values.length}`)}
  if(from){if(!/^\d{4}-\d{2}-\d{2}$/.test(from))return res.status(400).json({error:'Data inicial inválida.'});values.push(from);conditions.push(`created_at>=$${values.length}::date`)}
  if(to){if(!/^\d{4}-\d{2}-\d{2}$/.test(to))return res.status(400).json({error:'Data final inválida.'});values.push(to);conditions.push(`created_at<$${values.length}::date+interval '1 day'`)}
  const where=conditions.length?`where ${conditions.join(' and ')}`:'';
  const {rows}=await pool.query(`select id,protocol,name,phone_normalized,neighborhood,category,category_other,status,forwarded_to,created_at,updated_at from citizen_requests ${where} order by created_at desc limit 200`,values);
  res.json(rows);
}catch(e){next(e)}});

app.get('/api/admin/citizen-requests/:id',requireAdmin,async(req,res,next)=>{try{
  if(!UUID_PATTERN.test(req.params.id))return res.status(400).json({error:'Identificador inválido.'});
  const {rows}=await pool.query('select * from citizen_requests where id=$1',[req.params.id]);
  if(!rows[0])return res.status(404).json({error:'Demanda não encontrada.'});
  const history=await pool.query('select u.*,a.email as admin_email from citizen_request_updates u left join admins a on a.id=u.created_by where u.request_id=$1 order by u.created_at',[req.params.id]);
  res.json({...rows[0],history:history.rows});
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
for(const [route,file] of Object.entries({'/':'index.html','/blog':'blog.html','/privacidade':'privacidade.html','/admin/login':'admin/login.html'}))app.get(route,(_q,res)=>res.sendFile(path.join(root,file)));
for(const [route,file] of Object.entries({'/admin':'admin/index.html','/admin/index.html':'admin/index.html','/admin/noticias/nova':'admin/editor.html','/admin/editor.html':'admin/editor.html','/admin/demandas':'admin/demandas.html','/admin/demandas.html':'admin/demandas.html','/admin/demanda.html':'admin/demanda.html'}))app.get(route,requireAdminPage,(_q,res)=>res.sendFile(path.join(root,file)));
app.get('/blog/:slug',(_q,res)=>res.sendFile(path.join(root,'post.html')));
app.get('/admin/noticias/:id/editar',requireAdminPage,(_q,res)=>res.sendFile(path.join(root,'admin/editor.html')));
app.get('/admin/demandas/:id',requireAdminPage,(_q,res)=>res.sendFile(path.join(root,'admin','demanda.html')));
app.use((req,res,next)=>/\/(?:server\.js|citizen-service\.js|citizen-tests\.js|package(?:-lock)?\.json|database|tests\.js|build\.js|\.env)/.test(req.path)?res.status(404).end():next());
app.use(express.static(root,{index:false,cacheControl:false,dotfiles:'ignore'}));
app.use((err,_q,res,_n)=>{console.error(err);if(err.code==='23505')return res.status(409).json({error:'Já existe um registro com esses dados.'});res.status(err.status||500).json({error:'Não foi possível concluir a operação.'})});
async function start(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL não configurada no .env');await pool.query(fs.readFileSync(path.join(root,'database','schema.sql'),'utf8'));if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){const passwordHash=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);await pool.query('insert into admins(email,password_hash) values($1,$2) on conflict(email) do nothing',[process.env.ADMIN_EMAIL,passwordHash])}app.listen(port,'127.0.0.1',()=>console.log(`Site disponível em http://localhost:${port}`))}
if(require.main===module)start().catch(e=>{console.error('Falha ao iniciar:',e.message);process.exit(1)});
module.exports=app;
module.exports.pool=pool;
