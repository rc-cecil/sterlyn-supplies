export function parseCsv(source:string):string[][]{
 if(source.length>2_000_000)throw new Error('CSV exceeds 2 MB');
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
 const input=source.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(quoted){if(c==='"'){if(input[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'){if(field||closed)throw new Error('Unexpected quote in CSV');quoted=true;continue;}
  if(c===','||c==='\n'||c==='\r'){
   row.push(field);field='';closed=false;
   if(c!==','){if(c==='\r'&&input[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}
  }else{if(closed)throw new Error('Unexpected characters after CSV quote');field+=c;}
 }
 if(quoted)throw new Error('CSV contains an unclosed quote');
 if(field||row.length){row.push(field);rows.push(row);}
 if(rows.length>1001)throw new Error('CSV supports up to 1000 records');
 return rows;
}
export function csvCell(value:unknown){const s=value===null||value===undefined?'':String(value);return '"'+(/^[\s]*[=+@-]/.test(s)?"'":'')+s.replaceAll('"','""')+'"';}
