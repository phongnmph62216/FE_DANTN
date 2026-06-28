<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../../services/api'

const router = useRouter()
const route = useRoute()

const isEdit = ref(false)
const voucherId = ref(null)

// Form states
const maPhieu = ref('')
const tenPhieu = ref('')
const kieuApDung = ref(1) // 0: Toàn cửa hàng, 1: Cá nhân
const loaiGiam = ref(0) // 0: Giảm %, 1: Giảm tiền mặt
const giaTriGiam = ref('')
const giamToiDa = ref('')
const donToiThieu = ref('')
const soLuong = ref('')
const ngayBatDau = ref('')
const ngayKetThuc = ref('')
const danhSachKhachHangIds = ref([])

// Customer list states (for Cá nhân cards)
const customers = ref([])
const searchQuery = ref('')
const isLoadingCustomers = ref(false)
const currentPage = ref(0)
const totalPages = ref(1)
const totalElements = ref(0)
const pageSize = ref(5)

// Toast State
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// Format currency helper
const formatPrice = (price) => {
  if (price === null || price === undefined) return '0 đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(price)
    .replace(/\s?₫/, ' đ')
}

const formatBirthDate = (dateString) => {
  if (!dateString) return '-'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch (e) {
    return '-'
  }
}

// Fetch customers
const fetchCustomers = async (page = 0) => {
  if (kieuApDung.value !== 1) return
  isLoadingCustomers.value = true
  currentPage.value = page

  try {
    const params = {
      page: page,
      size: pageSize.value
    }
    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }

    const res = await api.get('/api/v1/khach-hang', { params })
    if (res.data) {
      customers.value = res.data.content || []
      totalPages.value = res.data.totalPages || 1
      totalElements.value = res.data.totalElements || 0
    }
  } catch (err) {
    console.error('Failed to fetch customers:', err)
    showToast('Không tải được danh sách khách hàng!', 'error')
  } finally {
    isLoadingCustomers.value = false
  }
}

// Watchers
watch(kieuApDung, (newVal) => {
  if (newVal === 1) {
    if (customers.value.length === 0) {
      fetchCustomers(0)
    }
    soLuong.value = danhSachKhachHangIds.value.length
  } else if (newVal === 0) {
    danhSachKhachHangIds.value = []
    soLuong.value = ''
  }
})

watch(danhSachKhachHangIds, (newVal) => {
  if (kieuApDung.value === 1) {
    soLuong.value = newVal.length
  }
}, { deep: true })

// Debounced live search
let searchTimeout = null
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchCustomers(0)
  }, 400)
})

// Toggle selection
const toggleCustomer = (customer) => {
  const idx = danhSachKhachHangIds.value.indexOf(customer.id)
  if (idx > -1) {
    danhSachKhachHangIds.value.splice(idx, 1)
  } else {
    danhSachKhachHangIds.value.push(customer.id)
  }
}

const isCustomerSelected = (customer) => {
  return danhSachKhachHangIds.value.includes(customer.id)
}

// Mock details generator for customer statistics (since not returned in list endpoint)
const getMockDetails = (item) => {
  const id = item.id || 1
  if (id > 4) {
    return {
      tongDon: 0,
      tongChiTieu: '0 đ',
      lanMuaGanNhat: '-'
    }
  }
  const tongDon = (id * 3) % 7
  const tongChiTieuVal = (id * 150000) % 900000
  const lanMuaGanNhatStr = id % 2 === 0 ? '29/04/2026' : '-'
  return {
    tongDon: tongDon,
    tongChiTieu: formatPrice(tongChiTieuVal),
    lanMuaGanNhat: lanMuaGanNhatStr
  }
}

// Confirmation Modal State
const confirmModal = ref({ show: false, title: '', message: '', onConfirm: null })
const triggerConfirm = (message, onConfirm, title = 'Xác nhận hành động') => {
  confirmModal.value = {
    show: true,
    title,
    message,
    onConfirm
  }
}
const handleConfirm = async () => {
  const cb = confirmModal.value.onConfirm
  confirmModal.value.show = false
  if (cb) {
    await cb()
  }
}

// Validation & Save handler
const handleSave = async () => {
  // Simple validation
  if (!maPhieu.value.trim()) {
    showToast('Mã phiếu giảm giá không được để trống!', 'error')
    return
  }
  if (!tenPhieu.value.trim()) {
    showToast('Tên phiếu giảm giá không được để trống!', 'error')
    return
  }
  if (giaTriGiam.value === '' || parseFloat(giaTriGiam.value) <= 0) {
    showToast('Giá trị giảm phải lớn hơn 0!', 'error')
    return
  }
  if (loaiGiam.value === 0 && parseFloat(giaTriGiam.value) > 100) {
    showToast('Giá trị giảm phần trăm không được vượt quá 100%!', 'error')
    return
  }
  if (loaiGiam.value === 0 && (giamToiDa.value === '' || parseFloat(giamToiDa.value) <= 0)) {
    showToast('Vui lòng nhập giá trị giảm tối đa hợp lệ!', 'error')
    return
  }
  if (donToiThieu.value === '' || parseFloat(donToiThieu.value) < 0) {
    showToast('Điều kiện hóa đơn (đơn tối thiểu) không được âm!', 'error')
    return
  }
  if (soLuong.value === '' || parseInt(soLuong.value, 10) <= 0) {
    showToast('Số lượng phải lớn hơn 0!', 'error')
    return
  }
  if (!ngayBatDau.value) {
    showToast('Vui lòng chọn ngày bắt đầu!', 'error')
    return
  }
  if (!ngayKetThuc.value) {
    showToast('Vui lòng chọn ngày kết thúc!', 'error')
    return
  }

  const start = new Date(ngayBatDau.value)
  const end = new Date(ngayKetThuc.value)
  if (end < start) {
    showToast('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu!', 'error')
    return
  }

  if (kieuApDung.value === 1 && danhSachKhachHangIds.value.length === 0) {
    showToast('Vui lòng chọn ít nhất một khách hàng để áp dụng phiếu giảm giá cá nhân!', 'error')
    return
  }

  // Trigger confirmation
  const actionText = isEdit.value ? 'cập nhật' : 'thêm mới'
  triggerConfirm(
    `Bạn có chắc chắn muốn ${actionText} phiếu giảm giá này không?`,
    executeSave,
    isEdit.value ? 'Xác nhận cập nhật' : 'Xác nhận thêm mới'
  )
}

const executeSave = async () => {
  // Format dates: input type="datetime-local" format is YYYY-MM-DDTHH:mm. Append :00 to comply with YYYY-MM-DDTHH:mm:ss.
  const startISO = ngayBatDau.value.length === 16 ? `${ngayBatDau.value}:00` : ngayBatDau.value
  const endISO = ngayKetThuc.value.length === 16 ? `${ngayKetThuc.value}:00` : ngayKetThuc.value

  const payload = {
    maPhieu: maPhieu.value.trim(),
    tenPhieu: tenPhieu.value.trim(),
    kieuApDung: kieuApDung.value,
    loaiGiam: loaiGiam.value,
    giaTriGiam: parseFloat(giaTriGiam.value),
    giamToiDa: loaiGiam.value === 0 ? parseFloat(giamToiDa.value) : null,
    donToiThieu: parseFloat(donToiThieu.value),
    soLuong: parseInt(soLuong.value, 10),
    ngayBatDau: startISO,
    ngayKetThuc: endISO,
    danhSachKhachHangIds: kieuApDung.value === 1 ? danhSachKhachHangIds.value : []
  }

  try {
    let res
    if (isEdit.value) {
      res = await api.put(`/api/v1/phieu-giam-gia/${voucherId.value}`, payload)
    } else {
      res = await api.post('/api/v1/phieu-giam-gia', payload)
    }

    if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
      const actionName = isEdit.value ? 'Cập nhật' : 'Tạo'
      showToast(`${actionName} phiếu giảm giá thất bại: ${res._wrapper.message}`, 'error')
    } else {
      const successMsg = isEdit.value ? 'Đã cập nhật phiếu giảm giá thành công!' : 'Đã thêm phiếu giảm giá thành công!'
      showToast(successMsg, 'success')
      setTimeout(() => {
        router.push('/vouchers')
      }, 1000)
    }
  } catch (err) {
    const actionName = isEdit.value ? 'cập nhật' : 'tạo'
    console.error(`Failed to ${actionName} voucher:`, err)
    const errMsg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau!'
    showToast(errMsg, 'error')
  }
}

const handleCancel = () => {
  if (tenPhieu.value || giaTriGiam.value || soLuong.value) {
    triggerConfirm(
      'Bạn có chắc chắn muốn hủy? Mọi thay đổi chưa lưu sẽ bị mất.',
      () => router.push('/vouchers'),
      'Xác nhận hủy bỏ'
    )
  } else {
    router.push('/vouchers')
  }
}

const fetchVoucherDetail = async (id) => {
  try {
    const res = await api.get(`/api/v1/phieu-giam-gia/${id}`)
    const responseData = res.data
    const data = responseData?.data || responseData
    if (data) {
      maPhieu.value = data.maPhieuGiamGia || ''
      tenPhieu.value = data.tenPhieuGiamGia || ''
      kieuApDung.value = data.kieuApDung
      loaiGiam.value = data.loaiGiam
      giaTriGiam.value = data.giaTri !== null && data.giaTri !== undefined ? data.giaTri : ''
      giamToiDa.value = data.giaGiamToiDa !== null && data.giaGiamToiDa !== undefined ? data.giaGiamToiDa : ''
      donToiThieu.value = data.dieuKienGiam !== null && data.dieuKienGiam !== undefined ? data.dieuKienGiam : ''
      soLuong.value = data.soLuong !== null && data.soLuong !== undefined ? data.soLuong : ''
      ngayBatDau.value = data.ngayBatDau ? data.ngayBatDau.substring(0, 16) : ''
      ngayKetThuc.value = data.ngayKetThuc ? data.ngayKetThuc.substring(0, 16) : ''
      danhSachKhachHangIds.value = data.danhSachKhachHangIds || []
    }
  } catch (err) {
    console.error('Failed to fetch voucher detail:', err)
    showToast('Không tải được thông tin chi tiết phiếu giảm giá!', 'error')
  }
}

onMounted(async () => {
  if (route.params.id) {
    isEdit.value = true
    voucherId.value = route.params.id
    await fetchVoucherDetail(route.params.id)
  } else {
    isEdit.value = false
    try {
      const res = await api.get('/api/v1/phieu-giam-gia', { params: { page: 0, size: 1000 } })
      const list = res.data?.content || res.data || []
      
      let maxNum = 0
      list.forEach(item => {
        if (item.maPhieuGiamGia && item.maPhieuGiamGia.startsWith('PGG')) {
          const numPart = item.maPhieuGiamGia.replace('PGG', '')
          const match = numPart.match(/^\d+/)
          if (match) {
            const num = parseInt(match[0], 10)
            if (!isNaN(num) && num > maxNum) {
              maxNum = num
            }
          }
        }
      })
      const nextNum = maxNum + 1
      maPhieu.value = `PGG${String(nextNum).padStart(3, '0')}`
    } catch (err) {
      console.warn('API voucher code generation failed, using fallback:', err.message)
      maPhieu.value = 'PGG' + Math.floor(100000 + Math.random() * 900000)
    }
  }
  fetchCustomers(0)
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-gutter">
    <!-- Form Card -->
    <div class="bg-surface-container-lowest rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-container-padding border border-gray-100">
      <h2 class="font-headline-md text-headline-md text-on-surface mb-stack-lg uppercase font-bold tracking-tight">
        {{ isEdit ? 'CẬP NHẬT PHIẾU GIẢM GIÁ' : 'THÊM PHIẾU GIẢM GIÁ' }}
      </h2>
      
      <form @submit.prevent="handleSave">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <!-- Left Column -->
          <div class="space-y-stack-md">
            <!-- Mã phiếu -->
            <div>
              <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">Mã phiếu giảm giá</label>
              <div class="relative rounded-md shadow-sm border border-gray-300 bg-white">
                <input
                  v-model="maPhieu"
                  :disabled="isEdit"
                  :class="isEdit ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-transparent border-gray-300'"
                  class="block w-full rounded-md border-0 py-2 px-3 text-body-md focus:ring-1 focus:ring-brand-orange focus:border-brand-orange placeholder-gray-400"
                  placeholder="Nhập mã phiếu"
                  type="text"
                />
              </div>
            </div>

            <!-- Kiểu áp dụng -->
            <div>
              <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">
                Kiểu áp dụng <span class="text-red-500 font-bold">*</span>
              </label>
              <div class="flex items-center space-x-6 mt-2">
                <label class="flex items-center cursor-pointer select-none">
                  <input
                    v-model="kieuApDung"
                    :value="0"
                    class="h-4 w-4 text-brand-orange focus:ring-brand-orange border-gray-300 cursor-pointer"
                    name="apply_type"
                    type="radio"
                  />
                  <span class="ml-2 font-body-md text-body-md text-gray-700">Tất cả</span>
                </label>
                <label class="flex items-center cursor-pointer select-none">
                  <input
                    v-model="kieuApDung"
                    :value="1"
                    class="h-4 w-4 text-brand-orange focus:ring-brand-orange border-gray-300 cursor-pointer"
                    name="apply_type"
                    type="radio"
                  />
                  <span class="ml-2 font-body-md text-body-md text-gray-700">Cá nhân</span>
                </label>
              </div>
            </div>

            <!-- Giá trị giảm -->
            <div>
              <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">
                Giá trị giảm <span class="text-red-500 font-bold">*</span>
              </label>
              <div class="relative rounded-md shadow-sm border border-gray-300 bg-white flex items-center">
                <input
                  v-model="giaTriGiam"
                  class="block w-full rounded-l-md border-0 py-2 px-3 text-body-md focus:ring-0 focus:outline-none bg-transparent"
                  placeholder="Nhập giá trị giảm"
                  type="number"
                  min="0"
                  step="any"
                />
                <span class="px-3 py-2 font-body-md text-gray-500 border-l border-gray-200 bg-gray-50 rounded-r-md min-w-[44px] text-center font-medium">
                  {{ loaiGiam === 0 ? '%' : 'đ' }}
                </span>
              </div>
            </div>

            <!-- Điều kiện -->
            <div>
              <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">
                Điều kiện đơn hàng <span class="text-red-500 font-bold">*</span>
              </label>
              <div class="relative rounded-md shadow-sm border border-gray-300 bg-white flex items-center">
                <input
                  v-model="donToiThieu"
                  class="block w-full rounded-l-md border-0 py-2 px-3 text-body-md focus:ring-0 focus:outline-none bg-transparent"
                  placeholder="Nhập giá trị đơn hàng tối thiểu"
                  type="number"
                  min="0"
                  step="any"
                />
                <span class="px-3 py-2 font-body-md text-gray-500 border-l border-gray-200 bg-gray-50 rounded-r-md min-w-[44px] text-center font-medium">
                  đ
                </span>
              </div>
            </div>

            <!-- Ngày bắt đầu -->
            <div>
              <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">
                Ngày bắt đầu <span class="text-red-500 font-bold">*</span>
              </label>
              <div class="relative rounded-md shadow-sm border border-gray-300 bg-white flex items-center pr-3">
                <input
                  v-model="ngayBatDau"
                  class="block w-full rounded-md border-0 py-2 px-3 text-body-md focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-transparent text-gray-700 cursor-pointer"
                  type="datetime-local"
                />
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="space-y-stack-md">
            <!-- Tên phiếu -->
            <div>
              <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">
                Tên phiếu giảm giá <span class="text-red-500 font-bold">*</span>
              </label>
              <div class="relative rounded-md shadow-sm border border-gray-300 bg-white">
                <input
                  v-model="tenPhieu"
                  class="block w-full rounded-md border-0 py-2 px-3 text-body-md focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-transparent placeholder-gray-400"
                  placeholder="Nhập tên phiếu giảm giá"
                  type="text"
                />
              </div>
            </div>

            <!-- Loại ưu đãi -->
            <div>
              <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">
                Loại ưu đãi <span class="text-red-500 font-bold">*</span>
              </label>
              <div class="flex items-center space-x-6 mt-2">
                <label class="flex items-center cursor-pointer select-none">
                  <input
                    v-model="loaiGiam"
                    :value="0"
                    class="h-4 w-4 text-brand-orange focus:ring-brand-orange border-gray-300 cursor-pointer"
                    name="reward_type"
                    type="radio"
                  />
                  <span class="ml-2 font-body-md text-body-md text-gray-700">Giảm %</span>
                </label>
                <label class="flex items-center cursor-pointer select-none">
                  <input
                    v-model="loaiGiam"
                    :value="1"
                    class="h-4 w-4 text-brand-orange focus:ring-brand-orange border-gray-300 cursor-pointer"
                    name="reward_type"
                    type="radio"
                  />
                  <span class="ml-2 font-body-md text-body-md text-gray-700">Giảm tiền</span>
                </label>
              </div>
            </div>

            <!-- Giá trị tối đa -->
            <div>
              <label class="block font-label-sm text-label-sm mb-stack-sm font-semibold" :class="loaiGiam === 1 ? 'text-gray-400' : 'text-gray-600'">
                Giá trị tối đa <span v-if="loaiGiam === 0" class="text-red-500 font-bold">*</span>
              </label>
              <div class="relative rounded-md shadow-sm border flex items-center bg-white" :class="loaiGiam === 1 ? 'border-gray-200 bg-gray-50/50' : 'border-gray-300'">
                <input
                  v-model="giamToiDa"
                  :disabled="loaiGiam === 1"
                  class="block w-full rounded-l-md border-0 py-2 px-3 text-body-md focus:ring-0 focus:outline-none bg-transparent disabled:text-gray-400 disabled:cursor-not-allowed"
                  placeholder="Nhập giá trị giảm tối đa"
                  type="number"
                  min="0"
                  step="any"
                />
                <span class="px-3 py-2 font-body-md border-l rounded-r-md min-w-[44px] text-center font-medium" :class="loaiGiam === 1 ? 'border-gray-200 bg-gray-100 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'">
                  đ
                </span>
              </div>
            </div>

            <!-- Số lượng -->
            <div>
              <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">
                Số lượng <span class="text-red-500 font-bold">*</span>
              </label>
              <div
                class="relative rounded-md shadow-sm border bg-white"
                :class="kieuApDung === 1 ? 'border-gray-200 bg-gray-50/50' : 'border-gray-300'"
              >
                <input
                  v-model="soLuong"
                  :disabled="kieuApDung === 1"
                  class="block w-full rounded-md border-0 py-2 px-3 text-body-md focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-transparent disabled:text-gray-400 disabled:cursor-not-allowed"
                  type="number"
                  min="0"
                  placeholder="Nhập số lượng"
                />
              </div>
            </div>

            <!-- Ngày kết thúc -->
            <div>
              <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">
                Ngày kết thúc <span class="text-red-500 font-bold">*</span>
              </label>
              <div class="relative rounded-md shadow-sm border border-gray-300 bg-white flex items-center pr-3">
                <input
                  v-model="ngayKetThuc"
                  class="block w-full rounded-md border-0 py-2 px-3 text-body-md focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-transparent text-gray-700 cursor-pointer"
                  type="datetime-local"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Action Footer -->
        <div class="mt-stack-lg flex justify-end space-x-3 pt-stack-md border-t border-gray-100 bg-white">
          <button
            @click="handleCancel"
            class="px-6 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-label-sm text-label-sm transition-colors cursor-pointer font-medium"
            type="button"
          >
            Hủy
          </button>
          <button
            @click="handleSave"
            class="px-6 py-2 rounded-md bg-[#EF972D] hover:bg-orange-600 text-white font-label-sm text-label-sm transition-colors shadow-sm cursor-pointer font-medium"
            type="button"
          >
            Lưu
          </button>
        </div>
      </form>
    </div>

    <!-- Customer List Card (visible only when Cá nhân) -->
    <div
      v-if="kieuApDung === 1"
      class="bg-surface-container-lowest rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-container-padding border border-gray-100 space-y-4"
    >
      <div class="flex items-center justify-between border-b border-gray-100 pb-3">
        <h2 class="font-headline-md text-headline-md text-on-surface uppercase font-bold tracking-tight">DANH SÁCH KHÁCH HÀNG</h2>
        <span class="text-sm font-bold text-[#EF972D] bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
          Đã chọn: {{ danhSachKhachHangIds.length }}
        </span>
      </div>

      <!-- Filters -->
      <div class="flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-grow w-full">
          <label class="block font-label-sm text-label-sm text-gray-600 mb-stack-sm font-semibold">Tìm kiếm khách hàng</label>
          <div class="relative rounded-md shadow-sm border border-gray-300 bg-white">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <span class="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              v-model="searchQuery"
              class="block w-full rounded-md border-0 py-2 pl-9 pr-3 text-body-md focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-transparent placeholder-gray-400"
              placeholder="Nhập tên hoặc email khách hàng"
              type="text"
            />
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto border border-gray-100 rounded-lg">
        <div v-if="isLoadingCustomers" class="p-10 flex flex-col items-center justify-center gap-3 bg-white">
          <div class="w-8 h-8 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm font-semibold text-gray-500">Đang tải khách hàng...</span>
        </div>
        
        <div v-else-if="customers.length === 0" class="p-10 text-center bg-white">
          <span class="material-symbols-outlined text-gray-400 text-5xl">search_off</span>
          <p class="text-sm text-gray-500 font-medium mt-2">Không tìm thấy khách hàng nào hoạt động.</p>
        </div>

        <table v-else class="min-w-full divide-y divide-gray-100 bg-white">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-center font-label-sm text-gray-500 w-16" scope="col">
                <!-- Select Header -->
              </th>
              <th class="px-4 py-3 text-left font-label-sm text-gray-500 uppercase tracking-wider w-16" scope="col">STT</th>
              <th class="px-4 py-3 text-left font-label-sm text-gray-500 uppercase tracking-wider" scope="col">Tên</th>
              <th class="px-4 py-3 text-left font-label-sm text-gray-500 uppercase tracking-wider" scope="col">Email</th>
              <th class="px-4 py-3 text-left font-label-sm text-gray-500 uppercase tracking-wider" scope="col">Ngày sinh</th>
              <th class="px-4 py-3 text-left font-label-sm text-gray-500 uppercase tracking-wider w-24" scope="col">Tổng đơn</th>
              <th class="px-4 py-3 text-right font-label-sm text-gray-500 uppercase tracking-wider w-36" scope="col">Tổng chi tiêu</th>
              <th class="px-4 py-3 text-left font-label-sm text-gray-500 uppercase tracking-wider w-40" scope="col">Lần mua gần nhất</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr
              v-for="(item, index) in customers"
              :key="item.id"
              class="hover:bg-gray-50/50 transition-colors"
            >
              <td class="px-4 py-3 text-center whitespace-nowrap">
                <button
                  type="button"
                  @click="toggleCustomer(item)"
                  :class="isCustomerSelected(item) ? 'bg-[#EF972D] text-white border-transparent' : 'border-gray-300 text-gray-400 hover:border-[#EF972D] hover:text-[#EF972D]'"
                  class="h-6 w-6 rounded-full border flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[14px]">
                    {{ isCustomerSelected(item) ? 'check' : 'add' }}
                  </span>
                </button>
              </td>
              <td class="px-4 py-3 whitespace-nowrap font-body-md text-gray-600">
                {{ index + 1 + currentPage * pageSize }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap font-body-md font-semibold text-gray-800">
                {{ item.hoTen }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap font-body-md text-gray-600">
                {{ item.email }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap font-body-md text-gray-600">
                {{ formatBirthDate(item.ngaySinh) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap font-body-md text-gray-600 text-center">
                {{ getMockDetails(item).tongDon }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap font-body-md text-gray-800 text-right font-medium">
                {{ getMockDetails(item).tongChiTieu }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap font-body-md text-gray-600">
                {{ getMockDetails(item).lanMuaGanNhat }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1 && customers.length > 0" class="flex items-center justify-center gap-2 pt-2 bg-white">
        <button
          @click="fetchCustomers(currentPage - 1)"
          :disabled="currentPage === 0"
          class="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <button
          v-for="page in totalPages"
          :key="page"
          @click="fetchCustomers(page - 1)"
          :class="page - 1 === currentPage ? 'bg-[#EF972D] text-white border-transparent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          class="w-8 h-8 flex items-center justify-center rounded-md border font-label-sm text-label-sm transition-colors cursor-pointer"
        >
          {{ page }}
        </button>
        <button
          @click="fetchCustomers(currentPage + 1)"
          :disabled="currentPage === totalPages - 1"
          class="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Confirmation Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span class="material-symbols-outlined text-[#EF972D] text-2xl">help_outline</span>
        <h3 class="font-headline-sm text-base font-bold text-gray-800">{{ confirmModal.title }}</h3>
      </div>
      <div class="p-6 text-sm font-medium text-gray-600 font-body-md leading-relaxed">
        {{ confirmModal.message }}
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button
          type="button"
          @click="confirmModal.show = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          @click="handleConfirm"
          class="bg-[#EF972D] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
        >
          Xác nhận
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
</template>

<style scoped>
/* Custom Date input picker indicator styles */
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  background: transparent;
  bottom: 0;
  color: transparent;
  cursor: pointer;
  height: auto;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: auto;
}
</style>
