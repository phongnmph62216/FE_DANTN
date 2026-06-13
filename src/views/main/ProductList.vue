<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../../services/api'

const router = useRouter()

// Dropdown options state (Tải Excel, Quét QR)
const optionsOpen = ref(false)

// Filter states
const searchQuery = ref('')
const selectedBrand = ref('')
const selectedMaterial = ref('')
const selectedStatus = ref('all')

// List state
const products = ref([])
const brands = ref([])
const materials = ref([])
const origins = ref([])
const styles = ref([])
const types = ref([])
const collars = ref([])
const sleeves = ref([])
const shoulders = ref([])

// Selection states
const selectedProductIds = ref([])

const isAllSelected = computed({
  get() {
    return products.value.length > 0 &&
      products.value.every(p => selectedProductIds.value.includes(p.id))
  },
  set(value) {
    if (value) {
      products.value.forEach(p => {
        if (!selectedProductIds.value.includes(p.id)) {
          selectedProductIds.value.push(p.id)
        }
      })
    } else {
      products.value.forEach(p => {
        const idx = selectedProductIds.value.indexOf(p.id)
        if (idx > -1) {
          selectedProductIds.value.splice(idx, 1)
        }
      })
    }
  }
})

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

// Product Edit Form State
const showEditModal = ref(false)
const isUpdating = ref(false)
const selectedProduct = ref(null)
const fileInputRef = ref(null)

const editForm = ref({
  id: null,
  maSanPham: '',
  tenSanPham: '',
  moTa: '',
  hinhAnh: '',
  trangThai: 1,
  idThuongHieu: '',
  idChatLieu: '',
  idXuatSu: '',
  idKieuDang: '',
  idLoaiSanPham: '',
  idCoAo: '',
  idTayAo: '',
  idVaiAo: ''
})

// Pagination & Loading States
const isLoading = ref(false)
const fetchError = ref(false)
const currentPage = ref(0)
const totalPages = ref(1)
const totalElements = ref(0)
const pageSize = ref(10)

// Helper to clean database mangled string question marks
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

const formatPrice = (val) => {
  if (val === undefined || val === null) return '0'
  return new Intl.NumberFormat('vi-VN').format(val)
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

// Main API fetcher for products list
const fetchProducts = async (page = 0) => {
  isLoading.value = true
  fetchError.value = false
  currentPage.value = page
  selectedProductIds.value = []
  try {
    const params = {
      page: page,
      size: pageSize.value,
    }
    if (searchQuery.value.trim()) {
      params.keyword = searchQuery.value.trim()
    }
    if (selectedBrand.value) {
      params.idThuongHieu = selectedBrand.value
    }
    if (selectedMaterial.value) {
      params.idChatLieu = selectedMaterial.value
    }
    if (selectedStatus.value !== 'all') {
      params.trangThai = selectedStatus.value === 'active' ? 1 : 0
    }

    const res = await api.get('/api/v1/san-pham', { params })
    const data = res.data

    if (data) {
      products.value = (data.content || []).map(item => ({
        id: item.id,
        code: item.maSanPham || 'N/A',
        name: sanitizeVietnamese(item.tenSanPham || ''),
        brand: sanitizeVietnamese(item.tenThuongHieu || 'Chưa rõ'),
        material: sanitizeVietnamese(item.tenChatLieu || 'Chưa rõ'),
        stock: item.tongTonKho ?? 0,
        priceMin: item.giaThapNhat ?? 0,
        priceMax: item.giaCaoNhat ?? 0,
        discountedMin: item.giaThapNhatSauGiam ?? item.giaThapNhat ?? 0,
        discountedMax: item.giaCaoNhatSauGiam ?? item.giaCaoNhat ?? 0,
        maxDiscountPercent: item.maxPhanTramGiam ?? 0,
        isActive: (item.tongTonKho ?? 0) === 0 ? false : (item.trangThai === 1),
        image: formatImage(item.hinhAnh)
      }))
      totalPages.value = data.totalPages || 1
      totalElements.value = data.totalElements || 0
    }
  } catch (err) {
    console.error('Failed to load products list:', err)
    fetchError.value = true
  } finally {
    isLoading.value = false
  }
}

// Fetch filter dropdown options
const loadFilters = async () => {
  try {
    const res = await api.get('/api/v1/attributes/all-active')
    const data = res.data
    if (data) {
      brands.value = (data.thuongHieuList || []).map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || '') }))
      materials.value = (data.chatLieuList || []).map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || '') }))
      origins.value = (data.xuatSuList || []).map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || '') }))
      styles.value = (data.kieuDangList || []).map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || '') }))
      types.value = (data.loaiSanPhamList || []).map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || '') }))
      collars.value = (data.coAoList || []).map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || '') }))
      sleeves.value = (data.tayAoList || []).map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || '') }))
      shoulders.value = (data.vaiAoList || []).map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || '') }))
    }
  } catch (err) {
    console.warn('Failed to load filter option attributes list:', err)
  }
}

// Reset filters function
const resetFilters = () => {
  searchQuery.value = ''
  selectedBrand.value = ''
  selectedMaterial.value = ''
  selectedStatus.value = 'all'
  fetchProducts(0)
}

// Filter results action
const filterResults = () => {
  fetchProducts(0)
}

const handleToggle = (product) => {
  const newState = product.isActive
  const oldState = !product.isActive
  
  // Revert toggle visually until confirmed
  product.isActive = oldState

  if (newState && product.stock === 0) {
    showToast('Không thể mở bán sản phẩm có tồn kho bằng 0!', 'error')
    return
  }

  triggerConfirm(
    `Bạn có chắc chắn muốn ${newState ? 'mở bán lại' : 'ngừng bán'} sản phẩm "${product.name}" không?`,
    async () => {
      try {
        const res = await api.patch(`/api/v1/san-pham/${product.id}/status`)
        if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
          showToast(`Đổi trạng thái thất bại: ${res._wrapper.message}`, 'error')
        } else {
          showToast(`Đã thay đổi trạng thái sản phẩm sang ${newState ? 'Đang bán' : 'Ngừng bán'} thành công!`, 'success')
          await fetchProducts(currentPage.value)
        }
      } catch (err) {
        console.warn('Backend patch status not supported or failed:', err)
        showToast('Thay đổi trạng thái thất bại, vui lòng thử lại sau!', 'error')
      }
    },
    'Thay đổi trạng thái sản phẩm'
  )
}

const viewVariants = (product) => {
  router.push({ path: '/products/variants', query: { search: product.code } })
}

const addProduct = () => {
  router.push('/products/create')
}

const openEditModal = async (product) => {
  try {
    isLoading.value = true
    const res = await api.get(`/api/v1/san-pham/${product.id}`)
    const data = res.data
    if (data) {
      selectedProduct.value = data
      editForm.value = {
        id: data.id,
        maSanPham: data.maSanPham || '',
        tenSanPham: sanitizeVietnamese(data.tenSanPham || ''),
        moTa: sanitizeVietnamese(data.moTa || ''),
        hinhAnh: data.hinhAnh || '',
        trangThai: data.trangThai ?? 1,
        idThuongHieu: data.idThuongHieu || '',
        idChatLieu: data.idChatLieu || '',
        idXuatSu: data.idXuatSu || '',
        idKieuDang: data.idKieuDang || '',
        idLoaiSanPham: data.idLoaiSanPham || '',
        idCoAo: data.idCoAo || '',
        idTayAo: data.idTayAo || '',
        idVaiAo: data.idVaiAo || ''
      }
      showEditModal.value = true
    }
  } catch (err) {
    console.error('Failed to fetch product details:', err)
    showToast('Không thể lấy thông tin chi tiết sản phẩm!', 'error')
  } finally {
    isLoading.value = false
  }
}

const updateProduct = async () => {
  const missingFields = []
  let isValid = true

  // 1. Tên sản phẩm: Phải chứa các từ khóa liên quan đến áo nam mùa hè, độ dài từ 6 đến 100 ký tự
  if (!editForm.value.tenSanPham || !editForm.value.tenSanPham.trim()) {
    missingFields.push('Tên sản phẩm không được để trống.')
    isValid = false
  } else {
    const nameLower = editForm.value.tenSanPham.trim().toLowerCase()
    const summerKeywords = ['áo thun', 'áo phông', 'áo sơ mi', 'áo polo', 'áo ba lỗ', 'áo cộc', 'áo ngắn tay', 'áo sát nách', 'áo hawaii', 'áo đi biển', 'tank top', 'tanktop']
    const hasKeyword = summerKeywords.some(keyword => nameLower.includes(keyword))
    if (!hasKeyword) {
      missingFields.push('Tên sản phẩm phải chứa từ khóa liên quan đến áo nam mùa hè (áo thun, sơ mi, polo, ba lỗ, cộc tay, v.v.).')
      isValid = false
    } else if (editForm.value.tenSanPham.trim().length < 6 || editForm.value.tenSanPham.trim().length > 100) {
      missingFields.push('Độ dài tên sản phẩm phải từ 6 đến 100 ký tự.')
      isValid = false
    }
  }

  // 2. Kiểm tra thương hiệu, xuất xứ, loại áo, kiểu dáng
  if (!editForm.value.idThuongHieu) {
    missingFields.push('Thương hiệu chưa được chọn.')
    isValid = false
  }
  if (!editForm.value.idXuatSu) {
    missingFields.push('Xuất xứ chưa được chọn.')
    isValid = false
  }
  if (!editForm.value.idLoaiSanPham) {
    missingFields.push('Loại sản phẩm chưa được chọn.')
    isValid = false
  }
  if (!editForm.value.idKieuDang) {
    missingFields.push('Kiểu dáng chưa được chọn.')
    isValid = false
  }

  // 3. Chất liệu: Mùa hè không dùng chất liệu nóng như Len, Nỉ, Dạ, Phao, Giữ nhiệt
  if (!editForm.value.idChatLieu) {
    missingFields.push('Chất liệu chưa được chọn.')
    isValid = false
  } else {
    const materialObj = materials.value.find(m => m.id == editForm.value.idChatLieu)
    if (materialObj) {
      const matName = materialObj.name.toLowerCase()
      const winterMaterials = ['len', 'nỉ', 'dạ', 'phao', 'giữ nhiệt']
      const isWinterMat = winterMaterials.some(m => matName.includes(m))
      if (isWinterMat) {
        missingFields.push(`Chất liệu phù hợp mùa hè (Hiện chọn "${materialObj.name}" không phù hợp).`)
        isValid = false
      }
    }
  }

  // 4. Các bộ phận cấu tạo áo
  if (!editForm.value.idCoAo) {
    missingFields.push('Cổ áo chưa được chọn.')
    isValid = false
  }
  if (!editForm.value.idTayAo) {
    missingFields.push('Tay áo chưa được chọn.')
    isValid = false
  }
  if (!editForm.value.idVaiAo) {
    missingFields.push('Vai áo chưa được chọn.')
    isValid = false
  }

  // 5. Hình ảnh đại diện
  if (!editForm.value.hinhAnh) {
    missingFields.push('Hình ảnh đại diện sản phẩm chưa có.')
    isValid = false
  }

  if (!isValid) {
    showToast('Vui lòng kiểm tra thông tin hợp lệ:\n- ' + missingFields.join('\n- '), 'error')
    return
  }

  triggerConfirm(
    `Bạn có chắc chắn muốn cập nhật thông tin sản phẩm "${editForm.value.tenSanPham}" không?`,
    async () => {
      try {
        isUpdating.value = true
        const payload = {
          tenSanPham: editForm.value.tenSanPham.trim(),
          moTa: editForm.value.moTa.trim(),
          hinhAnh: editForm.value.hinhAnh,
          trangThai: editForm.value.trangThai,
          idThuongHieu: editForm.value.idThuongHieu ? Number(editForm.value.idThuongHieu) : null,
          idChatLieu: editForm.value.idChatLieu ? Number(editForm.value.idChatLieu) : null,
          idXuatSu: editForm.value.idXuatSu ? Number(editForm.value.idXuatSu) : null,
          idKieuDang: editForm.value.idKieuDang ? Number(editForm.value.idKieuDang) : null,
          idLoaiSanPham: editForm.value.idLoaiSanPham ? Number(editForm.value.idLoaiSanPham) : null,
          idCoAo: editForm.value.idCoAo ? Number(editForm.value.idCoAo) : null,
          idTayAo: editForm.value.idTayAo ? Number(editForm.value.idTayAo) : null,
          idVaiAo: editForm.value.idVaiAo ? Number(editForm.value.idVaiAo) : null
        }

        await api.put(`/api/v1/san-pham/${editForm.value.id}`, payload)
        showToast('Cập nhật sản phẩm thành công!', 'success')
        showEditModal.value = false
        fetchProducts(currentPage.value)
      } catch (err) {
        console.error('Failed to update product:', err)
        showToast('Cập nhật sản phẩm thất bại. Vui lòng thử lại!', 'error')
      } finally {
        isUpdating.value = false
      }
    },
    'Cập nhật sản phẩm'
  )
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
    editForm.value.hinhAnh = res.data
    showToast('Tải ảnh đại diện sản phẩm lên thành công!', 'success')
  } catch (err) {
    console.error('Failed to upload image:', err)
    showToast(`Tải ảnh lên thất bại: ${err.message || 'Không thể kết nối máy chủ'}`, 'error')
  }
}

const removeModalImage = () => {
  triggerConfirm(
    'Bạn có chắc chắn muốn gỡ bỏ ảnh đại diện hiện tại của sản phẩm?',
    () => {
      editForm.value.hinhAnh = ''
      showToast('Đã gỡ ảnh đại diện tạm thời. Vui lòng bấm Cập nhật sản phẩm để lưu lại.', 'info')
    },
    'Xác nhận gỡ ảnh'
  )
}

const exportExcel = async () => {
  const isBulk = selectedProductIds.value.length > 0
  const message = isBulk 
    ? `Bạn có chắc chắn muốn xuất Excel cho ${selectedProductIds.value.length} sản phẩm đã chọn không?`
    : 'Bạn có chắc chắn muốn xuất Excel danh sách sản phẩm theo bộ lọc hiện tại không?'

  triggerConfirm(
    message,
    async () => {
      try {
        isLoading.value = true
        const params = {}
        if (searchQuery.value.trim()) {
          params.keyword = searchQuery.value.trim()
        }
        if (selectedBrand.value) {
          params.idThuongHieu = selectedBrand.value
        }
        if (selectedMaterial.value) {
          params.idChatLieu = selectedMaterial.value
        }
        if (selectedStatus.value !== 'all') {
          params.trangThai = selectedStatus.value === 'active' ? 1 : 0
        }
        if (selectedProductIds.value.length > 0) {
          params.ids = selectedProductIds.value.join(',')
        }

        const response = await api.get('/api/v1/san-pham/export-excel', {
          params,
          responseType: 'blob'
        })

        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = selectedProductIds.value.length > 0
          ? `danh_sach_san_pham_da_chon_${new Date().toISOString().slice(0, 10)}.xlsx`
          : `danh_sach_san_pham_${new Date().toISOString().slice(0, 10)}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        showToast('Tải file Excel thành công!', 'success')
      } catch (err) {
        console.error('Failed to export product Excel:', err)
        showToast('Không thể tải file Excel sản phẩm. Vui lòng thử lại sau!', 'error')
      } finally {
        isLoading.value = false
      }
    },
    'Xác nhận xuất Excel'
  )
}

const downloadProductQr = async (product) => {
  const code = product.code
  if (!code || code === 'N/A') {
    showToast('Sản phẩm không có mã hợp lệ để tải QR!', 'error')
    return
  }

  triggerConfirm(
    `Bạn có muốn tải mã QR của sản phẩm "${product.name}" (${code}) không?`,
    async () => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${code}`
      try {
        const response = await fetch(qrUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `QR_${code}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        showToast(`Đang tải QR mã ${code} về máy!`, 'success')
      } catch (err) {
        console.error('Failed to download QR code blob, opening in new tab instead:', err)
        window.open(qrUrl, '_blank')
        showToast('Đang mở mã QR trong tab mới để tải!', 'info')
      }
    },
    'Tải mã QR sản phẩm'
  )
}

const downloadSelectedQrs = async () => {
  if (selectedProductIds.value.length === 0) return
  
  triggerConfirm(
    `Bạn có chắc chắn muốn tải hàng loạt ${selectedProductIds.value.length} mã QR đã chọn không?`,
    async () => {
      const selectedProducts = products.value.filter(p => selectedProductIds.value.includes(p.id))
      
      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i]
        const code = product.code
        if (!code || code === 'N/A') continue
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${code}`
        
        try {
          const res = await fetch(qrUrl)
          const blob = await res.blob()
          const url = window.URL.createObjectURL(blob)
          
          const link = document.createElement('a')
          link.href = url
          link.download = `QRCode_${code}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          
          await new Promise(resolve => setTimeout(resolve, 250))
        } catch (err) {
          console.error(`Failed to download QR for ${code}:`, err)
          window.open(qrUrl, '_blank')
        }
      }
      showToast('Đã tải hoàn tất các mã QR được chọn!', 'success')
    },
    'Tải hàng loạt mã QR'
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
  html5QrCode.value = new Html5Qrcode("product-qr-reader")
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
    const res = await api.get(`/api/v1/san-pham/qr-scan/${scannedCode}`)
    const data = res.data
    if (data) {
      selectedProduct.value = data
      editForm.value = {
        id: data.id,
        maSanPham: data.maSanPham || '',
        tenSanPham: sanitizeVietnamese(data.tenSanPham || ''),
        moTa: sanitizeVietnamese(data.moTa || ''),
        hinhAnh: data.hinhAnh || '',
        trangThai: data.trangThai ?? 1,
        idThuongHieu: data.idThuongHieu || '',
        idChatLieu: data.idChatLieu || '',
        idXuatSu: data.idXuatSu || '',
        idKieuDang: data.idKieuDang || '',
        idLoaiSanPham: data.idLoaiSanPham || '',
        idCoAo: data.idCoAo || '',
        idTayAo: data.idTayAo || '',
        idVaiAo: data.idVaiAo || ''
      }
      showEditModal.value = true
      showToast('Đã nhận diện sản phẩm thành công từ mã QR!', 'success')
    }
  } catch (err) {
    console.error('Failed to search scanned product:', err)
    showToast('Mã QR không hợp lệ hoặc sản phẩm không tồn tại trong hệ thống', 'error')
  } finally {
    isLoading.value = false
  }
}

onUnmounted(async () => {
  await stopScanner()
})

onMounted(() => {
  loadFilters()
  fetchProducts(0)
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <div class="flex flex-col gap-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-[#0D2533] font-headline-md">Danh sách sản phẩm</h1>
        <div class="flex items-center gap-3">
          <button
            @click="addProduct"
            class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer"
          >
            <span class="material-symbols-outlined">add</span> Thêm sản phẩm mới
          </button>
          
          <!-- More Actions Dropdown -->
          <div class="relative">
            <button
              @click="optionsOpen = !optionsOpen"
              class="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center cursor-pointer"
            >
              <span class="material-symbols-outlined">more_horiz</span>
            </button>
            <div
              v-show="optionsOpen"
              @click="optionsOpen = false"
              class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1"
            >
              <a @click.prevent="exportExcel" class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                <span class="material-symbols-outlined text-sm">download</span>
                {{ selectedProductIds.length > 0 ? `Tải Excel đã chọn (${selectedProductIds.length})` : 'Tải Excel' }}
              </a>
              <a v-if="selectedProductIds.length > 0" @click.prevent="downloadSelectedQrs" class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                <span class="material-symbols-outlined text-sm">qr_code</span> Tải QR đã chọn ({{ selectedProductIds.length }})
              </a>
              <a @click.prevent="openQrModal" class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                <span class="material-symbols-outlined text-sm">qr_code_scanner</span> Quét QR
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters & Search Card -->
      <div class="bg-white p-6 rounded-2xl border border-surface-container shadow-sm space-y-6">
        <!-- Prominent Search Bar -->
        <div class="relative w-full">
          <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
          <input
            v-model="searchQuery"
            class="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] text-base transition-all font-body-md"
            placeholder="Nhập mã hoặc tên sản phẩm..."
            type="text"
          />
        </div>

        <!-- Filter Controls Row -->
        <div class="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-gray-100">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-4">
              <select
                v-model="selectedBrand"
                class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] min-w-[180px] cursor-pointer font-body-md"
              >
                <option value="">Tất cả thương hiệu</option>
                <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>

              <select
                v-model="selectedMaterial"
                class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] min-w-[180px] cursor-pointer font-body-md"
              >
                <option value="">Tất cả chất liệu</option>
                <option v-for="m in materials" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>

            <div class="h-8 w-px bg-gray-200 mx-2"></div>

            <!-- Radio Group -->
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                  <input
                    class="peer sr-only"
                    name="status"
                    type="radio"
                    value="all"
                    v-model="selectedStatus"
                  />
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#EF972D] transition-colors"></div>
                  <div class="absolute w-2.5 h-2.5 rounded-full bg-[#EF972D] scale-0 peer-checked:scale-100 transition-transform"></div>
                </div>
                <span
                  :class="selectedStatus === 'all' ? 'text-[#0D2533] font-semibold' : 'text-gray-600'"
                  class="text-sm font-medium transition-colors font-body-md"
                >Tất cả</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                  <input
                    class="peer sr-only"
                    name="status"
                    type="radio"
                    value="active"
                    v-model="selectedStatus"
                  />
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#EF972D] transition-colors"></div>
                  <div class="absolute w-2.5 h-2.5 rounded-full bg-[#EF972D] scale-0 peer-checked:scale-100 transition-transform"></div>
                </div>
                <span
                  :class="selectedStatus === 'active' ? 'text-[#0D2533] font-semibold' : 'text-gray-600'"
                  class="text-sm font-medium transition-colors font-body-md"
                >Kinh doanh</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                  <input
                    class="peer sr-only"
                    name="status"
                    type="radio"
                    value="inactive"
                    v-model="selectedStatus"
                  />
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#EF972D] transition-colors"></div>
                  <div class="absolute w-2.5 h-2.5 rounded-full bg-[#EF972D] scale-0 peer-checked:scale-100 transition-transform"></div>
                </div>
                <span
                  :class="selectedStatus === 'inactive' ? 'text-[#0D2533] font-semibold' : 'text-gray-600'"
                  class="text-sm font-medium transition-colors font-body-md"
                >Ngừng kinh doanh</span>
              </label>
            </div>
          </div>

          <!-- Actions -->
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
              <span class="material-symbols-outlined text-[18px]">restart_alt</span> Đặt lại bộ lọc
            </button>
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="bg-white rounded-xl border border-surface-container shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr class="text-on-surface-variant font-label-sm text-xs uppercase tracking-wider">
                <th class="px-4 py-4 w-12 text-center">
                  <input
                    v-model="isAllSelected"
                    class="rounded border-gray-300 text-[#EF972D] focus:ring-[#EF972D] focus:ring-offset-0 cursor-pointer accent-[#EF972D]"
                    type="checkbox"
                  />
                </th>
                <th class="px-6 py-4">STT</th>
                <th class="px-6 py-4">Mã SP</th>
                <th class="px-6 py-4">Tên sản phẩm</th>
                <th class="px-6 py-4">Thương hiệu</th>
                <th class="px-6 py-4">Chất liệu</th>
                <th class="px-6 py-4">Tồn kho</th>
                <th class="px-6 py-4 text-right">Khoảng giá</th>
                <th class="px-6 py-4">Trạng thái</th>
                <th class="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="isLoading">
                <td colspan="10" class="px-6 py-12 text-center text-gray-500 font-medium">
                  <div class="flex flex-col items-center gap-2 justify-center">
                    <span class="animate-spin material-symbols-outlined text-4xl text-[#EF972D]">progress_activity</span>
                    Đang tải danh sách sản phẩm...
                  </div>
                </td>
              </tr>
              <tr v-else-if="products.length === 0">
                <td colspan="10" class="px-6 py-12 text-center text-gray-500 font-medium">
                  Không tìm thấy sản phẩm nào phù hợp.
                </td>
              </tr>
              <tr
                v-else
                v-for="(product, idx) in products"
                :key="product.id"
                class="hover:bg-gray-50 transition-colors animate-fade-in"
              >
                <td class="px-4 py-4 text-center">
                  <input
                    v-model="selectedProductIds"
                    :value="product.id"
                    class="rounded border-gray-300 text-[#EF972D] focus:ring-[#EF972D] focus:ring-offset-0 cursor-pointer accent-[#EF972D]"
                    type="checkbox"
                  />
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">{{ (currentPage * pageSize) + idx + 1 }}</td>
                <td class="px-6 py-4 text-sm font-semibold text-[#EF972D]">{{ product.code }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="relative w-10 h-10">
                      <img class="w-10 h-10 rounded-md object-cover border border-gray-100" :src="product.image" :alt="product.name" />
                      <!-- Discount badge -->
                      <span
                        v-if="product.maxDiscountPercent > 0"
                        class="absolute -top-1.5 -left-1.5 bg-[#ef4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm z-10"
                      >
                        -{{ product.maxDiscountPercent }}%
                      </span>
                    </div>
                    <span class="text-sm font-medium text-gray-900">{{ product.name }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ product.brand }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ product.material }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ product.stock }}</td>
                <td class="px-6 py-4 text-sm text-right font-medium">
                  <div v-if="product.maxDiscountPercent > 0" class="flex flex-col items-end">
                    <span class="text-xs text-gray-400 line-through font-normal">
                      {{ product.priceMin === product.priceMax ? `${formatPrice(product.priceMin)}₫` : `${formatPrice(product.priceMin)}₫ - ${formatPrice(product.priceMax)}₫` }}
                    </span>
                    <span class="text-[#ef4444] font-semibold">
                      {{ product.discountedMin === product.discountedMax ? `${formatPrice(product.discountedMin)}₫` : `${formatPrice(product.discountedMin)}₫ - ${formatPrice(product.discountedMax)}₫` }}
                    </span>
                  </div>
                  <span v-else class="text-gray-900">
                    {{ product.priceMin === product.priceMax ? `${formatPrice(product.priceMin)}₫` : `${formatPrice(product.priceMin)}₫ - ${formatPrice(product.priceMax)}₫` }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                    class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase"
                  >
                    {{ product.isActive ? 'Đang bán' : 'Ngừng bán' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Toggle Switch -->
                    <label 
                      class="relative inline-flex items-center group mr-1"
                      :class="product.stock === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
                      :title="product.stock === 0 ? 'Không thể mở bán khi tồn kho bằng 0' : 'Đổi trạng thái'"
                    >
                      <input
                        type="checkbox"
                        class="sr-only peer"
                        v-model="product.isActive"
                        :disabled="product.stock === 0"
                        @change="handleToggle(product)"
                      />
                      <div class="relative w-10 h-5 bg-gray-300 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                    
                    <button 
                      @click="openEditModal(product)"
                      class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Sửa sản phẩm"
                    >
                      <span class="material-symbols-outlined text-xl">edit_note</span>
                    </button>
                    
                    <button 
                      @click="downloadProductQr(product)"
                      class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Tải mã QR"
                    >
                      <span class="material-symbols-outlined text-xl">qr_code</span>
                    </button>
                    
                    <button 
                      @click="viewVariants(product)"
                      class="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                      title="Xem biến thể"
                    >
                      <span class="material-symbols-outlined text-xl">visibility</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Hiển thị {{ products.length }} sản phẩm (Tổng số: {{ totalElements }})</span>
          <div class="flex gap-1 items-center">
            <button 
              @click="fetchProducts(currentPage - 1)" 
              :disabled="currentPage === 0"
              class="p-2 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <span class="px-3 font-semibold text-gray-700">Trang {{ currentPage + 1 }} / {{ totalPages }}</span>
            <button 
              @click="fetchProducts(currentPage + 1)" 
              :disabled="currentPage + 1 >= totalPages"
              class="p-2 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Product Modal -->
  <div v-if="showEditModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 shadow-2xl flex flex-col">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span class="material-symbols-outlined text-[#ef972d]">edit_note</span>
          Cập nhật sản phẩm
        </h2>
        <button @click="showEditModal = false" class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-6 flex-1">
        <!-- Hidden file input for uploading images -->
        <input type="file" ref="fileInputRef" class="hidden" @change="handleModalImageUpload" accept="image/*" />

        <!-- 2 Column Layout: Left (General Info & Dropdowns) | Right (Image Upload) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Column 1 & 2: General & Dropdowns -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Row 1: Code and Name -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-600 mb-1">Mã sản phẩm (Không thể sửa)</label>
                <input
                  type="text"
                  v-model="editForm.maSanPham"
                  disabled
                  class="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 font-medium outline-none cursor-not-allowed text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-600 mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  v-model="editForm.tenSanPham"
                  placeholder="Nhập tên sản phẩm..."
                  class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm font-medium transition-all"
                />
              </div>
            </div>

            <!-- Row 2: Description -->
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1">Mô tả sản phẩm</label>
              <textarea
                rows="3"
                v-model="editForm.moTa"
                placeholder="Nhập mô tả chi tiết sản phẩm..."
                class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm resize-none transition-all"
              ></textarea>
            </div>

            <!-- Row 3: 8 Attribute Dropdowns Grid -->
            <div>
              <h3 class="text-xs font-bold text-gray-800 mb-3 pb-1 border-b border-gray-100 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm text-[#ef972d]">tune</span>
                Thuộc tính sản phẩm (8 nhóm)
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Dropdown 1: Thương hiệu -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 mb-1">Thương hiệu</label>
                  <select
                    v-model="editForm.idThuongHieu"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-xs bg-white cursor-pointer"
                  >
                    <option value="">Chọn thương hiệu</option>
                    <option v-for="item in brands" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </div>

                <!-- Dropdown 2: Chất liệu -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 mb-1">Chất liệu</label>
                  <select
                    v-model="editForm.idChatLieu"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-xs bg-white cursor-pointer"
                  >
                    <option value="">Chọn chất liệu</option>
                    <option v-for="item in materials" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </div>

                <!-- Dropdown 3: Xuất xứ -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 mb-1">Xuất xứ</label>
                  <select
                    v-model="editForm.idXuatSu"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-xs bg-white cursor-pointer"
                  >
                    <option value="">Chọn xuất xứ</option>
                    <option v-for="item in origins" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </div>

                <!-- Dropdown 4: Kiểu dáng -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 mb-1">Kiểu dáng</label>
                  <select
                    v-model="editForm.idKieuDang"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-xs bg-white cursor-pointer"
                  >
                    <option value="">Chọn kiểu dáng</option>
                    <option v-for="item in styles" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </div>

                <!-- Dropdown 5: Loại sản phẩm -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 mb-1">Loại sản phẩm</label>
                  <select
                    v-model="editForm.idLoaiSanPham"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-xs bg-white cursor-pointer"
                  >
                    <option value="">Chọn loại sản phẩm</option>
                    <option v-for="item in types" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </div>

                <!-- Dropdown 6: Cổ áo -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 mb-1">Cổ áo</label>
                  <select
                    v-model="editForm.idCoAo"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-xs bg-white cursor-pointer"
                  >
                    <option value="">Chọn cổ áo</option>
                    <option v-for="item in collars" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </div>

                <!-- Dropdown 7: Tay áo -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 mb-1">Tay áo</label>
                  <select
                    v-model="editForm.idTayAo"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-xs bg-white cursor-pointer"
                  >
                    <option value="">Chọn tay áo</option>
                    <option v-for="item in sleeves" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </div>

                <!-- Dropdown 8: Vai áo -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 mb-1">Vai áo</label>
                  <select
                    v-model="editForm.idVaiAo"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-xs bg-white cursor-pointer"
                  >
                    <option value="">Chọn vai áo</option>
                    <option v-for="item in shoulders" :key="item.id" :value="item.id">{{ item.name }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 3: Image Card -->
          <div class="space-y-4">
            <div class="border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-between bg-gray-50/50 relative h-full min-h-[280px]">
              <span class="block text-xs font-bold text-gray-600 mb-2 w-full text-center">Hình ảnh đại diện</span>
              
              <!-- Remove Image Button -->
              <button
                v-if="editForm.hinhAnh"
                @click="removeModalImage"
                class="absolute top-12 right-6 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer border border-red-100"
                title="Xóa hình ảnh"
              >
                <span class="material-symbols-outlined text-xs">close</span>
              </button>

              <div class="w-full flex-1 flex items-center justify-center">
                <img
                  v-if="editForm.hinhAnh"
                  :src="formatImage(editForm.hinhAnh)"
                  alt="Product Image"
                  class="max-h-48 max-w-full rounded-lg object-contain border border-gray-100"
                />
                <div v-else class="flex flex-col items-center justify-center text-gray-400 gap-1.5">
                  <span class="material-symbols-outlined text-4xl">image</span>
                  <span class="text-xs">Chưa có hình ảnh</span>
                </div>
              </div>

              <!-- Upload triggers -->
              <div class="w-full mt-4 flex flex-col gap-1.5 items-center">
                <button
                  type="button"
                  @click="triggerFileInput"
                  class="w-full px-4 py-2 border border-[#ef972d]/30 text-[#ef972d] hover:bg-[#ef972d]/5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-sm">upload</span>
                  Chọn ảnh đại diện
                </button>
                <span class="text-[10px] text-gray-400">PNG, JPG, JPEG</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button
          type="button"
          @click="showEditModal = false"
          class="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg font-semibold text-gray-600 text-sm transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          @click="updateProduct"
          :disabled="isUpdating"
          class="px-4 py-2 bg-[#ef972d] hover:bg-[#ef972d]/90 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <span v-if="isUpdating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Cập nhật sản phẩm
        </button>
      </div>
    </div>
  </div>

  <!-- Webcam Product QR Scan Modal -->
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
          Vui lòng đưa mã QR của sản phẩm vào trước camera để quét tự động.
        </p>

        <!-- Container for camera -->
        <div class="relative w-full aspect-square max-w-[260px] bg-black rounded-lg overflow-hidden border border-[#ef972d]/30 shadow-inner flex items-center justify-center">
          <div id="product-qr-reader" class="w-full h-full"></div>
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
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in">
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
          class="bg-[#EF972D] hover:bg-[#EF972D]/90 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
        >
          Xác nhận
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
</template>

<style scoped>
@keyframes scan-line-anim {
  0% { top: 10%; }
  50% { top: 90%; }
  100% { top: 10%; }
}

.animate-scan-line {
  animation: scan-line-anim 2s infinite ease-in-out;
}

#product-qr-reader video {
  object-fit: cover !important;
  width: 100% !important;
  height: 100% !important;
}
</style>
