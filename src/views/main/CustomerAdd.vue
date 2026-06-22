<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../services/api'

const route = useRoute()
const router = useRouter()

const isEdit = ref(false)
const isUsingMock = ref(false)
const fileInput = ref(null)

// Form fields for UI and API payload mapping
const form = ref({
  id: null,
  maKhachHang: '',
  hoTen: '',
  tenTaiKhoan: '', // Keeps UI premium but not sent to DTO if it doesn't exist
  sdt: '',
  email: '',
  gioiTinh: 'Nam',
  ngaySinh: '',
  anhDaiDien: '', // Keeps UI premium
  trangThai: 1,
  diaChiMacDinh: '',
  matKhau: ''
})

// Address list
const diaChiList = ref([])

// Toast Notification
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// Confirmation Dialog Modal
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

// Location Data from Public open API
const provinces = ref([])
const districts = ref([])
const wards = ref([])

const fetchProvinces = async () => {
  try {
    const res = await fetch('https://provinces.open-api.vn/api/p/')
    const data = await res.json()
    provinces.value = data || []
  } catch (err) {
    console.error('Failed to fetch provinces:', err)
  }
}

const onProvinceChange = async () => {
  districts.value = []
  wards.value = []
  addressModal.value.form.selectedDistrict = ''
  addressModal.value.form.selectedWard = ''

  const pName = addressModal.value.form.selectedProvince
  if (!pName) return

  const provObj = provinces.value.find(p => p.name === pName)
  if (provObj) {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${provObj.code}?depth=2`)
      const data = await res.json()
      districts.value = data.districts || []
    } catch (err) {
      console.error('Failed to fetch districts:', err)
    }
  }
}

const onDistrictChange = async () => {
  wards.value = []
  addressModal.value.form.selectedWard = ''

  const dName = addressModal.value.form.selectedDistrict
  if (!dName) return

  const distObj = districts.value.find(d => d.name === dName)
  if (distObj) {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${distObj.code}?depth=2`)
      const data = await res.json()
      wards.value = data.wards || []
    } catch (err) {
      console.error('Failed to fetch wards:', err)
    }
  }
}

// Address modal form
const addressModal = ref({
  show: false,
  isEditAddress: false,
  index: -1,
  form: {
    tenNguoiNhan: '',
    sdt: '',
    selectedProvince: '',
    selectedDistrict: '',
    selectedWard: '',
    diaChiCuThe: ''
  }
})

// Get mock database from localStorage
const getMockDB = () => {
  const db = localStorage.getItem('mock_customers')
  return db ? JSON.parse(db) : []
}

// Set mock database to localStorage
const setMockDB = (data) => {
  localStorage.setItem('mock_customers', JSON.stringify(data))
}

// Helper to format full address text
const getFullAddressText = (addr) => {
  if (!addr) return ''
  if (addr.diaChiChiTiet) return addr.diaChiChiTiet // mock fallback
  return `${addr.diaChiCuThe}, ${addr.phuongXa}, ${addr.quanHuyen}, ${addr.tinhThanhPho}`
}

// Handle details loading
onMounted(async () => {
  fetchProvinces()
  const customerId = route.params.id
  if (customerId) {
    isEdit.value = true
    await loadCustomerDetails(customerId)
  } else {
    isEdit.value = false
    // Generate a unique client code based on the max code currently in the database to prevent duplicates
    try {
      const res = await api.get('/api/v1/khach-hang', { params: { page: 0, size: 200 } })
      const list = res.data?.content || []
      
      let maxNum = 0
      list.forEach(c => {
        if (c.maKhachHang && c.maKhachHang.startsWith('KH')) {
          const numPart = c.maKhachHang.replace('KH', '')
          const num = parseInt(numPart, 10)
          if (!isNaN(num) && num > maxNum) {
            maxNum = num
          }
        }
      })
      const nextNum = maxNum + 1
      form.value.maKhachHang = `KH${String(nextNum).padStart(3, '0')}`
    } catch (err) {
      console.warn('API client code generation failed, using mock DB fallback:', err.message)
      const db = getMockDB()
      let maxNum = 0
      db.forEach(c => {
        if (c.maKhachHang && c.maKhachHang.startsWith('KH')) {
          const numPart = c.maKhachHang.replace('KH', '')
          const num = parseInt(numPart, 10)
          if (!isNaN(num) && num > maxNum) {
            maxNum = num
          }
        }
      })
      const nextNum = maxNum + 1
      form.value.maKhachHang = `KH${String(nextNum).padStart(3, '0')}`
    }
  }
})

// Load customer data from API or localStorage
const loadCustomerDetails = async (id) => {
  try {
    const res = await api.get(`/api/v1/khach-hang/${id}`)
    if (res.data) {
      const data = res.data
      form.value = {
        id: data.id,
        maKhachHang: data.maKhachHang || '',
        hoTen: data.hoTen || '',
        tenTaiKhoan: data.hoTen ? data.hoTen.toLowerCase().replace(/\s/g, '_') : '', // Placeholder username
        sdt: data.sdt || '',
        email: data.email || '',
        gioiTinh: data.gioiTinh === 1 ? 'Nam' : 'Nữ',
        ngaySinh: data.ngaySinh || '',
        anhDaiDien: '', // API does not return photo, keep blank
        trangThai: data.trangThai || 1,
        diaChiMacDinh: '',
        matKhau: ''
      }
      
      diaChiList.value = data.danhSachDiaChi || []
      const defAddr = diaChiList.value.find(a => a.kieuDiaChiLaMacDinh)
      if (defAddr) {
        form.value.diaChiMacDinh = getFullAddressText(defAddr)
      }
      isUsingMock.value = false
    } else {
      throw new Error('Customer not found')
    }
  } catch (err) {
    console.warn('API details load failed, loading from local mock storage:', err.message)
    isUsingMock.value = true
    
    const db = getMockDB()
    const target = db.find(c => c.id === Number(id))
    if (target) {
      form.value = {
        id: target.id,
        maKhachHang: target.maKhachHang || '',
        hoTen: target.hoTen || '',
        tenTaiKhoan: target.tenTaiKhoan || '',
        sdt: target.sdt || '',
        email: target.email || '',
        gioiTinh: target.gioiTinh === 1 ? 'Nam' : 'Nữ',
        ngaySinh: target.ngaySinh || '',
        anhDaiDien: target.anhDaiDien || '',
        trangThai: target.trangThai || 1,
        diaChiMacDinh: target.diaChiMacDinh || ''
      }
      diaChiList.value = target.diaChiList || []
    } else {
      showToast('Không tìm thấy thông tin khách hàng!', 'error')
      setTimeout(() => {
        router.push('/customers')
      }, 1500)
    }
  }
}

// Profile picture triggers
const triggerImageInput = () => {
  fileInput.value.click()
}

// Upload image file
const handleImageChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // Show local preview immediately
  const localUrl = URL.createObjectURL(file)
  form.value.anhDaiDien = localUrl
  showToast('Tải ảnh đại diện thành công (Mock UI)!', 'success')
}

// Back to list
const goBack = () => {
  triggerConfirm(
    'Bạn có chắc chắn muốn rời đi? Mọi thay đổi chưa được lưu sẽ bị mất.',
    () => {
      router.push('/customers')
    },
    'Xác nhận quay lại'
  )
}

// Add/Edit Address Actions
const openAddAddressModal = () => {
  districts.value = []
  wards.value = []
  addressModal.value = {
    show: true,
    isEditAddress: false,
    index: -1,
    form: {
      tenNguoiNhan: form.value.hoTen || '',
      sdt: form.value.sdt || '',
      selectedProvince: '',
      selectedDistrict: '',
      selectedWard: '',
      diaChiCuThe: ''
    }
  }
}

const openEditAddressModal = async (item, index) => {
  if (!isUsingMock.value && isEdit.value) {
    showToast('Hệ thống hiện tại chưa hỗ trợ sửa trực tiếp địa chỉ đã lưu. Vui lòng thêm địa chỉ mới.', 'info')
    return
  }

  districts.value = []
  wards.value = []

  addressModal.value = {
    show: true,
    isEditAddress: true,
    index,
    form: {
      tenNguoiNhan: item.tenNguoiNhan || '',
      sdt: item.sdtNguoiNhan || item.sdt || '',
      selectedProvince: item.tinhThanhPho || '',
      selectedDistrict: '',
      selectedWard: '',
      diaChiCuThe: item.diaChiCuThe || ''
    }
  }

  // Sequentially load districts & wards if province is found
  if (item.tinhThanhPho) {
    const provObj = provinces.value.find(p => p.name === item.tinhThanhPho)
    if (provObj) {
      try {
        const res = await fetch(`https://provinces.open-api.vn/api/p/${provObj.code}?depth=2`)
        const data = await res.json()
        districts.value = data.districts || []
        
        addressModal.value.form.selectedDistrict = item.quanHuyen
        const distObj = districts.value.find(d => d.name === item.quanHuyen)
        if (distObj) {
          const res2 = await fetch(`https://provinces.open-api.vn/api/d/${distObj.code}?depth=2`)
          const data2 = await res2.json()
          wards.value = data2.wards || []
          addressModal.value.form.selectedWard = item.phuongXa
        }
      } catch (err) {
        console.error('Failed to load edit address details:', err)
      }
    }
  }
}

const saveAddress = async () => {
  const addrForm = addressModal.value.form
  if (!addrForm.tenNguoiNhan || !addrForm.sdt || !addrForm.selectedProvince || !addrForm.selectedDistrict || !addrForm.selectedWard || !addrForm.diaChiCuThe) {
    showToast('Vui lòng nhập đầy đủ thông tin địa chỉ!', 'error')
    return
  }

  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
  if (!phoneRegex.test(addrForm.sdt)) {
    showToast('Số điện thoại người nhận không hợp lệ (VD: 0901234567)!', 'error')
    return
  }

  const combinedAddress = `${addrForm.diaChiCuThe}, ${addrForm.selectedWard}, ${addrForm.selectedDistrict}, ${addrForm.selectedProvince}`

  if (isUsingMock.value) {
    if (addressModal.value.isEditAddress) {
      const idx = addressModal.value.index
      if (idx !== -1 && diaChiList.value[idx]) {
        const oldAddress = diaChiList.value[idx]
        diaChiList.value[idx] = {
          ...oldAddress,
          tenNguoiNhan: addrForm.tenNguoiNhan,
          sdtNguoiNhan: addrForm.sdt,
          diaChiCuThe: addrForm.diaChiCuThe,
          tinhThanhPho: addrForm.selectedProvince,
          quanHuyen: addrForm.selectedDistrict,
          phuongXa: addrForm.selectedWard
        }
        
        if (oldAddress.kieuDiaChiLaMacDinh) {
          form.value.diaChiMacDinh = combinedAddress
        }
        showToast('Đã cập nhật địa chỉ (Mock)!', 'success')
      }
    } else {
      const newId = diaChiList.value.length ? Math.max(...diaChiList.value.map(a => a.id)) + 1 : 101
      const shouldBeDefault = diaChiList.value.length === 0
      
      diaChiList.value.push({
        id: newId,
        tenNguoiNhan: addrForm.tenNguoiNhan,
        sdtNguoiNhan: addrForm.sdt,
        diaChiCuThe: addrForm.diaChiCuThe,
        tinhThanhPho: addrForm.selectedProvince,
        quanHuyen: addrForm.selectedDistrict,
        phuongXa: addrForm.selectedWard,
        kieuDiaChiLaMacDinh: shouldBeDefault
      })
      
      if (shouldBeDefault) {
        form.value.diaChiMacDinh = combinedAddress
      }
      showToast('Đã thêm địa chỉ mới (Mock)!', 'success')
    }
    addressModal.value.show = false
  } else {
    // API Mode
    if (isEdit.value) {
      // If customer already exists, post to backend immediately!
      const addrPayload = {
        tenNguoiNhan: addrForm.tenNguoiNhan,
        sdtNguoiNhan: addrForm.sdt,
        diaChiCuThe: addrForm.diaChiCuThe,
        tinhThanhPho: addrForm.selectedProvince,
        quanHuyen: addrForm.selectedDistrict,
        phuongXa: addrForm.selectedWard,
        kieuDiaChiLaMacDinh: diaChiList.value.length === 0
      }

      try {
        const res = await api.post(`/api/v1/khach-hang/${form.value.id}/dia-chi`, addrPayload)
        if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
          showToast(`Lỗi: ${res._wrapper.message}`, 'error')
        } else {
          showToast('Thêm địa chỉ thành công!', 'success')
          // Reload
          await loadCustomerDetails(form.value.id)
        }
      } catch (err) {
        console.error('Failed to post address:', err)
        showToast('Thêm địa chỉ thất bại!', 'error')
      }
      addressModal.value.show = false
    } else {
      // Creating a new customer: save to list locally first, saved sequentially when customer form is submitted
      const newId = diaChiList.value.length ? Math.max(...diaChiList.value.map(a => a.id)) + 1 : 101
      const shouldBeDefault = diaChiList.value.length === 0
      
      diaChiList.value.push({
        id: newId,
        tenNguoiNhan: addrForm.tenNguoiNhan,
        sdtNguoiNhan: addrForm.sdt,
        diaChiCuThe: addrForm.diaChiCuThe,
        tinhThanhPho: addrForm.selectedProvince,
        quanHuyen: addrForm.selectedDistrict,
        phuongXa: addrForm.selectedWard,
        kieuDiaChiLaMacDinh: shouldBeDefault
      })
      
      if (shouldBeDefault) {
        form.value.diaChiMacDinh = combinedAddress
      }
      showToast('Đã ghi nhận địa chỉ mới!', 'success')
      addressModal.value.show = false
    }
  }
}

// Delete Address Card
const deleteAddress = (index) => {
  if (!isUsingMock.value && isEdit.value) {
    showToast('Hệ thống hiện tại chưa hỗ trợ xóa địa chỉ đã lưu trong CSDL backend.', 'info')
    return
  }

  triggerConfirm(
    'Bạn có chắc chắn muốn xóa địa chỉ này khỏi danh sách?',
    () => {
      const deleted = diaChiList.value.splice(index, 1)[0]
      if (deleted && deleted.kieuDiaChiLaMacDinh) {
        if (diaChiList.value.length) {
          diaChiList.value[0].kieuDiaChiLaMacDinh = true
          form.value.diaChiMacDinh = getFullAddressText(diaChiList.value[0])
        } else {
          form.value.diaChiMacDinh = ''
        }
      }
      showToast('Đã xóa địa chỉ!', 'success')
    },
    'Xóa địa chỉ'
  )
}

// Toggle Default Address (Golden Star)
const setDefaultAddress = async (index) => {
  const selectedAddr = diaChiList.value[index]

  triggerConfirm(
    `Bạn có chắc chắn muốn đặt địa chỉ "${getFullAddressText(selectedAddr)}" làm địa chỉ mặc định không?`,
    async () => {
      if (isUsingMock.value) {
        diaChiList.value.forEach((addr, idx) => {
          addr.kieuDiaChiLaMacDinh = idx === index
          if (idx === index) {
            form.value.diaChiMacDinh = getFullAddressText(addr)
          }
        })
        showToast('Đã thiết lập địa chỉ mặc định (Mock)!', 'success')
      } else {
        if (isEdit.value) {
          try {
            const res = await api.patch(`/api/v1/khach-hang/${form.value.id}/dia-chi/${selectedAddr.id}/mac-dinh`)
            if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
              showToast(`Lỗi: ${res._wrapper.message}`, 'error')
            } else {
              showToast('Đặt địa chỉ mặc định thành công!', 'success')
              await loadCustomerDetails(form.value.id)
            }
          } catch (err) {
            console.error('Failed to set default address:', err)
            showToast('Đặt địa chỉ mặc định thất bại!', 'error')
          }
        } else {
          diaChiList.value.forEach((addr, idx) => {
            addr.kieuDiaChiLaMacDinh = idx === index
            if (idx === index) {
              form.value.diaChiMacDinh = getFullAddressText(addr)
            }
          })
          showToast('Đã chọn địa chỉ mặc định!', 'success')
        }
      }
    },
    'Đặt địa chỉ mặc định'
  )
}

// Save customer form
const saveCustomer = async () => {
  if (!form.value.hoTen || !form.value.sdt || !form.value.email) {
    showToast('Vui lòng điền đầy đủ các thông tin bắt buộc!', 'error')
    return
  }

  // Basic validations
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.value.email)) {
    showToast('Email không đúng định dạng!', 'error')
    return
  }
  
  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
  if (!phoneRegex.test(form.value.sdt)) {
    showToast('Số điện thoại không hợp lệ (Mẫu: 0901234567)!', 'error')
    return
  }

  const payload = {
    maKhachHang: form.value.maKhachHang,
    hoTen: form.value.hoTen,
    sdt: form.value.sdt,
    email: form.value.email,
    gioiTinh: form.value.gioiTinh === 'Nam' ? 1 : 0,
    ngaySinh: form.value.ngaySinh || null,
    trangThai: form.value.trangThai,
    matKhau: form.value.matKhau || null
  }

  triggerConfirm(
    `Bạn có chắc chắn muốn lưu thông tin khách hàng này không?`,
    async () => {
      if (isUsingMock.value) {
        const db = getMockDB()
        if (isEdit.value) {
          const idx = db.findIndex(c => c.id === form.value.id)
          if (idx !== -1) {
            db[idx] = {
              ...db[idx],
              hoTen: form.value.hoTen,
              sdt: form.value.sdt,
              email: form.value.email,
              gioiTinh: form.value.gioiTinh === 'Nam' ? 1 : 0,
              ngaySinh: form.value.ngaySinh,
              trangThai: form.value.trangThai,
              diaChiMacDinh: form.value.diaChiMacDinh,
              diaChiList: diaChiList.value
            }
          }
          showToast('Lưu thông tin khách hàng thành công (Mock)!', 'success')
        } else {
          const newIdNum = db.length ? Math.max(...db.map(c => c.id)) + 1 : 1
          db.push({
            id: newIdNum,
            maKhachHang: form.value.maKhachHang || `KH0${newIdNum}`,
            hoTen: form.value.hoTen,
            sdt: form.value.sdt,
            email: form.value.email,
            gioiTinh: form.value.gioiTinh === 'Nam' ? 1 : 0,
            ngaySinh: form.value.ngaySinh,
            trangThai: form.value.trangThai,
            diaChiMacDinh: form.value.diaChiMacDinh,
            diaChiList: diaChiList.value
          })
          showToast('Thêm khách hàng thành công (Mock)!', 'success')
        }
        
        setMockDB(db)
        setTimeout(() => {
          router.push('/customers')
        }, 1000)
      } else {
        try {
          if (isEdit.value) {
            // Update customer details
            const res = await api.put(`/api/v1/khach-hang/${form.value.id}`, payload)
            if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
              showToast(`Lỗi: ${res._wrapper.message}`, 'error')
            } else {
              showToast('Cập nhật thông tin khách hàng thành công!', 'success')
              setTimeout(() => {
                router.push('/customers')
              }, 1000)
            }
          } else {
            // Create customer details
            const res = await api.post('/api/v1/khach-hang', payload)
            if (res._wrapper && res._wrapper.status && res._wrapper.status.includes('ERROR')) {
              showToast(`Lỗi: ${res._wrapper.message}`, 'error')
              return
            }

            // Query newly created customer to retrieve its generated database ID
            const listRes = await api.get('/api/v1/khach-hang', {
              params: { keyword: payload.sdt, page: 0, size: 10 }
            })
            const content = listRes.data?.content || []
            const createdCustomer = content.find(c => c.sdt === payload.sdt || c.maKhachHang === payload.maKhachHang)
            
            if (createdCustomer && diaChiList.value.length > 0) {
              // Post addresses sequentially for this customer
              for (const addr of diaChiList.value) {
                const addrPayload = {
                  tenNguoiNhan: addr.tenNguoiNhan,
                  sdtNguoiNhan: addr.sdtNguoiNhan,
                  diaChiCuThe: addr.diaChiCuThe,
                  tinhThanhPho: addr.tinhThanhPho,
                  quanHuyen: addr.quanHuyen,
                  phuongXa: addr.phuongXa,
                  kieuDiaChiLaMacDinh: addr.kieuDiaChiLaMacDinh
                }
                await api.post(`/api/v1/khach-hang/${createdCustomer.id}/dia-chi`, addrPayload)
              }
            }

            showToast('Thêm mới khách hàng thành công!', 'success')
            setTimeout(() => {
              router.push('/customers')
            }, 1000)
          }
        } catch (err) {
          console.error('Failed to save customer data:', err)
          const errorMsg = err.response?.data?.message || 'Lưu thông tin thất bại!'
          showToast(errorMsg, 'error')
        }
      }
    },
    'Lưu thông tin khách hàng'
  )
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Title / Action Buttons -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-outline-variant/20">
      <div>
        <h1 class="font-headline-md text-headline-md text-inverse-surface font-bold">
          Quản lý khách hàng / {{ isEdit ? 'Chi tiết khách hàng' : 'Thêm mới khách hàng' }}
        </h1>
      </div>
      <div class="flex gap-3 justify-end">
        <button 
          @click="goBack" 
          class="px-5 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          Hủy
        </button>
        <button 
          @click="saveCustomer" 
          class="px-5 py-2 bg-primary-container text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-primary transition-colors cursor-pointer shadow-sm"
        >
          Lưu
        </button>
      </div>
    </div>

    <!-- Main Grid Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Customer Details Form -->
      <section class="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 p-gutter flex flex-col space-y-4">
        <h3 class="font-bold text-on-surface border-b border-outline-variant/10 pb-2">
          Thông tin khách hàng
        </h3>

        <!-- Profile Photo Uploader -->
        <div class="py-4">
          <div 
            @click="triggerImageInput"
            class="relative w-28 h-28 mx-auto rounded-full border border-outline-variant/50 flex flex-col items-center justify-center bg-surface-container-lowest cursor-pointer group hover:border-primary-container hover:shadow-sm transition-all overflow-hidden"
          >
            <img 
              v-if="form.anhDaiDien" 
              :src="form.anhDaiDien" 
              class="w-full h-full object-cover" 
              alt="Avatar"
            />
            <div 
              v-else 
              class="flex flex-col items-center gap-0.5 text-on-surface-variant group-hover:text-primary-container transition-colors"
            >
              <span class="material-symbols-outlined text-[24px]">photo_camera</span>
              <span class="text-[11px] font-semibold">Chọn ảnh</span>
            </div>
            
            <!-- Hidden input -->
            <input 
              ref="fileInput" 
              type="file" 
              class="hidden" 
              accept="image/*" 
              @change="handleImageChange"
            />
          </div>
        </div>

        <!-- Form fields -->
        <div class="space-y-4 font-body-md text-body-md">
          <!-- Mã KH (Disabled) -->
          <div class="space-y-1">
            <label class="block text-sm font-semibold text-on-surface-variant">Mã KH</label>
            <input 
              type="text" 
              v-model="form.maKhachHang" 
              class="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant cursor-not-allowed focus:outline-none"
              placeholder="Hệ thống tự động phát sinh"
              readonly
            />
          </div>

          <!-- Tên khách hàng -->
          <div class="space-y-1">
            <label class="block text-sm font-semibold text-on-surface">Tên khách hàng <span class="text-error">*</span></label>
            <input 
              type="text" 
              v-model="form.hoTen" 
              class="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
              placeholder="Nhập tên khách hàng"
              required
            />
          </div>

          <!-- Email -->
          <div class="space-y-1">
            <label class="block text-sm font-semibold text-on-surface">Email <span class="text-error">*</span></label>
            <input 
              type="email" 
              v-model="form.email" 
              class="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
              placeholder="VD: name@domain.com"
              required
            />
          </div>

          <!-- Số điện thoại -->
          <div class="space-y-1">
            <label class="block text-sm font-semibold text-on-surface">Số điện thoại <span class="text-error">*</span></label>
            <input 
              type="text" 
              v-model="form.sdt" 
              class="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
              placeholder="Nhập số điện thoại"
              required
            />
          </div>

          <!-- Mật khẩu -->
          <div class="space-y-1">
            <label class="block text-sm font-semibold text-on-surface">Mật khẩu <span v-if="!isEdit" class="text-error">*</span></label>
            <input 
              type="password" 
              v-model="form.matKhau" 
              class="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
              :placeholder="isEdit ? 'Nhập để thay đổi mật khẩu' : 'Nhập mật khẩu (mặc định: 123456)'"
              :required="!isEdit"
            />
          </div>

          <!-- Ngày sinh -->
          <div class="space-y-1">
            <label class="block text-sm font-semibold text-on-surface">Ngày sinh</label>
            <input 
              type="date" 
              v-model="form.ngaySinh" 
              class="w-full px-3 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
            />
          </div>

          <!-- Giới tính & Trạng thái -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="block text-sm font-semibold text-on-surface">Giới tính</label>
              <select 
                v-model="form.gioiTinh"
                class="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container cursor-pointer transition-all"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="block text-sm font-semibold text-on-surface">Trạng thái</label>
              <select 
                v-model="form.trangThai"
                class="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container cursor-pointer transition-all"
              >
                <option :value="1">Hoạt động</option>
                <option :value="0">Ngừng hoạt động</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: Address Listing & Management -->
      <section class="lg:col-span-2 bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30 p-gutter space-y-4 flex flex-col">
        <h3 class="font-bold text-on-surface border-b border-outline-variant/10 pb-2">
          Danh sách địa chỉ
        </h3>

        <!-- Addresses List Container -->
        <div class="flex-1 space-y-4">
          <div v-if="diaChiList.length === 0" class="py-12 text-center border-2 border-dashed border-outline-variant/30 rounded-lg flex flex-col items-center justify-center gap-2">
            <span class="material-symbols-outlined text-outline text-5xl">home_pin</span>
            <p class="text-sm font-semibold text-on-surface-variant">Chưa có địa chỉ nào được đăng ký.</p>
            <p class="text-xs text-on-surface-variant/70">Bấm nút bên dưới để thêm địa chỉ nhận hàng của khách.</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              v-for="(item, index) in diaChiList" 
              :key="item.id"
              class="p-gutter border rounded-lg hover:shadow-sm transition-all flex flex-col justify-between space-y-3 bg-white"
              :class="item.kieuDiaChiLaMacDinh ? 'border-primary-container/60 shadow-sm' : 'border-outline-variant/45'"
            >
              <div class="flex items-start justify-between">
                <div>
                  <span class="text-sm font-bold text-on-surface">Địa chỉ {{ index + 1 }}</span>
                  <span 
                    v-if="item.kieuDiaChiLaMacDinh" 
                    class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DEF7EC] text-[#03543F]"
                  >
                    Mặc định
                  </span>
                </div>

                <!-- Action Toolbar Icons -->
                <div class="flex items-center gap-2 text-on-surface-variant">
                  <!-- Set Default star -->
                  <button 
                    @click="setDefaultAddress(index)"
                    class="hover:text-amber-500 transition-colors cursor-pointer"
                    :title="item.kieuDiaChiLaMacDinh ? 'Địa chỉ mặc định' : 'Đặt làm mặc định'"
                  >
                    <span 
                      class="material-symbols-outlined text-[20px] transition-all"
                      :style="item.kieuDiaChiLaMacDinh ? 'font-variation-settings: \'FILL\' 1; color: #ffb300;' : ''"
                    >
                      star
                    </span>
                  </button>

                  <!-- Edit pencil -->
                  <button 
                    @click="openEditAddressModal(item, index)"
                    class="hover:text-primary-container transition-colors cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                  </button>

                  <!-- Delete trash -->
                  <button 
                    @click="deleteAddress(index)"
                    class="hover:text-error transition-colors cursor-pointer"
                    title="Xóa địa chỉ"
                  >
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>

              <!-- Content values -->
              <div class="space-y-1 text-sm font-body-md">
                <div class="grid grid-cols-3 gap-2">
                  <span class="text-on-surface-variant font-semibold">Tên người nhận:</span>
                  <span class="col-span-2 text-on-surface font-semibold truncate">{{ item.tenNguoiNhan }}</span>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <span class="text-on-surface-variant font-semibold">SĐT:</span>
                  <span class="col-span-2 text-on-surface font-semibold">{{ item.sdtNguoiNhan || item.sdt }}</span>
                </div>
                <div class="pt-2 border-t border-outline-variant/10 text-on-surface-variant leading-relaxed">
                  <p class="font-semibold text-xs text-on-surface mb-0.5">Địa chỉ</p>
                  {{ getFullAddressText(item) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Address Button Trigger -->
        <div class="pt-4 border-t border-outline-variant/15 flex justify-start">
          <button 
            @click="openAddAddressModal"
            class="px-4 py-2 border border-outline-variant rounded-lg text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container-low transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">add</span>
            Thêm địa chỉ
          </button>
        </div>
      </section>
    </div>
  </div>

  <!-- Add / Edit Address Dialog Modal -->
  <div v-if="addressModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary-container text-2xl" style="font-variation-settings: 'FILL' 1;">location_on</span>
          <h3 class="font-headline-md text-base font-bold text-gray-800">
            {{ addressModal.isEditAddress ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới' }}
          </h3>
        </div>
        <button @click="addressModal.show = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="p-6 space-y-4 font-body-md text-body-md">
        <!-- Tên người nhận -->
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-gray-600">Tên người nhận <span class="text-red-500">*</span></label>
          <input 
            type="text" 
            v-model="addressModal.form.tenNguoiNhan" 
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs"
            placeholder="Nhập tên người nhận"
            required
          />
        </div>

        <!-- Số điện thoại -->
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-gray-600">Số điện thoại người nhận <span class="text-red-500">*</span></label>
          <input 
            type="text" 
            v-model="addressModal.form.sdt" 
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs"
            placeholder="VD: 0901234567"
            required
          />
        </div>

        <!-- Tỉnh / Huyện -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-gray-600">Thành phố/Tỉnh <span class="text-red-500">*</span></label>
            <div class="relative">
              <select 
                v-model="addressModal.form.selectedProvince"
                @change="onProvinceChange"
                class="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs cursor-pointer"
              >
                <option value="">Chọn hoặc nhập tỉnh/thành</option>
                <option v-for="prov in provinces" :key="prov.code" :value="prov.name">{{ prov.name }}</option>
              </select>
              <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[18px]">expand_more</span>
            </div>
          </div>
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-gray-600">Quận/Huyện <span class="text-red-500">*</span></label>
            <div class="relative">
              <select 
                v-model="addressModal.form.selectedDistrict"
                @change="onDistrictChange"
                :disabled="!addressModal.form.selectedProvince"
                class="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="">Chọn hoặc nhập quận/huyện</option>
                <option v-for="dist in districts" :key="dist.code" :value="dist.name">{{ dist.name }}</option>
              </select>
              <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[18px]">expand_more</span>
            </div>
          </div>
        </div>

        <!-- Phường / Xã -->
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-gray-600">Phường/Xã <span class="text-red-500">*</span></label>
          <div class="relative">
            <select 
              v-model="addressModal.form.selectedWard"
              :disabled="!addressModal.form.selectedDistrict"
              class="w-full appearance-none px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              <option value="">Chọn hoặc nhập phường/xã</option>
              <option v-for="wd in wards" :key="wd.code" :value="wd.name">{{ wd.name }}</option>
            </select>
            <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[18px]">expand_more</span>
          </div>
        </div>

        <!-- Địa chỉ cụ thể -->
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-gray-600">Địa chỉ cụ thể <span class="text-red-500">*</span></label>
          <input 
            type="text" 
            v-model="addressModal.form.diaChiCuThe" 
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container text-xs"
            placeholder="Số nhà, đường..."
            required
          />
        </div>
      </div>

      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button 
          type="button" 
          @click="addressModal.show = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Hủy bộ
        </button>
        <button 
          type="button" 
          @click="saveAddress"
          class="bg-primary-container hover:bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
        >
          Xác nhận
        </button>
      </div>
    </div>
  </div>

  <!-- Custom Confirmation Modal -->
  <div v-if="confirmModal.show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl animate-fade-in">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span class="material-symbols-outlined text-primary-container text-2xl">help_outline</span>
        <h3 class="font-headline-md text-base font-bold text-gray-800">{{ confirmModal.title }}</h3>
      </div>
      <div class="p-6 text-sm font-medium text-gray-600 font-body-md leading-relaxed font-semibold">
        {{ confirmModal.message }}
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button 
          type="button" 
          @click="confirmModal.show = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Hủy bộ
        </button>
        <button 
          type="button" 
          @click="handleConfirm"
          class="bg-primary-container hover:bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
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
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
</style>
