import {it,expect} from 'vitest';
import {uploadMime,boundedFormData,MAX_UPLOAD_BYTES} from '../src/lib/uploads';
it('requires complete known file signatures',()=>{expect(uploadMime(new Uint8Array([0xff,0xd8,0xff,0xe0]))).toBe('image/jpeg');expect(()=>uploadMime(new Uint8Array([0x89,0x50]))).toThrow();expect(()=>uploadMime(new TextEncoder().encode('<script>'))).toThrow();});
it('rejects oversized declared uploads before parsing',async()=>{await expect(boundedFormData(new Request('http://localhost/upload',{method:'POST',headers:{'content-length':String(MAX_UPLOAD_BYTES+2000000)},body:'x'}))).rejects.toMatchObject({status:413});});

it('bounds JSON streams even without a declared content length',async()=>{
 const {boundedJson}=await import('../src/lib/uploads');
 const req=new Request('http://localhost/api/quotes',{method:'POST',body:JSON.stringify({notes:'x'.repeat(100)})});
 await expect(boundedJson(req,20)).rejects.toMatchObject({status:413});
 expect(await boundedJson(new Request('http://localhost/api/quotes',{method:'POST',body:'{"notes":"small"}'}))).toEqual({notes:'small'});
});
