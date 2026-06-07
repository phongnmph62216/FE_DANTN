import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/main/HomeView.vue'
import ProductList from '../views/main/ProductList.vue'
import AttributeList from '../views/main/AttributeList.vue'
import NhanVienList from '@/views/main/NhanVienList.vue'
import ThemNhanVien from '@/views/main/ThemNhanVien.vue'
import SuaNhanVien from '@/views/main/SuaNhanVien.vue'

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
      path: '/nhan-vien',
      name: 'nhan-vien',
      component: NhanVienList,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/them-nhan-vien',
      name: 'them-nhan-vien',
      component: ThemNhanVien,
      meta: { layout: 'DashboardLayout' },
    },
    {
      path: '/sua-nhan-vien/:id',
      name: 'sua-nhan-vien',
      component: SuaNhanVien,
      meta: { layout: 'DashboardLayout' },
    },
    
  ],
})

export default router
