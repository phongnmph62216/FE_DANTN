import { createRouter, createWebHistory } from 'vue-router'
import CustomerHomeView from '../views/main/CustomerHomeView.vue'
import AuthView from '../views/main/AuthView.vue'
import ProductDetailView from '../views/main/ProductDetailView.vue'
import CartView from '../views/main/CartView.vue'
import CheckoutView from '../views/main/CheckoutView.vue'
import AllProductsView from '../views/main/AllProductsView.vue'
import VnpayReturnView from '../views/main/VnpayReturnView.vue'
import OrderLookupView from '../views/main/OrderLookupView.vue'
import MyOrdersView from '../views/main/MyOrdersView.vue'
import CustomerProfileView from '../views/main/CustomerProfileView.vue'
import PromotionsView from '../views/main/PromotionsView.vue'
import NewArrivalsView from '../views/main/NewArrivalsView.vue'
import AboutUsView from '../views/main/AboutUsView.vue'
import HomeView from '../views/main/HomeView.vue'
import ThongKeView from '../views/main/ThongKeView.vue'
import ProductList from '../views/main/ProductList.vue'
import ProductVariantList from '../views/main/ProductVariantList.vue'
import AttributeList from '../views/main/AttributeList.vue'
import ProductAdd from '../views/main/ProductAdd.vue'
import DiscountList from '../views/main/DiscountList.vue'
import DiscountAdd from '../views/main/DiscountAdd.vue'
import CustomerList from '../views/main/CustomerList.vue'
import CustomerAdd from '../views/main/CustomerAdd.vue'
import VoucherList from '../views/main/VoucherList.vue'
import VoucherAdd from '../views/main/VoucherAdd.vue'
import EmployeeList from '../views/main/EmployeeList.vue'
import EmployeeAdd from '../views/main/EmployeeAdd.vue'
import InvoiceList from '../views/main/InvoiceList.vue'
import InvoiceDetail from '../views/main/InvoiceDetail.vue'
import POSManagement from '../views/main/POSManagement.vue'
import OrderList from '../views/main/OrderList.vue'
import CaLamViecView from '../views/main/CaLamViecView.vue'
import LichLamViecView from '../views/main/LichLamViecView.vue'
import LichSuHoatDongView from '../views/main/LichSuHoatDongView.vue'
import LichLamViecCuaToiView from '../views/main/LichLamViecCuaToiView.vue'
import GiaoCaView from '../views/main/GiaoCaView.vue'
import KeToanView from '../views/main/KeToanView.vue'
import ChatManagementView from '../views/main/ChatManagementView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'customer-home',
      component: CustomerHomeView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/product/:id',
      name: 'product-detail',
      component: ProductDetailView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/cart',
      name: 'cart',
      component: CartView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: CheckoutView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/all-products',
      name: 'all-products',
      component: AllProductsView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/vnpay-return',
      name: 'vnpay-return',
      component: VnpayReturnView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/tra-cuu',
      name: 'order-lookup',
      component: OrderLookupView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/my-orders',
      name: 'my-orders',
      component: MyOrdersView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/profile',
      name: 'customer-profile',
      component: CustomerProfileView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/uu-dai',
      name: 'promotions',
      component: PromotionsView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/moi-ve',
      name: 'new-arrivals',
      component: NewArrivalsView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/ve-chung-toi',
      name: 'about-us',
      component: AboutUsView,
      meta: { layout: 'CustomerLayout' },
    },
    {
      path: '/admin',
      name: 'admin-home',
      component: HomeView,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/admin/thong-ke',
      name: 'admin-thong-ke',
      component: ThongKeView,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/products',
      name: 'products',
      component: ProductList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/products/create',
      name: 'product-create',
      component: ProductAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/products/add',
      name: 'product-add',
      component: ProductAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/products/variants',
      name: 'product-variants',
      component: ProductVariantList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/attributes/:type',
      name: 'attributes',
      component: AttributeList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/vouchers',
      name: 'vouchers',
      component: VoucherList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/vouchers/create',
      name: 'voucher-create',
      component: VoucherAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/vouchers/add',
      name: 'voucher-add',
      component: VoucherAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/vouchers/edit/:id',
      name: 'voucher-edit',
      component: VoucherAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/discounts',
      name: 'discounts',
      component: DiscountList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/discounts/create',
      name: 'discount-create',
      component: DiscountAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/discounts/add',
      name: 'discount-add',
      component: DiscountAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/discounts/edit/:id',
      name: 'discount-edit',
      component: DiscountAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/customers',
      name: 'customers',
      component: CustomerList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/customers/create',
      name: 'customer-create',
      component: CustomerAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/customers/edit/:id',
      name: 'customer-edit',
      component: CustomerAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/employees',
      name: 'employees',
      component: EmployeeList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/employees/create',
      name: 'employee-create',
      component: EmployeeAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/employees/edit/:id',
      name: 'employee-edit',
      component: EmployeeAdd,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/invoices',
      name: 'invoices',
      component: InvoiceList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/orders',
      name: 'orders',
      component: OrderList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/invoices/:id',
      name: 'invoice-detail',
      component: InvoiceDetail,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/pos',
      name: 'pos',
      component: POSManagement,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/admin/ca-lam-viec',
      name: 'admin-ca-lam-viec',
      component: CaLamViecView,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/admin/lich-lam-viec',
      name: 'admin-lich-lam-viec',
      component: LichLamViecView,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/admin/lich-su-hoat-dong',
      name: 'admin-lich-su-hoat-dong',
      component: LichSuHoatDongView,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/admin/lich-lam-viec-cua-toi',
      name: 'admin-lich-lam-viec-cua-toi',
      component: LichLamViecCuaToiView,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/admin/giao-ca',
      name: 'admin-giao-ca',
      component: GiaoCaView,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/admin/ke-toan',
      name: 'admin-ke-toan',
      component: KeToanView,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/admin/chat',
      name: 'admin-chat',
      component: ChatManagementView,
      meta: { layout: 'DashboardLayout' },
    },
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Các route yêu cầu quyền admin/nhân viên
  const adminRoutes = [
    '/admin',
    '/products',
    '/attributes',
    '/vouchers',
    '/discounts',
    '/customers',
    '/employees',
    '/invoices',
    '/orders',
    '/pos'
  ]

  const requiresAdmin = adminRoutes.some(path => to.path === path || to.path.startsWith(path + '/'))
  const requiresAuth = ['/my-orders', '/profile'].some(path => to.path === path || to.path.startsWith(path + '/'))

  if (requiresAdmin) {
    if (!authStore.isLoggedIn || !authStore.isAdminOrStaff) {
      return next({ name: 'auth' })
    }
    // Block staff from accessing manager-only routes
    const managerOnlyRoutes = [
      '/admin/thong-ke',
      '/admin/ca-lam-viec',
      '/admin/lich-lam-viec',
      '/admin/lich-su-hoat-dong',
      '/products',
      '/attributes',
      '/vouchers',
      '/discounts',
      '/employees'
    ]
    const requiresManager = managerOnlyRoutes.some(path => to.path === path || to.path.startsWith(path + '/'))
    if (requiresManager && !authStore.isManager) {
      return next({ name: 'admin-home' })
    }
  }

  if (requiresAuth) {
    if (!authStore.isLoggedIn) {
      return next({ name: 'auth' })
    }
  }

  if (to.name === 'auth' && authStore.isLoggedIn) {
    if (authStore.isAdminOrStaff) {
      return next({ name: 'admin-home' })
    } else {
      return next({ name: 'customer-home' })
    }
  }

  next()
})

export default router
