<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button
          @click="goBack"
          class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
        >
          <span class="material-symbols-outlined">arrow_back</span>
        </button>

        <div>
          <h1 class="text-2xl font-bold text-[#0D2533] font-headline-md">
            Chi tiết hóa đơn {{ hoaDon.maHoaDon }}
          </h1>
          <p class="text-sm text-gray-500 mt-1 font-body-md">
            Xem thông tin hóa đơn, khách hàng, thanh toán và trạng thái xử lý
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="printInvoice"
          class="px-5 py-2.5 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[20px]">print</span>
          In hóa đơn
        </button>

        <button
  v-if="hoaDon.loaiHoaDon === 'ONLINE' && hoaDon.trangThai !== 'HOAN_THANH' && hoaDon.trangThai !== 'DA_HUY'"
  @click="changeStatus"
  class="px-5 py-2.5 bg-[#0D2533] text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
>
  <span class="material-symbols-outlined text-[20px]">published_with_changes</span>
  Cập nhật trạng thái
</button>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="bg-white rounded-2xl border border-surface-container shadow-sm p-10 flex items-center justify-center"
    >
      <span class="animate-spin material-symbols-outlined text-3xl text-[#EF972D]">
        progress_activity
      </span>
    </div>

    <template v-else>
     <!-- Status Timeline -->
<div class="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-lg font-bold text-[#0D2533]">
        Tiến trình hóa đơn
      </h2>
      <p class="text-sm text-gray-500 mt-1">
        {{ hoaDon.loaiHoaDon === 'ONLINE' ? 'Quy trình xử lý đơn online' : 'Quy trình hóa đơn tại quầy' }}
      </p>
    </div>

    <span
      :class="statusClass(hoaDon.trangThai)"
      class="px-3 py-1.5 rounded-full text-xs font-bold uppercase"
    >
      {{ statusLabel(hoaDon.trangThai) }}
    </span>
  </div>

  <div
    class="grid gap-4"
    :class="hoaDon.loaiHoaDon === 'ONLINE' ? 'grid-cols-4' : 'grid-cols-2'"
  >
    <div
      v-for="(step, index) in currentStatusFlow"
      :key="step.value"
      class="relative flex flex-col items-center text-center"
    >
      <div
        v-if="index !== 0"
        :class="isStepActive(step.value) ? 'bg-[#EF972D]' : 'bg-gray-200'"
        class="absolute top-6 right-1/2 w-full h-1"
      ></div>

      <div
        :class="isStepActive(step.value)
          ? 'bg-[#EF972D] text-white shadow-md'
          : 'bg-gray-100 text-gray-400'"
        class="relative z-10 w-12 h-12 rounded-full flex items-center justify-center"
      >
        <span class="material-symbols-outlined">
          {{ step.icon }}
        </span>
      </div>

      <p
        :class="hoaDon.trangThai === step.value ? 'text-[#0D2533] font-bold' : 'text-gray-500'"
        class="text-sm mt-3"
      >
        {{ step.label }}
      </p>
    </div>
  </div>
</div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Invoice Info -->
          <div class="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-bold text-[#0D2533]">
                Thông tin hóa đơn
              </h2>
              <span
                :class="statusClass(hoaDon.trangThai)"
                class="px-3 py-1 rounded-full text-xs font-bold uppercase"
              >
                {{ statusLabel(hoaDon.trangThai) }}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-1">
                <p class="text-xs text-gray-500 font-body-md">Mã hóa đơn</p>
                <p class="text-sm font-semibold text-[#0D2533]">{{ hoaDon.maHoaDon }}</p>
              </div>

              <div class="space-y-1">
                <p class="text-xs text-gray-500 font-body-md">Ngày tạo</p>
                <p class="text-sm font-semibold text-[#0D2533]">{{ formatDate(hoaDon.ngayTao) }}</p>
              </div>

              <div class="space-y-1">
                <p class="text-xs text-gray-500 font-body-md">Loại hóa đơn</p>
                <p class="text-sm font-semibold text-[#0D2533]">{{ loaiHoaDonLabel(hoaDon.loaiHoaDon) }}</p>
              </div>

              <div class="space-y-1">
                <p class="text-xs text-gray-500 font-body-md">Nhân viên phụ trách</p>
                <p class="text-sm font-semibold text-[#0D2533]">
                  NV: {{ hoaDon.idNhanVien || 'Chưa có' }}
                </p>
              </div>

              <div class="space-y-1">
                <p class="text-xs text-gray-500 font-body-md">Ngày nhận hàng</p>
                <p class="text-sm font-semibold text-[#0D2533]">
                  {{ formatDate(hoaDon.ngayNhanHang) || 'Chưa có' }}
                </p>
              </div>

              <div class="space-y-1">
                <p class="text-xs text-gray-500 font-body-md">Ngày thanh toán</p>
                <p class="text-sm font-semibold text-[#0D2533]">
                  {{ formatDate(hoaDon.ngayThanhToan) || 'Chưa thanh toán' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Products -->
<div class="bg-white rounded-2xl border border-surface-container shadow-sm overflow-hidden">
  <div class="p-6 border-b border-gray-100 flex items-center justify-between">
    <div>
      <h2 class="text-lg font-bold text-[#0D2533]">
        Sản phẩm trong hóa đơn
      </h2>
      <p class="text-sm text-gray-500 mt-1">
        Danh sách sản phẩm đã mua
      </p>
    </div>

    <span class="text-sm font-semibold text-gray-500">
      {{ chiTietHoaDon.length }} sản phẩm
    </span>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-left">
      <thead class="bg-gray-50 border-b border-gray-100">
        <tr class="text-xs uppercase text-gray-500">
          <th class="px-6 py-4">STT</th>
          <th class="px-6 py-4">Mã sản phẩm</th>
          <th class="px-6 py-4 text-right">Đơn giá</th>
          <th class="px-6 py-4 text-center">Số lượng</th>
          <th class="px-6 py-4 text-right">Thành tiền</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-gray-100">
        <tr v-if="chiTietHoaDon.length === 0">
          <td colspan="5" class="px-6 py-12 text-center text-gray-500">
            Chưa có sản phẩm trong hóa đơn
          </td>
        </tr>

        <tr
          v-for="(item, index) in chiTietHoaDon"
          :key="item.id"
          class="hover:bg-gray-50"
        >
          <td class="px-6 py-4 text-sm text-gray-500">
            {{ index + 1 }}
          </td>

          <td class="px-6 py-4">
            <div>
              <p class="text-sm font-bold text-[#0D2533]">
                {{ item.maChiTietSanPham || item.maSanPham || 'SP-' + item.idChiTietSanPham }}
              </p>
              <p class="text-xs text-gray-500">
                ID CTSP: {{ item.idChiTietSanPham }}
              </p>
            </div>
          </td>

          <td class="px-6 py-4 text-sm text-right">
            {{ formatCurrency(item.donGia) }}
          </td>

          <td class="px-6 py-4 text-center">
            <span class="px-3 py-1 rounded-full bg-gray-100 text-sm font-semibold">
              {{ item.soLuong }}
            </span>
          </td>

          <td class="px-6 py-4 text-sm text-right font-bold text-[#EF972D]">
            {{ formatCurrency(item.thanhTien) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
        </div>

        <!-- Right -->
        <div class="space-y-6">
          <!-- Customer -->
          <div class="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
            <h2 class="text-lg font-bold text-[#0D2533] mb-5">
              Khách hàng
            </h2>

            <div class="flex items-center gap-3 mb-5">
              <div class="w-12 h-12 rounded-full bg-[#0D2533]/10 flex items-center justify-center">
                <span class="material-symbols-outlined text-[#0D2533]">person</span>
              </div>
              <div>
                <p class="text-sm font-bold text-[#0D2533]">
                  {{ hoaDon.tenKhachHang || 'Khách lẻ' }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ hoaDon.soDienThoai || 'Chưa có SĐT' }}
                </p>
              </div>
            </div>

            <div class="space-y-3 text-sm">
              <div class="flex gap-2 text-gray-600">
                <span class="material-symbols-outlined text-[18px] text-gray-400">location_on</span>
                <span>{{ hoaDon.diaChiKhachHang || 'Chưa có địa chỉ' }}</span>
              </div>
            </div>
          </div>
<!-- QR Code -->
<div class="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
  <div class="flex items-center justify-between mb-4">
    <div>
      <h2 class="text-lg font-bold text-[#0D2533]">
        Mã QR hóa đơn
      </h2>
      <p class="text-sm text-gray-500">
        Quét nhanh để xem hóa đơn
      </p>
    </div>

    <span class="material-symbols-outlined text-[#EF972D]">
      qr_code_2
    </span>
  </div>

  <div class="flex flex-col items-center">
    <img
      v-if="qrCodeUrl"
      :src="qrCodeUrl"
      class="w-40 h-40 object-contain border border-gray-200 rounded-xl p-2"
      alt="QR hóa đơn"
    />

    <p class="mt-3 text-sm font-bold text-[#EF972D]">
      {{ hoaDon.maHoaDon }}
    </p>
  </div>
</div>  
<!-- Invoice History -->
<div class="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
  <div class="flex items-center justify-between mb-5">
    <div>
      <h2 class="text-lg font-bold text-[#0D2533]">
        Lịch sử xử lý
      </h2>
      <p class="text-sm text-gray-500">
        Theo dõi các thay đổi trạng thái
      </p>
    </div>

    <span class="material-symbols-outlined text-[#EF972D]">
      history
    </span>
  </div>

  <div v-if="lichSuHoaDon.length === 0" class="text-sm text-gray-500 text-center py-6">
    Chưa có lịch sử xử lý
  </div>

  <div v-else class="space-y-4">
    <div
      v-for="item in lichSuHoaDon"
      :key="item.id"
      class="relative pl-8"
    >
      <div class="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#EF972D] border-4 border-[#FFE0B2]"></div>

      <div class="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-bold text-[#0D2533]">
            {{ item.hanhDong || 'Cập nhật hóa đơn' }}
          </p>

          <span
            :class="statusClass(item.trangThai)"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap"
          >
            {{ item.trangThaiText || statusLabel(item.trangThai) }}
          </span>
        </div>

        <p class="text-xs text-gray-500 mt-1">
          {{ formatDate(item.thoiGian) }}
        </p>

        <p class="text-sm text-gray-600 mt-2 leading-5">
          {{ item.ghiChu || 'Không có ghi chú' }}
        </p>
      </div>
    </div>
  </div>
</div>

          <!-- Payment Summary -->
          <div class="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
            <h2 class="text-lg font-bold text-[#0D2533] mb-5">
              Tổng kết thanh toán
            </h2>

            <div class="space-y-4 text-sm">
              <div class="flex justify-between text-gray-600">
                <span>Số tiền gốc</span>
                <span>{{ formatCurrency(hoaDon.soTienGoc) }}</span>
              </div>

              <div class="flex justify-between text-gray-600">
                <span>Giảm giá</span>
                <span>-{{ formatCurrency(hoaDon.soTienGiam) }}</span>
              </div>

              <div class="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>{{ formatCurrency(hoaDon.phiVanChuyen) }}</span>
              </div>

              <div class="border-t border-gray-100 pt-4 flex justify-between">
                <span class="font-bold text-[#0D2533]">Tổng thanh toán</span>
                <span class="font-bold text-xl text-[#EF972D]">
                  {{ formatCurrency(hoaDon.tongTienThanhToan) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Note -->
          <div class="bg-white rounded-2xl border border-surface-container shadow-sm p-6">
            <h2 class="text-lg font-bold text-[#0D2533] mb-4">
              Ghi chú
            </h2>

            <p class="text-sm text-gray-600 leading-6">
              {{ hoaDon.ghiChu || 'Không có ghi chú cho hóa đơn này.' }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import api from '../../../services/api'
import { confirmAction, showToast, showErrorToast } from '../../../utils/alert'
const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const errorMessage = ref('')
const chiTietHoaDon = ref([])
const qrCodeUrl = ref('')
const lichSuHoaDon = ref([])

const hoaDon = reactive({
  id: null,
  idNhanVien: null,
  idKhachHang: null,
  idPhieuGiamGia: null,
  maHoaDon: '',
  loaiHoaDon: '',
  phiVanChuyen: 0,
  soTienGoc: 0,
  soTienGiam: 0,
  tongTienThanhToan: 0,
  tenKhachHang: '',
  diaChiKhachHang: '',
  soDienThoai: '',
  trangThai: '',
  ghiChu: '',
  ngayNhanHang: null,
  ngaySua: null,
  ngayTao: null,
  ngayThanhToan: null,
})

const onlineStatusFlow = [
  {
    value: 'CHO_XAC_NHAN',
    label: 'Chờ xác nhận',
    icon: 'hourglass_top',
  },
  {
    value: 'DANG_XU_LY',
    label: 'Đang xử lý',
    icon: 'inventory',
  },
  {
    value: 'DANG_GIAO',
    label: 'Đang giao',
    icon: 'local_shipping',
  },
  {
    value: 'HOAN_THANH',
    label: 'Hoàn thành',
    icon: 'check_circle',
  },
]

const taiQuayStatusFlow = [
  {
    value: 'CHO_XAC_NHAN',
    label: 'Tạo hóa đơn',
    icon: 'receipt_long',
  },
  {
    value: 'HOAN_THANH',
    label: 'Hoàn thành',
    icon: 'check_circle',
  },
]

const currentStatusFlow = computed(() => {
  return hoaDon.loaiHoaDon === 'ONLINE' ? onlineStatusFlow : taiQuayStatusFlow
})
onMounted(async () => {
  await fetchHoaDonDetail()
  await fetchChiTietHoaDon()
  await fetchLichSuHoaDon()
})

async function fetchHoaDonDetail() {
  const id = route.params.id
  isLoading.value = true
  errorMessage.value = ''

  try {
    const res = await api.get(`/hoa-don/${id}`)
    console.log('Chi tiet hoa don:', res.data)

    Object.assign(hoaDon, res.data)
    await generateQrCode()
  } catch (error) {
    console.error('Lỗi tải chi tiết hóa đơn:', error)
    errorMessage.value = error?.response?.data?.message || 'Không thể tải chi tiết hóa đơn'
  } finally {
    isLoading.value = false
  }
}
async function fetchChiTietHoaDon() {
  const id = route.params.id

  try {
    const res = await api.get(`/hoa-don-chi-tiet/hoa-don/${id}`)
    chiTietHoaDon.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    console.error('Lỗi tải chi tiết hóa đơn:', error)
    chiTietHoaDon.value = []
  }
}
function goBack() {
  router.push('/hoa-don')
}

function printInvoice() {
  router.push(`/hoa-don/${hoaDon.id}/in`)
}

async function changeStatus() {
  if (!hoaDon.id) {
    showErrorToast('Không tìm thấy hóa đơn cần cập nhật')
    return
  }

  if (hoaDon.loaiHoaDon !== 'ONLINE') {
    showErrorToast('Chỉ hóa đơn Online mới được cập nhật trạng thái')
    return
  }

  const currentIndex = onlineStatusFlow.findIndex((item) => item.value === hoaDon.trangThai)

  if (currentIndex === -1) {
    showErrorToast('Trạng thái hóa đơn không hợp lệ')
    return
  }

  if (currentIndex === onlineStatusFlow.length - 1) {
    showErrorToast('Hóa đơn đã hoàn thành')
    return
  }

  const currentStatus = onlineStatusFlow[currentIndex]
  const nextStatus = onlineStatusFlow[currentIndex + 1]

  const result = await confirmAction({
    title: 'Cập nhật trạng thái?',
    text: `Chuyển hóa đơn ${hoaDon.maHoaDon} từ "${currentStatus.label}" sang "${nextStatus.label}"?`,
    confirmButtonText: 'Cập nhật',
    cancelButtonText: 'Hủy',
    icon: 'question',
  })

  if (!result.isConfirmed) {
    return
  }

  try {
    isLoading.value = true
    errorMessage.value = ''

    await api.put(`/hoa-don/${hoaDon.id}/trang-thai`, {
      trangThai: nextStatus.value,
      ghiChu: `Cập nhật trạng thái từ ${currentStatus.label} sang ${nextStatus.label}`,
    })

    await fetchHoaDonDetail()
    await fetchChiTietHoaDon()
    await fetchLichSuHoaDon()
    
    showToast({
      title: `Đã chuyển sang ${nextStatus.label}`,
    })
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái hóa đơn:', error)
    showErrorToast('Không thể cập nhật trạng thái')
  } finally {
    isLoading.value = false
  }
}

function isStepActive(status) {
  const currentIndex = currentStatusFlow.value.findIndex((item) => item.value === hoaDon.trangThai)
  const stepIndex = currentStatusFlow.value.findIndex((item) => item.value === status)

  if (currentIndex === -1 || stepIndex === -1) {
    return false
  }

  return stepIndex <= currentIndex
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function loaiHoaDonLabel(value) {
  const map = {
    ONLINE: 'Online',
    TAI_QUAY: 'Tại quầy',
  }

  return map[value] || 'Khác'
}

function statusLabel(value) {
  const map = {
    CHO_XAC_NHAN: 'Chờ xác nhận',
    DANG_XU_LY: 'Đang xử lý',
    DANG_GIAO: 'Đang giao',
    HOAN_THANH: 'Hoàn thành',
    DA_HUY: 'Đã hủy',
  }

  return map[value] || 'Không xác định'
}

function statusClass(value) {
  const map = {
    CHO_XAC_NHAN: 'bg-amber-100 text-amber-700',
    DANG_XU_LY: 'bg-blue-100 text-blue-700',
    DANG_GIAO: 'bg-purple-100 text-purple-700',
    HOAN_THANH: 'bg-green-100 text-green-700',
    DA_HUY: 'bg-red-100 text-red-700',
  }

  return map[value] || 'bg-gray-100 text-gray-700'
}

async function generateQrCode() {
  const value = hoaDon.maQr || hoaDon.maHoaDon

  if (!value) {
    qrCodeUrl.value = ''
    return
  }

  qrCodeUrl.value = await QRCode.toDataURL(value, {
    width: 220,
    margin: 2,
  })
}
async function fetchLichSuHoaDon() {
  const id = route.params.id

  try {
    const res = await api.get(`/lich-su-hoa-don/hoa-don/${id}`)
    lichSuHoaDon.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    console.error('Lỗi tải lịch sử hóa đơn:', error)
    lichSuHoaDon.value = []
  }
}
</script>