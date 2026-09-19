import { useState } from 'react';
import { AdminModal, AdminRowMenu } from '../../components/admin/AdminChrome';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { formatUgx, useMarket } from '../../store/MarketStore';
import type { Order, OrderStatus } from '../../types';

const STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export function AdminOrdersPage() {
  const { orders, updateOrderStatus, refundOrder } = useMarket();
  const [viewing, setViewing] = useState<Order | null>(null);
  const [updating, setUpdating] = useState<Order | null>(null);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>('paid');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [refundId, setRefundId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('Customer requested refund');
  const [error, setError] = useState<string | null>(null);
  const {
    pageItems,
    page,
    setPage,
    pageCount,
    total,
    from,
    to,
  } = useAdminPagination(orders, 10, orders.length);

  const submitRefund = async () => {
    if (!refundId) return;
    const msg = await refundOrder(refundId, Number(amount), note);
    if (msg) setError(msg);
    else {
      setRefundId(null);
      setAmount('');
      setError(null);
    }
  };

  const openUpdate = (o: Order) => {
    setUpdating(o);
    setStatusDraft(o.status);
    setTrackingNumber(o.trackingNumber || '');
    setTrackingCarrier(o.trackingCarrier || '');
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Orders & fulfilment</h2>
          <p>View details, update status, and process refunds</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th style={{ width: 56 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!orders.length ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">No orders yet.</div>
                </td>
              </tr>
            ) : (
              pageItems.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.id}</strong>
                    <div className="muted">{new Date(o.createdAt).toLocaleString()}</div>
                    <div className="muted">
                      {o.paymentMethod === 'cash'
                        ? 'Cash on delivery'
                        : o.paymentMethod
                          ? `Pesapal · ${o.paymentMethod.toUpperCase()}`
                          : o.paymentRef}
                    </div>
                  </td>
                  <td>
                    {o.customerName}
                    <div className="muted">{o.customerPhone}</div>
                  </td>
                  <td style={{ maxWidth: 220 }}>
                    {o.items.map((i) => (
                      <div key={i.productId}>
                        {i.title} ×{i.quantity}
                      </div>
                    ))}
                  </td>
                  <td>{formatUgx(o.totalUgx)}</td>
                  <td>
                    <span
                      className={`badge ${
                        o.status === 'refunded' || o.status === 'cancelled'
                          ? 'badge-danger'
                          : 'badge-green'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <AdminRowMenu
                      items={[
                        { label: 'View', onClick: () => setViewing(o) },
                        {
                          label: 'Update',
                          onClick: () => openUpdate(o),
                          disabled: o.status === 'refunded',
                        },
                        {
                          label: 'Refund',
                          tone: 'danger',
                          disabled: o.status === 'refunded',
                          onClick: () => {
                            setRefundId(o.id);
                            setAmount(String(o.totalUgx));
                            setError(null);
                          },
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

      <AdminModal
        open={!!viewing}
        title={viewing ? `Order ${viewing.id}` : 'Order'}
        onClose={() => setViewing(null)}
        wide
        footer={
          viewing ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setViewing(null)}>
                Close
              </button>
              {viewing.status !== 'refunded' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    openUpdate(viewing);
                    setViewing(null);
                  }}
                >
                  Update status
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="admin-detail-grid">
            <div>
              <span className="admin-detail-label">Status</span>
              <div className="admin-detail-value">{viewing.status}</div>
            </div>
            <div>
              <span className="admin-detail-label">Placed</span>
              <div className="admin-detail-value">
                {new Date(viewing.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <span className="admin-detail-label">Customer</span>
              <div className="admin-detail-value">{viewing.customerName}</div>
            </div>
            <div>
              <span className="admin-detail-label">Phone / email</span>
              <div className="admin-detail-value">
                {viewing.customerPhone}
                <br />
                {viewing.customerEmail}
              </div>
            </div>
            <div className="full">
              <span className="admin-detail-label">Fulfilment</span>
              <div className="admin-detail-value">
                {viewing.fulfillmentMode === 'pickup' ? 'Shop pickup' : 'Delivery'}
                {viewing.recipientName
                  ? ` · ${viewing.recipientName}${
                      viewing.recipientPhone ? ` (${viewing.recipientPhone})` : ''
                    }`
                  : ''}
                <br />
                {viewing.deliveryAddress}, {viewing.district}
              </div>
            </div>
            <div>
              <span className="admin-detail-label">Payment</span>
              <div className="admin-detail-value">
                {viewing.paymentMethod === 'cash'
                  ? 'Cash on delivery'
                  : viewing.paymentMethod
                    ? `Pesapal · ${viewing.paymentMethod}`
                    : '—'}
              </div>
            </div>
            <div>
              <span className="admin-detail-label">Reference</span>
              <div className="admin-detail-value">{viewing.paymentRef}</div>
            </div>
            {(viewing.trackingNumber || viewing.trackingCarrier) && (
              <div className="full">
                <span className="admin-detail-label">Shipment tracking</span>
                <div className="admin-detail-value">
                  {viewing.trackingCarrier ? `${viewing.trackingCarrier} · ` : ''}
                  {viewing.trackingNumber || '—'}
                </div>
              </div>
            )}
            <div className="full">
              <span className="admin-detail-label">Items</span>
              {viewing.items.map((i) => (
                <div
                  key={i.productId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid #eef2ef',
                  }}
                >
                  <span>
                    {i.title} × {i.quantity}
                  </span>
                  <strong>{formatUgx(i.unitPriceUgx * i.quantity)}</strong>
                </div>
              ))}
            </div>
            <div>
              <span className="admin-detail-label">Subtotal</span>
              <div className="admin-detail-value">{formatUgx(viewing.subtotalUgx)}</div>
            </div>
            <div>
              <span className="admin-detail-label">Delivery fee</span>
              <div className="admin-detail-value">
                {viewing.deliveryUgx === 0 ? 'FREE' : formatUgx(viewing.deliveryUgx)}
              </div>
            </div>
            <div className="full">
              <span className="admin-detail-label">Total</span>
              <div className="admin-detail-value" style={{ fontSize: '1.15rem' }}>
                {formatUgx(viewing.totalUgx)}
              </div>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={!!updating}
        title={updating ? `Update ${updating.id}` : 'Update order'}
        onClose={() => setUpdating(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setUpdating(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!updating) return;
                const err = await updateOrderStatus(updating.id, statusDraft, {
                  trackingNumber,
                  trackingCarrier,
                });
                if (err) setError(err);
                setUpdating(null);
              }}
            >
              Save status
            </button>
          </>
        }
      >
        <div className="field">
          <label>Fulfilment status</label>
          <select
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value as OrderStatus)}
          >
            {STATUSES.filter((s) => s !== 'refunded').map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Carrier (optional)</label>
          <input
            value={trackingCarrier}
            onChange={(e) => setTrackingCarrier(e.target.value)}
            placeholder="e.g. Ellie Courier, Softvan, DHL"
          />
        </div>
        <div className="field">
          <label>Tracking number (optional)</label>
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Shown to the customer when shipped"
          />
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
            Add when status is shipped so the client can follow the parcel.
          </p>
        </div>
      </AdminModal>

      <AdminModal
        open={!!refundId}
        title={`Refund ${refundId ?? ''}`}
        onClose={() => setRefundId(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRefundId(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={submitRefund}>
              Confirm refund
            </button>
          </>
        }
      >
        <div className="field">
          <label>Amount (UGX)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
        </div>
        <div className="field">
          <label>Note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </AdminModal>
    </div>
  );
}
