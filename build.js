const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=__dirname;
const dist=path.join(root,'dist');
const marker=path.join(dist,'.build-hash');
const files=['index.html','blog.html','post.html','privacidade.html','telefones-uteis.html','styles.css','blog.css','blog-fixes.css','post.css','employment-post.css','religious-post.css','telefones-uteis.css','motion.css','admin.css','script.js','motion.js','partnerships.js','citizen-attachments.js','citizen.js','citizen-admin.js','home-news.js','telefones-uteis.js','data.js','supabase.js','editorial-posts.js','blog.js','post.js','admin.js','_redirects'];
const dirs=['assets','admin'];
const listFiles=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?listFiles(path.join(dir,entry.name)):[path.join(dir,entry.name)]);

// A Vercel executa o vercel-build duas vezes em sequência; se o dist/ já corresponde às fontes,
// não o apagamos, evitando remover arquivos que o primeiro build ainda está enviando.
const hash=crypto.createHash('sha256');
for(const file of [...files,...dirs.flatMap(listFiles)].sort()){hash.update(file);hash.update(fs.readFileSync(path.join(root,file)))}
const digest=hash.digest('hex');
if(fs.existsSync(marker)&&fs.readFileSync(marker,'utf8')===digest){console.log('Build estático já atualizado em dist/');process.exit(0)}

fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(dist,file));
for(const dir of dirs)fs.cpSync(path.join(root,dir),path.join(dist,dir),{recursive:true});
fs.writeFileSync(marker,digest);
console.log('Build estático criado em dist/');
