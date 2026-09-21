import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useMarket } from '../../store/MarketStore';
import { useCurrency } from '../../store/CurrencyStore';
import { ProductCard } from '../../components/ProductCard';
import { PromoBanner } from '../../components/PromoBanner';
import { TrustStrip } from '../../components/TrustStrip';
import { Seo, organizationJsonLd } from '../../components/Seo';
import { SHOP } from '../../utils/shopContact';
import './home.css';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=80';

export function HomePage() {
  const { products } = useMarket();
  const { formatMoney } = useCurrency();
  const featured = products.filter((p) => p.active && p.featured).slice(0, 4);
  const latest = products.filter((p) => p.active).slice(0, 8);
  const grid = featured.length >= 4 ? featured : latest.slice(0, 4);

  return (
    <div className="ec-home">
      <Seo
        path="/"
        image={HERO_IMAGE}
        jsonLd={organizationJsonLd()}
      />
      <section className="ec-hero" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="ec-hero-veil" />
        <div className="ec-hero-copy fade-up">
          <p className="ec-hero-brand">Elliecollections</p>
          <h1>Dress the woman you are becoming</h1>
          <p className="fade-up-delay">
            Soft silhouettes, refined accessories, and everyday luxury — curated for her.
          </p>
          <div className="ec-hero-cta fade-up-delay">
            <Link to="/shop" className="btn btn-ghost">
              Shop the collection <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <PromoBanner />

      <div className="container" style={{ paddingTop: '1.75rem' }}>
        <TrustStrip />
      </div>

      <section className="ec-home-section container">
        <div className="ec-section-head">
          <div>
            <p className="eyebrow">Curated for you</p>
            <h2>New &amp; loved</h2>
          </div>
          <Link to="/shop" className="ec-text-link">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="ec-product-grid">
          {grid.length === 0 ? (
            <div className="ec-empty">New pieces are arriving — check back soon.</div>
          ) : (
            grid.map((p) => <ProductCard key={p.id} product={p} />)
          )}
        </div>
      </section>

      <section className="ec-band">
        <div className="container ec-band-inner">
          <h2>From wardrobe staples to finishing touches</h2>
          <p>
            Apparel and accessories for Uganda and East Africa — deliver to your door or collect in
            Kololo. Pay on delivery, MTN / Airtel Money, or cash at the shop. No password needed.
          </p>
          <div className="ec-band-actions">
            <Link to="/shop?kind=apparel" className="btn btn-primary">
              Shop apparel
            </Link>
            <Link to="/shop?kind=accessories" className="btn btn-secondary">
              Shop accessories
            </Link>
            <Link to="/size-guide" className="btn btn-secondary">
              Size guide
            </Link>
          </div>
          <p className="ec-band-note muted">
            Free delivery on orders from {formatMoney(200_000)} · {SHOP.deliveryNote}
          </p>
        </div>
      </section>
    </div>
  );
}
