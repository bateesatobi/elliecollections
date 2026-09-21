import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PesapalPaymentPicker } from '../../components/PesapalPaymentPicker';
import { PhoneInput } from '../../components/PhoneInput';
import { TrustStrip } from '../../components/TrustStrip';
import { Seo } from '../../components/Seo';
import {
  chargeViaPesapal,
  type PesapalMethod,
} from '../../services/pesapal';
import { formatUgx, useMarket } from '../../store/MarketStore';
import { useCurrency } from '../../store/CurrencyStore';
import type { FulfillmentMode } from '../../types';
import { SHOP, orderConfirmWhatsAppMessage, whatsappHref } from '../../utils/shopContact';
import { validateMobilePhone } from '../../utils/phone';

function isoFromCurrency(code: string) {
  const map: Record<string, string> = {
    UGX: 'UG',
    KES: 'KE',
    TZS: 'TZ',
    RWF: 'RW',
    SSP: 'SS',
    CDF: 'CD',
  };
  return map[code] || 'UG';
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { customer, cart, cartTotal, products, placeOrder } = useMarket();
  const { formatMoney, currency, detectedCountry } = useCurrency();
  const defaultIso = detectedCountry || isoFromCurrency(currency.code);

  const [orderError, setOrderError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [successPhone, setSuccessPhone] = useState('');
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [successMethod, setSuccessMethod] = useState<string | null>(null);
  const [successTotal, setSuccessTotal] = useState<number | null>(null);
  const [successCash, setSuccessCash] = useState(false);
  const [successFulfillment, setSuccessFulfillment] = useState<FulfillmentMode>('delivery');
  const [paying, setPaying] = useState(false);

  const [fulfillment, setFulfillment] = useState<FulfillmentMode>('delivery');
  const [recipient, setRecipient] = useState({
    name: '',
    phone: '',
    address: '',
    location: '',
  });

  const [payMethod, setPayMethod] = useState<PesapalMethod>('cash');
  const [momoPhone, setMomoPhone] = useState('');
  const [card, setCard] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: '',
  });

  useEffect(() => {
    if (!customer) return;
    setRecipient((prev) => ({
      name: prev.name || customer.name || '',
      phone: prev.phone || customer.phone || '',
      address: prev.address,
      location: prev.location,
    }));
    setMomoPhone((prev) => prev || customer.phone);
  }, [customer]);

  if (!cart.length && !successId) {
    return (
      <div className="container section">
        <h2>Nothing to checkout</h2>
        <p className="muted">Add items to your bag first.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          <Link to="/shop" className="btn btn-primary">
            Browse shop
          </Link>
          <Link to="/track" className="btn btn-secondary">
            Track an order
          </Link>
        </div>
      </div>
    );
  }

  if (successId) {
    const trackHref = `/track?phone=${encodeURIComponent(successPhone)}&order=${encodeURIComponent(successId)}`;
    const wa = whatsappHref(
      orderConfirmWhatsAppMessage({
        orderId: successId,
        phone: successPhone,
        fulfillment: successFulfillment,
        totalLabel: successTotal != null ? formatMoney(successTotal) : '',
        cash: successCash,
      }),
    );
    return (
      <div className="container section">
        <div className="panel" style={{ maxWidth: 560 }}>
          <div className="alert alert-ok">
            {successCash
              ? successFulfillment === 'pickup'
                ? 'Order placed — pay in cash at the shop'
                : 'Order placed — pay cash on delivery'
              : 'Payment completed'}
          </div>
          <h2>Order {successId}</h2>
          <p className="muted" style={{ marginBottom: 8 }}>
            {successCash ? (
              <>
                Pay <strong>{successTotal != null ? formatMoney(successTotal) : ''}</strong> in cash
                {successFulfillment === 'pickup'
                  ? ' when you collect at the boutique'
                  : ' when your order arrives'}{' '}
                ({successMethod}).
                {currency.code !== 'UGX' && successTotal != null ? (
                  <> · {formatUgx(successTotal)} charged</>
                ) : null}
              </>
            ) : (
              <>
                Paid with <strong>{successMethod}</strong>
                {successTotal != null ? <> · {formatMoney(successTotal)}</> : null}
                {currency.code !== 'UGX' && successTotal != null ? (
                  <> ({formatUgx(successTotal)})</>
                ) : null}
              </>
            )}
          </p>
          <p className="muted">
            Fulfilment:{' '}
            <strong>
              {successFulfillment === 'pickup' ? 'Shop pickup' : 'Home delivery'}
            </strong>
          </p>
          <p className="muted">
            Reference: <strong>{successRef}</strong>
          </p>
          <div className="alert alert-ok" style={{ marginTop: 8 }}>
            <strong>Next step:</strong> tap WhatsApp so we confirm your order and call if the rider
            needs you. Keep your phone on.
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Track anytime with your phone number — no password.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {wa ? (
              <a href={wa} className="btn btn-primary" target="_blank" rel="noreferrer">
                Confirm on WhatsApp
              </a>
            ) : null}
            <Link to={trackHref} className="btn btn-secondary">
              Track my orders
            </Link>
            <Link to="/shop" className="btn btn-secondary">
              Keep shopping
            </Link>
          </div>
          {!customer ? (
            <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
              Want faster reorders?{' '}
              <Link to="/signin?next=/orders">Continue with this phone</Link>
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
              <Link to="/orders">View all your orders</Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  const deliveryFee = fulfillment === 'pickup' ? 0 : cartTotal >= 200000 ? 0 : 15000;
  const total = cartTotal + deliveryFee;

  const onPay = async (e: FormEvent) => {
    e.preventDefault();
    if (paying) return;
    setOrderError(null);

    if (!recipient.name.trim() || !recipient.phone.trim()) {
      setOrderError('Enter your name and phone number.');
      return;
    }
    const phoneErr = validateMobilePhone(recipient.phone, defaultIso);
    if (phoneErr) {
      setOrderError(phoneErr);
      return;
    }
    if (fulfillment === 'delivery') {
      if (!recipient.address.trim() || !recipient.location.trim()) {
        setOrderError('Enter the delivery address and location / district.');
        return;
      }
    }

    setPaying(true);

    try {
      const phone = momoPhone.trim() || recipient.phone.trim();
      const charged = await chargeViaPesapal({
        amountUgx: total,
        method: payMethod,
        phone,
        cardName: card.name,
        cardNumber: card.number,
        cardExpiry: card.expiry,
        cardCvv: card.cvv,
        customerEmail: customer?.email || '',
        description: `Elliecollections order (${cart.length} lines)`,
      });

      if (charged.ok === false) {
        setOrderError(charged.error);
        return;
      }

      const deliveryAddress =
        fulfillment === 'pickup'
          ? `${SHOP.name} — ${SHOP.address}`
          : recipient.address.trim();
      const district =
        fulfillment === 'pickup' ? SHOP.location : recipient.location.trim();

      const result = await placeOrder({
        deliveryAddress,
        district,
        paymentRef: charged.paymentRef,
        paymentMethod: charged.method,
        paymentTrackingId: charged.trackingId,
        merchantReference: charged.merchantReference,
        fulfillmentMode: fulfillment,
        recipientName: recipient.name.trim(),
        recipientPhone: recipient.phone.trim(),
        customerName: recipient.name.trim(),
        customerPhone: recipient.phone.trim(),
        customerEmail: customer?.email,
      });

      if (result.ok === false) {
        setOrderError(result.error);
        return;
      }

      setSuccessId(result.order.id);
      setSuccessPhone(recipient.phone.trim());
      setSuccessRef(charged.paymentRef);
      setSuccessMethod(charged.methodLabel);
      setSuccessTotal(result.order.totalUgx);
      setSuccessCash(charged.payOnDelivery);
      setSuccessFulfillment(fulfillment);
      navigate('/checkout', { replace: true });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="container section">
      <Seo title="Checkout" path="/checkout" noIndex />
      <h2>Checkout</h2>
      <p className="muted">
        No account needed — enter your name and phone, choose delivery or shop pickup, then pay
        with cash, MTN, or Airtel.
      </p>

      <TrustStrip compact />

      <div className="amz-checkout-grid" style={{ marginTop: 16 }}>
        <div className="panel">
          <form onSubmit={onPay}>
            {customer ? (
              <div className="alert alert-ok" style={{ marginBottom: 12 }}>
                Signed in as {customer.name} ({customer.phone})
              </div>
            ) : (
              <div className="alert alert-ok" style={{ marginBottom: 12 }}>
                Guest checkout · Track later with your phone number.{' '}
                <Link to="/signin?next=/checkout">Have an account? Sign in</Link>
              </div>
            )}
            {orderError ? <div className="alert alert-error">{orderError}</div> : null}

            <h3 style={{ margin: '0 0 0.65rem', fontSize: '1.05rem' }}>How will you receive it?</h3>
            <div className="chip-row" style={{ marginBottom: 14 }}>
              <button
                type="button"
                className={`chip ${fulfillment === 'delivery' ? 'active' : ''}`}
                disabled={paying}
                onClick={() => setFulfillment('delivery')}
              >
                Deliver to address
              </button>
              <button
                type="button"
                className={`chip ${fulfillment === 'pickup' ? 'active' : ''}`}
                disabled={paying}
                onClick={() => setFulfillment('pickup')}
              >
                Pick up from shop
              </button>
            </div>

            <h3 style={{ margin: '0 0 0.65rem', fontSize: '1.05rem' }}>
              {fulfillment === 'pickup' ? 'Who is collecting?' : 'Your details'}
            </h3>
            <div className="field">
              <label>Full name</label>
              <input
                value={recipient.name}
                onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                placeholder="Your full name"
                required
                disabled={paying}
                autoComplete="name"
              />
            </div>
            <PhoneInput
              id="checkout-phone"
              label="Phone (WhatsApp / MoMo)"
              value={recipient.phone}
              onChange={(v) => setRecipient({ ...recipient, phone: v })}
              defaultIso={defaultIso}
              required
              disabled={paying}
              hint="UG +256 · KE +254 · TZ +255 · RW +250 · SS +211 · CD +243 — used for delivery & tracking"
            />

            {fulfillment === 'delivery' ? (
              <>
                <div className="field">
                  <label>Delivery address</label>
                  <input
                    value={recipient.address}
                    onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
                    placeholder="Street, building, landmark"
                    required
                    disabled={paying}
                  />
                </div>
                <div className="field">
                  <label>Location / district</label>
                  <input
                    value={recipient.location}
                    onChange={(e) => setRecipient({ ...recipient, location: e.target.value })}
                    placeholder="Kampala, Ntinda, Entebbe…"
                    required
                    disabled={paying}
                  />
                </div>
              </>
            ) : (
              <div className="alert alert-ok" style={{ marginBottom: 14 }}>
                <strong>{SHOP.name}</strong>
                <div style={{ marginTop: 4 }}>
                  {SHOP.address}, {SHOP.location}
                </div>
                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                  {SHOP.hours}
                </div>
                <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>
                  Bring your order reference and matching ID / phone when collecting.
                </p>
              </div>
            )}

            <PesapalPaymentPicker
              value={payMethod}
              onChange={setPayMethod}
              disabled={paying}
              fulfillmentMode={fulfillment}
            />

            {payMethod === 'mtn' || payMethod === 'airtel' ? (
              <PhoneInput
                id="checkout-momo"
                label={payMethod === 'mtn' ? 'MTN MoMo number' : 'Airtel Money number'}
                value={momoPhone || recipient.phone}
                onChange={setMomoPhone}
                defaultIso={defaultIso}
                disabled={paying}
                hint="Pesapal will send a payment prompt to this phone."
              />
            ) : payMethod === 'card' ? (
              <>
                <div className="field">
                  <label>Name on card</label>
                  <input
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    disabled={paying}
                    autoComplete="cc-name"
                  />
                </div>
                <div className="field">
                  <label>Card number</label>
                  <input
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value })}
                    placeholder="4111 1111 1111 1111"
                    inputMode="numeric"
                    disabled={paying}
                    autoComplete="cc-number"
                  />
                </div>
                <div className="pesa-card-row">
                  <div className="field">
                    <label>Expiry (MM/YY)</label>
                    <input
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                      placeholder="12/28"
                      disabled={paying}
                      autoComplete="cc-exp"
                    />
                  </div>
                  <div className="field">
                    <label>CVV</label>
                    <input
                      value={card.cvv}
                      onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                      placeholder="123"
                      inputMode="numeric"
                      disabled={paying}
                      autoComplete="cc-csc"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="alert alert-ok" style={{ marginBottom: 12 }}>
                {fulfillment === 'pickup'
                  ? 'Have exact cash ready when you collect at the boutique. Your order is confirmed now.'
                  : 'Have exact cash ready for the delivery agent. Pay only when the order arrives.'}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-gold"
              style={{ width: '100%' }}
              disabled={paying}
            >
              {paying
                ? payMethod === 'cash'
                  ? 'Confirming order…'
                  : payMethod === 'card'
                    ? 'Processing card…'
                    : 'Waiting for MoMo approval…'
                : payMethod === 'cash'
                  ? fulfillment === 'pickup'
                    ? `Place order · Pay ${formatMoney(total)} at shop`
                    : `Place order · Pay ${formatMoney(total)} on delivery`
                  : `Pay ${formatMoney(total)}`}
            </button>
            {currency.code !== 'UGX' ? (
              <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                Displayed as {currency.flag} {currency.code}. Settlement: {formatUgx(total)}.
              </p>
            ) : null}
          </form>
        </div>

        <aside className="panel">
          <h3 style={{ marginTop: 0 }}>Order summary</h3>
          {cart.map((line) => {
            const p = products.find((x) => x.id === line.productId);
            if (!p) return null;
            return (
              <div
                key={`${line.productId}-${line.size || 'default'}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '0.45rem 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <span>
                  {p.title}
                  {line.size ? ` · ${line.size}` : ''} × {line.quantity}
                </span>
                <strong>{formatMoney(p.priceUgx * line.quantity)}</strong>
              </div>
            );
          })}
          <div style={{ marginTop: 12 }} className="muted">
            {fulfillment === 'pickup'
              ? 'Pickup: Free'
              : `Delivery: ${deliveryFee === 0 ? 'Free' : formatMoney(deliveryFee)}`}
          </div>
          <div className="price" style={{ marginTop: 6 }}>
            {formatMoney(total)}
          </div>
          <p className="muted" style={{ marginTop: 14, fontSize: 12 }}>
            Cash on delivery, pay at shop, MTN MoMo, Airtel Money, or card. Outside Uganda?{' '}
            {SHOP.deliveryNote}{' '}
            <Link to="/returns">Returns</Link> · <Link to="/size-guide">Size guide</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
