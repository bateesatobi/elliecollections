import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PesapalPaymentPicker } from '../../components/PesapalPaymentPicker';
import {
  chargeViaPesapal,
  type PesapalMethod,
} from '../../services/pesapal';
import { formatUgx, useMarket } from '../../store/MarketStore';
import { useCurrency } from '../../store/CurrencyStore';
import type { FulfillmentMode } from '../../types';
import { Seo } from '../../components/Seo';

const SHOP = {
  name: 'Elliecollections Boutique',
  address: 'Plot 12, Acacia Avenue, Kololo',
  location: 'Kampala',
  hours: 'Mon–Sat 9:00–18:00 · Sun 10:00–16:00',
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const {
    customer,
    cart,
    cartTotal,
    products,
    loginCustomer,
    registerCustomer,
    placeOrder,
  } = useMarket();
  const { formatMoney, currency } = useCurrency();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [successMethod, setSuccessMethod] = useState<string | null>(null);
  const [successTotal, setSuccessTotal] = useState<number | null>(null);
  const [successCash, setSuccessCash] = useState(false);
  const [successFulfillment, setSuccessFulfillment] = useState<FulfillmentMode>('delivery');
  const [paying, setPaying] = useState(false);

  const [loginForm, setLoginForm] = useState({ id: '', password: '' });
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [fulfillment, setFulfillment] = useState<FulfillmentMode>('delivery');
  const [recipient, setRecipient] = useState({
    name: '',
    phone: '',
    address: '',
    location: '',
  });

  const [payMethod, setPayMethod] = useState<PesapalMethod>('mtn');
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
        <Link to="/" className="btn btn-primary">
          Browse marketplace
        </Link>
      </div>
    );
  }

  if (successId) {
    return (
      <div className="container section">
        <div className="panel" style={{ maxWidth: 560 }}>
          <div className="alert alert-ok">
            {successCash
              ? successFulfillment === 'pickup'
                ? 'Order placed — pay in cash at the shop'
                : 'Order placed — pay cash on delivery'
              : 'Pesapal payment completed'}
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
          <p className="muted" style={{ fontSize: 13 }}>
            You can track fulfilment anytime under Your orders.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to={`/orders/${successId}`} className="btn btn-primary">
              Track this order
            </Link>
            <Link to="/orders" className="btn btn-secondary">
              All orders
            </Link>
            <Link to="/" className="btn btn-secondary">
              Keep shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const deliveryFee =
    fulfillment === 'pickup' ? 0 : cartTotal >= 200000 ? 0 : 15000;
  const total = cartTotal + deliveryFee;

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(await loginCustomer(loginForm.id, loginForm.password));
  };

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(await registerCustomer(regForm));
  };

  const onPay = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer || paying) return;
    setOrderError(null);

    if (!recipient.name.trim() || !recipient.phone.trim()) {
      setOrderError('Enter the recipient name and phone number.');
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
      const phone = momoPhone.trim() || customer.phone;
      const charged = await chargeViaPesapal({
        amountUgx: total,
        method: payMethod,
        phone,
        cardName: card.name,
        cardNumber: card.number,
        cardExpiry: card.expiry,
        cardCvv: card.cvv,
        customerEmail: customer.email,
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
      });

      if (result.ok === false) {
        setOrderError(result.error);
        return;
      }

      setSuccessId(result.order.id);
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
        Sign in, choose delivery or shop pickup, then pay with Pesapal or cash.
      </p>

      <div className="amz-checkout-grid">
        <div className="panel">
          {!customer ? (
            <>
              <div className="chip-row" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className={`chip ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => setMode('login')}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`chip ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => setMode('register')}
                >
                  Create account
                </button>
              </div>

              {authError && <div className="alert alert-error">{authError}</div>}

              {mode === 'login' ? (
                <form onSubmit={onLogin}>
                  <div className="field">
                    <label>Phone or email</label>
                    <input
                      value={loginForm.id}
                      onChange={(e) => setLoginForm({ ...loginForm, id: e.target.value })}
                      placeholder="amina@example.com"
                    />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="shop123"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Continue to fulfilment
                  </button>
                  <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                    Demo: amina@example.com / shop123
                  </p>
                </form>
              ) : (
                <form onSubmit={onRegister}>
                  <div className="field">
                    <label>Full name</label>
                    <input
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Phone</label>
                    <input
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Create & continue
                  </button>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={onPay}>
              <div className="alert alert-ok" style={{ marginBottom: 12 }}>
                Signed in as {customer.name} ({customer.phone})
              </div>
              {orderError && <div className="alert alert-error">{orderError}</div>}

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
                {fulfillment === 'pickup' ? 'Who is collecting?' : 'Who is receiving?'}
              </h3>
              <div className="field">
                <label>Full name</label>
                <input
                  value={recipient.name}
                  onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                  placeholder="Recipient full name"
                  required
                  disabled={paying}
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  value={recipient.phone}
                  onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
                  placeholder="0772 123 456"
                  inputMode="tel"
                  required
                  disabled={paying}
                />
              </div>

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
                      placeholder="Kampala, Ntinda, Tororo…"
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
                    Bring your order reference and a matching ID / phone when collecting.
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
                <div className="field">
                  <label>
                    {payMethod === 'mtn' ? 'MTN MoMo number' : 'Airtel Money number'}
                  </label>
                  <input
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="0772 123 456"
                    inputMode="tel"
                    disabled={paying}
                  />
                  <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                    Pesapal will send a payment prompt to this phone.
                  </p>
                </div>
              ) : payMethod === 'card' ? (
                <>
                  <div className="field">
                    <label>Name on card</label>
                    <input
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                      placeholder="Amina Namukasa"
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
                  <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>
                    Demo card: 4111 1111 1111 1111 · any future expiry · any CVV
                  </p>
                </>
              ) : (
                <div className="alert alert-ok" style={{ marginBottom: 12 }}>
                  {fulfillment === 'pickup'
                    ? 'Have exact cash ready when you collect at the boutique. Your order is confirmed now.'
                    : 'Have exact cash ready for the delivery agent. Your order is confirmed now; payment is collected on arrival.'}
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
                      ? 'Processing card with Pesapal…'
                      : 'Waiting for Pesapal MoMo approval…'
                  : payMethod === 'cash'
                    ? fulfillment === 'pickup'
                      ? `Place order · Pay ${formatMoney(total)} at shop`
                      : `Place order · Pay ${formatMoney(total)} on delivery`
                    : `Pay ${formatMoney(total)} with Pesapal`}
              </button>
              {currency.code !== 'UGX' ? (
                <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                  Displayed as {currency.flag} {currency.code} ({currency.country}). Settlement and
                  Pesapal charge: {formatUgx(total)}.
                </p>
              ) : null}
            </form>
          )}
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
          {currency.code !== 'UGX' ? (
            <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              ≈ {formatUgx(total)} · rates for {currency.country}
            </p>
          ) : null}
          <p className="muted" style={{ marginTop: 14, fontSize: 12 }}>
            Pay online with Pesapal (MTN MoMo, Airtel Money, or card), or pay in cash on delivery /
            at the shop.
          </p>
        </aside>
      </div>
    </div>
  );
}
