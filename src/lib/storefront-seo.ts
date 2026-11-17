import type {Metadata} from 'next';

export const storefrontOrigin='https://sterlynsupplies.com';
export const storefrontTitle='Sterlyn Supplies — Kitchen design & furniture in Accra';
export const storefrontDescription='Kitchen design, furniture supply and professional fitting in Accra. Explore the Sterlyn showroom, plan your space in 3D and request a personalised quotation.';
export const storefrontImage='/images/kitchen-emerald-v2.webp';

export function storefrontIndexing(){
 return process.env.PUBLIC_LAUNCH==='true' && process.env.BETTER_AUTH_URL?.replace(/\/$/,'')===storefrontOrigin;
}

export function storefrontMetadata({path,title,description,image=storefrontImage,index=true}:{path:string;title?:string;description:string;image?:string;index?:boolean}):Metadata{
 const url=storefrontOrigin+path;
 const shareTitle=title?`${title} | Sterlyn Supplies`:storefrontTitle;
 return {title:title??{absolute:storefrontTitle},description,alternates:{canonical:url},robots:{index:storefrontIndexing()&&index,follow:true},
  openGraph:{type:'website',siteName:'Sterlyn Supplies',url,title:shareTitle,description,images:[image]},
  twitter:{card:'summary_large_image',title:shareTitle,description,images:[image]}};
}
