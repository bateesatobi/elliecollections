/** Boutique contact + WhatsApp helpers for East Africa storefront. */

const DEFAULT_WA = '256746157039';
const DEFAULT_DISPLAY = '+256 746 157 039';

function digitsOnly(value: string) {
  return (value || '').replace(/\D/g, '');
}

export const SHOP = {
  name: 'Elliecollections',
  /** Region we serve — no street / city pin on the storefront. */
  region: 'East Africa',
  marketsLabel: 'Uganda · Kenya · Tanzania · Rwanda · South Sudan · DR Congo',
  hours: 'Mon–Sat 9:00–18:00 · Sun 10:00–16:00',
  /** Digits only with country code. Override with VITE_WHATSAPP_NUMBER. */
  whatsapp: digitsOnly(
    (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || DEFAULT_WA,
  ),
  phoneDisplay:
    (import.meta.env.VITE_SHOP_PHONE as string | undefined) || DEFAULT_DISPLAY,
  returnsWindowDays: 7,
  deliveryNote: 'Delivery across East Africa — confirm your city on WhatsApp after checkout.',
  /** @deprecated use region / marketsLabel — kept for older call sites */
  address: 'East Africa',
  location: 'East Africa',
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
  const priceBit = opts.priceLabel ? `\nPrice: ${opts.priceLabel}` : '';
  return `Hi Elliecollections 👋 I'd like to order / ask about:\n${opts.title}${sizeBit}${priceBit}\n${opts.productUrl}`;
}

export function cartWhatsAppMessage(lines: string[], totalLabel: string) {
  return `Hi Elliecollections 👋 I'd like to order from my bag:\n${lines.join('\n')}\nTotal: ${totalLabel}\nPlease confirm availability & delivery.`;
}

export function orderConfirmWhatsAppMessage(opts: {
  orderId: string;
  phone: string;
  totalLabel: string;
  fulfillment: 'delivery' | 'pickup';
  cash?: boolean;
  paymentLabel?: string;
}) {
  const how =
    opts.fulfillment === 'pickup'
      ? 'arrange collection with our team'
      : 'home / courier delivery';
  const pay =
    opts.paymentLabel ||
    (opts.cash
      ? opts.fulfillment === 'pickup'
        ? 'Payment: cash at collection'
        : 'Payment: cash on delivery'
      : 'Payment: completed online');
  return `Hi Elliecollections 👋 I just placed order ${opts.orderId}.\nPhone: ${opts.phone}\nFulfilment: ${how}\nTotal: ${opts.totalLabel}\n${pay}\nPlease confirm — I’ll be available for a call if needed.`;
}

export function sizeHelpWhatsAppMessage(opts: { title: string; productUrl: string }) {
  return `Hi Elliecollections 👋 I need size / fit help for:\n${opts.title}\n${opts.productUrl}\nMy usual size is: `;
}
