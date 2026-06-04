import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/main/HomeView.vue'
import ProductList from '../views/main/ProductList.vue'
import ProductVariantList from '../views/main/ProductVariantList.vue'
import AttributeList from '../views/main/AttributeList.vue'
import ProductAdd from '../views/main/ProductAdd.vue'

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
  ],
})

export default router
