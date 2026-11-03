import {createServer} from 'node:http';
import {readFile,access} from 'node:fs/promises';
import {resolve,extname} from 'node:path';

const root=resolve('out/staff-walkthrough');
await access(resolve(root,'index.html'));
createServer(async(req,res)=>{
  try{
    const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(path!==root&&!path.startsWith(root+'/'))throw Error('Invalid path');
    const file=path===root?resolve(root,'index.html'):path;
    const extension=extname(file);
    if(!['.html','.png'].includes(extension))throw Error('Unsupported file');
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':extension==='.png'?'image/png':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(3005,'127.0.0.1',()=>console.log('Screenshot walkthrough: http://127.0.0.1:3005/'));
