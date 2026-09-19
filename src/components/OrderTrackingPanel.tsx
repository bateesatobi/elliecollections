import { Link } from 'react-router-dom';
import { useCurrency } from '../store/CurrencyStore';
import { formatUgx } from '../store/MarketStore';
import type { Order, OrderStatus } from '../types';

const STEPS: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

function stepIndex(status: OrderStatus, cash: boolean): number {
  if (status === 'cancelled' || status === 'refunded') return -1;
  const steps = cash ? STEPS : (['paid', 'processing', 'shipped', 'delivered'] as OrderStatus[]);
  const i = steps.indexOf(status);
  if (status === 'pending' && !cash) return 0;
  return i >= 0 ? i : 0;
}

const STEP_LABELS: Record<string, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Preparing',
  shipped: 'On the way',
  delivered: 'Delivered',
};

type Props = {
  order: Order;
  showBackLink?: boolean;
};

export function OrderTrackingPanel({ order, showBackLink = true }: Props) {
  const { formatMoney, currency } = useCurrency();
  const isCash = order.paymentMethod === 'cash';
  const active = stepIndex(order.status, isCash);
  const trackSteps = isCash
    ? STEPS
    : (['paid', 'processing', 'shipped', 'delivered'] as OrderStatus[]);
  const methodLabel =
    order.paymentMethod === 'mtn'
      ? 'MTN MoMo (Pesapal)'
      : order.paymentMethod === 'airtel'
        ? 'Airtel Money (Pesapal)'
        : order.paymentMethod === 'card'
          ? 'Card (Pesapal)'
          : order.paymentMethod === 'cash'
            ? order.fulfillmentMode === 'pickup'
              ? 'Pay at shop'
              : 'Cash on delivery'
            : 'Payment';

  return (
    <div className="ec-track">
      {showBackLink ? (
        <p className="ec-track-back">
          <Link to="/orders">← Your orders</Link>
          <span aria-hidden> · </span>
          <Link to="/track">Track another</Link>
        </p>
      ) : null}

      <header className="ec-track-hero">
        <div>
          <p className="eyebrow">Order tracking</p>
          <h1>Order {order.id}</h1>
          <p className="muted">Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`ec-track-badge status-${order.status}`}>{order.status}</span>
      </header>

      <div className="ec-track-grid">
        <section className="panel">
          <h3 style={{ marginTop: 0 }}>Progress</h3>
          {order.status === 'refunded' || order.status === 'cancelled' ? (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              Status: {order.status}
              {order.refundNote ? ` — ${order.refundNote}` : ''}
            </div>
          ) : (
            <ol className="amz-track">
              {trackSteps.map((s, i) => (
                <li key={s} className={i <= active ? 'done' : ''}>
                  <span className="dot" />
                  <div>
                    <strong>{STEP_LABELS[s] || s}</strong>
                    {i === active ? (
                      <div className="muted" style={{ fontSize: 13 }}>
                        Current status
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {(order.trackingNumber || order.trackingCarrier) && (
            <div className="ec-track-shipment">
              <h3>Shipment</h3>
              <p>
                {order.trackingCarrier ? <strong>{order.trackingCarrier}</strong> : null}
                {order.trackingCarrier && order.trackingNumber ? ' · ' : null}
                {order.trackingNumber ? (
                  <span className="ec-track-code">{order.trackingNumber}</span>
                ) : null}
              </p>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                Use this number with your courier if they provide parcel lookup.
              </p>
            </div>
          )}

          <h3>Items</h3>
          {order.items.map((i) => (
            <div key={`${i.productId}-${i.size || ''}`} className="amz-order-line">
              <div>
                <Link to={`/product/${i.productId}`}>{i.title}</Link>
                <div className="muted" style={{ fontSize: 13 }}>
                  Qty {i.quantity} · {i.unit}
                  {i.size ? ` · Size ${i.size}` : ''}
                </div>
              </div>
              <strong>{formatMoney(i.unitPriceUgx * i.quantity)}</strong>
            </div>
          ))}
        </section>

        <aside className="panel">
          <h3 style={{ marginTop: 0 }}>Payment</h3>
          <div className="muted">{methodLabel}</div>
          {order.paymentMethod === 'cash' ? (
            <div className="alert alert-ok" style={{ marginTop: 8 }}>
              Collect {formatMoney(order.totalUgx)} in cash
              {currency.code !== 'UGX' ? ` (${formatUgx(order.totalUgx)})` : ''}
            </div>
          ) : null}
          <div style={{ marginTop: 8 }}>
            Ref: <strong>{order.paymentRef}</strong>
          </div>

          <hr className="ec-track-hr" />
          <h3 style={{ marginTop: 0 }}>
            {order.fulfillmentMode === 'pickup' ? 'Pickup' : 'Delivery'}
          </h3>
          <div className="muted" style={{ marginBottom: 6 }}>
            {order.fulfillmentMode === 'pickup' ? 'Shop pickup' : 'Home delivery'}
          </div>
          {(order.recipientName || order.recipientPhone) && (
            <div style={{ marginBottom: 6 }}>
              {order.recipientName}
              {order.recipientPhone ? ` · ${order.recipientPhone}` : ''}
            </div>
          )}
          <div>{order.deliveryAddress}</div>
          <div className="muted">{order.district}</div>

          <hr className="ec-track-hr" />
          <div className="amz-order-totals">
            <div>
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotalUgx)}</span>
            </div>
            <div>
              <span>Delivery</span>
              <span>{order.deliveryUgx === 0 ? 'FREE' : formatMoney(order.deliveryUgx)}</span>
            </div>
            <div className="total">
              <span>Total</span>
              <span>{formatMoney(order.totalUgx)}</span>
            </div>
          </div>
          {currency.code !== 'UGX' ? (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Settled as {formatUgx(order.totalUgx)}
            </p>
          ) : null}
          <Link to="/shop" className="btn btn-secondary" style={{ width: '100%', marginTop: 14 }}>
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
