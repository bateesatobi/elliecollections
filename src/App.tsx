import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MarketProvider } from './store/MarketStore';
import { CurrencyProvider } from './store/CurrencyStore';
import { ClientLayout } from './layouts/ClientLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { HomePage } from './pages/client/HomePage';
import { ShopPage } from './pages/client/ShopPage';
import { ProductDetailPage } from './pages/client/ProductDetailPage';
import { CartPage } from './pages/client/CartPage';
import { CheckoutPage } from './pages/client/CheckoutPage';
import { OrdersPage } from './pages/client/OrdersPage';
import { OrderDetailPage } from './pages/client/OrderDetailPage';
import { WishlistPage } from './pages/client/WishlistPage';
import { ReferralPage } from './pages/client/ReferralPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminRevenuePage } from './pages/admin/AdminRevenuePage';
import { AdminDisbursementsPage } from './pages/admin/AdminDisbursementsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminUnitsPage } from './pages/admin/AdminUnitsPage';
import { AdminPromosPage } from './pages/admin/AdminPromosPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';
import { TrackOrderPage } from './pages/client/TrackOrderPage';
import { SignInPage } from './pages/client/SignInPage';
import { SizeGuidePage } from './pages/client/SizeGuidePage';
import { ReturnsPage } from './pages/client/ReturnsPage';

export default function App() {
  return (
    <MarketProvider>
      <CurrencyProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<ClientLayout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="product/:id" element={<ProductDetailPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="signin" element={<SignInPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="track" element={<TrackOrderPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="refer" element={<ReferralPage />} />
              <Route path="size-guide" element={<SizeGuidePage />} />
              <Route path="returns" element={<ReturnsPage />} />
            </Route>

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="promos" element={<AdminPromosPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="units" element={<AdminUnitsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="revenue" element={<AdminRevenuePage />} />
              <Route path="disbursements" element={<AdminDisbursementsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CurrencyProvider>
    </MarketProvider>
  );
}
