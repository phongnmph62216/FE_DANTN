<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../services/api'

const route = useRoute()
const router = useRouter()

const isEditMode = computed(() => !!route.params.id)

// Form state
const discountName = ref('')
const discountPercent = ref(null)
const startDate = ref('')
const endDate = ref('')
const trangThai = ref(1)

// Selected variant IDs
const selectedVariantIds = ref([])

// Custom Modal & Toast States
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

const confirmModal = ref({ show: false, title: '', message: '', onConfirm: null })
const triggerConfirm = (message, onConfirm, title = 'Xác nhận hành động') => {
  confirmModal.value = {
    show: true,
    title,
    message,
    onConfirm
  }
}
const handleConfirm = async () => {
  const cb = confirmModal.value.onConfirm
  confirmModal.value.show = false
  if (cb) {
    await cb()
  }
}

// Helper to format date string to yyyy-MM-dd
const formatToInputDate = (dateStr) => {
  if (!dateStr) return ''
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0]
  }
  return dateStr.substring(0, 10)
}

const loadDiscountDetails = async () => {
  if (!isEditMode.value) return
  try {
    const res = await api.get(`/api/v1/dot-giam-gia/${route.params.id}`)
    const data = res.data
    if (data) {
      discountName.value = data.tenDotGiamGia || ''
      discountPercent.value = data.phanTramGiam || null
      startDate.value = formatToInputDate(data.ngayBatDau)
      endDate.value = formatToInputDate(data.ngayKetThuc)
      selectedVariantIds.value = data.danhSachIdChiTietSanPham || []
      trangThai.value = data.trangThai ?? 1
    }
  } catch (err) {
    console.error('Failed to load discount details:', err)
    showToast('Không thể tải chi tiết đợt giảm giá này!', 'error')
  }
}

// Helper to sanitize mangled Vietnamese characters from backend database encoding
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
  cleaned = cleaned.replace(/c\?p/g, 'cập')
  cleaned = cleaned.replace(/hi\?u/g, 'hiệu')
  cleaned = cleaned.replace(/Ki\?u/g, 'Kiểu')
  cleaned = cleaned.replace(/Huy\?n/g, 'Huyền')
  return cleaned
}

// ---------------- PRODUCTS SECTION ----------------
const products = ref([])
const productSearchQuery = ref('')
const isProductsLoading = ref(false)

// Product mapping code -> name
const productMap = ref({})

const loadAllProductNames = async () => {
  try {
    const res = await api.get('/api/v1/san-pham', { params: { size: 1000 } })
    if (res.data && res.data.content) {
      const map = {}
      res.data.content.forEach(p => {
        if (p.maSanPham) {
          map[p.maSanPham] = sanitizeVietnamese(p.tenSanPham || '')
        }
      })
      productMap.value = map
    }
  } catch (err) {
    console.warn('Failed to load all product names mapping:', err)
  }
}

const fetchProducts = async () => {
  isProductsLoading.value = true
  try {
    const params = {
      page: 0,
      size: 100,
    }
    if (productSearchQuery.value.trim()) {
      params.keyword = productSearchQuery.value.trim()
    }
    const res = await api.get('/api/v1/san-pham', { params })
    if (res.data && res.data.content) {
      products.value = res.data.content.map(p => ({
        ...p,
        tenSanPham: sanitizeVietnamese(p.tenSanPham || '')
      }))
    } else {
      products.value = []
    }
  } catch (err) {
    console.error('Failed to load products list:', err)
  } finally {
    isProductsLoading.value = false
  }
}

// Watch product search
let productSearchTimeout = null
watch(productSearchQuery, () => {
  clearTimeout(productSearchTimeout)
  productSearchTimeout = setTimeout(() => {
    fetchProducts()
  }, 400)
})

// Check if all variants of a product are selected
const isProductSelected = (productCode) => {
  const matchingVariants = variants.value.filter(v => v.productCode === productCode)
  if (matchingVariants.length === 0) return false
  return matchingVariants.every(v => selectedVariantIds.value.includes(v.id))
}

// Toggle select all variants of a product
const toggleProductSelection = async (product) => {
  try {
    const res = await api.get('/api/v1/chi-tiet-san-pham', {
      params: { keyword: product.maSanPham, size: 100 }
    })
    
    if (res.data && res.data.content) {
      const matchingVariants = res.data.content.filter(v => v.maSanPham === product.maSanPham)
      const variantIds = matchingVariants.map(v => v.id)
      
      if (variantIds.length === 0) {
        showToast('Sản phẩm này không có biến thể nào!', 'error')
        return
      }
      
      const allSelected = variantIds.every(id => selectedVariantIds.value.includes(id))
      
      if (allSelected) {
        selectedVariantIds.value = selectedVariantIds.value.filter(id => !variantIds.includes(id))
        showToast(`Đã bỏ chọn tất cả biến thể của sản phẩm "${product.tenSanPham}"`, 'info')
      } else {
        variantIds.forEach(id => {
          if (!selectedVariantIds.value.includes(id)) {
            selectedVariantIds.value.push(id)
          }
        })
        showToast(`Đã chọn tất cả ${variantIds.length} biến thể của sản phẩm "${product.tenSanPham}"`, 'success')
      }
    } else {
      showToast('Sản phẩm này không có biến thể nào!', 'error')
    }
  } catch (err) {
    console.error('Failed to toggle product selection:', err)
    showToast('Có lỗi xảy ra khi lấy danh sách biến thể của sản phẩm này!', 'error')
  }
}

// ---------------- VARIANTS SECTION ----------------
const variants = ref([])
const variantSearchQuery = ref('')
const selectedColor = ref('')
const selectedSize = ref('')
const selectedType = ref('')
const selectedStyle = ref('')

// Filter dynamic options
const colorOptions = ref([])
const sizeOptions = ref([])
const typeOptions = ref([])
const styleOptions = ref([])

// Price slider filter - updated default range limits
const priceRangeValue = ref(1000000)
const priceMax = ref(1000000)

const isVariantsLoading = ref(false)

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const fetchVariants = async () => {
  isVariantsLoading.value = true
  try {
    let queryKeyword = variantSearchQuery.value.trim()
    
    // Smart client-side mapping for searching by Product Name
    if (queryKeyword) {
      const matchingCodes = Object.keys(productMap.value).filter(code => {
        const name = productMap.value[code] || ''
        return name.toLowerCase().includes(queryKeyword.toLowerCase())
      })
      if (matchingCodes.length > 0) {
        queryKeyword = matchingCodes[0] // Set search keyword to product code
      }
    }

    const params = {
      page: 0,
      size: 150, // Load active variants
    }
    if (queryKeyword) {
      params.keyword = queryKeyword
    }
    if (selectedColor.value) {
      params.idMauSac = selectedColor.value
    }
    if (selectedSize.value) {
      params.idKichThuoc = selectedSize.value
    }
    
    // Status must be 1 (Active) to apply discounts
    params.trangThai = 1

    const res = await api.get('/api/v1/chi-tiet-san-pham', { params })
    if (res.data && res.data.content) {
      let content = res.data.content
      
      variants.value = content.map(item => ({
        id: item.id,
        productCode: item.maSanPham || 'N/A',
        variantCode: item.maChiTietSanPham || item.ma || 'N/A',
        size: sanitizeVietnamese(item.tenKichCo || item.tenKichThuoc || ''),
        color: sanitizeVietnamese(item.tenMauSac || ''),
        type: sanitizeVietnamese(item.tenLoaiSanPham || 'Áo thun'),
        style: sanitizeVietnamese(item.tenKieuDang || 'vừa to'),
        stock: item.soLuongTon ?? 0,
        salePrice: item.giaBan ?? 0,
        image: formatImage(item.anh),
      }))

      // Apply Client side filters for price slider
      variants.value = variants.value.filter(v => v.salePrice <= priceRangeValue.value)
      
      // Dynamically compute the maximum price in the loaded list
      if (variants.value.length > 0) {
        const max = Math.max(...variants.value.map(v => v.salePrice))
        if (max > 0 && priceMax.value === 1000000) {
          priceMax.value = max
          priceRangeValue.value = max
        }
      }
    } else {
      variants.value = []
    }
  } catch (err) {
    console.error('Failed to load variants:', err)
  } finally {
    isVariantsLoading.value = false
  }
}

// Watchers for variants filters
watch([selectedColor, selectedSize, selectedType, selectedStyle, priceRangeValue], () => {
  fetchVariants()
})

let variantSearchTimeout = null
watch(variantSearchQuery, () => {
  clearTimeout(variantSearchTimeout)
  variantSearchTimeout = setTimeout(() => {
    fetchVariants()
  }, 400)
})

// Toggle select individual variant
const toggleVariantSelection = (variantId) => {
  const index = selectedVariantIds.value.indexOf(variantId)
  if (index > -1) {
    selectedVariantIds.value.splice(index, 1)
  } else {
    selectedVariantIds.value.push(variantId)
  }
}

// Load dropdown option lists
const loadFilters = async () => {
  try {
    const res = await api.get('/api/v1/attributes/all-active')
    const data = res.data
    if (data) {
      colorOptions.value = (data.mauSacList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten || '')
      }))
      sizeOptions.value = (data.kichThuocList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten || '')
      }))
      typeOptions.value = (data.loaiSanPhamList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten || '')
      }))
      styleOptions.value = (data.kieuDangList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten || '')
      }))
    }
  } catch (err) {
    console.warn('Failed to load attributes options list:', err)
  }
}

// ---------------- ACTIONS ----------------
const cancel = () => {
  router.push('/discounts')
}

const saveDiscount = () => {
  // Field validation
  if (!discountName.value.trim()) {
    showToast('Tên đợt giảm giá không được để trống!', 'error')
    return
  }
  if (!discountPercent.value || discountPercent.value < 1 || discountPercent.value > 100) {
    showToast('Phần trăm giảm phải từ 1 đến 100!', 'error')
    return
  }
  if (!startDate.value) {
    showToast('Thời gian bắt đầu đợt giảm giá không được để trống!', 'error')
    return
  }
  if (!endDate.value) {
    showToast('Thời gian kết thúc đợt giảm giá không được để trống!', 'error')
    return
  }

  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  if (start >= end) {
    showToast('Thời gian bắt đầu phải trước thời gian kết thúc!', 'error')
    return
  }

  if (selectedVariantIds.value.length === 0) {
    showToast('Bạn chưa chọn bất kỳ biến thể sản phẩm nào để áp dụng giảm giá!', 'error')
    return
  }

  const confirmMsg = isEditMode.value
    ? `Bạn có chắc chắn muốn cập nhật đợt giảm giá "${discountName.value.trim()}" áp dụng cho ${selectedVariantIds.value.length} biến thể đã chọn?`
    : `Bạn có chắc chắn muốn tạo đợt giảm giá "${discountName.value.trim()}" áp dụng cho ${selectedVariantIds.value.length} biến thể đã chọn?`
  const confirmTitle = isEditMode.value ? 'Cập nhật đợt giảm giá' : 'Tạo đợt giảm giá mới'

  triggerConfirm(
    confirmMsg,
    async () => {
      try {
        const payload = {
          tenDotGiamGia: discountName.value.trim(),
          phanTramGiam: discountPercent.value,
          ngayBatDau: `${startDate.value}T00:00:00`,
          ngayKetThuc: `${endDate.value}T23:59:59`,
          danhSachIdChiTietSanPham: selectedVariantIds.value,
          trangThai: trangThai.value
        }

        let res
        if (isEditMode.value) {
          res = await api.put(`/api/v1/dot-giam-gia/${route.params.id}`, payload)
        } else {
          res = await api.post('/api/v1/dot-giam-gia', payload)
        }
        
        if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
          showToast(`${isEditMode.value ? 'Cập nhật' : 'Thêm'} đợt giảm giá thất bại: ${res._wrapper.message}`, 'error')
        } else {
          showToast(`${isEditMode.value ? 'Cập nhật' : 'Tạo mới'} đợt giảm giá thành công!`, 'success')
          setTimeout(() => {
            router.push('/discounts')
          }, 1000)
        }
      } catch (err) {
        console.error(`Failed to ${isEditMode.value ? 'update' : 'create'} discount:`, err)
        showToast(err.response?.data?.message || `${isEditMode.value ? 'Cập nhật' : 'Tạo mới'} đợt giảm giá thất bại, vui lòng thử lại sau!`, 'error')
      }
    },
    confirmTitle
  )
}

onMounted(async () => {
  await loadAllProductNames()
  loadFilters()
  fetchProducts()
  fetchVariants()
  await loadDiscountDetails()
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6 bg-[#f8f9ff] text-[#0b1c30] p-6 min-h-screen">
    <!-- Top Section (Side-by-side using robust CSS Grid classes) -->
    <div class="grid grid-cols-1 top-grid-container items-stretch">
      <!-- Left Column (Discount Form Card) -->
      <div class="form-card-column bg-white rounded-lg p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col justify-between">
        <div>
          <h2 class="font-headline-md text-headline-md text-on-surface mb-6">
            {{ isEditMode ? 'Cập nhật đợt giảm giá' : 'Thêm đợt giảm giá' }}
          </h2>
          
          <div class="space-y-4">
            <!-- Tên đợt giảm giá -->
            <div>
              <label class="block font-label-sm text-label-sm text-on-surface-variant mb-1">Tên đợt giảm giá</label>
              <input
                v-model="discountName"
                class="w-full border border-gray-300 rounded-md px-3 py-2 font-body-md text-body-md focus:outline-none focus:ring-1 form-input-ring text-on-surface bg-white"
                type="text"
                placeholder="Nhập tên đợt giảm giá"
              />
            </div>
            
            <!-- Giá trị giảm (%) - using original border-2 border-on-surface to match user image exactly -->
            <div>
              <label class="block font-label-sm text-label-sm text-on-surface-variant mb-1">Giá trị giảm (%)</label>
              <div class="relative">
                <input
                  v-model.number="discountPercent"
                  class="w-full border-2 border-on-surface rounded-md px-3 py-2 font-body-md text-body-md focus:outline-none focus:ring-1 form-input-ring text-on-surface pr-8"
                  type="number"
                  placeholder="Nhập số phần trăm giảm giá"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-label-sm">%</span>
              </div>
            </div>
            
            <!-- Ngày bắt đầu -->
            <div>
              <label class="block font-label-sm text-label-sm text-on-surface-variant mb-1">Ngày bắt đầu</label>
              <div class="relative date-input-container">
                <input
                  v-model="startDate"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 font-body-md text-body-md focus:outline-none focus:ring-1 form-input-ring text-on-surface bg-white"
                  type="date"
                  placeholder="dd/mm/yyyy"
                />
                <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">calendar_today</span>
              </div>
            </div>
            
            <!-- Ngày kết thúc -->
            <div>
              <label class="block font-label-sm text-label-sm text-on-surface-variant mb-1">Ngày kết thúc</label>
              <div class="relative date-input-container">
                <input
                  v-model="endDate"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 font-body-md text-body-md focus:outline-none focus:ring-1 form-input-ring text-on-surface bg-white"
                  type="date"
                  placeholder="dd/mm/yyyy"
                />
                <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">calendar_today</span>
              </div>
            </div>

            <!-- Selected count badge -->
            <div class="pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-on-surface-variant">
              <span>Biến thể đã chọn:</span>
              <span class="text-primary bg-primary-container/20 px-2.5 py-0.5 rounded-full font-bold text-sm">{{ selectedVariantIds.length }}</span>
            </div>
          </div>
        </div>
        
        <!-- Action Buttons (Positioned neatly at the bottom with exact colors matching mockup image) -->
        <div class="flex justify-end space-x-6 mt-6 pt-4 border-t border-gray-50">
          <button
            @click="cancel"
            type="button"
            style="background-color: #94a3b8;"
            class="px-6 py-2 hover:bg-slate-500 text-white rounded-md font-label-sm text-label-sm transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            @click="saveDiscount"
            type="button"
            style="background-color: #ef972d;"
            class="px-6 py-2 hover:bg-[#d88220] text-white rounded-md font-label-sm text-label-sm transition-colors shadow-sm cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </div>

      <!-- Right Column (Product Selection Card) -->
      <div class="product-card-column bg-white rounded-lg p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col h-[500px]">
        <h2 class="font-headline-md text-headline-md text-on-surface mb-4">Danh sách sản phẩm</h2>
        
        <!-- Search -->
        <div class="mb-4">
          <input
            v-model="productSearchQuery"
            class="w-full border border-gray-300 rounded-md px-4 py-2 font-body-md text-body-md focus:outline-none focus:ring-1 form-input-ring text-on-surface"
            placeholder="Tìm theo mã hoặc tên sản phẩm..."
            type="text"
          />
        </div>

        <!-- Table Header (CSS Grid layout based on user mockup) -->
        <div class="grid gap-4 py-3 border-b border-gray-100 font-label-sm text-label-sm text-on-surface uppercase tracking-wider sticky top-0 z-10 bg-white" style="grid-template-columns: 60px 80px 1fr 1fr;">
          <div class="text-center"></div>
          <div>ẢNH</div>
          <div>MÃ SẢN PHẨM</div>
          <div>TÊN SẢN PHẨM</div>
        </div>

        <!-- Table Body (Scrollable) -->
        <div class="overflow-y-auto custom-scrollbar flex-grow -mr-2 pr-2">
          <div v-if="isProductsLoading" class="py-10 text-center">
            <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
          <div v-else-if="products.length === 0" class="py-10 text-center text-on-surface-variant font-body-md">
            Không tìm thấy sản phẩm nào
          </div>
          <!-- Rows -->
          <div
            v-else
            v-for="p in products"
            :key="p.id"
            :class="isProductSelected(p.maSanPham) ? 'bg-[#eff4ff] border-l-4 border-[#ef972d]' : 'border-b border-gray-50'"
            class="grid gap-4 py-3 items-center hover:bg-surface-container-low transition-colors group cursor-pointer"
            style="grid-template-columns: 60px 80px 1fr 1fr;"
            @click.self="toggleProductSelection(p)"
          >
            <div class="flex justify-center">
              <button
                @click.stop="toggleProductSelection(p)"
                class="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 group-hover:border-[#ef972d] group-hover:text-[#ef972d] transition-colors bg-white cursor-pointer"
                :class="isProductSelected(p.maSanPham) ? 'border-[#ef972d] text-[#ef972d] bg-[#ef972d]/10' : ''"
              >
                <span class="material-symbols-outlined text-[16px]">
                  {{ isProductSelected(p.maSanPham) ? 'check' : 'add' }}
                </span>
              </button>
            </div>
            <div @click="toggleProductSelection(p)">
              <div style="position: relative; width: 48px; height: 48px;">
                <div class="w-12 h-12 bg-gray-100 rounded-md overflow-hidden border border-slate-100 flex items-center justify-center">
                  <img :src="formatImage(p.hinhAnh)" alt="" class="w-full h-full object-cover" />
                </div>
                <div
                  v-if="discountPercent && discountPercent > 0 && discountPercent <= 100"
                  style="position: absolute; top: -6px; left: -6px; background-color: #ef4444; color: #ffffff; font-size: 10px; font-weight: bold; padding: 2px 4.5px; border-radius: 4px; line-height: 1.2; z-index: 10; box-shadow: 0 1px 3px rgba(0,0,0,0.15);"
                >
                  -{{ discountPercent }}%
                </div>
              </div>
            </div>
            <div @click="toggleProductSelection(p)" class="font-body-md text-body-md text-on-surface-variant font-semibold">{{ p.maSanPham || 'N/A' }}</div>
            <div @click="toggleProductSelection(p)" class="font-body-md text-body-md text-on-surface font-medium">{{ p.tenSanPham || 'N/A' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Section (Variant Selection) -->
    <div class="bg-white rounded-lg p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] mt-6">
      <h2 class="font-headline-md text-headline-md text-on-surface mb-4">Danh sách biến thể</h2>
      
      <!-- Search and Filters -->
      <div class="space-y-4 mb-6">
        <input
          v-model="variantSearchQuery"
          class="w-full border border-gray-300 rounded-md px-4 py-2 font-body-md text-body-md focus:outline-none focus:ring-1 form-input-ring text-on-surface bg-white"
          placeholder="Tìm mã chi tiết / tên sản phẩm..."
          type="text"
        />
        
        <div class="flex flex-wrap gap-4 items-center">
          <!-- Color Select -->
          <select
            v-model="selectedColor"
            class="border border-gray-300 rounded-md px-3 py-1.5 font-body-md text-body-md focus:outline-none focus:ring-1 form-input-ring bg-white text-on-surface-variant min-w-[120px]"
          >
            <option value="">Màu sắc</option>
            <option v-for="opt in colorOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>

          <!-- Size Select -->
          <select
            v-model="selectedSize"
            class="border border-gray-300 rounded-md px-3 py-1.5 font-body-md text-body-md focus:outline-none focus:ring-1 form-input-ring bg-white text-on-surface-variant min-w-[120px]"
          >
            <option value="">Size</option>
            <option v-for="opt in sizeOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>
        </div>
        
        <!-- Price Slider -->
        <div class="pt-2">
          <div class="font-body-md text-body-md text-on-surface mb-2">
            Khoảng giá: 0 đ - {{ new Intl.NumberFormat('vi-VN').format(priceRangeValue) }} đ
          </div>
          <div class="relative w-full h-4 flex items-center">
            <input
              type="range"
              min="0"
              :max="priceMax"
              v-model.number="priceRangeValue"
              class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              :style="`background: linear-gradient(to right, #ef972d 0%, #ef972d ${(priceRangeValue / priceMax) * 100}%, #e2e8f0 ${(priceRangeValue / priceMax) * 100}%, #e2e8f0 100%)`"
            />
          </div>
        </div>
      </div>

      <!-- Variants Table (Uppercase Headers) -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-200 font-label-sm text-label-sm text-on-surface uppercase">
              <th class="py-3 px-2 w-[50px] text-center"></th>
              <th class="py-3 px-2 w-[70px]">ẢNH</th>
              <th class="py-3 px-2">TÊN SẢN PHẨM</th>
              <th class="py-3 px-2">MÃ CHI TIẾT</th>
              <th class="py-3 px-2">MÀU SẮC</th>
              <th class="py-3 px-2">KÍCH CỠ</th>
              <th class="py-3 px-2 text-center">SỐ LƯỢNG</th>
              <th class="py-3 px-2 text-right">GIÁ BÁN</th>
            </tr>
          </thead>
          <tbody class="font-body-md text-body-md text-on-surface-variant">
            <tr v-if="isVariantsLoading" class="p-10 text-center">
              <td colspan="8" class="py-10 text-center">
                <div class="w-6 h-6 border-2 border-[#ef972d] border-t-transparent rounded-full animate-spin mx-auto"></div>
              </td>
            </tr>
            <tr v-else-if="variants.length === 0">
              <td colspan="8" class="py-10 text-center text-on-surface-variant font-body-md">
                Không tìm thấy biến thể nào hoạt động
              </td>
            </tr>
            <tr
              v-else
              v-for="v in variants"
              :key="v.id"
              :class="selectedVariantIds.includes(v.id) ? 'bg-[#eff4ff] border-l-4 border-[#ef972d]' : 'border-b border-gray-50'"
              class="hover:bg-surface-container-low transition-colors group cursor-pointer"
              @click.self="toggleVariantSelection(v.id)"
            >
              <td class="py-3 px-2 text-center">
                <button
                  @click.stop="toggleVariantSelection(v.id)"
                  class="w-6 h-6 rounded-full border border-gray-300 inline-flex items-center justify-center text-gray-500 group-hover:border-[#ef972d] group-hover:text-[#ef972d] transition-colors bg-white cursor-pointer"
                  :class="selectedVariantIds.includes(v.id) ? 'border-[#ef972d] text-[#ef972d]' : ''"
                >
                  <span class="material-symbols-outlined text-[16px]">
                    {{ selectedVariantIds.includes(v.id) ? 'check' : 'add' }}
                  </span>
                </button>
              </td>
              <td class="py-3 px-2" @click="toggleVariantSelection(v.id)">
                <div style="position: relative; width: 40px; height: 40px;">
                  <div class="w-10 h-10 bg-gray-100 rounded-md overflow-hidden border border-slate-100 flex items-center justify-center">
                    <img :src="v.image" alt="" class="w-full h-full object-cover" />
                  </div>
                  <div
                    v-if="discountPercent && discountPercent > 0 && discountPercent <= 100"
                    style="position: absolute; top: -6px; left: -6px; background-color: #ef4444; color: #ffffff; font-size: 10px; font-weight: bold; padding: 2px 4.5px; border-radius: 4px; line-height: 1.2; z-index: 10; box-shadow: 0 1px 3px rgba(0,0,0,0.15);"
                  >
                    -{{ discountPercent }}%
                  </div>
                </div>
              </td>
              <td class="py-3 px-2 text-on-surface font-medium" @click="toggleVariantSelection(v.id)">{{ productMap[v.productCode] || v.productCode }}</td>
              <td class="py-3 px-2 font-semibold" @click="toggleVariantSelection(v.id)">{{ v.variantCode }}</td>
              <td class="py-3 px-2" @click="toggleVariantSelection(v.id)">{{ v.color }}</td>
              <td class="py-3 px-2 uppercase" @click="toggleVariantSelection(v.id)">{{ v.size }}</td>
              <td class="py-3 px-2 text-center" @click="toggleVariantSelection(v.id)">{{ v.stock }}</td>
              <td class="py-3 px-2 text-right" @click="toggleVariantSelection(v.id)">
                <template v-if="discountPercent && discountPercent > 0 && discountPercent <= 100">
                  <span style="text-decoration: line-through; color: #9ca3af; font-size: 12px; display: block; font-weight: normal; margin-bottom: 2px; text-align: right;">
                    {{ new Intl.NumberFormat('vi-VN').format(v.salePrice) }} đ
                  </span>
                  <span style="color: #ef4444; font-weight: bold; font-size: 14px; display: block; text-align: right;">
                    {{ new Intl.NumberFormat('vi-VN').format(Math.round(v.salePrice * (1 - discountPercent / 100))) }} đ
                  </span>
                </template>
                <template v-else>
                  <span class="text-[#0b1c30] font-semibold text-body-md block" style="text-align: right;">
                    {{ new Intl.NumberFormat('vi-VN').format(v.salePrice) }} đ
                  </span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Custom Confirmation Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span class="material-symbols-outlined text-[#ef972d] text-2xl">help_outline</span>
        <h3 class="text-base font-bold text-gray-800">{{ confirmModal.title }}</h3>
      </div>
      <div class="p-6 text-sm font-medium text-gray-600 leading-relaxed">
        {{ confirmModal.message }}
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button
          type="button"
          @click="confirmModal.show = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          @click="handleConfirm"
          class="bg-[#ef972d] hover:bg-[#d88220] text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
        >
          Xác nhận
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Toast Notification -->
  <div
    v-if="toast.show"
    class="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0"
    :class="{
      'bg-emerald-50 border-emerald-200 text-emerald-800': toast.type === 'success',
      'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
      'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'info'
    }"
  >
    <span class="material-symbols-outlined text-lg">
      {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
    </span>
    <span class="text-sm font-semibold">{{ toast.message }}</span>
    <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-gray-600 cursor-pointer">
      <span class="material-symbols-outlined text-sm">close</span>
    </button>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}

/* Custom media query classes to enforce perfect side-by-side grid layout on desktop */
@media (min-width: 1024px) {
  .top-grid-container {
    display: grid !important;
    grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
    gap: 24px !important;
  }
  .form-card-column {
    grid-column: span 4 / span 4 !important;
  }
  .product-card-column {
    grid-column: span 8 / span 8 !important;
  }
}

/* Custom styled inputs date pickers to match mockup text input and overlays */
.date-input-container input[type="date"] {
  position: relative;
  appearance: none;
  -webkit-appearance: none;
  background-image: none;
}
.date-input-container input[type="date"]::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  color: transparent;
  background: transparent;
  cursor: pointer;
  z-index: 10;
}

/* Custom range styles */
input[type=range] {
  -webkit-appearance: none;
  appearance: none;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ef972d;
  cursor: pointer;
  margin-top: -6px;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: #e2e8f0;
  border-radius: 2px;
}
</style>
