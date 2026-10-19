import {describe,it,expect} from 'vitest';
import {parseCsv,csvCell} from '../src/lib/csv';
describe('catalogue CSV',()=>{
 it('handles quoted commas, escaped quotes and line breaks',()=>expect(parseCsv('name,description\r\n"Room, one","A ""fine""\nroom"')).toEqual([['name','description'],['Room, one','A "fine"\nroom']]));
 it('rejects malformed quoting',()=>{expect(()=>parseCsv('"unfinished')).toThrow();expect(()=>parseCsv('"closed"extra')).toThrow();});
 it('neutralizes spreadsheet formulas including whitespace prefixes',()=>{expect(csvCell(' =HYPERLINK("x")')).toBe('"\' =HYPERLINK(""x"")"');expect(csvCell('Kitchen')).toBe('"Kitchen"');});
});
