import { useEffect, useState, type FormEvent } from 'react';
import { AdminDrawer, AdminRowMenu } from '../../components/admin/AdminChrome';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { getAdminToken, marketApi } from '../../services/api';
import type { MarketUnit } from '../../types';
import { processLabel } from '../../utils/processCatalog';
import { runProcess } from '../../utils/processProgress';
import { swalConfirm, swalError, swalSuccess } from '../../utils/swal';

const empty = (): Omit<MarketUnit, 'createdAt' | 'updatedAt'> => ({
  id: `new_${Date.now()}`,
  name: '',
  symbol: '',
  description: '',
  active: true,
  sortOrder: 0,
});

export function AdminUnitsPage() {
  const [items, setItems] = useState<MarketUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ReturnType<typeof empty> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await marketApi.listUnits({ includeInactive: true });
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const { pageItems, page, setPage, pageCount, total, from, to } = useAdminPagination(
    items,
    10,
    items.length,
  );

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing?.name.trim() || !editing.symbol.trim()) return;
    const token = getAdminToken();
    if (!token) return;
    const isNew = !items.some((u) => u.id === editing.id);
    try {
      const name = editing.name;
      await runProcess(
        {
          kind: 'submit',
          title: processLabel('admin.unit.save', 'Saving unit…'),
          percent: 25,
        },
        async (set) => {
          set(50, isNew ? 'Adding unit…' : 'Updating unit…');
          await marketApi.upsertUnit(token, editing, isNew);
          setEditing(null);
          set(85, 'Refreshing…');
          await load();
        },
      );
      await swalSuccess(
        isNew ? 'Unit added' : 'Unit updated',
        isNew ? `“${name}” was added.` : `“${name}” was saved.`,
      );
    } catch (err) {
      await swalError(
        isNew ? 'Could not add unit' : 'Could not update unit',
        err instanceof Error ? err.message : 'Save failed',
      );
    }
  };

  const onDelete = async (id: string) => {
    const ok = await swalConfirm('Delete unit?', 'This cannot be undone.');
    if (!ok) return;
    const token = getAdminToken();
    if (!token) return;
    try {
      await runProcess(
        {
          kind: 'delete',
          title: processLabel('admin.unit.delete', 'Deleting unit…'),
          percent: 30,
        },
        async (set) => {
          set(55, 'Removing unit…');
          await marketApi.deleteUnit(token, id);
          set(85, 'Refreshing…');
          await load();
        },
      );
      await swalSuccess('Unit deleted');
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
          <h2>Units</h2>
          <p>Manage sell-by units used on products (kg, bag, litre…)</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing(empty())}>
          Add unit
        </button>
      </div>

      <AdminDrawer
        open={!!editing}
        title={editing && items.some((u) => u.id === editing.id) ? 'Update unit' : 'New unit'}
        onClose={() => setEditing(null)}
        footer={
          editing ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="admin-unit-form" className="btn btn-primary">
                Save
              </button>
            </>
          ) : null
        }
      >
        {editing && (
          <form id="admin-unit-form" onSubmit={onSave}>
            <div className="admin-form-grid">
              <div className="field">
                <label>Name</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Kilogram"
                  required
                />
              </div>
              <div className="field">
                <label>Symbol</label>
                <input
                  value={editing.symbol}
                  onChange={(e) => setEditing({ ...editing, symbol: e.target.value })}
                  placeholder="kg"
                  required
                />
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
                <th>Symbol</th>
                <th>Order</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    {u.description ? (
                      <div style={{ color: '#667', fontSize: 12 }}>{u.description}</div>
                    ) : null}
                  </td>
                  <td>
                    <code>{u.symbol}</code>
                  </td>
                  <td>{u.sortOrder}</td>
                  <td>{u.active ? 'Active' : 'Hidden'}</td>
                  <td>
                    <AdminRowMenu
                      items={[
                        {
                          label: 'Edit',
                          onClick: () =>
                            setEditing({
                              id: u.id,
                              name: u.name,
                              symbol: u.symbol,
                              description: u.description,
                              active: u.active,
                              sortOrder: u.sortOrder,
                            }),
                        },
                        {
                          label: 'Delete',
                          tone: 'danger',
                          onClick: () => void onDelete(u.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {!pageItems.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 24 }}>
                    No units yet
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
