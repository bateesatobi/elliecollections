import { Link, useNavigate } from 'react-router-dom';
import { AdminRowMenu } from '../../components/admin/AdminChrome';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { formatUgx, useMarket } from '../../store/MarketStore';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { products, orders, users, resetDemoData } = useMarket();
  const paidStatuses = new Set(['paid', 'processing', 'shipped', 'delivered']);
  const revenue = orders
    .filter((o) => paidStatuses.has(o.status))
    .reduce((s, o) => s + o.totalUgx, 0);
  const refunded = orders
    .filter((o) => o.status === 'refunded')
    .reduce((s, o) => s + (o.refundedUgx ?? o.totalUgx), 0);
  const openOrders = orders.filter((o) =>
    ['paid', 'processing', 'shipped', 'pending'].includes(o.status),
  ).length;
  const {
    pageItems,
    page,
    setPage,
    pageCount,
    total,
    from,
    to,
  } = useAdminPagination(orders, 10, orders.length);

  return (
    <div className="admin-dash">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Gross revenue</div>
          <div className="value">{formatUgx(revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Open orders</div>
          <div className="value">{openOrders}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active products</div>
          <div className="value">{products.filter((p) => p.active).length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Customers</div>
          <div className="value">{users.filter((u) => u.role === 'customer').length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Refunded</div>
          <div className="value">{formatUgx(refunded)}</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Quick actions</h3>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Catalogue, fulfilment, and finance
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/admin/products?new=1" className="btn btn-primary">
              Add product
            </Link>
            <Link to="/admin/orders" className="btn btn-secondary">
              Review orders
            </Link>
            <Link to="/admin/requests" className="btn btn-secondary">
              Piece requests
            </Link>
            <Link to="/admin/revenue" className="btn btn-secondary">
              Revenue
            </Link>
            <Link to="/admin/disbursements" className="btn btn-secondary">
              Disburse
            </Link>
            <button type="button" className="btn btn-ghost" onClick={resetDemoData}>
              Reset demo
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.05rem 1.15rem 0.5rem' }}>
          <h3 style={{ margin: 0 }}>Latest orders</h3>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th style={{ width: 56 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!orders.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">No orders yet.</div>
                  </td>
                </tr>
              ) : (
                pageItems.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.customerName}</td>
                    <td>{formatUgx(o.totalUgx)}</td>
                    <td>
                      <span className="badge badge-green">{o.status}</span>
                    </td>
                    <td>
                      <AdminRowMenu
                        items={[
                          {
                            label: 'View',
                            onClick: () => navigate('/admin/orders'),
                          },
                          {
                            label: 'Update',
                            onClick: () => navigate('/admin/orders'),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <AdminPagination
            page={page}
            pageCount={pageCount}
            total={total}
            from={from}
            to={to}
            onPageChange={setPage}
            label="orders"
          />
        </div>
      </div>
    </div>
  );
}
