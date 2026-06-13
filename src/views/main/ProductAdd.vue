<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'

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

// Form Fields
const productName = ref('')
const sku = ref('')
const selectedBrand = ref('')
const selectedOrigin = ref('')
const selectedType = ref('')
const selectedStyle = ref('')
const selectedMaterial = ref('')
const selectedCollar = ref('')
const selectedSleeve = ref('')
const selectedShoulder = ref('')
const description = ref('')

// Selected Color and Size Objects (for tags)
const colorsSelected = ref([])
const sizesSelected = ref([])

// Dropdowns expansion
const colorDropdownOpen = ref(false)
const sizeDropdownOpen = ref(false)

// Bulk Edit Modal State
const showBulkModal = ref(false)
const bulkSalePrice = ref(0)
const bulkImportPrice = ref(0)
const bulkStock = ref(0)
const bulkApplyToEmptyOnly = ref(false)

// Image Selector Modal & Upload State
const showImageModal = ref(false)
const activeColorGroupForImage = ref(null) // null means main product gallery
const productImages = ref([])

// Dropdown Attribute Options Lists
const brands = ref([])
const origins = ref([])
const types = ref([])
const styles = ref([])
const materials = ref([])
const collars = ref([])
const sleeves = ref([])
const shoulders = ref([])
const colors = ref([])
const sizes = ref([])

// Validation Errors
const errors = ref({
  productName: '',
  brand: '',
  type: ''
})

// Generated Variant Groups (grouped by Color)
const generatedColorGroups = ref([])

// Helper to sanitize mangled Vietnamese characters from backend database encoding
const sanitizeVietnamese = (str) => {
  if (!str) return ''
  let cleaned = str
  
  const replacements = {
    'Vi?t Nam': 'Việt Nam',
    'C? b?': 'Cổ bẻ',
    'C? b? (Polo)': 'Cổ bẻ (Polo)',
    'C? tròn': 'Cổ tròn',
    'C? tr?': 'Cổ trụ',
    'C? tr? (Mao)': 'Cổ trụ (Mao)',
    'C? ch? V': 'Cổ chữ V',
    'Tay l?': 'Tay lỡ',
    'Vai tr?': 'Vai trễ',
    'Vai đ?m mút': 'Vai đệm mút',
    'Đ? Ruby': 'Đỏ Ruby',
    'Tr?ng S?a': 'Trắng Sữa',
    'Linen cao c?p': 'Linen cao cấp',
    'Đen Huy?n': 'Đen Huyền',
    'Kích thu?c S': 'Kích thước S',
    'Kích thu?c M': 'Kích thước M',
    'Kích thu?c L': 'Kích thước L',
    'Kích thu?c XL': 'Kích thước XL',
    'Kích thu?c XXL': 'Kích thước XXL'
  }
  
  if (replacements[cleaned]) {
    return replacements[cleaned]
  }
  
  cleaned = cleaned.replace(/Vi\?t/g, 'Việt')
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
  cleaned = cleaned.replace(/thu\?c/g, 'thước')
  cleaned = cleaned.replace(/hi\?u/g, 'hiệu')
  cleaned = cleaned.replace(/Ki\?u/g, 'Kiểu')
  cleaned = cleaned.replace(/Huy\?n/g, 'Huyền')
  
  return cleaned
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

// Fetch attribute utility helper with backend DTO property mapper
const loadAttribute = async (path, listRef, entitySuffix) => {
  try {
    const res = await api.get(path, { params: { size: 100, trangThai: 1 } })
    const data = res.data
    
    if (data && Array.isArray(data.content)) {
      const tenKey = `ten${entitySuffix}`
      const maKey = `ma${entitySuffix}`
      listRef.value = data.content.map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item[tenKey] || item.ten || ''),
        code: item[maKey] || item.ma || ''
      }))
    } else {
      listRef.value = []
    }
  } catch (err) {
    console.warn(`Failed to fetch from ${path}:`, err)
    listRef.value = []
  }
}

// Fetch all attribute lists
const fetchAllAttributes = async () => {
  try {
    const res = await api.get('/api/v1/attributes/all-active')
    const data = res.data
    if (data && data.thuongHieuList) {
      brands.value = data.thuongHieuList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      origins.value = data.xuatSuList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      types.value = data.loaiSanPhamList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      styles.value = data.kieuDangList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      materials.value = data.chatLieuList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      collars.value = data.coAoList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      sleeves.value = data.tayAoList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      shoulders.value = data.vaiAoList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      colors.value = data.mauSacList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      sizes.value = data.kichThuocList.map(item => ({ id: item.id, name: sanitizeVietnamese(item.ten || ''), code: item.ma || '' }))
      return
    }
  } catch (err) {
    console.warn('Failed to fetch from attributes/all-active, falling back to parallel requests:', err)
  }

  // Fallback to parallel requests if /all-active fails or is not supported
  await Promise.all([
    loadAttribute('/api/v1/thuong-hieu', brands, 'ThuongHieu'),
    loadAttribute('/api/v1/xuat-su', origins, 'XuatSu'),
    loadAttribute('/api/v1/loai-san-pham', types, 'LoaiSanPham'),
    loadAttribute('/api/v1/kieu-dang', styles, 'KieuDang'),
    loadAttribute('/api/v1/chat-lieu', materials, 'ChatLieu'),
    loadAttribute('/api/v1/co-ao', collars, 'CoAo'),
    loadAttribute('/api/v1/tay-ao', sleeves, 'TayAo'),
    loadAttribute('/api/v1/vai-ao', shoulders, 'VaiAo'),
    loadAttribute('/api/v1/mau-sac', colors, 'MauSac'),
    loadAttribute('/api/v1/kich-thuoc', sizes, 'KichThuoc')
  ])
}

// Available colors/sizes for adding (not yet selected)
const availableColors = computed(() => {
  return colors.value.filter(c => !colorsSelected.value.some(sel => sel.id === c.id))
})
const availableSizes = computed(() => {
  return sizes.value.filter(s => !sizesSelected.value.some(sel => sel.id === s.id))
})

// Color selection actions
const toggleColorDropdown = (e) => {
  e.stopPropagation()
  colorDropdownOpen.value = !colorDropdownOpen.value
  sizeDropdownOpen.value = false
}
const selectColor = (color) => {
  colorsSelected.value.push(color)
  colorDropdownOpen.value = false
}
const removeColor = (color) => {
  colorsSelected.value = colorsSelected.value.filter(c => c.id !== color.id)
}

// Size selection actions
const toggleSizeDropdown = (e) => {
  e.stopPropagation()
  sizeDropdownOpen.value = !sizeDropdownOpen.value
  colorDropdownOpen.value = false
}
const selectSize = (size) => {
  sizesSelected.value.push(size)
  sizeDropdownOpen.value = false
}
const removeSize = (size) => {
  sizesSelected.value = sizesSelected.value.filter(s => s.id !== size.id)
}

// Helper to determine CSS color code from name
const getColorHex = (name) => {
  const nameLower = name.toLowerCase()
  if (nameLower.includes('đen') || nameLower.includes('black')) return '#000000'
  if (nameLower.includes('đỏ') || nameLower.includes('red')) return '#ef4444'
  if (nameLower.includes('xanh') || nameLower.includes('blue')) return '#3b82f6'
  if (nameLower.includes('trắng') || nameLower.includes('white')) return '#ffffff'
  if (nameLower.includes('vàng') || nameLower.includes('yellow') || nameLower.includes('cát')) return '#f59e0b'
  if (nameLower.includes('hồng') || nameLower.includes('pink')) return '#ec4899'
  if (nameLower.includes('xám') || nameLower.includes('grey') || nameLower.includes('gray')) return '#6b7280'
  if (nameLower.includes('cam') || nameLower.includes('orange')) return '#f97316'
  return '#cccccc'
}

// Generate combinations and build table structure
const generateVariants = () => {
  if (colorsSelected.value.length === 0 || sizesSelected.value.length === 0) {
    showToast('Vui lòng chọn ít nhất 1 màu sắc và 1 kích thước để tạo biến thể!', 'error')
    return
  }

  triggerConfirm(
    'Bạn có chắc chắn muốn tạo danh sách biến thể từ các màu sắc và kích cỡ đã chọn không?',
    () => {
      const newGroups = []
      colorsSelected.value.forEach(color => {
        // Retain existing data for this color if it was generated previously
        const existingGroup = generatedColorGroups.value.find(g => g.color.id === color.id)
        const variants = []
        
        sizesSelected.value.forEach(size => {
          const existingVariant = existingGroup?.variants.find(v => v.size.id === size.id)
          variants.push({
            id: existingVariant?.id || `${color.id}-${size.id}`,
            size: size,
            salePrice: existingVariant ? existingVariant.salePrice : 0,
            importPrice: existingVariant ? existingVariant.importPrice : 0,
            stock: existingVariant ? existingVariant.stock : 0
          })
        })

        let colorImage = existingGroup?.images?.[0] || ''

        newGroups.push({
          color: color,
          images: colorImage ? [colorImage] : [],
          variants: variants
        })
      })

      generatedColorGroups.value = newGroups
      showToast('Đã tạo/cập nhật danh sách biến thể thành công!', 'success')
    },
    'Tạo biến thể sản phẩm'
  )
}

// Remove single variant row from color group table
const removeVariantRow = (colorGroupId, variantId) => {
  const group = generatedColorGroups.value.find(g => g.color.id === colorGroupId)
  if (group) {
    group.variants = group.variants.filter(v => v.id !== variantId)
  }
}

// Bulk Apply modal confirmation
const applyBulkValues = () => {
  generatedColorGroups.value.forEach(group => {
    group.variants.forEach(v => {
      if (!bulkApplyToEmptyOnly.value || (v.salePrice === 0 && v.importPrice === 0 && v.stock === 0)) {
        v.salePrice = bulkSalePrice.value
        v.importPrice = bulkImportPrice.value
        v.stock = bulkStock.value
      }
    })
  })
  showBulkModal.value = false
}

// Image selection helpers
const triggerImageModal = (colorGroupId = null) => {
  activeColorGroupForImage.value = colorGroupId
  showImageModal.value = true
}

const fileInput = ref(null)
const clickHiddenFileInput = () => {
  fileInput.value?.click()
}

const handleLocalFileUpload = async (e) => {
  const files = Array.from(e.target.files || [])
  if (files.length === 0) return

  for (const file of files) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await api.post('/api/v1/images/upload', formData)
      
      // Auto-unwrapped res.data will be the relative URL e.g. "/uploads/abc.jpg"
      const imageUrl = res.data
      
      if (activeColorGroupForImage.value === null) {
        productImages.value = [imageUrl] // Chỉ lưu duy nhất 1 ảnh chính
      } else {
        const group = generatedColorGroups.value.find(g => g.color.id === activeColorGroupForImage.value)
        if (group) {
          group.images = [imageUrl]
        }
      }
    } catch (err) {
      console.error('Failed to upload image file:', err)
      showToast(`Tải ảnh lên thất bại: ${err.message || 'Không thể kết nối máy chủ'}`, 'error')
    }
  }
  showImageModal.value = false
}

const customImageUrlInput = ref('')
const selectCustomImage = () => {
  const url = customImageUrlInput.value.trim()
  if (!url) return
  
  if (activeColorGroupForImage.value === null) {
    productImages.value = [url] // Chỉ lưu duy nhất 1 ảnh chính
  } else {
    const group = generatedColorGroups.value.find(g => g.color.id === activeColorGroupForImage.value)
    if (group) {
      group.images = [url]
    }
  }
  customImageUrlInput.value = ''
  showImageModal.value = false
}

const removeProductImage = (idx) => {
  productImages.value.splice(idx, 1)
}

const removeColorImage = (colorGroupId) => {
  const group = generatedColorGroups.value.find(g => g.color.id === colorGroupId)
  if (group) {
    group.images = []
  }
}

// Cancel action
const handleCancel = () => {
  triggerConfirm(
    'Bạn có chắc muốn hủy thay đổi? Tất cả thông tin vừa nhập sẽ bị mất.',
    () => {
      router.push('/products')
    },
    'Hủy thay đổi'
  )
}

// Validate fields
const validateForm = () => {
  let isValid = true
  errors.value = { productName: '', brand: '', type: '' }
  const missingFields = []

  // 1. Tên sản phẩm: Phải chứa các từ khóa liên quan đến áo nam mùa hè, độ dài từ 6 đến 100 ký tự
  if (!productName.value.trim()) {
    errors.value.productName = 'Tên sản phẩm không được để trống.'
    missingFields.push('Tên sản phẩm')
    isValid = false
  } else {
    const nameLower = productName.value.trim().toLowerCase()
    const summerKeywords = ['áo thun', 'áo phông', 'áo sơ mi', 'áo polo', 'áo ba lỗ', 'áo cộc', 'áo ngắn tay', 'áo sát nách', 'áo hawaii', 'áo đi biển', 'tank top', 'tanktop']
    const hasKeyword = summerKeywords.some(keyword => nameLower.includes(keyword))
    if (!hasKeyword) {
      errors.value.productName = 'Tên sản phẩm phải chứa từ khóa liên quan đến áo nam mùa hè (áo thun, sơ mi, polo, ba lỗ, cộc tay, v.v.).'
      missingFields.push('Từ khóa áo nam mùa hè (áo thun, sơ mi, polo, ba lỗ, cộc tay...)')
      isValid = false
    } else if (productName.value.trim().length < 6 || productName.value.trim().length > 100) {
      errors.value.productName = 'Độ dài tên sản phẩm phải từ 6 đến 100 ký tự.'
      missingFields.push('Độ dài Tên sản phẩm (6-100 ký tự)')
      isValid = false
    }
  }

  // 2. Kiểm tra thương hiệu, xuất xứ, loại áo, kiểu dáng
  if (!selectedBrand.value) {
    missingFields.push('Thương hiệu')
    isValid = false
  }
  if (!selectedOrigin.value) {
    missingFields.push('Xuất xứ')
    isValid = false
  }
  if (!selectedType.value) {
    missingFields.push('Loại áo')
    isValid = false
  }
  if (!selectedStyle.value) {
    missingFields.push('Kiểu dáng')
    isValid = false
  }

  // 3. Chất liệu: Mùa hè không dùng chất liệu nóng như Len, Nỉ, Dạ, Phao
  if (!selectedMaterial.value) {
    missingFields.push('Chất liệu')
    isValid = false
  } else {
    const materialObj = materials.value.find(m => m.id == selectedMaterial.value)
    if (materialObj) {
      const matName = materialObj.name.toLowerCase()
      const winterMaterials = ['len', 'nỉ', 'dạ', 'phao', 'giữ nhiệt']
      const isWinterMat = winterMaterials.some(m => matName.includes(m))
      if (isWinterMat) {
        missingFields.push(`Chất liệu phù hợp mùa hè (Hiện chọn "${materialObj.name}" không phù hợp)`)
        isValid = false
      }
    }
  }

  // 4. Các bộ phận cấu tạo áo
  if (!selectedCollar.value) {
    missingFields.push('Cổ áo')
    isValid = false
  }
  if (!selectedSleeve.value) {
    missingFields.push('Tay áo')
    isValid = false
  }
  if (!selectedShoulder.value) {
    missingFields.push('Vai áo')
    isValid = false
  }

  // 5. Yêu cầu ít nhất 1 hình ảnh sản phẩm chính
  if (productImages.value.length === 0) {
    missingFields.push('Hình ảnh chính sản phẩm (yêu cầu ít nhất 1 ảnh)')
    isValid = false
  }

  if (!isValid) {
    showToast('Vui lòng kiểm tra thông tin hợp lệ:\n- ' + missingFields.join('\n- '), 'error')
  }

  return isValid
}

// Save action
const handleSave = async () => {
  if (!validateForm()) {
    return
  }

  // Flatten generatedColorGroups into danhSachBienThe flat array format required by BE
  const danhSachBienThe = []
  let variantsValid = true
  const variantErrors = []

  // Check each color group & variants
  for (const g of generatedColorGroups.value) {
    const colorImage = g.images[0] || ''
    
    // Yêu cầu mỗi nhóm màu phải có ít nhất 1 ảnh
    if (!colorImage) {
      variantErrors.push(`Màu "${g.color.name}" chưa có hình ảnh biến thể. Mỗi màu phải có ít nhất 1 hình ảnh minh họa.`)
      variantsValid = false
      break
    }

    for (const v of g.variants) {
      const stock = Number(v.stock)
      const importPrice = Number(v.importPrice)
      const salePrice = Number(v.salePrice)

      if (isNaN(stock) || stock <= 0 || stock > 10000) {
        variantErrors.push(`Màu ${g.color.name} - Size ${v.size.name}: Số lượng tồn kho phải từ 1 đến 10,000.`)
        variantsValid = false
        break
      }
      if (isNaN(importPrice) || importPrice < 10000) {
        variantErrors.push(`Màu ${g.color.name} - Size ${v.size.name}: Giá nhập phải từ 10,000 VNĐ trở lên.`)
        variantsValid = false
        break
      }
      if (isNaN(salePrice) || salePrice < 20000) {
        variantErrors.push(`Màu ${g.color.name} - Size ${v.size.name}: Giá bán phải từ 20,000 VNĐ trở lên.`)
        variantsValid = false
        break
      }
      if (salePrice < importPrice) {
        variantErrors.push(`Màu ${g.color.name} - Size ${v.size.name}: Giá bán phải lớn hơn hoặc bằng giá nhập (để tránh bán lỗ).`)
        variantsValid = false
        break
      }

      danhSachBienThe.push({
        idMauSac: Number(g.color.id),
        idKichThuoc: Number(v.size.id),
        soLuongTon: stock,
        giaNhap: importPrice,
        giaBan: salePrice,
        anh: colorImage
      })
    }

    if (!variantsValid) break
  }

  if (!variantsValid) {
    showToast(variantErrors[0], 'error')
    return
  }

  if (danhSachBienThe.length === 0) {
    showToast('Vui lòng thiết lập và tạo các biến thể trước khi lưu sản phẩm!', 'error')
    return
  }

  triggerConfirm(
    'Bạn có chắc chắn muốn lưu sản phẩm này không?',
    async () => {
      // Construct save payload matching BE specification
      const payload = {
        maSanPham: sku.value.trim() || null,
        tenSanPham: productName.value.trim(),
        moTa: description.value.trim(),
        hinhAnh: productImages.value[0] || '',
        idThuongHieu: Number(selectedBrand.value) || null,
        idXuatSu: Number(selectedOrigin.value) || null,
        idChatLieu: Number(selectedMaterial.value) || null,
        idLoaiSanPham: Number(selectedType.value) || null,
        idKieuDang: Number(selectedStyle.value) || null,
        idCoAo: Number(selectedCollar.value) || null,
        idTayAo: Number(selectedSleeve.value) || null,
        idVaiAo: Number(selectedShoulder.value) || null,
        danhSachBienThe: danhSachBienThe
      }

      console.log('Product Save Payload:', payload)

      try {
        const res = await api.post('/api/v1/san-pham', payload)
        if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
          showToast(`Lưu sản phẩm thất bại: ${res._wrapper.message || 'Lỗi hệ thống'}`, 'error')
        } else {
          showToast('Lưu sản phẩm mới thành công!', 'success')
          setTimeout(() => {
            router.push('/products')
          }, 1000)
        }
      } catch (err) {
        console.error('API save failed:', err)
        let errorMsg = err.message || 'Không thể lưu sản phẩm'
        if (err.response && err.response.data) {
          const serverData = err.response.data
          errorMsg = serverData.message || (serverData.data ? JSON.stringify(serverData.data) : JSON.stringify(serverData))
        }
        showToast(`Lỗi kết nối đến máy chủ: ${errorMsg}`, 'error')
      }
    },
    'Lưu sản phẩm'
  )
}

// Globals click event to close tag popovers
const handleGlobalClick = (e) => {
  if (!e.target.closest('.relative')) {
    colorDropdownOpen.value = false
    sizeDropdownOpen.value = false
  }
}

onMounted(() => {
  fetchAllAttributes()
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-16">
    <!-- Breadcrumb and Actions Header -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="space-y-1">
        <h1 class="text-3xl font-bold text-[#0D2533] font-headline-md tracking-tight">Thêm sản phẩm mới</h1>
        <p class="text-sm text-gray-500 font-body-md">Thiết lập sản phẩm Bee Stylish cùng các tùy chọn kích thước, màu sắc và thuộc tính.</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="handleCancel"
          class="px-6 py-2.5 bg-white border border-[#ef972d] text-[#ef972d] rounded-lg font-semibold hover:bg-[#ef972d]/10 transition-all font-body-md shadow-sm cursor-pointer"
        >
          Hủy
        </button>
        <button
          @click="handleSave"
          class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] hover:opacity-95 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-all font-body-md cursor-pointer"
        >
          <span class="material-symbols-outlined text-[20px]">save</span> Lưu sản phẩm
        </button>
      </div>
    </div>

    <!-- Main Grid Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
      
      <!-- Left Column: Basic Info, Classification, Description -->
      <div class="space-y-8">
        
        <!-- Info Card -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 class="text-lg font-bold text-[#0D2533] border-b border-gray-100 pb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[#ef972d]">info</span> Thông tin cơ bản
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Tên sản phẩm <span class="text-red-500">*</span></label>
              <input
                v-model="productName"
                class="w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm outline-none"
                :class="errors.productName ? 'border-red-500 bg-red-50' : 'border-gray-200'"
                placeholder="Nhập tên sản phẩm"
                type="text"
              />
              <span v-if="errors.productName" class="text-xs text-red-500 font-medium">{{ errors.productName }}</span>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Mã SP (SKU)</label>
              <input
                v-model="sku"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm outline-none font-semibold text-[#ef972d]"
                placeholder="Tự động tạo nếu để trống"
                type="text"
              />
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Thương hiệu</label>
              <select
                v-model="selectedBrand"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm text-gray-600 outline-none cursor-pointer"
              >
                <option value="">Chọn thương hiệu</option>
                <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Xuất xứ</label>
              <select
                v-model="selectedOrigin"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm text-gray-600 outline-none cursor-pointer"
              >
                <option value="">Chọn xuất xứ</option>
                <option v-for="o in origins" :key="o.id" :value="o.id">{{ o.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Classification Card -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 class="text-lg font-bold text-[#0D2533] border-b border-gray-100 pb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[#ef972d]">category</span> Phân loại sản phẩm
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Loại áo</label>
              <select
                v-model="selectedType"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm text-gray-600 outline-none cursor-pointer"
              >
                <option value="">Chọn loại</option>
                <option v-for="t in types" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Kiểu dáng</label>
              <select
                v-model="selectedStyle"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm text-gray-600 outline-none cursor-pointer"
              >
                <option value="">Chọn kiểu dáng</option>
                <option v-for="s in styles" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Chất liệu</label>
              <select
                v-model="selectedMaterial"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm text-gray-600 outline-none cursor-pointer"
              >
                <option value="">Chọn chất liệu</option>
                <option v-for="m in materials" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Cổ áo</label>
              <select
                v-model="selectedCollar"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm text-gray-600 outline-none cursor-pointer"
              >
                <option value="">Chọn loại cổ</option>
                <option v-for="c in collars" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Tay áo</label>
              <select
                v-model="selectedSleeve"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm text-gray-600 outline-none cursor-pointer"
              >
                <option value="">Chọn loại tay</option>
                <option v-for="s in sleeves" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-gray-700">Vai áo</label>
              <select
                v-model="selectedShoulder"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm text-gray-600 outline-none cursor-pointer"
              >
                <option value="">Chọn loại vai</option>
                <option v-for="s in shoulders" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Description Card -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 class="text-lg font-bold text-[#0D2533] border-b border-gray-100 pb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[#ef972d]">subject</span> Mô tả sản phẩm
          </h2>
          <textarea
            v-model="description"
            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] transition-all text-sm outline-none"
            placeholder="Nhập thông tin mô tả chi tiết sản phẩm..."
            rows="5"
          ></textarea>
        </div>
      </div>

      <!-- Right Column: Images & Variants Setup -->
      <div class="space-y-8">
        
        <!-- Images Card -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 class="text-lg font-bold text-[#0D2533] border-b border-gray-100 pb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[#ef972d]">image</span> Hình ảnh sản phẩm
          </h2>
          
          <div class="grid grid-cols-4 gap-4">
            <div
              v-for="(img, idx) in productImages"
              :key="idx"
              class="col-span-4 max-w-xs mx-auto w-full aspect-square bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center relative overflow-hidden group shadow-sm"
            >
              <img class="absolute inset-0 w-full h-full object-cover" :src="formatImage(img)" alt="Product Image Preview" />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  @click="removeProductImage(idx)"
                  class="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow cursor-pointer animate-fade-in"
                >
                  <span class="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>

            <!-- Upload placeholder -->
            <div
              v-if="productImages.length < 1"
              @click="triggerImageModal(null)"
              class="col-span-4 aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors gap-1 text-gray-500"
            >
              <span class="material-symbols-outlined text-[#ef972d] text-3xl">add</span>
              <span class="text-xs font-semibold">Thêm ảnh đại diện</span>
            </div>
          </div>
          <p class="text-xs text-gray-400">Chọn 1 hình ảnh duy nhất làm ảnh đại diện cho sản phẩm.</p>
        </div>

        <!-- Variants Config Setup Card -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 class="text-lg font-bold text-[#0D2533] border-b border-gray-100 pb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-[#ef972d]">tune</span> Thiết lập biến thể
          </h2>
          
          <div class="space-y-6">
            <!-- Colors Select -->
            <div class="relative">
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-semibold text-gray-700">Màu sắc</label>
                <button
                  type="button"
                  @click="toggleColorDropdown"
                  class="p-1 text-[#ef972d] hover:bg-[#ef972d]/10 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span class="material-symbols-outlined text-[20px]">add_circle</span>
                </button>
              </div>
              <div class="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[42px]">
                <span
                  v-for="c in colorsSelected"
                  :key="c.id"
                  class="px-3 py-1 bg-white text-gray-700 border border-gray-200 rounded-full text-xs flex items-center gap-1 font-semibold shadow-sm transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-600 group"
                >
                  {{ c.name }}
                  <span
                    @click.stop="removeColor(c)"
                    class="material-symbols-outlined text-[14px] cursor-pointer text-gray-400 group-hover:text-red-500 flex items-center"
                  >
                    close
                  </span>
                </span>
                <span v-if="colorsSelected.length === 0" class="text-xs text-gray-400 self-center">Chưa chọn màu sắc...</span>
              </div>
              <!-- Colors Dropdown Box -->
              <div
                v-show="colorDropdownOpen"
                class="absolute left-0 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1"
              >
                <div
                  v-for="c in availableColors"
                  :key="c.id"
                  @click="selectColor(c)"
                  class="px-4 py-2 hover:bg-[#ef972d]/10 text-sm text-gray-700 cursor-pointer transition-colors font-medium"
                >
                  {{ c.name }} ({{ c.code }})
                </div>
                <div v-if="availableColors.length === 0" class="px-4 py-2 text-center text-xs text-gray-400">Đã chọn hết tất cả màu</div>
              </div>
            </div>

            <!-- Sizes Select -->
            <div class="relative">
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-semibold text-gray-700">Kích thước</label>
                <button
                  type="button"
                  @click="toggleSizeDropdown"
                  class="p-1 text-[#ef972d] hover:bg-[#ef972d]/10 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span class="material-symbols-outlined text-[20px]">add_circle</span>
                </button>
              </div>
              <div class="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[42px]">
                <span
                  v-for="s in sizesSelected"
                  :key="s.id"
                  class="px-3 py-1 bg-white text-gray-700 border border-gray-200 rounded-full text-xs flex items-center gap-1 font-semibold shadow-sm transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-600 group"
                >
                  {{ s.name }}
                  <span
                    @click.stop="removeSize(s)"
                    class="material-symbols-outlined text-[14px] cursor-pointer text-gray-400 group-hover:text-red-500 flex items-center"
                  >
                    close
                  </span>
                </span>
                <span v-if="sizesSelected.length === 0" class="text-xs text-gray-400 self-center">Chưa chọn kích thước...</span>
              </div>
              <!-- Sizes Dropdown Box -->
              <div
                v-show="sizeDropdownOpen"
                class="absolute left-0 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1"
              >
                <div
                  v-for="s in availableSizes"
                  :key="s.id"
                  @click="selectSize(s)"
                  class="px-4 py-2 hover:bg-[#ef972d]/10 text-sm text-gray-700 cursor-pointer transition-colors font-medium"
                >
                  Kích cỡ: {{ s.name }}
                </div>
                <div v-if="availableSizes.length === 0" class="px-4 py-2 text-center text-xs text-gray-400">Đã chọn hết tất cả kích cỡ</div>
              </div>
            </div>

            <!-- Action Button -->
            <button
              type="button"
              @click="generateVariants"
              class="w-full py-3 bg-[#ef972d] text-white rounded-xl font-bold shadow-sm hover:bg-[#ef972d]/90 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span class="material-symbols-outlined">table_chart</span> Tạo biến thể
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Variant Matrix Grid (Shows only if groups generated) -->
    <div v-if="generatedColorGroups.length > 0" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-8 animate-fade-in">
      <!-- Matrix Header -->
      <div class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] px-6 py-4 flex items-center justify-between">
        <h2 class="text-lg font-bold text-white flex items-center gap-2">
          <span class="material-symbols-outlined">layers</span> Danh sách các biến thể
        </h2>
        <button
          type="button"
          @click="showBulkModal = true"
          class="bg-white text-[#ef972d] px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">bolt</span> Thêm nhanh (Bulk Apply)
        </button>
      </div>

      <div class="p-6 space-y-8">
        <!-- Render Matrix Card per Color -->
        <div
          v-for="group in generatedColorGroups"
          :key="group.color.id"
          class="border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
        >
          <!-- Color Row Header with Per-Color Image Selector -->
          <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="w-4 h-4 rounded-full border border-gray-300 shadow-sm inline-block animate-pulse" :style="{ backgroundColor: getColorHex(group.color.name) }"></span>
              <h3 class="font-bold text-[#0D2533] text-lg">
                Nhóm màu: {{ group.color.name }}
              </h3>
            </div>

            <!-- In-Context Image Uploader per selected color -->
            <div class="flex items-center gap-3 bg-white px-4 py-1.5 rounded-xl border border-gray-200 shadow-sm">
              <span class="text-xs font-semibold text-gray-500">Ảnh nhóm màu:</span>
              <div v-if="group.images && group.images.length > 0" class="flex items-center gap-2 animate-scale-up">
                <img :src="formatImage(group.images[0])" class="w-8 h-8 rounded object-cover border border-gray-200" alt="Color variant thumbnail" />
                <button
                  type="button"
                  @click="removeColorImage(group.color.id)"
                  class="text-red-500 hover:text-red-700 text-xs font-bold flex items-center cursor-pointer gap-0.5"
                >
                  <span class="material-symbols-outlined text-[14px]">close</span> Xóa
                </button>
              </div>
              <button
                v-else
                type="button"
                @click="triggerImageModal(group.color.id)"
                class="text-[#ef972d] hover:text-[#ef972d]/80 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">add_photo_alternate</span> Chọn ảnh màu
              </button>
            </div>
          </div>

          <!-- Color Group Variant List -->
          <div>
            <!-- Row headers -->
            <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/50 text-sm font-semibold text-gray-600 border-b border-gray-200">
              <div class="col-span-2">Kích cỡ</div>
              <div class="col-span-3">Giá bán (VNĐ)</div>
              <div class="col-span-3">Giá nhập (VNĐ)</div>
              <div class="col-span-3">Số lượng</div>
              <div class="col-span-1 text-center">Hành động</div>
            </div>

            <!-- Variants size rows -->
            <div
              v-for="v in group.variants"
              :key="v.id"
              class="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition-colors"
            >
              <div class="col-span-2 font-bold text-gray-700">Kích cỡ {{ v.size.name }}</div>
              
              <div class="col-span-3 relative">
                <input
                  v-model.number="v.salePrice"
                  class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm pr-8 focus:ring-1 focus:ring-[#ef972d] focus:border-[#ef972d] outline-none"
                  type="number"
                  min="0"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">đ</span>
              </div>

              <div class="col-span-3 relative">
                <input
                  v-model.number="v.importPrice"
                  class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm pr-8 focus:ring-1 focus:ring-[#ef972d] focus:border-[#ef972d] outline-none"
                  type="number"
                  min="0"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">đ</span>
              </div>

              <div class="col-span-3">
                <input
                  v-model.number="v.stock"
                  class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#ef972d] focus:border-[#ef972d] outline-none"
                  type="number"
                  min="0"
                />
              </div>

              <div class="col-span-1 flex justify-center">
                <button
                  type="button"
                  @click="removeVariantRow(group.color.id, v.id)"
                  class="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Edit Modal Overlay (Quick Update Form) -->
    <div
      v-if="showBulkModal"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      @click.self="showBulkModal = false"
    >
      <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
        <div class="bg-[#EF972D] px-6 py-4 flex items-center justify-between text-white">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <span class="material-symbols-outlined">bolt</span> Thêm nhanh (Bulk Apply)
          </h3>
          <button @click="showBulkModal = false" class="text-white hover:opacity-80 flex items-center">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="p-6 space-y-4">
          <p class="text-xs text-gray-500 font-medium">Thiết lập nhanh giá bán, giá nhập và tồn kho mặc định cho tất cả các biến thể đã tạo.</p>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700">Giá bán mặc định (VNĐ)</label>
            <div class="relative">
              <input
                v-model.number="bulkSalePrice"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm pr-8"
                type="number"
                min="0"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">đ</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700">Giá nhập mặc định (VNĐ)</label>
            <div class="relative">
              <input
                v-model.number="bulkImportPrice"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm pr-8"
                type="number"
                min="0"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">đ</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700">Số lượng tồn kho mặc định</label>
            <input
              v-model.number="bulkStock"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm"
              type="number"
              min="0"
            />
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input
              id="bulkApplyEmptyOnly"
              v-model="bulkApplyToEmptyOnly"
              type="checkbox"
              class="rounded text-[#ef972d] focus:ring-[#ef972d] border-gray-300 w-4 h-4 cursor-pointer"
            />
            <label for="bulkApplyEmptyOnly" class="text-sm text-gray-600 font-semibold cursor-pointer">
              Chỉ áp dụng cho các ô trống (giá trị bằng 0)
            </label>
          </div>
        </div>

        <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            @click="showBulkModal = false"
            class="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg font-semibold text-gray-600 text-sm transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            @click="applyBulkValues"
            class="px-4 py-2 bg-[#EF972D] hover:bg-[#EF972D]/90 text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>

    <!-- Simplified Image Selection Modal -->
    <div
      v-if="showImageModal"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      @click.self="showImageModal = false"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
        <div class="bg-[#EF972D] px-6 py-4 flex items-center justify-between text-white">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <span class="material-symbols-outlined">add_photo_alternate</span> Chọn hình ảnh sản phẩm
          </h3>
          <button @click="showImageModal = false" class="text-white hover:opacity-80 flex items-center">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- Upload from device box -->
          <div 
            @click="clickHiddenFileInput"
            class="border-2 border-dashed border-gray-200 hover:border-[#ef972d] hover:bg-[#ef972d]/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-gray-50 transition-all gap-3 text-gray-500 hover:scale-[1.01]"
          >
            <span class="material-symbols-outlined text-[#ef972d] text-5xl">cloud_upload</span>
            <span class="text-base font-bold text-gray-700">Tải ảnh lên từ máy tính</span>
            <span class="text-xs text-gray-400">Hỗ trợ JPG, PNG, WEBP, JPEG</span>
            <input 
              type="file" 
              ref="fileInput" 
              accept="image/*" 
              multiple 
              @change="handleLocalFileUpload" 
              class="hidden" 
            />
          </div>

          <div class="flex items-center gap-3">
            <div class="h-px flex-1 bg-gray-100"></div>
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hoặc sử dụng liên kết</span>
            <div class="h-px flex-1 bg-gray-100"></div>
          </div>

          <!-- Custom URL input -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-gray-600 block">Đường dẫn URL hình ảnh:</label>
            <div class="flex gap-2">
              <input
                v-model="customImageUrlInput"
                class="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ef972d]/20 focus:border-[#ef972d] outline-none text-sm"
                placeholder="Nhập đường dẫn ảnh trực tuyến (http://...)"
                type="text"
                @keyup.enter="selectCustomImage"
              />
              <button
                @click="selectCustomImage"
                class="px-5 py-2.5 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] hover:opacity-90 text-white rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
          <button
            @click="showImageModal = false"
            class="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg font-semibold text-gray-600 text-sm transition-colors cursor-pointer"
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
  </div>
</template>

<style scoped>
/* Remove numeric input spinners */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
}

/* Custom micro-animations */
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
