import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv.includes('--dist')?'dist':'.');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.md':'text/plain; charset=utf-8'};
const publicPath=/^\/(?:index\.html|styles-v5\.css|sw\.js|manifest\.webmanifest|build\.json|assets\/[a-z0-9-]+\.(?:svg|png|ico)|src\/[a-z0-9-]+\.js|docs\/SELF_HOSTING\.md)$/i;
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=pathname==='/'?'/index.html':pathname;if(!['GET','HEAD'].includes(req.method)||!publicPath.test(target))throw Error('Not public');const file=path.resolve(root,'.'+target);if(!file.startsWith(root+path.sep))throw Error('Invalid path');const content=await readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?undefined:content);}catch{res.writeHead(404);res.end('Not found');}});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Neon Rift V5: http://127.0.0.1:'+server.address().port));
