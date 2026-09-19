import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminModal, AdminRowMenu } from '../../components/admin/AdminChrome';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { formatUgx } from '../../store/MarketStore';
import { getAdminToken, marketApi } from '../../services/api';

type PayableBatch = {
  seller_id: string;
  seller_name: string;
  order_ids: string[];
  gross_ugx: number;
  platform_fee_ugx: number;
  net_ugx: number;
  destination: string;
};

type DisbursementRow = {
  id: string;
  seller_id: string;
  seller_name: string;
  order_ids: string[];
  gross_ugx: number;
  platform_fee_ugx: number;
  net_ugx: number;
  method: string;
  destination: string;
  status: string;
  payment_ref?: string | null;
  error?: string | null;
  created_at: string;
  paid_at?: string | null;
};

type PayoutMethod = 'mtn' | 'airtel' | 'bank';

export function AdminDisbursementsPage() {
  const [payables, setPayables] = useState<PayableBatch[]>([]);
  const [rows, setRows] = useState<DisbursementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, PayoutMethod>>({});
  const [viewing, setViewing] = useState<DisbursementRow | null>(null);

  const load = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [preview, list] = await Promise.all([
        marketApi.previewDisbursements(token),
        marketApi.listDisbursements(token),
      ]);
      const batches = preview.items ?? [];
      setPayables(batches);
      setRows(list ?? []);
      setSelected((prev) => {
        const next: Record<string, boolean> = {};
        for (const b of batches) {
          next[b.seller_id] = prev[b.seller_id] ?? true;
        }
        return next;
      });
      setDestinations((prev) => {
        const next = { ...prev };
        for (const b of batches) {
          if (!next[b.seller_id]) next[b.seller_id] = b.destination || '';
        }
        return next;
      });
      setMethods((prev) => {
        const next = { ...prev };
        for (const b of batches) {
          if (!next[b.seller_id]) next[b.seller_id] = 'mtn';
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load disbursements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  const payablePage = useAdminPagination(payables, 10, payables.length);
  const historyPage = useAdminPagination(filteredRows, 10, `${statusFilter}-${filteredRows.length}`);

  const selectedBatches = payables.filter((b) => selected[b.seller_id]);
  const selectedNet = selectedBatches.reduce((s, b) => s + b.net_ugx, 0);
  const selectedFee = selectedBatches.reduce((s, b) => s + b.platform_fee_ugx, 0);
  const selectedGross = selectedBatches.reduce((s, b) => s + b.gross_ugx, 0);

  const createBatches = async () => {
    const token = getAdminToken();
    if (!token) return;
    if (!selectedBatches.length) {
      setError('Select at least one seller batch.');
      return;
    }
    for (const b of selectedBatches) {
      if (!(destinations[b.seller_id] || '').trim()) {
        setError(`Enter a payout destination for ${b.seller_name || b.seller_id}.`);
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      await marketApi.createDisbursements(
        token,
        selectedBatches.map((b) => ({
          seller_id: b.seller_id,
          order_ids: b.order_ids,
          destination: destinations[b.seller_id].trim(),
          method: methods[b.seller_id] || 'mtn',
        })),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create disbursements.');
    } finally {
      setBusy(false);
    }
  };

  const payOne = async (id: string) => {
    const token = getAdminToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await marketApi.payDisbursement(token, id);
      await load();
      setViewing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payout failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Seller disbursements</h2>
          <p>
            Pay sellers for online orders (MTN / Airtel / card). Cash on delivery is never
            disbursed here.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading || busy}>
          Refresh
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Payable sellers</div>
          <div className="value">{payables.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Selected net payout</div>
          <div className="value">{formatUgx(selectedNet)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Platform fees (selected)</div>
          <div className="value">{formatUgx(selectedFee)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Gross escrow (selected)</div>
          <div className="value">{formatUgx(selectedGross)}</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '1rem 1.1rem',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>Ready to disburse</h3>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Online seller balances awaiting Elliecollections payout
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !selectedBatches.length}
            onClick={() => void createBatches()}
          >
            {busy ? 'Working…' : `Create batches (${selectedBatches.length})`}
          </button>
        </div>

        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={payables.length > 0 && payables.every((b) => selected[b.seller_id])}
                    onChange={(e) => {
                      const on = e.target.checked;
                      const next: Record<string, boolean> = {};
                      for (const b of payables) next[b.seller_id] = on;
                      setSelected(next);
                    }}
                  />
                </th>
                <th>Seller</th>
                <th>Orders</th>
                <th>Gross</th>
                <th>Fee</th>
                <th>Net</th>
                <th>Method</th>
                <th>Destination</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">Loading payable balances…</div>
                  </td>
                </tr>
              ) : !payables.length ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">
                      No online seller balances ready. New paid apparel/accessories orders will appear
                      here.
                    </div>
                  </td>
                </tr>
              ) : (
                payablePage.pageItems.map((b) => (
                  <tr key={b.seller_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selected[b.seller_id]}
                        onChange={(e) =>
                          setSelected((prev) => ({ ...prev, [b.seller_id]: e.target.checked }))
                        }
                        aria-label={`Select ${b.seller_name}`}
                      />
                    </td>
                    <td>
                      <strong>{b.seller_name || 'Seller'}</strong>
                      <div className="muted">{b.seller_id}</div>
                    </td>
                    <td>{b.order_ids.length}</td>
                    <td>{formatUgx(b.gross_ugx)}</td>
                    <td>{formatUgx(b.platform_fee_ugx)}</td>
                    <td>
                      <strong>{formatUgx(b.net_ugx)}</strong>
                    </td>
                    <td>
                      <select
                        value={methods[b.seller_id] || 'mtn'}
                        onChange={(e) =>
                          setMethods((prev) => ({
                            ...prev,
                            [b.seller_id]: e.target.value as PayoutMethod,
                          }))
                        }
                      >
                        <option value="mtn">MTN MoMo</option>
                        <option value="airtel">Airtel Money</option>
                        <option value="bank">Bank</option>
                      </select>
                    </td>
                    <td>
                      <input
                        value={destinations[b.seller_id] || ''}
                        onChange={(e) =>
                          setDestinations((prev) => ({
                            ...prev,
                            [b.seller_id]: e.target.value,
                          }))
                        }
                        placeholder="07xx… or account"
                        style={{ minWidth: 140 }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <AdminPagination
            page={payablePage.page}
            pageCount={payablePage.pageCount}
            total={payablePage.total}
            from={payablePage.from}
            to={payablePage.to}
            onPageChange={payablePage.setPage}
            label="sellers"
          />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '1rem 1.1rem',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>Disbursement history</h3>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Created batches — pay pending ones to mark sellers paid
            </p>
          </div>
          <div className="chip-row">
            {(['all', 'pending', 'paid', 'failed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Seller</th>
                <th>Net</th>
                <th>Method</th>
                <th>Status</th>
                <th style={{ width: 56 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!filteredRows.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">No disbursement batches yet.</div>
                  </td>
                </tr>
              ) : (
                historyPage.pageItems.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.id}</strong>
                      <div className="muted">{new Date(r.created_at).toLocaleString()}</div>
                      <div className="muted">{r.order_ids.length} order(s)</div>
                    </td>
                    <td>
                      {r.seller_name}
                      <div className="muted">{r.destination}</div>
                    </td>
                    <td>{formatUgx(r.net_ugx)}</td>
                    <td>{r.method.toUpperCase()}</td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === 'paid'
                            ? 'badge-green'
                            : r.status === 'failed'
                              ? 'badge-danger'
                              : 'badge-muted'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <AdminRowMenu
                        items={[
                          { label: 'View', onClick: () => setViewing(r) },
                          {
                            label: 'Pay now',
                            onClick: () => void payOne(r.id),
                            disabled: r.status === 'paid' || busy,
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
            page={historyPage.page}
            pageCount={historyPage.pageCount}
            total={historyPage.total}
            from={historyPage.from}
            to={historyPage.to}
            onPageChange={historyPage.setPage}
            label="batches"
          />
        </div>
      </div>

      <AdminModal
        open={!!viewing}
        title={viewing ? `Disbursement ${viewing.id}` : 'Disbursement'}
        onClose={() => setViewing(null)}
        wide
        footer={
          viewing ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setViewing(null)}>
                Close
              </button>
              {viewing.status !== 'paid' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void payOne(viewing.id)}
                >
                  Pay {formatUgx(viewing.net_ugx)}
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="admin-detail-grid">
            <div>
              <span className="admin-detail-label">Seller</span>
              <div className="admin-detail-value">{viewing.seller_name}</div>
            </div>
            <div>
              <span className="admin-detail-label">Status</span>
              <div className="admin-detail-value">{viewing.status}</div>
            </div>
            <div>
              <span className="admin-detail-label">Gross</span>
              <div className="admin-detail-value">{formatUgx(viewing.gross_ugx)}</div>
            </div>
            <div>
              <span className="admin-detail-label">Platform fee</span>
              <div className="admin-detail-value">{formatUgx(viewing.platform_fee_ugx)}</div>
            </div>
            <div>
              <span className="admin-detail-label">Net payout</span>
              <div className="admin-detail-value">{formatUgx(viewing.net_ugx)}</div>
            </div>
            <div>
              <span className="admin-detail-label">Method</span>
              <div className="admin-detail-value">{viewing.method.toUpperCase()}</div>
            </div>
            <div className="full">
              <span className="admin-detail-label">Destination</span>
              <div className="admin-detail-value">{viewing.destination || '—'}</div>
            </div>
            <div className="full">
              <span className="admin-detail-label">Orders</span>
              <div className="admin-detail-value">{viewing.order_ids.join(', ') || '—'}</div>
            </div>
            <div>
              <span className="admin-detail-label">Payment ref</span>
              <div className="admin-detail-value">{viewing.payment_ref || '—'}</div>
            </div>
            <div>
              <span className="admin-detail-label">Paid at</span>
              <div className="admin-detail-value">
                {viewing.paid_at ? new Date(viewing.paid_at).toLocaleString() : '—'}
              </div>
            </div>
            {viewing.error ? (
              <div className="full">
                <span className="admin-detail-label">Error</span>
                <div className="admin-detail-value">{viewing.error}</div>
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
