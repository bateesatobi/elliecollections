/** Boutique contact + WhatsApp helpers for East Africa storefront. */

const DEFAULT_WA = '256746157039';
const DEFAULT_DISPLAY = '+256 746 157 039';

function digitsOnly(value: string) {
  return (value || '').replace(/\D/g, '');
}

export const SHOP = {
  name: 'Elliecollections Boutique',
  address: 'Plot 12, Acacia Avenue, Kololo',
  location: 'Kampala',
  hours: 'Mon–Sat 9:00–18:00 · Sun 10:00–16:00',
  /** Digits only with country code. Override with VITE_WHATSAPP_NUMBER. */
  whatsapp: digitsOnly(
    (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || DEFAULT_WA,
  ),
  phoneDisplay:
    (import.meta.env.VITE_SHOP_PHONE as string | undefined) || DEFAULT_DISPLAY,
  returnsWindowDays: 7,
  deliveryNote:
    'Delivery across Uganda; East Africa shipping on request via WhatsApp.',
};

export function whatsappHref(message?: string) {
  const digits = SHOP.whatsapp;
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function productWhatsAppMessage(opts: {
  title: string;
  productUrl: string;
  size?: string;
  priceLabel?: string;
}) {
  const sizeBit = opts.size ? ` (size ${opts.size})` : '';
  const priceBit = opts.priceLabel ? ` — ${opts.priceLabel}` : '';
  return `Hi Elliecollections 👋 I'd like to order / ask about:\n${opts.title}${sizeBit}${priceBit}\n${opts.productUrl}`;
}

export function cartWhatsAppMessage(lines: string[], totalLabel: string) {
  return `Hi Elliecollections 👋 I'd like to order from my bag:\n${lines.join('\n')}\nTotal: ${totalLabel}\nPlease confirm availability & delivery.`;
}

export function orderConfirmWhatsAppMessage(opts: {
  orderId: string;
  phone: string;
  fulfillment: 'delivery' | 'pickup';
  totalLabel: string;
  cash: boolean;
}) {
  const how =
    opts.fulfillment === 'pickup'
      ? 'shop pickup in Kololo'
      : 'home delivery';
  const pay = opts.cash
    ? opts.fulfillment === 'pickup'
      ? 'I will pay cash at the shop'
      : 'I will pay cash on delivery'
    : 'Payment already completed online';
  return `Hi Elliecollections 👋 I just placed order ${opts.orderId}.\nPhone: ${opts.phone}\nFulfilment: ${how}\nTotal: ${opts.totalLabel}\n${pay}\nPlease confirm — I’ll be available for a call if needed.`;
}

export function sizeHelpWhatsAppMessage(opts: {
  title: string;
  productUrl: string;
}) {
  return `Hi Elliecollections 👋 I need size / fit help for:\n${opts.title}\n${opts.productUrl}\nMy usual size is: `;
}
