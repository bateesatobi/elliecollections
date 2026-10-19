import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Share2, ShoppingBag, Star } from 'lucide-react';
import { AmzPrice, DealBadge } from './AmzPrice';
import { useMarket } from '../store/MarketStore';
import { getPrimaryImage } from '../utils/productImages';
import { isInWishlist, toggleWishlistAndSync } from '../utils/wishlist';
import { buildProductShareUrl, getStoredReferral, shareOrCopy } from '../utils/referral';
import { effectiveMinOrderQty } from '../utils/pricing';
import {
  DELIVERY_PERIOD_LABELS,
  PRODUCT_KIND_LABELS,
  SALE_MODE_LABELS,
  type Product,
} from '../types';

export function ratingFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 3)) % 50;
  const rating = 3.8 + (h % 12) / 10;
  const reviews = 12 + (h % 40) * 7;
  return { rating: Math.min(4.9, rating), reviews };
}

export function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <span className="amz-stars" aria-label={`${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < full ? 'var(--gold)' : 'transparent'}
          color="var(--gold)"
        />
      ))}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { addToCart, setProductLikesCount } = useMarket();
  const [loved, setLoved] = useState(() => isInWishlist(product.id));
  const [likeBusy, setLikeBusy] = useState(false);
  const likes = product.likesCount ?? 0;
  const cover = getPrimaryImage(product);
  const deliveryOffered = product.deliveryAvailable !== false;
  const deliveryMode = product.deliveryMode || 'paid';
  const periodLabel =
    product.deliveryPeriod && DELIVERY_PERIOD_LABELS[product.deliveryPeriod]
      ? DELIVERY_PERIOD_LABELS[product.deliveryPeriod]
      : DELIVERY_PERIOD_LABELS['3_days'];
  const sizeLabel =
    product.sizes && product.sizes.length
      ? product.sizes.join(', ')
      : product.size;
  const brandLabel = (product.brand || '').trim();
  const metaBits = [
    brandLabel && !/^elliecollections$/i.test(brandLabel) ? brandLabel : null,
    product.color,
    sizeLabel,
  ].filter(Boolean);
  const needsSizePick = Boolean(
    (product.sizes && product.sizes.length > 1) ||
      (product.size && product.size.includes(',')),
  );
  const minQty = effectiveMinOrderQty(product);
  const isWholesale = product.saleMode === 'wholesale';
  const hasListDiscount = Boolean(
    product.discountPercent && product.discountPercent > 0 && product.compareAtPriceUgx,
  );
  const hasBulk =
    Boolean(product.bulkDiscountPercent && product.bulkDiscountPercent > 0) &&
    Boolean(product.bulkDiscountQty && product.bulkDiscountQty >= 2);
  const promoLabel = product.badge || (product.onPromotion ? 'Promo' : null);

  return (
    <article className="ec-product-card">
      <div className="ec-product-media-wrap">
        <Link to={`/product/${product.id}`} className="ec-product-media">
          <DealBadge
            priceUgx={product.priceUgx}
            compareAtPriceUgx={product.compareAtPriceUgx}
          />
          <div className="ec-card-badges">
            {isWholesale ? <span className="ec-mode-badge">Wholesale</span> : null}
            {promoLabel ? <span className="ec-promo-badge">{promoLabel}</span> : null}
            {hasBulk ? (
              <span className="ec-bulk-badge">
                −{product.bulkDiscountPercent}% from {product.bulkDiscountQty}+
              </span>
            ) : null}
            {hasListDiscount && !promoLabel ? (
              <span className="ec-promo-badge">Sale</span>
            ) : null}
          </div>
          {product.stock > 0 && product.stock <= 5 ? (
            <span className="ec-stock-badge">Only {product.stock} left</span>
          ) : null}
          {product.stock <= 0 ? <span className="ec-stock-badge sold">Sold out</span> : null}
          <img src={cover} alt={product.title} />
        </Link>
        <div className="ec-card-float">
          <button
            type="button"
            className={`ec-icon-btn ${loved ? 'is-on' : ''}`}
            aria-label={loved ? 'Unlike' : 'Like'}
            disabled={likeBusy}
            onClick={() => {
              if (likeBusy) return;
              setLikeBusy(true);
              void toggleWishlistAndSync(product.id, likes)
                .then((r) => {
                  setLoved(r.liked);
                  setProductLikesCount(product.id, r.likesCount);
                })
                .finally(() => setLikeBusy(false));
            }}
          >
            <Heart size={16} fill={loved ? 'currentColor' : 'none'} />
            {likes > 0 ? <span className="ec-like-count">{likes}</span> : null}
          </button>
          <button
            type="button"
            className="ec-icon-btn"
            aria-label="Share"
            onClick={() =>
              void shareOrCopy({
                title: product.title,
                text: `Shop ${product.title} on Elliecollections`,
                url: buildProductShareUrl(product.id, getStoredReferral()),
              })
            }
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>
      <div className="ec-product-body">
        <div className="ec-product-meta">
          {PRODUCT_KIND_LABELS[product.kind]} · {product.category || 'Fashion'}
          {' · '}
          {SALE_MODE_LABELS[product.saleMode === 'wholesale' ? 'wholesale' : 'retail']}
        </div>
        <Link to={`/product/${product.id}`}>
          <h3>{product.title}</h3>
        </Link>
        {metaBits.length ? (
          <div className="ec-product-meta">{metaBits.join(' · ')}</div>
        ) : null}
        <AmzPrice
          priceUgx={product.priceUgx}
          compareAtPriceUgx={product.compareAtPriceUgx}
          unit={product.unit}
          size="card"
        />
        {isWholesale || minQty > 1 ? (
          <div className="ec-deal-line">Min. order {minQty} {product.unit || 'pcs'}</div>
        ) : null}
        {hasBulk ? (
          <div className="ec-deal-line">
            Buy {product.bulkDiscountQty}+ → {product.bulkDiscountPercent}% off
          </div>
        ) : null}
        <div className="ec-product-meta" style={{ marginTop: '0.45rem' }}>
          {!deliveryOffered
            ? 'Pickup only'
            : deliveryMode === 'free'
              ? 'Free delivery'
              : 'Delivery fee applies'}
          {deliveryOffered ? ` · ${periodLabel}` : ''}
        </div>
        <div className="ec-card-actions">
          <button
            type="button"
            className={`btn btn-bag${product.stock <= 0 ? ' is-sold' : ''}`}
            disabled={product.stock <= 0}
            onClick={() => {
              if (needsSizePick || isWholesale || minQty > 1) {
                navigate(`/product/${product.id}`);
                return;
              }
              const one =
                product.sizes?.[0] ||
                (product.size && !product.size.includes(',') ? product.size : undefined);
              addToCart(product.id, 1, one);
            }}
          >
            {product.stock > 0 ? <ShoppingBag size={15} strokeWidth={1.75} /> : null}
            {product.stock > 0
              ? needsSizePick || isWholesale || minQty > 1
                ? 'View details'
                : 'Add to bag'
              : 'Sold out'}
          </button>
        </div>
      </div>
    </article>
  );
}
