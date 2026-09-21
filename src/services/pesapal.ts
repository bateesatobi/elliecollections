import { normalizeE164, validateMobilePhone } from '../utils/phone';

export type PesapalMethod = 'mtn' | 'airtel' | 'card' | 'cash';

export type PesapalChargeInput = {
  amountUgx: number;
  method: PesapalMethod;
  /** Required for MTN / Airtel */
  phone?: string;
  /** Card demo fields */
  cardName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  customerEmail?: string;
  description?: string;
};

export type PesapalChargeResult =
  | {
      ok: true;
      trackingId: string;
      merchantReference: string;
      paymentRef: string;
      method: PesapalMethod;
      methodLabel: string;
      /** Cash on delivery is confirmed but not collected yet */
      payOnDelivery: boolean;
    }
  | { ok: false; error: string };

export const PESAPAL_METHODS: Array<{
  id: PesapalMethod;
  label: string;
  hint: string;
}> = [
  {
    id: 'mtn',
    label: 'MTN MoMo',
    hint: 'Approve the Pesapal prompt on your MTN phone',
  },
  {
    id: 'airtel',
    label: 'Airtel Money',
    hint: 'Approve the Pesapal prompt on your Airtel phone',
  },
  {
    id: 'card',
    label: 'Card',
    hint: 'Visa / Mastercard via Pesapal secure checkout',
  },
  {
    id: 'cash',
    label: 'Pay on delivery / at shop',
    hint: 'Pay in cash when your order is delivered or when you pick up',
  },
];

export function pesapalMethodLabel(method: PesapalMethod): string {
  return PESAPAL_METHODS.find((m) => m.id === method)?.label ?? method;
}

export function normalizeUgPhone(phone: string): string {
  return normalizeE164(phone, 'UG');
}

export function validateUgMobile(phone: string): string | null {
  return validateMobilePhone(phone, 'UG');
}

function luhnOk(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let n = Number(num[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function validateCardFields(input: {
  cardName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
}): string | null {
  const name = (input.cardName ?? '').trim();
  const number = (input.cardNumber ?? '').replace(/\s+/g, '');
  const expiry = (input.cardExpiry ?? '').trim();
  const cvv = (input.cardCvv ?? '').trim();

  if (name.length < 2) return 'Enter the name on the card.';
  if (!/^\d{13,19}$/.test(number) || !luhnOk(number)) {
    return 'Enter a valid card number.';
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
    return 'Expiry must be MM/YY.';
  }
  const [mm, yy] = expiry.split('/').map(Number);
  const now = new Date();
  const exp = new Date(2000 + yy, mm);
  if (exp <= now) return 'Card appears expired.';
  if (!/^\d{3,4}$/.test(cvv)) return 'Enter a valid CVV.';
  return null;
}

/**
 * Demo payment — calls Agrobackend `/market/payments/charge` when a customer token exists.
 * Cash on delivery is handled locally (no charge).
 */
export async function chargeViaPesapal(
  input: PesapalChargeInput,
): Promise<PesapalChargeResult> {
  if (!Number.isFinite(input.amountUgx) || input.amountUgx <= 0) {
    return { ok: false, error: 'Invalid payment amount.' };
  }

  if (input.method === 'cash') {
    await new Promise((r) => setTimeout(r, 400));
    const merchantReference = `AGS-${Date.now().toString(36).toUpperCase()}`;
    const paymentRef = `CASH-${Math.floor(100000 + Math.random() * 899999)}`;
    return {
      ok: true,
      trackingId: `COD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      merchantReference,
      paymentRef,
      method: 'cash',
      methodLabel: pesapalMethodLabel('cash'),
      payOnDelivery: true,
    };
  }

  if (input.method === 'mtn' || input.method === 'airtel') {
    const phoneError = validateUgMobile(input.phone ?? '');
    if (phoneError) return { ok: false, error: phoneError };
  } else {
    const cardError = validateCardFields(input);
    if (cardError) return { ok: false, error: cardError };
  }

  try {
    const { getCustomerToken, marketApi } = await import('./api');
    const token = getCustomerToken();
    const charged = await marketApi.charge(token, {
      amount_ugx: Math.round(input.amountUgx),
      method: input.method,
      phone: input.phone,
      card:
        input.method === 'card'
          ? {
              name: input.cardName || '',
              number: input.cardNumber || '',
              expiry: input.cardExpiry || '',
              cvv: input.cardCvv || '',
            }
          : undefined,
    });
    return {
      ok: true,
      trackingId: charged.tracking_id,
      merchantReference: charged.merchant_reference,
      paymentRef: charged.payment_ref,
      method: input.method,
      methodLabel: pesapalMethodLabel(input.method),
      payOnDelivery: false,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Payment charge failed.',
    };
  }
}
