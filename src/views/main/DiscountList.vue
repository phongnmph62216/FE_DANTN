<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'

const router = useRouter()

// Filter states
const searchQuery = ref('')
const selectedStatus = ref('all')
const fromDate = ref('')
const toDate = ref('')

// List state
const sales = ref([])

// Custom Modal & Toast States
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

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

// Pagination & Loading States
const isLoading = ref(false)
const fetchError = ref(false)
const currentPage = ref(0)
const totalPages = ref(1)
const totalElements = ref(0)
const pageSize = ref(10)

// Helper to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch (e) {
    return dateString
  }
}

// Get dynamic display status details
const getStatusBadge = (item) => {
  if (item.trangThai === 0) {
    return {
      text: 'Đã kết thúc',
      class: 'bg-surface-variant text-on-surface-variant'
    }
  }
  const now = new Date()
  const start = new Date(item.ngayBatDau)
  const end = new Date(item.ngayKetThuc)
  
  if (now < start) {
    return {
      text: 'Sắp diễn ra',
      class: 'bg-[#fff8e1] text-[#f57f17]'
    }
  } else if (now > end) {
    return {
      text: 'Đã kết thúc',
      class: 'bg-surface-variant text-on-surface-variant'
    }
  } else {
    return {
      text: 'Đang áp dụng',
      class: 'bg-[#e6f4ea] text-[#137333]'
    }
  }
}

// Main API fetcher
const fetchSales = async (page = 0) => {
  isLoading.value = true
  fetchError.value = false
  currentPage.value = page

  try {
    const params = {
      page: page,
      size: pageSize.value,
    }

    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }

    // Handle status filtering
    if (selectedStatus.value === 'active' || selectedStatus.value === 'upcoming') {
      params.trangThai = 1
    } else if (selectedStatus.value === 'ended') {
      params.trangThai = 0
    }

    // Handle date filtering (Convert to ISO DateTime string like YYYY-MM-DDTHH:mm:ss)
    if (fromDate.value) {
      params.tuNgay = `${fromDate.value}T00:00:00`
    }
    if (toDate.value) {
      params.denNgay = `${toDate.value}T23:59:59`
    }

    const res = await api.get('/api/v1/dot-giam-gia', { params })
    const data = res.data

    if (data) {
      let content = data.content || []
      
      // Perform frontend sub-filtering for status if needed
      const now = new Date()
      if (selectedStatus.value === 'active') {
        content = content.filter(item => {
          const start = new Date(item.ngayBatDau)
          const end = new Date(item.ngayKetThuc)
          return now >= start && now <= end
        })
      } else if (selectedStatus.value === 'upcoming') {
        content = content.filter(item => {
          const start = new Date(item.ngayBatDau)
          return now < start
        })
      } else if (selectedStatus.value === 'ended') {
        // In case database status is 1 but end date passed
        content = content.filter(item => {
          const end = new Date(item.ngayKetThuc)
          return item.trangThai === 0 || now > end
        })
      }

      sales.value = content
      totalPages.value = data.totalPages || 1
      totalElements.value = data.totalElements || 0
    }
  } catch (err) {
    console.error('Failed to load discount periods list:', err)
    fetchError.value = true
    showToast('Không thể kết nối đến máy chủ để tải dữ liệu!', 'error')
  } finally {
    isLoading.value = false
  }
}

// Watchers for filtering change
watch(selectedStatus, () => fetchSales(0))
watch(fromDate, () => fetchSales(0))
watch(toDate, () => fetchSales(0))

// Debounced live search
let searchTimeout = null
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchSales(0)
  }, 400)
})

// Reset filters action
const resetFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = 'all'
  fromDate.value = ''
  toDate.value = ''
  fetchSales(0)
}

// Toggle status handler
const handleToggle = (item) => {
  const oldState = item.trangThai
  const newState = oldState === 1 ? 0 : 1

  triggerConfirm(
    `Bạn có chắc chắn muốn ${newState === 1 ? 'kích hoạt' : 'ngừng kích hoạt'} đợt giảm giá "${item.tenDotGiamGia}" không?`,
    async () => {
      try {
        const res = await api.patch(`/api/v1/dot-giam-gia/${item.id}/status`)
        if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
          showToast(`Đổi trạng thái thất bại: ${res._wrapper.message}`, 'error')
        } else {
          showToast(`Đã thay đổi trạng thái đợt giảm giá thành công!`, 'success')
          await fetchSales(currentPage.value)
        }
      } catch (err) {
        console.error('Failed to patch status:', err)
        showToast('Thay đổi trạng thái thất bại, vui lòng thử lại sau!', 'error')
      }
    },
    'Thay đổi trạng thái đợt giảm giá'
  )
}

// Add discount action
const addDiscount = () => {
  router.push('/discounts/create')
}

// Edit discount placeholder alert
const openEditModal = (item) => {
  showToast(`Chức năng chỉnh sửa đợt giảm giá "${item.tenDotGiamGia}" đang được phát triển ở backend!`, 'info')
}

// Compute visible pages for pagination
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  if (totalPages.value <= maxVisible) {
    for (let i = 0; i < totalPages.value; i++) {
      pages.push(i)
    }
  } else {
    if (currentPage.value < 3) {
      for (let i = 0; i < 4; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages.value - 1)
    } else if (currentPage.value > totalPages.value - 4) {
      pages.push(0)
      pages.push('...')
      for (let i = totalPages.value - 4; i < totalPages.value; i++) pages.push(i)
    } else {
      pages.push(0)
      pages.push('...')
      pages.push(currentPage.value - 1)
      pages.push(currentPage.value)
      pages.push(currentPage.value + 1)
      pages.push('...')
      pages.push(totalPages.value - 1)
    }
  }
  return pages
})

onMounted(() => {
  fetchSales(0)
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header & Filters Card -->
    <section class="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 p-gutter">
      <h1 class="font-headline-md text-headline-md uppercase text-on-surface mb-stack-md">
        QUẢN LÝ ĐỢT GIẢM GIÁ
      </h1>
      
      <div class="flex flex-col gap-stack-md">
        <!-- Search Row -->
        <div class="relative w-full">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style="font-size: 20px;">search</span>
          <input
            v-model="searchQuery"
            class="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-body-md font-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
            placeholder="Tìm theo mã hoặc tên"
            type="text"
          />
        </div>

        <!-- Action Row -->
        <div class="flex flex-wrap items-center justify-between gap-stack-md">
          <!-- Left: Filters -->
          <div class="flex flex-wrap items-center gap-stack-md">
            <!-- Status Dropdown -->
            <div class="relative">
              <select
                v-model="selectedStatus"
                class="appearance-none bg-surface-container-lowest border border-outline-variant/50 rounded-lg pl-3 pr-10 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all cursor-pointer"
              >
                <option value="all">Trạng thái (Tất cả)</option>
                <option value="active">Đang áp dụng</option>
                <option value="upcoming">Sắp diễn ra</option>
                <option value="ended">Đã kết thúc</option>
              </select>
              <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" style="font-size: 20px;">expand_more</span>
            </div>

            <!-- DatePicker From -->
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none" style="font-size: 18px;">calendar_today</span>
              <input
                v-model="fromDate"
                class="pl-9 pr-3 py-2 w-40 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-body-md font-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all cursor-pointer"
                placeholder="Từ ngày"
                type="date"
              />
            </div>

            <!-- DatePicker To -->
            <div class="relative flex items-center">
              <span class="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none" style="font-size: 18px;">calendar_today</span>
              <input
                v-model="toDate"
                class="pl-9 pr-3 py-2 w-40 bg-surface-container-lowest border border-outline-variant/50 rounded-lg text-body-md font-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all cursor-pointer"
                placeholder="Đến ngày"
                type="date"
              />
            </div>

            <!-- Reset Button -->
            <button
              @click="resetFilters"
              class="flex items-center justify-center p-2 rounded-lg border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low transition-colors group cursor-pointer"
              title="Reset Filters"
            >
              <span class="material-symbols-outlined group-hover:text-primary-container transition-colors" style="font-size: 20px;">refresh</span>
            </button>
          </div>

          <!-- Right: Add Button -->
          <button
            @click="addDiscount"
            class="flex items-center gap-2 bg-primary-container text-white px-4 py-2 rounded-lg font-body-md font-medium hover:bg-[#d68525] transition-colors shadow-sm cursor-pointer"
          >
            <span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'wght' 600;">add</span>
            Thêm đợt giảm
          </button>
        </div>
      </div>
    </section>

    <!-- Data Table Card -->
    <section class="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 overflow-x-auto">
      <div v-if="isLoading" class="p-10 flex flex-col items-center justify-center gap-3">
        <div class="w-8 h-8 border-4 border-primary-container border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm font-semibold text-on-surface-variant">Đang tải dữ liệu...</span>
      </div>

      <div v-else-if="fetchError" class="p-10 text-center space-y-4">
        <span class="material-symbols-outlined text-red-500 text-5xl">error</span>
        <p class="text-sm text-gray-500 font-medium">Đã có lỗi xảy ra khi tải dữ liệu từ máy chủ.</p>
        <button
          @click="fetchSales(0)"
          class="px-4 py-2 bg-primary-container text-white rounded-lg text-sm font-medium hover:bg-[#d68525] transition-colors cursor-pointer"
        >
          Tải lại
        </button>
      </div>

      <div v-else-if="sales.length === 0" class="p-10 text-center">
        <span class="material-symbols-outlined text-gray-400 text-5xl">search_off</span>
        <p class="text-sm text-gray-500 font-medium mt-2">Không tìm thấy đợt giảm giá nào phù hợp với bộ lọc.</p>
      </div>

      <table v-else class="w-full text-left whitespace-nowrap">
        <thead class="bg-surface border-b border-outline-variant/30">
          <tr>
            <th class="px-gutter py-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase w-16 text-center">STT</th>
            <th class="px-gutter py-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase">Mã</th>
            <th class="px-gutter py-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase">Tên</th>
            <th class="px-gutter py-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase text-right">Giá trị</th>
            <th class="px-gutter py-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase">Bắt đầu</th>
            <th class="px-gutter py-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase">Kết thúc</th>
            <th class="px-gutter py-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase">Trạng thái</th>
            <th class="px-gutter py-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase text-center w-32">Hành động</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant/20">
          <tr
            v-for="(item, index) in sales"
            :key="item.id"
            class="hover:bg-surface-container-low/50 transition-colors group"
          >
            <td class="px-gutter py-stack-md font-body-md text-on-surface-variant text-center">
              {{ index + 1 + currentPage * pageSize }}
            </td>
            <td class="px-gutter py-stack-md font-body-md font-medium text-on-surface">
              {{ item.maDotGiamGia || 'N/A' }}
            </td>
            <td class="px-gutter py-stack-md font-body-md text-on-surface">
              {{ item.tenDotGiamGia || 'N/A' }}
            </td>
            <td class="px-gutter py-stack-md font-body-md text-on-surface text-right">
              {{ item.phanTramGiam }}%
            </td>
            <td class="px-gutter py-stack-md font-body-md text-on-surface-variant">
              {{ formatDate(item.ngayBatDau) }}
            </td>
            <td class="px-gutter py-stack-md font-body-md text-on-surface-variant">
              {{ formatDate(item.ngayKetThuc) }}
            </td>
            <td class="px-gutter py-stack-md">
              <span
                :class="getStatusBadge(item).class"
                class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all shadow-sm"
              >
                {{ getStatusBadge(item).text }}
              </span>
            </td>
            <td class="px-gutter py-stack-md flex items-center justify-center gap-3">
              <!-- Toggle Switch -->
              <button
                @click="handleToggle(item)"
                :aria-checked="item.trangThai === 1 ? 'true' : 'false'"
                :class="item.trangThai === 1 ? 'bg-error' : 'bg-outline-variant'"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer"
                role="switch"
              >
                <span
                  :class="item.trangThai === 1 ? 'translate-x-5' : 'translate-x-1'"
                  class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
                ></span>
              </button>

              <!-- Edit Action -->
              <button
                @click="openEditModal(item)"
                class="text-on-surface-variant hover:text-primary-container transition-colors cursor-pointer"
                title="Chỉnh sửa"
              >
                <span class="material-symbols-outlined" style="font-size: 20px;">edit</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Pagination -->
    <section class="flex items-center justify-center py-stack-md" v-if="totalPages > 1 && sales.length > 0">
      <nav class="flex items-center gap-2">
        <button
          @click="fetchSales(currentPage - 1)"
          :disabled="currentPage === 0"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span class="material-symbols-outlined" style="font-size: 20px;">chevron_left</span>
        </button>

        <button
          v-for="(page, idx) in visiblePages"
          :key="idx"
          @click="page !== '...' && fetchSales(page)"
          :class="page === currentPage ? 'bg-primary-container text-white shadow-sm font-semibold' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container cursor-pointer'"
          class="w-8 h-8 flex items-center justify-center rounded-lg font-body-md font-medium transition-colors"
          :disabled="page === '...'"
        >
          {{ page === '...' ? '...' : page + 1 }}
        </button>

        <button
          @click="fetchSales(currentPage + 1)"
          :disabled="currentPage === totalPages - 1"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span class="material-symbols-outlined" style="font-size: 20px;">chevron_right</span>
        </button>
      </nav>
    </section>
  </div>

  <!-- Custom Confirmation Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span class="material-symbols-outlined text-primary-container text-2xl">help_outline</span>
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
          class="bg-[#EF972D] hover:bg-[#EF972D]/90 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
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
      'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'info'
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
/* Scoped adjustments for date inputs to fit nicely */
input[type="date"]::-webkit-calendar-picker-indicator {
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
