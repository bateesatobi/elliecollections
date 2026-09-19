import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../../components/ProductCard';
import { PromoBanner } from '../../components/PromoBanner';
import { Seo } from '../../components/Seo';
import { useMarket } from '../../store/MarketStore';
import { PRODUCT_KIND_LABELS, type ProductKind } from '../../types';

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export function ShopPage() {
  const { products } = useMarket();
  const [params, setParams] = useSearchParams();
  const kind = (params.get('kind') as ProductKind | 'all') || 'all';
  const q = params.get('q') ?? '';
  const sort = (params.get('sort') as SortKey) || 'featured';
  const inStockOnly = params.get('stock') === '1';
  const promoOnly = params.get('promo') === '1';
  const brand = params.get('brand') ?? '';
  const color = params.get('color') ?? '';
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const shopTitle =
    kind !== 'all' && PRODUCT_KIND_LABELS[kind as ProductKind]
      ? PRODUCT_KIND_LABELS[kind as ProductKind]
      : promoOnly
        ? 'Promotions'
        : q
          ? `Search: ${q}`
          : 'Shop';
  const shopPath = `/shop${params.toString() ? `?${params.toString()}` : ''}`;

  const brands = useMemo(() => {
    const set = new Set(
      products.filter((p) => p.active && p.brand).map((p) => (p.brand || '').trim()).filter(Boolean),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const colors = useMemo(() => {
    const set = new Set(
      products.filter((p) => p.active && p.color).map((p) => (p.color || '').trim()).filter(Boolean),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const list = useMemo(() => {
    let rows = products
      .filter((p) => p.active)
      .filter((p) => (kind === 'all' ? true : p.kind === kind))
      .filter((p) => (inStockOnly ? p.stock > 0 : true))
      .filter((p) => (promoOnly ? p.onPromotion || !!p.badge || !!p.discountPercent : true))
      .filter((p) => (brand ? (p.brand || '').toLowerCase() === brand.toLowerCase() : true))
      .filter((p) => (color ? (p.color || '').toLowerCase() === color.toLowerCase() : true))
      .filter((p) => {
        const s = q.trim().toLowerCase();
        if (!s) return true;
        return (
          p.title.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s) ||
          p.location.toLowerCase().includes(s) ||
          p.seller.toLowerCase().includes(s) ||
          (p.brand || '').toLowerCase().includes(s) ||
          (p.color || '').toLowerCase().includes(s) ||
          (p.size || '').toLowerCase().includes(s) ||
          (p.make || '').toLowerCase().includes(s)
        );
      });

    rows = [...rows];
    if (sort === 'price-asc') rows.sort((a, b) => a.priceUgx - b.priceUgx);
    else if (sort === 'price-desc') rows.sort((a, b) => b.priceUgx - a.priceUgx);
    else if (sort === 'newest')
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else rows.sort((a, b) => Number(b.featured) - Number(a.featured));

    return rows;
  }, [products, kind, q, sort, inStockOnly, promoOnly, brand, color]);

  const patch = (key: string, value: string | null) => {
    const n = new URLSearchParams(params);
    if (!value) n.delete(key);
    else n.set(key, value);
    setParams(n);
  };

  const setKind = (next: string) => patch('kind', next === 'all' ? null : next);

  const title =
    kind === 'apparel' || kind === 'accessories'
      ? PRODUCT_KIND_LABELS[kind]
      : 'The collection';

  const Filters = (
    <>
      <h3>Shop by</h3>
      {(
        [
          { id: 'all', label: 'All' },
          { id: 'apparel', label: 'Apparel' },
          { id: 'accessories', label: 'Accessories' },
        ] as const
      ).map((c) => (
        <button
          key={c.id}
          type="button"
          className={`ec-filter-chip ${kind === c.id ? 'active' : ''}`}
          onClick={() => setKind(c.id)}
        >
          {c.label}
        </button>
      ))}
      <button
        type="button"
        className={`ec-filter-chip ${inStockOnly ? 'active' : ''}`}
        onClick={() => patch('stock', inStockOnly ? null : '1')}
      >
        In stock only
      </button>
      <button
        type="button"
        className={`ec-filter-chip ${promoOnly ? 'active' : ''}`}
        onClick={() => patch('promo', promoOnly ? null : '1')}
      >
        On promotion
      </button>
      {brands.length > 0 ? (
        <label className="field" style={{ marginTop: '0.5rem' }}>
          <span>Brand</span>
          <select
            value={brand}
            onChange={(e) => patch('brand', e.target.value || null)}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {colors.length > 0 ? (
        <label className="field">
          <span>Color</span>
          <select
            value={color}
            onChange={(e) => patch('color', e.target.value || null)}
          >
            <option value="">All colors</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="field" style={{ marginTop: '0.5rem' }}>
        <span>Sort</span>
        <select
          value={sort}
          onChange={(e) => patch('sort', e.target.value === 'featured' ? null : e.target.value)}
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="newest">Newest</option>
        </select>
      </label>
    </>
  );

  return (
    <div className="ec-shop container-wide">
      <Seo
        title={shopTitle}
        description={`Browse ${shopTitle.toLowerCase()} at Elliecollections — feminine fashion, apparel, and accessories with delivery across East Africa.`}
        path={shopPath}
      />
      <PromoBanner />
      <div className="ec-shop-layout">
        <aside className="ec-filters">{Filters}</aside>

        <section>
          <div className="ec-shop-head">
            <div>
              <p className="eyebrow">Elliecollections</p>
              <h1>
                {q ? `“${q}”` : title}
                {kind !== 'all' && q ? ` in ${title}` : ''}
              </h1>
              <p className="muted">
                {list.length} piece{list.length === 1 ? '' : 's'}
                {q ? ` for “${q}”` : ''}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'none' }}
              onClick={() => setMobileFiltersOpen(true)}
            >
              Filters
            </button>
          </div>

          <style>{`
            @media (max-width: 860px) {
              .ec-shop .ec-shop-head .btn { display: inline-flex !important; }
            }
          `}</style>

          {list.length === 0 ? (
            <div className="ec-empty">No pieces match. Try another search or clear filters.</div>
          ) : (
            <div className="ec-product-grid">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>

      {mobileFiltersOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(28,20,24,0.45)',
            display: 'grid',
            alignItems: 'end',
          }}
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            className="ec-filters"
            style={{ margin: 0, borderRadius: '16px 16px 0 0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Filters & sort</strong>
              <button type="button" className="btn btn-primary" onClick={() => setMobileFiltersOpen(false)}>
                Done
              </button>
            </div>
            {Filters}
          </div>
        </div>
      ) : null}
    </div>
  );
}
