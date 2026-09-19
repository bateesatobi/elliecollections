import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { OrderTrackingPanel } from '../../components/OrderTrackingPanel';
import { Seo } from '../../components/Seo';
import { marketApi } from '../../services/api';
import type { Order } from '../../types';

export function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setOrder(null);
    try {
      const found = await marketApi.lookupOrder(orderId, phone);
      setOrder(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find that order.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container section">
      <Seo
        title="Track your order"
        description="Track an Elliecollections order with your order ID and phone number."
        path="/track"
      />

      {!order ? (
        <div className="ec-track-lookup panel">
          <p className="eyebrow">No account needed</p>
          <h1 style={{ fontFamily: 'var(--display)', marginTop: 0 }}>Track your order</h1>
          <p className="muted">
            Enter the order ID from your confirmation and the phone used at checkout.
          </p>
          {error ? <div className="alert alert-error">{error}</div> : null}
          <form onSubmit={onSubmit} className="ec-track-form">
            <div className="field">
              <label>Order ID</label>
              <input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Paste your order ID"
                required
                disabled={busy}
              />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0772 123 456"
                inputMode="tel"
                required
                disabled={busy}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Looking up…' : 'Track package'}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
            Signed in? <Link to="/orders">View all your orders</Link>
          </p>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginBottom: 12 }}
            onClick={() => setOrder(null)}
          >
            Track another order
          </button>
          <OrderTrackingPanel order={order} showBackLink={false} />
        </div>
      )}
    </div>
  );
}
