import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Share2 } from 'lucide-react';
import { AmzPrice } from '../../components/AmzPrice';
import { ImageGallery } from '../../components/ImageGallery';
import { ProductCard, Stars } from '../../components/ProductCard';
import { ProductReviews } from '../../components/ProductReviews';
import { useMarket } from '../../store/MarketStore';
import { DELIVERY_PERIOD_LABELS, PRODUCT_KIND_LABELS, SALE_MODE_LABELS } from '../../types';
import { effectiveMinOrderQty, getPriceDisplay, unitPriceForQty } from '../../utils/pricing';
import { isInWishlist, toggleWishlist } from '../../utils/wishlist';
import {
  buildProductShareUrl,
  getStoredReferral,
  shareOrCopy,
} from '../../utils/referral';
import { getCustomerToken, marketApi } from '../../services/api';
import { swalSuccess } from '../../utils/swal';
import { Seo, productJsonLd } from '../../components/Seo';
import { getPrimaryImage } from '../../utils/productImages';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart, customer } = useMarket();
  const product = products.find((p) => p.id === id && p.active);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [loved, setLoved] = useState(() => (id ? isInWishlist(id) : false));
  const [shareBusy, setShareBusy] = useState(false);
  const [sizeHint, setSizeHint] = useState(false);
  const [reviewAvg, setReviewAvg] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    void marketApi
      .listReviews(id)
      .then((data) => {
        setReviewAvg(data.average);
        setReviewCount(data.total);
      })
      .catch(() => {
        setReviewAvg(0);
        setReviewCount(0);
      });
  }, [id]);

  useEffect(() => {
    if (!product) return;
    setQty(effectiveMinOrderQty(product));
  }, [product?.id, product?.minOrderQty, product?.saleMode]);

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (p) =>
          p.active &&
          p.id !== product.id &&
          (p.category === product.category || p.kind === product.kind),
      )
      .slice(0, 4);
  }, [products, product]);

  const availableSizes = useMemo(() => {
    if (!product) return [] as string[];
    if (product.sizes && product.sizes.length) return product.sizes;
    if (product.size) {
      return product.size
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [product]);

  if (!product) {
    return (
      <div className="container-wide" style={{ padding: '2rem 0' }}>
        <Seo title="Product not found" path={`/product/${id || ''}`} noIndex />
        <div className="empty" style={{ background: '#fff' }}>
          Product not found.
        </div>
        <Link to="/shop" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 12 }}>
          Back to shop
        </Link>
      </div>
    );
  }

  const { rating, reviews } = { rating: reviewAvg || 0, reviews: reviewCount };
  const deal = getPriceDisplay(product.priceUgx, product.compareAtPriceUgx);
  const minQty = effectiveMinOrderQty(product);
  const maxQty = Math.max(minQty, product.stock);
  const safeQty = Math.min(Math.max(qty, minQty), Math.max(minQty, Math.min(qty, maxQty)));
  const canBuy = product.stock >= minQty;
  const unitNow = unitPriceForQty(
    product.priceUgx,
    safeQty,
    product.bulkDiscountPercent,
    product.bulkDiscountQty,
  );
  const bulkActive =
    Boolean(product.bulkDiscountPercent && product.bulkDiscountQty) &&
    safeQty >= (product.bulkDiscountQty || 0);
  const deliveryOffered = product.deliveryAvailable !== false;
  const deliveryMode = product.deliveryMode || 'paid';
  const periodLabel =
    product.deliveryPeriod && DELIVERY_PERIOD_LABELS[product.deliveryPeriod]
      ? DELIVERY_PERIOD_LABELS[product.deliveryPeriod]
      : DELIVERY_PERIOD_LABELS['3_days'];
  const needsSize = availableSizes.length > 0;
  const sizeReady = !needsSize || Boolean(selectedSize);
  const cover = getPrimaryImage(product);
  const productPath = `/product/${product.id}`;

  const addWithSize = () => {
    if (needsSize && !selectedSize) {
      setSizeHint(true);
      return false;
    }
    addToCart(product.id, safeQty, selectedSize || undefined);
    return true;
  };

  const onShare = async () => {
    setShareBusy(true);
    try {
      let ref = getStoredReferral();
      const token = getCustomerToken();
      if (customer && token) {
        try {
          const info = await marketApi.myReferral(token);
          ref = info.referral_code;
        } catch {
          /* guest share still works */
        }
      }
      const url = buildProductShareUrl(product.id, ref);
      const result = await shareOrCopy({
        title: product.title,
        text: `Shop ${product.title} on Elliecollections`,
        url,
      });
      await swalSuccess(
        result === 'shared' ? 'Shared' : 'Link copied',
        result === 'shared'
          ? 'Thanks for spreading Elliecollections.'
          : `Referral-ready link copied:\n${url}`,
      );
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div>
      <Seo
        title={product.title}
        description={
          product.description?.slice(0, 155) ||
          `Shop ${product.title} at Elliecollections — ${product.brand || 'feminine fashion'}.`
        }
        path={productPath}
        image={cover}
        type="product"
        keywords={`${product.title}, ${product.brand || 'Elliecollections'}, ${product.category || 'fashion'}, women fashion`}
        jsonLd={productJsonLd({
          title: product.title,
          description: product.description || product.title,
          image: cover,
          priceUgx: product.priceUgx,
          availability: product.stock > 0,
          url:
            typeof window !== 'undefined'
              ? `${window.location.origin}${productPath}`
              : productPath,
          brand: product.brand || undefined,
        })}
      />
      <div className="amz-pdp">
        <ImageGallery product={product} />

        <div className="amz-pdp-info">
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            {product.brand || 'Elliecollections'}
          </p>
          <h1>{product.title}</h1>
          <div className="amz-pdp-seller">
            {PRODUCT_KIND_LABELS[product.kind]} · {product.category || 'Fashion'}
            {' · '}
            {SALE_MODE_LABELS[product.saleMode === 'wholesale' ? 'wholesale' : 'retail']}
            {product.location ? ` · ${product.location}` : ''}
          </div>
          <div className="amz-stars">
            {reviews > 0 ? (
              <>
                <Stars rating={rating} />
                <span>
                  {rating.toFixed(1)} · {reviews} review{reviews === 1 ? '' : 's'}
                </span>
              </>
            ) : (
              <span className="muted">No reviews yet</span>
            )}
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '0.75rem 0' }} />
          {deal.hasDiscount || product.onPromotion || product.badge ? (
            <div className="amz-limited-deal">
              {product.badge || (deal.hasDiscount ? 'Limited time deal' : 'On promotion')}
            </div>
          ) : null}
          {product.saleMode === 'wholesale' || minQty > 1 ? (
            <div className="ec-deal-line" style={{ marginBottom: 8 }}>
              Wholesale · Minimum order {minQty} {product.unit || 'pcs'}
            </div>
          ) : null}
          {product.bulkDiscountPercent && product.bulkDiscountQty ? (
            <div className="ec-deal-line" style={{ marginBottom: 8 }}>
              Bulk deal: {product.bulkDiscountPercent}% off from {product.bulkDiscountQty}+ items
              {bulkActive ? ` · Applied at qty ${safeQty}` : ''}
            </div>
          ) : null}
          <AmzPrice
            priceUgx={bulkActive ? unitNow : product.priceUgx}
            compareAtPriceUgx={
              bulkActive ? product.priceUgx : product.compareAtPriceUgx
            }
            unit={product.unit}
            size="detail"
          />
          <p style={{ color: 'var(--ink)', lineHeight: 1.5 }}>{product.description}</p>

          {needsSize ? (
            <div>
              <p style={{ margin: '0.85rem 0 0.35rem', fontWeight: 700, fontSize: 14 }}>
                Select size
              </p>
              <div className="ec-size-chips">
                {availableSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`ec-size-chip${selectedSize === s ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedSize(s);
                      setSizeHint(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {sizeHint ? (
                <p style={{ color: 'var(--rose, #b76e79)', fontSize: 13, margin: '0.35rem 0 0' }}>
                  Please choose a size
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="ec-specs">
            <h3>Product details</h3>
            <table>
              <tbody>
                <tr>
                  <td>Brand</td>
                  <td>{product.brand || 'Elliecollections'}</td>
                </tr>
                {product.make ? (
                  <tr>
                    <td>Make</td>
                    <td>{product.make}</td>
                  </tr>
                ) : null}
                <tr>
                  <td>Available sizes</td>
                  <td>
                    {availableSizes.length
                      ? availableSizes.join(', ')
                      : product.size || 'One size / see description'}
                  </td>
                </tr>
                {product.color ? (
                  <tr>
                    <td>Color</td>
                    <td>{product.color}</td>
                  </tr>
                ) : null}
                <tr>
                  <td>Sale mode</td>
                  <td>
                    {SALE_MODE_LABELS[product.saleMode === 'wholesale' ? 'wholesale' : 'retail']}
                  </td>
                </tr>
                <tr>
                  <td>Min. order</td>
                  <td>
                    {minQty} {product.unit || 'pcs'}
                  </td>
                </tr>
                {product.bulkDiscountPercent && product.bulkDiscountQty ? (
                  <tr>
                    <td>Bulk discount</td>
                    <td>
                      {product.bulkDiscountPercent}% off from {product.bulkDiscountQty}+{' '}
                      {product.unit || 'pcs'}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td>Type</td>
                  <td>{PRODUCT_KIND_LABELS[product.kind]}</td>
                </tr>
                <tr>
                  <td>Category</td>
                  <td>{product.category || 'Fashion'}</td>
                </tr>
                <tr>
                  <td>Unit</td>
                  <td>{product.unit}</td>
                </tr>
                {product.location ? (
                  <tr>
                    <td>Location</td>
                    <td>{product.location}</td>
                  </tr>
                ) : null}
                <tr>
                  <td>Delivery</td>
                  <td>
                    {!deliveryOffered
                      ? 'Pickup only'
                      : `${deliveryMode === 'free' ? 'Free delivery' : 'Delivery fee applies'} · ${periodLabel}`}
                  </td>
                </tr>
                <tr>
                  <td>Promotion</td>
                  <td>{product.onPromotion || deal.hasDiscount ? 'Yes' : 'No'}</td>
                </tr>
                {product.badge ? (
                  <tr>
                    <td>Badge</td>
                    <td>{product.badge}</td>
                  </tr>
                ) : null}
                <tr>
                  <td>Stock</td>
                  <td>{product.stock.toLocaleString()} available</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside className="amz-buybox">
          <AmzPrice
            priceUgx={product.priceUgx}
            compareAtPriceUgx={product.compareAtPriceUgx}
            size="detail"
          />
          <div className="amz-ship">
            {!deliveryOffered
              ? 'Pickup only'
              : `${deliveryMode === 'free' ? 'FREE delivery' : 'Delivery fee applies'} · Arrives in ${periodLabel}`}
          </div>
          <div className={product.stock > 0 ? 'stock' : 'oos'}>
            {product.stock > 0
              ? `In stock (${product.stock.toLocaleString()} available)`
              : 'Currently unavailable'}
          </div>

          {needsSize ? (
            <div style={{ marginBottom: 8 }}>
              <div className="ec-size-chips">
                {availableSizes.map((s) => (
                  <button
                    key={`box-${s}`}
                    type="button"
                    className={`ec-size-chip${selectedSize === s ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedSize(s);
                      setSizeHint(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {product.stock > 0 ? (
            <label className="amz-qty-label">
              Qty:{' '}
              <select
                className="amz-qty-select"
                value={safeQty}
                onChange={(e) => setQty(Number(e.target.value))}
              >
                {Array.from(
                  { length: Math.max(0, maxQty - minQty + 1) },
                  (_, i) => i + minQty,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {minQty > 1 ? (
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Minimum order: {minQty} {product.unit || 'pcs'}
            </div>
          ) : null}
          {product.bulkDiscountPercent && product.bulkDiscountQty ? (
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {bulkActive
                ? `${product.bulkDiscountPercent}% bulk discount applied`
                : `Add ${product.bulkDiscountQty - safeQty} more for ${product.bulkDiscountPercent}% off`}
            </div>
          ) : null}

          <button
            type="button"
            className="amz-btn-cart"
            disabled={product.stock <= 0 || !canBuy}
            onClick={() => addWithSize()}
          >
            {canBuy ? 'Add to bag' : `Need ${minQty}+ in stock`}
          </button>
          <button
            type="button"
            className="amz-btn-buy"
            disabled={product.stock <= 0 || !canBuy || !sizeReady}
            onClick={() => {
              if (!addWithSize()) return;
              navigate('/checkout');
            }}
          >
            Buy now
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setLoved(toggleWishlist(product.id).includes(product.id))}
            >
              <Heart size={14} fill={loved ? 'currentColor' : 'none'} />{' '}
              {loved ? 'Saved' : 'Wishlist'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={shareBusy}
              onClick={() => void onShare()}
            >
              <Share2 size={14} /> Share
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
            Share with your referral link so friends discover Elliecollections.
          </p>
        </aside>
      </div>

      <ProductReviews productId={product.id} />

      {related.length > 0 ? (
        <section className="container" style={{ padding: '1rem 0 3rem' }}>
          <div className="ec-section-head">
            <div>
              <p className="eyebrow">You may also like</p>
              <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: '1.8rem' }}>
                Related pieces
              </h2>
            </div>
          </div>
          <div className="ec-product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
