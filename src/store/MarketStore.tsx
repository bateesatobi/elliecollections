import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import {
  getAdminToken,
  getCustomerToken,
  marketApi,
  setAdminToken,
  setCustomerToken,
} from '../services/api';
import type {
  CartLine,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  SessionUser,
  User,
} from '../types';
import { effectiveMinOrderQty, unitPriceForQty } from '../utils/pricing';

const CART_KEY = 'ellie_market_cart_v1';

type MarketContextValue = {
  products: Product[];
  users: User[];
  orders: Order[];
  cart: CartLine[];
  customer: SessionUser | null;
  admin: SessionUser | null;
  cartCount: number;
  cartTotal: number;
  loading: boolean;
  refreshCatalog: () => Promise<void>;
  addToCart: (productId: string, qty?: number, size?: string) => void;
  setCartQty: (productId: string, qty: number, size?: string) => void;
  removeFromCart: (productId: string, size?: string) => void;
  clearCart: () => void;
  loginCustomer: (emailOrPhone: string, password?: string) => Promise<string | null>;
  continueWithPhone: (phone: string, name?: string) => Promise<string | null>;
  registerCustomer: (data: {
    name: string;
    email?: string;
    phone: string;
    password?: string;
  }) => Promise<string | null>;
  logoutCustomer: () => void;
  loginAdmin: (
    email: string,
    password: string,
    onProgress?: (percent: number, status: string) => void,
  ) => Promise<string | null>;
  logoutAdmin: () => void;
  placeOrder: (payload: {
    deliveryAddress: string;
    district: string;
    paymentRef: string;
    paymentMethod: PaymentMethod;
    paymentTrackingId?: string;
    merchantReference?: string;
    fulfillmentMode?: 'delivery' | 'pickup';
    recipientName?: string;
    recipientPhone?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  }) => Promise<{ ok: true; order: Order } | { ok: false; error: string }>;
  upsertProduct: (
    product: Omit<Product, 'createdAt' | 'updatedAt'> & { createdAt?: string },
  ) => Promise<string | null>;
  deleteProduct: (id: string) => Promise<string | null>;
  updateOrderStatus: (
    id: string,
    status: OrderStatus,
    opts?: { trackingNumber?: string; trackingCarrier?: string },
  ) => Promise<string | null>;
  refundOrder: (id: string, amountUgx: number, note: string) => Promise<string | null>;
  upsertUser: (user: User) => Promise<string | null>;
  deleteUser: (id: string) => Promise<string | null>;
  resetDemoData: () => Promise<void>;
};

const MarketContext = createContext<MarketContextValue | null>(null);

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartLine[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartLine[]>(() => loadCart());
  const [customer, setCustomer] = useState<SessionUser | null>(null);
  const [admin, setAdmin] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const refreshCatalog = useCallback(async () => {
    const items = await marketApi.listProducts();
    setProducts(items);
  }, []);

  const refreshCustomerOrders = useCallback(async (token: string) => {
    const items = await marketApi.myOrders(token);
    setOrders(items);
  }, []);

  const refreshAdminData = useCallback(async (token: string) => {
    const [ord, usr, prod] = await Promise.all([
      marketApi.adminOrders(token),
      marketApi.adminUsers(token),
      marketApi.listProducts(),
    ]);
    setOrders(ord);
    setUsers(usr);
    setProducts(prod);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshCatalog();
        const cTok = getCustomerToken();
        if (cTok) {
          try {
            const me = await marketApi.me(cTok);
            if (!cancelled && me.role !== 'admin') {
              setCustomer(me);
              await refreshCustomerOrders(cTok);
            }
          } catch {
            setCustomerToken(null);
          }
        }
        const aTok = getAdminToken();
        if (aTok) {
          try {
            const me = await marketApi.me(aTok);
            if (!cancelled && me.role === 'admin') {
              setAdmin(me);
              await refreshAdminData(aTok);
            }
          } catch {
            setAdminToken(null);
          }
        }
      } catch (e) {
        console.warn('Failed to load market catalog', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAdminData, refreshCatalog, refreshCustomerOrders]);

  const productsById = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return map;
  }, [products]);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => {
    const p = productsById.get(l.productId);
    if (!p) return s;
    const unit = unitPriceForQty(
      p.priceUgx,
      l.quantity,
      p.bulkDiscountPercent,
      p.bulkDiscountQty,
    );
    return s + unit * l.quantity;
  }, 0);

  const addToCart = useCallback((productId: string, qty = 1, size?: string) => {
    setCart((prev) => {
      const product = products.find((p) => p.id === productId && p.active);
      if (!product) return prev;
      const minQty = effectiveMinOrderQty(product);
      const sizeKey = size || undefined;
      const existing = prev.find(
        (c) => c.productId === productId && (c.size || undefined) === sizeKey,
      );
      const addQty = existing ? qty : Math.max(qty, minQty);
      const nextQty = (existing?.quantity ?? 0) + addQty;
      if (nextQty > product.stock) return prev;
      if (nextQty < minQty) return prev;
      return existing
        ? prev.map((c) =>
            c.productId === productId && (c.size || undefined) === sizeKey
              ? { ...c, quantity: nextQty }
              : c,
          )
        : [...prev, { productId, quantity: addQty, size: sizeKey }];
    });
  }, [products]);

  const setCartQty = useCallback(
    (productId: string, qty: number, size?: string) => {
      setCart((prev) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return prev;
        const minQty = effectiveMinOrderQty(product);
        const sizeKey = size || undefined;
        if (qty <= 0) {
          return prev.filter(
            (c) => !(c.productId === productId && (c.size || undefined) === sizeKey),
          );
        }
        if (qty < minQty) return prev;
        const capped = Math.min(qty, product.stock);
        return prev.map((c) =>
          c.productId === productId && (c.size || undefined) === sizeKey
            ? { ...c, quantity: capped }
            : c,
        );
      });
    },
    [products],
  );

  const removeFromCart = useCallback((productId: string, size?: string) => {
    const sizeKey = size || undefined;
    setCart((prev) =>
      prev.filter(
        (c) => !(c.productId === productId && (c.size || undefined) === sizeKey),
      ),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const loginCustomer = useCallback(async (emailOrPhone: string, password?: string) => {
    try {
      const token = await marketApi.login(emailOrPhone, password);
      const me = await marketApi.me(token);
      if (me.role === 'admin') return 'Use the admin login for admin accounts.';
      setCustomerToken(token);
      setCustomer(me);
      await refreshCustomerOrders(token);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Login failed.';
    }
  }, [refreshCustomerOrders]);

  const continueWithPhone = useCallback(
    async (phone: string, name?: string) => {
      if (!phone.trim()) return 'Enter your mobile number.';
      try {
        const { getStoredReferral, clearStoredReferral } = await import('../utils/referral');
        const referredBy = getStoredReferral() || undefined;
        const token = await marketApi.phoneAuth(phone, name, referredBy);
        const me = await marketApi.me(token);
        if (me.role === 'admin') return 'Use the admin login for admin accounts.';
        setCustomerToken(token);
        setCustomer(me);
        await refreshCustomerOrders(token);
        if (referredBy) clearStoredReferral();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not continue with this number.';
      }
    },
    [refreshCustomerOrders],
  );

  const registerCustomer = useCallback(
    async (data: { name: string; email?: string; phone: string; password?: string }) => {
      if (!data.name.trim() || !data.phone.trim()) {
        return 'Enter your name and mobile number.';
      }
      return continueWithPhone(data.phone, data.name);
    },
    [continueWithPhone],
  );

  const logoutCustomer = useCallback(() => {
    setCustomerToken(null);
    setCustomer(null);
    setOrders([]);
  }, []);

  const loginAdmin = useCallback(
    async (
      email: string,
      password: string,
      onProgress?: (percent: number, status: string) => void,
    ) => {
      try {
        onProgress?.(15, 'Checking credentials…');
        const token = await marketApi.login(email, password);
        onProgress?.(45, 'Verifying admin access…');
        const me = await marketApi.me(token);
        if (me.role !== 'admin') {
          return 'Not an admin account.';
        }
        onProgress?.(70, 'Loading marketplace data…');
        setAdminToken(token);
        setAdmin(me);
        await refreshAdminData(token);
        onProgress?.(100, 'Ready');
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Admin login failed.';
      }
    },
    [refreshAdminData],
  );

  const logoutAdmin = useCallback(() => {
    setAdminToken(null);
    setAdmin(null);
  }, []);

  const placeOrder = useCallback(
    async (payload: {
      deliveryAddress: string;
      district: string;
      paymentRef: string;
      paymentMethod: PaymentMethod;
      paymentTrackingId?: string;
      merchantReference?: string;
      fulfillmentMode?: 'delivery' | 'pickup';
      recipientName?: string;
      recipientPhone?: string;
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
    }) => {
      const token = getCustomerToken();
      if (!cart.length) return { ok: false as const, error: 'Your cart is empty.' };
      if (!payload.deliveryAddress.trim() || !payload.district.trim()) {
        return {
          ok: false as const,
          error:
            payload.fulfillmentMode === 'pickup'
              ? 'Confirm shop pickup location.'
              : 'Enter recipient address and location.',
        };
      }
      const recipientName = (payload.recipientName || payload.customerName || customer?.name || '').trim();
      const recipientPhone = (
        payload.recipientPhone ||
        payload.customerPhone ||
        customer?.phone ||
        ''
      ).trim();
      if (!recipientName || !recipientPhone) {
        return { ok: false as const, error: 'Enter your name and phone number.' };
      }
      if (!payload.paymentRef.trim()) {
        return { ok: false as const, error: 'Payment was not completed.' };
      }

      const customerName = (payload.customerName || customer?.name || recipientName).trim();
      const customerPhone = (payload.customerPhone || customer?.phone || recipientPhone).trim();
      const customerEmail = (payload.customerEmail || customer?.email || '').trim();

      try {
        const items = cart.map((l) => ({
          product_id: l.productId,
          quantity: l.quantity,
          ...(l.size ? { size: l.size } : {}),
        }));
        const fulfillmentMode = payload.fulfillmentMode || 'delivery';
        const quote = await marketApi.quote(token, items, {
          fulfillment_mode: fulfillmentMode,
        });
        const order = await marketApi.createOrder(token, {
          items,
          delivery_address: payload.deliveryAddress.trim(),
          district: payload.district.trim(),
          payment_method: payload.paymentMethod,
          payment_ref: payload.paymentRef.trim(),
          quote_id: quote.quote_id,
          payment_tracking_id: payload.paymentTrackingId,
          merchant_reference: payload.merchantReference,
          customer_name: customerName,
          customer_email: customerEmail || undefined,
          customer_phone: customerPhone,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          fulfillment_mode: fulfillmentMode,
        });
        setCart([]);
        await refreshCatalog();
        if (token) await refreshCustomerOrders(token);
        return { ok: true as const, order };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : 'Could not place order.',
        };
      }
    },
    [cart, customer, refreshCatalog, refreshCustomerOrders],
  );

  const upsertProduct = useCallback(
    async (product: Omit<Product, 'createdAt' | 'updatedAt'> & { createdAt?: string }) => {
      const token = getAdminToken();
      if (!token) return 'Admin login required.';
      try {
        const isNew = !products.some((p) => p.id === product.id);
        await marketApi.upsertProduct(token, product, isNew || product.id.startsWith('new_'));
        await refreshAdminData(token);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Save failed.';
      }
    },
    [products, refreshAdminData],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const token = getAdminToken();
      if (!token) return 'Admin login required.';
      try {
        await marketApi.deleteProduct(token, id);
        setCart((prev) => prev.filter((c) => c.productId !== id));
        await refreshAdminData(token);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Delete failed.';
      }
    },
    [refreshAdminData],
  );

  const updateOrderStatus = useCallback(
    async (
      id: string,
      status: OrderStatus,
      opts?: { trackingNumber?: string; trackingCarrier?: string },
    ) => {
      const token = getAdminToken();
      if (!token) return 'Admin login required.';
      try {
        await marketApi.updateOrderStatus(token, id, status, opts);
        await refreshAdminData(token);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Update failed.';
      }
    },
    [refreshAdminData],
  );

  const refundOrder = useCallback(
    async (id: string, amountUgx: number, note: string) => {
      const token = getAdminToken();
      if (!token) return 'Admin login required.';
      try {
        await marketApi.refundOrder(token, id, amountUgx, note);
        await refreshAdminData(token);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Refund failed.';
      }
    },
    [refreshAdminData],
  );

  const upsertUser = useCallback(
    async (user: User) => {
      const token = getAdminToken();
      if (!token) return 'Admin login required.';
      try {
        const isNew = !users.some((u) => u.id === user.id) || user.id.startsWith('new_');
        await marketApi.upsertUser(token, user, isNew);
        await refreshAdminData(token);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Save failed.';
      }
    },
    [refreshAdminData, users],
  );

  const deleteUser = useCallback(
    async (id: string) => {
      const token = getAdminToken();
      if (!token) return 'Admin login required.';
      try {
        await marketApi.deleteUser(token, id);
        await refreshAdminData(token);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Delete failed.';
      }
    },
    [refreshAdminData],
  );

  const resetDemoData = useCallback(async () => {
    await refreshCatalog();
    const aTok = getAdminToken();
    if (aTok) await refreshAdminData(aTok);
    const cTok = getCustomerToken();
    if (cTok) await refreshCustomerOrders(cTok);
  }, [refreshAdminData, refreshCatalog, refreshCustomerOrders]);

  const value: MarketContextValue = {
    products,
    users,
    orders,
    cart,
    customer,
    admin,
    cartCount,
    cartTotal,
    loading,
    refreshCatalog,
    addToCart,
    setCartQty,
    removeFromCart,
    clearCart,
    loginCustomer,
    continueWithPhone,
    registerCustomer,
    logoutCustomer,
    loginAdmin,
    logoutAdmin,
    placeOrder,
    upsertProduct,
    deleteProduct,
    updateOrderStatus,
    refundOrder,
    upsertUser,
    deleteUser,
    resetDemoData,
  };

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
}

export function formatUgx(n: number) {
  return `UGX ${Math.round(n).toLocaleString()}`;
}
