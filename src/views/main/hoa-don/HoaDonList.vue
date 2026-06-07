<template>
    <div class="max-w-7xl mx-auto space-y-8">
        <div class="flex flex-col gap-6">
            <!-- Page Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-[#0D2533] font-headline-md">
                        Quản lý hóa đơn
                    </h1>
                    <p class="text-sm text-gray-500 mt-1 font-body-md">
                        Tra cứu, theo dõi trạng thái, xem chi tiết và in hóa đơn bán hàng
                    </p>
                </div>

                <div class="flex items-center gap-3">
                    <button @click="fetchInvoices(0)"
                        class="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all font-body-md cursor-pointer">
                        <span class="material-symbols-outlined">refresh</span>
                        Tải lại
                    </button>

                    <button @click="exportExcel"
                        class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer">
                        <span class="material-symbols-outlined">download</span>
                        Xuất Excel
                    </button>

                    <div class="relative">
                        <button @click="optionsOpen = !optionsOpen"
                            class="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center cursor-pointer">
                            <span class="material-symbols-outlined">more_horiz</span>
                        </button>

                        <div v-show="optionsOpen"
                            class="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1">
                            <button type="button"
                                class="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left cursor-pointer"
                                @click="printSelected">
                                <span class="material-symbols-outlined text-sm">print</span>
                                In hóa đơn đã chọn
                            </button>

                            <button type="button"
                                class="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-left cursor-pointer"
                                @click="scanInvoice">
                                <span class="material-symbols-outlined text-sm">qr_code_scanner</span>
                                Quét mã hóa đơn
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Error -->
            <div v-if="errorMessage"
                class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 flex items-start justify-between gap-4">
                <div class="flex items-start gap-2">
                    <span class="material-symbols-outlined text-[20px]">error</span>
                    <p class="text-sm font-medium">
                        {{ errorMessage }}
                    </p>
                </div>

                <button type="button" class="text-red-500 hover:text-red-700 cursor-pointer" @click="errorMessage = ''">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-2xl border border-surface-container shadow-sm p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 font-body-md">Tổng hóa đơn</p>
                            <h3 class="text-2xl font-bold text-[#0D2533] mt-1">
                                {{ summary.total }}
                            </h3>
                        </div>
                        <div class="w-11 h-11 rounded-xl bg-[#EF972D]/10 flex items-center justify-center">
                            <span class="material-symbols-outlined text-[#EF972D]">receipt_long</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl border border-surface-container shadow-sm p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 font-body-md">Chờ xác nhận</p>
                            <h3 class="text-2xl font-bold text-amber-600 mt-1">
                                {{ summary.pending }}
                            </h3>
                        </div>
                        <div class="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                            <span class="material-symbols-outlined text-amber-600">hourglass_top</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl border border-surface-container shadow-sm p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 font-body-md">Hoàn thành</p>
                            <h3 class="text-2xl font-bold text-green-600 mt-1">
                                {{ summary.completed }}
                            </h3>
                        </div>
                        <div class="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
                            <span class="material-symbols-outlined text-green-600">check_circle</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl border border-surface-container shadow-sm p-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 font-body-md">Doanh thu</p>
                            <h3 class="text-xl font-bold text-[#0D2533] mt-1">
                                {{ formatCurrency(summary.revenue) }}
                            </h3>
                        </div>
                        <div class="w-11 h-11 rounded-xl bg-[#0D2533]/10 flex items-center justify-center">
                            <span class="material-symbols-outlined text-[#0D2533]">payments</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <div class="bg-white p-6 rounded-2xl border border-surface-container shadow-sm space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                    <div class="relative xl:col-span-2">
                        <span
                            class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                            search
                        </span>

                        <input v-model="filters.keyword"
                            class="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] text-base transition-all font-body-md"
                            placeholder="Nhập mã hóa đơn, SĐT hoặc tên khách hàng..." type="text" />
                    </div>

                    <input v-model="filters.fromDate" type="date"
                        class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] cursor-pointer font-body-md" />

                    <input v-model="filters.toDate" type="date"
                        class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] cursor-pointer font-body-md" />

                    <input :value="formatInputMoney(filters.minTotal)"
                        @input="filters.minTotal = parseInputMoney($event.target.value)" type="text" inputmode="numeric"
                        class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] font-body-md"
                        placeholder="Từ số tiền" />

                    <input :value="formatInputMoney(filters.maxTotal)"
                        @input="filters.maxTotal = parseInputMoney($event.target.value)" type="text" inputmode="numeric"
                        class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] font-body-md"
                        placeholder="Đến số tiền" />
                </div>
<div class="space-y-4 pt-4 border-t border-gray-100">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <select
        v-model="filters.invoiceType"
        class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] min-w-[170px] cursor-pointer font-body-md"
      >
        <option value="">Tất cả loại hóa đơn</option>
        <option value="TAI_QUAY">Tại quầy</option>
        <option value="ONLINE">Online</option>
      </select>

      <select
        v-model="filters.paymentMethod"
        class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] min-w-[190px] cursor-pointer font-body-md"
      >
        <option value="">Tất cả thanh toán</option>
        <option value="TIEN_MAT">Tiền mặt</option>
        <option value="CHUYEN_KHOAN">Chuyển khoản</option>
        <option value="COD">COD</option>
        <option value="VNPAY">VNPay</option>
      </select>
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
        <span class="material-symbols-outlined text-[18px]">restart_alt</span>
        Đặt lại bộ lọc
      </button>
    </div>
  </div>

 <div class="w-full border-t border-gray-100 pt-4">
  <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
    <button
      v-for="status in statusOptions"
      :key="status.value"
      type="button"
      @click="filters.status = status.value; filterResults()"
      :class="filters.status === status.value
        ? 'bg-[#0D2533] text-white shadow-md border-[#0D2533]'
        : 'bg-white text-gray-600 hover:bg-[#EF972D]/5 border-gray-200'"
      class="h-12 px-4 rounded-xl text-sm font-semibold flex items-center justify-between gap-2 border transition-all"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="material-symbols-outlined text-[20px] shrink-0">
          {{ status.icon }}
        </span>

       <span class="whitespace-nowrap">
  {{ status.label }}
</span>
      </div>

      <span
        :class="filters.status === status.value
          ? 'bg-white/20 text-white'
          : 'bg-[#EF972D]/10 text-[#EF972D]'"
        class="min-w-6 h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
      >
        {{ countByStatus(status.value) }}
      </span>
    </button>
  </div>
</div>
</div>
            </div>

            <!-- Table -->
            <div class="bg-white rounded-xl border border-surface-container shadow-sm overflow-hidden relative">
                <div v-if="isLoading" class="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                    <span class="animate-spin material-symbols-outlined text-3xl text-[#EF972D]">
                        progress_activity
                    </span>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 border-b border-gray-100">
                            <tr class="text-on-surface-variant font-label-sm text-xs uppercase tracking-wider">
                                <th class="px-6 py-4">
                                    <input type="checkbox" v-model="selectAll" @change="toggleSelectAll"
                                        class="w-4 h-4 accent-[#EF972D] cursor-pointer" />
                                </th>
                                <th class="px-6 py-4">STT</th>
                                <th class="px-6 py-4">Mã hóa đơn</th>
                                <th class="px-6 py-4">Khách hàng</th>
                                <th class="px-6 py-4">Loại</th>
                                <th class="px-6 py-4">Thanh toán</th>
                                <th class="px-6 py-4 text-right">Tổng tiền</th>
                                <th class="px-6 py-4">Ngày tạo</th>
                                <th class="px-6 py-4">Trạng thái</th>
                                <th class="px-6 py-4 text-center">Hành động</th>
                            </tr>
                        </thead>

                        <tbody class="divide-y divide-gray-100">
                            <tr v-if="!isLoading && filteredInvoices.length === 0">
                                <td colspan="10" class="px-6 py-12 text-center">
                                    <div class="flex flex-col items-center gap-2 text-gray-500">
                                        <div
                                            class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                            <span
                                                class="material-symbols-outlined text-3xl text-gray-400">receipt_long</span>
                                        </div>
                                        <p class="font-body-md">
                                            Không có hóa đơn phù hợp bộ lọc.
                                        </p>
                                    </div>
                                </td>
                            </tr>

                            <tr v-for="(invoice, idx) in filteredInvoices" :key="invoice.id"
                                class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4">
                                    <input type="checkbox" :value="invoice.id" v-model="selectedInvoiceIds"
                                        class="w-4 h-4 accent-[#EF972D] cursor-pointer" />
                                </td>

                                <td class="px-6 py-4 text-sm text-gray-500">
                                    {{ currentPage * pageSize + idx + 1 }}
                                </td>

                                <td class="px-6 py-4">
                                    <div>
                                        <p class="text-sm font-bold text-[#EF972D]">
                                            {{ invoice.maHoaDon }}
                                        </p>
                                        <p class="text-xs text-gray-400 mt-0.5">
                                            NV: {{ invoice.idNhanVien || 'Chưa có' }}
                                        </p>
                                    </div>
                                </td>

                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="w-9 h-9 rounded-full bg-[#0D2533]/10 flex items-center justify-center">
                                            <span class="material-symbols-outlined text-[#0D2533] text-lg">person</span>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-on-surface">
                                                {{ invoice.tenKhachHang || 'Khách lẻ' }}
                                            </p>
                                            <p class="text-xs text-gray-500">
                                                {{ invoice.soDienThoai || 'Chưa có SĐT' }}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                <td class="px-6 py-4">
                                    <span :class="invoice.loaiHoaDon === 'ONLINE'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-[#EF972D]/10 text-[#EF972D]'"
                                        class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase">
                                        {{ loaiHoaDonLabel(invoice.loaiHoaDon) }}
                                    </span>
                                </td>

                               <td class="px-6 py-4">
  <div
    :class="invoice.phuongThucThanhToan
      ? 'bg-blue-50 text-blue-700'
      : 'bg-gray-100 text-gray-500'"
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
  >
    <span class="material-symbols-outlined text-[16px]">
      {{ paymentIcon(invoice.phuongThucThanhToan) }}
    </span>
    {{ paymentLabel(invoice.phuongThucThanhToan) }}
  </div>
</td>

                                <td class="px-6 py-4 text-sm text-right font-bold text-[#0D2533]">
                                    {{ formatCurrency(invoice.tongTienThanhToan) }}
                                </td>

                                <td class="px-6 py-4 text-sm text-gray-600">
                                    {{ formatDate(invoice.ngayTao) }}
                                </td>

                                <td class="px-6 py-4">
                                    <span :class="statusClass(invoice.trangThai)"
                                        class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase whitespace-nowrap">
                                        {{ statusLabel(invoice.trangThai) }}
                                    </span>
                                </td>

                                <td class="px-6 py-4">
                                    <div class="flex items-center justify-center gap-1">
                                        <button type="button"
                                            class="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-[#0D2533] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                            title="Xem chi tiết" @click="viewInvoice(invoice)">
                                            <span class="material-symbols-outlined text-xl">visibility</span>
                                        </button>

                                        <button type="button"
                                            class="w-9 h-9 flex items-center justify-center text-[#EF972D] hover:bg-[#EF972D]/10 rounded-lg transition-colors cursor-pointer"
                                            title="In hóa đơn" @click="printInvoice(invoice)">
                                            <span class="material-symbols-outlined text-xl">print</span>
                                        </button>

                                        <button
                                            v-if="invoice.trangThai !== 'HOAN_THANH' && invoice.trangThai !== 'DA_HUY'"
                                            type="button"
                                            class="w-9 h-9 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                            title="Hủy hóa đơn" @click="cancelInvoice(invoice)">
                                            <span class="material-symbols-outlined text-xl">cancel</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-if="totalPages > 1"
                    class="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                    <span>{{ paginationLabel }}</span>

                    <div class="flex gap-1">
                        <button type="button"
                            class="p-2 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
                            :disabled="currentPage === 0" @click="fetchInvoices(currentPage - 1)">
                            <span class="material-symbols-outlined">chevron_left</span>
                        </button>

                        <span class="px-3 py-2 font-semibold text-[#EF972D]">
                            {{ currentPage + 1 }} / {{ totalPages }}
                        </span>

                        <button type="button"
                            class="p-2 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
                            :disabled="currentPage + 1 >= totalPages" @click="fetchInvoices(currentPage + 1)">
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

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../../services/api'
import { confirmAction, showToast, showErrorToast } from '../../../utils/alert'
import QRCode from 'qrcode'

const router = useRouter()

const optionsOpen = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const selectAll = ref(false)
const selectedInvoiceIds = ref([])

const currentPage = ref(0)
const pageSize = ref(10)
const totalElements = ref(0)
const totalPages = ref(1)

const invoices = ref([])

const filters = reactive({
    keyword: '',
    fromDate: '',
    toDate: '',
    minTotal: '',
    maxTotal: '',
    invoiceType: '',
    paymentMethod: '',
    status: 'all',
})

const statusOptions = [
    { value: 'all', label: 'Tất cả', icon: 'receipt_long' },
    { value: 'CHO_XAC_NHAN', label: 'Chờ xác nhận', icon: 'hourglass_top' },
    { value: 'DANG_XU_LY', label: 'Đang xử lý', icon: 'inventory' },
    { value: 'DANG_GIAO', label: 'Đang giao', icon: 'local_shipping' },
    { value: 'HOAN_THANH', label: 'Hoàn thành', icon: 'check_circle' },
    { value: 'DA_HUY', label: 'Đã hủy', icon: 'cancel' },
]

const summary = reactive({
    total: 0,
    pending: 0,
    completed: 0,
    revenue: 0,
})

const filteredInvoices = computed(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    const minTotal = filters.minTotal !== '' ? Number(filters.minTotal) : null
    const maxTotal = filters.maxTotal !== '' ? Number(filters.maxTotal) : null

    return invoices.value.filter((item) => {
        const matchKeyword =
            !keyword ||
            String(item.maHoaDon || '').toLowerCase().includes(keyword) ||
            String(item.tenKhachHang || '').toLowerCase().includes(keyword) ||
            String(item.soDienThoai || '').toLowerCase().includes(keyword)

        const matchType = !filters.invoiceType || item.loaiHoaDon === filters.invoiceType

        const matchPayment =
            !filters.paymentMethod ||
            item.phuongThucThanhToan === filters.paymentMethod ||
            !item.phuongThucThanhToan

        const matchStatus = filters.status === 'all' || item.trangThai === filters.status

        const tongTien = Number(item.tongTienThanhToan || 0)
        const matchMinTotal = minTotal === null || tongTien >= minTotal
        const matchMaxTotal = maxTotal === null || tongTien <= maxTotal

        const ngayTao = item.ngayTao ? new Date(item.ngayTao) : null
        const fromDate = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null
        const toDate = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null

        const matchFromDate = !fromDate || (ngayTao && ngayTao >= fromDate)
        const matchToDate = !toDate || (ngayTao && ngayTao <= toDate)

        return (
            matchKeyword &&
            matchType &&
            matchPayment &&
            matchStatus &&
            matchMinTotal &&
            matchMaxTotal &&
            matchFromDate &&
            matchToDate
        )
    })
})
function countByStatus(status) {
    const data = invoices.value.filter((item) => {
        const keyword = filters.keyword.trim().toLowerCase()
        const minTotal = filters.minTotal !== '' ? Number(filters.minTotal) : null
        const maxTotal = filters.maxTotal !== '' ? Number(filters.maxTotal) : null

        const matchKeyword =
            !keyword ||
            String(item.maHoaDon || '').toLowerCase().includes(keyword) ||
            String(item.tenKhachHang || '').toLowerCase().includes(keyword) ||
            String(item.soDienThoai || '').toLowerCase().includes(keyword)

        const matchType = !filters.invoiceType || item.loaiHoaDon === filters.invoiceType

        const matchPayment =
            !filters.paymentMethod ||
            item.phuongThucThanhToan === filters.paymentMethod ||
            !item.phuongThucThanhToan

        const tongTien = Number(item.tongTienThanhToan || 0)
        const matchMinTotal = minTotal === null || tongTien >= minTotal
        const matchMaxTotal = maxTotal === null || tongTien <= maxTotal

        const ngayTao = item.ngayTao ? new Date(item.ngayTao) : null
        const fromDate = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null
        const toDate = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null

        const matchFromDate = !fromDate || (ngayTao && ngayTao >= fromDate)
        const matchToDate = !toDate || (ngayTao && ngayTao <= toDate)

        return (
            matchKeyword &&
            matchType &&
            matchPayment &&
            matchMinTotal &&
            matchMaxTotal &&
            matchFromDate &&
            matchToDate
        )
    })

    if (status === 'all') {
        return data.length
    }

    return data.filter((item) => item.trangThai === status).length
}
const paginationLabel = computed(() => {
  if (!filteredInvoices.value.length) {
    return 'Hiển thị 0 hóa đơn'
  }

  return `Hiển thị ${filteredInvoices.value.length} hóa đơn phù hợp`
})

onMounted(() => {
    fetchInvoices()
})
async function fetchInvoices(page = 0) {
  const pageNumber = typeof page === 'number' ? page : 0

  currentPage.value = pageNumber
    isLoading.value = true
    errorMessage.value = ''

    try {
        const res = await api.get('/hoa-don')

        invoices.value = Array.isArray(res.data) ? res.data : []

        totalElements.value = invoices.value.length
        totalPages.value = 1

        clearSelected()
        tinhTongQuan()
    } catch (error) {
        console.error('Lỗi tải danh sách hóa đơn:', error)

        invoices.value = []
        totalElements.value = 0
        totalPages.value = 1

        clearSelected()
        resetSummary()

        errorMessage.value = getErrorMessage(error, 'Không thể tải danh sách hóa đơn')
    } finally {
        isLoading.value = false
    }
}
function tinhTongQuan() {
    const data = filteredInvoices.value

    summary.total = data.length

    summary.pending = data.filter((item) => {
        return item.trangThai === 'CHO_XAC_NHAN'
    }).length

    summary.completed = data.filter((item) => {
        return item.trangThai === 'HOAN_THANH'
    }).length

    summary.revenue = data
        .filter((item) => {
            return item.trangThai === 'HOAN_THANH'
        })
        .reduce((sum, item) => {
            return sum + Number(item.tongTienThanhToan || 0)
        }, 0)
}

function resetSummary() {
    summary.total = 0
    summary.pending = 0
    summary.completed = 0
    summary.revenue = 0
}

function filterResults() {
    clearSelected()
    tinhTongQuan()
}
watch(
  filteredInvoices,
  () => {
    tinhTongQuan()
    clearSelected()
  },
  { immediate: true }
)
function resetFilters() {
    filters.keyword = ''
    filters.fromDate = ''
    filters.toDate = ''
    filters.minTotal = ''
    filters.maxTotal = ''
    filters.invoiceType = ''
    filters.paymentMethod = ''
    filters.status = 'all'

    clearSelected()
    tinhTongQuan()
}
function clearSelected() {
    selectAll.value = false
    selectedInvoiceIds.value = []
}

function toggleSelectAll() {
    selectedInvoiceIds.value = selectAll.value
        ? filteredInvoices.value.map((item) => item.id)
        : []
}

function viewInvoice(invoice) {
    router.push(`/hoa-don/${invoice.id}`)
}
function printInvoice(invoice) {
    router.push(`/hoa-don/${invoice.id}/in`)
}

async function cancelInvoice(invoice) {
    if (!invoice || !invoice.id) {
        showErrorToast('Không tìm thấy hóa đơn cần hủy')
        return
    }

    const result = await confirmAction({
        title: 'Hủy hóa đơn?',
        text: `Bạn có chắc chắn muốn hủy hóa đơn ${invoice.maHoaDon} không?`,
        confirmButtonText: 'Hủy hóa đơn',
        cancelButtonText: 'Không hủy',
        icon: 'warning',
    })

    if (!result.isConfirmed) {
        return
    }

    try {
        isLoading.value = true
        errorMessage.value = ''

        await api.put(`/hoa-don/${invoice.id}/huy`, {
            ghiChu: 'Hủy hóa đơn từ giao diện quản lý hóa đơn',
        })

        await fetchInvoices(currentPage.value)
        showToast({ title: 'Hủy hóa đơn thành công!' })
    } catch (error) {
        console.error('Lỗi hủy hóa đơn:', error)
        errorMessage.value = getErrorMessage(error, 'Không thể hủy hóa đơn')
        showErrorToast('Không thể hủy hóa đơn')
    } finally {
        isLoading.value = false
    }
}
async function exportExcel() {
    const result = await confirmAction({
        title: 'Xuất Excel?',
        text: 'Bạn có chắc chắn muốn xuất danh sách hóa đơn ra Excel không?',
        confirmButtonText: 'Xuất Excel',
        icon: 'question',
    })

    if (!result.isConfirmed) return

    try {
        isLoading.value = true
        errorMessage.value = ''

        const res = await api.get('/hoa-don/export-excel', {
            responseType: 'blob',
        })

        const url = window.URL.createObjectURL(new Blob([res.data]))
        const link = document.createElement('a')

        link.href = url
        link.setAttribute('download', `hoa-don-${new Date().getTime()}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()

        window.URL.revokeObjectURL(url)

        showToast({ title: 'Xuất Excel thành công!' })
    } catch (error) {
        console.error('Lỗi xuất Excel:', error)
        errorMessage.value = getErrorMessage(error, 'Xuất Excel thất bại')
        showErrorToast('Xuất Excel thất bại')
    } finally {
        isLoading.value = false
    }
}

function scanInvoice() {
    optionsOpen.value = false
    router.push('/hoa-don/quet-qr')
}
function printSelected() {
    optionsOpen.value = false

    if (!selectedInvoiceIds.value.length) {
        showErrorToast('Vui lòng chọn ít nhất một hóa đơn để in')
        return
    }

    if (selectedInvoiceIds.value.length > 1) {
        showErrorToast('Hiện tại chỉ hỗ trợ in từng hóa đơn. Vui lòng chọn 1 hóa đơn.')
        return
    }

    const id = selectedInvoiceIds.value[0]
    router.push(`/hoa-don/${id}/in`)
}

function getErrorMessage(error, defaultMessage) {
    return error?.response?.data?.message || error?.message || defaultMessage
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

function paymentLabel(value) {
    const map = {
        TIEN_MAT: 'Tiền mặt',
        CHUYEN_KHOAN: 'Chuyển khoản',
        COD: 'COD',
        VNPAY: 'VNPay',
    }

    return map[value] || 'Chưa có'
}

function paymentIcon(value) {
    const map = {
        TIEN_MAT: 'payments',
        CHUYEN_KHOAN: 'account_balance',
        COD: 'local_shipping',
        VNPAY: 'qr_code',
    }

    return map[value] || 'paid'
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
function parseInputMoney(value) {
    return String(value || '').replace(/\D/g, '')
}

function formatInputMoney(value) {
    if (value === '' || value === null || value === undefined) {
        return ''
    }

    return new Intl.NumberFormat('vi-VN').format(Number(value))
}
</script>