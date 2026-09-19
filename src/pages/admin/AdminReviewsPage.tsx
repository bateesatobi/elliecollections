import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminRowMenu } from '../../components/admin/AdminChrome';
import { Stars } from '../../components/ProductCard';
import { getAdminToken, marketApi } from '../../services/api';
import { useMarket } from '../../store/MarketStore';
import { swalConfirm, swalError, swalSuccess } from '../../utils/swal';
import type { ProductReview } from '../../types';

type Filter = 'all' | 'pending' | 'visible';

export function AdminReviewsPage() {
  const { products } = useMarket();
  const [items, setItems] = useState<ProductReview[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productTitle = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.title]));
    return (id: string) => map.get(id) || id;
  }, [products]);

  const refresh = async () => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await marketApi.adminListReviews(token);
      setItems(data.items);
      setPendingCount(data.pendingCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = items.filter((r) => {
    if (filter === 'pending') return !r.visible;
    if (filter === 'visible') return !!r.visible;
    return true;
  });

  const setVisible = async (id: string, visible: boolean) => {
    const token = getAdminToken();
    if (!token) return;
    try {
      await marketApi.adminSetReviewVisibility(token, id, visible);
      await swalSuccess(
        visible ? 'Published' : 'Hidden',
        visible
          ? 'This review is now visible on the product page.'
          : 'This review is hidden from shoppers.',
      );
      await refresh();
    } catch (e) {
      await swalError('Update failed', e instanceof Error ? e.message : 'Could not update');
    }
  };

  const remove = async (id: string) => {
    const ok = await swalConfirm('Delete review?', 'This cannot be undone.');
    if (!ok) return;
    const token = getAdminToken();
    if (!token) return;
    try {
      await marketApi.adminDeleteReview(token, id);
      await swalSuccess('Deleted', 'Review removed.');
      await refresh();
    } catch (e) {
      await swalError('Delete failed', e instanceof Error ? e.message : 'Could not delete');
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Reviews & ratings</h2>
          <p>
            Moderate customer feedback. Only published reviews appear on the storefront.
            {pendingCount ? ` · ${pendingCount} awaiting approval` : ''}
          </p>
        </div>
        <div className="chip-row">
          {(
            [
              ['all', 'All'],
              ['pending', 'Pending'],
              ['visible', 'Published'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`chip ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="table-wrap panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Feedback</th>
              <th>Status</th>
              <th style={{ width: 56 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">Loading reviews…</div>
                </td>
              </tr>
            ) : !filtered.length ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">No reviews in this filter.</div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/product/${r.productId}`}>{productTitle(r.productId)}</Link>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td>{r.authorName}</td>
                  <td>
                    <Stars rating={r.rating} />
                    <div className="muted">{r.rating}/5</div>
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    {r.title ? <strong style={{ display: 'block' }}>{r.title}</strong> : null}
                    <span className="muted">{r.body}</span>
                  </td>
                  <td>
                    <span className={`badge ${r.visible ? 'badge-rose' : 'badge-gold'}`}>
                      {r.visible ? 'Published' : 'Hidden / pending'}
                    </span>
                  </td>
                  <td>
                    <AdminRowMenu
                      items={[
                        r.visible
                          ? {
                              label: 'Hide from storefront',
                              onClick: () => void setVisible(r.id, false),
                            }
                          : {
                              label: 'Publish on storefront',
                              onClick: () => void setVisible(r.id, true),
                            },
                        {
                          label: 'Delete',
                          tone: 'danger',
                          onClick: () => void remove(r.id),
                        },
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
