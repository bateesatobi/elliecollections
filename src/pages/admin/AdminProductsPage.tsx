import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { AdminDrawer, AdminRowMenu } from '../../components/admin/AdminChrome';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { marketApi } from '../../services/api';
import { formatUgx, useMarket } from '../../store/MarketStore';
import type {
  DeliveryMode,
  DeliveryPeriod,
  MarketCategory,
  MarketUnit,
  Product,
  ProductKind,
  SaleMode,
} from '../../types';
import {
  ACCESSORY_SIZE_OPTIONS,
  APPAREL_SIZE_OPTIONS,
  DELIVERY_PERIOD_LABELS,
  SALE_MODE_LABELS,
  SHOE_SIZE_OPTIONS,
} from '../../types';
import { getPrimaryImage, getProductImages } from '../../utils/productImages';
import { getPriceDisplay, listPriceFromDiscount } from '../../utils/pricing';
import { swalConfirm, swalError, swalSuccess } from '../../utils/swal';

type ProductForm = Omit<Product, 'createdAt' | 'updatedAt'> & {
  applyDiscount: boolean;
  applyBulkDiscount: boolean;
};

const emptyForm = (kind: ProductKind = 'apparel'): ProductForm => ({
  id: `new_${Date.now()}`,
  kind,
  title: '',
  category: '',
  categoryId: undefined,
  description: '',
  priceUgx: 0,
  discountPercent: undefined,
  applyDiscount: false,
  saleMode: 'retail',
  minOrderQty: 1,
  bulkDiscountPercent: undefined,
  bulkDiscountQty: undefined,
  applyBulkDiscount: false,
  unit: 'pc',
  unitId: undefined,
  stock: 0,
  imageEmoji: '👗',
  images: [],
  imageUrls: [],
  seller: 'Elliecollections',
  location: 'Kampala',
  brand: 'Elliecollections',
  size: '',
  sizes: [],
  color: '',
  make: '',
  badge: '',
  onPromotion: false,
  deliveryAvailable: true,
  featured: false,
  active: true,
  deliveryMode: 'paid',
  deliveryPeriod: '3_days',
});

function toForm(p: Product): ProductForm {
  const discount =
    p.discountPercent && p.discountPercent > 0
      ? p.discountPercent
      : p.compareAtPriceUgx && p.compareAtPriceUgx > p.priceUgx
        ? Math.round(((p.compareAtPriceUgx - p.priceUgx) / p.compareAtPriceUgx) * 100)
        : 0;
  const sizes =
    p.sizes && p.sizes.length
      ? p.sizes
      : p.size
        ? p.size.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
  const bulkPct = p.bulkDiscountPercent && p.bulkDiscountPercent > 0 ? p.bulkDiscountPercent : 0;
  return {
    id: p.id,
    kind: p.kind,
    title: p.title,
    category: p.category,
    categoryId: p.categoryId,
    description: p.description,
    priceUgx: p.priceUgx,
    compareAtPriceUgx: p.compareAtPriceUgx,
    discountPercent: discount || undefined,
    applyDiscount: discount > 0,
    saleMode: p.saleMode === 'wholesale' ? 'wholesale' : 'retail',
    minOrderQty: p.minOrderQty || (p.saleMode === 'wholesale' ? 10 : 1),
    bulkDiscountPercent: bulkPct || undefined,
    bulkDiscountQty: p.bulkDiscountQty || undefined,
    applyBulkDiscount: bulkPct > 0,
    unit: p.unit,
    unitId: p.unitId,
    stock: p.stock,
    imageEmoji: p.imageEmoji,
    images: p.images ?? [],
    imageUrls: p.imageUrls ?? [],
    seller: p.seller,
    location: p.location,
    brand: p.brand || 'Elliecollections',
    size: sizes.join(', '),
    sizes,
    color: p.color || '',
    make: p.make || '',
    badge: p.badge || '',
    onPromotion: !!p.onPromotion,
    deliveryAvailable: p.deliveryAvailable !== false,
    featured: !!p.featured,
    active: p.active,
    deliveryMode: p.deliveryMode || 'paid',
    deliveryPeriod: p.deliveryPeriod || '3_days',
  };
}

function filesToDataUrls(files: FileList | null): Promise<string[]> {
  if (!files?.length) return Promise.resolve([]);
  const readers = Array.from(files).slice(0, 5).map(
    (file) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      }),
  );
  return Promise.all(readers);
}

export function AdminProductsPage() {
  const { products, upsertProduct, deleteProduct } = useMarket();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ProductKind>('all');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [units, setUnits] = useState<MarketUnit[]>([]);

  useEffect(() => {
    if (params.get('new') === '1') {
      const kindFromTab = filter === 'accessories' || filter === 'apparel' ? filter : 'apparel';
      setEditing(emptyForm(kindFromTab));
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  }, [params, setParams, filter]);

  useEffect(() => {
    void (async () => {
      try {
        const [cats, unitList] = await Promise.all([
          marketApi.listCategories({ includeInactive: false }),
          marketApi.listUnits(),
        ]);
        setCategories(cats.filter((c) => c.active));
        setUnits(unitList.filter((u) => u.active));
      } catch (err) {
        console.error('Failed to load categories/units', err);
      }
    })();
  }, []);

  const list = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products
      .filter((p) => (filter === 'all' ? true : p.kind === filter))
      .filter((p) => {
        if (!needle) return true;
        return (
          p.title.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle) ||
          p.location.toLowerCase().includes(needle) ||
          (p.brand || '').toLowerCase().includes(needle) ||
          (p.color || '').toLowerCase().includes(needle) ||
          (p.seller || '').toLowerCase().includes(needle) ||
          (p.description || '').toLowerCase().includes(needle) ||
          p.id.toLowerCase().includes(needle)
        );
      });
  }, [products, filter, search]);
  const {
    pageItems,
    page,
    setPage,
    pageCount,
    total,
    from,
    to,
  } = useAdminPagination(list, 10, `${filter}|${search}`);

  const removeProduct = async (p: Product) => {
    const ok = await swalConfirm('Delete product?', `Remove “${p.title}” from the catalogue.`);
    if (!ok) return;
    const err = await deleteProduct(p.id);
    if (err) {
      await swalError('Delete failed', err);
      return;
    }
    await swalSuccess('Product deleted', `${p.title} was removed.`);
  };

  const formKind: ProductKind = editing?.kind ?? (filter === 'accessories' ? 'accessories' : 'apparel');

  const categoriesForKind = useMemo(
    () => categories.filter((c) => c.kind === formKind),
    [categories, formKind],
  );

  const startNewProduct = () => {
    const kindFromTab = filter === 'accessories' || filter === 'apparel' ? filter : 'apparel';
    setEditing(emptyForm(kindFromTab));
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title.trim() || editing.priceUgx <= 0) return;
    if (!editing.categoryId && !editing.category.trim()) {
      await swalError('Missing category', 'Select a category before saving.');
      return;
    }
    if (editing.saleMode === 'wholesale' && (!editing.minOrderQty || editing.minOrderQty < 2)) {
      await swalError(
        'Wholesale minimum',
        'Wholesale products need a minimum order quantity of at least 2.',
      );
      return;
    }
    if (editing.applyBulkDiscount) {
      if (!editing.bulkDiscountPercent || editing.bulkDiscountPercent < 1) {
        await swalError('Bulk discount', 'Enter a bulk discount percent (1–99).');
        return;
      }
      if (!editing.bulkDiscountQty || editing.bulkDiscountQty < 2) {
        await swalError(
          'Bulk discount',
          'Enter how many items unlock the bulk discount (e.g. 20).',
        );
        return;
      }
    }
    const isNew = editing.id.startsWith('new_') || !products.some((p) => p.id === editing.id);
    const discountPercent =
      editing.applyDiscount && editing.discountPercent && editing.discountPercent > 0
        ? Math.min(99, Math.round(editing.discountPercent))
        : 0;
    const payload: Omit<Product, 'createdAt' | 'updatedAt'> = {
      ...editing,
      brand: editing.brand?.trim() || 'Elliecollections',
      make: editing.make?.trim() || undefined,
      sizes: editing.sizes || [],
      size: (editing.sizes || []).join(', ') || undefined,
      color: editing.color?.trim() || undefined,
      badge: editing.badge?.trim() || undefined,
      onPromotion: !!editing.onPromotion,
      deliveryAvailable: editing.deliveryAvailable !== false,
      saleMode: editing.saleMode === 'wholesale' ? 'wholesale' : 'retail',
      minOrderQty:
        editing.saleMode === 'wholesale'
          ? Math.max(2, editing.minOrderQty || 10)
          : Math.max(1, editing.minOrderQty || 1),
      bulkDiscountPercent: editing.applyBulkDiscount
        ? Math.min(99, Math.round(editing.bulkDiscountPercent || 0))
        : undefined,
      bulkDiscountQty: editing.applyBulkDiscount
        ? Math.max(2, Math.round(editing.bulkDiscountQty || 0))
        : undefined,
      discountPercent: discountPercent || undefined,
      compareAtPriceUgx:
        discountPercent > 0
          ? listPriceFromDiscount(editing.priceUgx, discountPercent)
          : undefined,
      seller: editing.seller?.trim() || editing.brand?.trim() || 'Elliecollections',
    };
    const err = await upsertProduct(payload);
    if (err) {
      await swalError(isNew ? 'Could not add product' : 'Could not update product', err);
      return;
    }
    setEditing(null);
    await swalSuccess(
      isNew ? 'Product added' : 'Product updated',
      isNew
        ? `${payload.title} was added to the catalogue.`
        : `${payload.title} was saved successfully.`,
    );
  };

  const setKind = (kind: ProductKind) => {
    if (!editing) return;
    const stillValid = categories.some(
      (c) => c.id === editing.categoryId && c.kind === kind,
    );
    setEditing({
      ...editing,
      kind,
      categoryId: stillValid ? editing.categoryId : undefined,
      category: stillValid ? editing.category : '',
    });
  };

  const setCategoryId = (categoryId: string) => {
    if (!editing) return;
    const cat = categories.find((c) => c.id === categoryId);
    setEditing({
      ...editing,
      categoryId: cat?.id,
      category: cat?.name || '',
    });
  };

  const setUnitId = (unitId: string) => {
    if (!editing) return;
    const unit = units.find((u) => u.id === unitId);
    setEditing({
      ...editing,
      unitId: unit?.id,
      unit: unit?.symbol || unit?.name || editing.unit,
    });
  };

  const onUploadFiles = async (fileList: FileList | null) => {
    if (!editing || !fileList?.length) return;
    try {
      const dataUrls = await filesToDataUrls(fileList);
      setEditing({ ...editing, images: [...editing.images, ...dataUrls] });
      await swalSuccess(
        fileList.length === 1 ? 'Image uploaded' : 'Images uploaded',
        `${fileList.length} image${fileList.length === 1 ? '' : 's'} ready to save with the product.`,
      );
    } catch (err) {
      await swalError(
        'Upload failed',
        err instanceof Error ? err.message : 'Image upload failed',
      );
    }
  };

  const openView = async (p: Product) => {
    setViewing(p);
    setViewLoading(true);
    setViewError(null);
    try {
      const fresh = await marketApi.getProduct(p.id, true);
      setViewing(fresh);
    } catch (err) {
      setViewError(err instanceof Error ? err.message : 'Could not refresh product details');
    } finally {
      setViewLoading(false);
    }
  };

  const openEdit = (p: Product) => {
    const form = toForm(p);
    if (!form.categoryId) {
      const cat = categories.find(
        (c) => c.kind === form.kind && c.name.toLowerCase() === form.category.toLowerCase(),
      );
      if (cat) {
        form.categoryId = cat.id;
        form.category = cat.name;
      }
    }
    if (!form.unitId) {
      const unit = units.find(
        (u) =>
          u.symbol.toLowerCase() === form.unit.toLowerCase() ||
          u.name.toLowerCase() === form.unit.toLowerCase(),
      );
      if (unit) {
        form.unitId = unit.id;
        form.unit = unit.symbol || unit.name;
      }
    }
    setEditing(form);
  };

  const cover = (p: Product) => {
    try {
      return getPrimaryImage(p);
    } catch {
      return '';
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h2>Products</h2>
          <p>Catalogue photos, pricing, stock and visibility</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startNewProduct}>
          Add product
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="chip-row" style={{ marginBottom: 0 }}>
          {(['all', 'apparel', 'accessories'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`chip ${filter === k ? 'active' : ''}`}
              onClick={() => setFilter(k)}
            >
              {k === 'all' ? 'All' : k === 'apparel' ? 'Apparel' : 'Accessories'}
            </button>
          ))}
        </div>
        <label className="admin-search">
          <Search size={16} aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, brand, category, location…"
            aria-label="Search products"
          />
          {search ? (
            <button type="button" className="admin-search-clear" onClick={() => setSearch('')}>
              Clear
            </button>
          ) : null}
        </label>
      </div>

      <AdminDrawer
        open={!!editing}
        wide
        title={
          editing && products.some((p) => p.id === editing.id)
            ? 'Update product'
            : 'New product'
        }
        onClose={() => setEditing(null)}
        footer={
          editing ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="admin-product-form" className="btn btn-primary">
                Save
              </button>
            </>
          ) : null
        }
      >
        {editing && (
          <form id="admin-product-form" onSubmit={onSave}>
            <div className="admin-form-grid">
              <div className="field">
                <label>Title</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Kind</label>
                <select
                  value={editing.kind}
                  onChange={(e) => setKind(e.target.value as ProductKind)}
                >
                  <option value="apparel">Apparel</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>
              <div className="field">
                <label>Category</label>
                <select
                  value={editing.categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select {editing.kind} category
                  </option>
                  {categoriesForKind.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {!categoriesForKind.length && (
                  <small className="muted">No categories — create one under Categories.</small>
                )}
              </div>
              <div className="field">
                <label>Unit</label>
                <select
                  value={editing.unitId || ''}
                  onChange={(e) => setUnitId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select unit
                  </option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
                {!units.length && (
                  <small className="muted">No units — create one under Units.</small>
                )}
              </div>
              <div className="field">
                <label>Price (UGX)</label>
                <input
                  type="number"
                  value={editing.priceUgx}
                  onChange={(e) =>
                    setEditing({ ...editing, priceUgx: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Sale mode</label>
                <select
                  value={editing.saleMode || 'retail'}
                  onChange={(e) => {
                    const saleMode = e.target.value as SaleMode;
                    setEditing({
                      ...editing,
                      saleMode,
                      minOrderQty:
                        saleMode === 'wholesale'
                          ? Math.max(2, editing.minOrderQty || 10)
                          : 1,
                    });
                  }}
                >
                  {(Object.keys(SALE_MODE_LABELS) as SaleMode[]).map((m) => (
                    <option key={m} value={m}>
                      {SALE_MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              {editing.saleMode === 'wholesale' ? (
                <div className="field">
                  <label>Minimum order quantity</label>
                  <input
                    type="number"
                    min={2}
                    value={editing.minOrderQty ?? 10}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        minOrderQty: Math.max(2, Number(e.target.value) || 2),
                      })
                    }
                  />
                  <small className="muted">Wholesale buyers must order at least this many.</small>
                </div>
              ) : null}
              <div className="field">
                <label>Discount</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.applyDiscount}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          applyDiscount: e.target.checked,
                          discountPercent: e.target.checked
                            ? editing.discountPercent || 10
                            : undefined,
                          onPromotion: e.target.checked ? true : editing.onPromotion,
                        })
                      }
                    />{' '}
                    Apply list-price discount
                  </label>
                  {editing.applyDiscount ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={editing.discountPercent ?? ''}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            discountPercent: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="% off"
                      />
                      {editing.priceUgx > 0 &&
                      editing.discountPercent &&
                      editing.discountPercent > 0 ? (
                        <small className="muted">
                          Was{' '}
                          {formatUgx(
                            listPriceFromDiscount(editing.priceUgx, editing.discountPercent),
                          )}{' '}
                          · Now {formatUgx(editing.priceUgx)} (−{editing.discountPercent}%)
                        </small>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              <div className="field">
                <label>Bulk / volume discount</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.applyBulkDiscount}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          applyBulkDiscount: e.target.checked,
                          bulkDiscountPercent: e.target.checked
                            ? editing.bulkDiscountPercent || 10
                            : undefined,
                          bulkDiscountQty: e.target.checked
                            ? editing.bulkDiscountQty || 20
                            : undefined,
                          onPromotion: e.target.checked ? true : editing.onPromotion,
                        })
                      }
                    />{' '}
                    Offer % off from a quantity threshold
                  </label>
                  {editing.applyBulkDiscount ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={editing.bulkDiscountPercent ?? ''}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            bulkDiscountPercent: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="% off"
                      />
                      <input
                        type="number"
                        min={2}
                        value={editing.bulkDiscountQty ?? ''}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            bulkDiscountQty: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Every N items (e.g. 20)"
                      />
                      {editing.bulkDiscountPercent && editing.bulkDiscountQty ? (
                        <small className="muted">
                          {editing.bulkDiscountPercent}% off when buying{' '}
                          {editing.bulkDiscountQty}+ {editing.unit || 'pcs'}
                        </small>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              <div className="field">
                <label>Stock</label>
                <input
                  type="number"
                  value={editing.stock}
                  onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Brand name</label>
                <input
                  value={editing.brand || ''}
                  onChange={(e) => setEditing({ ...editing, brand: e.target.value })}
                  placeholder="Elliecollections"
                />
              </div>
              <div className="field">
                <label>Make / material</label>
                <input
                  value={editing.make || ''}
                  onChange={(e) => setEditing({ ...editing, make: e.target.value })}
                  placeholder="Cotton, silk blend…"
                />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Available sizes (select all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 8 }}>
                  {(editing.kind === 'apparel'
                    ? [...APPAREL_SIZE_OPTIONS]
                    : editing.category.toLowerCase().includes('shoe')
                      ? [...SHOE_SIZE_OPTIONS]
                      : [...ACCESSORY_SIZE_OPTIONS, ...SHOE_SIZE_OPTIONS]
                  ).map((opt) => {
                    const checked = (editing.sizes || []).includes(opt);
                    return (
                      <label
                        key={opt}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          border: '1px solid var(--line, #e8dfe1)',
                          padding: '6px 10px',
                          background: checked ? 'var(--blush-soft, #f3e6e6)' : '#fff',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const current = editing.sizes || [];
                            const next = checked
                              ? current.filter((s) => s !== opt)
                              : [...current, opt];
                            setEditing({
                              ...editing,
                              sizes: next,
                              size: next.join(', '),
                            });
                          }}
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="field">
                <label>Color</label>
                <input
                  value={editing.color || ''}
                  onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                  placeholder="Blush, ivory…"
                />
              </div>
              <div className="field">
                <label>Location</label>
                <input
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Offer delivery</label>
                <select
                  value={editing.deliveryAvailable === false ? 'no' : 'yes'}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      deliveryAvailable: e.target.value === 'yes',
                    })
                  }
                >
                  <option value="yes">Yes — deliver this item</option>
                  <option value="no">No — pickup only</option>
                </select>
              </div>
              <div className="field">
                <label>Delivery fee</label>
                <select
                  value={editing.deliveryMode || 'paid'}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      deliveryMode: e.target.value as DeliveryMode,
                    })
                  }
                  disabled={editing.deliveryAvailable === false}
                >
                  <option value="free">Free delivery</option>
                  <option value="paid">Delivery fee applies</option>
                </select>
              </div>
              <div className="field">
                <label>Delivery period</label>
                <select
                  value={editing.deliveryPeriod || '3_days'}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      deliveryPeriod: e.target.value as DeliveryPeriod,
                    })
                  }
                  disabled={editing.deliveryAvailable === false}
                >
                  {(Object.keys(DELIVERY_PERIOD_LABELS) as DeliveryPeriod[]).map((key) => (
                    <option key={key} value={key}>
                      {DELIVERY_PERIOD_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Promotion badge</label>
                <input
                  value={editing.badge || ''}
                  onChange={(e) => setEditing({ ...editing, badge: e.target.value })}
                  placeholder="New · Hot · Promo"
                />
              </div>
              <div className="field">
                <label>Flags</label>
                <div style={{ display: 'flex', gap: 16, paddingTop: 10, flexWrap: 'wrap' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!editing.onPromotion}
                      onChange={(e) => setEditing({ ...editing, onPromotion: e.target.checked })}
                    />{' '}
                    On promotion
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!editing.featured}
                      onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                    />{' '}
                    Featured
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.active}
                      onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                    />{' '}
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="field">
              <label>Product images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => void onUploadFiles(e.target.files)}
              />
              <small className="muted">Upload up to 5 photos.</small>
            </div>
            {editing.images.length > 0 && (
              <div className="chip-row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                {editing.images.map((src, idx) => (
                  <div key={`${idx}-${src.slice(0, 24)}`} style={{ position: 'relative' }}>
                    <img
                      src={src}
                      alt=""
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #ddd',
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ display: 'block', fontSize: 12, padding: '2px 6px' }}
                      onClick={() =>
                        setEditing({
                          ...editing,
                          images: editing.images.filter((_, i) => i !== idx),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="field">
              <label>Description</label>
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
          </form>
        )}
      </AdminDrawer>

      <div className="table-wrap panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Kind</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th style={{ width: 170 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    {search.trim()
                      ? `No products match “${search.trim()}”.`
                      : 'No products in this filter.'}
                  </div>
                </td>
              </tr>
            ) : (
              pageItems.map((p) => {
                const img = cover(p);
                const isPhoto = img.startsWith('http') || img.startsWith('data:');
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="admin-product-cell">
                        {isPhoto ? (
                          <img className="admin-thumb" src={img} alt="" />
                        ) : (
                          <div className="admin-thumb-fallback">{p.imageEmoji || '📦'}</div>
                        )}
                        <div>
                          <strong>{p.title}</strong>
                          <div className="muted">
                            {p.category} · {p.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{p.kind}</td>
                    <td>
                      {formatUgx(p.priceUgx)} / {p.unit}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.saleMode === 'wholesale' ? 'Wholesale' : 'Retail'}
                        {p.minOrderQty && p.minOrderQty > 1 ? ` · min ${p.minOrderQty}` : ''}
                        {p.discountPercent ? ` · −${p.discountPercent}%` : ''}
                        {p.bulkDiscountPercent && p.bulkDiscountQty
                          ? ` · ${p.bulkDiscountPercent}% @ ${p.bulkDiscountQty}+`
                          : ''}
                      </div>
                    </td>
                    <td>{p.stock}</td>
                    <td>
                      <span className={`badge ${p.active ? 'badge-green' : 'badge-muted'}`}>
                        {p.active ? 'active' : 'hidden'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary admin-icon-btn"
                          title="Update"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn admin-icon-btn admin-icon-btn-danger"
                          title="Delete"
                          onClick={() => void removeProduct(p)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                        <AdminRowMenu
                          items={[
                            { label: 'View', onClick: () => void openView(p) },
                            { label: 'Update', onClick: () => openEdit(p) },
                            {
                              label: 'Delete',
                              tone: 'danger',
                              onClick: () => void removeProduct(p),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <AdminPagination
          page={page}
          pageCount={pageCount}
          from={from}
          to={to}
          total={total}
          onPageChange={setPage}
        />
      </div>

      <AdminDrawer
        open={!!viewing}
        wide
        title={viewing ? viewing.title : 'Product details'}
        onClose={() => {
          setViewing(null);
          setViewError(null);
        }}
        footer={
          viewing ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setViewing(null);
                  setViewError(null);
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  openEdit(viewing);
                  setViewing(null);
                }}
              >
                Edit product
              </button>
            </>
          ) : null
        }
      >
        {viewLoading && !viewing ? <p>Loading…</p> : null}
        {viewError ? <p className="admin-error">{viewError}</p> : null}
        {viewing ? (
          <div className="admin-detail-panel">
            {viewLoading ? <p className="muted">Refreshing from server…</p> : null}
            <div className="admin-detail-gallery">
              {getProductImages(viewing).slice(0, 6).map((src, i) => (
                <img key={`${viewing.id}-img-${i}`} src={src} alt="" />
              ))}
            </div>
            <div className="admin-detail-grid">
              <div>
                <span className="admin-detail-label">Product ID</span>
                <div className="admin-detail-value">
                  <code>{viewing.id}</code>
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Kind</span>
                <div className="admin-detail-value">
                  {viewing.kind === 'apparel' ? 'Apparel' : 'Accessories'}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Category</span>
                <div className="admin-detail-value">{viewing.category || '—'}</div>
              </div>
              <div>
                <span className="admin-detail-label">Unit</span>
                <div className="admin-detail-value">{viewing.unit}</div>
              </div>
              <div>
                <span className="admin-detail-label">Selling price</span>
                <div className="admin-detail-value">{formatUgx(viewing.priceUgx)}</div>
              </div>
              <div>
                <span className="admin-detail-label">Discount</span>
                <div className="admin-detail-value">
                  {(() => {
                    const deal = getPriceDisplay(viewing.priceUgx, viewing.compareAtPriceUgx);
                    if (!deal.hasDiscount) return 'None';
                    return `${deal.percentOff}% off · was ${formatUgx(deal.listPriceUgx!)}`;
                  })()}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Stock</span>
                <div className="admin-detail-value">{viewing.stock.toLocaleString()}</div>
              </div>
              <div>
                <span className="admin-detail-label">Brand</span>
                <div className="admin-detail-value">{viewing.brand || 'Elliecollections'}</div>
              </div>
              <div>
                <span className="admin-detail-label">Make</span>
                <div className="admin-detail-value">{viewing.make || '—'}</div>
              </div>
              <div>
                <span className="admin-detail-label">Sizes</span>
                <div className="admin-detail-value">
                  {(viewing.sizes && viewing.sizes.length
                    ? viewing.sizes.join(', ')
                    : viewing.size) || '—'}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Color</span>
                <div className="admin-detail-value">{viewing.color || '—'}</div>
              </div>
              <div>
                <span className="admin-detail-label">Promotion</span>
                <div className="admin-detail-value">
                  {viewing.onPromotion || viewing.badge
                    ? `${viewing.onPromotion ? 'On promo' : ''}${viewing.badge ? ` · ${viewing.badge}` : ''}`
                    : '—'}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Status</span>
                <div className="admin-detail-value">
                  <span className={`badge ${viewing.active ? 'badge-green' : 'badge-muted'}`}>
                    {viewing.active ? 'active' : 'hidden'}
                  </span>
                  {viewing.featured ? ' · featured' : ''}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Ships from</span>
                <div className="admin-detail-value">{viewing.location || '—'}</div>
              </div>
              <div>
                <span className="admin-detail-label">Delivery</span>
                <div className="admin-detail-value">
                  {viewing.deliveryAvailable === false
                    ? 'Pickup only'
                    : (viewing.deliveryMode || 'paid') === 'free'
                      ? 'Free delivery'
                      : 'Delivery fee applies'}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Delivery period</span>
                <div className="admin-detail-value">
                  {viewing.deliveryPeriod && DELIVERY_PERIOD_LABELS[viewing.deliveryPeriod]
                    ? DELIVERY_PERIOD_LABELS[viewing.deliveryPeriod]
                    : DELIVERY_PERIOD_LABELS['3_days']}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Created</span>
                <div className="admin-detail-value">
                  {new Date(viewing.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="admin-detail-label">Updated</span>
                <div className="admin-detail-value">
                  {new Date(viewing.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="full">
                <span className="admin-detail-label">Description</span>
                <div className="admin-detail-value" style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                  {viewing.description || '—'}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </AdminDrawer>
    </div>
  );
}
