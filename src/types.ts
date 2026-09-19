export type ProductKind = 'apparel' | 'accessories';
export type SaleMode = 'retail' | 'wholesale';

export type DeliveryMode = 'free' | 'paid';
export type DeliveryPeriod = '24_hours' | '3_days' | '1_week';

export const DELIVERY_PERIOD_LABELS: Record<DeliveryPeriod, string> = {
  '24_hours': '24 hours',
  '3_days': '3 days',
  '1_week': '1 week',
};

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  apparel: 'Apparel',
  accessories: 'Accessories',
};

export const SALE_MODE_LABELS: Record<SaleMode, string> = {
  retail: 'Retail',
  wholesale: 'Wholesale',
};

export type MarketCategory = {
  id: string;
  name: string;
  kind: ProductKind;
  description: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
};

export type MarketUnit = {
  id: string;
  name: string;
  symbol: string;
  description: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
};

export type Product = {
  id: string;
  kind: ProductKind;
  title: string;
  category: string;
  categoryId?: string;
  description: string;
  compareAtPriceUgx?: number;
  discountPercent?: number;
  saleMode?: SaleMode;
  minOrderQty?: number;
  bulkDiscountPercent?: number;
  bulkDiscountQty?: number;
  priceUgx: number;
  unit: string;
  unitId?: string;
  stock: number;
  imageEmoji: string;
  images: string[];
  imageUrls?: string[];
  seller: string;
  location: string;
  featured?: boolean;
  active: boolean;
  size?: string;
  sizes?: string[];
  color?: string;
  make?: string;
  brand?: string;
  badge?: string;
  onPromotion?: boolean;
  deliveryAvailable?: boolean;
  deliveryMode?: DeliveryMode;
  deliveryPeriod?: DeliveryPeriod;
  createdAt: string;
  updatedAt: string;
};

export const APPAREL_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size'] as const;
export const SHOE_SIZE_OPTIONS = ['36', '37', '38', '39', '40', '41', '42', '43'] as const;
export const ACCESSORY_SIZE_OPTIONS = ['One size', 'Small', 'Medium', 'Large'] as const;

export type UserRole = 'customer' | 'admin';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
  createdAt: string;
  active: boolean;
  area?: string;
  orderCount?: number;
  spendUgx?: number;
  totalSpentUgx?: number;
  payoutPhone?: string;
  payoutMethod?: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt?: string;
  active?: boolean;
};

export type PaymentMethod = 'mtn' | 'airtel' | 'card' | 'cash';
export type FulfillmentMode = 'delivery' | 'pickup';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type OrderItem = {
  productId: string;
  title: string;
  unit: string;
  quantity: number;
  unitPriceUgx: number;
  lineTotalUgx?: number;
  size?: string;
};

export type Order = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotalUgx: number;
  deliveryUgx: number;
  totalUgx: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentRef: string;
  paymentTrackingId?: string;
  merchantReference?: string;
  deliveryAddress: string;
  district: string;
  fulfillmentMode?: FulfillmentMode;
  recipientName?: string;
  recipientPhone?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  createdAt: string;
  updatedAt: string;
  refundedUgx?: number;
  refundAmountUgx?: number;
  refundNote?: string;
};

export type ProductReview = {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  visible?: boolean;
  createdAt: string;
};

export type CartLine = {
  productId: string;
  quantity: number;
  size?: string;
};
