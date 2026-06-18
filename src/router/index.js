import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/main/HomeView.vue'
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

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
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
  ],
})

export default router
