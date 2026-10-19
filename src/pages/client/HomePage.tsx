import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  MessageCircleHeart,
  Ruler,
  Shirt,
  Sparkles,
  Store,
  Tag,
} from 'lucide-react';
import { useMarket } from '../../store/MarketStore';
import { useCurrency } from '../../store/CurrencyStore';
import { AmzPrice } from '../../components/AmzPrice';
import { PromoBanner } from '../../components/PromoBanner';
import { TrustStrip } from '../../components/TrustStrip';
import { Seo, organizationJsonLd } from '../../components/Seo';
import { SHOP } from '../../utils/shopContact';
import { getPrimaryImage } from '../../utils/productImages';
import {
  diversifyByCategory,
  heroSpotlight,
  recommendProducts,
} from '../../utils/recommendations';
import {
  BRAND_ACCESSORIES,
  BRAND_APPAREL,
  BRAND_HERO,
} from '../../utils/brandImages';
import type { Product } from '../../types';
import './home.css';

const HERO_IMAGE = BRAND_HERO;
const APPAREL_IMAGE = BRAND_APPAREL;
const ACCESSORIES_IMAGE = BRAND_ACCESSORIES;

const DEPARTMENTS = [
  { to: '/shop?kind=apparel', label: 'Apparel', Icon: Shirt },
  { to: '/shop?kind=accessories', label: 'Accessories', Icon: Sparkles },
  { to: '/shop?promo=1', label: 'Promos', Icon: Tag },
  { to: '/size-guide', label: 'Size guide', Icon: Ruler },
  { to: '/request', label: 'Request', Icon: MessageCircleHeart },
  { to: '/shop', label: 'All pieces', Icon: Store },
] as const;

function ProductRail({
  title,
  viewAllTo,
  viewAllLabel,
  items,
}: {
  title: string;
  viewAllTo: string;
  viewAllLabel: string;
  items: Product[];
}) {
  if (!items.length) return null;
  return (
    <section className="ec-wm-module">
      <div className="ec-wm-module-head">
        <h2>{title}</h2>
        <Link to={viewAllTo} className="ec-wm-view-all">
          {viewAllLabel} <ChevronRight size={16} />
        </Link>
      </div>
      <div className="ec-wm-rail" role="list">
        {items.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="ec-wm-tile" role="listitem">
            <div className="ec-wm-tile-img">
              <img src={getPrimaryImage(p)} alt="" loading="lazy" />
              {p.onPromotion || (p.discountPercent && p.discountPercent > 0) ? (
                <span className="ec-wm-badge">Promo</span>
              ) : null}
            </div>
            <div className="ec-wm-tile-body">
              <AmzPrice
                priceUgx={p.priceUgx}
                compareAtPriceUgx={p.compareAtPriceUgx}
                size="card"
              />
              <p className="ec-wm-tile-title">{p.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const { products } = useMarket();
  const { formatMoney } = useCurrency();

  const spotlight = useMemo(() => heroSpotlight(products, 8), [products]);
  const forYou = useMemo(() => recommendProducts(products, { limit: 10 }), [products]);
  const mixed = useMemo(
    () => diversifyByCategory(products.filter((p) => p.active)).slice(0, 12),
    [products],
  );
  return (
    <div className="ec-home">
      <Seo path="/" image={HERO_IMAGE} jsonLd={organizationJsonLd()} />

      <div className="ec-wm">
        <div className="ec-wm-inner">
          {/* Mosaic hero — large story + supporting tiles */}
          <section className="ec-wm-mosaic" aria-label="Featured">
            <Link to="/shop" className="ec-wm-hero-card">
              <img src={HERO_IMAGE} alt="" className="ec-wm-hero-bg" />
              <div className="ec-wm-hero-veil" />
              <div className="ec-wm-hero-copy">
                <img src="/icon.svg" alt="" className="ec-wm-hero-mark" width={36} height={36} />
                <p className="ec-wm-hero-brand">Ellie Collections</p>
                <h1>Dress the woman you are becoming</h1>
                <span className="ec-wm-shop-now">
                  Shop now <ArrowRight size={15} />
                </span>
              </div>
            </Link>

            <Link to="/shop?kind=apparel" className="ec-wm-side-card">
              <img src={APPAREL_IMAGE} alt="" />
              <div className="ec-wm-side-copy">
                <p>Soft silhouettes</p>
                <strong>Shop apparel</strong>
                <span>Shop now</span>
              </div>
            </Link>

            <Link to="/shop?kind=accessories" className="ec-wm-side-card">
              <img src={ACCESSORIES_IMAGE} alt="" />
              <div className="ec-wm-side-copy">
                <p>Finishing touches</p>
                <strong>Shop accessories</strong>
                <span>Shop now</span>
              </div>
            </Link>

            <Link to="/shop?promo=1" className="ec-wm-promo-card">
              <p className="ec-wm-promo-kicker">Limited offers</p>
              <strong>Pieces on promo</strong>
              <p className="ec-wm-promo-note">
                Save on selected apparel &amp; accessories — while they last.
              </p>
              <span className="ec-wm-shop-now is-dark">
                Shop promos <ArrowRight size={14} />
              </span>
            </Link>

            <Link to="/request" className="ec-wm-promo-card is-soft">
              <p className="ec-wm-promo-kicker">Can&apos;t find it?</p>
              <strong>Request a piece</strong>
              <p className="ec-wm-promo-note">
                Send a photo &amp; description — we&apos;ll source it for you.
              </p>
              <span className="ec-wm-shop-now is-dark">
                Request now <ArrowRight size={14} />
              </span>
            </Link>
          </section>

          <PromoBanner />

          <ProductRail
            title="Today's picks"
            viewAllTo="/shop"
            viewAllLabel="View all"
            items={spotlight}
          />

          {/* Seasonal / story tiles */}
          <section className="ec-wm-stories" aria-label="Shop by moment">
            <Link to="/shop?kind=apparel" className="ec-wm-story">
              <img src={APPAREL_IMAGE} alt="" />
              <div>
                <strong>Wardrobe staples</strong>
                <span>Shop now</span>
              </div>
            </Link>
            <Link to="/shop?kind=accessories" className="ec-wm-story">
              <img src={ACCESSORIES_IMAGE} alt="" />
              <div>
                <strong>Everyday luxury</strong>
                <span>Shop now</span>
              </div>
            </Link>
            <Link to="/size-guide" className="ec-wm-story is-plain">
              <div>
                <strong>Find your fit</strong>
                <p>Size guide for apparel across East Africa.</p>
                <span>Open guide</span>
              </div>
            </Link>
            <Link to="/request" className="ec-wm-story is-plain is-blush">
              <div>
                <strong>Sourcing help</strong>
                <p>Tell us what you want — we handle the rest.</p>
                <span>Request a piece</span>
              </div>
            </Link>
          </section>

          {/* Department circles */}
          <section className="ec-wm-depts" aria-label="Departments">
            {DEPARTMENTS.map(({ to, label, Icon }) => (
              <Link key={label} to={to} className="ec-wm-dept">
                <span className="ec-wm-dept-icon">
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <span>{label}</span>
              </Link>
            ))}
          </section>

          <ProductRail
            title="Picked for you"
            viewAllTo="/shop?sort=for-you"
            viewAllLabel="More for you"
            items={forYou}
          />

          <ProductRail
            title="New & loved"
            viewAllTo="/shop"
            viewAllLabel="Shop all"
            items={mixed}
          />

          <div className="ec-wm-trust">
            <TrustStrip compact />
          </div>

          <section className="ec-wm-footer-band">
            <div>
              <h2>Delivery across East Africa</h2>
              <p>
                Pay on delivery, MTN / Airtel Money, or cash. Free delivery on orders from{' '}
                {formatMoney(200_000)}. {SHOP.deliveryNote}
              </p>
            </div>
            <div className="ec-wm-footer-actions">
              <Link to="/shop" className="btn btn-primary">
                Start shopping
              </Link>
              <Link to="/track" className="btn btn-secondary">
                Track order
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
