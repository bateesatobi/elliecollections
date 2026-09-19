/** Elliecollections market API client — talks to Agrobackend FastAPI. */
import type {
  DeliveryMode,
  DeliveryPeriod,
  MarketCategory,
  MarketUnit,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductKind,
  SessionUser,
  User,
} from '../types';
import { discountPercentFromPrices, listPriceFromDiscount } from '../utils/pricing';

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://elliecollections-api-latest.onrender.com';

const TOKEN_KEY = 'ellie_market_token';
const ADMIN_TOKEN_KEY = 'ellie_market_admin_token';

export function getApiUrl() {
  return API_URL;
}

export function getCustomerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setCustomerToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

type ApiProduct = {
  id: string;
  kind: string;
  title: string;
  category: string;
  category_id?: string | null;
  description: string;
  price_ugx: number;
  compare_at_price_ugx?: number | null;
  discount_percent?: number | null;
  sale_mode?: string | null;
  min_order_qty?: number | null;
  bulk_discount_percent?: number | null;
  bulk_discount_qty?: number | null;
  unit: string;
  unit_id?: string | null;
  stock: number;
  image_emoji?: string | null;
  images?: string[];
  image_urls?: string[];
  seller_name?: string;
  seller_id?: string;
  location: string;
  featured?: boolean;
  active: boolean;
  size?: string | null;
  sizes?: string[] | null;
  color?: string | null;
  make?: string | null;
  brand?: string | null;
  badge?: string | null;
  on_promotion?: boolean | null;
  delivery_available?: boolean | null;
  delivery_mode?: string | null;
  delivery_period?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type Promo = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  animation: 'slide' | 'fade' | 'marquee';
  active: boolean;
  sortOrder: number;
  startsAt?: string;
  endsAt?: string;
};

type ApiCategory = {
  id: string;
  name: string;
  kind: string;
  description?: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string | null;
};

type ApiUnit = {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string | null;
};

type ApiOrder = {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: Array<{
    product_id: string;
    title: string;
    unit: string;
    quantity: number;
    unit_price_ugx: number;
    size?: string | null;
  }>;
  subtotal_ugx: number;
  delivery_ugx: number;
  total_ugx: number;
  status: OrderStatus;
  delivery_address: string;
  district: string;
  fulfillment_mode?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  tracking_number?: string | null;
  tracking_carrier?: string | null;
  payment_ref: string;
  payment_method?: PaymentMethod;
  created_at: string;
  updated_at?: string | null;
  refunded_ugx?: number | null;
  refund_note?: string | null;
};

type ApiMe = {
  id: string;
  name: string;
  phone_number: string;
  email?: string | null;
  role: string;
  active?: boolean;
  created_at: string;
};

type ApiAdminUser = {
  id: string;
  name: string;
  phone_number: string;
  email?: string | null;
  role: string;
  active: boolean;
  area?: string | null;
  created_at?: string | null;
  order_count?: number;
  spend_ugx?: number;
  payout_phone?: string | null;
  payout_method?: string | null;
};

async function request<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail =
      typeof data === 'object' && data && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : text || res.statusText;
    throw new Error(detail);
  }
  return data as T;
}

export function mapProduct(p: ApiProduct): Product {
  const imageUrls = Array.isArray(p.image_urls) ? p.image_urls.filter(Boolean) : [];
  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : imageUrls;
  const compareAt = p.compare_at_price_ugx ?? undefined;
  const discountPercent =
    p.discount_percent != null && p.discount_percent > 0
      ? p.discount_percent
      : discountPercentFromPrices(p.price_ugx, compareAt) || undefined;
  const deliveryMode =
    p.delivery_mode === 'free' || p.delivery_mode === 'paid'
      ? (p.delivery_mode as DeliveryMode)
      : 'paid';
  const deliveryPeriod =
    p.delivery_period === '24_hours' ||
    p.delivery_period === '3_days' ||
    p.delivery_period === '1_week'
      ? (p.delivery_period as DeliveryPeriod)
      : '3_days';
  return {
    id: p.id,
    kind: (p.kind as ProductKind) || 'apparel',
    title: p.title,
    category: p.category,
    categoryId: p.category_id || undefined,
    description: p.description || '',
    priceUgx: p.price_ugx,
    compareAtPriceUgx: compareAt,
    discountPercent,
    saleMode: p.sale_mode === 'wholesale' ? 'wholesale' : 'retail',
    minOrderQty:
      p.min_order_qty != null && p.min_order_qty > 0 ? p.min_order_qty : undefined,
    bulkDiscountPercent:
      p.bulk_discount_percent != null && p.bulk_discount_percent > 0
        ? p.bulk_discount_percent
        : undefined,
    bulkDiscountQty:
      p.bulk_discount_qty != null && p.bulk_discount_qty >= 2
        ? p.bulk_discount_qty
        : undefined,
    unit: p.unit,
    unitId: p.unit_id || undefined,
    stock: p.stock,
    imageEmoji: p.image_emoji || '👗',
    images,
    imageUrls,
    seller: p.seller_name || '',
    location: p.location || '',
    featured: !!p.featured,
    active: !!p.active,
    size: p.size || undefined,
    sizes: Array.isArray(p.sizes)
      ? p.sizes.filter(Boolean)
      : p.size
        ? String(p.size)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    color: p.color || undefined,
    make: p.make || undefined,
    brand: p.brand || undefined,
    badge: p.badge || undefined,
    onPromotion: !!p.on_promotion,
    deliveryAvailable: p.delivery_available !== false,
    deliveryMode,
    deliveryPeriod,
    createdAt: typeof p.created_at === 'string' ? p.created_at : new Date(p.created_at).toISOString(),
    updatedAt: p.updated_at
      ? typeof p.updated_at === 'string'
        ? p.updated_at
        : new Date(p.updated_at).toISOString()
      : typeof p.created_at === 'string'
        ? p.created_at
        : new Date().toISOString(),
  };
}

function mapCategory(c: ApiCategory): MarketCategory {
  return {
    id: c.id,
    name: c.name,
    kind: (c.kind as ProductKind) || 'apparel',
    description: c.description || '',
    active: !!c.active,
    sortOrder: c.sort_order ?? 0,
    createdAt:
      typeof c.created_at === 'string' ? c.created_at : new Date(c.created_at).toISOString(),
    updatedAt: c.updated_at
      ? typeof c.updated_at === 'string'
        ? c.updated_at
        : new Date(c.updated_at).toISOString()
      : undefined,
  };
}

function mapUnit(u: ApiUnit): MarketUnit {
  return {
    id: u.id,
    name: u.name,
    symbol: u.symbol,
    description: u.description || '',
    active: !!u.active,
    sortOrder: u.sort_order ?? 0,
    createdAt:
      typeof u.created_at === 'string' ? u.created_at : new Date(u.created_at).toISOString(),
    updatedAt: u.updated_at
      ? typeof u.updated_at === 'string'
        ? u.updated_at
        : new Date(u.updated_at).toISOString()
      : undefined,
  };
}

export function mapOrder(o: ApiOrder): Order {
  return {
    id: o.id,
    userId: o.user_id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    customerPhone: o.customer_phone,
    items: (o.items || []).map((i) => ({
      productId: i.product_id,
      title: i.title,
      unit: i.unit,
      quantity: i.quantity,
      unitPriceUgx: i.unit_price_ugx,
      size: i.size || undefined,
    })),
    subtotalUgx: o.subtotal_ugx,
    deliveryUgx: o.delivery_ugx,
    totalUgx: o.total_ugx,
    status: o.status,
    deliveryAddress: o.delivery_address,
    district: o.district,
    fulfillmentMode:
      o.fulfillment_mode === 'pickup' ? 'pickup' : 'delivery',
    recipientName: o.recipient_name || o.customer_name,
    recipientPhone: o.recipient_phone || o.customer_phone,
    trackingNumber: o.tracking_number || undefined,
    trackingCarrier: o.tracking_carrier || undefined,
    paymentRef: o.payment_ref,
    paymentMethod: o.payment_method,
    createdAt:
      typeof o.created_at === 'string' ? o.created_at : new Date(o.created_at).toISOString(),
    updatedAt: o.updated_at
      ? typeof o.updated_at === 'string'
        ? o.updated_at
        : new Date(o.updated_at).toISOString()
      : typeof o.created_at === 'string'
        ? o.created_at
        : new Date().toISOString(),
    refundedUgx: o.refunded_ugx ?? undefined,
    refundNote: o.refund_note ?? undefined,
  };
}

function mapSession(me: ApiMe): SessionUser {
  return {
    id: me.id,
    name: me.name,
    email: me.email || '',
    phone: me.phone_number,
    role: me.role === 'admin' ? 'admin' : 'customer',
    createdAt:
      typeof me.created_at === 'string' ? me.created_at : new Date(me.created_at).toISOString(),
    active: me.active !== false,
  };
}

function mapAdminUser(u: ApiAdminUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email || '',
    phone: u.phone_number,
    role: u.role === 'admin' ? 'admin' : 'customer',
    password: '',
    createdAt: u.created_at
      ? typeof u.created_at === 'string'
        ? u.created_at
        : new Date(u.created_at).toISOString()
      : new Date().toISOString(),
    active: u.active,
    area: u.area || undefined,
    orderCount: u.order_count,
    spendUgx: u.spend_ugx,
    payoutPhone: u.payout_phone || undefined,
    payoutMethod: u.payout_method || undefined,
  };
}

export const marketApi = {
  async listProducts(params?: { kind?: string; q?: string }) {
    const qs = new URLSearchParams();
    if (params?.kind) qs.set('kind', params.kind);
    if (params?.q) qs.set('q', params.q);
    qs.set('limit', '200');
    const data = await request<{ items: ApiProduct[]; total: number }>(
      `/market/products?${qs.toString()}`,
    );
    return data.items.map(mapProduct);
  },

  async login(emailOrPhone: string, password: string) {
    const key = emailOrPhone.trim();
    const body = key.includes('@')
      ? { email: key.toLowerCase(), password }
      : { phone_number: key, password };
    const tok = await request<{ access_token: string }>('/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return tok.access_token;
  },

  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    referredBy?: string;
  }) {
    await request('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        phone_number: data.phone,
        password: data.password,
        area: 'Uganda',
        email: data.email,
        role: 'customer',
        profile_complete: false,
        referred_by: data.referredBy || undefined,
      }),
    });
    return this.login(data.phone, data.password);
  },

  async me(token: string) {
    const me = await request<ApiMe>('/me', { token });
    return mapSession(me);
  },

  async myReferral(token: string) {
    return request<{ referral_code: string; referral_count: number; share_base_path: string }>(
      '/market/referral/me',
      { token },
    );
  },

  async resolveReferral(code: string) {
    return request<{ ok: boolean; referral_code: string; referrer_name?: string | null }>(
      `/market/referral/resolve/${encodeURIComponent(code)}`,
    );
  },

  async myOrders(token: string) {
    const data = await request<{ items: ApiOrder[] }>('/market/orders', { token });
    return data.items.map(mapOrder);
  },

  async adminOrders(token: string) {
    const data = await request<{ items: ApiOrder[] }>('/market/admin/orders', { token });
    return data.items.map(mapOrder);
  },

  async adminUsers(token: string) {
    const data = await request<ApiAdminUser[]>('/market/admin/users', { token });
    return data.map(mapAdminUser);
  },

  async getAdminUser(token: string, id: string) {
    const data = await request<ApiAdminUser>(`/market/admin/users/${id}`, { token });
    return mapAdminUser(data);
  },

  async quote(
    token: string,
    items: Array<{ product_id: string; quantity: number; size?: string }>,
    opts?: { fulfillment_mode?: 'delivery' | 'pickup' },
  ) {
    return request<{
      quote_id: string;
      total_ugx: number;
      subtotal_ugx: number;
      delivery_ugx: number;
    }>('/market/checkout/quote', {
      method: 'POST',
      token,
      body: JSON.stringify({
        items,
        fulfillment_mode: opts?.fulfillment_mode || 'delivery',
      }),
    });
  },

  async charge(
    token: string,
    payload: {
      amount_ugx: number;
      method: 'mtn' | 'airtel' | 'card';
      phone?: string;
      card?: Record<string, string>;
      quote_id?: string;
    },
  ) {
    return request<{
      ok: boolean;
      payment_ref: string;
      tracking_id: string;
      merchant_reference: string;
      method: string;
    }>('/market/payments/charge', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },

  async createOrder(
    token: string,
    payload: {
      items: Array<{ product_id: string; quantity: number; size?: string }>;
      delivery_address: string;
      district: string;
      payment_method: PaymentMethod;
      payment_ref: string;
      quote_id?: string;
      payment_tracking_id?: string;
      merchant_reference?: string;
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
      recipient_name?: string;
      recipient_phone?: string;
      fulfillment_mode?: 'delivery' | 'pickup';
    },
  ) {
    const order = await request<ApiOrder>('/market/orders', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
    return mapOrder(order);
  },

  async upsertProduct(
    token: string,
    product: Omit<Product, 'createdAt' | 'updatedAt'> & { createdAt?: string },
    isNew: boolean,
  ) {
    const allImages = product.images || [];
    const imageUrls = allImages.filter((img) => /^https?:\/\//i.test(img));
    const imagesBase64 = allImages.filter(
      (img) => img.startsWith('data:') || (!img.startsWith('http') && img.length > 100),
    );
    const discountPercent =
      product.discountPercent && product.discountPercent > 0
        ? Math.min(99, Math.round(product.discountPercent))
        : 0;
    const compareAt =
      discountPercent > 0
        ? listPriceFromDiscount(product.priceUgx, discountPercent)
        : undefined;
    const body = {
      kind: product.kind,
      title: product.title,
      category: product.category,
      category_id: product.categoryId || undefined,
      description: product.description,
      price_ugx: product.priceUgx,
      compare_at_price_ugx: compareAt ?? null,
      discount_percent: discountPercent,
      sale_mode: product.saleMode === 'wholesale' ? 'wholesale' : 'retail',
      min_order_qty:
        product.saleMode === 'wholesale'
          ? Math.max(2, product.minOrderQty || 10)
          : product.minOrderQty && product.minOrderQty > 1
            ? product.minOrderQty
            : 1,
      bulk_discount_percent:
        product.bulkDiscountPercent && product.bulkDiscountPercent > 0
          ? Math.min(99, Math.round(product.bulkDiscountPercent))
          : null,
      bulk_discount_qty:
        product.bulkDiscountPercent &&
        product.bulkDiscountPercent > 0 &&
        product.bulkDiscountQty &&
        product.bulkDiscountQty >= 2
          ? Math.round(product.bulkDiscountQty)
          : null,
      unit: product.unit,
      unit_id: product.unitId || undefined,
      stock: product.stock,
      image_emoji: product.imageEmoji,
      images_base64: imagesBase64,
      image_urls: imageUrls,
      location: product.location,
      featured: product.featured,
      active: product.active,
      size: product.sizes?.length
        ? product.sizes.join(', ')
        : product.size,
      sizes: product.sizes || [],
      color: product.color,
      make: product.make,
      brand: product.brand || 'Elliecollections',
      badge: product.badge || undefined,
      on_promotion: !!product.onPromotion,
      delivery_available: product.deliveryAvailable !== false,
      delivery_mode: product.deliveryMode || 'paid',
      delivery_period: product.deliveryPeriod || '3_days',
    };
    if (isNew) {
      const created = await request<ApiProduct>('/market/products', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
      return mapProduct(created);
    }
    const patched = await request<ApiProduct>(`/market/products/${product.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        ...body,
        images_base64: imagesBase64.length ? imagesBase64 : undefined,
        image_urls: imageUrls,
      }),
    });
    return mapProduct(patched);
  },

  async deleteProduct(token: string, id: string) {
    await request(`/market/products/${id}`, { method: 'DELETE', token });
  },

  async getProduct(id: string, includeInactive = false) {
    const q = includeInactive ? '?include_inactive=true' : '';
    const data = await request<ApiProduct>(`/market/products/${id}${q}`);
    return mapProduct(data);
  },

  async listCategories(params?: { kind?: ProductKind; includeInactive?: boolean }) {
    const q = new URLSearchParams({ limit: '500' });
    if (params?.kind) q.set('kind', params.kind);
    if (params?.includeInactive) q.set('include_inactive', 'true');
    const data = await request<{ items: ApiCategory[]; total: number }>(
      `/market/categories?${q.toString()}`,
    );
    return data.items.map(mapCategory);
  },

  async upsertCategory(
    token: string,
    category: Omit<MarketCategory, 'createdAt' | 'updatedAt'> & { createdAt?: string },
    isNew: boolean,
  ) {
    const body = {
      name: category.name,
      kind: category.kind,
      description: category.description,
      active: category.active,
      sort_order: category.sortOrder,
    };
    if (isNew) {
      const created = await request<ApiCategory>('/market/admin/categories', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
      return mapCategory(created);
    }
    const patched = await request<ApiCategory>(`/market/admin/categories/${category.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });
    return mapCategory(patched);
  },

  async deleteCategory(token: string, id: string) {
    await request(`/market/admin/categories/${id}`, { method: 'DELETE', token });
  },

  async listUnits(params?: { includeInactive?: boolean }) {
    const q = new URLSearchParams({ limit: '500' });
    if (params?.includeInactive) q.set('include_inactive', 'true');
    const data = await request<{ items: ApiUnit[]; total: number }>(
      `/market/units?${q.toString()}`,
    );
    return data.items.map(mapUnit);
  },

  async upsertUnit(
    token: string,
    unit: Omit<MarketUnit, 'createdAt' | 'updatedAt'> & { createdAt?: string },
    isNew: boolean,
  ) {
    const body = {
      name: unit.name,
      symbol: unit.symbol,
      description: unit.description,
      active: unit.active,
      sort_order: unit.sortOrder,
    };
    if (isNew) {
      const created = await request<ApiUnit>('/market/admin/units', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
      return mapUnit(created);
    }
    const patched = await request<ApiUnit>(`/market/admin/units/${unit.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });
    return mapUnit(patched);
  },

  async deleteUnit(token: string, id: string) {
    await request(`/market/admin/units/${id}`, { method: 'DELETE', token });
  },

  async updateOrderStatus(
    token: string,
    id: string,
    status: OrderStatus,
    opts?: { trackingNumber?: string; trackingCarrier?: string },
  ) {
    const order = await request<ApiOrder>(`/market/admin/orders/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        status,
        tracking_number: opts?.trackingNumber ?? null,
        tracking_carrier: opts?.trackingCarrier ?? null,
      }),
    });
    return mapOrder(order);
  },

  async lookupOrder(orderId: string, phone: string) {
    const order = await request<ApiOrder>('/market/orders/lookup', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId.trim(), phone: phone.trim() }),
    });
    return mapOrder(order);
  },

  async listReviews(productId: string) {
    const data = await request<{
      items: Array<{
        id: string;
        product_id: string;
        user_id: string;
        author_name: string;
        rating: number;
        title?: string;
        body: string;
        visible?: boolean;
        created_at: string;
      }>;
      total: number;
      average: number;
    }>(`/market/products/${productId}/reviews`);
    return {
      average: data.average || 0,
      total: data.total || 0,
      items: (data.items || []).map((r) => ({
        id: r.id,
        productId: r.product_id,
        userId: r.user_id,
        authorName: r.author_name,
        rating: r.rating,
        title: r.title || '',
        body: r.body,
        visible: r.visible !== false,
        createdAt:
          typeof r.created_at === 'string'
            ? r.created_at
            : new Date(r.created_at).toISOString(),
      })),
    };
  },

  async createReview(
    token: string,
    productId: string,
    payload: { rating: number; title?: string; body: string },
  ) {
    const r = await request<{
      id: string;
      product_id: string;
      user_id: string;
      author_name: string;
      rating: number;
      title?: string;
      body: string;
      visible?: boolean;
      created_at: string;
    }>(`/market/products/${productId}/reviews`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
    return {
      id: r.id,
      productId: r.product_id,
      userId: r.user_id,
      authorName: r.author_name,
      rating: r.rating,
      title: r.title || '',
      body: r.body,
      visible: !!r.visible,
      createdAt:
        typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
    };
  },

  async adminListReviews(token: string, visible?: boolean) {
    const q =
      visible === undefined ? '' : `?visible=${visible ? 'true' : 'false'}`;
    const data = await request<{
      items: Array<{
        id: string;
        product_id: string;
        user_id: string;
        author_name: string;
        rating: number;
        title?: string;
        body: string;
        visible?: boolean;
        created_at: string;
      }>;
      total: number;
      average: number;
      pending_count?: number;
    }>(`/market/admin/reviews${q}`, { token });
    return {
      average: data.average || 0,
      total: data.total || 0,
      pendingCount: data.pending_count || 0,
      items: (data.items || []).map((r) => ({
        id: r.id,
        productId: r.product_id,
        userId: r.user_id,
        authorName: r.author_name,
        rating: r.rating,
        title: r.title || '',
        body: r.body,
        visible: !!r.visible,
        createdAt:
          typeof r.created_at === 'string'
            ? r.created_at
            : new Date(r.created_at).toISOString(),
      })),
    };
  },

  async adminSetReviewVisibility(token: string, id: string, visible: boolean) {
    await request(`/market/admin/reviews/${id}/visibility`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ visible }),
    });
  },

  async adminDeleteReview(token: string, id: string) {
    await request(`/market/admin/reviews/${id}`, { method: 'DELETE', token });
  },

  async refundOrder(token: string, id: string, amountUgx: number, note: string) {
    const order = await request<ApiOrder>(`/market/admin/orders/${id}/refund`, {
      method: 'POST',
      token,
      body: JSON.stringify({ amount_ugx: amountUgx, note }),
    });
    return mapOrder(order);
  },

  async upsertUser(token: string, user: User, isNew: boolean) {
    if (isNew) {
      const created = await request<ApiAdminUser>('/market/admin/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: user.name,
          phone_number: user.phone,
          password: user.password || 'changeme123',
          email: user.email,
          role: user.role === 'admin' ? 'admin' : 'customer',
          active: user.active,
        }),
      });
      return mapAdminUser(created);
    }
    const patched = await request<ApiAdminUser>(`/market/admin/users/${user.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        name: user.name,
        phone_number: user.phone,
        email: user.email,
        role: user.role === 'admin' ? 'admin' : 'customer',
        active: user.active,
      }),
    });
    if (user.password) {
      await request(`/market/admin/users/${user.id}/password`, {
        method: 'POST',
        token,
        body: JSON.stringify({ password: user.password }),
      });
    }
    return mapAdminUser(patched);
  },

  async deleteUser(token: string, id: string) {
    await request(`/market/admin/users/${id}`, { method: 'DELETE', token });
  },

  async previewDisbursements(token: string, sellerIds?: string[]) {
    return request<{
      items: Array<{
        seller_id: string;
        seller_name: string;
        order_ids: string[];
        gross_ugx: number;
        platform_fee_ugx: number;
        net_ugx: number;
        destination: string;
      }>;
    }>('/market/admin/disbursements/preview', {
      method: 'POST',
      token,
      body: JSON.stringify({ seller_ids: sellerIds ?? null }),
    });
  },

  async listDisbursements(token: string, status?: string) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<
      Array<{
        id: string;
        seller_id: string;
        seller_name: string;
        order_ids: string[];
        gross_ugx: number;
        platform_fee_ugx: number;
        net_ugx: number;
        method: string;
        destination: string;
        status: string;
        payment_ref?: string | null;
        error?: string | null;
        created_at: string;
        paid_at?: string | null;
      }>
    >(`/market/admin/disbursements${qs}`, { token });
  },

  async createDisbursements(
    token: string,
    items: Array<{
      seller_id: string;
      order_ids: string[];
      destination: string;
      method: 'mtn' | 'airtel' | 'bank';
    }>,
  ) {
    return request<
      Array<{
        id: string;
        seller_id: string;
        seller_name: string;
        order_ids: string[];
        gross_ugx: number;
        platform_fee_ugx: number;
        net_ugx: number;
        method: string;
        destination: string;
        status: string;
        payment_ref?: string | null;
        created_at: string;
      }>
    >('/market/admin/disbursements', {
      method: 'POST',
      token,
      body: JSON.stringify({ items }),
    });
  },

  async payDisbursement(token: string, id: string) {
    return request<{
      id: string;
      status: string;
      payment_ref?: string | null;
      error?: string | null;
      paid_at?: string | null;
      net_ugx: number;
      seller_name: string;
    }>(`/market/admin/disbursements/${id}/pay`, {
      method: 'POST',
      token,
    });
  },

  async listPromos() {
    const data = await request<{
      items: Array<{
        id: string;
        title: string;
        subtitle?: string;
        badge?: string;
        cta_label?: string;
        cta_url?: string;
        image_url?: string;
        animation?: string;
        active: boolean;
        sort_order?: number;
        starts_at?: string | null;
        ends_at?: string | null;
      }>;
    }>('/market/promos');
    return data.items.map(
      (p): Promo => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        badge: p.badge || 'Promo',
        ctaLabel: p.cta_label || 'Shop now',
        ctaUrl: p.cta_url || '/shop?promo=1',
        imageUrl: p.image_url || '',
        animation: (p.animation as Promo['animation']) || 'slide',
        active: !!p.active,
        sortOrder: p.sort_order || 0,
        startsAt: p.starts_at || undefined,
        endsAt: p.ends_at || undefined,
      }),
    );
  },

  async adminListPromos(token: string) {
    const data = await request<{
      items: Array<{
        id: string;
        title: string;
        subtitle?: string;
        badge?: string;
        cta_label?: string;
        cta_url?: string;
        image_url?: string;
        animation?: string;
        active: boolean;
        sort_order?: number;
        starts_at?: string | null;
        ends_at?: string | null;
      }>;
      total: number;
    }>('/market/admin/promos', { token });
    return data.items.map(
      (p): Promo => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        badge: p.badge || 'Promo',
        ctaLabel: p.cta_label || 'Shop now',
        ctaUrl: p.cta_url || '/shop?promo=1',
        imageUrl: p.image_url || '',
        animation: (p.animation as Promo['animation']) || 'slide',
        active: !!p.active,
        sortOrder: p.sort_order || 0,
        startsAt: p.starts_at || undefined,
        endsAt: p.ends_at || undefined,
      }),
    );
  },

  async upsertPromo(
    token: string,
    promo: Omit<Promo, 'id'> & { id?: string },
    isNew: boolean,
  ) {
    const body = {
      title: promo.title,
      subtitle: promo.subtitle,
      badge: promo.badge,
      cta_label: promo.ctaLabel,
      cta_url: promo.ctaUrl,
      image_url: promo.imageUrl,
      animation: promo.animation,
      active: promo.active,
      sort_order: promo.sortOrder,
      starts_at: promo.startsAt || null,
      ends_at: promo.endsAt || null,
    };
    if (isNew) {
      return request('/market/admin/promos', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
    }
    return request(`/market/admin/promos/${promo.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });
  },

  async deletePromo(token: string, id: string) {
    await request(`/market/admin/promos/${id}`, { method: 'DELETE', token });
  },
};
