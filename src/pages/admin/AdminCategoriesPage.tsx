import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminDrawer, AdminRowMenu } from '../../components/admin/AdminChrome';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { getAdminToken, marketApi } from '../../services/api';
import type { MarketCategory, ProductKind } from '../../types';
import { swalConfirm, swalError, swalSuccess } from '../../utils/swal';

const empty = (): Omit<MarketCategory, 'createdAt' | 'updatedAt'> => ({
  id: `new_${Date.now()}`,
  name: '',
  kind: 'apparel',
  description: '',
  active: true,
  sortOrder: 0,
});

export function AdminCategoriesPage() {
  const [items, setItems] = useState<MarketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ProductKind>('all');
  const [editing, setEditing] = useState<ReturnType<typeof empty> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await marketApi.listCategories({ includeInactive: true });
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => items.filter((c) => (filter === 'all' ? true : c.kind === filter)),
    [items, filter],
  );
  const { pageItems, page, setPage, pageCount, total, from, to } = useAdminPagination(
    filtered,
    10,
    filter,
  );

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    const token = getAdminToken();
    if (!token) return;
    const isNew = !items.some((c) => c.id === editing.id);
    try {
      await marketApi.upsertCategory(token, editing, isNew);
      const name = editing.name;
      setEditing(null);
      await load();
      await swalSuccess(
        isNew ? 'Category added' : 'Category updated',
        isNew ? `“${name}” was added.` : `“${name}” was saved.`,
      );
    } catch (err) {
      await swalError(
        isNew ? 'Could not add category' : 'Could not update category',
        err instanceof Error ? err.message : 'Save failed',
      );
    }
  };

  const onDelete = async (id: string) => {
    const ok = await swalConfirm('Delete category?', 'This cannot be undone.');
    if (!ok) return;
    const token = getAdminToken();
    if (!token) return;
    try {
      await marketApi.deleteCategory(token, id);
      await load();
      await swalSuccess('Category deleted');
    } catch (err) {
      await swalError(
        'Delete failed',
        err instanceof Error ? err.message : 'Delete failed',
      );
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Categories</h2>
          <p>Organize apparel and accessories</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing(empty())}>
          Add category
        </button>
      </div>

      <div className="chip-row" style={{ marginBottom: 12 }}>
        {(['all', 'apparel', 'accessories'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`chip ${filter === k ? 'active' : ''}`}
            onClick={() => setFilter(k)}
          >
            {k === 'all' ? 'All' : k === 'apparel' ? 'Apparel' : 'Accessories'}
          </button>
        ))}
      </div>

      <AdminDrawer
        open={!!editing}
        title={
          editing && items.some((c) => c.id === editing.id)
            ? 'Update category'
            : 'New category'
        }
        onClose={() => setEditing(null)}
        footer={
          editing ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="admin-category-form" className="btn btn-primary">
                Save
              </button>
            </>
          ) : null
        }
      >
        {editing && (
          <form id="admin-category-form" onSubmit={onSave}>
            <div className="admin-form-grid">
              <div className="field">
                <label>Name</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Side</label>
                <select
                  value={editing.kind}
                  onChange={(e) =>
                    setEditing({ ...editing, kind: e.target.value as ProductKind })
                  }
                >
                  <option value="apparel">Apparel</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>
              <div className="field">
                <label>Sort order</label>
                <input
                  type="number"
                  value={editing.sortOrder}
                  onChange={(e) =>
                    setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="field">
                <label>Active</label>
                <div style={{ paddingTop: 10 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.active}
                      onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                    />{' '}
                    Visible in product form
                  </label>
                </div>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
          </form>
        )}
      </AdminDrawer>

      {error && <p className="admin-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Side</th>
                <th>Order</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.description ? (
                      <div style={{ color: '#667', fontSize: 12 }}>{c.description}</div>
                    ) : null}
                  </td>
                  <td>{c.kind === 'apparel' ? 'Apparel' : 'Accessories'}</td>
                  <td>{c.sortOrder}</td>
                  <td>{c.active ? 'Active' : 'Hidden'}</td>
                  <td>
                    <AdminRowMenu
                      items={[
                        {
                          label: 'Edit',
                          onClick: () =>
                            setEditing({
                              id: c.id,
                              name: c.name,
                              kind: c.kind,
                              description: c.description,
                              active: c.active,
                              sortOrder: c.sortOrder,
                            }),
                        },
                        {
                          label: 'Delete',
                          tone: 'danger',
                          onClick: () => void onDelete(c.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {!pageItems.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24 }}>
                    No categories yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <AdminPagination
            page={page}
            pageCount={pageCount}
            from={from}
            to={to}
            total={total}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
