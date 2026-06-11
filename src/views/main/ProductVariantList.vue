<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../../services/api'

const route = useRoute()
const router = useRouter()

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

const searchQuery = ref(route.query.search || '')
const selectedColor = ref('')
const selectedSize = ref('')
const selectedStatus = ref('')
const priceMax = ref(2000000)
const priceRangeValue = ref(2000000)
const currentPage = ref(0)
const totalElements = ref(0)
const totalPages = ref(1)
const pageSize = ref(10)
const isLoading = ref(false)

// Dynamic filter options (populated from backend)
const colorOptions = ref([{ value: '', label: 'Màu sắc' }])
const sizeOptions = ref([{ value: '', label: 'Kích cỡ' }])

const statusOptions = [
  { value: '', label: 'Trạng thái' },
  { value: 'active', label: 'Đang bán' },
  { value: 'inactive', label: 'Ngừng bán' },
]

const allVariants = ref([])

// Helper to sanitize mangled Vietnamese characters from backend database encoding
const sanitizeVietnamese = (text) => {
  if (!text) return ''
  let cleaned = text
  cleaned = cleaned.replace(/Vi\?t Nam/g, 'Việt Nam')
  cleaned = cleaned.replace(/C\? b\?/g, 'Cổ bẻ')
  cleaned = cleaned.replace(/C\? tròn/g, 'Cổ tròn')
  cleaned = cleaned.replace(/C\? tr\?/g, 'Cổ trụ')
  cleaned = cleaned.replace(/C\? ch\? V/g, 'Cổ chữ V')
  cleaned = cleaned.replace(/C\?/g, 'Cổ')
  cleaned = cleaned.replace(/b\?/g, 'bẻ')
  cleaned = cleaned.replace(/tr\?/g, 'trễ')
  cleaned = cleaned.replace(/l\?/g, 'lỡ')
  cleaned = cleaned.replace(/Đ\? Ruby/g, 'Đỏ Ruby')
  cleaned = cleaned.replace(/Tr\?ng/g, 'Trắng')
  cleaned = cleaned.replace(/S\?a/g, 'Sữa')
  cleaned = cleaned.replace(/c\?p/g, 'cấp')
  cleaned = cleaned.replace(/hi\?u/g, 'hiệu')
  cleaned = cleaned.replace(/Ki\?u/g, 'Kiểu')
  cleaned = cleaned.replace(/Huy\?n/g, 'Huyền')
  return cleaned
}

const formatPrice = (amount) => {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`
}

const isDiscountActive = (v) => {
  if (!v.phanTramGiam || v.trangThaiDotGiamGia !== 1) return false
  if (!v.ngayBatDau || !v.ngayKetThuc) return false
  const now = new Date()
  const start = new Date(v.ngayBatDau)
  const end = new Date(v.ngayKetThuc)
  return now >= start && now <= end
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const priceRangeLabel = computed(() => {
  return `Khoảng giá: 0 đ - ${formatPrice(priceRangeValue.value)}`
})

// Computed filtered list (client-side price filter applied on top of server results)
const filteredVariants = computed(() => {
  let list = allVariants.value
  if (priceRangeValue.value < priceMax.value) {
    list = list.filter(v => {
      const activePrice = isDiscountActive(v)
        ? Math.round(v.salePrice * (100 - v.phanTramGiam) / 100)
        : v.salePrice
      return activePrice <= priceRangeValue.value
    })
  }
  return list
})

const selectedVariantIds = ref([])

const isAllSelected = computed({
  get() {
    return filteredVariants.value.length > 0 &&
      filteredVariants.value.every(v => selectedVariantIds.value.includes(v.id))
  },
  set(value) {
    if (value) {
      filteredVariants.value.forEach(v => {
        if (!selectedVariantIds.value.includes(v.id)) {
          selectedVariantIds.value.push(v.id)
        }
      })
    } else {
      filteredVariants.value.forEach(v => {
        const idx = selectedVariantIds.value.indexOf(v.id)
        if (idx > -1) {
          selectedVariantIds.value.splice(idx, 1)
        }
      })
    }
  }
})

const paginationLabel = computed(() => {
  const total = totalElements.value
  if (total === 0) return 'Hiển thị 0 trên 0'
  const start = currentPage.value * pageSize.value + 1
  const end = Math.min((currentPage.value + 1) * pageSize.value, total)
  return `Hiển thị ${start}-${end} trên ${total}`
})

// Load filter dropdown options from backend
const loadFilterOptions = async () => {
  try {
    const res = await api.get('/api/v1/attributes/all-active')
    const data = res.data
    if (data) {
      const colors = (data.mauSacList || []).map(item => ({
        value: String(item.id),
        label: sanitizeVietnamese(item.ten || '')
      }))
      colorOptions.value = [{ value: '', label: 'Màu sắc' }, ...colors]

      const sizes = (data.kichThuocList || []).map(item => ({
        value: String(item.id),
        label: sanitizeVietnamese(item.ten || '')
      }))
      sizeOptions.value = [{ value: '', label: 'Kích cỡ' }, ...sizes]
    }
  } catch (err) {
    console.warn('Failed to load filter options:', err)
  }
}

const productStatusMap = ref({})

const fetchProductStatuses = async () => {
  try {
    const res = await api.get('/api/v1/san-pham', { params: { size: 1000 } })
    if (res.data && res.data.content) {
      const statuses = {}
      res.data.content.forEach(p => {
        statuses[p.maSanPham] = p.trangThai === 1
      })
      productStatusMap.value = statuses
    }
  } catch (err) {
    console.warn('Failed to fetch product statuses:', err)
  }
}

const isParentProductInactive = (productCode) => {
  return productStatusMap.value[productCode] === false
}

// Main API fetcher for variants list
const fetchVariants = async (page = 0) => {
  isLoading.value = true
  currentPage.value = page
  selectedVariantIds.value = [] // Clear selection when fetching new dataset
  try {
    await fetchProductStatuses()
    const params = {
      page: page,
      size: pageSize.value,
    }
    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }
    if (selectedColor.value) {
      params.idMauSac = selectedColor.value
    }
    if (selectedSize.value) {
      params.idKichThuoc = selectedSize.value
    }
    if (selectedStatus.value === 'active') {
      params.trangThai = 1
    } else if (selectedStatus.value === 'inactive') {
      params.trangThai = 0
    }

    const res = await api.get('/api/v1/chi-tiet-san-pham', { params })
    const data = res.data

    if (data && Array.isArray(data.content)) {
      allVariants.value = data.content.map(item => ({
        id: item.id,
        productCode: item.maSanPham || 'N/A',
        variantCode: item.maChiTietSanPham || item.ma || 'N/A',
        size: sanitizeVietnamese(item.tenKichCo || item.tenKichThuoc || ''),
        color: sanitizeVietnamese(item.tenMauSac || ''),
        stock: item.soLuongTon ?? 0,
        importPrice: item.giaNhap ?? 0,
        salePrice: item.giaBan ?? 0,
        isActive: (item.soLuongTon ?? 0) === 0 ? false : (isParentProductInactive(item.maSanPham) ? false : (item.trangThai === 1)),
        image: formatImage(item.anh),
        phanTramGiam: item.phanTramGiam,
        ngayBatDau: item.ngayBatDau,
        ngayKetThuc: item.ngayKetThuc,
        trangThaiDotGiamGia: item.trangThaiDotGiamGia,
      }))
      totalPages.value = data.totalPages || 1
      totalElements.value = data.totalElements || 0
      // Update priceMax based on actual data
      if (allVariants.value.length > 0) {
        const maxPrice = Math.max(...allVariants.value.map(v => v.salePrice))
        if (maxPrice > 0) {
          const oldMax = priceMax.value
          priceMax.value = Math.ceil(maxPrice * 1.2)
          if (priceRangeValue.value === oldMax || priceRangeValue.value < maxPrice || priceRangeValue.value >= priceMax.value) {
            priceRangeValue.value = priceMax.value
          }
        }
      }
    } else {
      allVariants.value = []
      totalPages.value = 1
      totalElements.value = 0
    }
  } catch (err) {
    console.error('Failed to load variants list:', err)
    allVariants.value = []
    totalPages.value = 1
    totalElements.value = 0
  } finally {
    isLoading.value = false
  }
}

const handleToggle = (variant) => {
  const newState = variant.isActive
  const oldState = !variant.isActive
  
  // Revert toggle visually until confirmed
  variant.isActive = oldState

  if (newState && variant.stock === 0) {
    showToast('Không thể mở bán biến thể có tồn kho bằng 0!', 'error')
    return
  }

  if (newState && isParentProductInactive(variant.productCode)) {
    showToast('Không thể mở bán biến thể khi sản phẩm ngừng bán!', 'error')
    return
  }

  triggerConfirm(
    `Bạn có chắc chắn muốn ${newState ? 'mở bán lại' : 'ngừng bán'} biến thể "${variant.variantCode}" không?`,
    async () => {
      try {
        const res = await api.patch(`/api/v1/chi-tiet-san-pham/${variant.id}/status`)
        if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
          showToast(`Đổi trạng thái thất bại: ${res._wrapper.message}`, 'error')
        } else {
          showToast(`Đã thay đổi trạng thái biến thể sang ${newState ? 'Đang bán' : 'Ngừng bán'} thành công!`, 'success')
          await fetchVariants(currentPage.value)
        }
      } catch (err) {
        console.warn('Backend patch status failed:', err)
        showToast('Thay đổi trạng thái thất bại, vui lòng thử lại sau!', 'error')
      }
    },
    'Thay đổi trạng thái biến thể'
  )
}

const showQrModal = ref(false)
const html5QrCode = ref(null)
const cameraStarted = ref(false)

const openQrModal = () => {
  triggerConfirm(
    'Hệ thống cần quyền truy cập Camera của bạn để quét mã QR. Bạn có muốn mở camera không?',
    () => {
      showQrModal.value = true
      setTimeout(() => {
        startScanner()
      }, 200)
    },
    'Yêu cầu truy cập Camera'
  )
}

const closeQrModal = async () => {
  await stopScanner()
  showQrModal.value = false
}

const startScanner = async () => {
  html5QrCode.value = new Html5Qrcode("qr-reader")
  try {
    const config = { fps: 15, qrbox: { width: 220, height: 220 } }
    await html5QrCode.value.start(
      { facingMode: "environment" },
      config,
      async (decodedText) => {
        await closeQrModal()
        await handleScanQrSuccess(decodedText)
      },
      () => {
        // quiet scan frame logs
      }
    )
    cameraStarted.value = true
  } catch (err) {
    console.error("Camera startup failed:", err)
    showToast("Không thể mở camera. Vui lòng kiểm tra kết nối thiết bị và cấp quyền truy cập camera!", "error")
    showQrModal.value = false
  }
}

const stopScanner = async () => {
  if (html5QrCode.value && cameraStarted.value) {
    try {
      await html5QrCode.value.stop()
    } catch (err) {
      console.error("Failed to stop camera:", err)
    }
    cameraStarted.value = false
  }
}

const handleScanQrSuccess = async (scannedCode) => {
  try {
    isLoading.value = true
    const res = await api.get(`/api/v1/chi-tiet-san-pham/qr-scan/${scannedCode}`)
    const data = res.data
    if (data) {
      selectedVariant.value = data
      editForm.value = {
        id: data.id,
        variantCode: data.maChiTietSanPham || 'N/A',
        productCode: data.maSanPham || 'N/A',
        color: sanitizeVietnamese(data.tenMauSac || 'N/A'),
        size: sanitizeVietnamese(data.tenKichCo || 'N/A'),
        stock: data.soLuongTon ?? 0,
        importPrice: data.giaNhap ?? 0,
        salePrice: data.giaBan ?? 0,
        isActive: data.trangThai === 1,
        image: data.anh || '',
        description: ''
      }
      showDetailModal.value = true
      showToast('Đã nhận diện biến thể thành công từ mã QR!', 'success')
    }
  } catch (err) {
    console.error('Failed to search scanned variant:', err)
    showToast('Mã QR không hợp lệ hoặc sản phẩm không tồn tại trong hệ thống', 'error')
  } finally {
    isLoading.value = false
  }
}

const exportExcel = async () => {
  const isBulk = selectedVariantIds.value.length > 0
  const message = isBulk 
    ? `Bạn có chắc chắn muốn xuất Excel cho ${selectedVariantIds.value.length} biến thể đã chọn không?`
    : 'Bạn có chắc chắn muốn xuất Excel danh sách biến thể theo bộ lọc hiện tại không?'

  triggerConfirm(
    message,
    async () => {
      try {
        isLoading.value = true
        const params = {
          keyword: searchQuery.value || null,
          idMauSac: selectedColor.value || null,
          idKichThuoc: selectedSize.value || null,
          minPrice: null,
          maxPrice: priceRangeValue.value
        }
        if (selectedStatus.value === 'active') {
          params.trangThai = 1
        } else if (selectedStatus.value === 'inactive') {
          params.trangThai = 0
        }

        if (selectedVariantIds.value.length > 0) {
          params.ids = selectedVariantIds.value.join(',')
        }

        const response = await api.get('/api/v1/chi-tiet-san-pham/export-excel', {
          params,
          responseType: 'blob'
        })

        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = selectedVariantIds.value.length > 0
          ? `danh_sach_bien_the_da_chon_${new Date().toISOString().slice(0, 10)}.xlsx`
          : `danh_sach_bien_the_${new Date().toISOString().slice(0, 10)}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        showToast('Tải file Excel biến thể thành công!', 'success')
      } catch (err) {
        console.error('Failed to export Excel:', err)
        showToast('Không thể tải file Excel. Vui lòng thử lại sau!', 'error')
      } finally {
        isLoading.value = false
      }
    },
    'Xuất Excel biến thể'
  )
}

const downloadSelectedQrs = async () => {
  if (selectedVariantIds.value.length === 0) return
  
  triggerConfirm(
    `Bạn có chắc chắn muốn tải hàng loạt ${selectedVariantIds.value.length} mã QR biến thể đã chọn không?`,
    async () => {
      const selectedVariants = filteredVariants.value.filter(v => selectedVariantIds.value.includes(v.id))
      
      for (let i = 0; i < selectedVariants.length; i++) {
        const variant = selectedVariants[i]
        const variantCode = variant.variantCode
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${variantCode}`
        
        try {
          const res = await fetch(qrUrl)
          const blob = await res.blob()
          const url = window.URL.createObjectURL(blob)
          
          const link = document.createElement('a')
          link.href = url
          link.download = `QRCode_${variantCode}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          
          await new Promise(resolve => setTimeout(resolve, 250))
        } catch (err) {
          console.error(`Failed to download QR for ${variantCode}:`, err)
          window.open(qrUrl, '_blank')
        }
      }
      showToast('Đã tải hoàn tất các mã QR được chọn!', 'success')
    },
    'Tải hàng loạt mã QR'
  )
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedColor.value = ''
  selectedSize.value = ''
  selectedStatus.value = ''
  priceRangeValue.value = priceMax.value

  if (route.query.search) {
    router.replace({ query: {} })
  }

  fetchVariants(0)
}

// Detail and Edit Modal State
const showDetailModal = ref(false)
const isUpdating = ref(false)
const selectedVariant = ref(null)
const fileInputRef = ref(null)

const editForm = ref({
  id: null,
  variantCode: '',
  productCode: '',
  color: '',
  size: '',
  stock: 0,
  importPrice: 0,
  salePrice: 0,
  isActive: true,
  image: '',
  description: ''
})

const openDetailsModal = async (variant) => {
  try {
    isLoading.value = true
    const res = await api.get(`/api/v1/chi-tiet-san-pham/${variant.id}`)
    const data = res.data
    if (data) {
      selectedVariant.value = data
      editForm.value = {
        id: data.id,
        variantCode: data.maChiTietSanPham || 'N/A',
        productCode: data.maSanPham || 'N/A',
        color: sanitizeVietnamese(data.tenMauSac || 'N/A'),
        size: sanitizeVietnamese(data.tenKichCo || 'N/A'),
        stock: data.soLuongTon ?? 0,
        importPrice: data.giaNhap ?? 0,
        salePrice: data.giaBan ?? 0,
        isActive: isParentProductInactive(data.maSanPham) ? false : (data.trangThai === 1),
        image: data.anh || '',
        description: ''
      }
      showDetailModal.value = true
    }
  } catch (err) {
    console.error('Failed to load variant details:', err)
    showToast('Không thể tải thông tin chi tiết biến thể sản phẩm!', 'error')
  } finally {
    isLoading.value = false
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleModalImageUpload = async (e) => {
  const files = Array.from(e.target.files || [])
  if (files.length === 0) return

  try {
    const file = files[0]
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post('/api/v1/images/upload', formData)
    editForm.value.image = res.data
    showToast('Tải ảnh biến thể lên thành công!', 'success')
  } catch (err) {
    console.error('Failed to upload image:', err)
    showToast(`Tải ảnh lên thất bại: ${err.message || 'Không thể kết nối máy chủ'}`, 'error')
  }
}

const removeModalImage = () => {
  triggerConfirm(
    'Bạn có chắc chắn muốn gỡ bỏ hình ảnh của biến thể này không?',
    () => {
      editForm.value.image = ''
      showToast('Đã gỡ ảnh biến thể tạm thời. Vui lòng bấm Cập nhật để lưu lại.', 'info')
    },
    'Xác nhận gỡ ảnh'
  )
}

const downloadQrCode = async () => {
  const variantCode = editForm.value.variantCode
  triggerConfirm(
    `Bạn có chắc chắn muốn tải mã QR cho biến thể ${variantCode} không?`,
    async () => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${variantCode}`
      try {
        const response = await fetch(qrUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `QR_${variantCode}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        showToast(`Đang tải QR mã ${variantCode} về máy!`, 'success')
      } catch (err) {
        console.error('Failed to download QR code blob, opening in new tab instead:', err)
        window.open(qrUrl, '_blank')
        showToast('Đang mở mã QR trong tab mới để tải!', 'info')
      }
    },
    'Tải mã QR biến thể'
  )
}

const updateVariantDetail = async () => {
  if (editForm.value.stock < 0) {
    showToast('Số lượng tồn kho phải lớn hơn hoặc bằng 0', 'error')
    return
  }
  if (editForm.value.importPrice < 0) {
    showToast('Giá nhập phải lớn hơn hoặc bằng 0', 'error')
    return
  }
  if (editForm.value.salePrice < 0) {
    showToast('Giá bán phải lớn hơn hoặc bằng 0', 'error')
    return
  }

  triggerConfirm(
    'Bạn có chắc chắn muốn cập nhật thông tin biến thể sản phẩm này không?',
    async () => {
      try {
        isUpdating.value = true
        const payload = {
          giaNhap: editForm.value.importPrice,
          giaBan: editForm.value.salePrice,
          soLuongTon: editForm.value.stock,
          anh: editForm.value.image || null,
          trangThai: editForm.value.isActive ? 1 : 0
        }
        await api.put(`/api/v1/chi-tiet-san-pham/${editForm.value.id}`, payload)
        showToast('Cập nhật biến thể sản phẩm thành công!', 'success')
        showDetailModal.value = false
        await fetchVariants(currentPage.value)
      } catch (err) {
        console.error('Failed to update variant:', err)
        showToast(`Cập nhật thất bại: ${err.response?.data?.message || err.message || 'Không rõ lỗi'}`, 'error')
      } finally {
        isUpdating.value = false
      }
    },
    'Cập nhật biến thể'
  )
}

// Watch filters and refetch
watch([searchQuery, selectedColor, selectedSize, selectedStatus], () => {
  fetchVariants(0)
})

watch(() => editForm.value.stock, (newStock) => {
  if (newStock === 0) {
    editForm.value.isActive = false
  }
})

onMounted(() => {
  loadFilterOptions()
  fetchVariants(0)
})
</script>

<template>
  <div class="w-full max-w-[1400px] mx-auto">
    <div
      class="w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-container-padding flex flex-col gap-stack-lg"
    >
      <!-- Header & filters -->
      <div class="flex flex-col gap-gutter">
        <h1 class="font-headline-md text-headline-md text-on-surface">
          Danh sách tất cả biến thể sản phẩm
        </h1>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-gutter">
          <div class="relative">
            <span
              class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-lg"
              >search</span
            >
            <input
              v-model="searchQuery"
              class="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container text-body-md font-body-md placeholder:text-on-surface-variant transition-all outline-none"
              placeholder="Tìm kiếm"
              type="text"
            />
          </div>

          <div class="relative">
            <select
              v-model="selectedColor"
              class="w-full px-4 py-2 appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container text-body-md font-body-md text-on-surface outline-none cursor-pointer"
            >
              <option v-for="opt in colorOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <span
              class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              >expand_more</span
            >
          </div>

          <div class="relative">
            <select
              v-model="selectedSize"
              class="w-full px-4 py-2 appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container text-body-md font-body-md text-on-surface outline-none cursor-pointer"
            >
              <option v-for="opt in sizeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <span
              class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              >expand_more</span
            >
          </div>

          <div class="relative">
            <select
              v-model="selectedStatus"
              class="w-full px-4 py-2 appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container text-body-md font-body-md text-on-surface outline-none cursor-pointer"
            >
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <span
              class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              >expand_more</span
            >
          </div>
        </div>

        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-gutter pt-stack-sm w-full">
          <div class="flex items-center gap-4 w-full md:w-1/2">
            <div class="flex flex-col gap-2 flex-1">
              <label class="font-label-sm text-label-sm text-on-surface-variant">{{ priceRangeLabel }}</label>
              <input
                v-model.number="priceRangeValue"
                class="variant-price-range w-full appearance-none bg-transparent"
                type="range"
                :min="0"
                :max="priceMax"
              />
            </div>

            <!-- Nút Đặt lại bộ lọc -->
            <button
              type="button"
              class="mt-6 border border-[#ef972d]/30 hover:bg-[#ef972d]/10 text-on-surface px-3 py-2 rounded-lg flex items-center gap-2 font-label-sm text-label-sm transition-colors cursor-pointer"
              @click="resetFilters"
            >
              <span class="material-symbols-outlined text-[18px] text-[#ef972d]">restart_alt</span>
              Đặt lại bộ lọc
            </button>
          </div>
          <div class="flex gap-stack-md shrink-0 items-center">
            <button
              type="button"
              class="bg-[#ef972d] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-label-sm text-label-sm hover:opacity-90 transition-opacity cursor-pointer"
              @click="openQrModal"
            >
              <span class="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              Quét QR
            </button>

            <!-- Tải QR đã chọn -->
            <button
              v-if="selectedVariantIds.length > 0"
              type="button"
              class="bg-[#ef972d] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-label-sm text-label-sm hover:opacity-90 transition-opacity cursor-pointer"
              @click="downloadSelectedQrs"
            >
              <span class="material-symbols-outlined text-[18px]">qr_code</span>
              Tải QR đã chọn ({{ selectedVariantIds.length }})
            </button>

            <button
              type="button"
              class="bg-[#ef972d] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-label-sm text-label-sm hover:opacity-90 transition-opacity cursor-pointer"
              @click="exportExcel"
            >
              <span class="material-symbols-outlined text-[18px]">download</span>
              {{ selectedVariantIds.length > 0 ? `Tải Excel đã chọn (${selectedVariantIds.length})` : 'Tải Excel' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="w-full overflow-x-auto border border-outline-variant rounded-lg">
        <table class="w-full text-left border-collapse">
          <thead
            class="bg-surface border-b border-outline-variant font-label-sm text-label-sm text-on-surface-variant uppercase"
          >
            <tr>
              <th class="p-4 w-12 text-center">
                <input
                  v-model="isAllSelected"
                  class="rounded border-outline-variant text-[#ef972d] focus:ring-[#ef972d] focus:ring-offset-0 cursor-pointer accent-[#ef972d]"
                  type="checkbox"
                />
              </th>
              <th class="p-4 whitespace-nowrap">STT</th>
              <th class="p-4 whitespace-nowrap">Ảnh</th>
              <th class="p-4 whitespace-nowrap">Mã SP</th>
              <th class="p-4 whitespace-nowrap">Mã CTSP</th>
              <th class="p-4 whitespace-nowrap">Kích cỡ</th>
              <th class="p-4 whitespace-nowrap">Màu sắc</th>
              <th class="p-4 whitespace-nowrap">SL tồn</th>
              <th class="p-4 whitespace-nowrap">Giá nhập</th>
              <th class="p-4 whitespace-nowrap">Giá bán</th>
              <th class="p-4 whitespace-nowrap">Trạng thái</th>
              <th class="p-4 whitespace-nowrap text-right">Hành động</th>
            </tr>
          </thead>
          <tbody class="font-body-md text-body-md text-on-surface divide-y divide-outline-variant">
            <tr v-if="isLoading">
              <td colspan="12" class="p-8 text-center text-on-surface-variant">
                <div class="flex flex-col items-center gap-2 justify-center">
                  <span class="animate-spin material-symbols-outlined text-3xl text-[#EF972D]">progress_activity</span>
                  Đang tải danh sách biến thể...
                </div>
              </td>
            </tr>
            <tr v-else-if="filteredVariants.length === 0">
              <td colspan="12" class="p-8 text-center text-on-surface-variant">
                Không tìm thấy biến thể nào phù hợp bộ lọc.
              </td>
            </tr>
            <tr
              v-else
              v-for="(variant, idx) in filteredVariants"
              :key="variant.id"
              class="hover:bg-surface-container-low transition-colors group"
            >
              <td class="p-4 text-center">
                <input
                  v-model="selectedVariantIds"
                  :value="variant.id"
                  class="rounded border-outline-variant text-[#ef972d] focus:ring-[#ef972d] focus:ring-offset-0 cursor-pointer accent-[#ef972d]"
                  type="checkbox"
                />
              </td>
              <td class="p-4">{{ (currentPage * pageSize) + idx + 1 }}</td>
              <td class="p-4 relative">
                <div class="relative w-10 h-10">
                  <img
                    v-if="variant.image"
                    :src="variant.image"
                    :alt="variant.variantCode"
                    class="w-10 h-10 rounded object-cover border border-outline-variant"
                  />
                  <div
                    v-else
                    class="w-10 h-10 rounded bg-surface-variant flex items-center justify-center border border-outline-variant"
                  >
                    <span class="material-symbols-outlined text-on-surface-variant">image</span>
                  </div>
                  <!-- Discount badge -->
                  <span
                    v-if="isDiscountActive(variant)"
                    class="absolute -top-1.5 -left-1.5 bg-[#ef4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm z-10"
                  >
                    -{{ variant.phanTramGiam }}%
                  </span>
                </div>
              </td>
              <td class="p-4 font-semibold text-primary">{{ variant.productCode }}</td>
              <td class="p-4">{{ variant.variantCode }}</td>
              <td class="p-4">{{ variant.size }}</td>
              <td class="p-4">{{ variant.color }}</td>
              <td class="p-4">{{ variant.stock }}</td>
              <td class="p-4">{{ formatPrice(variant.importPrice) }}</td>
              <td class="p-4 font-semibold">
                <div v-if="isDiscountActive(variant)" class="flex flex-col">
                  <span class="text-xs text-gray-400 line-through font-normal">
                    {{ formatPrice(variant.salePrice) }}
                  </span>
                  <span class="text-[#ef4444] font-semibold">
                    {{ formatPrice(Math.round(variant.salePrice * (100 - variant.phanTramGiam) / 100)) }}
                  </span>
                </div>
                <span v-else>{{ formatPrice(variant.salePrice) }}</span>
              </td>
              <td class="p-4">
                <span
                  :class="
                    variant.isActive
                      ? 'bg-[#ecfdf5] text-[#065f46]'
                      : 'bg-gray-100 text-gray-600'
                  "
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                >
                  {{ variant.isActive ? 'Đang bán' : 'Ngừng bán' }}
                </span>
              </td>
              <td class="p-4">
                <div class="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    @click="openDetailsModal(variant)"
                    class="text-secondary hover:text-[#ef972d] transition-colors cursor-pointer"
                    title="Xem chi tiết"
                  >
                    <span class="material-symbols-outlined text-[20px]">visibility</span>
                  </button>
                  <label 
                    class="relative inline-flex items-center" 
                    :class="(variant.stock === 0 || isParentProductInactive(variant.productCode)) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
                    :title="variant.stock === 0 ? 'Không thể mở bán khi tồn kho bằng 0' : (isParentProductInactive(variant.productCode) ? 'Không thể mở bán khi sản phẩm ngừng bán' : 'Đổi trạng thái')"
                  >
                    <input
                      v-model="variant.isActive"
                      type="checkbox"
                      class="sr-only peer"
                      :disabled="variant.stock === 0 || isParentProductInactive(variant.productCode)"
                      @change="handleToggle(variant)"
                    />
                    <div
                      class="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"
                    ></div>
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex justify-end items-center gap-2 pt-stack-sm">
        <span class="font-body-md text-body-md text-on-surface-variant mr-4">{{ paginationLabel }}</span>
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer"
          :disabled="currentPage === 0"
          @click="fetchVariants(currentPage - 1)"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <span class="px-2 font-label-sm text-label-sm text-on-surface">Trang {{ currentPage + 1 }} / {{ totalPages }}</span>
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer"
          :disabled="currentPage + 1 >= totalPages"
          @click="fetchVariants(currentPage + 1)"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Detail Modal -->
  <div
    v-if="showDetailModal"
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300"
  >
    <div
      class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 border border-gray-100"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span class="material-symbols-outlined text-[#ef972d]">edit_square</span>
          Sửa chi tiết sản phẩm
        </h2>
        <button
          @click="showDetailModal = false"
          class="text-gray-400 hover:text-gray-600 transition-colors w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 cursor-pointer"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-6 overflow-y-auto space-y-6 flex-grow">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Left inputs column -->
          <div class="space-y-4">
            <!-- Row 1: Code and Color -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Mã sản phẩm chi tiết *</label>
                <input
                  type="text"
                  v-model="editForm.variantCode"
                  disabled
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Màu sắc</label>
                <input
                  type="text"
                  v-model="editForm.color"
                  disabled
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <!-- Row 2: Stock and Size -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Số lượng tồn *</label>
                <input
                  type="number"
                  min="0"
                  v-model.number="editForm.stock"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Kích cỡ</label>
                <input
                  type="text"
                  v-model="editForm.size"
                  disabled
                  class="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <!-- Row 3: Prices -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Giá bán (đ) *</label>
                <input
                  type="number"
                  min="0"
                  v-model.number="editForm.salePrice"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Giá nhập (đ) *</label>
                <input
                  type="number"
                  min="0"
                  v-model.number="editForm.importPrice"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm"
                />
              </div>
            </div>

            <!-- Row 4: Status Toggle -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-2">Trạng thái kinh doanh</label>
              <div class="flex items-center gap-3">
                <label 
                  class="relative inline-flex items-center"
                  :class="(editForm.stock === 0 || isParentProductInactive(editForm.productCode)) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
                  :title="editForm.stock === 0 ? 'Không thể mở bán khi tồn kho bằng 0' : (isParentProductInactive(editForm.productCode) ? 'Không thể mở bán khi sản phẩm ngừng bán' : 'Đổi trạng thái')"
                >
                  <input
                    v-model="editForm.isActive"
                    type="checkbox"
                    class="sr-only peer"
                    :disabled="editForm.stock === 0 || isParentProductInactive(editForm.productCode)"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ef972d]"
                  ></div>
                </label>
                <span class="text-sm font-semibold" :class="editForm.isActive ? 'text-[#065f46]' : 'text-gray-500'">
                  {{ editForm.isActive ? 'Kinh doanh' : 'Ngừng kinh doanh' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right QR & Image column -->
          <div class="grid grid-cols-2 gap-4">
            <!-- QR Code Card -->
            <div class="border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-between bg-gray-50/50">
              <span class="block text-xs font-bold text-gray-600 mb-2 w-full text-center">Mã QR (QR Code)</span>
              
              <div class="bg-white p-2 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${editForm.variantCode}`"
                  alt="QR Code"
                  class="w-[120px] h-[120px] object-contain"
                />
              </div>
              
              <div class="mt-3 flex flex-col items-center w-full gap-2">
                <span class="text-[11px] text-gray-500 font-medium">Nội dung QR: {{ editForm.variantCode }}</span>
                <button
                  type="button"
                  @click="downloadQrCode"
                  class="px-3 py-1.5 bg-white border border-[#ef972d] text-[#ef972d] hover:bg-[#ef972d]/5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[16px]">download</span>
                  Tải QR
                </button>
              </div>
            </div>

            <!-- Image Card -->
            <div class="border border-gray-100 rounded-xl p-4 flex flex-col items-center justify-between bg-gray-50/50 relative">
              <span class="block text-xs font-bold text-gray-600 mb-2 w-full text-center">Hình ảnh</span>
              
              <!-- Remove Image Button -->
              <button
                v-if="editForm.image"
                @click="removeModalImage"
                class="absolute top-12 right-6 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer border border-red-100"
                title="Xóa hình ảnh"
              >
                <span class="material-symbols-outlined text-sm">close</span>
              </button>

              <div class="bg-white p-1 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm w-full aspect-square max-h-[136px] overflow-hidden">
                <img
                  :src="formatImage(editForm.image)"
                  alt="Variant Image"
                  class="max-w-full max-h-full object-contain"
                />
              </div>

              <div class="mt-3 flex flex-col items-center w-full gap-1.5">
                <input
                  ref="fileInputRef"
                  type="file"
                  class="hidden"
                  accept="image/*"
                  @change="handleModalImageUpload"
                />
                <button
                  type="button"
                  @click="triggerFileInput"
                  class="px-3 py-1.5 bg-[#ef972d] hover:bg-[#ef972d]/90 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  Chọn ảnh mới
                </button>
                <span class="text-[10px] text-gray-400">PNG, JPG, JPEG</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom: Description (Optional) -->
        <div class="mt-4">
          <label class="block text-xs font-semibold text-gray-600 mb-1">Mô tả (nếu có)</label>
          <textarea
            rows="3"
            v-model="editForm.description"
            placeholder="Nhập mô tả cho biến thể sản phẩm..."
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm resize-none"
          ></textarea>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button
          type="button"
          @click="showDetailModal = false"
          class="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg font-semibold text-gray-600 text-sm transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          @click="updateVariantDetail"
          :disabled="isUpdating"
          class="px-4 py-2 bg-[#ef972d] hover:bg-[#ef972d]/90 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <span v-if="isUpdating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Cập nhật chi tiết
        </button>
      </div>
    </div>
  </div>

  <!-- Webcam QR Scan Modal -->
  <div v-if="showQrModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-[#1E1B16] text-[#EAE2D5] rounded-xl max-w-md w-full overflow-hidden border border-[#ef972d]/30 shadow-2xl animate-fade-in">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-[#ef972d]/20 flex items-center justify-between bg-[#2A241C]">
        <h3 class="font-headline-sm text-headline-sm text-[#ef972d] flex items-center gap-2">
          <span class="material-symbols-outlined text-[#ef972d]">qr_code_scanner</span>
          Quét mã QR sản phẩm
        </h3>
        <button @click="closeQrModal" class="text-gray-400 hover:text-white transition-colors cursor-pointer">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 flex flex-col items-center justify-center gap-4 bg-[#1E1B16]">
        <p class="text-sm text-gray-400 text-center">
          Vui lòng đưa mã QR của biến thể sản phẩm vào trước camera để quét tự động.
        </p>

        <!-- Container for camera -->
        <div class="relative w-full aspect-square max-w-[260px] bg-black rounded-lg overflow-hidden border border-[#ef972d]/30 shadow-inner flex items-center justify-center">
          <div id="qr-reader" class="w-full h-full"></div>
          <!-- Overlay scanning indicator line -->
          <div class="absolute inset-x-4 top-1/2 h-[2px] bg-[#ef972d] shadow-[0_0_8px_#ef972d] animate-scan-line pointer-events-none"></div>
        </div>

        <span class="text-xs text-[#ef972d] animate-pulse">
          {{ cameraStarted ? 'Đang hoạt động - Căn chỉnh mã vào khung hình' : 'Đang khởi động camera...' }}
        </span>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-[#ef972d]/20 flex justify-end bg-[#2A241C]">
        <button
          type="button"
          @click="closeQrModal"
          class="border border-[#ef972d]/30 hover:bg-[#ef972d]/10 text-[#EAE2D5] px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Confirmation Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
      <div class="p-6 space-y-4">
        <div class="flex items-center gap-3 border-b border-gray-100 pb-3">
          <span class="material-symbols-outlined text-[#ef972d] text-2xl">help</span>
          <h3 class="text-lg font-bold text-gray-800">{{ confirmModal.title }}</h3>
        </div>
        <p class="text-sm text-gray-600 leading-relaxed font-body-md">{{ confirmModal.message }}</p>
      </div>
      <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
        <button
          @click="confirmModal.show = false"
          class="px-5 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          @click="handleConfirm"
          class="px-5 py-2 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] hover:opacity-95 text-white rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer"
        >
          Xác nhận
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Toast Notification -->
  <div
    v-if="toast.show"
    class="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 border transition-all duration-300 animate-scale-up"
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
  </div>
</template>

<style scoped>
.variant-price-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #ef972d;
  cursor: pointer;
  margin-top: -6px;
}

.variant-price-range::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: #ffdcbd;
  border-radius: 2px;
}

@keyframes scan-line-anim {
  0% { top: 10%; }
  50% { top: 90%; }
  100% { top: 10%; }
}

.animate-scan-line {
  animation: scan-line-anim 2s infinite ease-in-out;
}

#qr-reader video {
  object-fit: cover !important;
  width: 100% !important;
  height: 100% !important;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
.animate-scale-up {
  animation: scaleUp 0.15s ease-out forwards;
}
</style>


