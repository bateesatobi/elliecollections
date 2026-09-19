import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react';
import { useMarket } from '../../store/MarketStore';
import {
  closeLoginProgress,
  openLoginProgress,
  setLoginProgress,
  swalError,
  swalSuccess,
} from '../../utils/swal';
import '../../layouts/admin.css';

const LOGIN_IMAGE =
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1400&q=80';

export function AdminLoginPage() {
  const { admin, loginAdmin } = useMarket();
  const [email, setEmail] = useState('admin@elliecollections.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (admin && !busy) return <Navigate to="/admin" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    openLoginProgress();
    const err = await loginAdmin(email, password, setLoginProgress);
    if (err) {
      closeLoginProgress();
      setError(err);
      await swalError('Sign-in failed', err);
      setBusy(false);
      return;
    }
    setLoginProgress(100, 'Ready');
    closeLoginProgress();
    await swalSuccess('Welcome back', 'Admin console is ready.');
    setBusy(false);
  };

  return (
    <div className="admin-login">
      <aside className="admin-login-visual" style={{ backgroundImage: `url(${LOGIN_IMAGE})` }}>
        <div className="admin-login-veil" />
        <div className="admin-login-visual-copy">
          <p className="admin-login-eyebrow">Elliecollections</p>
          <h1>Boutique console</h1>
          <p>Catalogue, orders, promotions, and fulfilment — crafted for her brand.</p>
        </div>
      </aside>

      <main className="admin-login-panel">
        <Link to="/" className="admin-login-back">
          <ArrowLeft size={16} /> Back to storefront
        </Link>

        <form className="admin-login-card" onSubmit={onSubmit}>
          <div className="admin-login-mark">
            <Sparkles size={18} />
            <span>Admin access</span>
          </div>
          <h2>Sign in</h2>
          <p className="admin-login-lead">
            Manage products, promotions, orders, people, and revenue.
          </p>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <div className="field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              autoComplete="username"
              placeholder="admin@elliecollections.com"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary admin-login-submit" disabled={busy}>
            <Lock size={16} />
            {busy ? 'Signing in…' : 'Enter console'}
          </button>

          <p className="admin-login-hint">
            Demo: admin@elliecollections.com / admin123
          </p>
        </form>
      </main>
    </div>
  );
}
