import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PackageOpen, Search } from 'lucide-react';
import { ClientOrderCard } from '../../components/ClientOrderCard';
import { Seo } from '../../components/Seo';
import { useMarket } from '../../store/MarketStore';
import type { OrderStatus } from '../../types';
import { SHOP, whatsappHref } from '../../utils/shopContact';

type Filter = 'all' | 'current' | 'done';

const CURRENT: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped'];

export function OrdersPage() {
  const { customer, orders, loading } = useMarket();
  const [filter, setFilter] = useState<Filter>('all');
  const wa = whatsappHref('Hi Elliecollections 👋 I have a question about my order.');

  const mine = useMemo(
    () =>
      orders
        .filter((o) => customer && o.userId === customer.id)
        .slice()
        .sort((a, b) => {
          const aC = CURRENT.includes(a.status) ? 0 : 1;
          const bC = CURRENT.includes(b.status) ? 0 : 1;
          if (aC !== bC) return aC - bC;
          return +new Date(b.createdAt) - +new Date(a.createdAt);
        }),
    [orders, customer],
  );

  if (!customer) return <Navigate to="/signin?next=/orders" replace />;

  const currentCount = mine.filter((o) => CURRENT.includes(o.status)).length;
  const doneCount = mine.length - currentCount;

  const visible = mine.filter((o) => {
    if (filter === 'current') return CURRENT.includes(o.status);
    if (filter === 'done') return !CURRENT.includes(o.status);
    return true;
  });

  return (
    <div className="ec-orders-page">
      <Seo
        title="Your orders"
        description="View and track your Elliecollections orders."
        path="/orders"
        noIndex
      />

      <header className="ec-orders-hero">
        <div className="container">
          <p className="eyebrow">Hello, {customer.name.split(' ')[0]}</p>
          <h1>Your orders</h1>
          <p className="ec-orders-lead">
            Follow packing, delivery, and pickup — or message us on WhatsApp anytime.
          </p>
          <div className="ec-orders-stats">
            <div>
              <strong>{mine.length}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{currentCount}</strong>
              <span>In progress</span>
            </div>
            <div>
              <strong>{doneCount}</strong>
              <span>Completed</span>
            </div>
          </div>
          <div className="ec-orders-hero-actions">
            <Link to="/track" className="btn btn-secondary">
              <Search size={15} /> Track by phone
            </Link>
            {wa ? (
              <a href={wa} className="btn btn-secondary" target="_blank" rel="noreferrer">
                WhatsApp {SHOP.phoneDisplay}
              </a>
            ) : null}
            <Link to="/shop" className="btn btn-primary">
              Continue shopping
            </Link>
          </div>
        </div>
      </header>

      <div className="container ec-orders-body">
        {mine.length > 0 ? (
          <div className="ec-orders-filters" role="tablist" aria-label="Filter orders">
            {(
              [
                ['all', `All (${mine.length})`],
                ['current', `In progress (${currentCount})`],
                ['done', `Completed (${doneCount})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                className={filter === id ? 'active' : ''}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {loading && !mine.length ? (
          <div className="ec-orders-empty">
            <PackageOpen size={28} />
            <p>Loading your orders…</p>
          </div>
        ) : !mine.length ? (
          <div className="ec-orders-empty">
            <PackageOpen size={28} />
            <h2>No orders yet</h2>
            <p className="muted">When you place an order, it will appear here with live tracking.</p>
            <Link to="/shop" className="btn btn-primary">
              Browse the collection
            </Link>
          </div>
        ) : !visible.length ? (
          <div className="ec-orders-empty">
            <p className="muted">Nothing in this filter.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setFilter('all')}>
              Show all orders
            </button>
          </div>
        ) : (
          <div className="ec-orders-grid">
            {visible.map((o) => (
              <ClientOrderCard key={o.id} order={o} to={`/orders/${o.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
