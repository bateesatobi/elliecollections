import { useMemo, useState, type FormEvent } from 'react';
import { AdminDrawer, AdminModal, AdminRowMenu } from '../../components/admin/AdminChrome';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { formatUgx, useMarket } from '../../store/MarketStore';
import { getAdminToken, marketApi } from '../../services/api';
import type { User } from '../../types';
import { swalConfirm, swalError, swalSuccess } from '../../utils/swal';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function AdminUsersPage() {
  const { users, orders, upsertUser, deleteUser } = useMarket();
  const [editing, setEditing] = useState<User | null>(null);
  const [viewing, setViewing] = useState<User | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);

  const orderStats = useMemo(() => {
    const map = new Map<string, { count: number; spend: number }>();
    for (const o of orders) {
      const cur = map.get(o.userId) ?? { count: 0, spend: 0 };
      cur.count += 1;
      if (['paid', 'processing', 'shipped', 'delivered'].includes(o.status)) {
        cur.spend += o.totalUgx;
      }
      map.set(o.userId, cur);
    }
    return map;
  }, [orders]);

  const {
    pageItems,
    page,
    setPage,
    pageCount,
    total,
    from,
    to,
  } = useAdminPagination(users, 10, users.length);

  const openView = async (u: User) => {
    setViewing(u);
    setViewLoading(true);
    setViewError(null);
    const token = getAdminToken();
    if (!token) {
      setViewLoading(false);
      return;
    }
    try {
      const fresh = await marketApi.getAdminUser(token, u.id);
      setViewing(fresh);
    } catch (err) {
      setViewError(err instanceof Error ? err.message : 'Could not refresh user details');
    } finally {
      setViewLoading(false);
    }
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const isNew = editing.id.startsWith('new_') || !users.some((u) => u.id === editing.id);
    const err = await upsertUser(editing);
    if (err) {
      await swalError(isNew ? 'Could not add user' : 'Could not update user', err);
      return;
    }
    const name = editing.name;
    setEditing(null);
    await swalSuccess(
      isNew ? 'User added' : 'User updated',
      isNew ? `${name} was created.` : `${name} was saved.`,
    );
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    const err = await upsertUser({ ...passwordUser, password: newPassword });
    if (err) {
      setPwError(err);
      await swalError('Password not changed', err);
      return;
    }
    const name = passwordUser.name;
    setPasswordUser(null);
    setNewPassword('');
    setConfirmPassword('');
    setPwError(null);
    await swalSuccess('Password updated', `Password changed for ${name}.`);
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>User management</h2>
          <p>View profiles, update accounts, and change passwords</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            setEditing({
              id: `new_${Date.now()}`,
              name: '',
              email: '',
              phone: '',
              role: 'customer',
              password: 'changeme',
              createdAt: new Date().toISOString(),
              active: true,
            })
          }
        >
          Add user
        </button>
      </div>

      <AdminDrawer
        open={!!editing}
        title={
          editing && users.some((u) => u.id === editing.id) ? 'Update user' : 'New user'
        }
        onClose={() => setEditing(null)}
        footer={
          editing ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="admin-user-form" className="btn btn-primary">
                Save
              </button>
            </>
          ) : null
        }
      >
        {editing && (
          <form id="admin-user-form" onSubmit={onSave}>
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
                <label>Email</label>
                <input
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Role</label>
                <select
                  value={editing.role}
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value as User['role'] })
                  }
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {!users.some((u) => u.id === editing.id) ? (
                <div className="field">
                  <label>Initial password</label>
                  <input
                    value={editing.password}
                    onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                  />
                </div>
              ) : null}
              <div className="field">
                <label>Active</label>
                <div style={{ paddingTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  />
                </div>
              </div>
            </div>
          </form>
        )}
      </AdminDrawer>

      <div className="table-wrap panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Orders</th>
              <th>Status</th>
              <th style={{ width: 56 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!users.length ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">No users yet.</div>
                </td>
              </tr>
            ) : (
              pageItems.map((u) => {
              const stats = orderStats.get(u.id) ?? { count: 0, spend: 0 };
              return (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar">{initials(u.name) || '?'}</div>
                      <div>
                        <strong>{u.name}</strong>
                        <div className="muted">ID {u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {u.email}
                    <div className="muted">{u.phone || '—'}</div>
                  </td>
                  <td>{u.role}</td>
                  <td>
                    {stats.count}
                    <div className="muted">{formatUgx(stats.spend)}</div>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-green' : 'badge-muted'}`}>
                      {u.active ? 'active' : 'disabled'}
                    </span>
                  </td>
                  <td>
                    <AdminRowMenu
                      items={[
                        { label: 'View', onClick: () => void openView(u) },
                        { label: 'Update', onClick: () => setEditing({ ...u }) },
                        {
                          label: 'Change password',
                          onClick: () => {
                            setPasswordUser(u);
                            setNewPassword('');
                            setConfirmPassword('');
                            setPwError(null);
                          },
                        },
                        {
                          label: 'Delete',
                          tone: 'danger',
                          disabled: u.id === 'u_admin' || u.email === 'admin@elliecollections.com',
                          onClick: async () => {
                            const ok = await swalConfirm(
                              'Delete user?',
                              `Remove “${u.name}” from the marketplace.`,
                            );
                            if (!ok) return;
                            const err = await deleteUser(u.id);
                            if (err) {
                              await swalError('Delete failed', err);
                              return;
                            }
                            await swalSuccess('User deleted', `${u.name} was removed.`);
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })
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
          label="users"
        />
      </div>

      <AdminDrawer
        open={!!viewing}
        wide
        title={viewing ? viewing.name : 'User details'}
        onClose={() => {
          setViewing(null);
          setViewError(null);
        }}
        footer={
          viewing ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setViewing(null);
                  setViewError(null);
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setPasswordUser(viewing);
                  setViewing(null);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPwError(null);
                }}
              >
                Change password
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditing({ ...viewing });
                  setViewing(null);
                }}
              >
                Update
              </button>
            </>
          ) : null
        }
      >
        {viewError ? <p className="admin-error">{viewError}</p> : null}
        {viewing ? (
          <div className="admin-detail-panel">
            {viewLoading ? <p className="muted">Refreshing from server…</p> : null}
            <div
              className="full"
              style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}
            >
              <div className="admin-avatar" style={{ width: 64, height: 64, fontSize: 20 }}>
                {initials(viewing.name)}
              </div>
              <div>
                <div className="admin-detail-value" style={{ fontSize: '1.2rem' }}>
                  {viewing.name}
                </div>
                <div className="muted" style={{ textTransform: 'capitalize' }}>
                  {viewing.role} account
                </div>
              </div>
            </div>
            <div className="admin-detail-grid">
              <div>
                <span className="admin-detail-label">User ID</span>
                <div className="admin-detail-value">
                  <code>{viewing.id}</code>
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Role</span>
                <div className="admin-detail-value" style={{ textTransform: 'capitalize' }}>
                  {viewing.role}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Email</span>
                <div className="admin-detail-value">{viewing.email || '—'}</div>
              </div>
              <div>
                <span className="admin-detail-label">Phone</span>
                <div className="admin-detail-value">{viewing.phone || '—'}</div>
              </div>
              <div>
                <span className="admin-detail-label">Area / location</span>
                <div className="admin-detail-value">{viewing.area || '—'}</div>
              </div>
              <div>
                <span className="admin-detail-label">Status</span>
                <div className="admin-detail-value">
                  <span className={`badge ${viewing.active ? 'badge-green' : 'badge-muted'}`}>
                    {viewing.active ? 'active' : 'disabled'}
                  </span>
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Joined</span>
                <div className="admin-detail-value">
                  {new Date(viewing.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Orders placed</span>
                <div className="admin-detail-value">
                  {(
                    viewing.orderCount ??
                    orderStats.get(viewing.id)?.count ??
                    0
                  ).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Lifetime spend</span>
                <div className="admin-detail-value">
                  {formatUgx(viewing.spendUgx ?? orderStats.get(viewing.id)?.spend ?? 0)}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Payout phone</span>
                <div className="admin-detail-value">{viewing.payoutPhone || '—'}</div>
              </div>
              <div>
                <span className="admin-detail-label">Payout method</span>
                <div className="admin-detail-value">{viewing.payoutMethod || '—'}</div>
              </div>
            </div>
          </div>
        ) : null}
      </AdminDrawer>

      <AdminModal
        open={!!passwordUser}
        title={`Change password · ${passwordUser?.name ?? ''}`}
        onClose={() => setPasswordUser(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPasswordUser(null)}>
              Cancel
            </button>
            <button type="submit" form="admin-pw-form" className="btn btn-primary">
              Save password
            </button>
          </>
        }
      >
        <form id="admin-pw-form" onSubmit={savePassword}>
          {pwError ? <div className="alert alert-error">{pwError}</div> : null}
          <div className="field">
            <label>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="field">
            <label>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
