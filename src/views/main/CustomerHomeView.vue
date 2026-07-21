<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../../services/api'
import { formatCurrency } from '@/utils/format'

const products = ref([])
const isLoading = ref(false)
const activeTab = ref('all')

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
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const fetchProducts = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/api/v1/san-pham', {
      params: {
        trangThai: 1,
        size: 100
      }
    })
    const data = res.data?.content || res.data?.data || res.data || []
    if (Array.isArray(data)) {
      products.value = data.map(item => ({
        id: item.id,
        code: item.maSanPham || '',
        name: sanitizeVietnamese(item.tenSanPham || ''),
        brand: sanitizeVietnamese(item.tenThuongHieu || ''),
        material: sanitizeVietnamese(item.tenChatLieu || ''),
        image: formatImage(item.hinhAnh),
        priceMin: item.giaThapNhat ?? 199000,
        priceMax: item.giaCaoNhat ?? 199000,
        discountedMin: item.giaThapNhatSauGiam ?? item.giaThapNhat ?? 199000,
        discountedMax: item.giaCaoNhatSauGiam ?? item.giaCaoNhat ?? 199000,
        maxDiscountPercent: item.maxPhanTramGiam ?? 0,
        soLuongDaBan: item.soLuongDaBan ?? 0
      }))
    }
  } catch (err) {
    console.error('Failed to fetch products on homepage:', err)
  } finally {
    isLoading.value = false
  }
}

// 1. Sản phẩm Ưu đãi (Giảm giá tốt nhất - Tự động lấp đầy ô trống)
const discountedProducts = computed(() => {
  const withDiscount = products.value.filter(p => p.maxDiscountPercent > 0)
  const sorted = [...withDiscount].sort((a, b) => b.maxDiscountPercent - a.maxDiscountPercent)
  if (sorted.length >= 4) {
    return sorted.slice(0, 8)
  }
  const remaining = products.value.filter(p => !sorted.some(s => s.id === p.id))
  return [...sorted, ...remaining].slice(0, 8)
})

// 2. Sản phẩm Bán chạy nhất (Top Sellers - Tự động lấp đầy ô trống)
const bestSellerProducts = computed(() => {
  const withSales = products.value.filter(p => p.soLuongDaBan > 0)
  const sorted = [...withSales].sort((a, b) => b.soLuongDaBan - a.soLuongDaBan)
  if (sorted.length >= 4) {
    return sorted.slice(0, 8)
  }
  const remaining = products.value.filter(p => !sorted.some(s => s.id === p.id))
  return [...sorted, ...remaining].slice(0, 8)
})

// 3. Sản phẩm Mới về
const newArrivalProducts = computed(() => {
  return [...products.value]
    .sort((a, b) => b.id - a.id)
    .slice(0, 8)
})

// Tab active products
const tabProducts = computed(() => {
  if (activeTab.value === 'banchay') return bestSellerProducts.value
  if (activeTab.value === 'moive') return newArrivalProducts.value
  if (activeTab.value === 'uudai') return discountedProducts.value
  return products.value.slice(0, 10)
})

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <main class="w-full bg-[#FAF9F6] text-gray-800 pb-20">
    <!-- 1. Hero Banner Slider -->
    <section class="relative bg-gradient-to-r from-[#0D2533] via-[#1E3A8A] to-[#0D2533] text-white overflow-hidden py-16 md:py-24 px-4 md:px-10 shadow-xl">
      <div class="absolute inset-0 bg-cover bg-center opacity-15" style="background-image: url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80')"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#EF972D]/30 via-transparent to-transparent"></div>

      <div class="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <!-- Hero Left Text -->
        <div class="lg:col-span-7 space-y-5 text-center lg:text-left">
          <div class="inline-flex items-center gap-2 bg-[#EF972D] text-white px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-md">
            <span class="material-symbols-outlined text-sm">wb_sunny</span>
            BỘ SƯU TẬP THỜI TRANG HÈ 2026
          </div>

          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-tight">
            PHONG CÁCH NAM HÈ <br />
            <span class="text-[#EF972D]">TỐI GIẢN & TINH TẾ</span>
          </h1>

          <p class="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
            Khám phá dòng sản phẩm áo Polo, T-Shirt, Sơ mi đũi công nghệ thoáng nhiệt cao cấp. Thiết kế hiện đại chuẩn form nam Việt.
          </p>

          <div class="pt-2 flex flex-wrap gap-4 justify-center lg:justify-start">
            <RouterLink 
              to="/all-products" 
              class="px-8 py-3.5 bg-[#EF972D] hover:bg-[#d87f1d] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              KHAM PHÁ NGAY
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </RouterLink>
            <RouterLink 
              to="/uu-dai" 
              class="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 font-bold text-xs uppercase tracking-widest rounded-xl transition-all backdrop-blur-sm flex items-center gap-2"
            >
              <span class="material-symbols-outlined text-sm text-[#EF972D]">local_offer</span>
              SĂN VOUCHER ƯU ĐÃI
            </RouterLink>
          </div>
        </div>

        <!-- Hero Right Banner Showcase Card -->
        <div class="lg:col-span-5 hidden lg:block">
          <div class="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white/10 backdrop-blur-md p-3 group">
            <div class="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-900 relative">
              <img 
                src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80" 
                alt="Bee Stylish Summer Collection" 
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-[#0D2533]/90 via-transparent to-transparent"></div>
              <div class="absolute bottom-5 left-5 right-5 text-white space-y-1">
                <span class="text-xs font-bold uppercase tracking-wider text-[#EF972D]">BEE STYLISH PREMIUM</span>
                <h3 class="text-lg font-black uppercase">Áo Polo Nam Hè Cao Cấp</h3>
                <p class="text-xs text-gray-300">Co giãn 4 chiều • Thấm hút vượt trội</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Brand Value Props Bar (Cam kết thương hiệu) -->
    <section class="bg-white border-b border-gray-200 py-6 px-4 md:px-6 shadow-sm">
      <div class="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
        <div class="flex items-center gap-3 justify-center md:justify-start">
          <div class="w-11 h-11 rounded-2xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-2xl">local_shipping</span>
          </div>
          <div>
            <h4 class="text-xs font-extrabold uppercase text-gray-900">GIAO HÀNG TOÀN QUỐC</h4>
            <p class="text-[11px] text-gray-500">Miễn phí cho đơn từ 499k</p>
          </div>
        </div>

        <div class="flex items-center gap-3 justify-center md:justify-start">
          <div class="w-11 h-11 rounded-2xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-2xl">published_with_changes</span>
          </div>
          <div>
            <h4 class="text-xs font-extrabold uppercase text-gray-900">30 NGÀY ĐỔI TRẢ</h4>
            <p class="text-[11px] text-gray-500">Đổi size tận nhà miễn phí</p>
          </div>
        </div>

        <div class="flex items-center gap-3 justify-center md:justify-start">
          <div class="w-11 h-11 rounded-2xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-2xl">payments</span>
          </div>
          <div>
            <h4 class="text-xs font-extrabold uppercase text-gray-900">THANH TOÁN COD / VNPAY</h4>
            <p class="text-[11px] text-gray-500">Kiểm tra hàng trước khi nhận</p>
          </div>
        </div>

        <div class="flex items-center gap-3 justify-center md:justify-start">
          <div class="w-11 h-11 rounded-2xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-2xl">verified</span>
          </div>
          <div>
            <h4 class="text-xs font-extrabold uppercase text-gray-900">100% HÀNG CHÍNH HÃNG</h4>
            <p class="text-[11px] text-gray-500">Chất liệu cao cấp chọn lọc</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Collection Quick Cards (HÔM NAY MUA GÌ) -->
    <section class="max-w-6xl mx-auto px-4 md:px-6 pt-12">
      <div class="text-center mb-8">
        <span class="text-xs font-extrabold uppercase tracking-widest text-[#EF972D]">DANH MỤC NỔI BẬT</span>
        <h2 class="text-2xl md:text-3xl font-black uppercase text-gray-900 tracking-tight mt-1">HÔM NAY MUA GÌ?</h2>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <RouterLink to="/all-products" class="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md bg-gray-900">
          <img src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&q=80" alt="Áo Polo Nam" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end">
            <span class="text-[10px] font-extrabold text-[#EF972D] uppercase tracking-wider">THỜI TRANG HÈ</span>
            <h3 class="text-sm font-black text-white uppercase group-hover:text-[#EF972D] transition-colors">ÁO POLO NAM HÈ</h3>
          </div>
        </RouterLink>

        <RouterLink to="/all-products" class="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md bg-gray-900">
          <img src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80" alt="Áo T-Shirt Phông" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end">
            <span class="text-[10px] font-extrabold text-[#EF972D] uppercase tracking-wider">COTTON THOÁNG MÁT</span>
            <h3 class="text-sm font-black text-white uppercase group-hover:text-[#EF972D] transition-colors">ÁO T-SHIRT / PHÔNG</h3>
          </div>
        </RouterLink>

        <RouterLink to="/all-products" class="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md bg-gray-900">
          <img src="https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&q=80" alt="Áo Sơ Mi Đũi" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end">
            <span class="text-[10px] font-extrabold text-[#EF972D] uppercase tracking-wider">LỊCH LÃM NĂNG ĐỘNG</span>
            <h3 class="text-sm font-black text-white uppercase group-hover:text-[#EF972D] transition-colors">ÁO SƠ MI ĐŨI HÈ</h3>
          </div>
        </RouterLink>

        <RouterLink to="/uu-dai" class="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md bg-red-900">
          <img src="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500&q=80" alt="Ưu đãi Hot" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-75" />
          <div class="absolute inset-0 bg-gradient-to-t from-red-950/90 via-red-900/40 to-transparent p-4 flex flex-col justify-end">
            <span class="text-[10px] font-extrabold text-yellow-300 uppercase tracking-wider">SPECIAL OFFERS</span>
            <h3 class="text-sm font-black text-white uppercase group-hover:text-yellow-300 transition-colors">VOUCHER & ƯU ĐÃI</h3>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- 4. SECTION: SẢN PHẨM BÁN CHẠY NHẤT (BEST SELLERS) -->
    <section id="ban-chay" class="max-w-6xl mx-auto px-4 md:px-6 pt-16">
      <div class="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[#EF972D] flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">workspace_premium</span>
            TOP RATING & POPULARITY
          </span>
          <h2 class="text-xl md:text-2xl font-black uppercase text-gray-900 tracking-tight flex items-center gap-2">
            SẢN PHẨM BÁN CHẠY NHẤT
            <span class="bg-[#EF972D] text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase shadow-sm">HOT SELLER</span>
          </h2>
        </div>
        <RouterLink to="/all-products?filter=ban-chay" class="text-xs font-extrabold text-[#EF972D] hover:underline uppercase flex items-center gap-1">
          Xem tất cả <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- Loading skeleton -->
      <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        <div v-for="i in 4" :key="i" class="animate-pulse bg-gray-200 aspect-[3/4] rounded-2xl"></div>
      </div>

      <!-- Balanced Products Grid (Always fills full row) -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        <RouterLink 
          v-for="(p, idx) in bestSellerProducts" 
          :key="'b-' + p.id" 
          :to="`/product/${p.id}`"
          class="flex flex-col bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
        >
          <!-- Image -->
          <div class="relative overflow-hidden bg-gray-50 aspect-square">
            <div class="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10">
              #{{ idx + 1 }} BESTSELLER
            </div>
            <div v-if="p.maxDiscountPercent > 0" class="absolute top-2.5 right-2.5 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10">
              -{{ p.maxDiscountPercent }}%
            </div>
            <img 
              :src="p.image" 
              :alt="p.name" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <!-- Info Area -->
          <div class="p-4 flex flex-col justify-between flex-1 space-y-3">
            <div>
              <div class="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                <span>{{ p.brand || 'BEE STYLISH' }}</span>
                <span v-if="p.soLuongDaBan > 0" class="text-emerald-600 font-extrabold">Đã bán {{ p.soLuongDaBan }}</span>
              </div>
              <h3 class="font-bold text-sm text-gray-900 group-hover:text-[#EF972D] line-clamp-2 transition-colors">
                {{ p.name }}
              </h3>
            </div>

            <!-- Price -->
            <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span class="text-base font-extrabold text-[#EF972D] block">{{ formatCurrency(p.discountedMin) }}</span>
                <span v-if="p.maxDiscountPercent > 0 && p.priceMin > p.discountedMin" class="text-xs text-gray-400 line-through">
                  {{ formatCurrency(p.priceMin) }}
                </span>
              </div>
              <div class="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#EF972D] group-hover:text-white flex items-center justify-center text-gray-600 transition-colors">
                <span class="material-symbols-outlined text-base">visibility</span>
              </div>
            </div>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- 5. PROMO CAMPAIGN MIDDLE BANNER -->
    <section class="max-w-6xl mx-auto px-4 md:px-6 pt-16">
      <div class="relative bg-gradient-to-r from-[#0D2533] via-[#1E3A8A] to-[#0D2533] text-white rounded-3xl p-8 md:p-12 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="space-y-3 max-w-xl text-center md:text-left">
          <span class="inline-block bg-[#EF972D] text-white text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-md">
            MÃ GIẢM GIÁ MÙA HÈ
          </span>
          <h2 class="text-2xl md:text-4xl font-black uppercase tracking-tight">
            NHẬN NGAY VOUCHER GIẢM TỚI 200.000đ
          </h2>
          <p class="text-gray-300 text-xs md:text-sm leading-relaxed">
            Áp dụng cho toàn bộ đơn hàng thời trang nam khi thanh toán online trên hệ thống Bee Stylish!
          </p>
        </div>
        <RouterLink 
          to="/uu-dai" 
          class="shrink-0 px-8 py-3.5 bg-[#EF972D] hover:bg-[#d87f1d] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
        >
          <span class="material-symbols-outlined text-base">confirmation_number</span>
          NHẬN VOUCHER NGAY
        </RouterLink>
      </div>
    </section>

    <!-- 6. SECTION: SẢN PHẨM MỚI VỀ (NEW ARRIVALS) -->
    <section id="moi-ve" class="max-w-6xl mx-auto px-4 md:px-6 pt-16">
      <div class="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">auto_awesome</span>
            NEW ARRIVALS
          </span>
          <h2 class="text-xl md:text-2xl font-black uppercase text-gray-900 tracking-tight flex items-center gap-2">
            SẢN PHẨM MỚI VỀ
            <span class="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase shadow-sm">NEW</span>
          </h2>
        </div>
        <RouterLink to="/moi-ve" class="text-xs font-extrabold text-emerald-600 hover:underline uppercase flex items-center gap-1">
          Xem tất cả hàng mới <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- Balanced Products Grid (Always fills full row) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        <RouterLink 
          v-for="p in newArrivalProducts" 
          :key="'n-' + p.id" 
          :to="`/product/${p.id}`"
          class="flex flex-col bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
        >
          <!-- Image -->
          <div class="relative overflow-hidden bg-gray-50 aspect-square">
            <div class="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-10">
              MỚI VỀ
            </div>
            <img 
              :src="p.image" 
              :alt="p.name" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <!-- Info Area -->
          <div class="p-4 flex flex-col justify-between flex-1 space-y-3">
            <div>
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{{ p.brand || 'BEE STYLISH' }}</span>
              <h3 class="font-bold text-sm text-gray-900 group-hover:text-emerald-600 line-clamp-2 transition-colors">
                {{ p.name }}
              </h3>
            </div>

            <!-- Price -->
            <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span class="text-base font-extrabold text-[#EF972D] block">{{ formatCurrency(p.discountedMin) }}</span>
                <span v-if="p.maxDiscountPercent > 0 && p.priceMin > p.discountedMin" class="text-xs text-gray-400 line-through">
                  {{ formatCurrency(p.priceMin) }}
                </span>
              </div>
              <div class="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-gray-600 transition-colors">
                <span class="material-symbols-outlined text-base">visibility</span>
              </div>
            </div>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- 7. SECTION: KHÁM PHÁ THEO TABS INTERACTIVE -->
    <section class="max-w-6xl mx-auto px-4 md:px-6 pt-16">
      <div class="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm">
        <div class="text-center mb-8">
          <h2 class="text-xl md:text-3xl font-black uppercase text-gray-900 tracking-tight">KHÁM PHÁ TOÀN BỘ BỘ SƯU TẬP</h2>
          
          <!-- Filter Tabs -->
          <div class="flex flex-wrap justify-center gap-2 mt-4">
            <button 
              @click="activeTab = 'all'" 
              class="px-5 py-2 rounded-full text-xs font-bold uppercase transition-all"
              :class="activeTab === 'all' ? 'bg-[#EF972D] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              Tất Cả Sản Phẩm
            </button>
            <button 
              @click="activeTab = 'banchay'" 
              class="px-5 py-2 rounded-full text-xs font-bold uppercase transition-all"
              :class="activeTab === 'banchay' ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              Bán Chạy
            </button>
            <button 
              @click="activeTab = 'moive'" 
              class="px-5 py-2 rounded-full text-xs font-bold uppercase transition-all"
              :class="activeTab === 'moive' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              Mới Về
            </button>
            <button 
              @click="activeTab = 'uudai'" 
              class="px-5 py-2 rounded-full text-xs font-bold uppercase transition-all"
              :class="activeTab === 'uudai' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              Ưu Đãi Hot
            </button>
          </div>
        </div>

        <!-- Products Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <RouterLink 
            v-for="p in tabProducts" 
            :key="'t-' + p.id" 
            :to="`/product/${p.id}`"
            class="flex flex-col bg-gray-50 hover:bg-white rounded-2xl border border-gray-150 p-2.5 hover:shadow-lg transition-all group"
          >
            <div class="relative aspect-square rounded-xl overflow-hidden mb-2 bg-gray-100">
              <div v-if="p.maxDiscountPercent > 0" class="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10">
                -{{ p.maxDiscountPercent }}%
              </div>
              <img :src="p.image" :alt="p.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div class="space-y-1">
              <h4 class="text-xs font-bold text-gray-900 group-hover:text-[#EF972D] line-clamp-2 transition-colors">
                {{ p.name }}
              </h4>
              <div class="flex items-center gap-1.5 flex-wrap pt-1">
                <span class="text-xs font-extrabold text-[#EF972D]">{{ formatCurrency(p.discountedMin) }}</span>
                <span v-if="p.maxDiscountPercent > 0 && p.priceMin > p.discountedMin" class="text-[10px] text-gray-400 line-through">
                  {{ formatCurrency(p.priceMin) }}
                </span>
              </div>
            </div>
          </RouterLink>
        </div>

        <div class="text-center mt-8">
          <RouterLink 
            to="/all-products" 
            class="inline-flex items-center gap-2 px-8 py-3 bg-[#EF972D] hover:bg-[#d87f1d] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md"
          >
            XEM TẤT CẢ SẢN PHẨM DỰ ÁN
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
