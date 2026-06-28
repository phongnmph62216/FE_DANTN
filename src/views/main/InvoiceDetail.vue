<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../services/api'

const route = useRoute()
const router = useRouter()
const invoiceId = route.params.id

// Data states
const detail = ref(null)
const historyLogs = ref([])

// UI States
const isLoading = ref(true)
const isError = ref(false)
const showStatusModal = ref(false)
const showHistoryModal = ref(false)
const isSubmittingStatus = ref(false)
const selectedNewStatus = ref('')
const statusNote = ref('')

// Toast Notification State
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4500)
}

// Helpers
const formatPriceVND = (price) => {
  if (price === null || price === undefined) return '0 đ'
  return new Intl.NumberFormat('vi-VN').format(price) + ' đ'
}

const formatPrintDate = (dateString) => {
  if (!dateString) return 'Ngày — tháng — năm —'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    const day = d.getDate()
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    return `Ngày ${day} tháng ${month} năm ${year}`
  } catch (e) {
    return dateString
  }
}

const formatDateTime = (dateString) => {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    const day = d.getDate()
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
  } catch (e) {
    return dateString
  }
}

const getStatusText = (status) => {
  const code = parseInt(status, 10)
  switch (code) {
    case 0: return 'Chưa xác nhận'
    case 1: return 'Đã xác nhận'
    case 2: return 'Chờ giao'
    case 3: return 'Đang giao'
    case 4: return 'Đã hoàn thành'
    case 5: return 'Đã hủy'
    case 6: return 'Giao hàng không thành công'
    default: return 'Không xác định'
  }
}

// Getters with Fallbacks matching DTO flat properties
const getInvoiceCode = computed(() => {
  if (!detail.value) return ''
  return detail.value.maHoaDon || detail.value.ma || 'HD001'
})

const getOrderType = computed(() => {
  if (!detail.value) return 0
  const type = detail.value.loaiDon !== undefined ? detail.value.loaiDon : detail.value.thongTinChung?.loaiDon
  return type !== undefined ? parseInt(type, 10) : 0
})

const getStatus = computed(() => {
  if (!detail.value) return 0
  const status = detail.value.trangThai !== undefined ? detail.value.trangThai : detail.value.thongTinChung?.trangThai
  return status !== undefined ? parseInt(status, 10) : 0
})

const getCreatedDate = computed(() => {
  if (!detail.value) return ''
  return detail.value.ngayTao || detail.value.thongTinChung?.ngayTao || detail.value.createdAt || ''
})

const getEmployeeName = computed(() => {
  if (!detail.value) return ''
  return detail.value.nguoiTao || detail.value.tenNhanVien || detail.value.nhanVien || ''
})

// Customer Info
const getCustomerName = computed(() => {
  if (!detail.value) return 'Khách lẻ'
  return detail.value.tenKhachHang || detail.value.thongTinKhachHang?.tenKhachHang || detail.value.khachHang || 'Khách lẻ'
})

const getCustomerPhone = computed(() => {
  if (!detail.value) return '—'
  return detail.value.soDienThoai || detail.value.thongTinKhachHang?.soDienThoai || detail.value.sdt || detail.value.sdtKhachHang || '—'
})

const getCustomerEmail = computed(() => {
  if (!detail.value) return '—'
  return detail.value.email || detail.value.thongTinKhachHang?.email || '—'
})

// Delivery Info
const getDeliveryAddress = computed(() => {
  if (!detail.value) return '—'
  return detail.value.diaChi || detail.value.diaChiGiaoHang || detail.value.thongTinKhachHang?.diaChiGiaoHang || '—'
})

const getInvoiceNote = computed(() => {
  if (!detail.value) return '—'
  return detail.value.ghiChu || detail.value.thongTinChung?.ghiChu || '—'
})

// Financial Info
const getGoodsTotal = computed(() => {
  if (!detail.value) return 0
  return detail.value.tongTienHang !== undefined ? detail.value.tongTienHang : (detail.value.tongTien || detail.value.thongTinTien?.tongTien || 0)
})

const getShipFee = computed(() => {
  if (!detail.value) return 0
  return detail.value.phiVanChuyen !== undefined ? detail.value.phiVanChuyen : (detail.value.thongTinTien?.phiVanChuyen || 0)
})

const getDiscountAmount = computed(() => {
  if (!detail.value) return 0
  return detail.value.giamGia !== undefined ? detail.value.giamGia : (detail.value.tienGiam || detail.value.thongTinTien?.tienGiam || 0)
})

const getPayableTotal = computed(() => {
  if (!detail.value) return 0
  return detail.value.tongTien !== undefined ? detail.value.tongTien : (detail.value.thanhTien || detail.value.thongTinTien?.thanhTien || 0)
})

const getPaymentMethod = computed(() => {
  if (!detail.value) return 'Tiền mặt'
  const method = detail.value.phuongThucThanhToan || detail.value.thongTinThanhToan?.phuongThucThanhToan
  if (method === 1 || method === 'BANK' || method === 'Chuyển khoản') return 'Chuyển khoản'
  return 'Tiền mặt'
})

// Product List
const getProducts = computed(() => {
  if (!detail.value) return []
  return detail.value.danhSachSanPham || detail.value.sanPhams || detail.value.hoaDonChiTiets || []
})

// Timeline logs computation helpers with smart DTO merging
const getStepLog = (stepStatus) => {
  // 1. Check historyLogs from /lich-su (which has full operator information)
  if (historyLogs.value && historyLogs.value.length > 0) {
    const log = historyLogs.value.find(l => parseInt(l.trangThai !== undefined ? l.trangThai : l.trangThaiMoi, 10) === stepStatus)
    if (log) {
      return {
        ngayTao: log.thoiGian || log.ngayTao || log.createdAt,
        nguoiThaoTac: log.nguoiThucHien || log.nguoiThaoTac || log.nguoiTao || 'Nhân viên',
        ghiChu: log.ghiChu || log.notes || ''
      }
    }
  }

  // 2. Check detail.value.timelineTrangThai from detail DTO
  if (detail.value && detail.value.timelineTrangThai) {
    const tl = detail.value.timelineTrangThai.find(t => parseInt(t.trangThai, 10) === stepStatus)
    if (tl) {
      return {
        ngayTao: tl.thoiGian,
        nguoiThaoTac: detail.value.nguoiSua || detail.value.nguoiTao || 'Nhân viên',
        ghiChu: tl.ghiChu || ''
      }
    }
  }
  return null
}

const isStepCompleted = (stepStatus) => {
  const currentStatus = getStatus.value
  if (currentStatus === 5 || currentStatus === 6) {
    // If canceled or failed, only show steps completed before terminal state
    const termLog = historyLogs.value.find(l => {
      const code = parseInt(l.trangThai !== undefined ? l.trangThai : l.trangThaiMoi, 10)
      return code === 5 || code === 6
    })
    if (termLog) {
      const stepLog = getStepLog(stepStatus)
      if (stepLog) {
        const termTime = termLog.thoiGian || termLog.ngayTao || termLog.createdAt
        const stepTime = stepLog.ngayTao || stepLog.createdAt
        return new Date(stepTime) <= new Date(termTime)
      }
    }
    return false
  }
  
  if (getOrderType.value === 0) {
    // Store type: only 0 and 4 are steps.
    if (stepStatus === 0) return true
    if (stepStatus === 4) return currentStatus === 4
  } else {
    // Delivery type: sequential comparison
    return currentStatus >= stepStatus
  }
  return false
}

// Stepper Configuration based on loaiDon
const stepperSteps = computed(() => {
  if (getOrderType.value === 0) {
    // Counter / Store order (2 steps)
    return [
      { status: 0, label: 'Chưa xác nhận', icon: 'hourglass_empty' },
      { status: 4, label: 'Đã hoàn thành', icon: 'flag' }
    ]
  } else {
    // Online / Delivery order (5 steps)
    return [
      { status: 0, label: 'Chưa xác nhận', icon: 'hourglass_empty' },
      { status: 1, label: 'Đã xác nhận', icon: 'check' },
      { status: 2, label: 'Chờ giao', icon: 'inventory_2' },
      { status: 3, label: 'Đang giao', icon: 'local_shipping' },
      { status: 4, label: 'Đã hoàn thành', icon: 'flag' }
    ]
  }
})

// Calculate active progress line width in percentage
const activeLineWidthPercent = computed(() => {
  const current = getStatus.value
  if (current === 5 || current === 6) return '100%' // Show full path (will be colored red/gray)
  
  if (getOrderType.value === 0) {
    // 2 nodes -> 0% (at node 0) or 100% (at node 4)
    return current === 4 ? '100%' : '0%'
  } else {
    // 5 nodes -> 0%, 25%, 50%, 75%, 100%
    if (current <= 0) return '0%'
    if (current === 1) return '25%'
    if (current === 2) return '50%'
    if (current === 3) return '75%'
    return '100%'
  }
})

// Calculate latest log entry for the header meta
const lastUpdatedMeta = computed(() => {
  if (historyLogs.value && historyLogs.value.length > 0) {
    const latest = historyLogs.value[0]
    return {
      time: formatDateTime(latest.ngayTao || latest.createdAt),
      operator: latest.nguoiThaoTac || latest.nguoiTao || 'Hệ thống'
    }
  }
  return { time: '—', operator: '—' }
})

// API fetching logic
const loadInvoiceDetails = async () => {
  isLoading.value = true
  isError.value = false
  try {
    const [detailRes, historyRes] = await Promise.all([
      api.get(`/api/v1/hoa-don/${invoiceId}`),
      api.get(`/api/v1/hoa-don/${invoiceId}/lich-su`).catch(err => {
        console.warn('Vertical operation logs endpoint failed or not supported:', err)
        return { data: [] }
      })
    ])

    detail.value = detailRes.data
    historyLogs.value = historyRes.data || []
  } catch (err) {
    console.error('Failed to load invoice detailed data:', err)
    isError.value = true
    showToast('Lỗi khi tải chi tiết hóa đơn, vui lòng kiểm tra lại!', 'error')
  } finally {
    isLoading.value = false
  }
}

// Compute filtered status options for update dropdown modal
const availableTransitionOptions = computed(() => {
  const current = getStatus.value
  const type = getOrderType.value
  const options = []

  // If already Completed (4), Canceled (5), or Failed (6), no transitions are possible
  if (current === 4 || current === 5 || current === 6) {
    return options
  }

  // Filter based on loaiDon
  if (type === 0) {
    // Counter flow: 0 -> 4 or 0 -> 5
    if (current === 0) {
      options.push({ value: 4, label: 'Đã hoàn thành' })
      options.push({ value: 5, label: 'Đã hủy' })
    }
  } else {
    // Online delivery flow: 0 -> 1 -> 2 -> 3 -> 4
    if (current === 0) {
      options.push({ value: 1, label: 'Đã xác nhận' })
      options.push({ value: 5, label: 'Đã hủy' })
    } else if (current === 1) {
      options.push({ value: 2, label: 'Chờ giao' })
      options.push({ value: 5, label: 'Đã hủy' })
    } else if (current === 2) {
      options.push({ value: 3, label: 'Đang giao' })
      options.push({ value: 5, label: 'Đã hủy' })
    } else if (current === 3) {
      options.push({ value: 4, label: 'Đã hoàn thành' })
      options.push({ value: 5, label: 'Đã hủy' })
      options.push({ value: 6, label: 'Giao hàng không thành công' })
    }
  }

  return options
})

// Trigger modal status flow
const openUpdateStatusModal = () => {
  if (availableTransitionOptions.value.length === 0) {
    showToast('Đơn hàng đã ở trạng thái hoàn thành hoặc đã hủy, không thể cập nhật thêm!', 'info')
    return
  }
  selectedNewStatus.value = availableTransitionOptions.value[0]?.value || ''
  statusNote.value = ''
  showStatusModal.value = true
}

// Submit status update
const handleSaveStatus = async () => {
  if (!selectedNewStatus.value) return
  if (!statusNote.value.trim()) {
    showToast('Vui lòng nhập ghi chú thao tác trước khi lưu!', 'error')
    return
  }

  isSubmittingStatus.value = true
  try {
    const payload = {
      trangThaiMoi: parseInt(selectedNewStatus.value, 10),
      ghiChu: statusNote.value.trim()
    }

    const res = await api.put(`/api/v1/hoa-don/${invoiceId}/trang-thai`, payload)
    
    // Check if the wrapper returns an error envelope
    if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
      showToast(`Cập nhật thất bại: ${res._wrapper.message}`, 'error')
    } else {
      showToast('Cập nhật trạng thái đơn hàng thành công!', 'success')
      showStatusModal.value = false
      await loadInvoiceDetails() // Re-fetch detail to refresh timestamps and stepper steps
    }
  } catch (err) {
    console.error('Failed to change status:', err)
    const errMsg = err.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng!'
    showToast(errMsg, 'error')
  } finally {
    isSubmittingStatus.value = false
  }
}

// Browser print trigger
const handlePrintInvoice = () => {
  window.print()
}

// Navigate back to listing page
const handleBackToList = () => {
  router.push('/invoices')
}

// Cancellation request approval state and methods
const showApprovalModal = ref(false)
const isAgreeCancel = ref(true)
const approvalNote = ref('')
const isProcessingApproval = ref(false)

const openApprovalModal = (agree) => {
  isAgreeCancel.value = agree
  approvalNote.value = ''
  showApprovalModal.value = true
}

const closeApprovalModal = () => {
  showApprovalModal.value = false
}

const submitApproval = async () => {
  if (!approvalNote.value.trim()) {
    showToast('Vui lòng nhập ghi chú phản hồi!', 'error')
    return
  }

  isProcessingApproval.value = true
  try {
    await api.put(`/api/v1/ban-hang/don-hang/${invoiceId}/phe-duyet-huy`, null, {
      params: {
        dongY: isAgreeCancel.value,
        ghiChu: approvalNote.value.trim()
      }
    })
    
    showToast(isAgreeCancel.value ? 'Đã chấp nhận hủy đơn hàng!' : 'Đã từ chối hủy đơn hàng!', 'success')
    showApprovalModal.value = false
    await loadInvoiceDetails()
  } catch (error) {
    console.error('Error approving cancellation:', error)
    const msg = error.response?.data?.message || 'Có lỗi xảy ra khi duyệt yêu cầu hủy.'
    showToast(msg, 'error')
  } finally {
    isProcessingApproval.value = false
  }
}

onMounted(() => {
  loadInvoiceDetails()
})
</script>

<template>
  <div class="invoice-detail-wrapper">
    <!-- Screen only container -->
    <div class="max-w-7xl mx-auto space-y-gutter pb-16 print:hidden">
    <!-- Header Section -->
    <div class="flex justify-between items-start mb-stack-lg print:hidden">
      <div>
        <h1 class="font-display-lg text-display-lg text-on-background mb-stack-sm">Chi tiết đơn hàng</h1>
        <p class="font-body-md text-body-md text-on-surface-variant">
          Mã đơn hàng: {{ getInvoiceCode }} | Ngày tạo: {{ formatDateTime(getCreatedDate) }}
        </p>
        <p class="font-body-md text-body-md text-on-surface-variant">
          Tạo bởi: {{ getEmployeeName }} | Cập nhật gần nhất: {{ lastUpdatedMeta.time }} - {{ lastUpdatedMeta.operator }}
        </p>
      </div>
      <button
        @click="handleBackToList"
        class="flex items-center gap-2 bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-sm text-label-sm hover:opacity-90 transition-opacity cursor-pointer"
      >
        <span class="material-symbols-outlined" style="font-size: 16px;">arrow_back</span>
        Quay lại danh sách
      </button>
    </div>

    <!-- Loading screen -->
    <div v-if="isLoading" class="p-20 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center justify-center gap-4 card-shadow">
      <div class="w-10 h-10 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
      <span class="text-sm font-semibold text-gray-500">Đang tải thông tin chi tiết đơn hàng...</span>
    </div>

    <!-- Error screen -->
    <div v-else-if="isError" class="p-20 bg-surface-container-lowest border border-outline-variant rounded-xl text-center space-y-4 card-shadow">
      <span class="material-symbols-outlined text-red-500 text-6xl">error</span>
      <h3 class="font-headline-md text-lg text-on-surface">Không thể hiển thị thông tin hóa đơn</h3>
      <p class="text-sm text-gray-500">Hóa đơn có thể không tồn tại hoặc hệ thống gặp sự cố tải.</p>
      <button
        @click="loadInvoiceDetails"
        class="px-5 py-2.5 bg-[#EF972D] hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-all cursor-pointer"
      >
        Tải lại
      </button>
    </div>

    <div v-else class="grid grid-cols-12 gap-gutter">
      <!-- Cancellation Request Alert (Span 12) -->
      <div 
        v-if="detail && detail.trangThaiYeuCauHuy === 1" 
        class="col-span-12 bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card-shadow"
      >
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined text-amber-600 text-3xl animate-pulse">warning</span>
          <div class="text-left">
            <h3 class="font-bold text-amber-800 text-base">Khách hàng yêu cầu hủy đơn hàng</h3>
            <p class="text-sm text-amber-700 mt-1">
              Lý do: <span class="font-semibold italic">"{{ detail.ghiChu || 'Không có lý do cụ thể' }}"</span>
            </p>
          </div>
        </div>
        <div class="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
          <button 
            @click="openApprovalModal(false)" 
            class="flex-1 md:flex-none px-4 py-2 border border-amber-300 hover:bg-amber-100 text-amber-800 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            :disabled="isProcessingApproval"
          >
            Từ chối hủy
          </button>
          <button 
            @click="openApprovalModal(true)" 
            class="flex-1 md:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-sm"
            :disabled="isProcessingApproval"
          >
            Đồng ý hủy đơn
          </button>
        </div>
      </div>

      <!-- Order Status Card (Span 8) -->
      <div class="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl card-shadow p-6 relative print:col-span-12">
        <div class="flex items-center gap-2 mb-8">
          <span class="material-symbols-outlined text-secondary">local_shipping</span>
          <h2 class="font-headline-md text-headline-md text-on-background">Trạng thái đơn hàng</h2>
          <!-- Canceled state indicator badge -->
          <span v-if="getStatus === 5" class="ml-3 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
            Đã hủy đơn hàng
          </span>
          <span v-else-if="getStatus === 6" class="ml-3 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
            Giao hàng không thành công
          </span>
        </div>

        <!-- Horizontal Stepper component -->
        <div class="relative flex justify-between items-start pt-4 px-4 pb-12 overflow-x-auto min-h-[160px]">
          <!-- Connecting Line Background -->
          <div class="absolute top-10 left-12 right-12 h-[2px] bg-outline-variant z-0"></div>
          <!-- Active Line Progress -->
          <div
            :class="getStatus === 5 || getStatus === 6 ? 'bg-red-500' : 'bg-primary-container'"
            class="absolute top-10 left-12 h-[2px] z-0 transition-all duration-300"
            :style="{ width: activeLineWidthPercent }"
          ></div>

          <!-- Nodes mapping -->
          <div
            v-for="(step, index) in stepperSteps"
            :key="step.status"
            class="relative z-10 flex flex-col items-center min-w-[90px]"
          >
            <!-- Node Circle -->
            <div
              :class="[
                isStepCompleted(step.status)
                  ? (getStatus === 5 || getStatus === 6 ? 'bg-red-500 text-white border-red-500' : 'bg-primary-container text-white border-primary-container')
                  : 'bg-surface-container-lowest text-outline border-2 border-outline',
                getStatus === step.status && getStatus !== 5 && getStatus !== 6 ? 'ring-4 ring-orange-100 scale-105' : ''
              ]"
              class="w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-sm transition-transform"
            >
              <span
                class="material-symbols-outlined"
                :style="isStepCompleted(step.status) ? 'font-variation-settings: \'FILL\' 1;' : ''"
              >
                {{ step.icon }}
              </span>
            </div>

            <!-- Step meta info -->
            <div class="text-center">
              <p
                :class="isStepCompleted(step.status) ? (getStatus === 5 || getStatus === 6 ? 'text-red-500' : 'text-primary-container') : 'text-on-surface-variant'"
                class="font-label-sm text-label-sm mb-1 font-bold"
              >
                {{ step.label }}
              </p>
              
              <!-- If step is completed, display the timeline log dates -->
              <p
                v-if="getStepLog(step.status)"
                class="font-body-md text-body-md text-on-surface-variant text-[11px] leading-tight"
              >
                {{ formatDateTime(getStepLog(step.status).ngayTao || getStepLog(step.status).createdAt).split(' ')[0] }}<br/>
                {{ formatDateTime(getStepLog(step.status).ngayTao || getStepLog(step.status).createdAt).split(' ')[1] }}<br/>
                {{ getStepLog(step.status).nguoiThaoTac || getStepLog(step.status).nguoiTao || 'Hệ thống' }}
              </p>
            </div>
          </div>
        </div>

        <button
          @click="showHistoryModal = true"
          class="absolute bottom-6 right-6 flex items-center gap-2 bg-primary-container text-white px-4 py-2 rounded-lg font-label-sm text-label-sm hover:opacity-90 transition-opacity shadow-sm cursor-pointer print:hidden"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">history</span>
          Lịch sử thao tác
        </button>
      </div>

      <!-- Payment Summary Card (Span 4) -->
      <div class="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl card-shadow p-6 flex flex-col print:col-span-12">
        <div class="flex items-center gap-2 mb-6">
          <span class="material-symbols-outlined text-secondary">receipt_long</span>
          <h2 class="font-headline-md text-headline-md text-on-background">Tổng kết thanh toán</h2>
        </div>
        <div class="flex-grow flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <span class="font-body-md text-body-md text-on-surface-variant">Tổng tiền hàng</span>
            <span class="font-body-md text-body-md text-on-background font-medium">
              {{ formatPriceVND(getGoodsTotal) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="font-body-md text-body-md text-on-surface-variant">Giảm giá</span>
            <span class="font-body-md text-body-md text-primary-container">
              - {{ formatPriceVND(getDiscountAmount) }}
            </span>
          </div>
          <!-- Applied Voucher Coupon Details -->
          <div v-if="detail && detail.maPhieuGiamGia" class="flex justify-between items-center bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-xs text-orange-800 my-1">
            <span class="flex items-center gap-1 font-semibold">
              <span class="material-symbols-outlined text-sm" style="font-size: 16px; font-variation-settings: 'FILL' 1;">local_activity</span>
              Mã giảm giá:
            </span>
            <span class="font-bold text-right">
              {{ detail.maPhieuGiamGia }}
              <span v-if="detail.tenPhieuGiamGia" class="font-normal block text-[10px] text-orange-600">{{ detail.tenPhieuGiamGia }}</span>
            </span>
          </div>
          <div class="flex justify-between items-center" v-if="getOrderType === 1 || getOrderType === 2">
            <span class="font-body-md text-body-md text-on-surface-variant">Phí vận chuyển</span>
            <span class="font-body-md text-body-md text-on-background font-medium">
              + {{ formatPriceVND(getShipFee) }}
            </span>
          </div>
          <div class="h-px bg-outline-variant my-2 w-full"></div>
          <div class="flex justify-between items-center mt-auto pt-2">
            <span class="font-headline-md text-headline-md text-primary-container uppercase font-bold">Tổng tiền</span>
            <span class="font-headline-md text-headline-md text-primary-container font-bold">
              {{ formatPriceVND(getPayableTotal) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Customer Info (Span 4) -->
      <div class="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl card-shadow p-6 print:col-span-4">
        <div class="flex items-center gap-2 mb-6">
          <span class="material-symbols-outlined text-secondary">person</span>
          <h2 class="font-headline-md text-headline-md text-on-background">Thông tin khách hàng</h2>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center border-b border-surface-container-high pb-3">
            <span class="font-body-md text-body-md text-on-surface-variant">Tên khách hàng</span>
            <span class="font-body-md text-body-md text-on-background font-semibold">{{ getCustomerName }}</span>
          </div>
          <div class="flex justify-between items-center border-b border-surface-container-high pb-3">
            <span class="font-body-md text-body-md text-on-surface-variant">Số điện thoại</span>
            <span class="font-body-md text-body-md text-on-background">{{ getCustomerPhone }}</span>
          </div>
          <div class="flex justify-between items-center pb-1">
            <span class="font-body-md text-body-md text-on-surface-variant">Email</span>
            <span class="font-body-md text-body-md text-on-background truncate max-w-[200px]" :title="getCustomerEmail">
              {{ getCustomerEmail }}
            </span>
          </div>
        </div>
      </div>

      <!-- Shipping Info (Span 4) -->
      <div class="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl card-shadow p-6 print:col-span-4">
        <div class="flex items-center gap-2 mb-6">
          <span class="material-symbols-outlined text-secondary">location_on</span>
          <h2 class="font-headline-md text-headline-md text-on-background">Thông tin giao hàng</h2>
        </div>
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center border-b border-surface-container-high pb-3">
            <span class="font-body-md text-body-md text-on-surface-variant">Địa chỉ</span>
            <span class="font-body-md text-body-md text-on-background text-right pl-4 truncate max-w-[200px]" :title="getDeliveryAddress">
              {{ getDeliveryAddress }}
            </span>
          </div>
          <div class="flex justify-between items-center border-b border-surface-container-high pb-3">
            <span class="font-body-md text-body-md text-on-surface-variant">Loại đơn</span>
            <span class="font-body-md text-body-md text-on-background font-semibold">
              {{ getOrderType === 0 ? 'Tại quầy' : (getOrderType === 1 ? 'Giao hàng' : 'Online') }}
            </span>
          </div>
          <div class="flex justify-between items-center pb-1">
            <span class="font-body-md text-body-md text-on-surface-variant">Ghi chú</span>
            <span class="font-body-md text-body-md text-on-surface-variant text-right pl-4 truncate max-w-[200px]" :title="getInvoiceNote">
              {{ getInvoiceNote }}
            </span>
          </div>
        </div>
      </div>

      <!-- Payment History (Span 4) -->
      <div class="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl card-shadow p-6 flex flex-col print:col-span-4">
        <div class="flex items-center gap-2 mb-6">
          <span class="material-symbols-outlined text-secondary">history</span>
          <h2 class="font-headline-md text-headline-md text-on-background">Lịch sử thanh toán</h2>
        </div>
        <div
          v-for="(pay, idx) in detail.lichSuThanhToan || []"
          :key="idx"
          class="flex justify-between items-start mt-2 border-b border-surface-container-high/30 pb-2 last:border-b-0 last:pb-0"
        >
          <span class="font-body-md text-body-md text-on-background font-semibold">{{ pay.phuongThuc }}</span>
          <div class="text-right">
            <span class="font-body-md text-body-md text-primary-container font-bold block">
              {{ formatPriceVND(pay.soTien) }}
            </span>
            <span class="font-body-md text-body-md text-on-surface-variant text-xs mt-1 block">
              {{ formatDateTime(pay.thoiGian) }} • {{ pay.nguoiThucHien }}
            </span>
            <span v-if="pay.ghiChu" class="text-[11px] text-gray-400 italic block mt-0.5">
              "{{ pay.ghiChu }}"
            </span>
          </div>
        </div>
        <div v-if="!(detail.lichSuThanhToan && detail.lichSuThanhToan.length)" class="text-center py-4 text-xs text-on-surface-variant">
          Chưa có lịch sử thanh toán.
        </div>
      </div>

      <!-- Product List (Span 8) -->
      <div class="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl card-shadow p-6 print:col-span-12">
        <div class="flex items-center gap-2 mb-6">
          <span class="material-symbols-outlined text-secondary">inventory_2</span>
          <h2 class="font-headline-md text-headline-md text-on-background">
            Danh sách sản phẩm ({{ getProducts.length }})
          </h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-background border-y border-surface-container-high">
                <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold w-16 text-center">STT</th>
                <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold">Mã biến thể</th>
                <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold">Tên sản phẩm</th>
                <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold text-center">Kích cỡ</th>
                <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold text-center">Màu sắc</th>
                <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold text-center w-20">Số lượng</th>
                <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold text-right">Đơn giá</th>
                <th class="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in getProducts"
                :key="item.id || index"
                class="border-b border-surface-container-high hover:bg-surface transition-colors"
              >
                <td class="py-4 px-4 font-body-md text-body-md text-on-background text-center">{{ index + 1 }}</td>
                <td class="py-4 px-4 font-body-md text-body-md text-on-background font-semibold">
                  {{ item.maChiTietSanPham || item.maBienThe || item.maSanPham || item.ma || 'N/A' }}
                </td>
                <td class="py-4 px-4 font-body-md text-body-md text-on-background">
                  {{ item.tenSanPham || item.productName || 'Sản phẩm' }}
                </td>
                <td class="py-4 px-4 font-body-md text-body-md text-on-background text-center">
                  {{ item.tenKichCo || item.tenKichThuoc || item.kichThuoc || item.kichCo || item.size || '—' }}
                </td>
                <td class="py-4 px-4 font-body-md text-body-md text-on-background text-center">
                  {{ item.tenMauSac || item.mauSac || item.color || '—' }}
                </td>
                <td class="py-4 px-4 font-body-md text-body-md text-on-background text-center font-semibold">
                  {{ item.soLuong || 0 }}
                </td>
                <td class="py-4 px-4 font-body-md text-body-md text-on-background text-right">
                  {{ formatPriceVND(item.donGiaSauGiam || item.donGia || item.price) }}
                </td>
                <td class="py-4 px-4 font-body-md text-body-md text-primary-container font-semibold text-right">
                  {{ formatPriceVND((item.donGiaSauGiam || item.donGia || item.price) * (item.soLuong || 0)) }}
                </td>
              </tr>
              <!-- Empty state -->
              <tr v-if="getProducts.length === 0">
                <td colspan="8" class="py-6 text-center text-sm text-on-surface-variant">
                  Không có sản phẩm nào trong danh sách.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Buttons (Span 4) -->
      <div class="col-span-12 lg:col-span-4 flex flex-col gap-3 justify-end h-full mt-4 lg:mt-0 print:hidden">
        <button
          @click="handlePrintInvoice"
          class="w-full flex items-center justify-center gap-2 bg-[#2f65f6] text-white py-3 rounded-lg font-label-sm text-label-sm shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">print</span>
          In hóa đơn
        </button>
        
        <!-- Toggle button to trigger state transitions -->
        <button
          v-if="availableTransitionOptions.length > 0"
          @click="openUpdateStatusModal"
          class="w-full flex items-center justify-center gap-2 bg-primary-container text-white py-3 rounded-lg font-label-sm text-label-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer font-bold"
        >
          <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
          Cập nhật trạng thái
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Dropdown/Status Update Modal -->
  <div v-if="showStatusModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span class="material-symbols-outlined text-primary-container text-2xl">edit_square</span>
        <h3 class="font-headline-md text-base font-bold text-gray-800">Cập nhật trạng thái</h3>
      </div>
      
      <!-- Modal Body -->
      <div class="p-6 space-y-4">
        <!-- New status select dropdown -->
        <div class="flex flex-col gap-1.5">
          <label class="font-label-sm text-xs text-on-surface-variant uppercase">Trạng thái mới <span class="text-red-500">*</span></label>
          <select
            v-model="selectedNewStatus"
            class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 font-body-md text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
          >
            <option
              v-for="opt in availableTransitionOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Note details -->
        <div class="flex flex-col gap-1.5">
          <label class="font-label-sm text-xs text-on-surface-variant uppercase">Ghi chú thao tác <span class="text-red-500">*</span></label>
          <textarea
            v-model="statusNote"
            rows="3"
            placeholder="Nhập lý do hoặc nội dung thao tác..."
            class="w-full bg-white border border-gray-300 rounded-lg p-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
          ></textarea>
        </div>
      </div>
      
      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button
          type="button"
          @click="showStatusModal = false"
          :disabled="isSubmittingStatus"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          @click="handleSaveStatus"
          :disabled="isSubmittingStatus"
          class="bg-primary-container text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 hover:opacity-90"
        >
          <div v-if="isSubmittingStatus" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Lưu thay đổi
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Operation Vertical Timeline Modal -->
  <div v-if="showHistoryModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-lg w-full overflow-hidden border border-gray-100 shadow-2xl flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#EF972D] text-2xl">history</span>
          <h3 class="font-headline-md text-base font-bold text-gray-800">Lịch sử thao tác hóa đơn</h3>
        </div>
        <button @click="showHistoryModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <!-- Body with scrollable timeline -->
      <div class="p-6 overflow-y-auto flex-grow space-y-4">
        <!-- Vertical timeline component -->
        <div class="relative pl-6 border-l-2 border-gray-200 space-y-6 py-2">
          <div
            v-for="(log, idx) in historyLogs"
            :key="idx"
            class="relative"
          >
            <!-- Timeline Dot indicator -->
            <span class="absolute -left-[32px] top-1 w-3.5 h-3.5 rounded-full bg-primary-container ring-4 ring-orange-50 border border-white"></span>
            
            <div class="flex flex-col">
              <span class="text-sm font-bold text-on-surface leading-tight">
                {{ log.hanhDong || getStatusText(log.trangThai) || 'Cập nhật trạng thái' }}
              </span>
              <span class="text-xs text-on-surface-variant mt-1">
                Thời gian: <span class="font-semibold text-on-surface">{{ formatDateTime(log.thoiGian || log.ngayTao || log.createdAt) }}</span>
              </span>
              <span class="text-xs text-on-surface-variant mt-0.5">
                Người thực hiện: <span class="font-semibold text-on-surface">{{ log.nguoiThucHien || log.nguoiThaoTac || log.nguoiTao || 'Hệ thống' }}</span>
              </span>
              
              <!-- Remark box -->
              <div v-if="log.ghiChu || log.notes" class="text-xs bg-gray-50 border border-gray-100 rounded-lg p-2.5 mt-2 text-on-surface-variant leading-relaxed italic">
                "{{ log.ghiChu || log.notes }}"
              </div>
            </div>
          </div>

          <!-- Empty state fallback -->
          <div v-if="historyLogs.length === 0" class="text-center py-8 text-sm text-on-surface-variant">
            Chưa ghi nhận lịch sử thao tác nào.
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
        <button
          type="button"
          @click="showHistoryModal = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Đóng lại
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
      'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info'
    }"
  >
    <span class="material-symbols-outlined text-lg">
      {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
    </span>
    <span class="text-sm font-semibold font-body-md">{{ toast.message }}</span>
    <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-gray-600 cursor-pointer">
      <span class="material-symbols-outlined text-sm">close</span>
    </button>
  </div>

  <!-- Cancellation Approval Modal -->
  <div 
    v-if="showApprovalModal" 
    class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
  >
    <div 
      class="bg-surface rounded-2xl shadow-2xl border border-outline-variant/30 max-w-md w-full overflow-hidden"
    >
      <div 
        class="px-6 py-4 text-white flex justify-between items-center"
        :class="isAgreeCancel ? 'bg-red-600' : 'bg-amber-600'"
      >
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span class="material-symbols-outlined">gavel</span>
          {{ isAgreeCancel ? 'Đồng ý hủy đơn hàng' : 'Từ chối hủy đơn hàng' }}
        </h3>
        <button @click="closeApprovalModal" class="text-white hover:opacity-80 transition-opacity">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div class="p-6 text-left">
        <p class="text-sm text-on-surface-variant mb-4">
          {{ isAgreeCancel ? 'Hành động này sẽ hủy đơn hàng và hoàn trả số lượng tồn kho của các sản phẩm trong đơn.' : 'Hành động này sẽ từ chối yêu cầu hủy đơn từ khách hàng và tiếp tục quy trình xử lý đơn.' }}
        </p>
        
        <label class="block text-label-sm font-semibold text-on-surface mb-2">Ghi chú thao tác <span class="text-red-500">*</span></label>
        <textarea 
          v-model="approvalNote"
          placeholder="Nhập ghi chú phản hồi khách hàng..." 
          rows="3"
          class="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:outline-none focus:ring-1 transition-colors"
          :class="isAgreeCancel ? 'focus:border-red-500 focus:ring-red-500' : 'focus:border-amber-500 focus:ring-amber-500'"
          required
        ></textarea>
      </div>
      
      <div class="px-6 py-4 bg-surface-container border-t border-outline-variant/20 flex justify-end gap-3">
        <button 
          @click="closeApprovalModal" 
          class="px-4 py-2 border border-outline-variant hover:bg-surface-container rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          :disabled="isProcessingApproval"
        >
          Hủy bỏ
        </button>
        <button 
          @click="submitApproval" 
          class="px-5 py-2 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2"
          :class="isAgreeCancel ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'"
          :disabled="isProcessingApproval"
        >
          <span v-if="isProcessingApproval" class="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
          Xác nhận
        </button>
      </div>
    </div>
  </div>

  <!-- Print only container -->
  <div v-if="detail" class="print-invoice-container hidden print:block bg-white text-black p-10 font-sans max-w-[800px] mx-auto">
    <!-- Store Name & Date -->
    <div class="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight uppercase text-black">BEE STYLISH</h1>
        <p class="text-xs text-gray-500 uppercase mt-1 tracking-wider">Cửa hàng thời trang cao cấp</p>
      </div>
      <div class="text-right">
        <p class="text-base font-bold text-black">{{ formatPrintDate(getCreatedDate) }}</p>
        <p class="text-sm text-gray-600 mt-1">Mã hóa đơn: <span class="font-bold text-black">{{ getInvoiceCode }}</span></p>
      </div>
    </div>

    <!-- Two column Info -->
    <div class="grid grid-cols-2 gap-12 mb-8">
      <!-- Col 1: Customer Info -->
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-black border-b border-gray-200 pb-2 mb-3">HÓA ĐƠN ĐƯỢC GỬI CHO:</h3>
        <div class="space-y-1 text-sm text-gray-800">
          <p class="font-bold text-black">{{ getCustomerName }}</p>
          <p v-if="getCustomerPhone && getCustomerPhone !== '—'">Số điện thoại: {{ getCustomerPhone }}</p>
          <p v-if="getDeliveryAddress && getDeliveryAddress !== '—'" class="leading-relaxed">Địa chỉ: {{ getDeliveryAddress }}</p>
          <p v-if="getCustomerEmail && getCustomerEmail !== '—'">Email: {{ getCustomerEmail }}</p>
        </div>
      </div>
      
      <!-- Col 2: Invoice Metadata -->
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-black border-b border-gray-200 pb-2 mb-3">THÔNG TIN HÓA ĐƠN:</h3>
        <div class="space-y-1 text-sm text-gray-800">
          <p><strong>Loại đơn hàng:</strong> {{ getOrderType === 0 ? 'Bán trực tiếp tại quầy' : 'Đơn hàng giao tận nơi' }}</p>
          <p><strong>Thanh toán:</strong> {{ getPaymentMethod }}</p>
          <p><strong>Nhân viên tạo:</strong> {{ getEmployeeName }}</p>
          <p v-if="getInvoiceNote && getInvoiceNote !== '—'"><strong>Ghi chú:</strong> {{ getInvoiceNote }}</p>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="w-full text-left border-collapse border-y border-black mb-8">
      <thead>
        <tr class="border-b border-black text-xs font-bold uppercase text-black">
          <th class="py-3 pr-4">HẠNG MỤC</th>
          <th class="py-3 px-4 text-center w-24">SỐ LƯỢNG</th>
          <th class="py-3 px-4 text-right w-32">ĐƠN GIÁ</th>
          <th class="py-3 pl-4 text-right w-32">TỔNG CỘNG</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 text-sm text-gray-800">
        <tr v-for="(item, index) in getProducts" :key="item.id || index">
          <td class="py-4 pr-4">
            <span class="font-bold text-black">{{ item.tenSanPham || 'Sản phẩm' }}</span>
            <div class="text-xs text-gray-500 mt-0.5">
              Mã biến thể: {{ item.maChiTietSanPham || item.maBienThe || item.maSanPham || item.ma || 'N/A' }} | 
              Kích cỡ: {{ item.tenKichCo || item.tenKichThuoc || '—' }} | 
              Màu sắc: {{ item.tenMauSac || '—' }}
            </div>
          </td>
          <td class="py-4 px-4 text-center">{{ item.soLuong || 0 }}</td>
          <td class="py-4 px-4 text-right">{{ formatPriceVND(item.donGiaSauGiam || item.donGia) }}</td>
          <td class="py-4 pl-4 text-right font-semibold text-black">
            {{ formatPriceVND((item.donGiaSauGiam || item.donGia) * (item.soLuong || 0)) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Footer & Totals -->
    <div class="grid grid-cols-12 gap-6 items-start">
      <!-- Left: Thank you message -->
      <div class="col-span-6">
        <p class="text-lg font-bold italic text-black">Xin cảm ơn!</p>
        <p class="text-xs text-gray-500 mt-1">Chúc quý khách có trải nghiệm mua sắm tuyệt vời cùng Bee Stylish.</p>
      </div>
      
      <!-- Right: Invoice totals -->
      <div class="col-span-6">
        <table class="w-full text-sm text-gray-800 border-collapse">
          <tbody>
            <tr class="border-b border-gray-100">
              <td class="py-2 pr-4 text-left font-semibold text-black">Tổng phụ:</td>
              <td class="py-2 pl-4 text-right">{{ formatPriceVND(getGoodsTotal) }}</td>
            </tr>
            <tr v-if="getDiscountAmount > 0" class="border-b border-gray-100">
              <td class="py-2 pr-4 text-left font-semibold text-black">Giảm giá:</td>
              <td class="py-2 pl-4 text-right text-red-600">-{{ formatPriceVND(getDiscountAmount) }}</td>
            </tr>
            <tr v-if="getShipFee > 0" class="border-b border-gray-100">
              <td class="py-2 pr-4 text-left font-semibold text-black">Phí vận chuyển:</td>
              <td class="py-2 pl-4 text-right">{{ formatPriceVND(getShipFee) }}</td>
            </tr>
            <tr class="border-t-2 border-black">
              <td class="py-3 pr-4 text-left font-bold text-lg text-black">Tổng cộng:</td>
              <td class="py-3 pl-4 text-right font-bold text-lg text-black">{{ formatPriceVND(getPayableTotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bottom contact footer -->
    <div class="border-t border-gray-200 mt-16 pt-6 text-center text-xs text-gray-500 space-y-1">
      <p>Cửa hàng thời trang cao cấp Bee Stylish</p>
      <p>Địa chỉ: Đường Trịnh Văn Bô, Phương Canh, Nam Từ Liêm, Hà Nội</p>
      <p>Hotline: +84 912 345 678 | Email: contact@bestylish.vn</p>
    </div>
  </div>
</div> <!-- Close of invoice-detail-wrapper -->
</template>

<style scoped>
.card-shadow {
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.05);
}
</style>

<style>
@media print {
  /* Hide sidebar and header of the parent layout */
  nav, header, .print\:hidden {
    display: none !important;
  }
  
  /* Reset layout margins for print */
  .ml-\[260px\], .ml-\[80px\] {
    margin-left: 0 !important;
  }
  
  /* Reset main padding and margin */
  main {
    padding: 0 !important;
    margin-top: 0 !important;
  }
  
  body, #app, .bg-\[\#F8F9FA\] {
    background: white !important;
    background-color: white !important;
  }
  
  .max-w-7xl {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* Force background colors to print if any */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}

/* Styling for on-screen print layout verification */
.force-print-test nav, .force-print-test header, .force-print-test .print\:hidden {
  display: none !important;
}
.force-print-test .ml-\[260px\], .force-print-test .ml-\[80px\] {
  margin-left: 0 !important;
}
.force-print-test main {
  padding: 0 !important;
  margin-top: 0 !important;
}
.force-print-test body, .force-print-test #app, .force-print-test .bg-\[\#F8F9FA\] {
  background: white !important;
  background-color: white !important;
}
.force-print-test .max-w-7xl {
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}
.force-print-test .print-invoice-container {
  display: block !important;
}
.force-print-test .screen-only-container {
  display: none !important;
}
</style>
