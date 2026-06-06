import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/main/HomeView.vue'
import ProductList from '../views/main/ProductList.vue'
import AttributeList from '../views/main/AttributeList.vue'

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
      path: '/attributes/:type',
      name: 'attributes',
      component: AttributeList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/hoa-don',
      name: 'HoaDonList',
      component: () => import('../views/main/hoa-don/HoaDonList.vue'),
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/hoa-don/quet-qr',
      name: 'QuetQrHoaDon',
      component: () => import('../views/main/hoa-don/QrScanner.vue'),
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/hoa-don/:id',
      name: 'HoaDonDetail',
      component: () => import('../views/main/hoa-don/HoaDonDetail.vue'),
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/hoa-don/:id/in',
      name: 'InHoaDon',
      component: () => import('../views/main/hoa-don/InHoaDon.vue'),
      meta: { layout: 'DashboardLayout' },
    },

  ],
})

export default router