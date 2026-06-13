<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../../services/api'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const isUsingMock = ref(false)
const fileInput = ref(null)

// Mock Fallbacks
const defaultMockRoles = [
  { id: 1, ma: 'ADMIN', ten: 'Quản lý' },
  { id: 2, ma: 'STAFF', ten: 'Nhân viên bán hàng' },
  { id: 3, ma: 'CASHIER', ten: 'Kế toán' },
  { id: 4, ma: 'STOCK', ten: 'Nhân viên kho' }
]

// Form fields matching backend requirements
const form = ref({
  id: null,
  maNhanVien: '',
  hoVaTen: '',
  email: '',
  soDienThoai: '',
  cccd: '',
  gioiTinh: 1, // 1: Nam, 0: Nữ
  ngaySinh: '',
  idVaiTro: '',
  diaChiCuThe: '',
  selectedProvince: '',
  selectedDistrict: '',
  selectedWard: '',
  anh: '',
  anhLocal: '',
  imageFile: null
})

// Lists
const roles = ref([])
const provinces = ref([])
const districts = ref([])
const wards = ref([])

// Feedback states
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4500)
}

const confirmModal = ref({ show: false, title: '', message: '', onConfirm: null })
const triggerConfirm = (message, onConfirm, title = 'Xác nhận hành động') => {
  confirmModal.value = { show: true, title, message, onConfirm }
}
const handleConfirm = async () => {
  const cb = confirmModal.value.onConfirm
  confirmModal.value.show = false
  if (cb) await cb()
}

// QR Scanner state for CCCD scanning
const showQrModal = ref(false)
const html5QrCode = ref(null)
const cameraStarted = ref(false)

const openQrModal = () => {
  triggerConfirm(
    'Hệ thống cần quyền truy cập Camera của thiết bị để quét mã QR trên Căn cước công dân. Bạn có muốn tiếp tục?',
    () => {
      showQrModal.value = true
      setTimeout(() => {
        startScanner()
      }, 250)
    },
    'Yêu cầu sử dụng Camera'
  )
}

const closeQrModal = async () => {
  await stopScanner()
  showQrModal.value = false
}

const startScanner = async () => {
  html5QrCode.value = new Html5Qrcode('cccd-qr-reader')
  try {
    const config = { fps: 15, qrbox: { width: 250, height: 250 } }
    await html5QrCode.value.start(
      { facingMode: 'environment' },
      config,
      async (decodedText) => {
        await closeQrModal()
        handleScanQrSuccess(decodedText)
      },
      () => {
        // Quiet debug frames
      }
    )
    cameraStarted.value = true
  } catch (err) {
    console.error('Camera failure:', err)
    showToast('Không thể mở camera. Vui lòng cấp quyền truy cập camera!', 'error')
    showQrModal.value = false
  }
}

const stopScanner = async () => {
  if (html5QrCode.value && cameraStarted.value) {
    try {
      await html5QrCode.value.stop()
    } catch (err) {
      console.error('Stop scanner error:', err)
    }
    cameraStarted.value = false
  }
}

// Parse CCCD QR text string format:
// CCCD_Num|Old_ID|Full_Name|DOB_DDMMYYYY|Gender_Nam/Nu|Address|DateOfIssue
const handleScanQrSuccess = async (text) => {
  if (!text) return
  const parts = text.split('|')
  if (parts.length < 5) {
    showToast('Đọc mã QR thất bại. Vui lòng đảm bảo quét đúng mã QR trên Căn cước công dân!', 'error')
    return
  }

  const cccdVal = parts[0]
  const nameVal = parts[2]
  const dobVal = parts[3] // DDMMYYYY
  const genderVal = parts[4] // "Nam" or "Nữ"
  const addressVal = parts[5]

  form.value.cccd = cccdVal || ''
  form.value.hoVaTen = nameVal || ''
  
  if (dobVal && dobVal.length === 8) {
    const d = dobVal.substring(0, 2)
    const m = dobVal.substring(2, 4)
    const y = dobVal.substring(4, 8)
    form.value.ngaySinh = `${y}-${m}-${d}` // YYYY-MM-DD
  }

  form.value.gioiTinh = (genderVal && genderVal.toLowerCase().trim() === 'nam') ? 1 : 0

  showToast('Quét thông tin Căn cước công dân thành công!', 'success')
  if (addressVal) {
    await parseCccdAddress(addressVal)
  }
}

// Intelligent address parser matching public provinces dataset
const parseCccdAddress = async (addrText) => {
  if (!addrText) return
  let cleaned = addrText.replace(/\s+/g, ' ').trim()
  const parts = cleaned.split(',').map(p => p.trim())
  if (parts.length < 3) {
    form.value.diaChiCuThe = cleaned
    return
  }

  const provNameInput = parts[parts.length - 1]
  // Match province
  let matchedProv = provinces.value.find(p => 
    p.name.toLowerCase() === provNameInput.toLowerCase() ||
    p.name.toLowerCase().replace(/tỉnh\s+|thành phố\s+/g, '') === provNameInput.toLowerCase().replace(/tỉnh\s+|thành phố\s+/g, '')
  )

  if (matchedProv) {
    form.value.selectedProvince = matchedProv.name
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${matchedProv.code}?depth=2`)
      const data = await res.json()
      districts.value = data.districts || []

      const distNameInput = parts[parts.length - 2]
      let matchedDist = districts.value.find(d => 
        d.name.toLowerCase() === distNameInput.toLowerCase() ||
        d.name.toLowerCase().replace(/quận\s+|huyện\s+|thị xã\s+|thành phố\s+/g, '') === distNameInput.toLowerCase().replace(/quận\s+|huyện\s+|thị xã\s+|thành phố\s+/g, '')
      )

      if (matchedDist) {
        form.value.selectedDistrict = matchedDist.name
        const res2 = await fetch(`https://provinces.open-api.vn/api/d/${matchedDist.code}?depth=2`)
        const data2 = await res2.json()
        wards.value = data2.wards || []

        const wardNameInput = parts[parts.length - 3]
        let matchedWard = wards.value.find(w => 
          w.name.toLowerCase() === wardNameInput.toLowerCase() ||
          w.name.toLowerCase().replace(/phường\s+|xã\s+|thị trấn\s+/g, '') === wardNameInput.toLowerCase().replace(/phường\s+|xã\s+|thị trấn\s+/g, '')
        )

        if (matchedWard) {
          form.value.selectedWard = matchedWard.name
          form.value.diaChiCuThe = parts.slice(0, parts.length - 3).join(', ')
        } else {
          form.value.diaChiCuThe = parts.slice(0, parts.length - 2).join(', ')
        }
      } else {
        form.value.diaChiCuThe = parts.slice(0, parts.length - 1).join(', ')
      }
    } catch (err) {
      console.error('Parse CCCD location failed:', err)
      form.value.diaChiCuThe = cleaned
    }
  } else {
    form.value.diaChiCuThe = cleaned
  }
}

// Location API loaders
const fetchProvinces = async () => {
  try {
    const res = await fetch('https://provinces.open-api.vn/api/p/')
    const data = await res.json()
    provinces.value = data || []
  } catch (err) {
    console.error('Failed to load provinces:', err)
  }
}

const onProvinceChange = async () => {
  districts.value = []
  wards.value = []
  form.value.selectedDistrict = ''
  form.value.selectedWard = ''

  const pName = form.value.selectedProvince
  if (!pName) return

  const provObj = provinces.value.find(p => p.name === pName)
  if (provObj) {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${provObj.code}?depth=2`)
      const data = await res.json()
      districts.value = data.districts || []
    } catch (err) {
      console.error(err)
    }
  }
}

const onDistrictChange = async () => {
  wards.value = []
  form.value.selectedWard = ''

  const dName = form.value.selectedDistrict
  if (!dName) return

  const distObj = districts.value.find(d => d.name === dName)
  if (distObj) {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${distObj.code}?depth=2`)
      const data = await res.json()
      wards.value = data.wards || []
    } catch (err) {
      console.error(err)
    }
  }
}

// Decode address from DB back to dropdown selectors
const parseAddressFromDb = async (fullAddress) => {
  if (!fullAddress) return
  const parts = fullAddress.split(',').map(p => p.trim())
  if (parts.length < 3) {
    form.value.diaChiCuThe = fullAddress
    return
  }

  const provNameInput = parts[parts.length - 1]
  let matchedProv = provinces.value.find(p => p.name.toLowerCase() === provNameInput.toLowerCase())
  if (matchedProv) {
    form.value.selectedProvince = matchedProv.name
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${matchedProv.code}?depth=2`)
      const data = await res.json()
      districts.value = data.districts || []

      const distNameInput = parts[parts.length - 2]
      let matchedDist = districts.value.find(d => d.name.toLowerCase() === distNameInput.toLowerCase())
      if (matchedDist) {
        form.value.selectedDistrict = matchedDist.name

        const res2 = await fetch(`https://provinces.open-api.vn/api/d/${matchedDist.code}?depth=2`)
        const data2 = await res2.json()
        wards.value = data2.wards || []

        const wardNameInput = parts[parts.length - 3]
        let matchedWard = wards.value.find(w => w.name.toLowerCase() === wardNameInput.toLowerCase())
        if (matchedWard) {
          form.value.selectedWard = matchedWard.name
          form.value.diaChiCuThe = parts.slice(0, parts.length - 3).join(', ')
        } else {
          form.value.diaChiCuThe = parts.slice(0, parts.length - 2).join(', ')
        }
      } else {
        form.value.diaChiCuThe = parts.slice(0, parts.length - 1).join(', ')
      }
    } catch (err) {
      console.error(err)
      form.value.diaChiCuThe = fullAddress
    }
  } else {
    form.value.diaChiCuThe = fullAddress
  }
}

// Fetch list of roles
const fetchRoles = async () => {
  try {
    const res = await api.get('/api/v1/vai-tro')
    roles.value = res.data || []
  } catch (err) {
    console.warn('Roles fetch error, fallback to mock roles:', err.message)
    roles.value = defaultMockRoles
  }
}

// Resolve Image URL
const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

// Local mock database methods
const getMockDB = () => {
  const db = localStorage.getItem('mock_employees')
  if (!db) return []
  return JSON.parse(db)
}

const setMockDB = (data) => {
  localStorage.setItem('mock_employees', JSON.stringify(data))
}

// Load Employee details for Edit mode
const loadEmployeeDetails = async (id) => {
  try {
    const res = await api.get(`/api/v1/nhan-vien/${id}`)
    if (res.data) {
      const data = res.data
      form.value.id = data.id
      form.value.maNhanVien = data.maNhanVien || ''
      form.value.hoVaTen = data.hoVaTen || ''
      form.value.email = data.email || ''
      form.value.soDienThoai = data.soDienThoai || ''
      form.value.cccd = data.cccd || ''
      form.value.gioiTinh = data.gioiTinh !== undefined ? data.gioiTinh : 1
      form.value.ngaySinh = data.ngaySinh || ''
      form.value.idVaiTro = data.vaiTro ? data.vaiTro.id : ''
      form.value.anh = data.anh || ''
      form.value.anhLocal = data.anh ? getImageUrl(data.anh) : ''

      if (data.diaChi) {
        await parseAddressFromDb(data.diaChi)
      }
      isUsingMock.value = false
    } else {
      throw new Error('Nhan vien details empty')
    }
  } catch (err) {
    console.warn('API detail fetch failed, reading from local mock database:', err.message)
    isUsingMock.value = true

    const db = getMockDB()
    const target = db.find(e => e.id === Number(id))
    if (target) {
      form.value.id = target.id
      form.value.maNhanVien = target.maNhanVien || ''
      form.value.hoVaTen = target.hoVaTen || ''
      form.value.email = target.email || ''
      form.value.soDienThoai = target.soDienThoai || ''
      form.value.cccd = target.cccd || ''
      form.value.gioiTinh = target.gioiTinh !== undefined ? target.gioiTinh : 1
      form.value.ngaySinh = target.ngaySinh || ''
      form.value.idVaiTro = target.idVaiTro || ''
      form.value.anh = target.anh || ''
      form.value.anhLocal = target.anh ? getImageUrl(target.anh) : ''

      if (target.diaChi) {
        await parseAddressFromDb(target.diaChi)
      }
    } else {
      showToast('Không tìm thấy thông tin nhân viên!', 'error')
      setTimeout(() => {
        router.push('/employees')
      }, 1500)
    }
  }
}

// Choose Avatar file
const triggerImageInput = () => {
  fileInput.value.click()
}

const handleImageChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  form.value.anhLocal = URL.createObjectURL(file)
  form.value.imageFile = file
}

// Go back
const goBack = () => {
  triggerConfirm(
    'Bạn có chắc muốn rời đi? Mọi thông tin chưa lưu sẽ bị mất.',
    () => {
      router.push('/employees')
    },
    'Xác nhận rời đi'
  )
}

// Save form handler
const saveEmployee = async () => {
  const f = form.value
  
  // 1. Check required fields
  if (!f.hoVaTen || !f.hoVaTen.trim()) {
    showToast('Họ và tên không được để trống!', 'error')
    return
  }
  if (!f.idVaiTro) {
    showToast('Vui lòng chọn chức vụ / vai trò!', 'error')
    return
  }
  if (!f.email || !f.email.trim()) {
    showToast('Email không được để trống!', 'error')
    return
  }
  if (!f.ngaySinh) {
    showToast('Vui lòng chọn ngày sinh!', 'error')
    return
  }
  if (!f.soDienThoai || !f.soDienThoai.trim()) {
    showToast('Số điện thoại không được để trống!', 'error')
    return
  }
  if (!f.selectedProvince || !f.selectedDistrict || !f.selectedWard || !f.diaChiCuThe || !f.diaChiCuThe.trim()) {
    showToast('Vui lòng điền đầy đủ thông tin địa chỉ!', 'error')
    return
  }

  // CCCD is required for creation in backend
  if (!isEdit.value && !f.cccd) {
    showToast('Số Căn cước công dân (CCCD) là bắt buộc khi thêm mới!', 'error')
    return
  }

  // 2. Validate Full Name format
  const nameRegex = /^[\p{L}\s]+$/u
  if (!nameRegex.test(f.hoVaTen.trim())) {
    showToast('Họ và tên không hợp lệ (không chứa chữ số hoặc ký tự đặc biệt)!', 'error')
    return
  }
  if (f.hoVaTen.trim().length < 2 || f.hoVaTen.trim().length > 100) {
    showToast('Độ dài họ và tên phải từ 2 đến 100 ký tự!', 'error')
    return
  }

  // 3. Validate Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(f.email.trim())) {
    showToast('Email không đúng định dạng!', 'error')
    return
  }

  // 4. Validate Age (>= 18)
  if (f.ngaySinh) {
    const dob = new Date(f.ngaySinh)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    if (age < 18) {
      showToast('Nhân viên phải từ 18 tuổi trở lên!', 'error')
      return
    }
  }

  // 5. Validate Phone number (VN mobile format)
  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
  if (!phoneRegex.test(f.soDienThoai.trim())) {
    showToast('Số điện thoại không hợp lệ (gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)!', 'error')
    return
  }

  // 6. Validate CCCD format (12 digits)
  if (f.cccd) {
    const cccdRegex = /^[0-9]{12}$/
    if (!cccdRegex.test(f.cccd.trim())) {
      showToast('Số CCCD không hợp lệ (phải gồm đúng 12 chữ số)!', 'error')
      return
    }
  }

  const combinedAddress = `${f.diaChiCuThe}, ${f.selectedWard}, ${f.selectedDistrict}, ${f.selectedProvince}`

  triggerConfirm(
    `Bạn có chắc chắn muốn lưu thông tin nhân viên "${f.hoVaTen}" không?`,
    async () => {
      // 1. Upload profile photo if customized
      let uploadedUrl = f.anh
      if (f.imageFile) {
        try {
          const formData = new FormData()
          formData.append('file', f.imageFile)
          const uploadRes = await api.post('/api/v1/images/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          if (uploadRes.data) {
            uploadedUrl = uploadRes.data
          }
        } catch (err) {
          console.error(err)
          showToast('Tải ảnh đại diện thất bại, tiếp tục lưu với ảnh cũ.', 'warning')
        }
      }

      // 2. Prepare payload
      const payload = {
        idVaiTro: Number(f.idVaiTro),
        hoVaTen: f.hoVaTen,
        soDienThoai: f.soDienThoai,
        email: f.email,
        cccd: f.cccd || '',
        gioiTinh: Number(f.gioiTinh),
        ngaySinh: f.ngaySinh,
        diaChi: combinedAddress,
        anh: uploadedUrl
      }

      if (isUsingMock.value) {
        const db = getMockDB()
        const selectedRoleObj = roles.value.find(r => r.id === Number(f.idVaiTro))
        const roleName = selectedRoleObj ? selectedRoleObj.ten : 'Nhân viên bán hàng'

        if (isEdit.value) {
          const idx = db.findIndex(e => e.id === f.id)
          if (idx !== -1) {
            db[idx] = {
              ...db[idx],
              hoVaTen: f.hoVaTen,
              idVaiTro: Number(f.idVaiTro),
              tenVaiTro: roleName,
              email: f.email,
              soDienThoai: f.soDienThoai,
              cccd: f.cccd,
              gioiTinh: Number(f.gioiTinh),
              ngaySinh: f.ngaySinh,
              diaChi: combinedAddress,
              anh: f.anhLocal
            }
          }
          showToast('Cập nhật nhân viên thành công (Mock)!', 'success')
        } else {
          const newIdNum = db.length ? Math.max(...db.map(e => e.id)) + 1 : 1
          db.push({
            id: newIdNum,
            maNhanVien: f.maNhanVien || `NV0${newIdNum}`,
            hoVaTen: f.hoVaTen,
            idVaiTro: Number(f.idVaiTro),
            tenVaiTro: roleName,
            email: f.email,
            soDienThoai: f.soDienThoai,
            cccd: f.cccd,
            gioiTinh: Number(f.gioiTinh),
            ngaySinh: f.ngaySinh,
            diaChi: combinedAddress,
            anh: f.anhLocal,
            trangThai: 1
          })
          showToast('Thêm nhân viên thành công (Mock)!', 'success')
        }
        setMockDB(db)
        setTimeout(() => {
          router.push('/employees')
        }, 1000)
      } else {
        try {
          if (isEdit.value) {
            const res = await api.put(`/api/v1/nhan-vien/${f.id}`, payload)
            if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
              showToast(`Lỗi: ${res._wrapper.message}`, 'error')
            } else {
              showToast('Cập nhật nhân viên thành công!', 'success')
              setTimeout(() => {
                router.push('/employees')
              }, 1000)
            }
          } else {
            const res = await api.post('/api/v1/nhan-vien', payload)
            if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
              showToast(`Lỗi: ${res._wrapper.message}`, 'error')
            } else {
              showToast('Thêm mới nhân viên thành công!', 'success')
              setTimeout(() => {
                router.push('/employees')
              }, 1000)
            }
          }
        } catch (err) {
          console.error(err)
          const errorMsg = err.response?.data?.message || 'Lưu thông tin thất bại!'
          showToast(errorMsg, 'error')
        }
      }
    },
    'Lưu hồ sơ nhân viên'
  )
}

onMounted(async () => {
  await fetchProvinces()
  await fetchRoles()

  if (isEdit.value) {
    await loadEmployeeDetails(route.params.id)
  } else {
    // Generate code temporarily for addition
    const db = getMockDB()
    let maxNum = 4 // seed NV004
    db.forEach(e => {
      if (e.maNhanVien && e.maNhanVien.startsWith('NV')) {
        const num = parseInt(e.maNhanVien.replace('NV', ''), 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    })
    form.value.maNhanVien = `NV${String(maxNum + 1).padStart(3, '0')}`
    
    // Set default role if available
    if (roles.value.length) {
      form.value.idVaiTro = roles.value[0].id
    }
  }
})

onUnmounted(async () => {
  await stopScanner()
})
</script>

<template>
  <div class="max-w-6xl mx-auto w-full space-y-6">
    <!-- Header / Breadcrumb Area -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/20">
      <div class="flex items-center gap-2 text-on-surface font-headline-md text-headline-md">
        <span class="text-secondary cursor-pointer hover:underline" @click="router.push('/employees')">Nhân viên</span>
        <span class="text-secondary">/</span>
        <span class="font-bold">{{ isEdit ? 'Cập nhật nhân viên' : 'Thêm nhân viên' }}</span>
      </div>
      <div class="flex items-center justify-end gap-stack-lg">
        <a 
          @click.prevent="goBack" 
          class="text-secondary hover:text-primary transition-colors text-body-md font-body-md underline cursor-pointer"
          href="#"
        >
          Quay lại
        </a>
        <button 
          @click="openQrModal"
          class="bg-primary-container text-white px-6 py-2 rounded-lg font-label-sm text-label-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">qr_code_scanner</span>
          Quét CCCD
        </button>
      </div>
    </div>

    <!-- Main Form Card -->
    <div class="bg-surface-container-lowest rounded-lg shadow-[0px_4px_12px_rgba(0,0,0,0.05)] p-stack-lg border border-outline-variant/20">
      <div class="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-stack-lg lg:gap-12">
        
        <!-- Left Column: Avatar & Basic Info -->
        <div class="flex flex-col items-center border-r border-outline-variant/30 pr-0 md:pr-stack-lg pb-6 md:pb-0">
          <h2 class="w-full text-left font-headline-md text-headline-md mb-stack-lg font-bold border-b border-outline-variant/10 pb-2">
            Thông tin cơ bản
          </h2>
          
          <!-- Avatar Upload -->
          <div 
            @click="triggerImageInput"
            class="w-40 h-40 rounded-full border-2 border-dashed border-outline-variant/60 flex items-center justify-center cursor-pointer hover:border-primary-container hover:bg-surface-container-low transition-colors mb-stack-md relative overflow-hidden group"
          >
            <img 
              v-if="form.anhLocal" 
              :src="form.anhLocal" 
              class="w-full h-full object-cover" 
              alt="Avatar Preview"
            />
            <div 
              v-else 
              class="text-center"
            >
              <span class="text-secondary text-body-md font-body-md group-hover:text-primary-container font-semibold">Chọn ảnh</span>
            </div>
            <input 
              ref="fileInput" 
              accept="image/*" 
              class="hidden" 
              type="file" 
              @change="handleImageChange"
            />
          </div>
          <p class="text-secondary text-body-sm font-body-md mb-stack-lg">Nhấn vào hình để tải ảnh đại diện</p>
          
          <!-- Full Name Input -->
          <div class="w-full space-y-1">
            <label class="block text-body-md font-body-md text-on-surface font-semibold">
              Họ Và Tên <span class="text-error">*</span>
            </label>
            <input 
              v-model="form.hoVaTen"
              class="w-full border border-outline-variant rounded bg-surface-container-lowest px-3 py-2 text-body-md focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow" 
              placeholder="Nhập họ tên nhân viên" 
              type="text"
              required
            />
          </div>

          <!-- Chức Vụ / Vai Trò Select Dropdown -->
          <div class="w-full space-y-1 mt-4">
            <label class="block text-body-md font-body-md text-on-surface font-semibold">
              Chức vụ / Vai trò <span class="text-error">*</span>
            </label>
            <div class="relative">
              <select 
                v-model="form.idVaiTro"
                class="w-full border border-outline-variant rounded bg-surface-container-lowest py-2 pl-3 pr-10 focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow text-body-md cursor-pointer appearance-none"
                required
              >
                <option disabled selected value="">Chọn Chức Vụ</option>
                <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.ten }}</option>
              </select>
              <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" style="font-size: 20px;">expand_more</span>
            </div>
          </div>
        </div>

        <!-- Right Column: Detailed Info -->
        <div class="space-y-6">
          <h2 class="font-headline-md text-headline-md mb-stack-lg font-bold border-b border-outline-variant/10 pb-2">
            Thông tin chi tiết
          </h2>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-stack-lg gap-y-stack-md">
            <!-- Email -->
            <div class="space-y-1">
              <label class="block text-body-md font-body-md text-on-surface font-semibold">
                Email <span class="text-error">*</span>
              </label>
              <input 
                v-model="form.email"
                class="w-full border border-outline-variant rounded bg-surface-container-lowest px-3 py-2 text-body-md focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow" 
                placeholder="example@mail.com" 
                type="email"
                required
              />
            </div>

            <!-- Ngày sinh -->
            <div class="space-y-1">
              <label class="block text-body-md font-body-md text-on-surface font-semibold">
                Ngày sinh <span class="text-error">*</span>
              </label>
              <input 
                v-model="form.ngaySinh"
                class="w-full border border-outline-variant rounded bg-surface-container-lowest px-3 py-2 text-body-md focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow cursor-pointer" 
                type="date"
                required
              />
            </div>

            <!-- Số Điện Thoại -->
            <div class="space-y-1">
              <label class="block text-body-md font-body-md text-on-surface font-semibold">
                Số Điện Thoại <span class="text-error">*</span>
              </label>
              <input 
                v-model="form.soDienThoai"
                class="w-full border border-outline-variant rounded bg-surface-container-lowest px-3 py-2 text-body-md focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow" 
                placeholder="09xxxxxxxx" 
                type="tel"
                required
              />
            </div>

            <!-- Giới tính -->
            <div class="space-y-1">
              <label class="block text-body-md font-body-md text-on-surface font-semibold">
                Giới tính <span class="text-error">*</span>
              </label>
              <div class="flex items-center gap-stack-lg mt-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="gender" 
                    :value="1" 
                    v-model="form.gioiTinh"
                    class="text-primary-container focus:ring-primary-container border-outline-variant w-4 h-4 cursor-pointer"
                  />
                  <span class="text-body-md font-body-md font-semibold">Nam</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="gender" 
                    :value="0" 
                    v-model="form.gioiTinh"
                    class="text-primary-container focus:ring-primary-container border-outline-variant w-4 h-4 cursor-pointer"
                  />
                  <span class="text-body-md font-body-md font-semibold">Nữ</span>
                </label>
              </div>
            </div>

            <!-- CCCD -->
            <div class="space-y-1 sm:col-span-2">
              <label class="block text-body-md font-body-md text-on-surface font-semibold">
                Số Căn cước công dân (CCCD) <span v-if="!isEdit" class="text-error">*</span>
              </label>
              <input 
                v-model="form.cccd"
                class="w-full border border-outline-variant rounded bg-surface-container-lowest px-3 py-2 text-body-md focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow" 
                placeholder="Nhập số CCCD" 
                type="text"
                :required="!isEdit"
              />
            </div>

            <!-- Dropdowns: Province, District, Ward -->
            <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-stack-lg pt-2">
              <!-- Tỉnh/Thành -->
              <div class="space-y-1">
                <label class="block text-body-md font-body-md text-on-surface font-semibold">
                  Tỉnh/Thành phố <span class="text-error">*</span>
                </label>
                <div class="relative">
                  <select 
                    v-model="form.selectedProvince"
                    @change="onProvinceChange"
                    class="w-full border border-outline-variant rounded bg-surface-container-lowest py-2 pl-3 pr-10 focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow text-body-md cursor-pointer appearance-none"
                    required
                  >
                    <option disabled selected value="">Chọn Tỉnh/TP</option>
                    <option v-for="prov in provinces" :key="prov.code" :value="prov.name">{{ prov.name }}</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" style="font-size: 20px;">expand_more</span>
                </div>
              </div>

              <!-- Quận/Huyện -->
              <div class="space-y-1">
                <label class="block text-body-md font-body-md text-on-surface font-semibold">
                  Quận/Huyện <span class="text-error">*</span>
                </label>
                <div class="relative">
                  <select 
                    v-model="form.selectedDistrict"
                    @change="onDistrictChange"
                    :disabled="!form.selectedProvince"
                    class="w-full border border-outline-variant rounded bg-surface-container-lowest py-2 pl-3 pr-10 focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow text-body-md cursor-pointer appearance-none disabled:bg-surface-container-low disabled:cursor-not-allowed"
                    required
                  >
                    <option disabled selected value="">Chọn Quận/Huyện</option>
                    <option v-for="dist in districts" :key="dist.code" :value="dist.name">{{ dist.name }}</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" style="font-size: 20px;">expand_more</span>
                </div>
              </div>

              <!-- Phường/Xã -->
              <div class="space-y-1">
                <label class="block text-body-md font-body-md text-on-surface font-semibold">
                  Xã/Phường <span class="text-error">*</span>
                </label>
                <div class="relative">
                  <select 
                    v-model="form.selectedWard"
                    :disabled="!form.selectedDistrict"
                    class="w-full border border-outline-variant rounded bg-surface-container-lowest py-2 pl-3 pr-10 focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow text-body-md cursor-pointer appearance-none disabled:bg-surface-container-low disabled:cursor-not-allowed"
                    required
                  >
                    <option disabled selected value="">Chọn Xã/Phường</option>
                    <option v-for="wd in wards" :key="wd.code" :value="wd.name">{{ wd.name }}</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" style="font-size: 20px;">expand_more</span>
                </div>
              </div>
            </div>

            <!-- Địa chỉ cụ thể -->
            <div class="sm:col-span-2 space-y-1">
              <label class="block text-body-md font-body-md text-on-surface font-semibold">
                Địa chỉ cụ thể (Số nhà, đường) <span class="text-error">*</span>
              </label>
              <input 
                v-model="form.diaChiCuThe"
                class="w-full border border-outline-variant rounded bg-surface-container-lowest px-3 py-2 text-body-md focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-shadow" 
                placeholder="VD: Số 10, Ngõ 5..." 
                type="text"
                required
              />
            </div>
          </div>

          <!-- Submit Buttons -->
          <div class="mt-stack-lg pt-stack-lg border-t border-outline-variant/10 flex justify-end">
            <button 
              @click="saveEmployee"
              class="bg-primary-container text-white px-8 py-3 rounded-lg font-headline-md text-headline-md hover:bg-primary/95 hover:shadow transition-all shadow-sm cursor-pointer"
            >
              {{ isEdit ? 'Cập Nhật Nhân Viên' : 'Thêm Nhân Viên' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- CCCD Scanning Modal Backdrop -->
  <div v-if="showQrModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-2xl max-w-lg w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in flex flex-col">
      <div class="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary-container text-2xl">qr_code_scanner</span>
          <h3 class="font-headline-md text-base font-bold text-gray-800">Quét Mã QR Căn Cước Công Dân</h3>
        </div>
        <button @click="closeQrModal" class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">
          <span class="material-symbols-outlined text-base">close</span>
        </button>
      </div>
      <div class="p-6 flex flex-col items-center justify-center space-y-4">
        <p class="text-xs text-gray-500 font-semibold text-center leading-relaxed max-w-sm">
          Đưa mã QR trên Căn cước công dân của nhân viên trước ống kính camera để hệ thống tự động nhận diện và điền nhanh thông tin.
        </p>
        <div id="cccd-qr-reader" class="w-full max-w-[320px] h-[320px] rounded-lg overflow-hidden border border-gray-200 bg-black"></div>
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
        <button 
          @click="closeQrModal"
          class="border border-gray-200 hover:bg-gray-100 text-gray-600 px-5 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Confirmation Dialog Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span class="material-symbols-outlined text-primary-container text-2xl">help_outline</span>
        <h3 class="font-headline-md text-base font-bold text-gray-800">{{ confirmModal.title }}</h3>
      </div>
      <div class="p-6 text-sm text-gray-600 font-body-md leading-relaxed font-semibold">
        {{ confirmModal.message }}
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button 
          type="button" 
          @click="confirmModal.show = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
        >
          Hủy bộ
        </button>
        <button 
          type="button" 
          @click="handleConfirm"
          class="bg-primary-container hover:bg-primary text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-sm"
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
      'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'warning',
      'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info'
    }"
  >
    <span class="material-symbols-outlined text-lg">
      {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'info' }}
    </span>
    <span class="text-sm font-semibold font-body-md">{{ toast.message }}</span>
    <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-gray-600 cursor-pointer">
      <span class="material-symbols-outlined text-sm">close</span>
    </button>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

/* Matching inputs style exactly with custom border/ring color requirement */
input:focus, select:focus, textarea:focus {
  border-color: #EF972D !important;
  box-shadow: 0 0 0 1px #EF972D !important;
  outline: none;
}
</style>
