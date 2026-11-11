/**
 * PA Home Product Manual — Cabinet Systems, 96-page PDF supplied by client.
 * These are SUPPLIER REFERENCES; they do not establish availability or reseller rights.
 * Dimensions below are transcribed from the specified catalogue pages.
 * For taps the manual lists PACKAGING dimensions, not installed dimensions.
 * Only the curated kitchen and sink references are published. Source photos are bundled locally.
 */
export type SupplierReference = {
  slug:string; name:string; category:string; style:string; material:string; asset:string;
  finish:string; color:string; description:string; referenceCode:string;
  sourcePdfPage:number; dimensions:string; dimensionKind:'product'|'packaging'|'custom';
  sourcePhoto?:string; finishOptions?:readonly string[];
};
const photo=(filename:string)=>'/images/supplier/'+filename+'.webp';
export const supplierCatalogueProducts: SupplierReference[] = [
  {slug:'pa-blue-lacquer-kitchen',name:'Navy Lacquer & Quartz Kitchen',category:'kitchens',style:'Modern',material:'Lacquer, melamine and quartz stone',asset:'forest-shaker',finish:'Navy blue and white',color:'#253f59',referenceCode:'L3157B / L3110B / PHH-WG466',sourcePdfPage:9,dimensions:'Custom room measurement required',dimensionKind:'custom',sourcePhoto:photo('navy-kitchen'),description:'Supplier kitchen concept with navy and white lacquer doors, framed glass door YH606 and PHH-WG466 quartz worktop.'},
  {slug:'pa-sink-304-620',name:'304 Stainless Single Bowl Sink 620 mm',category:'sinks',style:'Modern',material:'304 stainless steel',asset:'steel-undermount-sink',finish:'Brushed',color:'#aaaeb0',referenceCode:'ZPA101-S10046',sourcePdfPage:91,dimensions:'620 × 446 × 228 mm',dimensionKind:'product',sourcePhoto:photo('sink-zpa101-s10046'),description:'Stainless steel kitchen sink; ensure cabinetry dimensions and plumbing connections match.'},
];
