import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Package, Store, Truck } from 'lucide-react';
import { useCurrency } from '../store/CurrencyStore';
import { useMarket } from '../store/MarketStore';
import type { Order, OrderStatus } from '../types';
import { getPrimaryImage } from '../utils/productImages';
import {
  orderPipeline,
  orderStepIndex,
  statusLabel,
  whereIsOrder,
} from '../utils/orderTracking';

const CURRENT: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped'];

type Props = {
  order: Order;
  /** Prefer Link to detail; use onSelect for track page */
  to?: string;
  onSelect?: () => void;
};

export function ClientOrderCard({ order, to, onSelect }: Props) {
  const { products } = useMarket();
  const { formatMoney } = useCurrency();
  const where = whereIsOrder(order);
  const isCurrent = CURRENT.includes(order.status);
  const steps = orderPipeline(order);
  const stepIdx = orderStepIndex(order);
  const pickup = order.fulfillmentMode === 'pickup';
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  const thumbs = order.items.slice(0, 3).map((line) => {
    const product = products.find((p) => p.id === line.productId);
    return {
      key: `${line.productId}-${line.size || ''}`,
      src: product ? getPrimaryImage(product) : null,
      title: line.title,
    };
  });

  const inner = (
    <>
      <div className="ec-oc-top">
        <div className="ec-oc-thumbs" aria-hidden>
          {thumbs.map((t, i) => (
            <div key={t.key} className="ec-oc-thumb" style={{ zIndex: 3 - i }}>
              {t.src ? <img src={t.src} alt="" /> : <Package size={18} />}
            </div>
          ))}
          {order.items.length > 3 ? (
            <div className="ec-oc-thumb ec-oc-thumb-more">+{order.items.length - 3}</div>
          ) : null}
        </div>
        <div className="ec-oc-meta">
          <div className="ec-oc-meta-row">
            <span className="ec-oc-date">
              {new Date(order.createdAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className={`ec-track-badge status-${order.status}`}>
              {statusLabel(order.status, order)}
            </span>
          </div>
          <p className="ec-oc-id">Order {order.id.slice(0, 10)}…</p>
        </div>
      </div>

      <div className="ec-oc-body">
        <h3 className="ec-oc-headline">{where.headline}</h3>
        <p className="ec-oc-copy">{where.body}</p>

        {steps.length > 0 && stepIdx >= 0 ? (
          <div className="ec-oc-pipeline" aria-hidden>
            {steps.map((step, i) => (
              <span
                key={step}
                className={`ec-oc-pip${i < stepIdx ? ' is-done' : ''}${i === stepIdx ? ' is-now' : ''}`}
              />
            ))}
          </div>
        ) : null}

        <div className="ec-oc-facts">
          <span>
            {pickup ? <Store size={14} /> : <Truck size={14} />}
            {pickup ? 'Shop pickup' : 'Home delivery'}
          </span>
          {order.district || order.deliveryAddress ? (
            <span>
              <MapPin size={14} />
              {(order.district || order.deliveryAddress || '').slice(0, 28)}
              {(order.district || order.deliveryAddress || '').length > 28 ? '…' : ''}
            </span>
          ) : null}
          <span>
            <Package size={14} />
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="ec-oc-foot">
        <div>
          <div className="ec-oc-total-label">Total</div>
          <strong className="ec-oc-total">{formatMoney(order.totalUgx)}</strong>
        </div>
        <span className="ec-oc-cta">
          View details <ArrowRight size={14} />
        </span>
      </div>
    </>
  );

  const className = `ec-oc${isCurrent ? ' is-current' : ''}`;

  if (onSelect) {
    return (
      <button type="button" className={className} onClick={onSelect}>
        {inner}
      </button>
    );
  }

  return (
    <Link to={to || `/orders/${order.id}`} className={className}>
      {inner}
    </Link>
  );
}
