<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api from '../../services/api'

const route = useRoute()
const router = useRouter()

const invoiceId = computed(() => route.params.id)

const invoice = ref(null)
const histories = ref([])
const isLoading = ref(false)
const isUsingMock = ref(false)

const toast = ref({ show: false, message: '', type: 'success' })

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  try {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')

    return `${day}/${month}/${year} ${hour}:${minute}`
  } catch (e) {
    return dateString
  }
}

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(amount)
    .replace(/\s?₫/, ' đ')
}

const getStatusBadge = (status) => {
  const s = Number(status)

  if (s === 0) {
    return {
      text: 'Tạo mới',
      class: 'bg-blue-50 text-blue-700 border border-blue-100',
      icon: 'fiber_new'
    }
  }

  if (s === 1) {
    return {
      text: 'Chờ xác nhận',
      class: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
      icon: 'schedule'
    }
  }

  if (s === 2) {
    return {
      text: 'Đã xác nhận',
      class: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      icon: 'task_alt'
    }
  }

  if (s === 3) {
    return {
      text: 'Đang giao',
      class: 'bg-orange-50 text-orange-700 border border-orange-100',
      icon: 'local_shipping'
    }
  }

  if (s === 4) {
    return {
      text: 'Hoàn thành',
      class: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      icon: 'check_circle'
    }
  }

  if (s === 5) {
    return {
      text: 'Đã hủy',
      class: 'bg-red-50 text-red-700 border border-red-100',
      icon: 'cancel'
    }
  }

  return {
    text: 'Không xác định',
    class: 'bg-gray-100 text-gray-500 border border-gray-200',
    icon: 'help'
  }
}

const normalizeInvoice = (item) => {
  if (!item) return null

  return {
    id: item.id,
    maHoaDon: item.maHoaDon || item.ma_hoa_don || item.code || `HD${String(item.id || 0).padStart(6, '0')}`,
    tenKhachHang: item.tenKhachHang || item.ten_khach_hang || item.customerName || 'Khách lẻ',
    soDienThoai: item.soDienThoai || item.so_dien_thoai || item.phone || '-',
    tenNhanVien: item.tenNhanVien || item.ten_nhan_vien || item.employeeName || '-',
    tongTienThanhToan: item.tongTienThanhToan ?? item.tong_tien_thanh_toan ?? item.total ?? 0,
    ngayTao: item.ngayTao || item.ngay_tao || item.createdAt,
    ngayThanhToan: item.ngayThanhToan || item.ngay_thanh_toan || item.paidAt,
    trangThai: item.trangThai ?? item.trang_thai ?? item.status ?? 0,
    ghiChu: item.ghiChu || item.ghi_chu || ''
  }
}

const normalizeHistory = (item, index = 0) => {
  return {
    id: item.id || index + 1,
    trangThai: item.trangThai ?? item.trang_thai ?? item.status ?? 0,
    thoiGian: item.thoiGian || item.thoi_gian || item.ngayTao || item.ngay_tao || item.createdAt,
    ghiChu: item.ghiChu || item.ghi_chu || item.note || '',
    hanhDong: item.hanhDong || item.hanh_dong || item.action || getStatusBadge(item.trangThai ?? item.status ?? 0).text,
    nguoiThucHien: item.nguoiThucHien || item.nguoi_thuc_hien || item.nguoiTao || item.nguoi_tao || 'Hệ thống'
  }
}
const getHistoryOrder = (status) => {
  const s = Number(status)

  if (s === 0) return 1 // Tạo hóa đơn
  if (s === 1) return 2 // Chờ xác nhận
  if (s === 2) return 3 // Đã xác nhận
  if (s === 3) return 4 // Đang giao
  if (s === 4) return 5 // Hoàn thành
  if (s === 5) return 6 // Đã hủy

  return 99
}

const sortedHistories = computed(() => {
  return [...histories.value].sort((a, b) => {
    const orderA = getHistoryOrder(a.trangThai)
    const orderB = getHistoryOrder(b.trangThai)

    if (orderA !== orderB) {
      return orderA - orderB
    }

    return new Date(a.thoiGian || 0) - new Date(b.thoiGian || 0)
  })
})
const defaultMockInvoice = {
  id: 1,
  maHoaDon: 'HD000001',
  tenKhachHang: 'Nguyễn Văn An',
  soDienThoai: '0912345678',
  tenNhanVien: 'Trần Tuấn Linh',
  tongTienThanhToan: 930000,
  ngayTao: '2026-06-10T09:15:00',
  ngayThanhToan: '2026-06-10T09:25:00',
  trangThai: 4,
  ghiChu: 'Khách nhận tại cửa hàng'
}

const defaultMockHistories = [
  {
    id: 1,
    trangThai: 0,
    hanhDong: 'Tạo hóa đơn',
    thoiGian: '2026-06-10T09:15:00',
    nguoiThucHien: 'Trần Tuấn Linh',
    ghiChu: 'Hóa đơn được tạo tại quầy'
  },
  {
    id: 2,
    trangThai: 1,
    hanhDong: 'Chờ xác nhận',
    thoiGian: '2026-06-10T09:17:00',
    nguoiThucHien: 'Trần Tuấn Linh',
    ghiChu: 'Đã kiểm tra thông tin khách hàng'
  },
  {
    id: 3,
    trangThai: 2,
    hanhDong: 'Đã xác nhận',
    thoiGian: '2026-06-10T09:20:00',
    nguoiThucHien: 'Trần Tuấn Linh',
    ghiChu: 'Xác nhận đủ sản phẩm trong kho'
  },
  {
    id: 4,
    trangThai: 4,
    hanhDong: 'Hoàn thành',
    thoiGian: '2026-06-10T09:25:00',
    nguoiThucHien: 'Trần Tuấn Linh',
    ghiChu: 'Khách đã thanh toán và nhận hàng'
  }
]

const fetchInvoice = async () => {
  try {
    const res = await api.get(`/api/v1/hoa-don/${invoiceId.value}`)
    invoice.value = normalizeInvoice(res.data)
  } catch (err) {
    invoice.value = normalizeInvoice({
      ...defaultMockInvoice,
      id: Number(invoiceId.value || 1)
    })
    isUsingMock.value = true
  }
}

const fetchHistories = async () => {
  try {
    const res = await api.get('/api/v1/lich-su-hoa-don', {
      params: {
        hoaDonId: invoiceId.value
      }
    })

    const data = res.data
    const content = Array.isArray(data) ? data : (data?.content || [])
    histories.value = content.map(normalizeHistory)
  } catch (err) {
    histories.value = defaultMockHistories.map(normalizeHistory)
    isUsingMock.value = true
  }
}

const loadData = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      fetchInvoice(),
      fetchHistories()
    ])
  } catch (err) {
    console.error(err)
    showToast('Không thể tải lịch sử hóa đơn!', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-gutter">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <RouterLink to="/invoices" class="hover:text-[#EF972D] transition-colors">
            Quản lý hóa đơn
          </RouterLink>
          <span>/</span>
          <span>Lịch sử hóa đơn</span>
        </div>

        <h1 class="font-display-lg text-on-surface uppercase text-gray-900 tracking-tight">
          LỊCH SỬ HÓA ĐƠN
        </h1>

        <p class="text-sm text-gray-500 mt-1">
          Theo dõi toàn bộ quá trình xử lý và thay đổi trạng thái của hóa đơn
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div
          v-if="isUsingMock"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-100 text-xs font-semibold"
        >
          <span class="material-symbols-outlined text-[18px]">database_off</span>
          Đang dùng dữ liệu mẫu
        </div>

        <button
          type="button"
          @click="router.push(`/invoices/${invoiceId}`)"
          class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 bg-white cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">visibility</span>
          Xem chi tiết
        </button>

        <button
          type="button"
          @click="router.push('/invoices')"
          class="bg-[#EF972D] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          Quay lại
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="bg-white rounded-xl border border-gray-100 shadow-sm p-12 flex flex-col items-center gap-3">
      <div class="w-8 h-8 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm font-semibold text-gray-500">Đang tải lịch sử hóa đơn...</p>
    </div>

    <template v-else>
      <!-- Invoice Summary -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-orange-50 text-[#EF972D] flex items-center justify-center">
              <span class="material-symbols-outlined">receipt_long</span>
            </div>
            <div>
              <h2 class="font-bold text-gray-900">
                {{ invoice?.maHoaDon || '-' }}
              </h2>
              <p class="text-sm text-gray-500">
                Ngày tạo: {{ formatDateTime(invoice?.ngayTao) }}
              </p>
            </div>
          </div>

          <span
            v-if="invoice"
            :class="getStatusBadge(invoice.trangThai).class"
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
          >
            <span class="material-symbols-outlined text-[15px]">
              {{ getStatusBadge(invoice.trangThai).icon }}
            </span>
            {{ getStatusBadge(invoice.trangThai).text }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
          <div>
            <p class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Khách hàng</p>
            <p class="text-sm font-bold text-gray-800 mt-1">{{ invoice?.tenKhachHang || '-' }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ invoice?.soDienThoai || '-' }}</p>
          </div>

          <div>
            <p class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Nhân viên</p>
            <p class="text-sm font-bold text-gray-800 mt-1">{{ invoice?.tenNhanVien || '-' }}</p>
          </div>

          <div>
            <p class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Tổng thanh toán</p>
            <p class="text-sm font-bold text-[#EF972D] mt-1">
              {{ formatCurrency(invoice?.tongTienThanhToan) }}
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-400 uppercase font-semibold tracking-wider">Ngày thanh toán</p>
            <p class="text-sm font-bold text-gray-800 mt-1">
              {{ formatDateTime(invoice?.ngayThanhToan) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Timeline xử lý</h2>
            <p class="text-sm text-gray-500 mt-1">Các mốc trạng thái của hóa đơn</p>
          </div>

          <button
            type="button"
            @click="loadData"
            class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors flex items-center justify-center bg-white cursor-pointer"
            title="Tải lại"
          >
            <span class="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>

        <div v-if="histories.length === 0" class="text-center py-10">
          <span class="material-symbols-outlined text-gray-400 text-5xl">history</span>
          <p class="text-sm text-gray-500 font-medium mt-2">
            Chưa có lịch sử xử lý cho hóa đơn này.
          </p>
        </div>

        <div v-else class="relative">
          <div class="absolute left-5 top-2 bottom-2 w-px bg-gray-200"></div>

          <div
            v-for="(item, index) in sortedHistories"
            :key="item.id"
            class="relative flex gap-4 pb-7 last:pb-0"
          >
            <div
              class="relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm"
              :class="index === histories.length - 1 ? 'bg-[#EF972D] text-white' : 'bg-gray-100 text-gray-500'"
            >
              <span class="material-symbols-outlined text-[20px]">
                {{ getStatusBadge(item.trangThai).icon }}
              </span>
            </div>

            <div class="flex-1 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h3 class="font-bold text-gray-900">
                    {{ item.hanhDong }}
                  </h3>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ item.ghiChu || 'Không có ghi chú' }}
                  </p>
                </div>

                <span
                  :class="getStatusBadge(item.trangThai).class"
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold w-fit"
                >
                  <span class="material-symbols-outlined text-[15px]">
                    {{ getStatusBadge(item.trangThai).icon }}
                  </span>
                  {{ getStatusBadge(item.trangThai).text }}
                </span>
              </div>

              <div class="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
                <div class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">schedule</span>
                  {{ formatDateTime(item.thoiGian) }}
                </div>

                <div class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">person</span>
                  {{ item.nguoiThucHien }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Table History -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <h2 class="text-lg font-bold text-gray-900">Bảng lịch sử chi tiết</h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-center w-16">
                  STT
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">
                  Người thực hiện
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">
                  Ghi chú
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100 bg-white">
              <tr
                v-for="(item, index) in sortedHistories"
                :key="`table-${item.id}`"
                class="hover:bg-gray-50/50 transition-colors"
              >
                <td class="py-4 px-4 text-center text-sm text-gray-600">
                  {{ index + 1 }}
                </td>

                <td class="py-4 px-4 text-sm text-gray-700 font-medium">
                  {{ formatDateTime(item.thoiGian) }}
                </td>

                <td class="py-4 px-4 text-sm text-gray-800 font-semibold">
                  {{ item.hanhDong }}
                </td>

                <td class="py-4 px-4">
                  <span
                    :class="getStatusBadge(item.trangThai).class"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                  >
                    <span class="material-symbols-outlined text-[14px]">
                      {{ getStatusBadge(item.trangThai).icon }}
                    </span>
                    {{ getStatusBadge(item.trangThai).text }}
                  </span>
                </td>

                <td class="py-4 px-4 text-sm text-gray-700">
                  {{ item.nguoiThucHien }}
                </td>

                <td class="py-4 px-4 text-sm text-gray-500">
                  {{ item.ghiChu || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>

  <!-- Toast -->
  <div
    v-if="toast.show"
    class="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0"
    :class="{
      'bg-emerald-50 border-emerald-200 text-emerald-800': toast.type === 'success',
      'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
      'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info'
    }"
  >
    <span class="material-symbols-outlined text-lg">
      {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
    </span>

    <span class="text-sm font-semibold font-body-md">
      {{ toast.message }}
    </span>

    <button
      @click="toast.show = false"
      class="ml-4 text-gray-400 hover:text-gray-600 cursor-pointer"
    >
      <span class="material-symbols-outlined text-sm">close</span>
    </button>
  </div>
</template>