<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { Line } from '@antv/g2plot'
import api from '@/services/api'
import { formatCurrency } from '@/utils/format'

// Loading states
const loadingOverview = ref(false)
const loadingChart = ref(false)
const loadingDetails = ref(false)

// State data (Initial zero states)
const overviewData = ref({
  homNay: { doanhThu: 0, soSanPhamDaBan: 0, soDonHang: 0, hoanThanh: 0, huy: 0, dangXuLy: 0 },
  tuanNay: { doanhThu: 0, soSanPhamDaBan: 0, soDonHang: 0, hoanThanh: 0, huy: 0, dangXuLy: 0 },
  thangNay: { doanhThu: 0, soSanPhamDaBan: 0, soDonHang: 0, hoanThanh: 0, huy: 0, dangXuLy: 0 },
  namNay: { doanhThu: 0, soSanPhamDaBan: 0, soDonHang: 0, hoanThanh: 0, huy: 0, dangXuLy: 0 }
})
const chartDataRaw = ref([])
const detailsData = ref({
  topBanChay: [],
  topKhachHang: [],
  banChamTonKho: [],
  trangThaiDonHang: {},
  sanPhamDaBan: [],
  thongKeTien: { tienMat: 0, chuyenKhoan: 0, vnpay: 0, tongTien: 0 }
})

// Filter states
const selectedYear = ref(new Date().getFullYear())
const showComparison = ref(true)
const startDate = ref(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0])
const endDate = ref(new Date().toISOString().split('T')[0])
const startTime = ref('00:00:00')
const endTime = ref('23:59:59')

// Custom Chart Filter & Comparison States
const chartFilterType = ref('year') // 'year', 'month', 'day'
const chartValueA = ref(new Date().getFullYear().toString())
const chartValueB = ref('') // Comparison period, empty when inactive

// Modal States
const showComparisonModal = ref(false)
const modalFilterType = ref('year')
const modalValueA = ref(new Date().getFullYear().toString())
const modalValueB = ref((new Date().getFullYear() - 1).toString())

// Auto Email Report States & Controls
const autoEmailEnabled = ref(localStorage.getItem('auto_email_report') !== 'false')
const managerEmail = ref(localStorage.getItem('manager_email') || 'minhphong26012006@gmail.com')
const showEmailModal = ref(false)
const isSendingEmail = ref(false)
const emailReportType = ref('today') // 'today', 'week', 'month'

// Toast notification alert state
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 5000)
}

const toggleAutoEmail = () => {
  autoEmailEnabled.value = !autoEmailEnabled.value
  localStorage.setItem('auto_email_report', autoEmailEnabled.value ? 'true' : 'false')
  if (autoEmailEnabled.value) {
    showToast(`Đã BẬT tự động gửi báo cáo doanh thu thực tế tới Email Quản lý: ${managerEmail.value}!`, 'success')
  } else {
    showToast(`Đã TẮT tự động gửi báo cáo doanh thu cho Quản lý.`, 'info')
  }
}

const openSendEmailModal = () => {
  showEmailModal.value = true
}

// Direct Instant Email Report Sender from Manager Panel Button
const triggerSendEmailReportDirect = async () => {
  const targetEmail = managerEmail.value.trim()
  if (!targetEmail) {
    showToast('Vui lòng nhập địa chỉ Email của Quản lý!', 'error')
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(targetEmail)) {
    showToast('Địa chỉ Email không đúng định dạng (Ví dụ: quanly@gmail.com)!', 'error')
    return
  }

  isSendingEmail.value = true
  try {
    const rType = emailReportType.value || 'today'
    let selectedPeriod = overviewData.value?.homNay
    if (rType === 'week') selectedPeriod = overviewData.value?.tuanNay
    if (rType === 'month') selectedPeriod = overviewData.value?.thangNay

    const realRevenue = selectedPeriod?.doanhThu ?? 0
    const realOrders = selectedPeriod?.soDonHang ?? 0
    const realCompleted = selectedPeriod?.hoanThanh ?? 0
    const realProducts = selectedPeriod?.soSanPhamDaBan ?? 0
    const realCash = detailsData.value?.thongKeTien?.tienMat ?? 0
    const realTransfer = detailsData.value?.thongKeTien?.chuyenKhoan ?? 0
    const realVnpay = detailsData.value?.thongKeTien?.vnpay ?? 0

    localStorage.setItem('manager_email', targetEmail)

    // Call Backend API Endpoint
    await api.post('/api/v1/thong-ke/send-email-report', {
      email: targetEmail,
      type: rType,
      doanhThu: realRevenue,
      soDonHang: realOrders,
      hoanThanh: realCompleted,
      soSanPham: realProducts,
      tienMat: realCash,
      chuyenKhoan: realTransfer,
      vnpay: realVnpay
    })
    
    showToast(`Đã gửi báo cáo Doanh Thu (${formatCurrency(realRevenue)}) thành công tới Email: ${targetEmail}!`, 'success')
    showEmailModal.value = false
  } catch (e) {
    console.error('Error sending email report:', e)
    showToast('Có lỗi xảy ra khi gửi email báo cáo!', 'error')
  } finally {
    isSendingEmail.value = false
  }
}

// Robust Date Parser Supporting ALL Formats (Vietnamese DD/MM/YYYY, ISO YYYY-MM-DD, Jackson Array [YYYY, M, D, H, m, s])
const parseDateRobust = (val) => {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  if (Array.isArray(val)) {
    return new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0, val[5] || 0)
  }
  if (typeof val === 'number') return new Date(val)
  if (typeof val === 'string') {
    const str = val.trim()
    // Match DD/MM/YYYY or DD-MM-YYYY HH:mm:ss
    const matchDDMM = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/)
    if (matchDDMM) {
      const day = parseInt(matchDDMM[1], 10)
      const month = parseInt(matchDDMM[2], 10) - 1
      const year = parseInt(matchDDMM[3], 10)
      const hour = parseInt(matchDDMM[4] || '0', 10)
      const min = parseInt(matchDDMM[5] || '0', 10)
      const sec = parseInt(matchDDMM[6] || '0', 10)
      return new Date(year, month, day, hour, min, sec)
    }
    // Match YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const matchYYYYMM = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/)
    if (matchYYYYMM) {
      const year = parseInt(matchYYYYMM[1], 10)
      const month = parseInt(matchYYYYMM[2], 10) - 1
      const day = parseInt(matchYYYYMM[3], 10)
      const hour = parseInt(matchYYYYMM[4] || '0', 10)
      const min = parseInt(matchYYYYMM[5] || '0', 10)
      const sec = parseInt(matchYYYYMM[6] || '0', 10)
      return new Date(year, month, day, hour, min, sec)
    }
    const d = new Date(str)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

const formatLabel = (val) => {
  if (!val) return ''
  if (chartFilterType.value === 'year') {
    return val
  } else if (chartFilterType.value === 'month') {
    const parts = val.split('-')
    if (parts.length === 2) {
      return `${parts[1]}/${parts[0]}`
    }
    return val
  } else {
    const parts = val.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return val
  }
}

// Chart DOM reference and instance
const chartContainer = ref(null)
let chartInstance = null

// Formatter utilities
const formatNumber = (value) => {
  if (value === undefined || value === null) return '0'
  return new Intl.NumberFormat('vi-VN').format(value)
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

// Combined Fetch Function: Syncs Backend Statistics API
const fetchOverviewAndDetails = async () => {
  loadingOverview.value = true
  loadingDetails.value = true

  try {
    const tuNgayStr = `${startDate.value}T00:00:00`
    const denNgayStr = `${endDate.value}T23:59:59`

    const [overviewRes, detailsRes] = await Promise.all([
      api.get('/api/v1/thong-ke/tong-quan').catch(() => null),
      api.get(`/api/v1/thong-ke/chi-tiet?tuNgay=${tuNgayStr}&denNgay=${denNgayStr}&tuGio=${startTime.value || '00:00:00'}&denGio=${endTime.value || '23:59:59'}`).catch(() => null)
    ])

    if (overviewRes && overviewRes.data) {
      overviewData.value = overviewRes.data
    }

    if (detailsRes && detailsRes.data) {
      detailsData.value = {
        topBanChay: detailsRes.data.topBanChay || [],
        topKhachHang: detailsRes.data.topKhachHang || [],
        banChamTonKho: detailsRes.data.banChamTonKho || [],
        trangThaiDonHang: detailsRes.data.trangThaiDonHang || {},
        sanPhamDaBan: detailsRes.data.sanPhamDaBan || [],
        thongKeTien: detailsRes.data.thongKeTien || { tienMat: 0, chuyenKhoan: 0, vnpay: 0, tongTien: 0 }
      }
    }
  } catch (err) {
    console.error('Error fetching overview & details:', err)
  } finally {
    loadingOverview.value = false
    loadingDetails.value = false
  }
}

// Fetch REAL Chart Data from Backend API
const fetchChartData = async () => {
  loadingChart.value = true
  try {
    const url = `/api/v1/thong-ke/doanh-thu-bieu-do?type=${chartFilterType.value}&valueA=${chartValueA.value}&valueB=${chartValueB.value}`
    const res = await api.get(url)
    if (res.data && Array.isArray(res.data)) {
      chartDataRaw.value = res.data
    } else {
      chartDataRaw.value = []
    }
    updateChart()
  } catch (error) {
    console.error('Error fetching chart stats from API:', error)
    chartDataRaw.value = []
    updateChart()
  } finally {
    loadingChart.value = false
  }
}

// Render/Update G2Plot Line Chart
const updateChart = () => {
  nextTick(() => {
    if (!chartContainer.value) return

    let displayData = chartDataRaw.value || []

    if (chartInstance) {
      chartInstance.changeData(displayData)
      return
    }

    chartInstance = new Line(chartContainer.value, {
      data: displayData,
      xField: 'label',
      yField: 'value',
      seriesField: 'type',
      smooth: true,
      padding: 'auto',
      color: ['#EF972D', '#22C55E'],
      lineStyle: ({ type }) => {
        if (type.includes('So sánh')) {
          return {
            lineDash: [4, 4],
            lineWidth: 2,
          }
        }
        return {
          lineWidth: 3.5,
        }
      },
      point: {
        size: 4,
        style: ({ type }) => {
          return {
            fill: 'white',
            stroke: type.includes('So sánh') ? '#22C55E' : '#EF972D',
            lineWidth: 2,
          }
        }
      },
      tooltip: {
        showMarkers: true,
        formatter: (datum) => {
          return { name: datum.type, value: formatCurrency(datum.value) }
        }
      },
      legend: false,
    })

    chartInstance.render()
  })
}

// Calculation values for summary texts
const totalRevenueCurrentPeriod = ref(0)
watch(chartDataRaw, (newVal) => {
  if (!newVal) {
    totalRevenueCurrentPeriod.value = 0
    return
  }
  const primarySeries = newVal.filter(item => item.type && !item.type.includes('So sánh'))
  totalRevenueCurrentPeriod.value = primarySeries.reduce((acc, curr) => acc + (curr.value || 0), 0)
}, { immediate: true, deep: true })

const handleChartFilterChange = () => {
  chartValueB.value = ''
  if (chartFilterType.value === 'year') {
    chartValueA.value = new Date().getFullYear().toString()
  } else if (chartFilterType.value === 'month') {
    chartValueA.value = new Date().toISOString().substring(0, 7)
  } else {
    chartValueA.value = new Date().toISOString().split('T')[0]
  }
  fetchChartData()
}

const handleValueAChange = () => {
  fetchChartData()
}

const openComparisonModal = () => {
  modalFilterType.value = chartFilterType.value
  modalValueA.value = chartValueA.value
  
  if (modalFilterType.value === 'year') {
    modalValueB.value = (parseInt(modalValueA.value) - 1).toString()
  } else if (modalFilterType.value === 'month') {
    const d = new Date(modalValueA.value + '-01')
    d.setMonth(d.getMonth() - 1)
    modalValueB.value = d.toISOString().substring(0, 7)
  } else {
    const d = new Date(modalValueA.value)
    d.setDate(d.getDate() - 1)
    modalValueB.value = d.toISOString().split('T')[0]
  }
  
  showComparisonModal.value = true
}

const applyComparison = () => {
  chartFilterType.value = modalFilterType.value
  chartValueA.value = modalValueA.value
  chartValueB.value = modalValueB.value
  showComparisonModal.value = false
  fetchChartData()
}

const clearComparison = () => {
  chartValueB.value = ''
  fetchChartData()
}

const handleFilter = () => {
  fetchOverviewAndDetails()
}

const handleReset = () => {
  startDate.value = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  endDate.value = new Date().toISOString().split('T')[0]
  startTime.value = '00:00:00'
  endTime.value = '23:59:59'
  fetchOverviewAndDetails()
}

onMounted(() => {
  fetchOverviewAndDetails()
  fetchChartData()
})
</script>

<template>
  <div class="space-y-6 pb-12 text-[#0D2533]">
    <!-- Header Title & Quick Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#EF972D] border border-orange-100">
          <span class="material-symbols-outlined text-2xl">insights</span>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-[#0D2533]">Thống kê Bán hàng</h1>
          <p class="text-xs text-gray-400 font-medium">Doanh thu tính chính xác từ Hóa đơn đã hoàn thành (Khớp 100% với màn Danh sách Hóa đơn)</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="openSendEmailModal"
          class="bg-[#EF972D] hover:bg-orange-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <span class="material-symbols-outlined text-base">mail</span>
          <span>Tùy chỉnh báo cáo qua Email</span>
        </button>
      </div>
    </div>

    <!-- Manager's Today Revenue Dashboard & Email Automation Toggle Panel (REAL DATA ONLY) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Today Revenue Card for Manager -->
      <div class="lg:col-span-7 bg-white p-6 rounded-2xl border border-orange-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[#EF972D] text-2xl">today</span>
              <h2 class="text-base font-bold text-[#0D2533]">DOANH THU HÔM NAY CHO QUẢN LÝ</h2>
            </div>
            <span class="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Khớp danh sách hóa đơn
            </span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-baseline gap-3">
            <span class="text-3xl font-black text-[#0D2533]">
              {{ formatCurrency(overviewData?.homNay?.doanhThu ?? 0) }}
            </span>
            <span v-if="(overviewData?.homNay?.hoanThanh ?? 0) > 0" class="text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">trending_up</span>
              Đã hoàn thành {{ overviewData?.homNay?.hoanThanh }} hóa đơn hôm nay
            </span>
            <span v-else class="text-gray-400 text-xs font-medium bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">schedule</span>
              Chưa có hóa đơn hoàn thành hôm nay
            </span>
          </div>

          <!-- Channel Payment Breakdown -->
          <div class="grid grid-cols-3 gap-3 pt-2">
            <div class="bg-gray-50/80 p-3 rounded-xl border border-gray-100 text-center">
              <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tiền mặt</span>
              <span class="text-sm font-bold text-gray-800 mt-1 block">
                {{ formatCurrency(detailsData?.thongKeTien?.tienMat ?? 0) }}
              </span>
            </div>
            <div class="bg-gray-50/80 p-3 rounded-xl border border-gray-100 text-center">
              <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Chuyển khoản</span>
              <span class="text-sm font-bold text-gray-800 mt-1 block">
                {{ formatCurrency(detailsData?.thongKeTien?.chuyenKhoan ?? 0) }}
              </span>
            </div>
            <div class="bg-gray-50/80 p-3 rounded-xl border border-gray-100 text-center">
              <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">VNPAY</span>
              <span class="text-sm font-bold text-gray-800 mt-1 block">
                {{ formatCurrency(detailsData?.thongKeTien?.vnpay ?? 0) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Today Summary metrics bar -->
        <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
          <div>Hóa đơn phát sinh: <span class="font-bold text-[#0D2533]">{{ overviewData?.homNay?.soDonHang ?? 0 }} hóa đơn</span></div>
          <div>Sản phẩm bán: <span class="font-bold text-[#0D2533]">{{ overviewData?.homNay?.soSanPhamDaBan ?? 0 }} sản phẩm</span></div>
          <div>Hoàn thành: <span class="font-bold text-emerald-600">{{ overviewData?.homNay?.hoanThanh ?? 0 }}</span></div>
        </div>
      </div>

      <!-- Automated Email Control Panel Card -->
      <div class="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
            <span class="material-symbols-outlined text-[#EF972D]">mark_email_read</span>
            <h3 class="font-bold text-[#0D2533] text-base">GỬI EMAIL BÁO CÁO CHO QUẢN LÝ</h3>
          </div>

          <p class="text-xs text-gray-500 leading-relaxed mb-3">
            Bật tính năng tự động gửi báo cáo doanh thu hóa đơn thực tế cuối ngày qua Email cho Quản lý.
          </p>

          <!-- Toggle Switch Container -->
          <div class="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-between mb-3">
            <div class="flex flex-col">
              <span class="text-xs font-bold text-gray-800">Tự động gửi email báo cáo</span>
              <span class="text-[11px] text-gray-400 mt-0.5">Gửi tổng hợp lúc 23:00 hàng ngày</span>
            </div>

            <!-- Toggle Switch -->
            <button
              @click="toggleAutoEmail"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none border-none"
              :class="autoEmailEnabled ? 'bg-[#EF972D]' : 'bg-gray-300'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                :class="autoEmailEnabled ? 'translate-x-6' : 'translate-x-1'"
              ></span>
            </button>
          </div>

          <!-- Email Input -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500">Email Quản lý nhận báo cáo</label>
            <input
              v-model="managerEmail"
              type="email"
              placeholder="quanly@beesports.vn"
              class="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#EF972D] focus:border-[#EF972D] outline-none"
            />
          </div>
        </div>

        <button
          @click="triggerSendEmailReportDirect"
          :disabled="isSendingEmail"
          class="w-full bg-[#EF972D] hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <span v-if="isSendingEmail" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span v-else class="material-symbols-outlined text-sm">send</span>
          <span>{{ isSendingEmail ? 'Đang gửi email báo cáo...' : 'Gửi email báo cáo doanh thu ngay' }}</span>
        </button>
      </div>
    </div>

    <!-- Summary Row (Today, Week, Month, Year) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <div 
        v-for="(stats, key) in { 
          homNay: { title: 'Hôm nay', data: overviewData?.homNay, color: 'border-t-[#1E88E5]' },
          tuanNay: { title: 'Tuần này', data: overviewData?.tuanNay, color: 'border-t-[#8E24AA]' },
          thangNay: { title: 'Tháng này', data: overviewData?.thangNay, color: 'border-t-[#43A047]' },
          namNay: { title: 'Năm nay', data: overviewData?.namNay, color: 'border-t-[#FFB300]' }
        }" 
        :key="key"
        class="bg-white p-5 rounded-2xl border-t-4 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300"
        :class="stats.color"
      >
        <div>
          <span class="text-xs text-gray-500 font-bold uppercase tracking-wider">{{ stats.title }}</span>
          <div class="text-2xl font-bold mt-2 text-[#0D2533]">
            {{ formatCurrency(stats.data?.doanhThu ?? 0) }}
          </div>
          <p class="text-xs text-gray-400 mt-1 font-medium">
            Sản phẩm đã bán <span class="text-[#0D2533] font-bold">{{ stats.data?.soSanPhamDaBan ?? 0 }}</span> &bull; Hóa đơn <span class="text-[#0D2533] font-bold">{{ stats.data?.soDonHang ?? 0 }}</span>
          </p>
        </div>
        
        <!-- Status Box Grid -->
        <div class="grid grid-cols-3 gap-2 mt-4">
          <div class="bg-green-50 p-2 rounded-lg text-center border border-green-100">
            <span class="block text-[10px] text-green-700 font-bold uppercase">Hoàn thành</span>
            <span class="text-sm font-bold text-green-800">{{ stats.data?.hoanThanh ?? 0 }}</span>
          </div>
          <div class="bg-red-50 p-2 rounded-lg text-center border border-red-100">
            <span class="block text-[10px] text-red-700 font-bold uppercase">Hủy</span>
            <span class="text-sm font-bold text-red-800">{{ stats.data?.huy ?? 0 }}</span>
          </div>
          <div class="bg-blue-50 p-2 rounded-lg text-center border border-blue-100">
            <span class="block text-[10px] text-blue-700 font-bold uppercase">Xử lý</span>
            <span class="text-sm font-bold text-blue-800">{{ stats.data?.dangXuLy ?? 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Chart Section Card -->
    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <!-- Title & Time Filters -->
        <div class="flex items-center gap-3 flex-wrap">
          <span class="material-symbols-outlined text-[#EF972D]">bar_chart</span>
          <span class="font-bold text-[#0D2533] text-lg">Biểu đồ doanh thu thực tế</span>
          <select 
            v-model="chartFilterType" 
            @change="handleChartFilterChange"
            class="border border-gray-200 rounded-lg px-2.5 py-1 text-sm bg-white font-medium focus:outline-none focus:ring-1 focus:ring-[#EF972D] cursor-pointer"
          >
            <option value="year">Theo năm</option>
            <option value="month">Theo tháng</option>
            <option value="day">Theo ngày</option>
          </select>
          
          <!-- Year Selector -->
          <select 
            v-if="chartFilterType === 'year'"
            v-model="chartValueA" 
            @change="handleValueAChange"
            class="border border-gray-200 rounded-lg px-2.5 py-1 text-sm bg-white font-medium focus:outline-none focus:ring-1 focus:ring-[#EF972D] cursor-pointer"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          <!-- Month Selector -->
          <input 
            v-else-if="chartFilterType === 'month'"
            v-model="chartValueA"
            type="month"
            @change="handleValueAChange"
            class="border border-gray-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D]"
          />

          <!-- Day Selector -->
          <input 
            v-else
            v-model="chartValueA"
            type="date"
            @change="handleValueAChange"
            class="border border-gray-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D]"
          />
        </div>

        <!-- Legend / Compare Buttons -->
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-4 text-xs font-semibold mr-4">
            <div class="flex items-center gap-1.5">
              <span class="w-3.5 h-1.5 rounded-full bg-[#EF972D] inline-block"></span>
              <span>Doanh thu ({{ formatLabel(chartValueA) }})</span>
            </div>
            <div v-if="chartValueB" class="flex items-center gap-1.5">
              <span class="w-3.5 h-1.5 rounded-full border-t-2 border-dashed border-[#22C55E] inline-block"></span>
              <span>So sánh ({{ formatLabel(chartValueB) }})</span>
            </div>
          </div>

          <!-- Actions -->
          <button 
            @click="openComparisonModal"
            class="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors text-gray-500 bg-white cursor-pointer"
          >
            <span class="material-symbols-outlined text-sm">compare_arrows</span> So sánh
          </button>
          <button 
            @click="clearComparison"
            :disabled="!chartValueB"
            :class="chartValueB ? 'border-[#EF972D] text-[#EF972D] hover:bg-orange-50/50 cursor-pointer' : 'border-gray-200 text-gray-300 bg-gray-50/50 cursor-not-allowed'"
            class="flex items-center gap-1 px-3 py-1.5 border text-xs font-bold rounded-lg transition-colors"
          >
            <span class="material-symbols-outlined text-sm">close</span> Bỏ so sánh
          </button>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="relative">
        <div v-show="loadingChart" class="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#EF972D]"></div>
        </div>
        <div ref="chartContainer" class="h-[320px] w-full mt-4"></div>
      </div>

      <!-- Chart Footer -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400 border-t border-gray-50 pt-4 mt-2">
        <div class="font-medium">
          Tổng doanh thu khoảng lọc: <span class="font-bold text-[#0D2533]">{{ formatCurrency(totalRevenueCurrentPeriod) }}</span>
          <span v-if="chartValueB"> | So sánh: {{ formatLabel(chartValueA) }} vs {{ formatLabel(chartValueB) }}</span>
        </div>
        <div class="flex items-center gap-1 mt-1 sm:mt-0 font-semibold text-gray-500">
          <span class="material-symbols-outlined text-sm">info</span> Đơn vị: VND
        </div>
      </div>
    </div>

    <!-- Custom Date Filter Row -->
    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400 font-bold uppercase">Từ ngày</label>
          <input 
            v-model="startDate" 
            type="date"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D]"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400 font-bold uppercase">Đến ngày</label>
          <input 
            v-model="endDate" 
            type="date"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D]"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400 font-bold uppercase">Từ giờ</label>
          <input 
            v-model="startTime" 
            type="time"
            step="1"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D] min-w-[120px]"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400 font-bold uppercase">Đến giờ</label>
          <input 
            v-model="endTime" 
            type="time"
            step="1"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D] min-w-[120px]"
          />
        </div>
      </div>
      <div class="flex gap-2">
        <button 
          @click="handleFilter"
          class="flex items-center gap-1 bg-[#EF972D] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined text-sm">filter_alt</span> Lọc dữ liệu
        </button>
        <button 
          @click="handleReset"
          class="flex items-center gap-1 bg-white text-gray-500 border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-sm">restart_alt</span> Đặt lại
        </button>
      </div>
    </div>

    <!-- Filtered Timeframe Money Stats Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Total Money Card -->
      <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#EF972D]">
          <span class="material-symbols-outlined text-2xl">payments</span>
        </div>
        <div>
          <span class="text-xs text-gray-400 font-bold uppercase tracking-wider block">Tổng tiền lọc</span>
          <span class="text-lg font-bold text-gray-900 mt-0.5 block">
            {{ formatCurrency(detailsData?.thongKeTien?.tongTien ?? 0) }}
          </span>
        </div>
      </div>
      <!-- Cash Card -->
      <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div class="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
          <span class="material-symbols-outlined text-2xl">money</span>
        </div>
        <div>
          <span class="text-xs text-gray-400 font-bold uppercase tracking-wider block">Tiền mặt</span>
          <span class="text-lg font-bold text-gray-900 mt-0.5 block">
            {{ formatCurrency(detailsData?.thongKeTien?.tienMat ?? 0) }}
          </span>
        </div>
      </div>
      <!-- Bank Transfer Card -->
      <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
          <span class="material-symbols-outlined text-2xl">account_balance</span>
        </div>
        <div>
          <span class="text-xs text-gray-400 font-bold uppercase tracking-wider block">Chuyển khoản</span>
          <span class="text-lg font-bold text-gray-900 mt-0.5 block">
            {{ formatCurrency(detailsData?.thongKeTien?.chuyenKhoan ?? 0) }}
          </span>
        </div>
      </div>
      <!-- VNPAY Card -->
      <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div class="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
          <span class="material-symbols-outlined text-2xl">qr_code_2</span>
        </div>
        <div>
          <span class="text-xs text-gray-400 font-bold uppercase tracking-wider block">VNPAY</span>
          <span class="text-lg font-bold text-gray-900 mt-0.5 block">
            {{ formatCurrency(detailsData?.thongKeTien?.vnpay ?? 0) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Grid: Top selling, Sold products, & Order status counts -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Top Selling Products -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-4 flex flex-col">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">workspace_premium</span>
            <span class="font-bold">Top bán chạy</span>
          </div>
          <span class="bg-orange-50 text-[#EF972D] text-xs font-bold px-2.5 py-1 rounded-full uppercase">Top 10</span>
        </div>
        
        <div class="p-5 flex-1 overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="text-gray-400 font-bold border-b border-gray-50">
                <th class="pb-3 w-[45%]">Sản phẩm</th>
                <th class="pb-3 text-center">Đã bán</th>
                <th class="pb-3 text-center">Tồn</th>
                <th class="pb-3 text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!detailsData?.topBanChay || detailsData?.topBanChay.length === 0">
                <td colspan="4" class="py-6 text-center text-gray-400 text-xs font-medium">Không có dữ liệu</td>
              </tr>
              <tr 
                v-for="(prod, idx) in detailsData?.topBanChay" 
                :key="idx"
                class="hover:bg-gray-50/50 transition-colors border-b border-gray-50/50 last:border-0"
              >
                <td class="py-3 flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                    <img :src="formatImage(prod.hinhAnh)" class="w-full h-full object-cover"/>
                  </div>
                  <span class="font-semibold text-gray-800 line-clamp-1">{{ prod.tenSanPham }}</span>
                </td>
                <td class="py-3 text-center">
                  <span class="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-md">
                    {{ prod.soLuongDaBan }}
                  </span>
                </td>
                <td class="py-3 text-center text-gray-500 font-medium text-xs">
                  {{ formatNumber(prod.ton) }}
                </td>
                <td class="py-3 text-right font-bold text-gray-900">
                  {{ formatCurrency(prod.doanhThu) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Products Sold (Detail) -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-4 flex flex-col">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">shopping_bag</span>
            <span class="font-bold">Sản phẩm đã bán</span>
          </div>
          <span class="bg-blue-50 text-[#1E88E5] text-xs font-bold px-2.5 py-1 rounded-full uppercase">Chi tiết</span>
        </div>
        
        <div class="p-5 flex-1 overflow-y-auto max-h-[350px]">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="text-gray-400 font-bold border-b border-gray-50">
                <th class="pb-3 w-[45%]">Sản phẩm</th>
                <th class="pb-3 text-center">Số lượng</th>
                <th class="pb-3 text-center">Tồn</th>
                <th class="pb-3 text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!detailsData?.sanPhamDaBan || detailsData?.sanPhamDaBan.length === 0">
                <td colspan="4" class="py-6 text-center text-gray-400 text-xs font-medium">Không có dữ liệu</td>
              </tr>
              <tr 
                v-for="(prod, idx) in detailsData?.sanPhamDaBan" 
                :key="idx"
                class="hover:bg-gray-50/50 transition-colors border-b border-gray-50/50 last:border-0"
              >
                <td class="py-3">
                  <div class="font-semibold text-gray-800 line-clamp-1">{{ prod.tenSanPham }}</div>
                  <div class="text-[10px] text-gray-400 mt-0.5">
                    Màu: {{ prod.tenMauSac || 'N/A' }} | Size: {{ prod.tenKichCo || 'N/A' }}
                  </div>
                </td>
                <td class="py-3 text-center">
                  <span class="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-md">
                    {{ prod.soLuongDaBan }}
                  </span>
                </td>
                <td class="py-3 text-center text-gray-500 font-medium text-xs">
                  {{ formatNumber(prod.ton) }}
                </td>
                <td class="py-3 text-right font-bold text-gray-900">
                  {{ formatCurrency(prod.doanhThu) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Order Statuses -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-4 flex flex-col">
        <div class="p-5 border-b border-gray-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-[#EF972D]">receipt</span>
          <span class="font-bold">Đơn hàng</span>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <!-- Status Distribution list -->
          <div class="space-y-3.5 flex-1">
            <div 
              v-for="status in [
                { code: 4, name: 'Hoàn thành', color: 'bg-green-500', text: 'text-green-700' },
                { code: 5, name: 'Đã huỷ', color: 'bg-red-500', text: 'text-red-700' },
                { code: 0, name: 'Chờ xác nhận', color: 'bg-gray-400', text: 'text-gray-600' },
                { code: 1, name: 'Đã xác nhận', color: 'bg-indigo-500', text: 'text-indigo-700' },
                { code: 2, name: 'Chờ giao', color: 'bg-yellow-500', text: 'text-yellow-700' },
                { code: 3, name: 'Đang giao', color: 'bg-blue-500', text: 'text-blue-700' },
                { code: 6, name: 'Giao thất bại', color: 'bg-orange-500', text: 'text-orange-700' }
              ]" 
              :key="status.code"
              class="flex items-center justify-between text-xs"
            >
              <div class="flex items-center gap-2 w-1/2">
                <span class="w-2 h-2 rounded-full" :class="status.color"></span>
                <span class="font-semibold text-gray-600 line-clamp-1">{{ status.name }}</span>
              </div>
              <div class="flex items-center gap-3 w-1/2 justify-end">
                <span class="font-bold text-gray-800">{{ detailsData?.trangThaiDonHang?.[status.code] || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Summary card inside -->
          <div class="grid grid-cols-3 gap-2.5 border-t border-gray-50 pt-4">
            <div class="bg-green-50/50 border border-green-100/50 p-2.5 rounded-xl text-center">
              <span class="text-[9px] font-bold text-green-700 uppercase tracking-wider block">Hoàn thành</span>
              <span class="text-base font-black text-green-800 mt-1 block">
                {{ detailsData?.trangThaiDonHang?.[4] || 0 }}
              </span>
            </div>
            <div class="bg-red-50/50 border border-red-100/50 p-2.5 rounded-xl text-center">
              <span class="text-[9px] font-bold text-red-700 uppercase tracking-wider block">Đã huỷ</span>
              <span class="text-base font-black text-red-800 mt-1 block">
                {{ detailsData?.trangThaiDonHang?.[5] || 0 }}
              </span>
            </div>
            <div class="bg-orange-50/50 border border-orange-100/50 p-2.5 rounded-xl text-center">
              <span class="text-[9px] font-bold text-orange-700 uppercase tracking-wider block">Thất bại</span>
              <span class="text-base font-black text-orange-800 mt-1 block">
                {{ detailsData?.trangThaiDonHang?.[6] || 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Grid: Potential customers & Slow selling inventory -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Potential customers -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">group</span>
            <span class="font-bold">Khách hàng tiềm năng</span>
          </div>
          <span class="bg-orange-50 text-[#EF972D] text-xs font-bold px-2.5 py-1 rounded-full uppercase">Top chi tiêu</span>
        </div>

        <div class="p-5 flex-1 overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="text-gray-400 font-bold border-b border-gray-50">
                <th class="pb-3 w-[50%]">Khách hàng</th>
                <th class="pb-3 text-center">Số đơn</th>
                <th class="pb-3 text-right">Tổng chi tiêu</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!detailsData?.topKhachHang || detailsData?.topKhachHang.length === 0">
                <td colspan="3" class="py-6 text-center text-gray-400 text-xs font-medium">Không có dữ liệu</td>
              </tr>
              <tr 
                v-for="(cust, idx) in detailsData?.topKhachHang" 
                :key="idx"
                class="hover:bg-gray-50/50 border-b border-gray-50/50 last:border-0"
              >
                <td class="py-3.5">
                  <div class="font-bold text-gray-800">{{ cust.hoTen }}</div>
                  <div class="text-[11px] text-gray-400 font-medium mt-0.5">{{ cust.sdt }}</div>
                </td>
                <td class="py-3.5 text-center">
                  <span class="bg-blue-50 text-[#1E88E5] border border-blue-100/50 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                    {{ cust.soDon }}
                  </span>
                </td>
                <td class="py-3.5 text-right font-black text-gray-900">
                  {{ formatCurrency(cust.tongChiTieu) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Slow selling & inventory -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">warning</span>
            <span class="font-bold">Bán chậm & tồn kho</span>
          </div>
          <span class="bg-red-50 text-[#D32F2F] text-xs font-bold px-2.5 py-1 rounded-full uppercase">Chưa bán được</span>
        </div>

        <div class="p-5 flex-1 overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="text-gray-400 font-bold border-b border-gray-50">
                <th class="pb-3 w-[60%]">Sản phẩm</th>
                <th class="pb-3 text-center">Đã bán</th>
                <th class="pb-3 text-right">Tồn</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!detailsData?.banChamTonKho || detailsData?.banChamTonKho.length === 0">
                <td colspan="3" class="py-6 text-center text-gray-400 text-xs font-medium">Không có dữ liệu</td>
              </tr>
              <tr 
                v-for="(prod, idx) in detailsData?.banChamTonKho" 
                :key="idx"
                class="hover:bg-gray-50/50 border-b border-gray-50/50 last:border-0"
              >
                <td class="py-3.5 font-semibold text-gray-800">{{ prod.tenSanPham }}</td>
                <td class="py-3.5 text-center">
                  <span class="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-md">
                    {{ prod.daBan }}
                  </span>
                </td>
                <td class="py-3.5 text-right font-black text-red-600">
                  {{ prod.ton }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Send Email Report Modal -->
    <div v-if="showEmailModal" class="fixed inset-0 bg-black/55 flex items-center justify-center z-50 p-4 transition-all">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#0D2533] border border-gray-100 relative">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">mail</span>
            <h3 class="font-bold text-base">Gửi Báo Cáo Doanh Thu Qua Email</h3>
          </div>
          <button @click="showEmailModal = false" class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-gray-600 mb-1">Loại báo cáo gửi</label>
            <select
              v-model="emailReportType"
              class="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#EF972D] focus:border-[#EF972D] outline-none font-semibold bg-white cursor-pointer"
            >
              <option value="today">Báo cáo Doanh Thu Hôm Nay ({{ formatCurrency(overviewData?.homNay?.doanhThu ?? 0) }})</option>
              <option value="week">Báo cáo Doanh Thu Tuần Này ({{ formatCurrency(overviewData?.tuanNay?.doanhThu ?? 0) }})</option>
              <option value="month">Báo cáo Doanh Thu Tháng Này ({{ formatCurrency(overviewData?.thangNay?.doanhThu ?? 0) }})</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-gray-600 mb-1">Email Quản lý nhận báo cáo *</label>
            <input
              v-model="managerEmail"
              type="email"
              placeholder="quanly@beesports.vn"
              class="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#EF972D] focus:border-[#EF972D] outline-none font-semibold"
            />
          </div>

          <div class="p-3 bg-orange-50/60 rounded-xl border border-orange-100 text-gray-600 leading-relaxed">
            <div class="font-bold text-[#EF972D] flex items-center gap-1 mb-1">
              <span class="material-symbols-outlined text-sm">info</span> Nội dung báo cáo thực tế bao gồm:
            </div>
            • Tổng doanh thu thực tế từ Hóa đơn đã hoàn thành<br/>
            • Chi tiết doanh thu theo tiền mặt, chuyển khoản & VNPAY<br/>
            • Danh sách sản phẩm bán chạy nhất từ hệ thống
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 mt-6 border-t border-gray-100 pt-4">
          <button
            @click="showEmailModal = false"
            class="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-gray-600 text-xs transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            @click="triggerSendEmailReportDirect"
            :disabled="isSendingEmail"
            class="px-5 py-2 bg-[#EF972D] hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span v-if="isSendingEmail" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else class="material-symbols-outlined text-sm">send</span>
            <span>{{ isSendingEmail ? 'Đang gửi...' : 'Xác nhận gửi Email' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Comparison Modal -->
    <div v-if="showComparisonModal" class="fixed inset-0 bg-black/55 flex items-center justify-center z-50 transition-all duration-300">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative text-[#0D2533] border border-gray-100/50">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-gray-500">compare_arrows</span>
            <h3 class="font-bold text-lg">So sánh doanh thu</h3>
          </div>
          <button @click="showComparisonModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Form Content -->
        <div class="space-y-4">
          <!-- Compare By -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-gray-400 uppercase">So sánh theo</label>
            <select 
              v-model="modalFilterType"
              class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#EF972D] w-full"
            >
              <option value="year">Theo năm</option>
              <option value="month">Theo tháng</option>
              <option value="day">Theo ngày</option>
            </select>
          </div>

          <!-- Pickers Row A & B -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Picker A -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-gray-400 uppercase">
                {{ modalFilterType === 'year' ? 'Năm A' : (modalFilterType === 'month' ? 'Tháng A' : 'Ngày A') }}
              </label>
              
              <!-- Year A Picker -->
              <select 
                v-if="modalFilterType === 'year'" 
                v-model="modalValueA"
                class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#EF972D] w-full"
              >
                <option v-for="y in [2026, 2025, 2024]" :key="y" :value="y.toString()">{{ y }}</option>
              </select>
              
              <!-- Month A Picker -->
              <input 
                v-else-if="modalFilterType === 'month'" 
                v-model="modalValueA"
                type="month"
                class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D] w-full"
              />
              
              <!-- Day A Picker -->
              <input 
                v-else 
                v-model="modalValueA"
                type="date"
                class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D] w-full"
              />
            </div>

            <!-- Picker B -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-gray-400 uppercase">
                {{ modalFilterType === 'year' ? 'Năm B' : (modalFilterType === 'month' ? 'Tháng B' : 'Ngày B') }}
              </label>
              
              <!-- Year B Picker -->
              <select 
                v-if="modalFilterType === 'year'" 
                v-model="modalValueB"
                class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#EF972D] w-full"
              >
                <option v-for="y in [2026, 2025, 2024]" :key="y" :value="y.toString()">{{ y }}</option>
              </select>
              
              <!-- Month B Picker -->
              <input 
                v-else-if="modalFilterType === 'month'" 
                v-model="modalValueB"
                type="month"
                class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D] w-full"
              />
              
              <!-- Day B Picker -->
              <input 
                v-else 
                v-model="modalValueB"
                type="date"
                class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EF972D] w-full"
              />
            </div>
          </div>

          <!-- Tip -->
          <div class="flex items-start gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-500">
            <span class="material-symbols-outlined text-sm text-[#EF972D] mt-0.5">lightbulb</span>
            <span>Sau khi so sánh, biểu đồ sẽ hiển thị 2 đường doanh thu.</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 mt-6 border-t border-gray-100 pt-4">
          <button 
            @click="showComparisonModal = false"
            class="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-500 transition-colors"
          >
            Hủy
          </button>
          <button 
            @click="applyComparison"
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            So sánh
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Toast Notification -->
    <div
      v-if="toast && toast.show"
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
      <span class="text-sm font-semibold font-body-md">{{ toast.message }}</span>
      <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-gray-600">
        <span class="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Custom styled date picker inputs */
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  filter: invert(58%) sepia(86%) saturate(415%) hue-rotate(345deg) brightness(97%) contrast(92%);
}
</style>
