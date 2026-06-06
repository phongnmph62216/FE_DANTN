<template>
    <div class="invoice-print max-w-4xl mx-auto bg-white p-8 text-[#0D2533]">
        <div class="flex justify-between items-start border-b pb-4 mb-6">
  <div class="flex items-center gap-4">
 

    <div>
      <h1 class="text-2xl font-bold">HÓA ĐƠN BÁN HÀNG</h1>
      <p class="text-sm mt-1">Mã hóa đơn: {{ hoaDon.maHoaDon }}</p>
      <p class="text-sm">Ngày tạo: {{ formatDate(hoaDon.ngayTao) }}</p>
    </div>
  </div>

  <div class="text-right">
    <h2 class="font-bold text-lg">BEE STYLISH</h2>
    <p class="text-sm">Địa chỉ: 351/6A Phan Đình Phùng, Bảo Lộc</p>
    <p class="text-sm">Hotline: 0123 456 789</p>
     <p class="text-sm">Ngày in: {{ formatDate(new Date()) }}</p>
  </div>
</div>

    <div class="grid grid-cols-2 gap-6 mb-6">
      <div>
        <h3 class="font-bold mb-2">Thông tin khách hàng</h3>
        <p>Khách hàng: {{ hoaDon.tenKhachHang || 'Khách lẻ' }}</p>
        <p>SĐT: {{ hoaDon.soDienThoai || 'Chưa có' }}</p>
        <p>Địa chỉ: {{ hoaDon.diaChiKhachHang || 'Chưa có' }}</p>
      </div>

      <div>
        <h3 class="font-bold mb-2">Thông tin hóa đơn</h3>
        <p>Loại hóa đơn: {{ loaiHoaDonLabel(hoaDon.loaiHoaDon) }}</p>
        <p>Trạng thái: {{ statusLabel(hoaDon.trangThai) }}</p>
        <p>Nhân viên: {{ hoaDon.idNhanVien || 'Chưa có' }}</p>
      </div>
    </div>

    <table class="w-full border-collapse mb-6">
      <thead>
        <tr class="bg-gray-100">
          <th class="border p-2 text-center">STT</th>
          <th class="border p-2 text-left">Mã sản phẩm</th>
          <th class="border p-2 text-right">Đơn giá</th>
          <th class="border p-2 text-center">Số lượng</th>
          <th class="border p-2 text-right">Thành tiền</th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="chiTietHoaDon.length === 0">
          <td colspan="5" class="border p-4 text-center text-gray-500">
            Chưa có sản phẩm trong hóa đơn
          </td>
        </tr>

        <tr v-for="(item, index) in chiTietHoaDon" :key="item.id">
          <td class="border p-2 text-center">{{ index + 1 }}</td>
          <td class="border p-2">{{ item.maChiTietSanPham }}</td>
          <td class="border p-2 text-right">{{ formatCurrency(item.donGia) }}</td>
          <td class="border p-2 text-center">{{ item.soLuong }}</td>
          <td class="border p-2 text-right">{{ formatCurrency(item.thanhTien) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="flex justify-end">
      <div class="w-80 space-y-2">
        <div class="flex justify-between">
          <span>Số tiền gốc:</span>
          <strong>{{ formatCurrency(hoaDon.soTienGoc) }}</strong>
        </div>

        <div class="flex justify-between">
          <span>Giảm giá:</span>
          <strong>-{{ formatCurrency(hoaDon.soTienGiam) }}</strong>
        </div>

        <div class="flex justify-between">
          <span>Phí vận chuyển:</span>
          <strong>{{ formatCurrency(hoaDon.phiVanChuyen) }}</strong>
        </div>

        <div class="border-t pt-2 flex justify-between text-lg">
          <span class="font-bold">Tổng thanh toán:</span>
          <strong>{{ formatCurrency(hoaDon.tongTienThanhToan) }}</strong>
        </div>
      </div>
    </div>

   <div class="mt-6 text-center text-sm italic">
  Cảm ơn quý khách đã mua hàng tại Bee Stylish! Hẹn gặp lại quý khách lần sau.
</div>

    <div class="mt-8 flex justify-center gap-3 print-hidden">
      <button
        @click="goBack"
        class="px-5 py-2.5 bg-gray-200 rounded-xl font-semibold"
      >
        Quay lại
      </button>

      <button
        @click="printPage"
        class="px-5 py-2.5 bg-[#EF972D] text-white rounded-xl font-semibold"
      >
        In hóa đơn
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../../services/api'

const route = useRoute()
const router = useRouter()

const chiTietHoaDon = ref([])

const hoaDon = reactive({
  id: null,
  idNhanVien: null,
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
  ngayTao: null,
})

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  const id = route.params.id

  const hoaDonRes = await api.get(`/hoa-don/${id}`)
  Object.assign(hoaDon, hoaDonRes.data)

  const chiTietRes = await api.get(`/hoa-don-chi-tiet/hoa-don/${id}`)
  chiTietHoaDon.value = Array.isArray(chiTietRes.data) ? chiTietRes.data : []

  setTimeout(() => {
    window.print()
  }, 500)
}

function printPage() {
  window.print()
}

function goBack() {
  router.push(`/hoa-don/${route.params.id}`)
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
  return value === 'ONLINE' ? 'Online' : 'Tại quầy'
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
</script>
<style>
@media print {
  body * {
    visibility: hidden !important;
  }

  .invoice-print,
  .invoice-print * {
    visibility: visible !important;
  }

  .invoice-print {
    position: fixed !important;
    left: 50% !important;
    top: 0 !important;
    transform: translateX(-50%) !important;

    width: 170mm !important;
    max-width: 170mm !important;
    min-height: auto !important;

    padding: 0 !important;
    margin: 0 auto !important;
    box-shadow: none !important;
    background: white !important;
  }

  .print-hidden {
    display: none !important;
  }

  @page {
    size: A4 portrait;
    margin: 15mm;
  }
}
</style>