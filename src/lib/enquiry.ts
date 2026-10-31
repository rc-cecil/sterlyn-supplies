export type EnquiryItem = {
  type: 'product' | 'inspiration';
  slug: string;
  name: string;
  quantity: number;
  finish?: string;
  image?: string;
};

export const BUSINESS_WHATSAPP = '447576899618';
export const BUSINESS_PHONE = '+447576899618';
export const BUSINESS_FACEBOOK = 'https://www.facebook.com/61595476006250/?hpir=1';
export const ENQUIRY_STORAGE_KEY = 'sterlyn-enquiry-selection-v1';
export const ENQUIRY_EVENT = 'sterlyn-enquiry-change';

export function enquiryKey(item: EnquiryItem): string {
  return [item.type, item.slug, item.finish || ''].join(':');
}

export function enquiryUrl(item: EnquiryItem): string {
  const params = new URLSearchParams({
    type: item.type,
    slug: item.slug,
    name: item.name,
    quantity: String(item.quantity),
  });
  if (item.finish) params.set('finish', item.finish);
  return '/contact?' + params.toString();
}

export function enquiryItemUrl(item: EnquiryItem): string {
  return item.type === 'product' ? '/products/' + encodeURIComponent(item.slug) : '/inspiration/' + encodeURIComponent(item.slug);
}

export function readEnquiryBag(): EnquiryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ENQUIRY_STORAGE_KEY) || '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 40).filter((item): item is EnquiryItem =>
      item !== null && typeof item === 'object' &&
      (item.type === 'product' || item.type === 'inspiration') &&
      typeof item.slug === 'string' && typeof item.name === 'string' &&
      item.slug.length <= 150 && item.name.length <= 180 &&
      Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99
    );
  } catch {
    return [];
  }
}

export function writeEnquiryBag(items: EnquiryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ENQUIRY_STORAGE_KEY, JSON.stringify(items.slice(0, 40)));
    window.dispatchEvent(new Event(ENQUIRY_EVENT));
  } catch {
    // Storage may be disabled. Visitors can still enquire about a single item.
  }
}

export function addEnquiryItem(item: EnquiryItem): void {
  const bag = readEnquiryBag();
  const match = bag.findIndex(existing => enquiryKey(existing) === enquiryKey(item));
  if (match >= 0) {
    bag[match] = { ...bag[match], quantity: Math.min(99, bag[match].quantity + item.quantity) };
  } else if (bag.length < 40) {
    bag.push(item);
  }
  writeEnquiryBag(bag);
}

export function readDirectEnquiry(params: URLSearchParams): EnquiryItem | null {
  const type = params.get('type');
  const slug = (params.get('slug') || '').trim().slice(0, 150);
  const name = (params.get('name') || '').trim().slice(0, 180);
  if ((type !== 'product' && type !== 'inspiration') || !slug || !name) return null;
  const n = Number(params.get('quantity') || 1);
  return { type, slug, name, quantity: Number.isFinite(n) ? Math.max(1, Math.min(99, Math.round(n))) : 1, finish: (params.get('finish') || '').slice(0, 120) || undefined };
}

export function whatsappEnquiryText(items: EnquiryItem[], customerName: string, notes: string): string {
  const lines = ['Hello Sterlyn Supplies, I would like to enquire about the following:'];
  if (items.length) {
    lines.push('', 'My selections:');
    items.forEach((item, index) => {
      lines.push(String(index + 1) + '. ' + item.name + ' (' + item.type + ')' +
        (item.finish ? ' — ' + item.finish : '') + ' × ' + String(item.quantity));
      lines.push('   ' + (typeof window !== 'undefined' ? window.location.origin : '') + enquiryItemUrl(item));
    });
  } else {
    lines.push('', 'I would like to discuss your products and services.');
  }
  if (customerName.trim()) lines.push('', 'Name: ' + customerName.trim());
  if (notes.trim()) lines.push('', 'Details: ' + notes.trim());
  lines.push('', 'Please let me know the available options and quotation details. Thank you.');
  return lines.join('\n');
}
