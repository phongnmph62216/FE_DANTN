<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink, useRouter } from 'vue-router'
import api from '../../services/api'
import { formatCurrency } from '@/utils/format'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const productId = route.params.id

// Loading & Data States
const product = ref(null)
const variants = ref([])
const selectedColor = ref(null)
const selectedSize = ref('')
const quantity = ref(1)
const mainImage = ref('')
const isLoading = ref(true)

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

// Fetch Product and Variants details
const fetchProductDetails = async () => {
  isLoading.value = true
  try {
    // 1. Fetch Product
    const prodRes = await api.get(`/api/v1/san-pham/${productId}`)
    if (prodRes.data) {
      product.value = {
        id: prodRes.data.id,
        code: prodRes.data.maSanPham || '',
        name: sanitizeVietnamese(prodRes.data.tenSanPham || ''),
        moTa: sanitizeVietnamese(prodRes.data.moTa || 'Chưa có mô tả chi tiết cho sản phẩm này.'),
        image: formatImage(prodRes.data.hinhAnh)
      }
      mainImage.value = product.value.image

      // 2. Fetch active variants of this product using the product code
      const varRes = await api.get('/api/v1/chi-tiet-san-pham', {
        params: {
          keyword: product.value.code,
          trangThai: 1,
          size: 100
        }
      })

      if (varRes.data && varRes.data.content) {
        const now = new Date()
        // Filter variants to ensure they belong exclusively to this product (avoiding partial code matches)
        const filteredList = varRes.data.content.filter(v => v.maSanPham === product.value.code)
        
        variants.value = filteredList.map(v => {
          let hasDiscount = false
          if (v.trangThaiDotGiamGia === 1 && (v.phanTramGiam ?? 0) > 0 && v.ngayBatDau && v.ngayKetThuc) {
            const start = new Date(v.ngayBatDau)
            const end = new Date(v.ngayKetThuc)
            hasDiscount = now >= start && now <= end
          }
          return {
            id: v.id,
            code: v.maChiTietSanPham || '',
            size: sanitizeVietnamese(v.tenKichCo || ''),
            color: sanitizeVietnamese(v.tenMauSac || ''),
            price: v.giaBan ?? 0,
            stock: v.soLuongTon ?? 0,
            image: formatImage(v.anh || prodRes.data.hinhAnh),
            discountPercent: v.phanTramGiam ?? 0,
            hasDiscount
          }
        })

        // Pre-select first color/size
        if (uniqueColors.value.length > 0) {
          selectedColor.value = uniqueColors.value[0]
        }
      }
    }
  } catch (err) {
    console.error('Failed to load product details:', err)
  } finally {
    isLoading.value = false
  }
}

// Extract unique Colors and Sizes
const uniqueColors = computed(() => {
  const map = new Map()
  for (const v of variants.value) {
    if (v.color && !map.has(v.color)) {
      map.set(v.color, {
        name: v.color,
        image: v.image
      })
    }
  }
  return Array.from(map.values())
})

const uniqueSizes = computed(() => {
  const sizesSet = new Set()
  for (const v of variants.value) {
    if (selectedColor.value && v.color === selectedColor.value.name) {
      if (v.size) sizesSet.add(v.size)
    }
  }
  return Array.from(sizesSet)
})

// Current selected variant object
const selectedVariant = computed(() => {
  if (!selectedColor.value || !selectedSize.value) return null
  return variants.value.find(v => 
    v.color === selectedColor.value.name && 
    v.size === selectedSize.value
  )
})

// Price & Discount Calculations
const priceRange = computed(() => {
  if (variants.value.length === 0) return { min: 0, max: 0, hasRange: false }
  const prices = variants.value.map(v => v.hasDiscount ? v.price * (100 - v.discountPercent) / 100 : v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return { min, max, hasRange: min !== max }
})

const originalPriceRange = computed(() => {
  if (variants.value.length === 0) return { min: 0, max: 0, hasRange: false }
  const prices = variants.value.map(v => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return { min, max, hasRange: min !== max }
})

const maxDiscountPercent = computed(() => {
  if (variants.value.length === 0) return 0
  return Math.max(0, ...variants.value.map(v => v.hasDiscount ? v.discountPercent : 0))
})

const hasAnyDiscount = computed(() => {
  return variants.value.some(v => v.hasDiscount)
})

// Thumbnails list
const thumbnails = computed(() => {
  const list = []
  if (product.value?.image) {
    list.push(product.value.image)
  }
  for (const col of uniqueColors.value) {
    if (col.image && !list.includes(col.image)) {
      list.push(col.image)
    }
  }
  return list
})

// Image swatch select
const selectImage = (image) => {
  mainImage.value = image
}

// Color select handler
const selectColor = (color) => {
  selectedColor.value = color
}

// Size select handler
const selectSize = (size) => {
  selectedSize.value = size
}

// Quantity Adjusters
const incrementQuantity = () => {
  if (selectedVariant.value) {
    if (quantity.value < selectedVariant.value.stock) {
      quantity.value++
    }
  } else {
    quantity.value++
  }
}

const decrementQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--
  }
}

const toast = ref({
  show: false,
  type: 'success',
  title: '',
  message: '',
  productInfo: null
})

let toastTimer = null

const showToastNotification = ({ type = 'success', title = '', message = '', productInfo = null }) => {
  toast.value = { show: true, type, title, message, productInfo }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

const updateQuantity = (val) => {
  let num = parseInt(val, 10)
  if (isNaN(num) || num < 1) {
    num = 1
  }
  if (selectedVariant.value && selectedVariant.value.stock && num > selectedVariant.value.stock) {
    showToastNotification({
      type: 'warning',
      title: 'Giới hạn tồn kho',
      message: `Số lượng chọn vượt quá tồn kho hiện có (${selectedVariant.value.stock})!`
    })
    num = selectedVariant.value.stock
  }
  quantity.value = num
}

// Add to Cart handler
const addToCart = (redirect = false) => {
  if (!selectedVariant.value) {
    showToastNotification({
      type: 'warning',
      title: 'Chưa chọn phân loại',
      message: 'Vui lòng chọn Màu sắc và Kích cỡ sản phẩm trước khi thêm!'
    })
    return
  }
  if (selectedVariant.value.stock <= 0) {
    showToastNotification({
      type: 'error',
      title: 'Hết hàng',
      message: 'Biến thể sản phẩm này hiện đã hết hàng trong kho!'
    })
    return
  }
  if (quantity.value > selectedVariant.value.stock) {
    showToastNotification({
      type: 'warning',
      title: 'Giới hạn tồn kho',
      message: `Số lượng chọn vượt quá tồn kho (${selectedVariant.value.stock})!`
    })
    return
  }

  const unitPrice = selectedVariant.value.hasDiscount 
    ? selectedVariant.value.price * (100 - selectedVariant.value.discountPercent) / 100 
    : selectedVariant.value.price

  cartStore.addItem({
    productId: product.value.id,
    productName: product.value.name,
    productCode: product.value.code,
    variantId: selectedVariant.value.id,
    variantCode: selectedVariant.value.code,
    size: selectedVariant.value.size,
    color: selectedVariant.value.color,
    price: unitPrice,
    originalPrice: selectedVariant.value.price,
    image: selectedVariant.value.image || mainImage.value,
    stock: selectedVariant.value.stock
  }, quantity.value)

  if (redirect) {
    router.push('/cart')
  } else {
    showToastNotification({
      type: 'success',
      title: 'ĐÃ THÊM VÀO GIỎ HÀNG',
      message: `Đã thêm ${quantity.value}x "${product.value.name}" (Size: ${selectedVariant.value.size}, Màu: ${selectedVariant.value.color})`,
      productInfo: {
        image: selectedVariant.value.image || mainImage.value,
        name: product.value.name,
        size: selectedVariant.value.size,
        color: selectedVariant.value.color,
        price: unitPrice
      }
    })
  }
}

// Watch selectedColor to auto-select size and change main image
watch(selectedColor, (newColor) => {
  if (newColor) {
    const availableSizes = variants.value
      .filter(v => v.color === newColor.name)
      .map(v => v.size)
    if (!availableSizes.includes(selectedSize.value)) {
      selectedSize.value = availableSizes[0] || ''
    }
    if (newColor.image) {
      mainImage.value = newColor.image
    }
  }
})

const relatedProducts = ref([])
const activeAccordion = ref(null)
const isDescriptionExpanded = ref(false)

const toggleAccordion = (name) => {
  if (activeAccordion.value === name) {
    activeAccordion.value = null
  } else {
    activeAccordion.value = name
  }
}

const toggleDescriptionExpand = () => {
  isDescriptionExpanded.value = !isDescriptionExpanded.value
}

const fetchRelatedProducts = async () => {
  try {
    const res = await api.get('/api/v1/san-pham', { params: { size: 10, trangThai: 1 } })
    if (res.data) {
      const list = res.data.content || res.data || []
      relatedProducts.value = list
        .filter(p => String(p.id) !== String(productId))
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          name: sanitizeVietnamese(p.tenSanPham || ''),
          image: formatImage(p.hinhAnh),
          price: p.giaMin || 199000,
          originalPrice: (p.giaMin || 199000) * 1.25
        }))
    }
  } catch (err) {
    console.error('Failed to load related products:', err)
  }
}

onMounted(() => {
  fetchProductDetails()
  fetchRelatedProducts()
})

watch(() => route.params.id, () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
  fetchProductDetails()
  fetchRelatedProducts()
})
</script>

<template>
  <!-- Loading spinner -->
  <div v-if="isLoading" class="flex flex-col items-center justify-center py-40 gap-4">
    <div class="w-12 h-12 border-4 border-[#ef972d] border-t-transparent rounded-full animate-spin"></div>
    <p class="text-sm text-on-surface-variant">Đang tải chi tiết sản phẩm...</p>
  </div>

  <main v-else-if="product" class="pb-section-gap px-margin-desktop max-w-container-max mx-auto pt-6">
    <!-- Breadcrumb -->
    <nav class="text-label-sm font-label-sm text-on-surface-variant mb-8 flex items-center gap-2">
      <RouterLink class="hover:text-[#ef972d] transition-colors" to="/">Trang chủ</RouterLink>
      <span class="">|</span>
      <RouterLink class="hover:text-[#ef972d] transition-colors" to="/all-products">Sản phẩm</RouterLink>
      <span class="">|</span>
      <span class="text-on-background">{{ product.name }}</span>
    </nav>

    <!-- Product Detail Layout -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-gutter lg:gap-12 mb-section-gap relative">
      <!-- Left Column: Image Gallery -->
      <div class="col-span-1 md:col-span-7 flex flex-col-reverse md:flex-row gap-4">
        <!-- Thumbnails -->
        <div class="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 w-full md:w-24 shrink-0">
          <button 
            v-for="(thumb, index) in thumbnails" 
            :key="index"
            @click="selectImage(thumb)"
            :class="mainImage === thumb ? 'border-[#ef972d] border-2' : 'border-border border hover:border-outline-variant'"
            class="w-20 h-24 shrink-0 focus:outline-none transition-colors overflow-hidden"
          >
            <img class="w-full h-full object-cover" :src="thumb" alt="Product detail thumbnail">
          </button>
        </div>

        <!-- Main Image -->
        <div class="flex-1 bg-surface-variant aspect-[3/4] md:aspect-auto overflow-hidden">
          <img class="w-full h-full object-cover transition-all duration-300" :src="mainImage" alt="Main product view">
        </div>
      </div>

      <!-- Right Column: Info & Actions -->
      <div class="col-span-1 md:col-span-5 flex flex-col gap-6 pt-4">
        <!-- Header Info -->
        <div>
          <h1 class="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-on-background mb-2 uppercase">{{ product.name }}</h1>
          <div class="flex items-center text-label-sm font-label-sm text-on-surface-variant gap-4 flex-wrap">
            <span>Mã sản phẩm: {{ product.code }}</span>
          </div>
        </div>

        <!-- Pricing -->
        <div class="border-t border-b border-outline-variant/30 py-4 flex justify-between items-center flex-wrap gap-4">
          <div>
            <!-- If specific variant is selected -->
            <template v-if="selectedVariant">
              <div v-if="selectedVariant.hasDiscount" class="text-label-sm font-label-sm text-outline line-through mb-1">
                Giá gốc: {{ formatCurrency(selectedVariant.price) }}
              </div>
              <div class="flex items-baseline gap-3">
                <span class="text-display-xl font-bold text-[#ef972d]">
                  {{ formatCurrency(selectedVariant.hasDiscount ? selectedVariant.price * (100 - selectedVariant.discountPercent) / 100 : selectedVariant.price) }}
                </span>
                <span v-if="selectedVariant.hasDiscount" class="text-white text-xs bg-red-600 py-1 px-2 rounded-sm font-bold">
                  -{{ selectedVariant.discountPercent }}%
                </span>
              </div>
            </template>
            
            <!-- If no variant selected yet (displays ranges) -->
            <template v-else>
              <div v-if="hasAnyDiscount" class="text-label-sm font-label-sm text-outline line-through mb-1">
                Giá gốc: {{ formatCurrency(originalPriceRange.min) }} <span v-if="originalPriceRange.hasRange">~ {{ formatCurrency(originalPriceRange.max) }}</span>
              </div>
              <div class="flex items-baseline gap-3">
                <span class="text-display-xl font-bold text-[#ef972d]">
                  {{ formatCurrency(priceRange.min) }} <span v-if="priceRange.hasRange">~ {{ formatCurrency(priceRange.max) }}</span>
                </span>
                <span v-if="maxDiscountPercent > 0" class="text-white text-xs bg-red-600 py-1 px-2 rounded-sm font-bold">
                  Giảm tới -{{ maxDiscountPercent }}%
                </span>
              </div>
            </template>
          </div>

          <!-- Stock Availability -->
          <div class="shrink-0">
            <template v-if="selectedVariant">
              <div v-if="selectedVariant.stock > 0" class="flex items-center gap-1.5 text-emerald-700 text-xs bg-emerald-100 font-bold py-1 px-3 rounded-full">
                <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                Còn hàng
              </div>
              <div v-else class="flex items-center gap-1.5 text-red-700 text-xs bg-red-100 font-bold py-1 px-3 rounded-full">
                <span class="w-2 h-2 rounded-full bg-red-600"></span>
                Hết hàng
              </div>
            </template>
            <template v-else>
              <div class="flex items-center gap-1.5 text-emerald-700 text-xs bg-emerald-100 font-bold py-1 px-3 rounded-full">
                <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                Sẵn sàng phục vụ
              </div>
            </template>
          </div>
        </div>

        <!-- Promotions -->
        <div class="bg-surface-container-low p-4 rounded-DEFAULT border border-outline-variant/20">
          <p class="text-label-sm font-label-sm text-on-surface font-bold mb-2">KHUYẾN MÃI</p>
          <div class="flex items-start gap-2 text-body-md font-body-md text-on-surface-variant">
            <span class="material-symbols-outlined text-[#ef972d] shrink-0 mt-0.5" style="font-variation-settings: 'FILL' 1;">redeem</span>
            <span>Giao nhanh và <strong>miễn phí vận chuyển 0đ</strong> toàn quốc cho đơn hàng từ 399.000đ</span>
          </div>
        </div>

        <!-- Color Selection -->
        <div>
          <p class="text-label-sm font-label-sm text-on-surface mb-3 uppercase font-bold">
            MÀU SẮC <span v-if="selectedColor" class="text-outline-variant font-normal">| {{ selectedColor.name }}</span>
          </p>
          <div class="flex flex-wrap gap-3">
            <button 
              v-for="color in uniqueColors"
              :key="color.name"
              @click="selectColor(color)"
              :class="selectedColor?.name === color.name ? 'border-[#ef972d] border-2 p-0.5 scale-105' : 'border-outline-variant border p-0.5 hover:border-on-surface'"
              class="w-14 h-14 rounded-full focus:outline-none transition-all overflow-hidden bg-surface"
              :title="color.name"
            >
              <img class="w-full h-full rounded-full object-cover" :src="color.image" :alt="color.name">
            </button>
          </div>
        </div>

        <!-- Size Selection -->
        <div>
          <p class="text-label-sm font-label-sm text-on-surface mb-3 uppercase font-bold">KÍCH THƯỚC</p>
          <div class="flex flex-wrap gap-3">
            <button 
              v-for="size in uniqueSizes" 
              :key="size"
              @click="selectSize(size)"
              :class="[
                selectedSize === size ? 'bg-[#ef972d] border-[#ef972d] text-white font-bold' : 'border-outline-variant text-on-surface-variant hover:border-on-surface'
              ]"
              class="border text-label-sm font-label-sm py-2 px-5 rounded-full focus:outline-none transition-all"
            >
              Size {{ size }}
            </button>
          </div>
        </div>

        <!-- Quantity -->
        <div>
          <p class="text-label-sm font-label-sm text-on-surface mb-3 uppercase font-bold">CHỌN SỐ LƯỢNG</p>
          <div class="flex items-center gap-6 flex-wrap">
            <div class="flex border border-outline-variant rounded overflow-hidden w-32 h-10 shrink-0">
              <button @click="decrementQuantity" class="w-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors focus:outline-none font-bold">-</button>
              <input 
                aria-label="quantity" 
                class="w-full text-center border-none focus:ring-0 text-body-md font-bold p-0 bg-transparent focus:outline-none" 
                type="number" 
                min="1"
                :max="selectedVariant?.stock"
                :value="quantity"
                @change="updateQuantity($event.target.value)"
                @blur="updateQuantity($event.target.value)"
              >
              <button @click="incrementQuantity" class="w-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors focus:outline-none font-bold">+</button>
            </div>
            <div class="flex flex-col gap-1">
              <a class="text-label-sm font-label-sm text-on-surface-variant hover:text-[#ef972d] transition-colors flex items-center gap-1" href="#">
                <span class="material-symbols-outlined text-sm">straighten</span>
                Hướng dẫn kích thước
              </a>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-4 mt-2 flex-wrap">
          <button @click="addToCart(false)" class="flex-1 min-w-[150px] border-2 border-[#ef972d] text-[#ef972d] bg-surface text-label-sm font-bold uppercase py-4 rounded hover:bg-[#ef972d]/10 transition-colors flex items-center justify-center gap-2 focus:outline-none">
            <span class="material-symbols-outlined text-sm">add_shopping_cart</span>
            Thêm giỏ hàng
          </button>
          <button @click="addToCart(true)" class="flex-1 min-w-[150px] bg-[#ef972d] text-white text-label-sm font-bold uppercase py-4 rounded hover:bg-[#ef972d]/90 transition-colors flex items-center justify-center gap-2 focus:outline-none shadow-sm">
            <span class="material-symbols-outlined text-sm">shopping_bag</span>
            Mua ngay
          </button>
        </div>
      </div>
    </div>

    <!-- Description & E-Commerce Spec Cards Container -->
    <div class="mt-12 space-y-6">
      <!-- Main Description Card with Expand/Collapse Toggle -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div class="border-b border-gray-100 pb-3 flex items-center justify-between">
          <h2 class="text-base md:text-lg font-bold text-[#0D2533] uppercase flex items-center gap-2">
            <span class="material-symbols-outlined text-[#ef972d]">description</span> MÔ TẢ SẢN PHẨM
          </h2>
        </div>

        <div class="relative transition-all duration-300">
          <div 
            class="text-sm leading-relaxed text-gray-700 description-content font-body-md transition-all duration-300"
            :class="isDescriptionExpanded ? '' : 'max-h-[380px] overflow-hidden relative'"
            v-html="product.moTa"
          ></div>

          <div
            v-if="!isDescriptionExpanded"
            class="absolute bottom-0 left-0 w-full h-28 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"
          ></div>
        </div>

        <div class="text-center pt-2">
          <button
            @click="toggleDescriptionExpand"
            class="inline-flex items-center gap-1.5 px-6 py-2.5 bg-gray-50 hover:bg-orange-50 text-[#ef972d] border border-orange-200 rounded-full font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span>{{ isDescriptionExpanded ? 'Thu gọn nội dung' : 'Xem thêm nội dung chi tiết' }}</span>
            <span class="material-symbols-outlined text-base">
              {{ isDescriptionExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
            </span>
          </button>
        </div>
      </div>

      <!-- E-Commerce Detailed Spec Accordions (TokyoLife / Shopee / Uniqlo Style) -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
        
        <!-- Accordion 1: Bảng Size, Hướng dẫn sử dụng & Bảo quản -->
        <div class="transition-colors">
          <button
            @click="toggleAccordion('size')"
            class="w-full p-5 text-left font-bold text-sm text-[#0D2533] flex items-center justify-between hover:bg-gray-50/80 cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-lg bg-orange-50 text-[#ef972d] flex items-center justify-center">
                <span class="material-symbols-outlined text-lg">straighten</span>
              </span>
              <span class="uppercase tracking-wide text-xs md:text-sm">BẢNG SIZE, HƯỚNG DẪN SỬ DỤNG VÀ BẢO QUẢN</span>
            </div>
            <span class="material-symbols-outlined text-gray-400 transition-transform duration-200" :class="activeAccordion === 'size' ? 'rotate-180 text-[#ef972d]' : ''">
              expand_more
            </span>
          </button>
          <div v-show="activeAccordion === 'size'" class="p-6 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-600 space-y-4 leading-relaxed">
            <div>
              <h4 class="font-bold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[#ef972d] text-base">square_foot</span>
                Gợi ý chọn Size chuẩn Bee Stylish:
              </h4>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-medium">
                <div class="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span class="block font-bold text-[#ef972d]">Size S</span>
                  <span class="text-[11px] text-gray-500">45 - 54kg | &lt; 1m65</span>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span class="block font-bold text-[#ef972d]">Size M</span>
                  <span class="text-[11px] text-gray-500">55 - 64kg | 1m65 - 1m70</span>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span class="block font-bold text-[#ef972d]">Size L</span>
                  <span class="text-[11px] text-gray-500">65 - 74kg | 1m70 - 1m75</span>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span class="block font-bold text-[#ef972d]">Size XL</span>
                  <span class="text-[11px] text-gray-500">75 - 84kg | 1m75 - 1m80</span>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span class="block font-bold text-[#ef972d]">Size XXL</span>
                  <span class="text-[11px] text-gray-500">&gt; 85kg | &gt; 1m80</span>
                </div>
              </div>
            </div>

            <div class="pt-2 border-t border-gray-200/60">
              <h4 class="font-bold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[#ef972d] text-base">local_laundry_service</span>
                Hướng dẫn bảo quản giữ màu bền lâu:
              </h4>
              <ul class="list-disc pl-5 space-y-1">
                <li>Nên giặt sản phẩm bằng tay hoặc máy giặt chế độ nhẹ với nước lạnh (dưới 30°C).</li>
                <li>Lộn trái áo khi giặt và phơi ở nơi thoáng mát, tránh ánh nắng trực tiếp gay gắt.</li>
                <li>Không sử dụng hóa chất tẩy rửa mạnh hoặc ngâm quá lâu trong nước tẩy.</li>
                <li>Ủi/Là sản phẩm ở nhiệt độ trung bình (dưới 110°C), không ủi trực tiếp lên các chi tiết in/thêu.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Accordion 2: Thành phần & Chất liệu -->
        <div class="transition-colors">
          <button
            @click="toggleAccordion('material')"
            class="w-full p-5 text-left font-bold text-sm text-[#0D2533] flex items-center justify-between hover:bg-gray-50/80 cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-lg bg-orange-50 text-[#ef972d] flex items-center justify-center">
                <span class="material-symbols-outlined text-lg">texture</span>
              </span>
              <span class="uppercase tracking-wide text-xs md:text-sm">THÀNH PHẦN, CHẤT LIỆU CAO CẤP</span>
            </div>
            <span class="material-symbols-outlined text-gray-400 transition-transform duration-200" :class="activeAccordion === 'material' ? 'rotate-180 text-[#ef972d]' : ''">
              expand_more
            </span>
          </button>
          <div v-show="activeAccordion === 'material'" class="p-6 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-600 space-y-3 leading-relaxed">
            <p class="font-semibold text-gray-800">
              Sản phẩm được chế tác từ dòng vải cao cấp Bee Stylish độc quyền, đảm bảo độ thoáng mát & bền bỉ vượt trội.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div class="bg-white p-3 rounded-xl border border-gray-200 flex items-start gap-2.5">
                <span class="material-symbols-outlined text-[#ef972d] text-lg">air</span>
                <div>
                  <span class="font-bold text-gray-800 block text-xs">Thoáng khí cực tốt</span>
                  <span class="text-[11px] text-gray-500">Thấm hút mồ hôi nhanh chóng, giữ cơ thể luôn khô ráo.</span>
                </div>
              </div>
              <div class="bg-white p-3 rounded-xl border border-gray-200 flex items-start gap-2.5">
                <span class="material-symbols-outlined text-[#ef972d] text-lg">fit_screen</span>
                <div>
                  <span class="font-bold text-gray-800 block text-xs">Co giãn linh hoạt</span>
                  <span class="text-[11px] text-gray-500">Sợi vải đàn hồi giúp thoải mái vận động suốt ngày dài.</span>
                </div>
              </div>
              <div class="bg-white p-3 rounded-xl border border-gray-200 flex items-start gap-2.5">
                <span class="material-symbols-outlined text-[#ef972d] text-lg">palette</span>
                <div>
                  <span class="font-bold text-gray-800 block text-xs">Bền màu & Chống nhăn</span>
                  <span class="text-[11px] text-gray-500">Công nghệ nhuộm an toàn, giữ màu tươi mới sau nhiều lần giặt.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Accordion 3: Chính sách đổi trả & Bảo hành -->
        <div class="transition-colors">
          <button
            @click="toggleAccordion('policy')"
            class="w-full p-5 text-left font-bold text-sm text-[#0D2533] flex items-center justify-between hover:bg-gray-50/80 cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-lg bg-orange-50 text-[#ef972d] flex items-center justify-center">
                <span class="material-symbols-outlined text-lg">verified_user</span>
              </span>
              <span class="uppercase tracking-wide text-xs md:text-sm">CHÍNH SÁCH ĐỔI TRẢ & BẢO HÀNH CAM KẾT</span>
            </div>
            <span class="material-symbols-outlined text-gray-400 transition-transform duration-200" :class="activeAccordion === 'policy' ? 'rotate-180 text-[#ef972d]' : ''">
              expand_more
            </span>
          </button>
          <div v-show="activeAccordion === 'policy'" class="p-6 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-600 space-y-3 leading-relaxed">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="bg-white p-3.5 rounded-xl border border-gray-200 space-y-1">
                <div class="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span class="material-symbols-outlined text-emerald-600 text-base">published_with_changes</span>
                  Đổi trả trong 7 ngày
                </div>
                <p class="text-[11px] text-gray-500">Miễn phí đổi sản phẩm trong 7 ngày nếu lỗi từ nhà sản xuất hoặc không vừa size.</p>
              </div>
              <div class="bg-white p-3.5 rounded-xl border border-gray-200 space-y-1">
                <div class="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span class="material-symbols-outlined text-emerald-600 text-base">local_shipping</span>
                  Kiểm tra khi nhận hàng
                </div>
                <p class="text-[11px] text-gray-500">Khách hàng được quyền kiểm tra sản phẩm trước khi thanh toán cho nhân viên giao hàng.</p>
              </div>
              <div class="bg-white p-3.5 rounded-xl border border-gray-200 space-y-1">
                <div class="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span class="material-symbols-outlined text-emerald-600 text-base">support_agent</span>
                  Hỗ trợ 24/7
                </div>
                <p class="text-[11px] text-gray-500">Đội ngũ CSKH sẵn sàng giải đáp thắc mắc và hỗ trợ xử lý mọi đơn hàng nhanh chóng.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Related Products Grid ("SẢN PHẨM TƯƠNG TỰ HOT NHẤT HÔM NAY") -->
      <div v-if="relatedProducts.length > 0" class="mt-12 space-y-6">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#ef972d] text-2xl">local_fire_department</span>
            <h2 class="text-base md:text-lg font-bold text-[#0D2533] uppercase">SẢN PHẨM TƯƠNG TỰ HOT NHẤT</h2>
          </div>
          <RouterLink to="/" class="text-xs font-bold text-[#ef972d] hover:underline flex items-center gap-0.5">
            Xem tất cả <span class="material-symbols-outlined text-sm">chevron_right</span>
          </RouterLink>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <RouterLink
            v-for="item in relatedProducts"
            :key="item.id"
            :to="`/product/${item.id}`"
            class="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div class="aspect-square rounded-xl overflow-hidden bg-gray-50 relative mb-3 border border-gray-50">
                <img :src="item.image" :alt="item.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <span class="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
                  HOT
                </span>
              </div>
              <h3 class="font-bold text-xs text-gray-800 line-clamp-2 group-hover:text-[#ef972d] transition-colors leading-snug">
                {{ item.name }}
              </h3>
            </div>

            <div class="mt-3 pt-2 border-t border-gray-50 flex items-baseline justify-between">
              <span class="text-sm font-black text-[#ef972d]">{{ formatCurrency(item.price) }}</span>
              <span class="text-[10px] text-gray-400 line-through font-medium">{{ formatCurrency(item.originalPrice) }}</span>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Beautiful Toast Notification Popup (Replaces Browser Alert) -->
    <Transition
      enter-active-class="transform transition-all duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="toast.show" 
        class="fixed top-24 right-4 md:right-8 z-[9999] w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 transition-all flex flex-col gap-3"
        :class="[
          toast.type === 'success' ? 'border-[#EF972D] shadow-[#EF972D]/15' : '',
          toast.type === 'warning' ? 'border-amber-500 shadow-amber-500/15' : '',
          toast.type === 'error' ? 'border-red-500 shadow-red-500/15' : ''
        ]"
      >
        <div class="flex items-start gap-3">
          <!-- Icon / Thumbnail -->
          <div v-if="toast.productInfo" class="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200 shadow-sm">
            <img :src="toast.productInfo.image" :alt="toast.productInfo.name" class="w-full h-full object-cover" />
          </div>
          <div 
            v-else 
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold"
            :class="[
              toast.type === 'success' ? 'bg-[#EF972D]' : '',
              toast.type === 'warning' ? 'bg-amber-500' : '',
              toast.type === 'error' ? 'bg-red-500' : ''
            ]"
          >
            <span class="material-symbols-outlined text-2xl">
              {{ toast.type === 'success' ? 'shopping_bag' : toast.type === 'warning' ? 'warning' : 'error' }}
            </span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span 
                class="text-xs font-black uppercase tracking-wider block"
                :class="[
                  toast.type === 'success' ? 'text-[#EF972D]' : '',
                  toast.type === 'warning' ? 'text-amber-600' : '',
                  toast.type === 'error' ? 'text-red-600' : ''
                ]"
              >
                {{ toast.title }}
              </span>
              <button @click="toast.show = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
                <span class="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <p class="text-xs font-bold text-gray-800 mt-0.5 leading-snug line-clamp-2">
              {{ toast.message }}
            </p>
          </div>
        </div>

        <!-- Action Buttons for Cart Add -->
        <div v-if="toast.type === 'success'" class="flex gap-2 pt-2 border-t border-gray-100">
          <RouterLink 
            to="/cart" 
            @click="toast.show = false"
            class="flex-1 py-2 bg-[#EF972D] hover:bg-[#d87f1d] text-white text-center font-bold text-xs uppercase rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span class="material-symbols-outlined text-sm">shopping_cart</span>
            XEM GIỎ HÀNG
          </RouterLink>
          <button 
            @click="toast.show = false" 
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
          >
            TIẾP TỤC MUA
          </button>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
:deep(.description-content img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  margin: 16px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
:deep(.description-content p) {
  margin-bottom: 12px;
}
:deep(.description-content ul) {
  list-style-type: disc;
  padding-left: 20px;
  margin-bottom: 12px;
}
:deep(.description-content ol) {
  list-style-type: decimal;
  padding-left: 20px;
  margin-bottom: 12px;
}
:deep(.description-content h1),
:deep(.description-content h2),
:deep(.description-content h3),
:deep(.description-content h4) {
  font-weight: 700;
  color: #0D2533;
  margin-top: 16px;
  margin-bottom: 8px;
}
</style>
