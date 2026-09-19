import { Link } from 'react-router-dom';
import { ProductCard } from '../../components/ProductCard';
import { Seo } from '../../components/Seo';
import { useMarket } from '../../store/MarketStore';
import { loadWishlist } from '../../utils/wishlist';
import { useMemo, useState } from 'react';

export function WishlistPage() {
  const { products } = useMarket();
  const [ids, setIds] = useState(() => loadWishlist());
  const list = useMemo(
    () => products.filter((p) => p.active && ids.includes(p.id)),
    [products, ids],
  );

  return (
    <div className="ec-shop container-wide">
      <Seo title="Wishlist" path="/wishlist" noIndex />
      <div className="ec-shop-head">
        <div>
          <p className="eyebrow">Saved for later</p>
          <h1>Wishlist</h1>
          <p className="muted">{list.length} saved piece{list.length === 1 ? '' : 's'}</p>
        </div>
        <Link to="/shop" className="btn btn-secondary">
          Continue shopping
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="ec-empty">
          Your wishlist is empty. Tap the heart on any piece to save it.
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={() => setIds(loadWishlist())}>
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
  );
}
