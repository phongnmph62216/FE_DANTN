<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Cart items from local storage
const cartItems = ref([])

const loadCart = () => {
  cartItems.value = JSON.parse(localStorage.getItem('bee_cart') || '[]')
}

// Checkout Form Data
const fullName = ref('')
const email = ref('')
const phone = ref('')
const selectedCity = ref('')
const selectedDistrict = ref('')
const selectedWard = ref('')
const address = ref('')
const notes = ref('')

const paymentMethod = ref('COD')
const voucherCode = ref('')
const discountAmount = ref(0)
const appliedVoucher = ref(null)
const voucherError = ref('')
const voucherSuccess = ref('')
const orderNumber = ref('')

// Payment steps: 'checkout', 'success'
const checkoutStep = ref('checkout')
const isSubmitted = computed(() => checkoutStep.value === 'success')
const isProcessingPayment = ref(false)
const paymentError = ref('')

// Location API states
const GHN_TOKEN = import.meta.env.VITE_GHN_TOKEN || '5b12da61-9e79-11ed-b190-ea4f04c0aa0e'
const GHN_SHOP_ID = import.meta.env.VITE_GHN_SHOP_ID || '123456'
const GHN_SENDER_DISTRICT_ID = Number(import.meta.env.VITE_GHN_SENDER_DISTRICT_ID || 1454)

const citiesList = ref([])
const districtsList = ref([])
const wardsList = ref([])
const calculatedShippingFee = ref(30000)

const fetchProvinces = async () => {
  try {
    const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province', {
      headers: { 'Token': GHN_TOKEN }
    })
    const json = await res.json()
    if (json.code === 200 && json.data) {
      citiesList.value = json.data.map(p => ({
        name: p.ProvinceName,
        code: p.ProvinceID
      })).sort((a, b) => a.name.localeCompare(b.name))
      return
    }
  } catch (err) {
    console.warn('Failed to fetch GHN provinces, falling back:', err)
  }

  try {
    const res = await fetch('https://provinces.open-api.vn/api/p/')
    const data = await res.json()
    citiesList.value = data || []
  } catch (err) {
    console.error('Failed to fetch provinces:', err)
  }
}

const normalizeLocationName = (name) => {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/^(tỉnh|thành phố|thành phó|tp\.|tp|t\.p\.|quận|huyện|thị xã|phường|xã|thị trấn|q\.|h\.|p\.|x\.)\s*/i, '')
    .trim()
}

const onCityChange = async () => {
  selectedDistrict.value = ''
  selectedWard.value = ''
  districtsList.value = []
  wardsList.value = []
  calculatedShippingFee.value = 30000

  if (!selectedCity.value) return

  const normCity = normalizeLocationName(selectedCity.value)
  const provObj = citiesList.value.find(p => normalizeLocationName(p.name) === normCity)
  if (!provObj) return

  try {
    const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': GHN_TOKEN
      },
      body: JSON.stringify({ province_id: Number(provObj.code) })
    })
    const json = await res.json()
    if (json.code === 200 && json.data) {
      districtsList.value = json.data.map(d => ({
        name: d.DistrictName,
        code: d.DistrictID
      })).sort((a, b) => a.name.localeCompare(b.name))
      return
    }
  } catch (err) {
    console.warn('Failed to fetch districts, falling back:', err)
  }

  try {
    const res = await fetch(`https://provinces.open-api.vn/api/p/${provObj.code}?depth=2`)
    const data = await res.json()
    districtsList.value = data.districts || []
  } catch (err) {
    console.error('Failed to fetch districts:', err)
  }
}

const onDistrictChange = async () => {
  selectedWard.value = ''
  wardsList.value = []
  calculatedShippingFee.value = 30000

  if (!selectedDistrict.value) return

  const normDistrict = normalizeLocationName(selectedDistrict.value)
  const distObj = districtsList.value.find(d => normalizeLocationName(d.name) === normDistrict)
  if (!distObj) return

  try {
    const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': GHN_TOKEN
      },
      body: JSON.stringify({ district_id: Number(distObj.code) })
    })
    const json = await res.json()
    if (json.code === 200 && json.data) {
      wardsList.value = json.data.map(w => ({
        name: w.WardName,
        code: w.WardCode
      })).sort((a, b) => a.name.localeCompare(b.name))
      return
    }
  } catch (err) {
    console.warn('Failed to fetch wards, falling back:', err)
  }

  try {
    const res = await fetch(`https://provinces.open-api.vn/api/d/${distObj.code}?depth=2`)
    const data = await res.json()
    wardsList.value = data.wards || []
  } catch (err) {
    console.error('Failed to fetch wards:', err)
  }
}

const onWardChange = async () => {
  if (!selectedCity.value || !selectedDistrict.value || !selectedWard.value) return

  const normWard = normalizeLocationName(selectedWard.value)
  const normDistrict = normalizeLocationName(selectedDistrict.value)
  const normCity = normalizeLocationName(selectedCity.value)

  const wardObj = wardsList.value.find(w => normalizeLocationName(w.name) === normWard)
  const distObj = districtsList.value.find(d => normalizeLocationName(d.name) === normDistrict)
  const provObj = citiesList.value.find(p => normalizeLocationName(p.name) === normCity)

  if (wardObj && distObj && provObj) {
    try {
      const body = {
        from_district_id: GHN_SENDER_DISTRICT_ID,
        to_district_id: Number(distObj.code),
        to_ward_code: String(wardObj.code),
        height: 15,
        length: 15,
        weight: 500,
        width: 15,
        service_type_id: 2
      }

      const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Token': GHN_TOKEN,
          'ShopId': Number(GHN_SHOP_ID),
          'shopid': Number(GHN_SHOP_ID)
        },
        body: JSON.stringify(body)
      })

      const json = await res.json()
      if (json.code === 200 && json.data) {
        calculatedShippingFee.value = json.data.total
        return
      }
    } catch (err) {
      console.warn('Failed to calculate GHN fee, falling back:', err)
    }
  }

  calculatedShippingFee.value = Math.max(15000, 20000 + (address.value?.length || 0) * 200)
}

// Financial calculations
const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const shippingFee = computed(() => {
  return subtotal.value >= 399000 ? 0 : calculatedShippingFee.value
})

const totalPayment = computed(() => Math.max(0, subtotal.value + shippingFee.value - discountAmount.value))

const formatCurrency = (val) => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ'
}

// Apply Voucher
const applyVoucher = async () => {
  voucherError.value = ''
  voucherSuccess.value = ''
  discountAmount.value = 0
  appliedVoucher.value = null
  
  if (!voucherCode.value) {
    voucherError.value = 'Vui lòng nhập mã giảm giá'
    return
  }

  try {
    const res = await api.get('/api/v1/phieu-giam-gia', {
      params: {
        keyword: voucherCode.value.trim(),
        trangThai: 1,
        size: 50
      }
    })

    const list = res.data?.content || []
    const found = list.find(v => v.maPhieuGiamGia.toUpperCase() === voucherCode.value.toUpperCase().trim())

    if (!found) {
      voucherError.value = 'Mã giảm giá không hợp lệ hoặc đã hết hạn'
      return
    }

    if (subtotal.value < found.dieuKienGiam) {
      voucherError.value = `Đơn hàng chưa đạt điều kiện tối thiểu ${formatCurrency(found.dieuKienGiam)}!`
      return
    }

    if (found.soLuong <= found.soLuongDaDung) {
      voucherError.value = 'Mã giảm giá đã hết số lượng sử dụng!'
      return
    }

    appliedVoucher.value = found
    calculateDiscount()
    voucherSuccess.value = `Áp dụng mã ${found.maPhieuGiamGia} thành công: ${found.tenPhieuGiamGia}`
  } catch (error) {
    console.error('Failed to validate voucher:', error)
    voucherError.value = 'Lỗi kiểm tra mã giảm giá'
  }
}

const calculateDiscount = () => {
  if (!appliedVoucher.value) {
    discountAmount.value = 0
    return
  }
  const found = appliedVoucher.value
  let disc = 0
  if (found.loaiGiam === 0) { // %
    disc = subtotal.value * (found.giaTri / 100)
    if (found.giaGiamToiDa && disc > found.giaGiamToiDa) {
      disc = found.giaGiamToiDa
    }
  } else { // Cash
    disc = found.giaTri
  }
  if (disc > subtotal.value) {
    disc = subtotal.value
  }
  discountAmount.value = Math.floor(disc)
}

const errors = ref({
  fullName: '',
  email: '',
  phone: '',
  selectedCity: '',
  selectedDistrict: '',
  selectedWard: '',
  address: ''
})

const validateForm = () => {
  let isValid = true
  
  errors.value = {
    fullName: '',
    email: '',
    phone: '',
    selectedCity: '',
    selectedDistrict: '',
    selectedWard: '',
    address: ''
  }

  if (!fullName.value.trim()) {
    errors.value.fullName = 'Vui lòng nhập họ tên của bạn'
    isValid = false
  }

  if (!email.value.trim()) {
    errors.value.email = 'Vui lòng nhập email của bạn'
    isValid = false
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.value.trim())) {
      errors.value.email = 'Email không đúng định dạng'
      isValid = false
    }
  }

  if (!phone.value.trim()) {
    errors.value.phone = 'Vui lòng nhập SĐT của bạn'
    isValid = false
  } else {
    const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
    if (!phoneRegex.test(phone.value.trim())) {
      errors.value.phone = 'Số điện thoại không đúng định dạng'
      isValid = false
    }
  }

  if (!selectedCity.value) {
    errors.value.selectedCity = 'Vui lòng chọn tỉnh / thành phố của bạn'
    isValid = false
  }

  if (!selectedDistrict.value) {
    errors.value.selectedDistrict = 'Vui lòng chọn quận / huyện của bạn'
    isValid = false
  }

  if (!selectedWard.value) {
    errors.value.selectedWard = 'Vui lòng chọn phường / xã của bạn'
    isValid = false
  }

  if (!address.value.trim()) {
    errors.value.address = 'Vui lòng nhập địa chỉ của bạn'
    isValid = false
  }

  return isValid
}

// Handle Order Submission
const submitOrder = async (e) => {
  e.preventDefault()
  paymentError.value = ''
  isProcessingPayment.value = true
  
  if (!validateForm()) {
    isProcessingPayment.value = false
    return
  }

  if (cartItems.value.length === 0) {
    alert('Giỏ hàng của bạn đang trống!')
    isProcessingPayment.value = false
    return
  }

  try {
    // 1. Tạo đơn hàng chờ loaiHoaDon = 2 (Online)
    const orderRes = await api.post('/api/v1/ban-hang/tao-don?loaiHoaDon=2')
    const newOrder = orderRes.data
    const orderId = newOrder.id
    orderNumber.value = newOrder.maHoaDon

    // 2. Thêm từng sản phẩm trong giỏ hàng vào đơn hàng
    for (const item of cartItems.value) {
      await api.post(`/api/v1/ban-hang/don-hang/${orderId}/them-san-pham`, {
        idChiTietSanPham: item.variantId,
        soLuong: item.quantity
      })
    }

    // 3. Cập nhật thông tin giao nhận hàng
    const fullAddress = `${address.value.trim()}, ${selectedWard.value}, ${selectedDistrict.value}, ${selectedCity.value}`
    await api.put(`/api/v1/ban-hang/${orderId}/thong-tin-nhan-hang`, {
      idKhachHang: authStore.user?.id || null,
      isGiaoHang: true,
      tenNguoiNhan: fullName.value.trim(),
      sdtNguoiNhan: phone.value.trim(),
      email: email.value.trim(),
      diaChiChiTiet: fullAddress,
      phiVanChuyen: shippingFee.value
    })

    // 4. Áp dụng voucher nếu có
    if (appliedVoucher.value) {
      await api.post(`/api/v1/ban-hang/don-hang/${orderId}/voucher`, {
        maPhieuGiamGia: appliedVoucher.value.maPhieuGiamGia
      })
    }

    // 5. Tiến hành thanh toán
    if (paymentMethod.value === 'VNPAY') {
      // Lấy thông tin hóa đơn mới nhất từ DB để lấy đúng tổng tiền đã tính phí vận chuyển/giảm giá trên BE
      const finalOrderRes = await api.get(`/api/v1/ban-hang/don-hang/${orderId}`)
      const finalAmount = finalOrderRes.data.tongTienThanhToan || totalPayment.value

      const response = await api.post('/api/v1/vnpay/create-payment', {
        amount: finalAmount,
        orderInfo: 'Thanh toan don hang ' + orderNumber.value,
        orderId: orderNumber.value
      })
      const paymentUrl = response.data.paymentUrl
      window.location.href = paymentUrl
    } else {
      // COD Flow: chốt thanh toán với tiền khách trả = 0, chuyển sang status 1 (Đã xác nhận)
      await api.post(`/api/v1/ban-hang/${orderId}/thanh-toan`, {
        tienMat: 0,
        tienChuyenKhoan: 0,
        ghiChu: notes.value.trim()
      })
      checkoutStep.value = 'success'
      localStorage.removeItem('bee_cart')
    }
  } catch (error) {
    console.error('Checkout error:', error)
    paymentError.value = error.response?.data?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.'
    isProcessingPayment.value = false
  }
}

// Saved addresses from DB for logged in customer
const customerAddresses = ref([])
const selectedSavedAddressId = ref(null)

const selectSavedAddress = async (addr) => {
  fullName.value = addr.tenNguoiNhan || ''
  phone.value = addr.sdtNguoiNhan || ''
  address.value = addr.diaChiCuThe || ''
  
  // Set City
  const normCity = normalizeLocationName(addr.tinhThanhPho)
  const cityObj = citiesList.value.find(c => normalizeLocationName(c.name) === normCity)
  if (cityObj) {
    selectedCity.value = cityObj.name
  } else {
    selectedCity.value = addr.tinhThanhPho || ''
  }
  await onCityChange()
  
  // Set District
  const normDistrict = normalizeLocationName(addr.quanHuyen)
  const distObj = districtsList.value.find(d => normalizeLocationName(d.name) === normDistrict)
  if (distObj) {
    selectedDistrict.value = distObj.name
  } else {
    selectedDistrict.value = addr.quanHuyen || ''
  }
  await onDistrictChange()
  
  // Set Ward
  const normWard = normalizeLocationName(addr.phuongXa)
  const wardObj = wardsList.value.find(w => normalizeLocationName(w.name) === normWard)
  if (wardObj) {
    selectedWard.value = wardObj.name
  } else {
    selectedWard.value = addr.phuongXa || ''
  }
  await onWardChange()
}

const loadCustomerAddresses = async () => {
  if (authStore.user?.id) {
    try {
      const response = await api.get(`/api/v1/khach-hang/${authStore.user.id}`)
      const data = response.data
      if (data && data.danhSachDiaChi) {
        customerAddresses.value = data.danhSachDiaChi
        
        // Find default address
        const defaultAddr = data.danhSachDiaChi.find(a => a.kieuDiaChiLaMacDinh)
        if (defaultAddr) {
          selectedSavedAddressId.value = defaultAddr.id
          await selectSavedAddress(defaultAddr)
        } else if (data.danhSachDiaChi.length > 0) {
          selectedSavedAddressId.value = data.danhSachDiaChi[0].id
          await selectSavedAddress(data.danhSachDiaChi[0])
        }
      }
    } catch (error) {
      console.error('Failed to load customer addresses:', error)
    }
  }
}

const handleSelectAddress = async (addr) => {
  selectedSavedAddressId.value = addr.id
  await selectSavedAddress(addr)
}

const clearAddressForm = () => {
  selectedSavedAddressId.value = null
  fullName.value = ''
  phone.value = ''
  selectedCity.value = ''
  selectedDistrict.value = ''
  selectedWard.value = ''
  address.value = ''
  calculatedShippingFee.value = 30000
}

// Vouchers selection modal
const activeVouchers = ref([])
const showVoucherModal = ref(false)

const fetchActiveVouchers = async () => {
  try {
    const res = await api.get('/api/v1/phieu-giam-gia', {
      params: { trangThai: 1, page: 0, size: 100 }
    })
    activeVouchers.value = res.data?.content || []
  } catch (err) {
    console.error('Failed to load active vouchers:', err)
  }
}

const openVoucherModal = async () => {
  await fetchActiveVouchers()
  showVoucherModal.value = true
}

const selectVoucherFromModal = (v) => {
  voucherCode.value = v.maPhieuGiamGia
  applyVoucher()
  showVoucherModal.value = false
}

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    alert('Vui lòng đăng nhập tài khoản khách hàng để tiến hành mua hàng online.')
    router.push('/auth')
    return
  }

  // Pre-populate details from logged in user
  fullName.value = authStore.user?.hoTen || ''
  email.value = authStore.user?.email || ''
  phone.value = authStore.user?.sdt || ''

  loadCart()
  await fetchProvinces()
  await loadCustomerAddresses()
})
</script>

<template>
  <main class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-section-gap">
    <!-- Stepper -->
    <div class="flex justify-center items-center mb-10 gap-4 overflow-x-auto whitespace-nowrap pb-4">
      <RouterLink to="/cart" class="flex items-center gap-2 text-on-surface hover:text-[#ef972d] transition-colors">
        <span class="material-symbols-outlined">shopping_bag</span>
        <span class="font-title-md uppercase tracking-wide text-sm">GIỎ HÀNG</span>
      </RouterLink>
      <div class="w-8 md:w-16 border-t-2 border-dashed border-outline-variant"></div>
      <div class="flex items-center gap-2" :class="isSubmitted ? 'text-on-surface' : 'text-[#ef972d]'">
        <span class="material-symbols-outlined">inventory_2</span>
        <span class="font-title-md uppercase tracking-wide text-sm" :class="!isSubmitted && 'font-bold'">ĐẶT HÀNG</span>
      </div>
      <div class="w-8 md:w-16 border-t-2 border-dashed border-outline-variant"></div>
      <div class="flex items-center gap-2" :class="isSubmitted ? 'text-[#ef972d]' : 'text-on-surface-variant/60'">
        <span class="material-symbols-outlined" :class="isSubmitted && 'fill'">task_alt</span>
        <span class="font-title-md uppercase tracking-wide text-sm" :class="isSubmitted && 'font-bold'">HOÀN THÀNH ĐƠN HÀNG</span>
      </div>
    </div>

    <!-- Success View -->
    <div v-if="checkoutStep === 'success'" class="bg-surface-container-lowest p-8 md:p-12 rounded shadow-sm border border-outline-variant/30 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
      <span class="material-symbols-outlined text-[72px] text-green-500" style="font-variation-settings: 'FILL' 1;">check_circle</span>
      <h2 class="text-headline-lg font-headline-lg text-[#ef972d] font-bold">ĐẶT HÀNG THÀNH CÔNG!</h2>
      <p class="text-body-lg text-on-surface">
        Cảm ơn <span class="font-bold text-[#ef972d]">{{ fullName }}</span> đã tin tưởng mua sắm tại Bee Stylish.<br/>
        Mã đơn hàng của bạn là: <span class="font-bold text-on-surface text-lg underline">{{ orderNumber }}</span>
      </p>
      
      <div class="w-full text-left bg-surface-container-low p-6 rounded border border-outline-variant/30 flex flex-col gap-3 text-sm">
        <h3 class="font-bold text-on-surface border-b border-outline-variant/30 pb-2 mb-1">THÔNG TIN GIAO HÀNG</h3>
        <div>Họ và tên: <span class="font-semibold text-on-surface">{{ fullName }}</span></div>
        <div>Số điện thoại: <span class="font-semibold text-on-surface">{{ phone }}</span></div>
        <div>Địa chỉ: <span class="font-semibold text-on-surface">{{ address }}, {{ selectedWard || '' }} {{ selectedDistrict }}, {{ selectedCity }}</span></div>
        <div>Phương thức: <span class="font-semibold text-on-surface">{{ paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán online (VNPAY)' }}</span></div>
        <div>Tổng thanh toán: <span class="font-semibold text-[#ef972d] font-bold text-base">{{ formatCurrency(totalPayment) }}</span></div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
        <RouterLink to="/" class="bg-[#ef972d] hover:bg-[#d88523] text-white font-label-sm uppercase px-8 py-3 rounded transition-colors text-center tracking-wider">
          TIẾP TỤC MUA SẮM
        </RouterLink>
      </div>
    </div>

    <!-- VNPAY Payment Processing Overlay -->
    <div v-else-if="isProcessingPayment" class="bg-surface-container-lowest p-8 md:p-12 rounded shadow-sm border border-outline-variant/30 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
      <div class="w-16 h-16 border-4 border-t-[#ef972d] border-slate-200 rounded-full animate-spin"></div>
      <h2 class="text-headline-lg font-headline-lg text-on-surface font-bold">Đang chuyển đến cổng thanh toán...</h2>
      <p class="text-body-lg text-on-surface-variant">
        Vui lòng đợi, bạn sẽ được chuyển đến trang thanh toán VNPAY.
      </p>
    </div>

    <!-- Payment Error -->
    <div v-else-if="paymentError" class="bg-surface-container-lowest p-8 md:p-12 rounded shadow-sm border border-outline-variant/30 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
      <span class="material-symbols-outlined text-[72px] text-red-500" style="font-variation-settings: 'FILL' 1;">error</span>
      <h2 class="text-headline-lg font-headline-lg text-red-500 font-bold">LỖI THANH TOÁN!</h2>
      <p class="text-body-lg text-on-surface">{{ paymentError }}</p>
      <button @click="paymentError = ''" class="bg-[#ef972d] hover:bg-[#d88523] text-white font-label-sm uppercase px-8 py-3 rounded transition-colors text-center tracking-wider">
        THỬ LẠI
      </button>
    </div>

    <!-- Main Content -->
    <form v-else @submit="submitOrder" class="flex flex-col lg:flex-row gap-gutter md:gap-8 items-start">
      <!-- Left Column: Forms -->
      <div class="w-full lg:w-[65%] flex flex-col gap-6">
        <!-- Shipping Address Card -->
        <div class="bg-surface-container-lowest p-6 rounded shadow-sm border border-outline-variant/30">
          <div class="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-4">
            <h2 class="flex items-center gap-2 font-title-md text-on-surface font-bold">
              <span class="material-symbols-outlined text-[#ef972d]">location_on</span>
              ĐỊA CHỈ GIAO HÀNG
            </h2>
          </div>

          <!-- Saved Addresses Block -->
          <div v-if="customerAddresses.length > 0" class="mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h3 class="font-bold text-sm text-slate-700 mb-3 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[#ef972d] text-[20px]">import_contacts</span>
              Sổ địa chỉ của bạn:
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                v-for="addr in customerAddresses" 
                :key="addr.id" 
                @click="handleSelectAddress(addr)"
                :class="[
                  'p-3 rounded border cursor-pointer transition-all relative flex flex-col justify-between min-h-[100px]',
                  selectedSavedAddressId === addr.id
                    ? 'border-[#ef972d] bg-[#ef972d]/5 shadow-sm'
                    : 'border-slate-300 bg-white hover:border-[#ef972d]/70'
                ]"
              >
                <div>
                  <div class="font-bold text-slate-800 text-sm flex items-center justify-between gap-2">
                    <span>{{ addr.tenNguoiNhan }}</span>
                    <span v-if="addr.kieuDiaChiLaMacDinh" class="text-[9px] bg-[#ef972d] text-white px-1 py-0.5 rounded font-normal uppercase whitespace-nowrap">Mặc định</span>
                  </div>
                  <div class="text-xs text-slate-600 mt-1">SĐT: {{ addr.sdtNguoiNhan }}</div>
                  <div class="text-xs text-slate-500 mt-1 line-clamp-2">{{ addr.diaChiCuThe }}, {{ addr.phuongXa }}, {{ addr.quanHuyen }}, {{ addr.tinhThanhPho }}</div>
                </div>
              </div>
              
              <!-- Option to enter another address -->
              <div 
                @click="clearAddressForm"
                :class="[
                  'p-3 rounded border border-dashed cursor-pointer transition-all flex flex-col justify-center items-center text-slate-500 bg-white min-h-[100px]',
                  selectedSavedAddressId === null
                    ? 'border-[#ef972d] bg-[#ef972d]/5 text-[#ef972d]'
                    : 'border-slate-300 hover:border-[#ef972d]/70 hover:text-[#ef972d]'
                ]"
              >
                <span class="material-symbols-outlined text-2xl mb-1">add_location_alt</span>
                <span class="text-xs font-bold">Nhập địa chỉ khác</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">HỌ TÊN <span class="text-error">*</span></label>
                <input v-model="fullName" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Nhập họ tên của bạn" type="text"/>
                <p v-if="errors.fullName" class="text-red-500 text-xs mt-0.5 font-semibold">{{ errors.fullName }}</p>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">EMAIL <span class="text-error">*</span></label>
                <input v-model="email" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Nhập email của bạn" type="email"/>
                <p v-if="errors.email" class="text-red-500 text-xs mt-0.5 font-semibold">{{ errors.email }}</p>
              </div>
            </div>

            <div class="flex flex-col gap-1 w-full md:w-1/2 md:pr-2">
              <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">SĐT <span class="text-error">*</span></label>
              <input v-model="phone" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Nhập số điện thoại" type="tel"/>
              <p v-if="errors.phone" class="text-red-500 text-xs mt-0.5 font-semibold">{{ errors.phone }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">TỈNH / THÀNH PHỐ <span class="text-error">*</span></label>
                <select v-model="selectedCity" @change="onCityChange" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-on-surface-variant">
                  <option value="">Chọn tỉnh / thành phố</option>
                  <option v-for="c in citiesList" :key="c.code" :value="c.name">{{ c.name }}</option>
                </select>
                <p v-if="errors.selectedCity" class="text-red-500 text-xs mt-0.5 font-semibold">{{ errors.selectedCity }}</p>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">QUẬN / HUYỆN <span class="text-error">*</span></label>
                <select v-model="selectedDistrict" @change="onDistrictChange" :disabled="!selectedCity" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-on-surface-variant disabled:opacity-50">
                  <option value="">Chọn quận huyện</option>
                  <option v-for="d in districtsList" :key="d.code" :value="d.name">{{ d.name }}</option>
                </select>
                <p v-if="errors.selectedDistrict" class="text-red-500 text-xs mt-0.5 font-semibold">{{ errors.selectedDistrict }}</p>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">PHƯỜNG / XÃ <span class="text-error">*</span></label>
                <select v-model="selectedWard" @change="onWardChange" :disabled="!selectedDistrict" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-on-surface-variant disabled:opacity-50">
                  <option value="">Chọn phường xã</option>
                  <option v-for="w in wardsList" :key="w.code" :value="w.name">{{ w.name }}</option>
                </select>
                <p v-if="errors.selectedWard" class="text-red-500 text-xs mt-0.5 font-semibold">{{ errors.selectedWard }}</p>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">ĐỊA CHỈ <span class="text-error">*</span></label>
              <input v-model="address" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Nhập địa chỉ của bạn" type="text"/>
              <p v-if="errors.address" class="text-red-500 text-xs mt-0.5 font-semibold">{{ errors.address }}</p>
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">GHI CHÚ</label>
              <textarea v-model="notes" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none" placeholder="Nhập ghi chú của bạn (nếu có)" rows="3"></textarea>
            </div>
          </div>
        </div>

        <!-- Payment Method Card -->
        <div class="bg-surface-container-lowest p-6 rounded shadow-sm border border-outline-variant/30">
          <div class="mb-4 pb-4 border-b border-outline-variant/30">
            <h2 class="flex items-center gap-2 font-title-md text-on-surface font-bold">
              <span class="material-symbols-outlined text-[#ef972d]">payments</span>
              PHƯƠNG THỨC THANH TOÁN
            </h2>
          </div>
          <div class="flex flex-col gap-4">
            <label class="flex items-center gap-3 cursor-pointer group">
              <input v-model="paymentMethod" value="COD" class="text-[#ef972d] focus:ring-[#ef972d] border-outline-variant h-4 w-4" name="payment_method" type="radio"/>
              <span class="text-body-md text-on-surface group-hover:text-[#ef972d] transition-colors">Thanh toán khi nhận hàng (COD)</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer group">
              <input v-model="paymentMethod" value="VNPAY" class="text-[#ef972d] focus:ring-[#ef972d] border-outline-variant h-4 w-4" name="payment_method" type="radio"/>
              <span class="text-body-md text-on-surface group-hover:text-[#ef972d] transition-colors">Thẻ ATM/Visa/Master/JCB/QR Pay qua VNPAY-QR</span>
            </label>
          </div>
        </div>

        <!-- Cart Summary -->
        <div class="bg-surface-container-lowest p-6 rounded shadow-sm border border-outline-variant/30 mb-8 lg:mb-0">
          <div class="mb-4 pb-4 border-b border-outline-variant/30">
            <h2 class="font-title-md text-on-surface uppercase font-bold">
              GIỎ HÀNG <span class="text-[#ef972d] font-normal text-sm lowercase">({{ cartItems.length }}) sản phẩm</span>
            </h2>
          </div>
          <div class="w-full overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr class="border-b border-outline-variant/30 text-on-surface-variant font-label-sm font-bold">
                  <th class="py-3 px-2 w-[40%]">Tên Hàng</th>
                  <th class="py-3 px-2">Giá</th>
                  <th class="py-3 px-2 text-center">Số Lượng</th>
                  <th class="py-3 px-2 text-right">Tổng Tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in cartItems" :key="item.variantId" class="border-b border-outline-variant/10">
                  <td class="py-4 px-2">
                    <div class="flex items-start gap-4">
                      <div class="w-20 h-24 bg-surface-container-high rounded overflow-hidden flex-shrink-0">
                        <img class="w-full h-full object-cover" :src="item.image" alt="Product image"/>
                      </div>
                      <div class="flex flex-col justify-center h-full gap-1">
                        <span class="font-body-md text-on-surface font-semibold uppercase">{{ item.productName }}</span>
                        <span class="text-xs text-outline">Mã SP: {{ item.productCode }}</span>
                        <span class="text-sm text-on-surface-variant mt-2">Kích thước: <strong>Size {{ item.size }}</strong></span>
                        <span class="text-sm text-on-surface-variant">Màu Sắc: <strong>{{ item.color }}</strong></span>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-2 align-middle">
                    <div class="flex flex-col">
                      <span class="font-bold text-[#ef972d]">{{ formatCurrency(item.price) }}</span>
                      <span v-if="item.originalPrice > item.price" class="text-sm text-on-surface-variant/60 line-through">{{ formatCurrency(item.originalPrice) }}</span>
                    </div>
                  </td>
                  <td class="py-4 px-2 align-middle text-center font-body-md">{{ item.quantity }}</td>
                  <td class="py-4 px-2 align-middle text-right font-bold text-on-surface">{{ formatCurrency(item.price * item.quantity) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Column: Order Summary (Sticky) -->
      <div class="w-full lg:w-[35%] lg:sticky lg:top-24">
        <div class="bg-surface-container-lowest p-6 rounded shadow-sm border border-outline-variant/30 flex flex-col gap-6">
          <h2 class="font-title-md text-on-surface uppercase mb-6 border-b border-outline-variant/30 pb-4 font-bold">ĐƠN HÀNG</h2>
          <div class="flex flex-col gap-4">
            <!-- Voucher -->
            <div class="flex flex-col gap-2">
              <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">MÃ PHIẾU GIẢM GIÁ</label>
              <div class="flex w-full">
                <input v-model="voucherCode" class="flex-grow border border-outline-variant rounded-l p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors border-r-0" placeholder="Nhập mã giảm giá..." type="text"/>
                <button type="button" @click="applyVoucher" class="bg-[#ef972d] hover:bg-[#d88523] text-white font-label-sm uppercase px-4 py-3 rounded-r transition-colors focus:outline-none font-bold">ÁP DỤNG</button>
              </div>
              <button 
                type="button" 
                @click="openVoucherModal" 
                class="text-xs text-[#ef972d] hover:text-[#d88523] font-bold flex items-center gap-1 self-start mt-1 transition-colors"
              >
                <span class="material-symbols-outlined text-[16px]">confirmation_number</span>
                Chọn từ danh sách phiếu giảm giá
              </button>
              <p v-if="voucherError" class="text-error text-xs mt-1 font-semibold text-red-500">{{ voucherError }}</p>
              <p v-if="voucherSuccess" class="text-green-600 text-xs mt-1 font-semibold text-emerald-600">{{ voucherSuccess }}</p>
            </div>

            <div class="border-t-4 border-dotted border-outline-variant/50 my-2"></div>

            <!-- Price Breakdown -->
            <div class="flex flex-col gap-3 font-body-md text-on-surface-variant">
              <div class="flex justify-between">
                <span>Tạm tính</span>
                <span class="font-semibold text-on-surface">{{ formatCurrency(subtotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Phí vận chuyển</span>
                <span class="font-semibold text-on-surface">{{ formatCurrency(shippingFee) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Mã giảm giá</span>
                <span class="font-semibold text-on-surface">-{{ formatCurrency(discountAmount) }}</span>
              </div>
            </div>

            <div class="border-t border-dashed border-outline-variant/50 my-2"></div>

            <!-- Total -->
            <div class="flex justify-between items-end mb-4">
              <span class="font-body-md text-on-surface-variant">Tổng thanh toán</span>
              <span class="font-headline-lg font-bold text-[#ef972d]">{{ formatCurrency(totalPayment) }}</span>
            </div>

            <div class="border-t border-dashed border-outline-variant/50 mb-4"></div>

            <!-- Trust Badge -->
            <div class="bg-surface-container-low p-4 rounded text-sm text-center mb-6 text-on-surface-variant leading-relaxed">
              <p>An tâm mua sắm hàng chính hãng tại <span class="text-[#ef972d] font-semibold">BeeStylish.vn</span></p>
              <p>Được kiểm tra hàng trước khi thanh toán &amp; hài lòng</p>
              <p>Được đổi hàng trong 15 ngày theo chính sách (*)</p>
            </div>

            <!-- Checkout Button -->
            <button type="submit" class="w-full bg-[#ef972d] hover:bg-[#d88523] text-white font-title-md py-4 rounded transition-colors uppercase tracking-wider mb-2 shadow-sm focus:outline-none font-bold">
              ĐẶT HÀNG
            </button>
            
            <p class="text-xs text-[#ef972d] text-center italic flex items-center justify-center gap-1 font-bold">
              <span class="material-symbols-outlined text-[14px]">info</span>
              Nếu đơn hàng không có thay đổi, Bee Stylish sẽ không gọi xác nhận!
            </p>
          </div>
        </div>
      </div>
    </form>

    <!-- Voucher Selection Modal -->
    <div v-if="showVoucherModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col p-6 shadow-xl border border-slate-100">
        <!-- Modal Header -->
        <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[#ef972d]">confirmation_number</span>
            Chọn Phiếu Giảm Giá
          </h3>
          <button @click="showVoucherModal = false" class="text-slate-400 hover:text-slate-600 transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Modal Body: Scrollable Voucher List -->
        <div class="flex-grow overflow-y-auto pr-1 flex flex-col gap-3">
          <div v-if="activeVouchers.length === 0" class="text-slate-500 text-center py-8">
            Hiện không có phiếu giảm giá nào khả dụng.
          </div>
          
          <div 
            v-for="v in activeVouchers" 
            :key="v.id"
            :class="[
              'p-4 rounded-lg border flex flex-col gap-2 relative transition-all',
              subtotal >= v.dieuKienGiam
                ? 'border-slate-200 bg-white hover:border-[#ef972d]/70'
                : 'border-slate-100 bg-slate-50/50 opacity-60'
            ]"
          >
            <!-- Voucher Title and Code -->
            <div class="flex justify-between items-start gap-4">
              <div>
                <span class="font-mono bg-[#ef972d]/10 text-[#ef972d] px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                  {{ v.maPhieuGiamGia }}
                </span>
                <h4 class="font-bold text-slate-800 text-sm mt-1.5">{{ v.tenPhieuGiamGia }}</h4>
              </div>
              
              <!-- Apply Button / Status Badge -->
              <button 
                v-if="subtotal >= v.dieuKienGiam"
                type="button"
                @click="selectVoucherFromModal(v)"
                class="bg-[#ef972d] hover:bg-[#d88523] text-white text-xs font-bold uppercase px-3 py-1.5 rounded transition-colors"
              >
                Áp dụng
              </button>
              <div 
                v-else 
                class="text-[10px] text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded font-semibold whitespace-nowrap"
              >
                Chưa đủ điều kiện
              </div>
            </div>

            <!-- Description -->
            <div class="text-xs text-slate-500 flex flex-col gap-1 mt-1 border-t border-slate-100/80 pt-2">
              <div>• Ưu đãi: 
                <span class="font-bold text-slate-700">
                  {{ v.loaiGiam === 0 ? `Giảm ${v.giaTri}%` : `Giảm ${formatCurrency(v.giaTri)}` }}
                </span>
                <span v-if="v.loaiGiam === 0 && v.giaGiamToiDa"> (Tối đa {{ formatCurrency(v.giaGiamToiDa) }})</span>
              </div>
              <div>• Đơn tối thiểu: <span class="font-semibold text-slate-700">{{ formatCurrency(v.dieuKienGiam) }}</span></div>
              <div v-if="subtotal < v.dieuKienGiam" class="text-red-500 font-medium">
                * Cần mua thêm {{ formatCurrency(v.dieuKienGiam - subtotal) }} để sử dụng mã này
              </div>
              <div class="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                <span>Số lượng còn lại: {{ v.soLuong - (v.soLuongDaDung || 0) }}</span>
                <span>Hạn dùng: {{ new Date(v.ngayKetThuc).toLocaleDateString('vi-VN') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="mt-4 border-t border-slate-100 pt-3 flex justify-end">
          <button 
            type="button"
            @click="showVoucherModal = false" 
            class="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition-colors text-sm font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Scoped styles */
</style>

