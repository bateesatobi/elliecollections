import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { ProductCard } from '../../components/ProductCard';
import { Seo } from '../../components/Seo';
import { useMarket } from '../../store/MarketStore';
import { loadWishlist } from '../../utils/wishlist';

export function WishlistPage() {
  const { products } = useMarket();
  const [ids, setIds] = useState(() => loadWishlist());
  const list = useMemo(
    () => products.filter((p) => p.active && ids.includes(p.id)),
    [products, ids],
  );

  return (
    <div className="ec-page">
      <Seo title="Wishlist" path="/wishlist" noIndex />
      <header className="ec-page-hero">
        <div className="container-wide ec-page-hero-row">
          <div>
            <p className="eyebrow">Saved for later</p>
            <h1>Wishlist</h1>
            <p className="muted">
              {list.length} saved piece{list.length === 1 ? '' : 's'} · Tap the heart on any card to add more
            </p>
          </div>
          <Link to="/shop" className="btn btn-secondary">
            Continue shopping
          </Link>
        </div>
      </header>

      <div className="container-wide ec-page-body">
        {list.length === 0 ? (
          <div className="ec-page-card ec-request-gate">
            <Heart size={28} />
            <h2>Nothing saved yet</h2>
            <p className="muted">
              Tap the heart on a dress, bag, or accessory and it will wait for you here.
            </p>
            <div className="ec-page-actions">
              <Link to="/shop" className="btn btn-primary">
                Browse the collection
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => setIds(loadWishlist())}>
                Refresh
              </button>
            </div>
          </div>
        ) : (
          <div className="ec-product-grid">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
