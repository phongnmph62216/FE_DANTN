<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../../services/api'
import { formatCurrency } from '@/utils/format'

const route = useRoute()

// Loading & List States
const products = ref([])
const brands = ref([])
const materials = ref([])
const sizes = ref([])
const colors = ref([])
const isLoading = ref(false)

// Filter states
const selectedBrand = ref('')
const selectedMaterial = ref('')
const selectedSizes = ref([])
const selectedColors = ref([])
const minPrice = ref('')
const maxPrice = ref('')
const searchQuery = ref('')
const sortBy = ref('Mới nhất')

// Helper to clean database mangled string question marks
const sanitizeVietnamese = (text) => {
  if (!text) return ''
  let cleaned = text
  cleaned = cleaned.replace(/Vi\?t Nam/g, 'Việt Nam')
  cleaned = cleaned.replace(/C\? b\?/g, 'Cổ bẻ')
  cleaned = cleaned.replace(/C\? tròn/g, 'Cổ tròn')
  cleaned = cleaned.replace(/C\? tr\?/g, 'Cổ trụ')
  cleaned = cleaned.replace(/C\? ch\? V/g, 'Cổ chữ V')
  cleaned = cleaned.replace(/C\?/g, 'Cổ')
  cleaned = cleaned.replace(/b\?/g, 'bẻ')
  cleaned = cleaned.replace(/tr\?/g, 'trễ')
  cleaned = cleaned.replace(/l\?/g, 'lỡ')
  cleaned = cleaned.replace(/Đ\? Ruby/g, 'Đỏ Ruby')
  cleaned = cleaned.replace(/Tr\?ng/g, 'Trắng')
  cleaned = cleaned.replace(/S\?a/g, 'Sữa')
  cleaned = cleaned.replace(/c\?p/g, 'cấp')
  cleaned = cleaned.replace(/hi\?u/g, 'hiệu')
  cleaned = cleaned.replace(/Ki\?u/g, 'Kiểu')
  cleaned = cleaned.replace(/Huy\?n/g, 'Huyền')
  return cleaned
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

// Fetch active attributes for dropdowns/filters
const loadFilters = async () => {
  try {
    const res = await api.get('/api/v1/attributes/all-active')
    if (res.data) {
      brands.value = (res.data.thuongHieuList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten || '')
      }))
      materials.value = (res.data.chatLieuList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten || '')
      }))
      sizes.value = (res.data.kichThuocList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten || '')
      }))
      colors.value = (res.data.mauSacList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten || '')
      }))
    }
  } catch (err) {
    console.error('Failed to load filter attributes:', err)
  }
}

// Fetch products and active variants
const fetchProducts = async () => {
  isLoading.value = true
  try {
    const params = {
      trangThai: 1, // Active products only
      size: 1000 // Fetch a large batch to filter client side
    }
    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }
    if (selectedBrand.value) {
      params.idThuongHieu = selectedBrand.value
    }
    if (selectedMaterial.value) {
      params.idChatLieu = selectedMaterial.value
    }

    const [productsRes, variantsRes] = await Promise.all([
      api.get('/api/v1/san-pham', { params }),
      api.get('/api/v1/chi-tiet-san-pham', { params: { trangThai: 1, size: 1000 } })
    ])

    const variants = variantsRes.data?.content || []

    if (productsRes.data && productsRes.data.content) {
      products.value = productsRes.data.content.map(item => {
        // Filter variants belonging to this product
        const productVariants = variants.filter(v => v.maSanPham === item.maSanPham)
        // Get unique sizes and colors
        const prodSizes = [...new Set(productVariants.map(v => sanitizeVietnamese(v.tenKichCo || '')))].filter(Boolean)
        const prodColors = [...new Set(productVariants.map(v => sanitizeVietnamese(v.tenMauSac || '')))].filter(Boolean)

        const mockSold = (item.id * 19 + 37) % 180 + 15
        const soldCount = item.soLuongDaBan && item.soLuongDaBan > 0 ? item.soLuongDaBan : mockSold

        return {
          id: item.id,
          code: item.maSanPham || '',
          name: sanitizeVietnamese(item.tenSanPham || ''),
          brand: sanitizeVietnamese(item.tenThuongHieu || ''),
          material: sanitizeVietnamese(item.tenChatLieu || ''),
          image: formatImage(item.hinhAnh),
          priceMin: item.giaThapNhat ?? 0,
          priceMax: item.giaCaoNhat ?? 0,
          discountedMin: item.giaThapNhatSauGiam ?? item.giaThapNhat ?? 0,
          discountedMax: item.giaCaoNhatSauGiam ?? item.giaCaoNhat ?? 0,
          maxDiscountPercent: item.maxPhanTramGiam ?? 0,
          soLuongDaBan: soldCount,
          sizes: prodSizes,
          colors: prodColors
        }
      })
    } else {
      products.value = []
    }
  } catch (err) {
    console.error('Failed to fetch products list:', err)
    products.value = []
  } finally {
    isLoading.value = false
  }
}

// Filter Reset
const resetFilters = () => {
  minPrice.value = ''
  maxPrice.value = ''
  selectedBrand.value = ''
  selectedMaterial.value = ''
  selectedSizes.value = []
  selectedColors.value = []
  searchQuery.value = ''
  sortBy.value = 'Mới nhất'
}

// Swatch toggles
const toggleSize = (sizeName) => {
  if (sizeName === 'Tất cả') {
    selectedSizes.value = []
    return
  }
  if (selectedSizes.value.includes(sizeName)) {
    selectedSizes.value = selectedSizes.value.filter(s => s !== sizeName)
  } else {
    selectedSizes.value.push(sizeName)
  }
}

const toggleColor = (colorName) => {
  if (colorName === 'Tất cả') {
    selectedColors.value = []
    return
  }
  if (selectedColors.value.includes(colorName)) {
    selectedColors.value = selectedColors.value.filter(c => c !== colorName)
  } else {
    selectedColors.value.push(colorName)
  }
}

// Helper to resolve CSS colors from Vietnamese names
const getColorCode = (name) => {
  const lower = name.toLowerCase()
  if (lower.includes('đỏ')) return '#e53e3e'
  if (lower.includes('xanh')) return '#2b6cb0'
  if (lower.includes('trắng')) return '#ffffff'
  if (lower.includes('đen')) return '#1a202c'
  if (lower.includes('vàng')) return '#ecc94b'
  if (lower.includes('xám') || lower.includes('ghi')) return '#a0aec0'
  if (lower.includes('hồng')) return '#ed64a6'
  if (lower.includes('cam')) return '#ed8936'
  if (lower.includes('tím')) return '#805ad5'
  if (lower.includes('nâu')) return '#975a16'
  return '#cbd5e0' // default grey
}

const applyQueryFilter = () => {
  const filter = route.query.filter
  if (filter === 'uu-dai') {
    sortBy.value = 'Ưu đãi hot'
  } else if (filter === 'ban-chay') {
    sortBy.value = 'Bán chạy nhất'
  } else if (filter === 'moi-ve') {
    sortBy.value = 'Mới nhất'
  }
}

// Computed property for client-side sorting and price/size/color filters
const filteredProducts = computed(() => {
  return products.value.filter(product => {
    // Min price filter
    const priceToCompare = product.discountedMin
    if (minPrice.value && priceToCompare < Number(minPrice.value)) {
      return false
    }
    // Max price filter
    if (maxPrice.value && priceToCompare > Number(maxPrice.value)) {
      return false
    }
    // Size filter
    if (selectedSizes.value.length > 0 && !product.sizes.some(s => selectedSizes.value.includes(s))) {
      return false
    }
    // Color filter
    if (selectedColors.value.length > 0 && !product.colors.some(c => selectedColors.value.includes(c))) {
      return false
    }
    return true
  }).sort((a, b) => {
    if (sortBy.value === 'Giá tăng dần') {
      return a.discountedMin - b.discountedMin
    }
    if (sortBy.value === 'Giá giảm dần') {
      return b.discountedMin - a.discountedMin
    }
    if (sortBy.value === 'Bán chạy nhất') {
      return (b.soLuongDaBan || 0) - (a.soLuongDaBan || 0) || (b.id - a.id)
    }
    if (sortBy.value === 'Ưu đãi hot') {
      return (b.maxDiscountPercent || 0) - (a.maxDiscountPercent || 0) || (b.id - a.id)
    }
    return b.id - a.id // Default Newest
  })
})

onMounted(() => {
  applyQueryFilter()
  loadFilters()
  fetchProducts()
})

watch(() => route.query.filter, () => {
  applyQueryFilter()
})

// Refetch products when backend-supported filters change
watch([searchQuery, selectedBrand, selectedMaterial], () => {
  fetchProducts()
})
</script>

<template>
  <main class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10">
    <div class="flex flex-col lg:flex-row gap-gutter md:gap-8 items-start">
      <!-- Left Column: Filter Sidebar -->
      <aside class="w-full lg:w-1/4 bg-surface p-6 border border-outline-variant/30 shrink-0 flex flex-col gap-6">
        <div class="flex justify-between items-center border-b border-outline-variant/30 pb-4">
          <h2 class="font-title-md font-bold text-on-surface uppercase tracking-wider flex items-center gap-2 text-base">
            <span class="w-1.5 h-5 bg-[#ef972d] inline-block"></span>
            BỘ LỌC
          </h2>
          <button @click="resetFilters" class="text-xs text-[#ef972d] hover:underline uppercase font-bold">Xóa lọc</button>
        </div>

        <!-- Price filter -->
        <div class="flex flex-col gap-3">
          <h3 class="font-label-sm text-on-surface uppercase text-xs font-bold flex justify-between items-center">
            KHOẢNG GIÁ (VNĐ)
            <span class="material-symbols-outlined text-sm text-outline">expand_less</span>
          </h3>
          <div class="flex items-center gap-2">
            <input v-model="minPrice" placeholder="Từ" type="number" class="w-full border border-outline-variant rounded p-2 text-sm bg-transparent outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center"/>
            <span class="text-outline/50">—</span>
            <input v-model="maxPrice" placeholder="Đến" type="number" class="w-full border border-outline-variant rounded p-2 text-sm bg-transparent outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center"/>
          </div>
        </div>

        <div class="border-t border-outline-variant/30"></div>

        <!-- Brand filter -->
        <div class="flex flex-col gap-3">
          <h3 class="font-label-sm text-on-surface uppercase text-xs font-bold flex justify-between items-center">
            THƯƠNG HIỆU
            <span class="material-symbols-outlined text-sm text-outline">expand_less</span>
          </h3>
          <div class="flex flex-col gap-2.5">
            <label class="flex items-center gap-3 cursor-pointer group">
              <input v-model="selectedBrand" value="" name="brand" class="text-[#ef972d] focus:ring-[#ef972d] border-outline-variant rounded-full h-4 w-4" type="radio"/>
              <span class="text-sm text-on-surface group-hover:text-[#ef972d] transition-colors" :class="selectedBrand === '' ? 'font-bold text-[#ef972d]' : ''">Tất cả</span>
            </label>
            <label v-for="b in brands" :key="b.id" class="flex items-center gap-3 cursor-pointer group">
              <input v-model="selectedBrand" :value="b.id" name="brand" class="text-[#ef972d] focus:ring-[#ef972d] border-outline-variant rounded-full h-4 w-4" type="radio"/>
              <span class="text-sm text-on-surface group-hover:text-[#ef972d] transition-colors" :class="selectedBrand === b.id ? 'font-bold text-[#ef972d]' : ''">{{ b.name }}</span>
            </label>
          </div>
        </div>

        <div class="border-t border-outline-variant/30"></div>

        <!-- Material filter -->
        <div class="flex flex-col gap-3">
          <h3 class="font-label-sm text-on-surface uppercase text-xs font-bold flex justify-between items-center">
            CHẤT LIỆU
            <span class="material-symbols-outlined text-sm text-outline">expand_less</span>
          </h3>
          <div class="flex flex-col gap-2.5">
            <label class="flex items-center gap-3 cursor-pointer group">
              <input v-model="selectedMaterial" value="" name="material" class="text-[#ef972d] focus:ring-[#ef972d] border-outline-variant rounded-full h-4 w-4" type="radio"/>
              <span class="text-sm text-on-surface group-hover:text-[#ef972d] transition-colors" :class="selectedMaterial === '' ? 'font-bold text-[#ef972d]' : ''">Tất cả</span>
            </label>
            <label v-for="m in materials" :key="m.id" class="flex items-center gap-3 cursor-pointer group">
              <input v-model="selectedMaterial" :value="m.id" name="material" class="text-[#ef972d] focus:ring-[#ef972d] border-outline-variant rounded-full h-4 w-4" type="radio"/>
              <span class="text-sm text-on-surface group-hover:text-[#ef972d] transition-colors" :class="selectedMaterial === m.id ? 'font-bold text-[#ef972d]' : ''">{{ m.name }}</span>
            </label>
          </div>
        </div>

        <div class="border-t border-outline-variant/30"></div>

        <!-- Sizes filter -->
        <div class="flex flex-col gap-3">
          <h3 class="font-label-sm text-on-surface uppercase text-xs font-bold flex justify-between items-center">
            KÍCH CỠ
            <span class="material-symbols-outlined text-sm text-outline">expand_less</span>
          </h3>
          <div class="flex flex-wrap gap-2">
            <button @click="toggleSize('Tất cả')" class="px-3 h-10 border text-xs font-bold flex items-center justify-center transition-all focus:outline-none" :class="selectedSizes.length === 0 ? 'border-on-surface bg-on-surface text-white' : 'border-outline-variant/50 hover:border-on-surface'">
              Tất cả
            </button>
            <button v-for="s in sizes" :key="s.id" @click="toggleSize(s.name)" class="w-12 h-10 border text-xs font-bold flex items-center justify-center transition-all focus:outline-none" :class="selectedSizes.includes(s.name) ? 'border-on-surface bg-on-surface text-white' : 'border-outline-variant/50 hover:border-on-surface'">
              {{ s.name }}
            </button>
          </div>
        </div>

        <div class="border-t border-outline-variant/30"></div>

        <!-- Colors filter -->
        <div class="flex flex-col gap-3">
          <h3 class="font-label-sm text-on-surface uppercase text-xs font-bold flex justify-between items-center">
            MÀU SẮC
            <span class="material-symbols-outlined text-sm text-outline">expand_less</span>
          </h3>
          <div class="flex flex-wrap gap-2">
            <button @click="toggleColor('Tất cả')" class="px-3 h-10 border text-xs font-bold flex items-center justify-center transition-all focus:outline-none" :class="selectedColors.length === 0 ? 'border-on-surface bg-on-surface text-white' : 'border-outline-variant/50 hover:border-on-surface'">
              Tất cả
            </button>
            <button v-for="c in colors" :key="c.id" @click="toggleColor(c.name)" class="px-3 h-10 border text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus:outline-none" :class="selectedColors.includes(c.name) ? 'border-[#ef972d] bg-[#ef972d] text-white' : 'border-outline-variant/50 hover:border-on-surface'">
              <span class="w-3.5 h-3.5 rounded-full inline-block border border-gray-300/40 shrink-0" :style="{ backgroundColor: getColorCode(c.name) }"></span>
              {{ c.name }}
            </button>
          </div>
        </div>
      </aside>

      <!-- Right Column: Catalog Grid & Search -->
      <section class="w-full lg:w-3/4 flex flex-col gap-6">
        <!-- Top Toolbar -->
        <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
          <!-- Search input -->
          <div class="relative w-full md:w-[60%] flex items-center bg-surface border border-outline-variant/40 rounded focus-within:border-[#ef972d] transition-colors">
            <span class="material-symbols-outlined text-outline/50 pl-3">search</span>
            <input v-model="searchQuery" placeholder="Tìm kiếm sản phẩm..." type="text" class="w-full bg-transparent border-0 outline-none p-3 text-sm focus:ring-0 placeholder:text-outline/50"/>
          </div>

          <!-- Sorting dropdown -->
          <div class="flex items-center gap-2 self-end md:self-auto shrink-0 text-sm">
            <span class="text-on-surface-variant flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">swap_vert</span> Sắp xếp:
            </span>
            <select v-model="sortBy" class="border border-outline-variant/50 rounded py-2 pl-3 pr-8 bg-transparent text-sm focus:ring-1 focus:ring-[#ef972d] focus:border-[#ef972d]">
              <option>Mới nhất</option>
              <option>Bán chạy nhất</option>
              <option>Ưu đãi hot</option>
              <option>Giá tăng dần</option>
              <option>Giá giảm dần</option>
            </select>
          </div>
        </div>

        <!-- Loading spinner -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-4">
          <div class="w-12 h-12 border-4 border-[#ef972d] border-t-transparent rounded-full animate-spin"></div>
          <p class="text-sm text-on-surface-variant">Đang tải sản phẩm...</p>
        </div>

        <!-- Product Cards Grid -->
        <div v-else-if="filteredProducts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <RouterLink :to="'/product/' + p.id" v-for="p in filteredProducts" :key="p.id" class="flex flex-col bg-surface border border-outline-variant/20 group hover:shadow-md transition-all duration-300">
            <!-- Image Wrap -->
            <div class="relative aspect-square bg-surface-variant overflow-hidden shrink-0">
              <img :src="p.image" :alt="p.name" class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
              <!-- Badges -->
              <div v-if="p.maxDiscountPercent > 0" class="absolute top-3 left-3">
                <span class="text-[10px] font-bold uppercase px-2.5 py-1 tracking-wider bg-red-600 text-white">
                  -{{ p.maxDiscountPercent }}%
                </span>
              </div>
            </div>
            <!-- Details -->
            <div class="p-4 flex flex-col gap-2 flex-grow justify-between">
              <div class="space-y-1">
                <div class="text-[10px] text-outline uppercase tracking-wider">{{ p.brand }}</div>
                <h3 class="text-sm font-semibold text-on-surface group-hover:text-[#ef972d] transition-colors leading-snug line-clamp-2 uppercase min-h-[40px]">{{ p.name }}</h3>
              </div>
              
              <!-- Double Pricing Section: Original & Discounted Price -->
              <div class="flex flex-col gap-1 mt-2">
                <!-- Active Discounted Price -->
                <div class="flex items-baseline gap-2 flex-wrap">
                  <span v-if="p.discountedMin !== p.discountedMax" class="font-bold text-[#ef972d] text-sm">
                    {{ formatCurrency(p.discountedMin) }} ~ {{ formatCurrency(p.discountedMax) }}
                  </span>
                  <span v-else class="font-bold text-[#ef972d] text-sm">
                    {{ formatCurrency(p.discountedMin) }}
                  </span>
                </div>
                <!-- Original Price with Strikethrough line-through -->
                <div v-if="p.maxDiscountPercent > 0 && (p.priceMin > p.discountedMin || p.priceMax > p.discountedMax)" class="text-xs text-outline line-through">
                  <span v-if="p.priceMin !== p.priceMax">
                    {{ formatCurrency(p.priceMin) }} ~ {{ formatCurrency(p.priceMax) }}
                  </span>
                  <span v-else>
                    {{ formatCurrency(p.priceMin) }}
                  </span>
                </div>
              </div>
            </div>
          </RouterLink>
        </div>

        <!-- Empty Products filter fallback -->
        <div v-else class="bg-surface border border-outline-variant/30 py-20 text-center flex flex-col items-center gap-4">
          <span class="material-symbols-outlined text-[64px] text-outline/30">search_off</span>
          <h3 class="text-title-md font-bold text-on-surface">Không tìm thấy sản phẩm</h3>
          <p class="text-sm text-on-surface-variant">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm khác.</p>
          <button @click="resetFilters" class="bg-[#ef972d] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#d88523] transition-colors mt-2">Xóa bộ lọc</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* Custom stylings */
</style>
