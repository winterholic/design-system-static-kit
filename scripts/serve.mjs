import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const port=Number(process.env.PORT??4173);
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png'};
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');const name=decodeURIComponent(url.pathname);if(name.split('/').some(x=>x.startsWith('.')||x==='node_modules'))throw new Error('Forbidden');
  let path=resolve(root,'.'+name);if(!path.startsWith(root+sep)&&path!==root)throw new Error('Forbidden');if((await stat(path)).isDirectory())path=resolve(path,'index.html');
  const file=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(file);
}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Static Kit http://127.0.0.1:${port}`));
