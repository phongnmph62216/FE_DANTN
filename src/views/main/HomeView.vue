<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { formatCurrency, formatDateTime } from '@/utils/format'

const router = useRouter()
const authStore = useAuthStore()

// State
const isLoading = ref(true)
const stats = ref({
  doanhThuNgay: 0,
  soDonHangNgay: 0,
  donHangChoXacNhan: 0,
  tongSanPham: 0,
  tongKhachHang: 0
})

const recentOrders = ref([])
const topProducts = ref([])
const lowStockProducts = ref([])

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 0: return 'bg-amber-100 text-amber-800 border border-amber-300'
    case 1: return 'bg-blue-100 text-blue-800 border border-blue-300'
    case 2: return 'bg-indigo-100 text-indigo-800 border border-indigo-300'
    case 3: return 'bg-orange-100 text-orange-800 border border-orange-300'
    case 4: return 'bg-emerald-100 text-emerald-800 border border-emerald-300'
    case 5: return 'bg-rose-100 text-rose-800 border border-rose-300'
    default: return 'bg-gray-100 text-gray-700 border border-gray-300'
  }
}

const getStatusLabel = (status) => {
  switch (status) {
    case 0: return 'Chờ xác nhận'
    case 1: return 'Đang xử lý'
    case 2: return 'Chờ giao'
    case 3: return 'Đang giao'
    case 4: return 'Hoàn thành'
    case 5: return 'Đã hủy'
    case 6: return 'Giao thất bại'
    default: return 'Không xác định'
  }
}

const loadDashboardData = async () => {
  isLoading.value = true
  try {
    // 1. Load Overview Stats from Statistics API
    const statsRes = await api.get('/api/v1/thong-ke/tong-quan').catch(() => null)
    if (statsRes && statsRes.data) {
      const data = statsRes.data
      stats.value.doanhThuNgay = data.doanhThuNgay || 0
      stats.value.soDonHangNgay = data.soDonHangNgay || 0
      stats.value.donHangChoXacNhan = (data.trangThaiDonHang && (data.trangThaiDonHang[0] || data.trangThaiDonHang[1])) || 0
      if (data.topBanChay && data.topBanChay.length > 0) {
        topProducts.value = data.topBanChay
      }
    }

    // 2. Load Real Invoices / Orders from Backend API (/api/v1/hoa-don)
    const ordersRes = await api.get('/api/v1/hoa-don', { params: { page: 0, size: 20 } }).catch(() => null)
    if (ordersRes && ordersRes.data) {
      const rawList = ordersRes.data.content || ordersRes.data || []
      const sortedList = [...rawList].sort((a, b) => (b.id || 0) - (a.id || 0))
      recentOrders.value = sortedList.slice(0, 6)

      // Count pending orders if stats were 0
      const pendingOrders = rawList.filter(o => o.trangThai === 0 || o.trangThai === 1)
      if (!stats.value.donHangChoXacNhan || stats.value.donHangChoXacNhan === 0) {
        stats.value.donHangChoXacNhan = pendingOrders.length
      }

      // Calculate revenue from completed orders
      const totalRev = rawList
        .filter(o => o.trangThai === 4 || o.trangThai === 2 || o.trangThai === 3)
        .reduce((sum, o) => sum + (o.tongTien || 0), 0)
      if (!stats.value.doanhThuNgay || stats.value.doanhThuNgay === 0) {
        stats.value.doanhThuNgay = totalRev
      }
    }

    // 3. Load Products & Count from Backend API (/api/v1/san-pham)
    const productsRes = await api.get('/api/v1/san-pham', { params: { size: 100 } }).catch(() => null)
    if (productsRes && productsRes.data) {
      const prodList = productsRes.data.content || productsRes.data || []
      stats.value.tongSanPham = productsRes.data.totalElements || prodList.length || 0

      // Top products list mapped from real product DTOs from Backend
      if (prodList.length > 0) {
        const mappedList = prodList.map(p => ({
          id: p.id,
          tenSanPham: p.tenSanPham || 'Áo Nam',
          soLuongDaBan: p.soLuongDaBan ?? 0,
          doanhThu: p.giaThapNhatSauGiam || p.giaThapNhat || p.giaCaoNhat || 0,
          hinhAnh: p.hinhAnh || (p.danhSachAnh && p.danhSachAnh[0]) || ''
        }))
        topProducts.value = mappedList.sort((a, b) => b.soLuongDaBan - a.soLuongDaBan).slice(0, 5)
      }
    }

    // 4. Load Customers Count from Backend API (/api/v1/khach-hang)
    const customersRes = await api.get('/api/v1/khach-hang', { params: { size: 100 } }).catch(() => null)
    if (customersRes && customersRes.data) {
      const custData = customersRes.data
      stats.value.tongKhachHang = custData.totalElements || (custData.content ? custData.content.length : custData.length) || 0
    }
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<template>
  <div class="space-y-8 pb-10">
    <!-- 1. Executive Hero Welcome Banner -->
    <div class="bg-[#0D2533] text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="absolute -top-16 -right-16 w-64 h-64 bg-[#EF972D]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="space-y-2 relative z-10">
        <div class="inline-flex items-center gap-2 px-3 py-1 bg-[#EF972D]/20 border border-[#EF972D]/30 text-[#EF972D] rounded-full text-[11px] font-black uppercase tracking-widest">
          <span class="w-2 h-2 rounded-full bg-[#EF972D] animate-ping"></span>
          BEE STYLISH ADMIN CONSOLE
        </div>
        <h1 class="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
          CHÀO MỪNG QUAY TRỞ LẠI, <span class="text-[#EF972D]">{{ authStore.user?.hoTen || 'QUẢN TRỊ VIÊN' }}</span>!
        </h1>
        <p class="text-xs md:text-sm text-gray-300 max-w-2xl leading-relaxed">
          Hệ thống cửa hàng thời trang nam Bee Stylish đang vận hành ổn định. Hôm nay cửa hàng có 
          <strong class="text-white font-extrabold">{{ stats.donHangChoXacNhan }} đơn hàng mới</strong> đang chờ duyệt.
        </p>
      </div>

      <div class="flex items-center gap-3 relative z-10 shrink-0 flex-wrap">
        <RouterLink 
          to="/pos" 
          class="px-6 py-3.5 bg-[#EF972D] hover:bg-[#d87f1d] active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
        >
          <span class="material-symbols-outlined text-lg">point_of_sale</span>
          BÁN HÀNG TẠI QUẦY (POS)
        </RouterLink>
      </div>
    </div>

    <!-- 2. Top KPI Overview Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Card 1: Revenue -->
      <div class="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="flex justify-between items-start mb-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-[#EF972D] flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-2xl">payments</span>
          </div>
          <span class="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            HÔM NAY
          </span>
        </div>
        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block">DOANH THU HÔM NAY</span>
        <h3 class="text-2xl font-black text-gray-900 mt-1 text-[#EF972D]">
          {{ formatCurrency(stats.doanhThuNgay || 0) }}
        </h3>
        <p class="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
          <span class="material-symbols-outlined text-xs text-emerald-500">trending_up</span>
          Cập nhật theo hóa đơn thành công
        </p>
      </div>

      <!-- Card 2: Pending Orders -->
      <div class="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="flex justify-between items-start mb-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-2xl">pending_actions</span>
          </div>
          <span class="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            CẦN DUYỆT
          </span>
        </div>
        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block">ĐƠN CHỜ XÁC NHẬN</span>
        <h3 class="text-2xl font-black text-gray-900 mt-1 text-amber-600">
          {{ stats.donHangChoXacNhan }} <span class="text-xs font-normal text-gray-500">đơn hàng</span>
        </h3>
        <RouterLink to="/orders" class="text-[11px] font-bold text-[#EF972D] hover:underline mt-2 inline-flex items-center gap-1">
          Duyệt ngay
          <span class="material-symbols-outlined text-xs">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- Card 3: Total Products -->
      <div class="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="flex justify-between items-start mb-4">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-2xl">inventory_2</span>
          </div>
          <span class="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
            KHO HÀNG
          </span>
        </div>
        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block">TỔNG SẢN PHẨM HÈ</span>
        <h3 class="text-2xl font-black text-gray-900 mt-1">
          {{ stats.tongSanPham }} <span class="text-xs font-normal text-gray-500">mẫu áo</span>
        </h3>
        <RouterLink to="/products" class="text-[11px] font-bold text-blue-600 hover:underline mt-2 inline-flex items-center gap-1">
          Quản lý sản phẩm
          <span class="material-symbols-outlined text-xs">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- Card 4: Customers -->
      <div class="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="flex justify-between items-start mb-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-2xl">group</span>
          </div>
          <span class="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            THÀNH VIÊN
          </span>
        </div>
        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block">TỔNG KHÁCH HÀNG</span>
        <h3 class="text-2xl font-black text-gray-900 mt-1">
          {{ stats.tongKhachHang }} <span class="text-xs font-normal text-gray-500">tài khoản</span>
        </h3>
        <RouterLink to="/customers" class="text-[11px] font-bold text-emerald-600 hover:underline mt-2 inline-flex items-center gap-1">
          Xem danh sách
          <span class="material-symbols-outlined text-xs">arrow_forward</span>
        </RouterLink>
      </div>
    </div>

    <!-- 3. Quick Operations Shortcuts Bar -->
    <div class="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
      <h3 class="text-xs font-black uppercase tracking-widest text-gray-900 mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-[#EF972D] text-lg">bolt</span>
        LỐI TẮT THAO TÁC NHANH DỰ ÁN
      </h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <RouterLink 
          to="/pos"
          class="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50/50 hover:bg-[#EF972D] hover:text-white text-gray-800 transition-all border border-amber-150 group text-center gap-2 cursor-pointer shadow-sm"
        >
          <span class="material-symbols-outlined text-2xl text-[#EF972D] group-hover:text-white transition-colors">point_of_sale</span>
          <span class="text-xs font-extrabold uppercase">Bán Hàng POS</span>
        </RouterLink>

        <RouterLink 
          to="/orders"
          class="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 hover:bg-[#0D2533] hover:text-white text-gray-800 transition-all border border-gray-200 group text-center gap-2 cursor-pointer shadow-sm"
        >
          <span class="material-symbols-outlined text-2xl text-gray-700 group-hover:text-white transition-colors">local_shipping</span>
          <span class="text-xs font-extrabold uppercase">Quản Lý Đơn Hàng</span>
        </RouterLink>

        <RouterLink 
          to="/products/add"
          class="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 hover:bg-[#0D2533] hover:text-white text-gray-800 transition-all border border-gray-200 group text-center gap-2 cursor-pointer shadow-sm"
        >
          <span class="material-symbols-outlined text-2xl text-gray-700 group-hover:text-white transition-colors">add_box</span>
          <span class="text-xs font-extrabold uppercase">Thêm Sản Phẩm</span>
        </RouterLink>

        <RouterLink 
          to="/vouchers"
          class="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 hover:bg-[#0D2533] hover:text-white text-gray-800 transition-all border border-gray-200 group text-center gap-2 cursor-pointer shadow-sm"
        >
          <span class="material-symbols-outlined text-2xl text-gray-700 group-hover:text-white transition-colors">confirmation_number</span>
          <span class="text-xs font-extrabold uppercase">Mã Giảm Giá</span>
        </RouterLink>

        <RouterLink 
          to="/admin/thong-ke"
          class="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 hover:bg-[#0D2533] hover:text-white text-gray-800 transition-all border border-gray-200 group text-center gap-2 cursor-pointer shadow-sm"
        >
          <span class="material-symbols-outlined text-2xl text-gray-700 group-hover:text-white transition-colors">insights</span>
          <span class="text-xs font-extrabold uppercase">Báo Cáo Thống Kê</span>
        </RouterLink>
      </div>
    </div>

    <!-- 4. Split Section: Recent Orders & Top Selling Products -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Recent Orders List (Span 7) -->
      <div class="lg:col-span-7 bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-150 pb-4">
          <h3 class="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">receipt</span>
            ĐƠN HÀNG MỚI NHẤT
          </h3>
          <RouterLink to="/orders" class="text-xs font-extrabold text-[#EF972D] hover:underline flex items-center gap-1">
            Xem tất cả
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
        </div>

        <div v-if="isLoading" class="py-12 text-center text-gray-400">
          <span class="material-symbols-outlined animate-spin text-3xl text-[#EF972D]">progress_activity</span>
        </div>

        <div v-else-if="recentOrders.length === 0" class="py-12 text-center text-gray-500">
          Chưa có đơn hàng nào phát sinh.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-gray-200 text-gray-500 uppercase font-extrabold">
                <th class="py-3 px-2">Mã Đơn</th>
                <th class="py-3 px-2">Khách Hàng</th>
                <th class="py-3 px-2">Tổng Tiền</th>
                <th class="py-3 px-2">Trạng Thái</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="ord in recentOrders" :key="ord.id" class="hover:bg-gray-50/80 transition-colors">
                <td class="py-3 px-2 font-black text-gray-900">{{ ord.maHoaDon }}</td>
                <td class="py-3 px-2">
                  <div class="font-bold text-gray-800">{{ ord.tenKhachHang }}</div>
                  <div class="text-[10px] text-gray-400">{{ ord.soDienThoai }}</div>
                </td>
                <td class="py-3 px-2 font-black text-[#EF972D]">
                  {{ formatCurrency(ord.tongTien) }}
                </td>
                <td class="py-3 px-2">
                  <span :class="getStatusBadgeClass(ord.trangThai)" class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap">
                    {{ getStatusLabel(ord.trangThai) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Top Selling Products Showcase (Span 5) -->
      <div class="lg:col-span-5 bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-gray-150 pb-4">
          <h3 class="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">local_fire_department</span>
            TOP ÁO BÁN CHẠY
          </h3>
          <RouterLink to="/admin/thong-ke" class="text-xs font-extrabold text-[#EF972D] hover:underline flex items-center gap-1">
            Thống kê
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
        </div>

        <div v-if="topProducts.length === 0" class="py-12 text-center text-gray-500">
          Chưa có dữ liệu bán chạy.
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="(prod, idx) in topProducts.slice(0, 5)" 
            :key="idx"
            class="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-150 hover:bg-white transition-all shadow-2xs"
          >
            <div class="w-8 h-8 rounded-xl bg-[#EF972D] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
              #{{ idx + 1 }}
            </div>
            <div class="w-12 h-12 rounded-xl bg-white overflow-hidden border border-gray-200 shrink-0">
              <img :src="formatImage(prod.hinhAnh)" :alt="prod.tenSanPham" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-xs font-bold text-gray-900 line-clamp-1">{{ prod.tenSanPham }}</h4>
              <p class="text-[11px] text-gray-500">
                Đã bán: <strong class="text-gray-800 font-extrabold">{{ prod.soLuongDaBan }} cái</strong>
              </p>
            </div>
            <div class="text-right">
              <span class="text-xs font-extrabold text-[#EF972D] block">{{ formatCurrency(prod.doanhThu) }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
