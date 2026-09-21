import { Link } from 'react-router-dom';
import { Check, MapPin, Package, Truck } from 'lucide-react';
import { useCurrency } from '../store/CurrencyStore';
import { formatUgx } from '../store/MarketStore';
import type { Order } from '../types';
import {
  buildOrderLogs,
  orderPipeline,
  orderStepIndex,
  paymentMethodLabel,
  statusLabel,
  whereIsOrder,
} from '../utils/orderTracking';

type Props = {
  order: Order;
  showBackLink?: boolean;
};

export function OrderTrackingPanel({ order, showBackLink = true }: Props) {
  const { formatMoney, currency } = useCurrency();
  const logs = buildOrderLogs(order);
  const where = whereIsOrder(order);
  const steps = orderPipeline(order);
  const active = orderStepIndex(order);
  const isTerminal = order.status === 'delivered';
  const isDead = order.status === 'cancelled' || order.status === 'refunded';
  const pickup = order.fulfillmentMode === 'pickup';

  return (
    <div className="ec-track">
      {showBackLink ? (
        <p className="ec-track-back">
          <Link to="/track">← All your orders</Link>
          <span aria-hidden> · </span>
          <Link to="/orders">Order history</Link>
        </p>
      ) : null}

      <header className="ec-track-hero">
        <div>
          <p className="eyebrow">Live tracking</p>
          <h1>Order {order.id.slice(0, 10)}…</h1>
          <p className="muted">
            Placed {new Date(order.createdAt).toLocaleString()}
            {order.updatedAt && order.updatedAt !== order.createdAt
              ? ` · Updated ${new Date(order.updatedAt).toLocaleString()}`
              : ''}
          </p>
        </div>
        <span className={`ec-track-badge status-${order.status}`}>
          {statusLabel(order.status, order)}
        </span>
      </header>

      <div className={`ec-track-status-card ${isTerminal ? 'is-done' : isDead ? 'is-dead' : 'is-live'}`}>
        <div className="ec-track-status-icon" aria-hidden>
          {isTerminal ? <Check size={22} /> : pickup ? <Package size={22} /> : <Truck size={22} />}
        </div>
        <div>
          <h2>{where.headline}</h2>
          <p>{where.body}</p>
          {!isTerminal && !isDead && (order.deliveryAddress || order.district) ? (
            <p className="ec-track-where">
              <MapPin size={14} />
              <span>
                {pickup ? 'Pickup' : 'Destination'}: {order.deliveryAddress}
                {order.district ? `, ${order.district}` : ''}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {!isDead ? (
        <div className="ec-track-pipeline" role="list" aria-label="Order stages">
          {steps.map((s, i) => {
            const done = active >= 0 && i < active;
            const current = active >= 0 && i === active;
            return (
              <div
                key={s}
                role="listitem"
                className={`ec-track-pipe-step${done || current ? ' done' : ''}${current ? ' current' : ''}${i > active ? ' upcoming' : ''}`}
              >
                <span className="ec-track-pipe-dot">
                  {done && !current ? <Check size={12} /> : i + 1}
                </span>
                <span className="ec-track-pipe-label">{statusLabel(s, order)}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="ec-track-grid">
        <section className="panel ec-track-log-panel">
          <h3 style={{ marginTop: 0 }}>Activity log</h3>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            {isTerminal
              ? 'Full journey for this order — placed through delivery.'
              : order.paymentMethod === 'cash'
                ? 'What’s done so far. Upcoming steps stay grey until they happen — cash is paid on delivery or at the shop.'
                : 'Stages completed so far, plus where your package is now.'}
          </p>

          <ol className="ec-track-log">
            {logs.map((log) => (
              <li
                key={log.id}
                className={`${log.upcoming ? 'upcoming' : log.done ? 'done' : 'todo'}${log.current ? ' current' : ''}`}
              >
                <span className="ec-track-log-rail" aria-hidden>
                  <span className="ec-track-log-dot" />
                </span>
                <div className="ec-track-log-body">
                  <div className="ec-track-log-head">
                    <strong>{log.title}</strong>
                    {log.current ? <span className="ec-track-now">Now</span> : null}
                    {log.upcoming ? <span className="ec-track-soon">Upcoming</span> : null}
                  </div>
                  <p>{log.detail}</p>
                  {log.at ? (
                    <time dateTime={log.at}>{new Date(log.at).toLocaleString()}</time>
                  ) : (
                    <span className="ec-track-log-pending">Not yet</span>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {(order.trackingNumber || order.trackingCarrier) && (
            <div className="ec-track-shipment">
              <h3>Courier details</h3>
              <p>
                {order.trackingCarrier ? <strong>{order.trackingCarrier}</strong> : null}
                {order.trackingCarrier && order.trackingNumber ? ' · ' : null}
                {order.trackingNumber ? (
                  <span className="ec-track-code">{order.trackingNumber}</span>
                ) : null}
              </p>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                Share this tracking number with the courier’s parcel lookup if available.
              </p>
            </div>
          )}

          <h3>Items in this order</h3>
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
          <h3 style={{ marginTop: 0 }}>Summary</h3>
          <div className="ec-track-meta-row">
            <span className="muted">Payment</span>
            <strong>{paymentMethodLabel(order)}</strong>
          </div>
          <div className="ec-track-meta-row">
            <span className="muted">Reference</span>
            <strong>{order.paymentRef}</strong>
          </div>
          {order.paymentMethod === 'cash' ? (
            <div className="alert alert-ok" style={{ marginTop: 10 }}>
              Collect {formatMoney(order.totalUgx)} in cash
              {currency.code !== 'UGX' ? ` (${formatUgx(order.totalUgx)})` : ''}
            </div>
          ) : null}

          <hr className="ec-track-hr" />
          <h3 style={{ marginTop: 0 }}>{pickup ? 'Pickup' : 'Delivery'}</h3>
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
