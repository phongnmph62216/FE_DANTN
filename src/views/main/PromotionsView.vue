<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../../services/api'
import { formatCurrency } from '@/utils/format'
import { useCartStore } from '@/stores/cart'

const cartStore = useCartStore()
const products = ref([])
const isLoading = ref(true)
const copiedCode = ref('')

const vouchers = ref([])
const isVouchersLoading = ref(true)

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
  } catch (e) {
    return dateStr
  }
}

const activeCampaign = ref(null)
const countdown = ref({ days: '00', hours: '00', mins: '00' })
let timerInterval = null

const updateCountdown = () => {
  if (!activeCampaign.value || !activeCampaign.value.ngayKetThuc) {
    countdown.value = { days: '00', hours: '00', mins: '00' }
    return
  }
  const end = new Date(activeCampaign.value.ngayKetThuc).getTime()
  const now = new Date().getTime()
  const diff = end - now

  if (diff <= 0) {
    countdown.value = { days: '00', hours: '00', mins: '00' }
    return
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  countdown.value = {
    days: d < 10 ? `0${d}` : `${d}`,
    hours: h < 10 ? `0${h}` : `${h}`,
    mins: m < 10 ? `0${m}` : `${m}`
  }
}

const loadActiveCampaign = async () => {
  try {
    const res = await api.get('/api/v1/dot-giam-gia', {
      params: { page: 0, size: 50 }
    })
    const data = res.data?.content || res.data?.data || res.data || []
    if (Array.isArray(data)) {
      const now = new Date()
      // Filter for campaign that is CURRENTLY ACTIVE RIGHT NOW (now >= start && now <= end)
      const active = data.find(item => {
        if (item.trangThai !== 1) return false
        const start = new Date(item.ngayBatDau)
        const end = new Date(item.ngayKetThuc)
        return now >= start && now <= end
      })
      if (active) {
        activeCampaign.value = active
        updateCountdown()
        if (timerInterval) clearInterval(timerInterval)
        timerInterval = setInterval(updateCountdown, 60000)
      } else {
        activeCampaign.value = null
      }
    }
  } catch (err) {
    console.error('Failed to load active discount campaign from BE:', err)
  }
}

const loadVouchers = async () => {
  isVouchersLoading.value = true
  try {
    const res = await api.get('/api/v1/phieu-giam-gia', {
      params: { trangThai: 1, page: 0, size: 50 }
    })
    const data = res.data?.content || res.data?.data || res.data || []
    if (Array.isArray(data)) {
      // Filter ONLY active vouchers (trangThai === 1) AND public store-wide vouchers (kieuApDung === 0)
      vouchers.value = data.filter(item => {
        const isActive = item.trangThai === 1 || item.trangThai === undefined
        const isPublicStoreWide = Number(item.kieuApDung) === 0
        return isActive && isPublicStoreWide
      })
    }
  } catch (err) {
    console.error('Failed to load active public vouchers from BE:', err)
  } finally {
    isVouchersLoading.value = false
  }
}

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
  if (!url) return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) return url
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const copyVoucher = (code) => {
  if (!code) return
  navigator.clipboard.writeText(code)
  copiedCode.value = code
  setTimeout(() => {
    copiedCode.value = ''
  }, 2500)
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
        tenSanPham: sanitizeVietnamese(item.tenSanPham || ''),
        tenThuongHieu: sanitizeVietnamese(item.tenThuongHieu || ''),
        tenChatLieu: sanitizeVietnamese(item.tenChatLieu || ''),
        hinhAnhMain: item.hinhAnh,
        giaBan: item.giaThapNhatSauGiam || item.giaThapNhat || 199000,
        giaGoc: item.giaThapNhat || 199000,
        phanTramGiam: item.maxPhanTramGiam || 0
      }))
    }
  } catch (err) {
    console.error('Failed to load promotion products:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadActiveCampaign()
  loadVouchers()
  loadProducts()
})
</script>

<template>
  <div class="min-h-screen bg-[#FDF8F3] text-gray-800 pb-20">
    <!-- Summer Hero Banner -->
    <div class="relative bg-gradient-to-r from-[#0D2533] via-[#1E3A8A] to-[#0D2533] text-white py-14 px-4 md:px-10 overflow-hidden shadow-xl">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#EF972D]/30 via-transparent to-transparent"></div>
      
      <div class="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="space-y-4 text-center md:text-left max-w-xl">
          <div class="inline-flex items-center gap-2 bg-[#EF972D] text-white px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
            <span class="material-symbols-outlined text-sm">local_fire_department</span>
            {{ activeCampaign ? activeCampaign.tenDotGiamGia : 'CHƯƠNG TRÌNH KHUYẾN MÃI HỆ THỐNG' }}
          </div>
          <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight uppercase font-sans">
            <span class="text-[#EF972D]">{{ activeCampaign ? activeCampaign.tenDotGiamGia : 'ƯU ĐÃI THỜI TRANG NAM' }}</span>
          </h1>
          <p class="text-gray-300 text-sm md:text-base leading-relaxed">
            <span v-if="activeCampaign">
              Giảm giá cực sốc lên tới <strong class="text-[#EF972D] text-lg">{{ activeCampaign.phanTramGiam }}%</strong> áp dụng trực tiếp cho các sản phẩm thời trang trong chương trình này!
            </span>
            <span v-else>
              Săn ngay các mã phiếu giảm giá công khai và cập nhật ưu đãi mới nhất tại hệ thống Bee Stylish!
            </span>
          </p>
          <div class="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
            <a href="#vouchers" class="px-6 py-3 bg-[#EF972D] hover:bg-[#d87f1d] text-white font-bold text-xs uppercase rounded-xl transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">confirmation_number</span>
              SĂN VOUCHER NGAY
            </a>
            <a href="#flash-sale" class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs uppercase rounded-xl transition-all backdrop-blur-sm inline-flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">shopping_bag</span>
              XEM SẢN PHẨM KHUYẾN MÃI
            </a>
          </div>
        </div>

        <!-- Right Promotion Info Box (Loaded from BE) -->
        <div v-if="activeCampaign" class="relative shrink-0 w-full md:w-80 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl space-y-3.5">
          <div class="flex items-center justify-between border-b border-white/15 pb-2">
            <span class="text-xs uppercase tracking-widest text-[#EF972D] font-bold">THÔNG TIN ĐỢT GIẢM</span>
            <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">ĐANG ĐIỄN RA</span>
          </div>

          <div class="space-y-1.5 text-left">
            <div class="text-xs text-gray-300 font-medium">Tên đợt ưu đãi:</div>
            <div class="text-sm font-bold text-white uppercase line-clamp-1" :title="activeCampaign.tenDotGiamGia">
              {{ activeCampaign.tenDotGiamGia }}
            </div>
          </div>

          <div class="space-y-1 text-left">
            <div class="text-xs text-gray-300 font-medium">Mức giảm áp dụng:</div>
            <div class="text-xl font-extrabold text-[#EF972D]">
              Giảm {{ activeCampaign.phanTramGiam }}%
            </div>
          </div>

          <div class="pt-2 border-t border-white/15 text-xs text-gray-300 space-y-1 text-left">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm text-[#EF972D]">calendar_today</span>
              <span>Thời gian: <strong class="text-white">{{ formatDate(activeCampaign.ngayBatDau) }}</strong> - <strong class="text-white">{{ formatDate(activeCampaign.ngayKetThuc) }}</strong></span>
            </div>
          </div>

          <div class="text-[11px] text-gray-300 italic pt-1 text-center border-t border-white/10">
            Áp dụng cho các sản phẩm trong đợt giảm giá
          </div>
        </div>
      </div>
    </div>

    <!-- Voucher Codes Section -->
    <div id="vouchers" class="max-w-6xl mx-auto px-4 md:px-6 pt-12">
      <div class="text-center space-y-2 mb-8">
        <span class="text-[#EF972D] font-bold text-xs uppercase tracking-widest">MÃ GIẢM GIÁ ĐẶC QUYỀN</span>
        <h2 class="text-2xl md:text-3xl font-extrabold text-gray-900 uppercase">VOUCHER TẶNG BẠN MÙA HÈ</h2>
        <div class="w-16 h-1 bg-[#EF972D] mx-auto rounded-full"></div>
      </div>

      <!-- Loading Vouchers Spinner -->
      <div v-if="isVouchersLoading" class="py-10 text-center text-gray-400">
        <span class="material-symbols-outlined animate-spin text-2xl mb-1 text-[#EF972D]">progress_activity</span>
        <p class="text-xs font-medium">Đang tải danh sách phiếu giảm giá từ hệ thống...</p>
      </div>

      <!-- Vouchers Grid from BE -->
      <div v-else-if="vouchers.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          v-for="v in vouchers" 
          :key="v.id || v.maPhieuGiamGia" 
          class="bg-white border-2 border-dashed border-[#EF972D]/40 hover:border-[#EF972D] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
        >
          <div class="absolute -right-6 -top-6 bg-[#EF972D] text-white text-[10px] font-bold px-8 py-1 rotate-45 shadow-sm uppercase">
            TOÀN SHOP
          </div>
          <div class="space-y-2">
            <div class="text-[#EF972D] font-extrabold text-base uppercase flex items-center gap-1.5 line-clamp-1" :title="v.tenPhieuGiamGia">
              <span class="material-symbols-outlined text-lg shrink-0">confirmation_number</span>
              {{ v.loaiGiam === 0 ? `GIẢM ${v.giaTri}%` : `GIẢM ${formatCurrency(v.giaTri)}` }}
            </div>
            <p class="text-xs font-bold text-gray-800 line-clamp-1">{{ v.tenPhieuGiamGia || 'Phiếu giảm giá' }}</p>
            <p class="text-[11px] text-gray-600 font-medium">
              Đơn tối thiểu: <span class="font-bold text-gray-800">{{ formatCurrency(v.dieuKienGiam || 0) }}</span>
            </p>
            <p v-if="v.loaiGiam === 0 && v.giaGiamToiDa" class="text-[11px] text-gray-500">
              Giảm tối đa: {{ formatCurrency(v.giaGiamToiDa) }}
            </p>
            <p class="text-[11px] text-gray-400">
              HSD: {{ formatDate(v.ngayKetThuc) || 'Đang áp dụng' }}
            </p>
          </div>
          <div class="pt-4 flex items-center justify-between border-t border-gray-100 mt-4">
            <code class="bg-gray-100 text-[#EF972D] px-2.5 py-1 rounded font-mono font-extrabold text-xs border border-gray-200 tracking-wider">
              {{ v.maPhieuGiamGia }}
            </code>
            <button 
              @click="copyVoucher(v.maPhieuGiamGia)"
              class="px-3 py-1.5 bg-[#EF972D] hover:bg-[#d87f1d] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {{ copiedCode === v.maPhieuGiamGia ? 'ĐÃ CHÉP!' : 'LẤY MÃ' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-10 text-center bg-white rounded-2xl border border-gray-150 p-6">
        <span class="material-symbols-outlined text-3xl text-gray-300 mb-1">style</span>
        <p class="text-xs font-bold text-gray-600">Hiện tại chưa có phiếu giảm giá nào đang diễn ra.</p>
      </div>
    </div>

    <!-- Hot Summer Deals Banner -->
    <div class="max-w-6xl mx-auto px-4 md:px-6 pt-12">
      <div class="bg-gradient-to-r from-[#EF972D] to-[#F59E0B] rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="space-y-2 text-center md:text-left">
          <div class="bg-white/20 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">COMBO MÙA HÈ ĐẶC BIỆT</div>
          <h3 class="text-2xl md:text-3xl font-extrabold uppercase">MUA 2 ÁO POLO NAM CHỈ 139.000đ / ÁO</h3>
          <p class="text-white/90 text-xs md:text-sm">Chất liệu thun cá sấu co giãn 4 chiều, thoáng mát, thấm hút mồ hôi cực đỉnh.</p>
        </div>
        <RouterLink to="/all-products" class="px-7 py-3.5 bg-white text-[#EF972D] hover:bg-gray-100 font-extrabold text-xs uppercase rounded-xl transition-all shadow-md shrink-0">
          MUA NGAY COMBO
        </RouterLink>
      </div>
    </div>

    <!-- Discounted Products Section -->
    <div id="flash-sale" class="max-w-6xl mx-auto px-4 md:px-6 pt-14">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span class="text-[#EF972D] font-bold text-xs uppercase tracking-widest">SẢN PHẨM ĐANG GIẢM GIÁ</span>
          <h2 class="text-2xl md:text-3xl font-extrabold text-gray-900 uppercase">ÁO THỜI TRANG MÙA HÈ NAM</h2>
        </div>
        <RouterLink to="/all-products" class="text-xs font-bold text-[#EF972D] hover:underline flex items-center gap-1">
          Xem tất cả sản phẩm
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- Loading Spinner -->
      <div v-if="isLoading" class="py-16 text-center text-gray-400">
        <span class="material-symbols-outlined animate-spin text-3xl mb-2 text-[#EF972D]">progress_activity</span>
        <p class="text-sm font-medium">Đang tải danh sách áo nam ưu đãi...</p>
      </div>

      <!-- Products Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        <RouterLink 
          v-for="p in products" 
          :key="p.id" 
          :to="`/product/${p.id}`"
          class="flex flex-col bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
        >
          <!-- Top Image area -->
          <div class="relative overflow-hidden bg-gray-50 aspect-square">
            <!-- Discount Badge -->
            <div class="absolute top-2.5 left-2.5 bg-red-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md z-10">
              {{ p.phanTramGiam > 0 ? `-${p.phanTramGiam}% SALE` : 'ƯU ĐÃI HÈ' }}
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
              <span class="text-[11px] font-bold text-[#EF972D] uppercase tracking-wider block mb-1">Thời trang nam hè</span>
              <h3 class="font-bold text-sm text-gray-900 group-hover:text-[#EF972D] line-clamp-2 transition-colors">
                {{ sanitizeVietnamese(p.tenSanPham) }}
              </h3>
            </div>

            <!-- Price and Details Button -->
            <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span class="text-base font-extrabold text-red-600 block">{{ formatCurrency(p.giaBan || 199000) }}</span>
                <span v-if="p.giaGoc && p.giaGoc > p.giaBan" class="text-xs text-gray-400 line-through">{{ formatCurrency(p.giaGoc) }}</span>
              </div>
              <div class="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#EF972D] group-hover:text-white flex items-center justify-center text-gray-600 transition-colors">
                <span class="material-symbols-outlined text-base">visibility</span>
              </div>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
