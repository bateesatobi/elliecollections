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
      <div className="ec-sf">
        <Seo title="Order not found" path={`/orders/${id || ''}`} noIndex />
        <div className="ec-sf-module ec-sf-empty">
          <h2>Order not found</h2>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/track" className="btn btn-primary">
              Track your orders
            </Link>
            <Link to="/orders" className="btn btn-secondary">
              Order history
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ec-sf">
      <Seo title={`Order ${order.id}`} path={`/orders/${order.id}`} noIndex />
      <div className="ec-sf-module">
        <OrderTrackingPanel order={order} />
      </div>
    </div>
  );
}
