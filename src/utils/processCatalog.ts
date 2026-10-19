/**
 * Platform process inventory — every submit / update / delete / search / pay / auth
 * flow that must show progress while running.
 */

export type ProcessKind =
  | 'submit'
  | 'update'
  | 'delete'
  | 'search'
  | 'auth'
  | 'pay'
  | 'load';

export type ProcessEntry = {
  id: string;
  kind: ProcessKind;
  area: 'client' | 'admin' | 'shared';
  label: string;
  where: string;
};

/** Canonical list used for progress titles and audits. */
export const PLATFORM_PROCESSES: ProcessEntry[] = [
  // —— Client auth ——
  { id: 'client.signin', kind: 'auth', area: 'client', label: 'Signing in…', where: 'SignInPage' },
  { id: 'admin.login', kind: 'auth', area: 'admin', label: 'Signing in…', where: 'AdminLoginPage' },

  // —— Client commerce ——
  { id: 'client.checkout.pay', kind: 'pay', area: 'client', label: 'Processing payment…', where: 'CheckoutPage' },
  { id: 'client.checkout.place', kind: 'submit', area: 'client', label: 'Placing order…', where: 'MarketStore.placeOrder' },
  { id: 'client.request', kind: 'submit', area: 'client', label: 'Sending request…', where: 'RequestPiecePage' },
  { id: 'client.review', kind: 'submit', area: 'client', label: 'Submitting review…', where: 'ProductReviews' },
  { id: 'client.track', kind: 'search', area: 'client', label: 'Looking up orders…', where: 'TrackOrderPage' },
  { id: 'client.shop.search', kind: 'search', area: 'client', label: 'Searching catalogue…', where: 'ShopPage / ClientLayout' },
  { id: 'client.like', kind: 'update', area: 'client', label: 'Updating wishlist…', where: 'wishlist.setProductLike' },
  { id: 'client.referral', kind: 'load', area: 'client', label: 'Loading referral…', where: 'ReferralPage' },

  // —— Admin catalogue ——
  { id: 'admin.product.save', kind: 'submit', area: 'admin', label: 'Saving product…', where: 'AdminProductsPage' },
  { id: 'admin.product.delete', kind: 'delete', area: 'admin', label: 'Deleting product…', where: 'AdminProductsPage' },
  { id: 'admin.product.load', kind: 'load', area: 'admin', label: 'Loading product…', where: 'AdminProductsPage' },
  { id: 'admin.product.search', kind: 'search', area: 'admin', label: 'Filtering products…', where: 'AdminProductsPage' },

  // —— Admin orders ——
  { id: 'admin.order.status', kind: 'update', area: 'admin', label: 'Updating order…', where: 'AdminOrdersPage' },
  { id: 'admin.order.refund', kind: 'update', area: 'admin', label: 'Processing refund…', where: 'AdminOrdersPage' },
  { id: 'admin.order.delete', kind: 'delete', area: 'admin', label: 'Deleting order…', where: 'AdminOrdersPage' },

  // —— Admin users ——
  { id: 'admin.user.save', kind: 'submit', area: 'admin', label: 'Saving user…', where: 'AdminUsersPage' },
  { id: 'admin.user.delete', kind: 'delete', area: 'admin', label: 'Deleting user…', where: 'AdminUsersPage' },
  { id: 'admin.user.load', kind: 'load', area: 'admin', label: 'Loading user…', where: 'AdminUsersPage' },

  // —— Admin reviews / requests ——
  { id: 'admin.review.visibility', kind: 'update', area: 'admin', label: 'Updating review…', where: 'AdminReviewsPage' },
  { id: 'admin.review.delete', kind: 'delete', area: 'admin', label: 'Deleting review…', where: 'AdminReviewsPage' },
  { id: 'admin.request.status', kind: 'update', area: 'admin', label: 'Updating request…', where: 'AdminRequestsPage' },

  // —— Admin promos / categories / units ——
  { id: 'admin.promo.save', kind: 'submit', area: 'admin', label: 'Saving promo…', where: 'AdminPromosPage' },
  { id: 'admin.promo.delete', kind: 'delete', area: 'admin', label: 'Deleting promo…', where: 'AdminPromosPage' },
  { id: 'admin.category.save', kind: 'submit', area: 'admin', label: 'Saving category…', where: 'AdminCategoriesPage' },
  { id: 'admin.category.delete', kind: 'delete', area: 'admin', label: 'Deleting category…', where: 'AdminCategoriesPage' },
  { id: 'admin.unit.save', kind: 'submit', area: 'admin', label: 'Saving unit…', where: 'AdminUnitsPage' },
  { id: 'admin.unit.delete', kind: 'delete', area: 'admin', label: 'Deleting unit…', where: 'AdminUnitsPage' },

  // —— Admin finance ——
  { id: 'admin.disburse.create', kind: 'submit', area: 'admin', label: 'Creating disbursements…', where: 'AdminDisbursementsPage' },
  { id: 'admin.disburse.pay', kind: 'pay', area: 'admin', label: 'Paying disbursement…', where: 'AdminDisbursementsPage' },

  // —— Shared loads ——
  { id: 'shared.catalog', kind: 'load', area: 'shared', label: 'Loading catalogue…', where: 'MarketStore.refreshCatalog' },
  { id: 'shared.admin.data', kind: 'load', area: 'shared', label: 'Refreshing admin data…', where: 'MarketStore.refreshAdminData' },
];

export function processLabel(id: string, fallback: string): string {
  return PLATFORM_PROCESSES.find((p) => p.id === id)?.label ?? fallback;
}
