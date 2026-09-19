import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  Folders,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareQuote,
  Package,
  Receipt,
  Ruler,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useMarket } from '../store/MarketStore';
import './admin.css';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/admin': {
    title: 'Overview',
    subtitle: 'Boutique health at a glance',
  },
  '/admin/products': {
    title: 'Catalogue',
    subtitle: 'Manage apparel and accessories',
  },
  '/admin/promos': {
    title: 'Promotions',
    subtitle: 'Animated storefront banners and campaigns',
  },
  '/admin/categories': {
    title: 'Categories',
    subtitle: 'Fashion category catalogue',
  },
  '/admin/units': {
    title: 'Units',
    subtitle: 'Sell-by units for products',
  },
  '/admin/orders': {
    title: 'Fulfilment',
    subtitle: 'Track orders, payments and refunds',
  },
  '/admin/users': {
    title: 'People',
    subtitle: 'Customers and admin accounts',
  },
  '/admin/revenue': {
    title: 'Finance',
    subtitle: 'Revenue trends and payment mix',
  },
  '/admin/disbursements': {
    title: 'Disbursements',
    subtitle: 'Pay sellers for online marketplace sales',
  },
  '/admin/reviews': {
    title: 'Reviews',
    subtitle: 'Approve or hide customer ratings and feedback',
  },
};

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/promos', label: 'Promotions', icon: Megaphone },
  { to: '/admin/categories', label: 'Categories', icon: Folders },
  { to: '/admin/units', label: 'Units', icon: Ruler },
  { to: '/admin/orders', label: 'Orders', icon: Receipt },
  { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/revenue', label: 'Revenue', icon: Wallet },
  { to: '/admin/disbursements', label: 'Disbursements', icon: HandCoins },
] as const;

export function AdminLayout() {
  const { admin, logoutAdmin } = useMarket();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (!admin) return <Navigate to="/admin/login" replace />;

  const meta = TITLES[pathname] ?? TITLES['/admin'];
  const initials = admin.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className={`admin-shell${navOpen ? ' nav-open' : ''}`}>
      <aside className="admin-aside">
        <div className="admin-brand">
          <strong>
            Ellie<em>collections</em>
          </strong>
          <span>Admin console</span>
        </div>

        <nav onClick={() => setNavOpen(false)}>
          <p className="admin-nav-label">Boutique</p>
          {NAV.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, 'end' in item ? Boolean(item.end) : false);
            return (
              <Link key={item.to} to={item.to} className={active ? 'active' : undefined}>
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
          <p className="admin-nav-label">Operations</p>
          {NAV.slice(5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link key={item.to} to={item.to} className={active ? 'active' : undefined}>
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <button type="button" className="admin-logout" onClick={logoutAdmin}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="admin-nav-scrim"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="admin-main">
        <header className="admin-top">
          <div className="admin-top-left">
            <button
              type="button"
              className="admin-menu-toggle"
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
          </div>
          <div className="admin-user">
            <span className="admin-user-avatar">{initials || 'A'}</span>
            <span className="admin-user-meta">
              <strong>{admin.name}</strong>
              <small>Administrator</small>
            </span>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
