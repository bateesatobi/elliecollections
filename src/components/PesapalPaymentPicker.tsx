import type { ReactNode } from 'react';
import type { PesapalMethod } from '../services/pesapal';
import { PESAPAL_METHODS } from '../services/pesapal';
import {
  AirtelMoneyIcon,
  CardPayIcon,
  CashPayIcon,
  MtnMomoIcon,
  PesapalBadgeIcon,
} from './PaymentMethodIcons';
import './PesapalPaymentPicker.css';

type Props = {
  value: PesapalMethod;
  onChange: (method: PesapalMethod) => void;
  disabled?: boolean;
  /** Adjust cash label for delivery vs shop pickup */
  fulfillmentMode?: 'delivery' | 'pickup';
};

const ICONS: Record<PesapalMethod, ReactNode> = {
  mtn: <MtnMomoIcon className="pesa-logo" />,
  airtel: <AirtelMoneyIcon className="pesa-logo" />,
  card: <CardPayIcon className="pesa-logo" />,
  cash: <CashPayIcon className="pesa-logo" />,
};

export function PesapalPaymentPicker({
  value,
  onChange,
  disabled,
  fulfillmentMode = 'delivery',
}: Props) {
  const cashHint =
    fulfillmentMode === 'pickup'
      ? 'Pay in cash when you collect at the boutique'
      : 'Pay the rider in cash when your order arrives';
  const cashLabel =
    fulfillmentMode === 'pickup' ? 'Pay at shop' : 'Pay on delivery';

  return (
    <div className="pesa-wrap">
      <div className="pesa-brand">
        <span className="pesa-mark">
          <PesapalBadgeIcon className="pesa-secure-icon" />
          Payment method
        </span>
        <span className="pesa-secure">Secured by Pesapal</span>
      </div>
      <div className="pesa-grid" role="radiogroup" aria-label="Payment method">
        {PESAPAL_METHODS.map((m) => {
          const active = value === m.id;
          const label = m.id === 'cash' ? cashLabel : m.label;
          const hint = m.id === 'cash' ? cashHint : m.hint;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              className={`pesa-option pesa-${m.id} ${active ? 'active' : ''}`}
              onClick={() => onChange(m.id)}
            >
              <span className="pesa-logo-wrap" aria-hidden>
                {ICONS[m.id]}
              </span>
              <span className="pesa-copy">
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
              <span className="pesa-radio" aria-hidden />
            </button>
          );
        })}
      </div>
      <div className="pesa-accepted" aria-hidden>
        <span>Accepted</span>
        <MtnMomoIcon className="pesa-mini" />
        <AirtelMoneyIcon className="pesa-mini" />
        <CardPayIcon className="pesa-mini" />
        <CashPayIcon className="pesa-mini" />
      </div>
    </div>
  );
}
