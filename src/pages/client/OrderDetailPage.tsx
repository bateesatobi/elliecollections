import { Link, Navigate, useParams } from 'react-router-dom';
import { OrderTrackingPanel } from '../../components/OrderTrackingPanel';
import { Seo } from '../../components/Seo';
import { useMarket } from '../../store/MarketStore';

export function OrderDetailPage() {
  const { id } = useParams();
  const { customer, orders } = useMarket();
  if (!customer) return <Navigate to="/track" replace />;

  const order = orders.find((o) => o.id === id && o.userId === customer.id);
  if (!order) {
    return (
      <div className="container section">
        <Seo title="Order not found" path={`/orders/${id || ''}`} noIndex />
        <div className="empty">Order not found.</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <Link to="/track" className="btn btn-primary">
            Track your orders
          </Link>
          <Link to="/orders" className="btn btn-secondary">
            Order history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <Seo title={`Order ${order.id}`} path={`/orders/${order.id}`} noIndex />
      <OrderTrackingPanel order={order} />
    </div>
  );
}
