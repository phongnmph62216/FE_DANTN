<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../../services/api'
import { formatCurrency } from '@/utils/format'
import { useCartStore } from '@/stores/cart'

const cartStore = useCartStore()
const products = ref([])
const isLoading = ref(true)
const selectedCategory = ref('ALL')

const categories = ref([
  { id: 'ALL', name: 'Tất cả sản phẩm mới' }
])

const sanitizeVietnamese = (text) => {
  if (!text) return ''
  let cleaned = text
  cleaned = cleaned.replace(/Vi\?t Nam/g, 'Việt Nam')
  cleaned = cleaned.replace(/C\? b\?/g, 'Cổ bẻ')
  cleaned = cleaned.replace(/C\? tròn/g, 'Cổ tròn')
  cleaned = cleaned.replace(/Tr\?ng/g, 'Trắng')
  return cleaned
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&q=80'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) return url
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const loadCategories = async () => {
  try {
    const res = await api.get('/api/v1/attributes/all-active')
    const types = res.data?.loaiSanPhamList || []
    if (Array.isArray(types) && types.length > 0) {
      categories.value = [
        { id: 'ALL', name: 'Tất cả sản phẩm mới' },
        ...types.map(item => ({
          id: item.id,
          name: sanitizeVietnamese(item.ten || '')
        }))
      ]
    }
  } catch (err) {
    console.error('Failed to load categories from BE:', err)
  }
}

const loadProducts = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/api/v1/san-pham', {
      params: { trangThai: 1, page: 0, size: 100 }
    })
    const data = res.data?.content || res.data?.data || res.data || []
    if (Array.isArray(data)) {
      products.value = data.map(item => ({
        id: item.id,
        code: item.maSanPham || '',
        idLoaiSanPham: item.idLoaiSanPham,
        tenLoaiSanPham: sanitizeVietnamese(item.tenLoaiSanPham || ''),
        tenSanPham: sanitizeVietnamese(item.tenSanPham || ''),
        tenThuongHieu: sanitizeVietnamese(item.tenThuongHieu || ''),
        tenChatLieu: sanitizeVietnamese(item.tenChatLieu || ''),
        hinhAnh: item.hinhAnh,
        giaBan: item.giaThapNhatSauGiam || item.giaThapNhat || 199000,
        giaGoc: item.giaThapNhat || 199000,
        phanTramGiam: item.maxPhanTramGiam || 0
      }))
    }
  } catch (err) {
    console.error('Failed to load new arrival products:', err)
  } finally {
    isLoading.value = false
  }
}

const filteredProducts = computed(() => {
  if (selectedCategory.value === 'ALL') return products.value
  const selId = Number(selectedCategory.value)
  const catObj = categories.value.find(c => String(c.id) === String(selectedCategory.value))
  const catName = catObj ? catObj.name.toLowerCase() : ''

  return products.value.filter(p => {
    if (p.idLoaiSanPham && Number(p.idLoaiSanPham) === selId) return true
    if (catName) {
      const name = (p.tenSanPham || '').toLowerCase()
      const type = (p.tenLoaiSanPham || '').toLowerCase()
      return name.includes(catName) || type.includes(catName)
    }
    return true
  })
})

onMounted(() => {
  loadCategories()
  loadProducts()
})
</script>

<template>
  <div class="min-h-screen bg-[#FAF9F6] text-gray-800 pb-20">
    <!-- Summer New Arrivals Hero Header -->
    <div class="relative bg-[#0D2533] text-white py-16 px-4 md:px-10 overflow-hidden shadow-lg">
      <div class="absolute inset-0 bg-cover bg-center opacity-20" style="background-image: url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80')"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-[#0D2533] via-transparent to-transparent"></div>

      <div class="max-w-6xl mx-auto relative z-10 text-center space-y-4">
        <span class="inline-block px-4 py-1 bg-[#EF972D] text-white text-xs font-extrabold uppercase tracking-widest rounded-full shadow-md">
          SUMMER COLLECTION 2026
        </span>
        <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight uppercase">
          BỘ SƯU TẬP MỚI VỀ - <span class="text-[#EF972D]">THỜI TRANG HÈ NAM</span>
        </h1>
        <p class="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Đón đầu xu hướng thời trang mùa hè nam năm 2026 với chất liệu đũi tự nhiên, cotton 100% thoáng mát, thấm hút mồ hôi vượt trội và form dáng thiết kế trẻ trung, hiện đại.
        </p>
      </div>
    </div>

    <!-- Highlights Features Bar -->
    <div class="max-w-6xl mx-auto px-4 md:px-6 -mt-6 relative z-20">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-gray-100">
        <div class="flex items-center gap-3 p-2">
          <div class="w-10 h-10 rounded-xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-xl">air</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-gray-900 uppercase">Thoáng Mát Hè</h4>
            <p class="text-[11px] text-gray-500">Chất liệu Cotton 100%</p>
          </div>
        </div>

        <div class="flex items-center gap-3 p-2">
          <div class="w-10 h-10 rounded-xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-xl">fit_screen</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-gray-900 uppercase">Co Giãn 4 Chiều</h4>
            <p class="text-[11px] text-gray-500">Thoải mái vận động</p>
          </div>
        </div>

        <div class="flex items-center gap-3 p-2">
          <div class="w-10 h-10 rounded-xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-xl">strikethrough_s</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-gray-900 uppercase">Chống Nhăn</h4>
            <p class="text-[11px] text-gray-500">Công nghệ sợi xử lý dệt</p>
          </div>
        </div>

        <div class="flex items-center gap-3 p-2">
          <div class="w-10 h-10 rounded-xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-xl">verified</span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-gray-900 uppercase">Bảo Hành 30 Ngày</h4>
            <p class="text-[11px] text-gray-500">Đổi trả cực nhanh chóng</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Tabs -->
    <div class="max-w-6xl mx-auto px-4 md:px-6 pt-12">
      <div class="flex items-center justify-center gap-2 overflow-x-auto pb-4 no-scrollbar">
        <button 
          v-for="cat in categories" 
          :key="cat.id"
          @click="selectedCategory = cat.id"
          class="px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
          :class="selectedCategory === cat.id ? 'bg-[#EF972D] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Loading Spinner -->
      <div v-if="isLoading" class="py-16 text-center text-gray-400">
        <span class="material-symbols-outlined animate-spin text-3xl mb-2 text-[#EF972D]">progress_activity</span>
        <p class="text-sm font-medium">Đang tải bộ sưu tập mới về...</p>
      </div>

      <!-- Products Grid -->
      <div v-else-if="filteredProducts.length > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pt-6">
        <RouterLink 
          v-for="p in filteredProducts" 
          :key="p.id" 
          :to="`/product/${p.id}`"
          class="flex flex-col bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
        >
          <!-- Top Image area -->
          <div class="relative overflow-hidden bg-gray-50 aspect-square">
            <!-- New Badge -->
            <div class="absolute top-2.5 left-2.5 bg-[#EF972D] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md z-10">
              NEW 2026
            </div>
            
            <img 
              :src="formatImage(p.hinhAnhMain || p.hinhAnh)" 
              :alt="p.tenSanPham" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <!-- Info Area -->
          <div class="p-4 flex flex-col justify-between flex-1 space-y-3">
            <div>
              <span class="text-[11px] font-bold text-[#EF972D] uppercase tracking-wider block mb-1">Mới ra mắt 2026</span>
              <h3 class="font-bold text-sm text-gray-900 group-hover:text-[#EF972D] line-clamp-2 transition-colors">
                {{ sanitizeVietnamese(p.tenSanPham) }}
              </h3>
            </div>

            <!-- Price and Details Button -->
            <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span class="text-base font-extrabold text-[#EF972D] block">{{ formatCurrency(p.giaBan || 199000) }}</span>
              <div class="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#EF972D] group-hover:text-white flex items-center justify-center text-gray-600 transition-colors">
                <span class="material-symbols-outlined text-base">visibility</span>
              </div>
            </div>
          </div>
        </RouterLink>
      </div>

      <div v-else class="py-16 text-center text-gray-400 bg-white rounded-3xl mt-6 border border-gray-100">
        <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">inventory_2</span>
        <p class="text-sm font-semibold text-gray-600">Chưa có sản phẩm trong danh mục này.</p>
      </div>
    </div>
  </div>
</template>
