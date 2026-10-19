import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const rows=JSON.parse(await readFile('out/catalogue-assets/generation-manifest.json','utf8'));
await mkdir('public/images/products',{recursive:true});
const manifest=[];
for(const row of rows){
 const file='public/images/products/'+row.asset+'.webp';
 await copyFile(row.source,'out/catalogue-assets/'+row.asset+'.png');
 const original=await sharp(row.source).metadata();
 await sharp(row.source).webp({quality:88,effort:6}).toFile(file);
 const bytes=await readFile(file);
 manifest.push({asset:row.asset,file:'/'+file.replace(/^public\//,''),width:original.width,height:original.height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),origin:'Original AI-generated illustrative product preview',generator:'built-in image_gen',prompt:row.prompt});
}
await writeFile('docs/product-image-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Optimised original catalogue images:',manifest.length,'total bytes:',manifest.reduce((sum,row)=>sum+row.bytes,0));
