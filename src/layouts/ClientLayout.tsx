import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Search, ShoppingBag, User } from 'lucide-react';
import { useMarket } from '../store/MarketStore';
import { useCurrency } from '../store/CurrencyStore';
import { captureReferralFromUrl } from '../utils/referral';
import { loadWishlist } from '../utils/wishlist';
import './client.css';

export function ClientLayout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { cartCount, customer, logoutCustomer } = useMarket();
  const { rates, currency, setCurrencyCode, autoDetected, detectedCountry } = useCurrency();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [scrolled, setScrolled] = useState(false);
  const [wishCount, setWishCount] = useState(() => loadWishlist().length);

  useEffect(() => {
    captureReferralFromUrl();
  }, [params]);

  useEffect(() => {
    setQuery(params.get('q') ?? '');
  }, [params]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const tick = window.setInterval(() => setWishCount(loadWishlist().length), 1500);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearInterval(tick);
    };
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    const kind = params.get('kind');
    if (kind) next.set('kind', kind);
    if (query.trim()) next.set('q', query.trim());
    navigate(`/shop?${next.toString()}`);
  };

  return (
    <div className="client-shell">
      <header className={`ec-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container-wide">
          <div className="ec-header-inner">
            <Link to="/" className="ec-logo" onClick={() => setQuery('')}>
              Ellie<em>collections</em>
            </Link>

            <form className="ec-search" onSubmit={onSearch}>
              <select
                aria-label="Department"
                value={params.get('kind') ?? 'all'}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  if (e.target.value === 'all') next.delete('kind');
                  else next.set('kind', e.target.value);
                  navigate(`/shop?${next.toString()}`);
                }}
              >
                <option value="all">All</option>
                <option value="apparel">Apparel</option>
                <option value="accessories">Accessories</option>
              </select>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dresses, bags, jewelry…"
                aria-label="Search Elliecollections"
              />
              <button type="submit" aria-label="Search">
                <Search size={18} />
              </button>
            </form>

            <div className="ec-actions">
              <label
                className="ec-currency"
                title={
                  autoDetected && detectedCountry
                    ? `Auto-detected from ${detectedCountry}`
                    : 'Display currency by country'
                }
              >
                <span aria-hidden>{currency.flag}</span>
                <select
                  value={currency.code}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  aria-label="Currency"
                >
                  {rates.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.flag} {r.code} · {r.country}
                    </option>
                  ))}
                </select>
              </label>

              <Link to={customer ? '/orders' : '/checkout'} className="ec-account">
                <User size={18} />
                <span>{customer ? customer.name.split(' ')[0] : 'Sign in'}</span>
              </Link>

              {customer && (
                <button type="button" className="ec-signout" onClick={logoutCustomer}>
                  Sign out
                </button>
              )}

              <Link to="/wishlist" className="ec-cart" aria-label="Wishlist">
                {wishCount > 0 ? <span className="ec-cart-count">{wishCount}</span> : null}
                <Heart size={20} />
              </Link>

              <Link to="/cart" className="ec-cart">
                <span className="ec-cart-count">{cartCount}</span>
                <ShoppingBag size={20} />
                <strong>Bag</strong>
              </Link>
            </div>
          </div>

          <nav className="ec-subnav">
            <NavLink to="/shop" end>
              New in
            </NavLink>
            <NavLink to="/shop?kind=apparel">Apparel</NavLink>
            <NavLink to="/shop?kind=accessories">Accessories</NavLink>
            <NavLink to="/shop?promo=1">Promotions</NavLink>
            <NavLink to="/track">Track order</NavLink>
            <NavLink to="/wishlist">Wishlist</NavLink>
            <NavLink to="/refer">Refer a friend</NavLink>
            <NavLink to="/admin/login">Admin</NavLink>
          </nav>
        </div>
      </header>

      <main className="ec-main">
        <Outlet />
      </main>

      <footer className="ec-footer">
        <button
          type="button"
          className="ec-back-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Back to top
        </button>
        <div className="ec-footer-grid container-wide">
          <div>
            <h4>Elliecollections</h4>
            <p>Feminine fashion curated for the modern woman — apparel, accessories, and beauty.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <Link to="/shop?kind=apparel">Apparel</Link>
            <Link to="/shop?kind=accessories">Accessories</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/cart">Your bag</Link>
          </div>
          <div>
            <h4>Help</h4>
            <Link to="/orders">Your orders</Link>
            <Link to="/refer">Referral links</Link>
            <Link to="/checkout">Checkout</Link>
            <p className="muted" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Sign in only when you are ready to pay.
            </p>
          </div>
        </div>
        <div className="ec-footer-brand">Elliecollections</div>
      </footer>
    </div>
  );
}
