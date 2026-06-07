<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'

const router = useRouter()

const optionsOpen = ref(false)
const searchQuery = ref('')
const selectedBrand = ref('')
const selectedMaterial = ref('')
const selectedStatus = ref('all')

const products = ref([])
const brandOptions = ref([])
const materialOptions = ref([])
const isLoading = ref(false)
const fetchError = ref(false)
const apiUnavailable = ref(false)

const currentPage = ref(0)
const pageSize = ref(10)
const totalElements = ref(0)
const totalPages = ref(1)

const formatPrice = (amount) => {
  if (amount == null || amount === '') return '—'
  const num = Number(amount)
  if (Number.isNaN(num)) return String(amount)
  return `${new Intl.NumberFormat('vi-VN').format(num)}₫`
}

const formatImage = (url) => {
  if (!url) return null
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const mapProductFromApi = (item) => ({
  id: item.id,
  code: item.maSanPham || item.ma || '—',
  name: item.tenSanPham || item.ten || '—',
  brand: item.tenThuongHieu || '—',
  material: item.tenChatLieu || '—',
  stock: item.tongTonKho ?? item.soLuongTon ?? 0,
  price: formatPrice(item.giaBanMin ?? item.giaBan ?? item.giaTu),
  isActive: item.trangThai === 1,
  image: formatImage(item.anhDaiDien || item.anh),
})

const paginationLabel = computed(() => {
  if (totalElements.value === 0) return 'Hiển thị 0 trên 0'
  const start = currentPage.value * pageSize.value + 1
  const end = Math.min((currentPage.value + 1) * pageSize.value, totalElements.value)
  return `Hiển thị ${start}-${end} trên ${totalElements.value} sản phẩm`
})

const loadFilterOptions = async () => {
  try {
    const [brandRes, materialRes] = await Promise.all([
      api.get('/api/v1/thuong-hieu', { params: { page: 0, size: 200, trangThai: 1 } }),
      api.get('/api/v1/chat-lieu', { params: { page: 0, size: 200, trangThai: 1 } }),
    ])
    brandOptions.value = (brandRes.data?.content || []).map((item) => ({
      value: String(item.id),
      label: item.ten || '',
    }))
    materialOptions.value = (materialRes.data?.content || []).map((item) => ({
      value: String(item.id),
      label: item.ten || '',
    }))
  } catch (err) {
    console.warn('Failed to load product filter options:', err)
    brandOptions.value = []
    materialOptions.value = []
  }
}

const fetchProducts = async (page = 0) => {
  isLoading.value = true
  fetchError.value = false
  apiUnavailable.value = false
  currentPage.value = page

  try {
    const params = {
      page,
      size: pageSize.value,
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
    if (selectedStatus.value === 'active') {
      params.trangThai = 1
    } else if (selectedStatus.value === 'inactive') {
      params.trangThai = 0
    }

    const res = await api.get('/api/v1/san-pham', { params })
    const pageData = res.data

    if (!pageData || !Array.isArray(pageData.content)) {
      throw new Error('Invalid paginated response')
    }

    products.value = pageData.content.map(mapProductFromApi)
    totalPages.value = pageData.totalPages ?? 1
    totalElements.value = pageData.totalElements ?? 0
  } catch (err) {
    console.error('Failed to load products:', err)
    products.value = []
    totalPages.value = 1
    totalElements.value = 0
    if (err.response?.status === 404) {
      apiUnavailable.value = true
    } else {
      fetchError.value = true
    }
  } finally {
    isLoading.value = false
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedBrand.value = ''
  selectedMaterial.value = ''
  selectedStatus.value = 'all'
  fetchProducts(0)
}

const filterResults = () => {
  fetchProducts(0)
}

const handleToggle = async (product) => {
  const previousActive = !product.isActive
  try {
    await api.patch(`/api/v1/san-pham/${product.id}/status`)
    await fetchProducts(currentPage.value)
  } catch (err) {
    product.isActive = previousActive
    console.error('Failed to toggle product status:', err)
  }
}

const addProduct = () => {
  router.push('/products/add').catch(() => {
    console.warn('Route /products/add chưa được cấu hình')
  })
}

watch([searchQuery, selectedBrand, selectedMaterial, selectedStatus], () => {
  fetchProducts(0)
})

onMounted(() => {
  loadFilterOptions()
  fetchProducts(0)
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <div class="flex flex-col gap-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-[#0D2533] font-headline-md">Danh sách sản phẩm</h1>
        <div class="flex items-center gap-3">
          <button
            @click="addProduct"
            class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer"
          >
            <span class="material-symbols-outlined">add</span> Thêm sản phẩm mới
          </button>

          <div class="relative">
            <button
              @click="optionsOpen = !optionsOpen"
              class="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center cursor-pointer"
            >
              <span class="material-symbols-outlined">more_horiz</span>
            </button>
            <div
              v-show="optionsOpen"
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1"
            >
              <button
                type="button"
                class="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left cursor-pointer"
                @click="optionsOpen = false"
              >
                <span class="material-symbols-outlined text-sm">download</span> Tải Excel
              </button>
              <button
                type="button"
                class="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left cursor-pointer"
                @click="optionsOpen = false"
              >
                <span class="material-symbols-outlined text-sm">qr_code_scanner</span> Quét QR
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters & Search Card -->
      <div class="bg-white p-6 rounded-2xl border border-surface-container shadow-sm space-y-6">
        <div class="relative w-full">
          <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
          <input
            v-model="searchQuery"
            class="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] text-base transition-all font-body-md"
            placeholder="Nhập mã hoặc tên sản phẩm..."
            type="text"
          />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-gray-100">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-4">
              <select
                v-model="selectedBrand"
                class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] min-w-[180px] cursor-pointer font-body-md"
              >
                <option value="">Tất cả thương hiệu</option>
                <option v-for="opt in brandOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>

              <select
                v-model="selectedMaterial"
                class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] min-w-[180px] cursor-pointer font-body-md"
              >
                <option value="">Tất cả chất liệu</option>
                <option v-for="opt in materialOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div class="h-8 w-px bg-gray-200 mx-2"></div>

            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                  <input class="peer sr-only" name="status" type="radio" value="all" v-model="selectedStatus" />
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#EF972D] transition-colors"></div>
                  <div class="absolute w-2.5 h-2.5 rounded-full bg-[#EF972D] scale-0 peer-checked:scale-100 transition-transform"></div>
                </div>
                <span :class="selectedStatus === 'all' ? 'text-[#0D2533] font-semibold' : 'text-gray-600'" class="text-sm font-medium transition-colors font-body-md">Tất cả</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                  <input class="peer sr-only" name="status" type="radio" value="active" v-model="selectedStatus" />
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#EF972D] transition-colors"></div>
                  <div class="absolute w-2.5 h-2.5 rounded-full bg-[#EF972D] scale-0 peer-checked:scale-100 transition-transform"></div>
                </div>
                <span :class="selectedStatus === 'active' ? 'text-[#0D2533] font-semibold' : 'text-gray-600'" class="text-sm font-medium transition-colors font-body-md">Kinh doanh</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                  <input class="peer sr-only" name="status" type="radio" value="inactive" v-model="selectedStatus" />
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#EF972D] transition-colors"></div>
                  <div class="absolute w-2.5 h-2.5 rounded-full bg-[#EF972D] scale-0 peer-checked:scale-100 transition-transform"></div>
                </div>
                <span :class="selectedStatus === 'inactive' ? 'text-[#0D2533] font-semibold' : 'text-gray-600'" class="text-sm font-medium transition-colors font-body-md">Ngừng kinh doanh</span>
              </label>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="filterResults"
              class="px-6 py-2.5 bg-[#0D2533] text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-colors shadow-sm font-body-md cursor-pointer"
            >
              Lọc kết quả
            </button>
            <button
              @click="resetFilters"
              class="px-4 py-2.5 text-[#EF972D] hover:bg-[#EF972D]/10 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1 font-body-md cursor-pointer"
            >
              <span class="material-symbols-outlined text-[18px]">restart_alt</span> Đặt lại bộ lọc
            </button>
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="bg-white rounded-xl border border-surface-container shadow-sm overflow-hidden relative">
        <div v-if="isLoading" class="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
          <span class="animate-spin material-symbols-outlined text-3xl text-[#EF972D]">progress_activity</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr class="text-on-surface-variant font-label-sm text-xs uppercase tracking-wider">
                <th class="px-6 py-4">STT</th>
                <th class="px-6 py-4">Mã SP</th>
                <th class="px-6 py-4">Tên sản phẩm</th>
                <th class="px-6 py-4">Thương hiệu</th>
                <th class="px-6 py-4">Chất liệu</th>
                <th class="px-6 py-4">Tồn kho</th>
                <th class="px-6 py-4 text-right">Khoảng giá</th>
                <th class="px-6 py-4">Trạng thái</th>
                <th class="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="!isLoading && products.length === 0">
                <td colspan="9" class="px-6 py-10 text-center text-gray-500 font-body-md">
                  <template v-if="apiUnavailable">
                    API sản phẩm (<code class="text-xs">/api/v1/san-pham</code>) chưa sẵn sàng trên backend.
                  </template>
                  <template v-else-if="fetchError">
                    Không tải được danh sách sản phẩm. Kiểm tra backend port 8080.
                  </template>
                  <template v-else>
                    Không có sản phẩm phù hợp bộ lọc.
                  </template>
                </td>
              </tr>
              <tr
                v-for="(product, idx) in products"
                :key="product.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 text-sm text-gray-500">{{ currentPage * pageSize + idx + 1 }}</td>
                <td class="px-6 py-4 text-sm font-semibold text-[#EF972D]">{{ product.code }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="product.image"
                      class="w-10 h-10 rounded-md object-cover"
                      :src="product.image"
                      :alt="product.name"
                    />
                    <div
                      v-else
                      class="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center"
                    >
                      <span class="material-symbols-outlined text-gray-400 text-sm">image</span>
                    </div>
                    <span class="text-sm font-medium text-on-surface">{{ product.name }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ product.brand }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ product.material }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ product.stock }}</td>
                <td class="px-6 py-4 text-sm text-right font-medium text-on-surface">{{ product.price }}</td>
                <td class="px-6 py-4">
                  <span
                    :class="product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                    class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase"
                  >
                    {{ product.isActive ? 'Đang bán' : 'Ngừng bán' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center gap-2">
                    <label class="relative inline-flex items-center cursor-pointer group mr-1">
                      <input
                        type="checkbox"
                        class="sr-only peer"
                        v-model="product.isActive"
                        @change="handleToggle(product)"
                      />
                      <div class="relative w-10 h-5 bg-gray-300 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                    <button type="button" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                      <span class="material-symbols-outlined text-xl">edit_note</span>
                    </button>
                    <button type="button" class="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                      <span class="material-symbols-outlined text-xl">visibility</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPages > 1" class="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>{{ paginationLabel }}</span>
          <div class="flex gap-1">
            <button
              type="button"
              class="p-2 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
              :disabled="currentPage === 0"
              @click="fetchProducts(currentPage - 1)"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <span class="px-3 py-2 font-semibold text-[#EF972D]">{{ currentPage + 1 }} / {{ totalPages }}</span>
            <button
              type="button"
              class="p-2 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
              :disabled="currentPage + 1 >= totalPages"
              @click="fetchProducts(currentPage + 1)"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
        <div v-else class="p-4 border-t border-gray-100 text-sm text-gray-500">
          {{ paginationLabel }}
        </div>
      </div>
    </div>
  </div>
</template>
