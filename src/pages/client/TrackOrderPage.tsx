import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClientOrderCard } from '../../components/ClientOrderCard';
import { OrderTrackingPanel } from '../../components/OrderTrackingPanel';
import { PhoneInput } from '../../components/PhoneInput';
import { Seo } from '../../components/Seo';
import { marketApi } from '../../services/api';
import { useMarket } from '../../store/MarketStore';
import { useCurrency } from '../../store/CurrencyStore';
import { validateMobilePhone } from '../../utils/phone';
import type { Order, OrderStatus } from '../../types';

const CURRENT_STATUSES: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped'];

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

function sortOrdersCurrentFirst(list: Order[]) {
  return list.slice().sort((a, b) => {
    const aCurrent = CURRENT_STATUSES.includes(a.status) ? 0 : 1;
    const bCurrent = CURRENT_STATUSES.includes(b.status) ? 0 : 1;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });
}

function OrderCardList({
  orders,
  onSelect,
}: {
  orders: Order[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="ec-track-order-list">
      {orders.map((o) => (
        <ClientOrderCard key={o.id} order={o} onSelect={() => onSelect(o.id)} />
      ))}
    </div>
  );
}

export function TrackOrderPage() {
  const [params] = useSearchParams();
  const { customer, orders, loading } = useMarket();
  const { currency, detectedCountry } = useCurrency();
  const defaultIso = detectedCountry || isoFromCurrency(currency.code);
  const [phone, setPhone] = useState(() => params.get('phone') || '');
  const [guestOrders, setGuestOrders] = useState<Order[]>([]);
  const [lookedUp, setLookedUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get('order'));
  const [mode, setMode] = useState<'lookup' | 'account'>(() =>
    customer ? 'account' : 'lookup',
  );

  const mine = useMemo(
    () =>
      sortOrdersCurrentFirst(
        orders.filter((o) => customer && o.userId === customer.id),
      ),
    [orders, customer],
  );

  const guestSorted = useMemo(
    () => sortOrdersCurrentFirst(guestOrders),
    [guestOrders],
  );

  const selectedPool = mode === 'account' && customer ? mine : guestSorted;
  const selected: Order | null =
    selectedPool.find((o) => o.id === selectedId) || null;

  useEffect(() => {
    if (customer) setMode('account');
  }, [customer]);

  const runLookup = async (phoneValue: string, preferOrderId?: string | null) => {
    setError(null);
    setBusy(true);
    setGuestOrders([]);
    setLookedUp(false);
    try {
      const found = await marketApi.lookupOrdersByPhone(phoneValue);
      setGuestOrders(found);
      setLookedUp(true);
      setMode('lookup');
      if (preferOrderId && found.some((o) => o.id === preferOrderId)) {
        setSelectedId(preferOrderId);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find orders for that phone.');
      setGuestOrders([]);
      setLookedUp(true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const qPhone = params.get('phone');
    if (!qPhone) return;
    setPhone(qPhone);
    void runLookup(qPhone, params.get('order'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once from URL
  }, [params]);

  const onLookup = async (e: FormEvent) => {
    e.preventDefault();
    const phoneErr = validateMobilePhone(phone, defaultIso);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    await runLookup(phone);
  };

  if (selected) {
    return (
      <div className="container section">
        <Seo
          title={`Tracking ${selected.id.slice(0, 8)}…`}
          description="Live order tracking for your Elliecollections purchase."
          path="/track"
          noIndex
        />
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginBottom: 14 }}
          onClick={() => setSelectedId(null)}
        >
          ← All orders
        </button>
        <OrderTrackingPanel order={selected} showBackLink={false} />
      </div>
    );
  }

  return (
    <div className="container section">
      <Seo
        title="Track your order"
        description="Track Elliecollections orders with the phone number used at checkout — no account needed."
        path="/track"
      />

      <header className="ec-track-list-head">
        <div>
          <p className="eyebrow">Delivery status</p>
          <h1 style={{ fontFamily: 'var(--display)', margin: '0 0 0.35rem' }}>
            Track your orders
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Enter the phone number you used at checkout. Current orders appear at the top.
          </p>
        </div>
      </header>

      {customer ? (
        <div className="chip-row" style={{ margin: '1.25rem 0' }}>
          <button
            type="button"
            className={`chip ${mode === 'account' ? 'active' : ''}`}
            onClick={() => {
              setMode('account');
              setSelectedId(null);
            }}
          >
            My orders
          </button>
          <button
            type="button"
            className={`chip ${mode === 'lookup' ? 'active' : ''}`}
            onClick={() => setMode('lookup')}
          >
            Find by phone
          </button>
        </div>
      ) : null}

      {mode === 'lookup' || !customer ? (
        <>
          <div className="ec-track-lookup panel">
            <p className="eyebrow">No account needed</p>
            <h2 style={{ fontFamily: 'var(--display)', marginTop: 0, fontSize: '1.6rem' }}>
              Your phone number
            </h2>
            <p className="muted" style={{ marginTop: 0 }}>
              We’ll show every order placed with this number.
            </p>
            {error ? <div className="alert alert-error">{error}</div> : null}
            <form onSubmit={onLookup} className="ec-track-form">
              <PhoneInput
                id="track-phone"
                label="Phone number"
                value={phone}
                onChange={setPhone}
                defaultIso={defaultIso}
                required
                disabled={busy}
                hint="Use the same country code you used at checkout"
              />
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Looking up…' : 'Show my orders'}
              </button>
            </form>
            {!customer ? (
              <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
                Have an account? <Link to="/signin?next=/track">Sign in</Link>
              </p>
            ) : null}
          </div>

          {lookedUp && !busy && !error && guestSorted.length > 0 ? (
            <div style={{ marginTop: 20 }}>
              <p className="muted" style={{ marginBottom: 10 }}>
                {guestSorted.length} order{guestSorted.length === 1 ? '' : 's'} for this phone
              </p>
              <OrderCardList orders={guestSorted} onSelect={setSelectedId} />
            </div>
          ) : null}
        </>
      ) : loading && !mine.length ? (
        <div className="empty">Loading your orders…</div>
      ) : !mine.length ? (
        <div className="empty">
          No orders on this account yet. <Link to="/shop">Start shopping</Link> or{' '}
          <button
            type="button"
            onClick={() => setMode('lookup')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--blush-deep)',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            find by phone
          </button>
          .
        </div>
      ) : (
        <OrderCardList orders={mine} onSelect={setSelectedId} />
      )}
    </div>
  );
}
