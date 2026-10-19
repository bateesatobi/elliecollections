import { useEffect, useState } from 'react';
import { AdminRowMenu } from '../../components/admin/AdminChrome';
import { getAdminToken, marketApi } from '../../services/api';
import { swalError, swalSuccess } from '../../utils/swal';
import type { PieceRequest, PieceRequestStatus } from '../../types';

const FILTERS: Array<{ id: 'all' | PieceRequestStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'closed', label: 'Closed' },
];

export function AdminRequestsPage() {
  const [items, setItems] = useState<PieceRequest[]>([]);
  const [filter, setFilter] = useState<'all' | PieceRequestStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await marketApi.adminListRequests(token);
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const setStatus = async (row: PieceRequest, status: PieceRequestStatus) => {
    const token = getAdminToken();
    if (!token) return;
    try {
      await marketApi.adminUpdateRequest(token, row.id, status);
      await swalSuccess('Updated', `Marked as ${status}.`);
      await refresh();
    } catch (e) {
      await swalError('Update failed', e instanceof Error ? e.message : 'Could not update');
    }
  };

  const filtered = items.filter((r) => (filter === 'all' ? true : r.status === filter));

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Piece requests</h2>
          <p>Photos and notes from clients looking for a look we don’t have listed yet</p>
        </div>
        <div className="chip-row">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="table-wrap panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Client</th>
              <th>Need</th>
              <th>Status</th>
              <th style={{ width: 56 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty">Loading requests…</div>
                </td>
              </tr>
            ) : !filtered.length ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty">No requests in this filter.</div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.imageBase64 ? (
                      <img className="admin-thumb" src={r.imageBase64} alt="" />
                    ) : (
                      <div className="admin-thumb-fallback">📷</div>
                    )}
                  </td>
                  <td>
                    <strong>{r.contactName || 'Client'}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {r.contactPhone || 'No phone on file'}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ maxWidth: 360 }}>{r.message}</td>
                  <td>
                    <span
                      className={`badge ${
                        r.status === 'open'
                          ? 'badge-gold'
                          : r.status === 'contacted'
                            ? 'badge-rose'
                            : 'badge-muted'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <AdminRowMenu
                      items={[
                        {
                          label: 'Mark contacted',
                          onClick: () => void setStatus(r, 'contacted'),
                          disabled: r.status === 'contacted',
                        },
                        {
                          label: 'Close',
                          onClick: () => void setStatus(r, 'closed'),
                          disabled: r.status === 'closed',
                        },
                        {
                          label: 'Reopen',
                          onClick: () => void setStatus(r, 'open'),
                          disabled: r.status === 'open',
                        },
                        r.contactPhone
                          ? {
                              label: 'Copy phone',
                              onClick: () => {
                                void navigator.clipboard.writeText(r.contactPhone || '');
                                void swalSuccess('Copied', r.contactPhone || '');
                              },
                            }
                          : { label: 'No phone', onClick: () => undefined, disabled: true },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
