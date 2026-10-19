import sharp from 'sharp';
import {writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const {data,info}=await sharp('public/images/sterlyn-official-monogram-crop.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;const mask=Buffer.alloc(info.width*info.height,255);
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4,[r,g,b]=data.subarray(i,i+3);if(r>70&&r>g*1.06&&r>b*1.25){mask[y*info.width+x]=0;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
const width=x1-x0+1,height=y1-y0+1,left=Math.floor((390-width)/2),top=Math.floor((503-height)/2);const pixels=await sharp(mask,{raw:{width:info.width,height:info.height,channels:1}}).extract({left:x0,top:y0,width,height}).extend({left,right:390-width-left,top,bottom:503-height-top,background:'#fff'}).toColourspace('b-w').raw().toBuffer();
const packed=Buffer.alloc(Math.ceil(390/8)*503);for(let y=0;y<503;y++)for(let x=0;x<390;x++)if(pixels[y*390+x]<128)packed[y*Math.ceil(390/8)+(x>>3)]|=128>>(x&7);
await writeFile('/tmp/sterlyn-canonical.pbm',Buffer.concat([Buffer.from('P4\n390 503\n'),packed]));
execFileSync('potrace',['/tmp/sterlyn-canonical.pbm','--svg','--turdsize','4','--alphamax','1','--opttolerance','0.1','--output','/tmp/sterlyn-canonical.svg']);
let svg=await readFile('/tmp/sterlyn-canonical.svg','utf8');svg=svg.replace(/<\?xml[^>]*>/,'').replace(/<!DOCTYPE[\s\S]*?>/,'').replaceAll('#000000','#c9a068');
await writeFile('public/images/sterlyn-monogram-clean.svg',svg);
const source=await readFile('src/lib/logo-geometry.ts','utf8');await writeFile('src/lib/logo-geometry.ts',source.slice(0,source.indexOf('export const logoSvg ='))+'export const logoSvg = '+JSON.stringify(svg)+';\n');
console.log('Canonical source traced; official original unchanged.');
