import { useEffect, useState, type FormEvent } from 'react';
import { AdminDrawer, AdminRowMenu } from '../../components/admin/AdminChrome';
import { getAdminToken, marketApi, type Promo } from '../../services/api';
import { swalConfirm, swalError, swalSuccess } from '../../utils/swal';

type PromoForm = Omit<Promo, 'id'> & { id?: string };

const empty = (): PromoForm => ({
  title: '',
  subtitle: '',
  badge: 'Promo',
  ctaLabel: 'Shop now',
  ctaUrl: '/shop?promo=1',
  imageUrl: '',
  animation: 'slide',
  active: true,
  sortOrder: 0,
});

export function AdminPromosPage() {
  const [items, setItems] = useState<Promo[]>([]);
  const [editing, setEditing] = useState<PromoForm | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    try {
      setItems(await marketApi.adminListPromos(token));
    } catch (e) {
      await swalError('Promos', e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing?.title.trim()) return;
    const token = getAdminToken();
    if (!token) return;
    const isNew = !editing.id;
    try {
      await marketApi.upsertPromo(token, editing, isNew);
      setEditing(null);
      await refresh();
      await swalSuccess(isNew ? 'Promo created' : 'Promo updated', editing.title);
    } catch (err) {
      await swalError('Save failed', err instanceof Error ? err.message : 'Could not save promo');
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Promotions</h2>
          <p>Animated banners shown on the storefront home &amp; shop</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing(empty())}>
          New promo
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Badge</th>
              <th>Animation</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No promotions yet
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {p.subtitle}
                    </div>
                  </td>
                  <td>{p.badge}</td>
                  <td>{p.animation}</td>
                  <td>
                    <span className={`badge ${p.active ? 'badge-green' : 'badge-muted'}`}>
                      {p.active ? 'active' : 'off'}
                    </span>
                  </td>
                  <td>
                    <AdminRowMenu
                      items={[
                        { label: 'Edit', onClick: () => setEditing({ ...p }) },
                        {
                          label: 'Delete',
                          tone: 'danger',
                          onClick: async () => {
                            const ok = await swalConfirm('Delete promo?', p.title);
                            if (!ok) return;
                            const token = getAdminToken();
                            if (!token) return;
                            await marketApi.deletePromo(token, p.id);
                            await refresh();
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
      </div>

      <AdminDrawer
        open={!!editing}
        title={editing?.id ? 'Edit promo' : 'New promo'}
        onClose={() => setEditing(null)}
        footer={
          editing ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="promo-form" className="btn btn-primary">
                Save
              </button>
            </>
          ) : null
        }
      >
        {editing ? (
          <form id="promo-form" onSubmit={onSave} className="admin-form-grid">
            <div className="field">
              <label>Title</label>
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Subtitle</label>
              <input
                value={editing.subtitle}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Badge</label>
              <input
                value={editing.badge}
                onChange={(e) => setEditing({ ...editing, badge: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Animation</label>
              <select
                value={editing.animation}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    animation: e.target.value as Promo['animation'],
                  })
                }
              >
                <option value="slide">Slide</option>
                <option value="fade">Fade</option>
                <option value="marquee">Marquee</option>
              </select>
            </div>
            <div className="field">
              <label>CTA label</label>
              <input
                value={editing.ctaLabel}
                onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })}
              />
            </div>
            <div className="field">
              <label>CTA link</label>
              <input
                value={editing.ctaUrl}
                onChange={(e) => setEditing({ ...editing, ctaUrl: e.target.value })}
                placeholder="/shop?promo=1"
              />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Image URL</label>
              <input
                value={editing.imageUrl}
                onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="field">
              <label>Sort order</label>
              <input
                type="number"
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Active</label>
              <label style={{ display: 'flex', gap: 8, paddingTop: 10 }}>
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                Show on storefront
              </label>
            </div>
          </form>
        ) : null}
      </AdminDrawer>
    </div>
  );
}
