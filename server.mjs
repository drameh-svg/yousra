import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { handle } from './src/api.mjs';
import { assertEnvironment } from './src/auth.mjs';
import { config } from './src/util.mjs';

assertEnvironment();
const publicRoot=resolve('public');
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    const security={'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",'x-frame-options':'SAMEORIGIN'};
    if(pathname.startsWith('/api/')) {
      const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>32768){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
      const headers=new Headers(req.headers);
      const request=new Request(new URL(req.url,config().origin),{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
      const response=await handle(request,{clientIp:req.socket.remoteAddress||'local'});
      const outgoing={...security,...Object.fromEntries(response.headers)};
      const cookie=response.headers.getSetCookie();if(cookie.length)outgoing['set-cookie']=cookie;
      res.writeHead(response.status,outgoing);res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const file=resolve(publicRoot,(pathname==='/'||/^\/products\/[\w-]+$/.test(pathname))?'tester.html':'.'+decodeURIComponent(pathname));
    if(!file.startsWith(publicRoot+'/')){res.writeHead(403);res.end();return;}
    const bytes=await readFile(file).catch(()=>null);if(!bytes){res.writeHead(404);res.end('Not found');return;}
    const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream';
    res.writeHead(200,{...security,'content-type':mime,'cache-control':'no-cache'});res.end(req.method==='HEAD'?null:bytes);
  }catch(e){console.error(e.message);res.writeHead(500);res.end('Server error');}
});
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log(`Yousra: ${config().origin} • ${config().auth} auth • ${config().demo?'SAMPLE catalog':'LIVE discovery'}`));
