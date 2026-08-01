<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../../services/api'
import PaymentModal from '../../components/PaymentModal.vue'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatDate, formatDateTime, formatTime } from '@/utils/format'

const router = useRouter()
const authStore = useAuthStore()
const loggedInEmployeeName = computed(() => {
  return authStore.user?.hoTen || 'Nhân viên'
})

// ---------------- TOAST & CONFIRMATION STATES ----------------
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

// ---------------- LOCAL STORAGE DATABASE FALLBACKS ----------------
const getMockOrders = () => {
  const data = localStorage.getItem('mock_pos_orders')
  if (!data) {
    const defaultList = [
      {
        id: 1,
        maHoaDon: 'HD-001',
        tenKhachHang: 'Khách lẻ',
        soDienThoai: '',
        khachHang: null,
        chiTietList: [
          {
            id: 101,
            variantId: 1,
            variantCode: 'SP001-P-BLACK-L',
            tenSanPham: 'Áo Polo Bee Stylish',
            color: 'Đen',
            size: 'L',
            donGia: 2500000,
            soLuong: 2,
            thanhTien: 5000000,
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9TQgjfKeTQaHtuEISZO_w6QRzUnju-Oz58CT3bWmw5wDobVDeIYVQdlLpXlazQT0NJ9hPmTpiskN99dHVxbt6eSjX9MQ2l1DUXsM6osInrYLdm7_dghkghIebkWcMrJkt8lu6PSAaeO82R8v_Lkf9fcDxPdWK6R0g8H6oHYvRS0v4aUV6GBkwFA_G-83YJvSa5QX-0KgaJz6WOUqyzqkaVyk6gqe0-6aTSkplqLIyl2HRCyCxp7BBCjFCo-cmwhBkWrvhX-Ur_GI',
            stock: 15
          }
        ],
        loaiHoaDon: 0, // 0: Tại quầy, 1: Giao hàng
        trangThai: 0,
        phiVanChuyen: 0,
        diaChiGiao: '',
        tinhThanhPho: '',
        quanHuyen: '',
        phuongXa: '',
        tenNguoiNhan: '',
        sdtNguoiNhan: '',
        voucher: null,
        soTienGoc: 5000000,
        soTienGiam: 750000,
        tongTienThanhToan: 4250000
      }
    ]
    localStorage.setItem('mock_pos_orders', JSON.stringify(defaultList))
    return defaultList
  }
  return JSON.parse(data)
}

const saveMockOrders = (list) => {
  localStorage.setItem('mock_pos_orders', JSON.stringify(list))
}

// ---------------- CORE POS STATE ----------------
const isUsingMock = ref(false)
const isLoading = ref(false)
const orders = ref([])
const activeOrderId = ref(null)

// Current active order getter
const currentOrder = computed(() => {
  return orders.value.find(o => o.id === activeOrderId.value) || null
})

// ---------------- PRODUCT & VARIANT STATE (FOR CART ADDITION) ----------------
const showProductModal = ref(false)
const productSearchQuery = ref('')
const selectedColorId = ref('')
const selectedSizeId = ref('')
const productColors = ref([])
const productSizes = ref([])
const productVariants = ref([])
const isProductLoading = ref(false)

// Quantity picker state for product modal
const qtyPickerVariantId = ref(null)
const qtyPickerValue = ref(1)

// ---------------- CUSTOMER SELECTION STATE ----------------
const showCustomerModal = ref(false)
const customerSearchQuery = ref('')
const customerList = ref([])
const isCustomerLoading = ref(false)

// ---------------- CUSTOMER ADDRESS BOOK STATE ----------------
const showAddressBookModal = ref(false)
const addressBookCustomer = ref(null)
const addressBookList = ref([])
const addressBookDistricts = ref([])
const addressBookWards = ref([])
const newAddressForm = ref({
  tenNguoiNhan: '',
  sdtNguoiNhan: '',
  diaChiCuThe: '',
  tinhThanhPho: '',
  quanHuyen: '',
  phuongXa: '',
  kieuDiaChiLaMacDinh: false
})

// ---------------- ADRESS SELECTION STATE (GHN) ----------------
const provinces = ref([])
const districts = ref([])
const wards = ref([])
const isGHNCalculated = ref(false)

// ---------------- PAYMENT MODAL STATE ----------------
const showPaymentModal = ref(false)
const showCheckoutConfirmModal = ref(false)

// Helper formatting utilities (imported from format.js)

const isDiscountActive = (v) => {
  if (!v || !v.phanTramGiam || v.trangThaiDotGiamGia !== 1) return false
  if (!v.ngayBatDau || !v.ngayKetThuc) return false
  const now = new Date()
  const start = new Date(v.ngayBatDau)
  const end = new Date(v.ngayKetThuc)
  return now >= start && now <= end
}

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

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}


// ---------------- REVENUE CALCULATOR HELPER ----------------
const calculatePrices = (order) => {
  if (!order) return
  const subtotal = order.chiTietList.reduce((sum, item) => sum + item.donGia * item.soLuong, 0)
  order.soTienGoc = subtotal

  let discount = 0
  if (order.voucher) {
    if (order.voucher.loaiGiam === 0) { // Percentage
      discount = Math.round(subtotal * (order.voucher.giaTri / 100))
      if (order.voucher.giaGiamToiDa && discount > order.voucher.giaGiamToiDa) {
        discount = order.voucher.giaGiamToiDa
      }
    } else { // Fixed price
      discount = order.voucher.giaTri
    }
    // Cannot discount more than subtotal
    if (discount > subtotal) discount = subtotal
  }

  order.soTienGiam = discount
  order.tongTienThanhToan = Math.max(0, subtotal - discount + (order.loaiHoaDon === 1 ? Number(order.phiVanChuyen || 0) : 0))
}

// ---------------- ADRESS / LOCATION APIS ----------------
const GHN_TOKEN = import.meta.env.VITE_GHN_TOKEN || '5b12da61-9e79-11ed-b190-ea4f04c0aa0e'
const GHN_SHOP_ID = import.meta.env.VITE_GHN_SHOP_ID || '123456'
const GHN_SENDER_DISTRICT_ID = Number(import.meta.env.VITE_GHN_SENDER_DISTRICT_ID || 1454)

const fetchProvinces = async () => {
  try {
    const res = await fetch('https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province', {
      headers: { 'Token': GHN_TOKEN }
    })
    const json = await res.json()
    if (json.code === 200 && json.data) {
      provinces.value = json.data.map(p => ({
        name: p.ProvinceName,
        code: p.ProvinceID
      })).sort((a, b) => a.name.localeCompare(b.name))
      return
    } else {
      throw new Error(json.message || 'GHN API returned error code ' + json.code)
    }
  } catch (err) {
    console.warn('Failed to fetch GHN provinces, falling back to open-api.vn:', err)
  }

  try {
    const res = await fetch('https://provinces.open-api.vn/api/p/')
    const data = await res.json()
    provinces.value = data || []
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

const loadDistrictsForProvince = async (provinceName) => {
  if (!provinceName) return
  const normProvinceName = normalizeLocationName(provinceName)
  const provObj = provinces.value.find(p => normalizeLocationName(p.name) === normProvinceName)
  if (!provObj) return
  
  if (currentOrder.value && currentOrder.value.tinhThanhPho && normalizeLocationName(currentOrder.value.tinhThanhPho) === normProvinceName) {
    currentOrder.value.tinhThanhPho = provObj.name
  }
  
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
      districts.value = json.data.map(d => ({
        name: d.DistrictName,
        code: d.DistrictID
      })).sort((a, b) => a.name.localeCompare(b.name))
      return
    } else {
      throw new Error(json.message || 'GHN API returned error code ' + json.code)
    }
  } catch (err) {
    console.warn('Failed to fetch GHN districts, falling back to open-api.vn:', err)
  }

  try {
    const res = await fetch(`https://provinces.open-api.vn/api/p/${provObj.code}?depth=2`)
    const data = await res.json()
    districts.value = data.districts || []
  } catch (err) {
    console.error('Failed to fetch districts:', err)
  }
}

const loadWardsForDistrict = async (districtName) => {
  if (!districtName) return
  const normDistrictName = normalizeLocationName(districtName)
  const distObj = districts.value.find(d => normalizeLocationName(d.name) === normDistrictName)
  if (!distObj) return
  
  if (currentOrder.value && currentOrder.value.quanHuyen && normalizeLocationName(currentOrder.value.quanHuyen) === normDistrictName) {
    currentOrder.value.quanHuyen = distObj.name
  }
  
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
      wards.value = json.data.map(w => ({
        name: w.WardName,
        code: w.WardCode
      })).sort((a, b) => a.name.localeCompare(b.name))
      return
    } else {
      throw new Error(json.message || 'GHN API returned error code ' + json.code)
    }
  } catch (err) {
    console.warn('Failed to fetch GHN wards, falling back to open-api.vn:', err)
  }

  try {
    const res = await fetch(`https://provinces.open-api.vn/api/d/${distObj.code}?depth=2`)
    const data = await res.json()
    wards.value = data.wards || []
  } catch (err) {
    console.error('Failed to fetch wards:', err)
  }
}

const onProvinceChange = async (event) => {
  districts.value = []
  wards.value = []
  if (currentOrder.value) {
    currentOrder.value.quanHuyen = ''
    currentOrder.value.phuongXa = ''
    currentOrder.value.phiVanChuyen = 0
    calculatePrices(currentOrder.value)
    saveOrdersState()
  }

  const pName = event.target.value
  if (!pName) return

  await loadDistrictsForProvince(pName)
}

const onDistrictChange = async (event) => {
  wards.value = []
  if (currentOrder.value) {
    currentOrder.value.phuongXa = ''
    currentOrder.value.phiVanChuyen = 0
    calculatePrices(currentOrder.value)
    saveOrdersState()
  }

  const dName = event.target.value
  if (!dName) return

  await loadWardsForDistrict(dName)
}

const onWardChange = async (event) => {
  if (!currentOrder.value) return

  const wName = event.target.value
  if (!wName) return

  const wardObj = wards.value.find(w => w.name === wName)
  const distObj = districts.value.find(d => d.name === currentOrder.value.quanHuyen)
  const provObj = provinces.value.find(p => p.name === currentOrder.value.tinhThanhPho)

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
        const fee = json.data.total
        currentOrder.value.phiVanChuyen = fee
        calculatePrices(currentOrder.value)
        saveOrdersState()
        showToast(`Đã tính phí vận chuyển GHN: ${formatCurrency(fee)}!`, 'success')
        return
      } else {
        console.warn('GHN Fee API error:', json.message)
      }
    } catch (err) {
      console.warn('Failed to calculate GHN fee, falling back:', err)
    }
  }

  const fee = Math.max(15000, 20000 + (currentOrder.value.diaChiGiao?.length || 0) * 200)
  currentOrder.value.phiVanChuyen = fee
  calculatePrices(currentOrder.value)
  saveOrdersState()
  showToast(`Đã tính phí vận chuyển (Tự động): ${formatCurrency(fee)}!`, 'success')
}

const calculateRealGHN = async () => {
  if (!currentOrder.value) return
  if (!currentOrder.value.tinhThanhPho || !currentOrder.value.quanHuyen || !currentOrder.value.phuongXa) {
    showToast('Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã để tính phí!', 'warning')
    return
  }
  await onWardChange({ target: { value: currentOrder.value.phuongXa } })
}

// ---------------- ACTIVE VOUCHER AUTO-SELECTION & SELECTION MODAL ----------------
const activeVouchers = ref([])
const showVoucherSelectionModal = ref(false)
const voucherSearchQuery = ref('')

const fetchActiveVouchers = async () => {
  try {
    const res = await api.get('/api/v1/phieu-giam-gia', {
      params: { trangThai: 1, page: 0, size: 100 }
    })
    if (res.data && res.data.content) {
      activeVouchers.value = res.data.content
    }
  } catch (err) {
    console.error('Failed to load active vouchers:', err)
  }
}

const openVoucherSelectionModal = async () => {
  if (!currentOrder.value) {
    showToast('Vui lòng chọn hoặc tạo một đơn hàng trước!', 'warning')
    return
  }
  await fetchActiveVouchers()
  voucherSearchQuery.value = ''
  showVoucherSelectionModal.value = true
}

const selectVoucherForOrder = async (v) => {
  if (!currentOrder.value) return
  const subtotal = currentOrder.value.chiTietList.reduce((sum, item) => sum + item.donGia * item.soLuong, 0)
  if (subtotal < (v.dieuKienGiam || 0)) {
    showToast(`Đơn hàng chưa đạt điều kiện tối thiểu ${formatCurrency(v.dieuKienGiam)}!`, 'error')
    return
  }
  
  try {
    if (isUsingMock.value) {
      currentOrder.value.voucher = v
      calculatePrices(currentOrder.value)
      saveOrdersState()
      showToast(`Áp dụng phiếu giảm giá ${v.maPhieuGiamGia} thành công (Mock)!`, 'success')
    } else {
      await api.post(`/api/v1/ban-hang/don-hang/${currentOrder.value.id}/voucher`, {
        maPhieuGiamGia: v.maPhieuGiamGia
      })
      showToast(`Áp dụng phiếu giảm giá ${v.maPhieuGiamGia} thành công!`, 'success')
      await loadOrders()
    }
    showVoucherSelectionModal.value = false
  } catch (err) {
    showToast(err.response?.data?.message || 'Áp dụng mã giảm giá thất bại!', 'error')
  }
}

const filteredVouchersForModal = computed(() => {
  if (!currentOrder.value) return []
  const subtotal = currentOrder.value.chiTietList.reduce((sum, item) => sum + item.donGia * item.soLuong, 0)
  const list = getActiveVouchersList()
  
  return list.filter(v => {
    const q = voucherSearchQuery.value.trim().toLowerCase()
    if (q) {
      const codeMatch = v.maPhieuGiamGia?.toLowerCase().includes(q)
      const nameMatch = v.tenPhieuGiamGia?.toLowerCase().includes(q)
      if (!codeMatch && !nameMatch) return false
    }
    
    if (v.kieuApDung === 0) {
      return true
    } else if (v.kieuApDung === 1) {
      if (!currentOrder.value.khachHang || !currentOrder.value.khachHang.id) return false
      if (!v.danhSachKhachHangIds || !v.danhSachKhachHangIds.includes(currentOrder.value.khachHang.id)) return false
      return true
    }
    return false
  }).map(v => {
    const isMinAmountMet = subtotal >= (v.dieuKienGiam || 0)
    let discountVal = 0
    if (v.loaiGiam === 0) {
      discountVal = Math.round(subtotal * ((v.giaTri || 0) / 100))
      if (v.giaGiamToiDa && discountVal > v.giaGiamToiDa) {
        discountVal = v.giaGiamToiDa
      }
    } else {
      discountVal = v.giaTri || 0
    }
    if (discountVal > subtotal) discountVal = subtotal
    
    return {
      ...v,
      isMinAmountMet,
      discountVal
    }
  })
})

const getActiveVouchersList = () => {
  if (isUsingMock.value || activeVouchers.value.length === 0) {
    return [
      { id: 1, maPhieuGiamGia: 'PGG00003', tenPhieuGiamGia: 'Voucher 15%', loaiGiam: 0, giaTri: 15, dieuKienGiam: 500000, giaGiamToiDa: 300000 },
      { id: 2, maPhieuGiamGia: 'PGG00004', tenPhieuGiamGia: 'Giảm 500k', loaiGiam: 1, giaTri: 500000, dieuKienGiam: 2000000, giaGiamToiDa: 500000 },
      { id: 3, maPhieuGiamGia: 'PGG00001', tenPhieuGiamGia: 'Giảm 50k', loaiGiam: 1, giaTri: 50000, dieuKienGiam: 100000, giaGiamToiDa: 50000 }
    ]
  }
  return activeVouchers.value
}

const autoApplyBestVoucher = async (order) => {
  if (!order) return

  const subtotal = order.chiTietList.reduce((sum, item) => sum + item.donGia * item.soLuong, 0)
  if (subtotal === 0) {
    if (order.voucher) {
      try {
        if (!isUsingMock.value) {
          await api.delete(`/api/v1/ban-hang/don-hang/${order.id}/voucher`)
        }
      } catch (e) {
        console.warn('Failed to remove voucher on empty cart:', e)
      }
      order.voucher = null
      calculatePrices(order)
      saveOrdersState()
    }
    return
  }

  const list = getActiveVouchersList()
  const eligibleVouchers = list.filter(v => {
    if (v.kieuApDung !== 0) return false // Auto-apply only store-wide vouchers
    if (subtotal < (v.dieuKienGiam || 0)) return false
    return true
  })

  let bestVoucher = null
  let maxDiscount = 0

  for (const v of eligibleVouchers) {
    let discount = 0
    if (v.loaiGiam === 0) {
      discount = Math.round(subtotal * ((v.giaTri || 0) / 100))
      if (v.giaGiamToiDa && discount > v.giaGiamToiDa) {
        discount = v.giaGiamToiDa
      }
    } else {
      discount = v.giaTri || 0
    }
    if (discount > subtotal) discount = subtotal
    if (discount > maxDiscount) {
      maxDiscount = discount
      bestVoucher = v
    }
  }

  const currentVoucherCode = order.voucher?.maPhieuGiamGia || null
  const bestVoucherCode = bestVoucher?.maPhieuGiamGia || null

  if (bestVoucherCode !== currentVoucherCode) {
    try {
      if (bestVoucher) {
        if (!isUsingMock.value) {
          await api.post(`/api/v1/ban-hang/don-hang/${order.id}/voucher`, {
            maPhieuGiamGia: bestVoucher.maPhieuGiamGia
          })
          showToast(`Tự động áp dụng phiếu giảm giá tốt nhất: ${bestVoucher.maPhieuGiamGia}`, 'success')
          await loadOrders()
        } else {
          order.voucher = bestVoucher
          calculatePrices(order)
          saveOrdersState()
          showToast(`Tự động áp dụng phiếu giảm giá tốt nhất (Mock): ${bestVoucher.maPhieuGiamGia}`, 'success')
        }
      } else {
        if (!isUsingMock.value) {
          await api.delete(`/api/v1/ban-hang/don-hang/${order.id}/voucher`)
          showToast('Đã gỡ bỏ phiếu giảm giá do không đủ điều kiện tối thiểu.', 'info')
          await loadOrders()
        } else {
          order.voucher = null
          calculatePrices(order)
          saveOrdersState()
          showToast('Đã gỡ bỏ phiếu giảm giá (Mock).', 'info')
        }
      }
    } catch (err) {
      console.warn('Failed to auto apply best voucher:', err)
      if (bestVoucher) {
        order.voucher = bestVoucher
      } else {
        order.voucher = null
      }
      calculatePrices(order)
      saveOrdersState()
    }
  } else {
    calculatePrices(order)
  }
}


// ---------------- DATA SYNCHRONIZATION ----------------
const saveOrdersState = () => {
  if (isUsingMock.value) {
    saveMockOrders(orders.value)
  }
}

const loadOrders = async () => {
  isLoading.value = true
  try {
    await fetchActiveVouchers()
    const res = await api.get('/api/v1/ban-hang/don-hang-cho')
    if (res.data) {
      orders.value = res.data.map(order => ({
        id: order.id,
        maHoaDon: order.maHoaDon || `HD-${order.id}`,
        tenKhachHang: order.tenKhachHang || 'Khách lẻ',
        soDienThoai: order.soDienThoai || '',
        khachHang: order.khachHang || null,
        chiTietList: (order.chiTietList || []).map(item => ({
          id: item.id,
          variantId: item.chiTietSanPham?.id,
          variantCode: item.chiTietSanPham?.maChiTietSanPham,
          tenSanPham: item.chiTietSanPham?.tenSanPham,
          color: sanitizeVietnamese(item.chiTietSanPham?.tenMauSac),
          size: sanitizeVietnamese(item.chiTietSanPham?.tenKichCo || item.chiTietSanPham?.tenKichThuoc),
          donGia: item.donGia || 0,
          soLuong: item.soLuong || 1,
          thanhTien: (item.donGia || 0) * (item.soLuong || 1),
          image: item.chiTietSanPham?.anh || '',
          stock: item.chiTietSanPham?.soLuongTon ?? 999,
          isLoading: false
        })),
        loaiHoaDon: order.loaiHoaDon ?? 0,
        trangThai: order.trangThai || 0,
        phiVanChuyen: order.phiVanChuyen || 0,
        diaChiGiao: order.diaChiGiao || '',
        tinhThanhPho: order.tinhThanhPho || '',
        quanHuyen: order.quanHuyen || '',
        phuongXa: order.phuongXa || '',
        tenNguoiNhan: order.tenNguoiNhan || '',
        sdtNguoiNhan: order.sdtNguoiNhan || '',
        voucher: order.maPhieuGiamGia 
          ? getActiveVouchersList().find(v => v.maPhieuGiamGia === order.maPhieuGiamGia) || {
              maPhieuGiamGia: order.maPhieuGiamGia,
              tenPhieuGiamGia: order.tenPhieuGiamGia || order.maPhieuGiamGia,
              loaiGiam: order.soTienGiam > 0 ? 1 : 0,
              giaTri: order.soTienGiam || 0
            }
          : null,
        soTienGoc: order.soTienGoc || 0,
        soTienGiam: order.soTienGiam || 0,
        tongTienThanhToan: order.tongTienThanhToan || 0,
        khachThanhToan: order.khachThanhToan || 0,
        tienMat: order.tienMat || 0,
        tienChuyenKhoan: order.tienChuyenKhoan || 0,
        ghiChuThanhToan: order.ghiChu || ''
      }))
      isUsingMock.value = false
      const currentActiveId = activeOrderId.value
      if (currentActiveId && orders.value.some(o => o.id === currentActiveId)) {
        activeOrderId.value = currentActiveId
      } else if (orders.value.length > 0) {
        activeOrderId.value = orders.value[0].id
      } else {
        activeOrderId.value = null
      }
    }
  } catch (err) {
    console.warn('POS API failed. Falling back to local storage mock data.', err.message)
    isUsingMock.value = true
    orders.value = getMockOrders()
    const currentActiveId = activeOrderId.value
    if (currentActiveId && orders.value.some(o => o.id === currentActiveId)) {
      activeOrderId.value = currentActiveId
    } else if (orders.value.length > 0) {
      activeOrderId.value = orders.value[0].id
    } else {
      activeOrderId.value = null
    }
  } finally {
    isLoading.value = false
  }
}

const fetchOrderDetail = async (orderId) => {
  if (!orderId || isUsingMock.value) return
  try {
    const res = await api.get(`/api/v1/ban-hang/don-hang/${orderId}`)
    if (res.data) {
      const order = res.data
      const idx = orders.value.findIndex(o => o.id === orderId)
      if (idx !== -1) {
        const existingOrder = orders.value[idx]
        orders.value[idx] = {
          id: order.id,
          maHoaDon: order.maHoaDon || `HD-${order.id}`,
          tenKhachHang: order.tenKhachHang || 'Khách lẻ',
          soDienThoai: order.soDienThoai || '',
          khachHang: order.khachHang || null,
          chiTietList: (order.chiTietDonHang || []).map(item => {
            const existingItem = existingOrder?.chiTietList.find(i => i.variantId === item.idChiTietSanPham)
            return {
              id: item.idHoaDonChiTiet,
              variantId: item.idChiTietSanPham,
              variantCode: existingItem?.variantCode || item.maChiTietSanPham || '',
              tenSanPham: item.tenSanPham,
              color: sanitizeVietnamese(item.tenMauSac),
              size: sanitizeVietnamese(item.tenKichCo || item.tenKichThuoc),
              donGia: item.donGia || 0,
              soLuong: item.soLuong || 1,
              thanhTien: item.thanhTien || ((item.donGia || 0) * (item.soLuong || 1)),
              image: item.anhSanPham || '',
              stock: existingItem?.stock ?? 999,
              isLoading: false
            }
          }),
          loaiHoaDon: order.loaiHoaDon ?? 0,
          trangThai: order.trangThai || 0,
          phiVanChuyen: order.phiVanChuyen || 0,
          diaChiGiao: order.diaChiGiao || '',
          tinhThanhPho: order.tinhThanhPho || '',
          quanHuyen: order.quanHuyen || '',
          phuongXa: order.phuongXa || '',
          tenNguoiNhan: order.tenNguoiNhan || '',
          sdtNguoiNhan: order.sdtNguoiNhan || '',
          voucher: order.maPhieuGiamGia 
            ? getActiveVouchersList().find(v => v.maPhieuGiamGia === order.maPhieuGiamGia) || {
                maPhieuGiamGia: order.maPhieuGiamGia,
                tenPhieuGiamGia: order.tenPhieuGiamGia || order.maPhieuGiamGia,
                loaiGiam: order.soTienGiam > 0 ? 1 : 0,
                giaTri: order.soTienGiam || 0
              }
            : null,
          soTienGoc: (order.chiTietDonHang || []).reduce((sum, item) => sum + (item.donGia * item.soLuong), 0),
          soTienGiam: order.soTienGiam || 0,
          tongTienThanhToan: order.tongTienThanhToan ?? order.tongTien ?? 0,
          khachThanhToan: order.khachThanhToan || 0,
          tienMat: order.tienMat || 0,
          tienChuyenKhoan: order.tienChuyenKhoan || 0,
          ghiChuThanhToan: order.ghiChu || ''
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch order details:', err)
    showToast('Không thể lấy chi tiết đơn hàng cập nhật từ máy chủ!', 'error')
  }
}

// ---------------- ORDERS MANAGEMENT ACTIONS ----------------
const createNewOrder = async () => {
  if (orders.value.length >= 10) {
    showToast('Không thể tạo thêm! Tối đa chỉ được phép mở 10 đơn hàng chờ cùng lúc để tránh spam hệ thống.', 'error')
    return
  }

  triggerConfirm(
    'Bạn có chắc chắn muốn tạo thêm một đơn hàng chờ mới không?',
    async () => {
      isLoading.value = true
      try {
        if (isUsingMock.value) {
          const nextId = orders.value.length ? Math.max(...orders.value.map(o => o.id)) + 1 : 1
          const newOrder = {
            id: nextId,
            maHoaDon: `HD-${String(nextId).padStart(3, '0')}`,
            tenKhachHang: 'Khách lẻ',
            soDienThoai: '',
            khachHang: null,
            chiTietList: [],
            loaiHoaDon: 0,
            trangThai: 0,
            phiVanChuyen: 0,
            diaChiGiao: '',
            tinhThanhPho: '',
            quanHuyen: '',
            phuongXa: '',
            tenNguoiNhan: '',
            sdtNguoiNhan: '',
            voucher: null,
            soTienGoc: 0,
            soTienGiam: 0,
            tongTienThanhToan: 0,
            khachThanhToan: 0,
            tienMat: 0,
            tienChuyenKhoan: 0,
            ghiChuThanhToan: ''
          }
          orders.value.push(newOrder)
          saveMockOrders(orders.value)
          activeOrderId.value = nextId
          showToast('Đã tạo đơn hàng chờ mới (Mock)!', 'success')
        } else {
          const res = await api.post('/api/v1/ban-hang/tao-don')
          if (res.data) {
            showToast('Tạo đơn hàng chờ thành công!', 'success')
            await loadOrders()
            activeOrderId.value = res.data.id
          }
        }
      } catch (err) {
        showToast('Không thể tạo đơn hàng chờ mới!', 'error')
      } finally {
        isLoading.value = false
      }
    },
    'Tạo đơn hàng mới'
  )
}

const closeOrderTab = (order) => {
  triggerConfirm(
    `Bạn có chắc chắn muốn hủy đơn hàng chờ "${order.maHoaDon}" không?`,
    async () => {
      if (isUsingMock.value) {
        orders.value = orders.value.filter(o => o.id !== order.id)
        saveMockOrders(orders.value)
        if (orders.value.length > 0) {
          activeOrderId.value = orders.value[0].id
        } else {
          activeOrderId.value = null
        }
        showToast('Đã hủy đơn hàng chờ (Mock)!', 'success')
      } else {
        try {
          await api.put(`/api/v1/hoa-don/${order.id}/trang-thai`, {
            trangThaiMoi: 5, // 5 represents "Đã hủy" (Cancelled) in backend
            ghiChu: 'Hủy đơn hàng chờ từ màn hình POS'
          })
          showToast('Đã hủy đơn hàng chờ thành công!', 'success')
          await loadOrders()
        } catch (err) {
          showToast('Không thể xóa đơn hàng này từ máy chủ!', 'error')
        }
      }
    },
    'Hủy đơn hàng chờ'
  )
}

// ---------------- CART ACTIONS ----------------
// Helper to calculate available stock for modal view (considering all pending orders)
const getAvailableStockForModal = (variant) => {
  if (!isUsingMock.value) {
    return variant.stock
  }
  const qtyInAllOrders = orders.value.reduce((sum, order) => {
    const item = order.chiTietList.find(i => i.variantId === variant.id)
    return sum + (item ? item.soLuong : 0)
  }, 0)
  return Math.max(0, variant.stock - qtyInAllOrders)
}

// Helper to get max allowed quantity for a cart item in current order
const getMaxAllowedQuantity = (item) => {
  const variant = productVariants.value.find(v => v.id === item.variantId)
  const totalStock = variant ? variant.stock : (item.stock ?? 999)

  if (!isUsingMock.value) {
    return totalStock + item.soLuong
  }

  const qtyInOtherOrders = orders.value.reduce((sum, order) => {
    if (order.id === activeOrderId.value) return sum
    const otherItem = order.chiTietList.find(i => i.variantId === item.variantId)
    return sum + (otherItem ? otherItem.soLuong : 0)
  }, 0)

  return Math.max(0, totalStock - qtyInOtherOrders)
}

const changeQuantity = async (item, delta, customSuccessMessage = null) => {
  const oldQuantity = item.soLuong
  const newQty = oldQuantity + delta
  if (newQty < 1) {
    removeCartItem(item)
    return
  }

  if (delta > 0) {
    const maxAllowed = getMaxAllowedQuantity(item)
    if (newQty > maxAllowed) {
      showToast(`Không thể tăng số lượng! Chỉ còn ${maxAllowed} sản phẩm khả dụng trong kho.`, 'error')
      return
    }
  }

  // 1. Save old quantity and turn on loading state
  item.isLoading = true

  // Optimistic update of variant stock in modal list
  let variantInModal = null
  if (!isUsingMock.value) {
    variantInModal = productVariants.value.find(v => v.id === item.variantId)
    if (variantInModal) {
      variantInModal.stock = Math.max(0, variantInModal.stock - delta)
    }
  }

  // Determine Toast message
  const direction = delta > 0 ? 'Tăng' : 'Giảm'
  const actionText = delta > 0 ? 'thêm' : 'bớt'
  const absDelta = Math.abs(delta)
  const defaultMsg = `Đã ${direction.toLowerCase()} số lượng ${item.tenSanPham} (${item.color} - ${item.size}) ${actionText} ${absDelta} sản phẩm (Tổng cộng: ${newQty})!`
  const successMsg = customSuccessMessage || defaultMsg

  // 2. Call API or update state
  if (isUsingMock.value) {
    item.soLuong = newQty
    item.thanhTien = item.donGia * newQty
    calculatePrices(currentOrder.value)
    saveOrdersState()
    await autoApplyBestVoucher(currentOrder.value)
    showToast(successMsg, 'success')
    item.isLoading = false
  } else {
    try {
      // Call PUT API
      await api.put(`/api/v1/ban-hang/chi-tiet/${item.id}`, {
        soLuong: newQty
      })
      // Success: update quantity in state and reload order detail
      item.soLuong = newQty
      item.thanhTien = item.donGia * newQty
      await fetchOrderDetail(activeOrderId.value)
      await autoApplyBestVoucher(currentOrder.value)
      showToast(successMsg, 'success')
      // Silently refetch variants to ensure accurate stock in modal
      await fetchProductModalVariants(true)
    } catch (err) {
      // Failure / Out of stock: show error message from BE and rollback
      const errorMsg = err.response?.data?.message || 'Không thể đồng bộ số lượng sản phẩm lên máy chủ!'
      showToast(errorMsg, 'error')
      item.soLuong = oldQuantity
      item.thanhTien = item.donGia * oldQuantity
      // Rollback variant stock in modal list
      if (variantInModal) {
        variantInModal.stock = variantInModal.stock + delta
      }
    } finally {
      item.isLoading = false
    }
  }
}

const updateQuantityInput = async (item, event) => {
  const oldQuantity = item.soLuong
  const inputVal = parseInt(event.target.value, 10)
  if (isNaN(inputVal) || inputVal < 1) {
    event.target.value = oldQuantity
    return
  }

  const maxAllowed = getMaxAllowedQuantity(item)
  if (inputVal > maxAllowed) {
    showToast(`Số lượng nhập vượt quá số lượng khả dụng trong kho (Tối đa: ${maxAllowed})!`, 'error')
    event.target.value = oldQuantity
    return
  }

  // 1. Save old quantity and turn on loading state
  item.isLoading = true

  const delta = inputVal - oldQuantity
  // Optimistic update of variant stock in modal list
  let variantInModal = null
  if (!isUsingMock.value) {
    variantInModal = productVariants.value.find(v => v.id === item.variantId)
    if (variantInModal) {
      variantInModal.stock = Math.max(0, variantInModal.stock - delta)
    }
  }

  // 2. Call API or update state
  if (isUsingMock.value) {
    item.soLuong = inputVal
    item.thanhTien = item.donGia * inputVal
    calculatePrices(currentOrder.value)
    saveOrdersState()
    await autoApplyBestVoucher(currentOrder.value)
    showToast(`Đã cập nhật số lượng ${item.tenSanPham} (${item.color} - ${item.size}) thành ${inputVal} sản phẩm!`, 'success')
    item.isLoading = false
  } else {
    try {
      // Call PUT API
      await api.put(`/api/v1/ban-hang/chi-tiet/${item.id}`, {
        soLuong: inputVal
      })
      // Success: update quantity in state and reload order detail
      item.soLuong = inputVal
      item.thanhTien = item.donGia * inputVal
      await fetchOrderDetail(activeOrderId.value)
      await autoApplyBestVoucher(currentOrder.value)
      showToast(`Đã cập nhật số lượng ${item.tenSanPham} (${item.color} - ${item.size}) thành ${inputVal} sản phẩm!`, 'success')
      // Silently refetch variants to ensure accurate stock in modal
      await fetchProductModalVariants(true)
    } catch (err) {
      // Failure: show error message from BE and rollback
      const errorMsg = err.response?.data?.message || 'Không thể cập nhật số lượng sản phẩm!'
      showToast(errorMsg, 'error')
      item.soLuong = oldQuantity
      item.thanhTien = item.donGia * oldQuantity
      if (event.target) {
        event.target.value = oldQuantity
      }
      // Rollback variant stock in modal list
      if (variantInModal) {
        variantInModal.stock = variantInModal.stock + delta
      }
    } finally {
      item.isLoading = false
    }
  }
}

const removeCartItem = (item) => {
  triggerConfirm(
    `Bạn có chắc chắn muốn xóa sản phẩm "${item.tenSanPham}" khỏi giỏ hàng không?`,
    async () => {
      item.isLoading = true

      // Optimistic update of variant stock in modal list
      let variantInModal = null
      if (!isUsingMock.value) {
        variantInModal = productVariants.value.find(v => v.id === item.variantId)
        if (variantInModal) {
          variantInModal.stock = variantInModal.stock + item.soLuong
        }
      }

      if (isUsingMock.value) {
        if (currentOrder.value) {
          currentOrder.value.chiTietList = currentOrder.value.chiTietList.filter(i => i.id !== item.id)
          calculatePrices(currentOrder.value)
          saveOrdersState()
          await autoApplyBestVoucher(currentOrder.value)
          showToast(`Đã xóa sản phẩm ${item.tenSanPham} (${item.color} - ${item.size}) khỏi giỏ hàng (Mock)!`, 'success')
        }
        item.isLoading = false
      } else {
        try {
          await api.delete(`/api/v1/ban-hang/chi-tiet/${item.id}`)
          if (currentOrder.value) {
            currentOrder.value.chiTietList = currentOrder.value.chiTietList.filter(i => i.id !== item.id)
          }
          await fetchOrderDetail(activeOrderId.value)
          await autoApplyBestVoucher(currentOrder.value)
          showToast(`Đã xóa sản phẩm ${item.tenSanPham} (${item.color} - ${item.size}) khỏi giỏ hàng!`, 'success')
          // Silently refetch variants to ensure accurate stock in modal
          await fetchProductModalVariants(true)
        } catch (err) {
          const errorMsg = err.response?.data?.message || 'Xóa sản phẩm thất bại!'
          showToast(errorMsg, 'error')
          // Rollback variant stock in modal list
          if (variantInModal) {
            variantInModal.stock = Math.max(0, variantInModal.stock - item.soLuong)
          }
        } finally {
          item.isLoading = false
        }
      }
    },
    'Xóa sản phẩm khỏi giỏ'
  )
}

// ---------------- PRODUCT MODAL & ADD VARIANT LOGIC ----------------
const openProductModal = async () => {
  showProductModal.value = true
  await fetchProductModalVariants()
  await loadFilterOptions()
}

const loadFilterOptions = async () => {
  try {
    const res = await api.get('/api/v1/attributes/all-active')
    if (res.data) {
      productColors.value = (res.data.mauSacList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten)
      }))
      productSizes.value = (res.data.kichThuocList || []).map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.ten)
      }))
    }
  } catch (err) {
    // Mock attributes fallback
    productColors.value = [
      { id: 1, name: 'Đen' },
      { id: 2, name: 'Trắng' },
      { id: 3, name: 'Đỏ' }
    ]
    productSizes.value = [
      { id: 1, name: 'M' },
      { id: 2, name: 'L' },
      { id: 3, name: 'XL' }
    ]
  }
}

const fetchProductModalVariants = async (silent = false) => {
  if (!silent) isProductLoading.value = true
  try {
    const params = {
      page: 0,
      size: 50,
    }
    if (productSearchQuery.value.trim()) {
      params.keyword = productSearchQuery.value.trim()
    }
    if (selectedColorId.value) {
      params.idMauSac = selectedColorId.value
    }
    if (selectedSizeId.value) {
      params.idKichThuoc = selectedSizeId.value
    }

    const res = await api.get('/api/v1/chi-tiet-san-pham', { params })
    if (res.data && res.data.content) {
      productVariants.value = res.data.content.map(item => ({
        id: item.id,
        maSanPham: item.maSanPham,
        variantCode: item.maChiTietSanPham || item.ma,
        size: sanitizeVietnamese(item.tenKichCo || item.tenKichThuoc),
        color: sanitizeVietnamese(item.tenMauSac),
        stock: item.soLuongTon ?? 0,
        salePrice: item.giaBan ?? 0,
        tenSanPham: sanitizeVietnamese(item.tenSanPham || 'Sản phẩm'),
        anh: item.anh || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150',
        phanTramGiam: item.phanTramGiam,
        ngayBatDau: item.ngayBatDau,
        ngayKetThuc: item.ngayKetThuc,
        trangThaiDotGiamGia: item.trangThaiDotGiamGia
      }))
    } else {
      productVariants.value = []
    }
  } catch (err) {
    // Mock Product Variants fallback
    productVariants.value = [
      {
        id: 1,
        maSanPham: 'SP001',
        variantCode: 'SP001-P-BLACK-L',
        size: 'L',
        color: 'Đen',
        stock: 15,
        salePrice: 2500000,
        tenSanPham: 'Áo Polo Bee Stylish',
        anh: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9TQgjfKeTQaHtuEISZO_w6QRzUnju-Oz58CT3bWmw5wDobVDeIYVQdlLpXlazQT0NJ9hPmTpiskN99dHVxbt6eSjX9MQ2l1DUXsM6osInrYLdm7_dghkghIebkWcMrJkt8lu6PSAaeO82R8v_Lkf9fcDxPdWK6R0g8H6oHYvRS0v4aUV6GBkwFA_G-83YJvSa5QX-0KgaJz6WOUqyzqkaVyk6gqe0-6aTSkplqLIyl2HRCyCxp7BBCjFCo-cmwhBkWrvhX-Ur_GI'
      },
      {
        id: 2,
        maSanPham: 'SP001',
        variantCode: 'SP001-P-WHITE-M',
        size: 'M',
        color: 'Trắng',
        stock: 8,
        salePrice: 2450000,
        tenSanPham: 'Áo Polo Bee Stylish',
        anh: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
      },
      {
        id: 3,
        maSanPham: 'SP002',
        variantCode: 'SP002-S-RUBY-XL',
        size: 'XL',
        color: 'Đỏ Ruby',
        stock: 20,
        salePrice: 1800000,
        tenSanPham: 'Áo sơ mi lụa tơ tằm',
        anh: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
      }
    ]
  } finally {
    isProductLoading.value = false
  }
}

const openQtyPicker = (variant) => {
  if (!currentOrder.value) {
    showToast('Vui lòng tạo hoặc chọn một đơn hàng chờ trước!', 'error')
    return
  }
  const available = getAvailableStockForModal(variant)
  if (available < 1) {
    showToast('Sản phẩm đã hết hàng hoặc đã được đặt hết trong các đơn hàng chờ!', 'error')
    return
  }
  qtyPickerVariantId.value = variant.id
  qtyPickerValue.value = 1
}

const closeQtyPicker = () => {
  qtyPickerVariantId.value = null
  qtyPickerValue.value = 1
}

const confirmAddWithQty = async (variant) => {
  const qty = qtyPickerValue.value
  closeQtyPicker()
  await addVariantToCart(variant, qty)
}

const addVariantToCart = async (variant, qty = 1) => {
  if (!currentOrder.value) {
    showToast('Vui lòng tạo hoặc chọn một đơn hàng chờ trước!', 'error')
    return
  }

  // Check if variant already exists in active order
  const existing = currentOrder.value.chiTietList.find(i => i.variantId === variant.id)
  if (existing) {
    const maxAllowed = getMaxAllowedQuantity(existing)
    if (existing.soLuong + qty > maxAllowed) {
      showToast(`Không thể thêm! Số lượng trong giỏ hàng đã đạt giới hạn tồn kho khả dụng (${maxAllowed}).`, 'error')
      return
    }
    const msg = `Đã thêm ${qty} sản phẩm ${variant.tenSanPham} (${variant.color} - ${variant.size}) vào giỏ hàng (Tổng cộng: ${existing.soLuong + qty})!`
    await changeQuantity(existing, qty, msg)
    return
  }

  // Check available stock
  const available = getAvailableStockForModal(variant)
  if (available < qty) {
    showToast(`Không đủ tồn kho! Chỉ còn ${available} sản phẩm khả dụng.`, 'error')
    return
  }

  const effectivePrice = isDiscountActive(variant)
    ? Math.round(variant.salePrice * (100 - variant.phanTramGiam) / 100)
    : variant.salePrice

  const newCartItem = {
    id: currentOrder.value.chiTietList.length ? Math.max(...currentOrder.value.chiTietList.map(i => i.id)) + 1 : 1001,
    variantId: variant.id,
    variantCode: variant.variantCode,
    tenSanPham: variant.tenSanPham,
    color: variant.color,
    size: variant.size,
    donGia: effectivePrice,
    soLuong: qty,
    thanhTien: effectivePrice * qty,
    image: variant.anh,
    stock: variant.stock,
    isLoading: false
  }

  currentOrder.value.chiTietList.push(newCartItem)
  calculatePrices(currentOrder.value)
  saveOrdersState()

  // Optimistic update of variant stock in modal list
  if (!isUsingMock.value) {
    variant.stock = Math.max(0, variant.stock - qty)
  }

  const successMsg = `Đã thêm ${qty} sản phẩm ${variant.tenSanPham} (${variant.color} - ${variant.size}) vào giỏ hàng!`
  showToast(successMsg, 'success')

  if (!isUsingMock.value) {
    try {
      await api.post(`/api/v1/ban-hang/don-hang/${currentOrder.value.id}/them-san-pham`, {
        idChiTietSanPham: variant.id,
        soLuong: qty
      })
      await fetchOrderDetail(currentOrder.value.id)
      await autoApplyBestVoucher(currentOrder.value)
      // Silently refetch variants to ensure accurate stock in modal
      await fetchProductModalVariants(true)
    } catch (err) {
      console.warn('Failed to sync added product to API server:', err.message)
      showToast('Không thể thêm sản phẩm lên máy chủ!', 'error')
      // Rollback local cart
      currentOrder.value.chiTietList = currentOrder.value.chiTietList.filter(i => i.variantId !== variant.id)
      calculatePrices(currentOrder.value)
      // Rollback variant stock in modal list
      if (!isUsingMock.value) {
        variant.stock = variant.stock + qty
      }
    }
  } else {
    await autoApplyBestVoucher(currentOrder.value)
  }
}

// Watch filters in product selection modal
watch([productSearchQuery, selectedColorId, selectedSizeId], () => {
  fetchProductModalVariants()
})

// ---------------- QR CODE SCANNING SERVICE ----------------
const showQrModal = ref(false)
const html5QrCode = ref(null)
const cameraStarted = ref(false)

const startScanner = async () => {
  triggerConfirm(
    'Hệ thống cần quyền truy cập Camera của bạn để quét mã QR sản phẩm. Bạn có muốn mở camera không?',
    async () => {
      showQrModal.value = true
      setTimeout(async () => {
        html5QrCode.value = new Html5Qrcode("qr-reader")
        try {
          const config = { fps: 15, qrbox: { width: 220, height: 220 } }
          await html5QrCode.value.start(
            { facingMode: "environment" },
            config,
            async (decodedText) => {
              await stopScanner()
              showQrModal.value = false
              await handleScanQrSuccess(decodedText)
            },
            () => { /* quiet frame callback */ }
          )
          cameraStarted.value = true
        } catch (err) {
          console.error("Camera startup failed:", err)
          showToast("Không thể mở camera. Vui lòng cấp quyền truy cập camera!", "error")
          showQrModal.value = false
        }
      }, 200)
    },
    'Mở Camera Quét QR'
  )
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

const closeQrModal = async () => {
  await stopScanner()
  showQrModal.value = false
}

const handleScanQrSuccess = async (scannedCode) => {
  try {
    const res = await api.get(`/api/v1/chi-tiet-san-pham/qr-scan/${scannedCode}`)
    const item = res.data
    if (item) {
      const mapped = {
        id: item.id,
        variantCode: item.maChiTietSanPham || item.ma,
        size: sanitizeVietnamese(item.tenKichCo || item.tenKichThuoc),
        color: sanitizeVietnamese(item.tenMauSac),
        stock: item.soLuongTon ?? 0,
        salePrice: item.giaBan ?? 0,
        tenSanPham: item.tenSanPham || 'Áo thun',
        anh: item.anh || '',
        phanTramGiam: item.phanTramGiam,
        ngayBatDau: item.ngayBatDau,
        ngayKetThuc: item.ngayKetThuc,
        trangThaiDotGiamGia: item.trangThaiDotGiamGia
      }
      await addVariantToCart(mapped)
      showToast('Đã nhận diện và thêm thành công từ QR Code!', 'success')
    }
  } catch (err) {
    // Fallback QR simulation
    showToast(`Mã QR quét được: "${scannedCode}". Đang tìm thử trong danh sách...`, 'info')
    // Attempt match in local product mock database
    const localMatch = [
      { id: 1, variantCode: 'SP001-P-BLACK-L', salePrice: 2500000, tenSanPham: 'Áo Polo Bee Stylish', color: 'Đen', size: 'L', anh: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9TQgjfKeTQaHtuEISZO_w6QRzUnju-Oz58CT3bWmw5wDobVDeIYVQdlLpXlazQT0NJ9hPmTpiskN99dHVxbt6eSjX9MQ2l1DUXsM6osInrYLdm7_dghkghIebkWcMrJkt8lu6PSAaeO82R8v_Lkf9fcDxPdWK6R0g8H6oHYvRS0v4aUV6GBkwFA_G-83YJvSa5QX-0KgaJz6WOUqyzqkaVyk6gqe0-6aTSkplqLIyl2HRCyCxp7BBCjFCo-cmwhBkWrvhX-Ur_GI', stock: 15 },
      { id: 2, variantCode: 'SP001-P-WHITE-M', salePrice: 2450000, tenSanPham: 'Áo Polo Bee Stylish', color: 'Trắng', size: 'M', anh: '', stock: 8 }
    ].find(v => v.variantCode === scannedCode)

    if (localMatch) {
      await addVariantToCart(localMatch)
      showToast('Đã tìm thấy và thêm sản phẩm từ mã QR!', 'success')
    } else {
      showToast('Mã QR này không khớp với bất kỳ biến thể sản phẩm nào!', 'error')
    }
  }
}

// ---------------- CUSTOMER SELECTION MODAL LOGIC ----------------
const openCustomerModal = async () => {
  showCustomerModal.value = true
  await fetchCustomerModalList()
}

const fetchCustomerModalList = async () => {
  isCustomerLoading.value = true
  try {
    const params = {
      page: 0,
      size: 50
    }
    if (customerSearchQuery.value.trim()) {
      params.keyword = customerSearchQuery.value.trim()
    }
    const res = await api.get('/api/v1/khach-hang', { params })
    if (res.data && res.data.content) {
      customerList.value = res.data.content
    } else {
      customerList.value = []
    }
  } catch (err) {
    // Mock Customers fallback list
    customerList.value = [
      {
        id: 1,
        hoTen: 'Nguyễn Văn A',
        sdt: '0912345678',
        email: 'nva@example.com',
        diaChiMacDinh: '12 Nguyễn Trãi, Quận 1, TP.HCM',
        diaChiList: [
          { tinhThanhPho: 'TP. Hồ Chí Minh', quanHuyen: 'Quận 1', phuongXa: 'Phường Bến Nghé', diaChiCuThe: '12 Nguyễn Trãi', sdtNguoiNhan: '0912345678', tenNguoiNhan: 'Nguyễn Văn A' }
        ]
      },
      {
        id: 2,
        hoTen: 'Trần Thị B',
        sdt: '0987654321',
        email: 'ttb@example.com',
        diaChiMacDinh: '456 Lê Lợi, Hải Châu, Đà Nẵng',
        diaChiList: [
          { tinhThanhPho: 'Thành phố Đà Nẵng', quanHuyen: 'Quận Hải Châu', phuongXa: 'Phường Thạch Thang', diaChiCuThe: '456 Lê Lợi', sdtNguoiNhan: '0987654321', tenNguoiNhan: 'Trần Thị B' }
        ]
      }
    ]
  } finally {
    isCustomerLoading.value = false
  }
}

const selectCustomer = async (cust) => {
  if (!currentOrder.value) return

  try {
    let fullCust = cust
    if (!isUsingMock.value) {
      const res = await api.get(`/api/v1/khach-hang/${cust.id}`)
      if (res.data) {
        fullCust = res.data
      }
    }

    currentOrder.value.khachHang = fullCust
    currentOrder.value.tenKhachHang = fullCust.hoTen
    currentOrder.value.soDienThoai = fullCust.sdt

    if (!isUsingMock.value) {
      try {
        await api.put(`/api/v1/ban-hang/don-hang/${currentOrder.value.id}/khach-hang`, {}, {
          params: { idKhachHang: fullCust.id }
        })
      } catch (err) {
        console.warn('API customer binding failed:', err.message)
      }
    }

    // Auto fill delivery info if delivery is enabled
    const addrList = fullCust.danhSachDiaChi || fullCust.diaChiList || []
    if (addrList.length > 0) {
      const defaultAddr = addrList.find(a => a.kieuDiaChiLaMacDinh) || addrList[0]
      currentOrder.value.tenNguoiNhan = defaultAddr.tenNguoiNhan || fullCust.hoTen
      currentOrder.value.sdtNguoiNhan = defaultAddr.sdtNguoiNhan || fullCust.sdt
      currentOrder.value.diaChiGiao = defaultAddr.diaChiCuThe || ''
      currentOrder.value.tinhThanhPho = defaultAddr.tinhThanhPho || ''
      currentOrder.value.quanHuyen = defaultAddr.quanHuyen || ''
      currentOrder.value.phuongXa = defaultAddr.phuongXa || ''

      if (defaultAddr.tinhThanhPho) {
        await loadDistrictsForProvince(defaultAddr.tinhThanhPho)
        if (defaultAddr.quanHuyen) {
          await loadWardsForDistrict(defaultAddr.quanHuyen)
          
          if (defaultAddr.phuongXa) {
            const normWardName = normalizeLocationName(defaultAddr.phuongXa)
            const wardObj = wards.value.find(w => normalizeLocationName(w.name) === normWardName)
            if (wardObj) {
              currentOrder.value.phuongXa = wardObj.name
            }
          }
        }
      }

      if (currentOrder.value.loaiHoaDon === 1) {
        await calculateRealGHN()
      }
    } else {
      currentOrder.value.tenNguoiNhan = fullCust.hoTen
      currentOrder.value.sdtNguoiNhan = fullCust.sdt
      currentOrder.value.diaChiGiao = ''
      currentOrder.value.tinhThanhPho = ''
      currentOrder.value.quanHuyen = ''
      currentOrder.value.phuongXa = ''
    }

    showCustomerModal.value = false
    showToast(`Đã gắn khách hàng "${fullCust.hoTen}" vào đơn hàng!`, 'success')
    saveOrdersState()
    await autoApplyBestVoucher(currentOrder.value)
  } catch (err) {
    showToast('Gắn thông tin khách hàng thất bại: ' + (err.response?.data?.message || err.message), 'error')
  }
}

const clearBoundCustomer = async () => {
  if (!currentOrder.value) return
  currentOrder.value.khachHang = null
  currentOrder.value.tenKhachHang = 'Khách lẻ'
  currentOrder.value.soDienThoai = ''
  currentOrder.value.tenNguoiNhan = ''
  currentOrder.value.sdtNguoiNhan = ''
  currentOrder.value.diaChiGiao = ''
  currentOrder.value.tinhThanhPho = ''
  currentOrder.value.quanHuyen = ''
  currentOrder.value.phuongXa = ''
  currentOrder.value.phiVanChuyen = 0
  calculatePrices(currentOrder.value)
  saveOrdersState()
  showToast('Đã gỡ thông tin khách hàng khỏi hóa đơn!', 'info')
  await autoApplyBestVoucher(currentOrder.value)
}

// Watch customer search input
watch(customerSearchQuery, () => {
  fetchCustomerModalList()
})

// Watch activeOrderId to load districts/wards when switching tabs
watch(activeOrderId, async (newVal) => {
  if (!newVal) {
    districts.value = []
    wards.value = []
    return
  }
  const order = orders.value.find(o => o.id === newVal)
  if (order && order.loaiHoaDon === 1) {
    if (order.tinhThanhPho) {
      await loadDistrictsForProvince(order.tinhThanhPho)
      if (order.quanHuyen) {
        await loadWardsForDistrict(order.quanHuyen)
        
        if (order.phuongXa) {
          const normWardName = normalizeLocationName(order.phuongXa)
          const wardObj = wards.value.find(w => normalizeLocationName(w.name) === normWardName)
          if (wardObj) {
            order.phuongXa = wardObj.name
          }
        }
      }
    } else {
      districts.value = []
      wards.value = []
    }
  } else {
    districts.value = []
    wards.value = []
  }
})

// ---------------- CUSTOMER ADDRESS BOOK MODAL LOGIC ----------------
const openAddressBookModal = async () => {
  if (!currentOrder.value || !currentOrder.value.khachHang) {
    showToast('Vui lòng chọn khách hàng trước!', 'warning')
    return
  }
  addressBookCustomer.value = currentOrder.value.khachHang
  await fetchAddressBookList()
  
  newAddressForm.value = {
    tenNguoiNhan: addressBookCustomer.value.hoTen || '',
    sdtNguoiNhan: addressBookCustomer.value.sdt || '',
    diaChiCuThe: '',
    tinhThanhPho: '',
    quanHuyen: '',
    phuongXa: '',
    kieuDiaChiLaMacDinh: false
  }
  addressBookDistricts.value = []
  addressBookWards.value = []
  
  showAddressBookModal.value = true
}

const fetchAddressBookList = async () => {
  if (!addressBookCustomer.value) return
  if (isUsingMock.value) {
    addressBookList.value = addressBookCustomer.value.danhSachDiaChi || addressBookCustomer.value.diaChiList || []
    return
  }
  try {
    const res = await api.get(`/api/v1/khach-hang/${addressBookCustomer.value.id}`)
    if (res.data) {
      addressBookList.value = res.data.danhSachDiaChi || []
      currentOrder.value.khachHang = res.data
    }
  } catch (err) {
    showToast('Không thể tải danh sách địa chỉ khách hàng!', 'error')
  }
}

const onAddressBookProvinceChange = async (event) => {
  addressBookDistricts.value = []
  addressBookWards.value = []
  newAddressForm.value.quanHuyen = ''
  newAddressForm.value.phuongXa = ''
  
  const pName = event.target.value
  if (!pName) return
  
  const provObj = provinces.value.find(p => p.name === pName)
  if (provObj) {
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
        addressBookDistricts.value = json.data.map(d => ({
          name: d.DistrictName,
          code: d.DistrictID
        })).sort((a, b) => a.name.localeCompare(b.name))
        return
      } else {
        throw new Error(json.message || 'GHN API error code ' + json.code)
      }
    } catch (err) {
      console.warn(err)
    }
    
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${provObj.code}?depth=2`)
      const data = await res.json()
      addressBookDistricts.value = data.districts || []
    } catch (err) {
      console.error(err)
    }
  }
}

const onAddressBookDistrictChange = async (event) => {
  addressBookWards.value = []
  newAddressForm.value.phuongXa = ''
  
  const dName = event.target.value
  if (!dName) return
  
  const distObj = addressBookDistricts.value.find(d => d.name === dName)
  if (distObj) {
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
        addressBookWards.value = json.data.map(w => ({
          name: w.WardName,
          code: w.WardCode
        })).sort((a, b) => a.name.localeCompare(b.name))
        return
      } else {
        throw new Error(json.message || 'GHN API error code ' + json.code)
      }
    } catch (err) {
      console.warn(err)
    }
    
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${distObj.code}?depth=2`)
      const data = await res.json()
      addressBookWards.value = data.wards || []
    } catch (err) {
      console.error(err)
    }
  }
}

const addNewAddress = async () => {
  if (!addressBookCustomer.value) return
  const form = newAddressForm.value
  if (!form.tenNguoiNhan || !form.sdtNguoiNhan || !form.tinhThanhPho || !form.quanHuyen || !form.phuongXa || !form.diaChiCuThe) {
    showToast('Vui lòng nhập đầy đủ các trường thông tin bắt buộc (*)!', 'error')
    return
  }
  
  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
  if (!phoneRegex.test(form.sdtNguoiNhan)) {
    showToast('Số điện thoại người nhận không hợp lệ!', 'error')
    return
  }
  
  try {
    if (isUsingMock.value) {
      const newAddr = {
        id: Math.floor(Math.random() * 1000) + 2000,
        tenNguoiNhan: form.tenNguoiNhan,
        sdtNguoiNhan: form.sdtNguoiNhan,
        diaChiCuThe: form.diaChiCuThe,
        tinhThanhPho: form.tinhThanhPho,
        quanHuyen: form.quanHuyen,
        phuongXa: form.phuongXa,
        kieuDiaChiLaMacDinh: form.kieuDiaChiLaMacDinh
      }
      
      const list = addressBookCustomer.value.danhSachDiaChi || addressBookCustomer.value.diaChiList || []
      if (form.kieuDiaChiLaMacDinh) {
        list.forEach(a => a.kieuDiaChiLaMacDinh = false)
      }
      if (list.length === 0) {
        newAddr.kieuDiaChiLaMacDinh = true
      }
      list.push(newAddr)
      addressBookCustomer.value.danhSachDiaChi = list
      addressBookCustomer.value.diaChiList = list
      
      showToast('Thêm mới địa chỉ thành công (Mock)!', 'success')
      await fetchAddressBookList()
      
      newAddressForm.value = {
        tenNguoiNhan: addressBookCustomer.value.hoTen || '',
        sdtNguoiNhan: addressBookCustomer.value.sdt || '',
        diaChiCuThe: '',
        tinhThanhPho: '',
        quanHuyen: '',
        phuongXa: '',
        kieuDiaChiLaMacDinh: false
      }
      addressBookDistricts.value = []
      addressBookWards.value = []
    } else {
      await api.post(`/api/v1/khach-hang/${addressBookCustomer.value.id}/dia-chi`, {
        tenNguoiNhan: form.tenNguoiNhan,
        sdtNguoiNhan: form.sdtNguoiNhan,
        diaChiCuThe: form.diaChiCuThe,
        tinhThanhPho: form.tinhThanhPho,
        quanHuyen: form.quanHuyen,
        phuongXa: form.phuongXa,
        kieuDiaChiLaMacDinh: form.kieuDiaChiLaMacDinh
      })
      
      showToast('Thêm mới địa chỉ thành công!', 'success')
      await fetchAddressBookList()
      
      newAddressForm.value = {
        tenNguoiNhan: addressBookCustomer.value.hoTen || '',
        sdtNguoiNhan: addressBookCustomer.value.sdt || '',
        diaChiCuThe: '',
        tinhThanhPho: '',
        quanHuyen: '',
        phuongXa: '',
        kieuDiaChiLaMacDinh: false
      }
      addressBookDistricts.value = []
      addressBookWards.value = []
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || 'Không thể thêm địa chỉ mới!'
    showToast(errorMsg, 'error')
  }
}

const setAddressDefault = async (addrId) => {
  if (!addressBookCustomer.value) return
  try {
    await api.patch(`/api/v1/khach-hang/${addressBookCustomer.value.id}/dia-chi/${addrId}/mac-dinh`)
    showToast('Đặt địa chỉ mặc định thành công!', 'success')
    await fetchAddressBookList()
  } catch (err) {
    showToast('Không thể đặt địa chỉ mặc định!', 'error')
  }
}

const selectAddressForDelivery = async (addr) => {
  if (!currentOrder.value) return
  
  currentOrder.value.tenNguoiNhan = addr.tenNguoiNhan || currentOrder.value.khachHang.hoTen
  currentOrder.value.sdtNguoiNhan = addr.sdtNguoiNhan || currentOrder.value.khachHang.sdt
  currentOrder.value.diaChiGiao = addr.diaChiCuThe || ''
  currentOrder.value.tinhThanhPho = addr.tinhThanhPho || ''
  currentOrder.value.quanHuyen = addr.quanHuyen || ''
  currentOrder.value.phuongXa = addr.phuongXa || ''
  
  if (addr.tinhThanhPho) {
    await loadDistrictsForProvince(addr.tinhThanhPho)
    if (addr.quanHuyen) {
      await loadWardsForDistrict(addr.quanHuyen)
      
      if (addr.phuongXa) {
        const normWardName = normalizeLocationName(addr.phuongXa)
        const wardObj = wards.value.find(w => normalizeLocationName(w.name) === normWardName)
        if (wardObj) {
          currentOrder.value.phuongXa = wardObj.name
        }
      }
    }
  }
  
  if (currentOrder.value.loaiHoaDon === 1) {
    await calculateRealGHN()
  }
  
  showAddressBookModal.value = false
  showToast('Đã chọn địa chỉ nhận hàng!', 'success')
}

// ---------------- VOUCHER HANDLING ----------------
const voucherCodeInput = ref('')

const applyVoucherCode = async () => {
  if (!currentOrder.value) return
  const code = voucherCodeInput.value.trim()
  if (!code) {
    showToast('Vui lòng nhập mã giảm giá!', 'error')
    return
  }

  try {
    if (isUsingMock.value) {
      // Local voucher verification mockup
      const mockVouchers = [
        { id: 1, maPhieuGiamGia: 'SALE15', tenPhieuGiamGia: 'Voucher 15%', loaiGiam: 0, giaTri: 15, dieuKienGiam: 500000, giaGiamToiDa: 1000000 },
        { id: 2, maPhieuGiamGia: 'SALE500', tenPhieuGiamGia: 'Giảm 500k', loaiGiam: 1, giaTri: 500000, dieuKienGiam: 2000000, giaGiamToiDa: 500000 }
      ]
      const found = mockVouchers.find(v => v.maPhieuGiamGia.toUpperCase() === code.toUpperCase())
      if (!found) {
        showToast('Mã giảm giá không hợp lệ hoặc đã hết hạn!', 'error')
        return
      }

      if (currentOrder.value.soTienGoc < found.dieuKienGiam) {
        showToast(`Đơn hàng chưa đạt điều kiện tối thiểu ${formatCurrency(found.dieuKienGiam)}!`, 'error')
        return
      }

      currentOrder.value.voucher = found
      calculatePrices(currentOrder.value)
      saveOrdersState()
      voucherCodeInput.value = ''
      showToast('Áp dụng mã giảm giá thành công (Mock)!', 'success')
    } else {
      const res = await api.post(`/api/v1/ban-hang/don-hang/${currentOrder.value.id}/voucher`, {
        maPhieuGiamGia: code
      })
      if (res.data) {
        showToast('Áp dụng mã giảm giá thành công!', 'success')
        await loadOrders()
        voucherCodeInput.value = ''
      }
    }
  } catch (err) {
    showToast(err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện!', 'error')
  }
}

const removeAppliedVoucher = async () => {
  if (!currentOrder.value || !currentOrder.value.voucher) return

  try {
    if (isUsingMock.value) {
      currentOrder.value.voucher = null
      calculatePrices(currentOrder.value)
      saveOrdersState()
      showToast('Đã gỡ bỏ mã giảm giá (Mock)!', 'info')
    } else {
      await api.delete(`/api/v1/ban-hang/don-hang/${currentOrder.value.id}/voucher`)
      showToast('Đã gỡ bỏ mã giảm giá thành công!', 'success')
      await loadOrders()
    }
  } catch (err) {
    showToast('Gỡ mã giảm giá thất bại!', 'error')
  }
}

// ---------------- DELIVERY CONFIG ----------------
const handleDeliveryToggle = () => {
  if (!currentOrder.value) return
  if (currentOrder.value.loaiHoaDon === 0) {
    currentOrder.value.loaiHoaDon = 1 // Giao hàng
    // Setup initial fields from customer bound
    if (currentOrder.value.khachHang) {
      currentOrder.value.tenNguoiNhan = currentOrder.value.khachHang.hoTen
      currentOrder.value.sdtNguoiNhan = currentOrder.value.khachHang.sdt
    }
  } else {
    currentOrder.value.loaiHoaDon = 0 // Tại quầy
    currentOrder.value.phiVanChuyen = 0
  }
  calculatePrices(currentOrder.value)
  saveOrdersState()
}

// ---------------- CHECKOUT & ORDER CONFIRMATION ----------------
const printReceiptWindow = (order) => {
  const products = order.chiTietList || []
  const productRows = products.map((item, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>
        <div class="product-name">${item.tenSanPham}</div>
      </td>
      <td class="center">${item.color}</td>
      <td class="center">${item.size}</td>
      <td class="right">${formatCurrency(item.donGia)}</td>
      <td class="center">${item.soLuong}</td>
      <td class="right bold">${formatCurrency(item.thanhTien)}</td>
    </tr>
  `).join('')

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hóa đơn ${order.maHoaDon}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 12px; background: #ffffff; color: #000000; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.35; }
    .invoice { width: 100%; max-width: 760px; margin: 0 auto; background: #ffffff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000000; padding-bottom: 10px; margin-bottom: 10px; }
    .shop-name { font-size: 22px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px; }
    .shop-info { font-size: 10.5px; margin: 1px 0; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; }
    .invoice-code { margin-top: 4px; font-size: 13px; font-weight: 700; }
    .top-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
    .box { border: 1px solid #000000; padding: 8px; break-inside: avoid; }
    .box-title { font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #000000; padding-bottom: 4px; }
    .row { display: grid; grid-template-columns: 90px 1fr; gap: 8px; padding: 2px 0; }
    .label { font-weight: 700; }
    .value { text-align: right; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #000000; padding: 5px; vertical-align: top; }
    th { font-size: 10px; text-transform: uppercase; text-align: center; font-weight: 800; }
    td { font-size: 10.5px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 800; }
    .product-name { font-weight: 800; }
    .bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .summary-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .summary-row.total { border-top: 1px solid #000000; margin-top: 4px; padding-top: 6px; font-size: 14px; font-weight: 800; }
    .note-line { margin-bottom: 5px; }
    .footer-note { margin-top: 10px; text-align: center; font-size: 10.5px; font-style: italic; }
    .print-actions { max-width: 760px; margin: 12px auto 0; display: flex; justify-content: flex-end; gap: 8px; }
    .btn { padding: 8px 14px; border: 1px solid #000000; background: #ffffff; color: #000000; font-weight: 700; cursor: pointer; }
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      body { padding: 0; }
      .invoice { max-width: none; width: 100%; }
      .print-actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <h2 class="shop-name">Bee Stylish</h2>
        <p class="shop-info">Địa chỉ: 351/6A Phan Đình Phùng, phường 3, TP Bảo Lộc</p>
        <p class="shop-info">Hotline: 0987 654 321</p>
        <p class="shop-info">Email: beestylish@gmail.com</p>
      </div>
      <div class="invoice-title">
        <h1>Hóa đơn bán hàng</h1>
        <div class="invoice-code">Mã hóa đơn: ${order.maHoaDon}</div>
      </div>
    </div>
    <div class="top-info">
      <div class="box">
        <div class="box-title">Thông tin khách hàng</div>
        <div class="row"><div class="label">Khách hàng</div><div class="value">${order.tenKhachHang}</div></div>
        <div class="row"><div class="label">SĐT</div><div class="value">${order.soDienThoai || '-'}</div></div>
        <div class="row"><div class="label">Địa chỉ</div><div class="value">${order.diaChiGiao || '-'}</div></div>
      </div>
      <div class="box">
        <div class="box-title">Thông tin hóa đơn</div>
        <div class="row"><div class="label">Hình thức</div><div class="value">${order.loaiHoaDon === 1 ? 'Giao hàng' : 'Mua tại quầy'}</div></div>
        <div class="row"><div class="label">Ngày tạo</div><div class="value">${formatDateTime(new Date())}</div></div>
        <div class="row"><div class="label">Người lập</div><div class="value">Nguyễn Hoàng Admin</div></div>
      </div>
    </div>
    <div class="box">
      <div class="box-title">Danh sách sản phẩm</div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px;">STT</th>
            <th>Sản phẩm</th>
            <th style="width: 70px;">Màu</th>
            <th style="width: 55px;">Size</th>
            <th style="width: 95px;">Đơn giá</th>
            <th style="width: 45px;">SL</th>
            <th style="width: 105px;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${productRows || `<tr><td colspan="7" class="center">Không có sản phẩm</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="bottom">
      <div class="box">
        <div class="box-title">Giảm giá & ghi chú</div>
        <div class="note-line"><strong>Phiếu giảm giá:</strong> ${order.voucher ? order.voucher.maPhieuGiamGia : 'Không áp dụng'}</div>
        <div class="note-line"><strong>Ghi chú:</strong> Đặt hàng tại quầy thanh toán</div>
      </div>
      <div class="box">
        <div class="box-title">Thanh toán</div>
        <div class="summary-row"><span>Số tiền gốc</span><strong>${formatCurrency(order.soTienGoc)}</strong></div>
        <div class="summary-row"><span>Giảm giá</span><strong>- ${formatCurrency(order.soTienGiam)}</strong></div>
        <div class="summary-row"><span>Phí vận chuyển</span><strong>${formatCurrency(order.phiVanChuyen)}</strong></div>
        <div class="summary-row total"><span>Tổng thanh toán</span><span>${formatCurrency(order.tongTienThanhToan)}</span></div>
      </div>
    </div>
    <div class="footer-note">Cảm ơn quý khách đã mua hàng tại Bee Stylish!</div>
  </div>
  <div class="print-actions">
    <button class="btn" onclick="window.close()">Đóng</button>
    <button class="btn" onclick="window.print()">In hóa đơn</button>
  </div>
</body>
</html>
  `

  const printWindow = window.open('', '_blank', 'width=1000,height=800')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.focus()
    }
  } else {
    showToast('Trình duyệt đã chặn popup. Vui lòng cho phép popup để in hóa đơn!', 'error')
  }
}

const openPaymentModal = () => {
  if (!currentOrder.value) return
  showPaymentModal.value = true
}

const savePaymentDataAndCloseModal = (paymentData) => {
  if (!currentOrder.value) return
  currentOrder.value.tienMat = Number(paymentData.tienMat || 0)
  currentOrder.value.tienChuyenKhoan = Number(paymentData.tienChuyenKhoan || 0)
  currentOrder.value.khachThanhToan = currentOrder.value.tienMat + currentOrder.value.tienChuyenKhoan
  currentOrder.value.ghiChuThanhToan = paymentData.ghiChu || ''
  showPaymentModal.value = false
  saveOrdersState()
}

const getCheckoutPaymentMethodLabel = (order) => {
  if (!order) return ''
  const tm = Number(order.tienMat || 0)
  const ck = Number(order.tienChuyenKhoan || 0)
  if (tm > 0 && ck > 0) return 'Tiền mặt & Chuyển khoản'
  if (ck > 0) return 'Chuyển khoản'
  if (tm > 0) return 'Tiền mặt'
  if (order.loaiHoaDon === 1) return 'Chưa thanh toán (COD)'
  return 'Tiền mặt'
}

const getFinalCheckoutPaymentData = (order) => {
  if (!order) return { tienMat: 0, tienChuyenKhoan: 0, ghiChu: '' }
  const tm = Number(order.tienMat || 0)
  const ck = Number(order.tienChuyenKhoan || 0)
  const total = Number(order.tongTienThanhToan || 0)
  
  if (tm === 0 && ck === 0) {
    if (order.loaiHoaDon === 0) {
      return {
        tienMat: total,
        tienChuyenKhoan: 0,
        ghiChu: order.ghiChuThanhToan || ''
      }
    } else {
      return {
        tienMat: 0,
        tienChuyenKhoan: 0,
        ghiChu: order.ghiChuThanhToan || ''
      }
    }
  }
  
  return {
    tienMat: tm,
    tienChuyenKhoan: ck,
    ghiChu: order.ghiChuThanhToan || ''
  }
}

const getKhachThanhToanDisplayVal = (order) => {
  if (!order) return 0
  const tm = Number(order.tienMat || 0)
  const ck = Number(order.tienChuyenKhoan || 0)
  if (tm === 0 && ck === 0) {
    if (order.loaiHoaDon === 0) return order.tongTienThanhToan
    return 0
  }
  return order.khachThanhToan || (tm + ck)
}

const submitFinalCheckout = async () => {
  if (!currentOrder.value) return
  const order = currentOrder.value
  const paymentData = getFinalCheckoutPaymentData(order)
  
  showCheckoutConfirmModal.value = false
  await executeCheckout(order, paymentData)
}

const executeCheckout = async (order, paymentData) => {
  isLoading.value = true
  try {
    if (isUsingMock.value) {
      // Local storage checkout flow
      orders.value = orders.value.filter(o => o.id !== order.id)
      saveMockOrders(orders.value)
      
      showToast(`Đã thanh toán hóa đơn ${order.maHoaDon} thành công (Mock)!`, 'success')
      router.push({ name: 'invoices' })

      if (orders.value.length > 0) {
        activeOrderId.value = orders.value[0].id
      } else {
        activeOrderId.value = null
      }
      showPaymentModal.value = false
    } else {
      // 1. Update recipient / delivery details
      const diaChiFull = order.loaiHoaDon === 1 
        ? `${order.diaChiGiao}, ${order.phuongXa}, ${order.quanHuyen}, ${order.tinhThanhPho}`
        : null;

      await api.put(`/api/v1/ban-hang/${order.id}/thong-tin-nhan-hang`, {
        idKhachHang: order.khachHang?.id || null,
        isGiaoHang: order.loaiHoaDon === 1,
        tenNguoiNhan: order.loaiHoaDon === 1 ? order.tenNguoiNhan : null,
        sdtNguoiNhan: order.loaiHoaDon === 1 ? order.sdtNguoiNhan : null,
        diaChiChiTiet: diaChiFull,
        phiVanChuyen: order.loaiHoaDon === 1 ? Number(order.phiVanChuyen || 0) : 0
      })

      // 2. Perform checkout / payment
      const res = await api.post(`/api/v1/ban-hang/${order.id}/thanh-toan`, {
        tienMat: Number(paymentData.tienMat || 0),
        tienChuyenKhoan: Number(paymentData.tienChuyenKhoan || 0),
        ghiChu: paymentData.ghiChu || ''
      })

      const finalInvoiceId = res.data || order.id

      // 3. Clear local states & redirect
      showToast(`Thanh toán đơn hàng ${order.maHoaDon} thành công!`, 'success')
      showPaymentModal.value = false

      // Remove checkout order from list
      orders.value = orders.value.filter(o => o.id !== order.id)
      if (orders.value.length > 0) {
        activeOrderId.value = orders.value[0].id
      } else {
        activeOrderId.value = null
      }

      // Redirect to invoice details
      router.push({ name: 'invoice-detail', params: { id: finalInvoiceId } })
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || 'Thanh toán đơn hàng thất bại. Vui lòng thử lại!'
    showToast(errorMsg, 'error')
  } finally {
    isLoading.value = false
  }
}

const confirmCheckoutOrder = () => {
  if (!currentOrder.value) return
  const order = currentOrder.value

  if (order.chiTietList.length === 0) {
    showToast('Giỏ hàng trống! Vui lòng thêm sản phẩm trước khi thanh toán.', 'error')
    return
  }

  if (order.loaiHoaDon === 1) { // Shipping validation
    if (!order.tenNguoiNhan || !order.sdtNguoiNhan || !order.diaChiGiao || !order.tinhThanhPho || !order.quanHuyen || !order.phuongXa) {
      showToast('Vui lòng nhập đầy đủ thông tin giao hàng (Người nhận, SĐT, Địa chỉ chi tiết, Tỉnh/Thành, Quận/Huyện, Phường/Xã)!', 'error')
      return
    }
    const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
    if (!phoneRegex.test(order.sdtNguoiNhan)) {
      showToast('Số điện thoại người nhận không hợp lệ!', 'error')
      return
    }
  }

  if (order.loaiHoaDon === 0) { // Tại quầy validation
    const paid = Number(order.tienMat || 0) + Number(order.tienChuyenKhoan || 0)
    if (paid < order.tongTienThanhToan) {
      showToast(`Khách chưa thanh toán đủ tiền! Vui lòng thanh toán thêm ${formatCurrency(order.tongTienThanhToan - paid)}.`, 'warning')
      return
    }
  }

  showCheckoutConfirmModal.value = true
}

onMounted(async () => {
  await fetchActiveVouchers()
  await loadOrders()
  await fetchProvinces()
})

onUnmounted(async () => {
  await stopScanner()
})
</script>

<template>
  <div class="max-w-full mx-auto space-y-6" data-component="POSManagement">
    
    <!-- Title and Add Tab Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex flex-col">
        <h1 class="text-3xl font-bold text-[#0D2533] font-headline-md tracking-tight">Bán hàng</h1>
        <p class="text-sm text-gray-500">Người bán: {{ loggedInEmployeeName }}</p>
      </div>
      <button 
        @click="createNewOrder"
        class="bg-[#ef972d] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:bg-[#ef972d]/90 transition-all font-body-md cursor-pointer"
      >
        <span class="material-symbols-outlined">add</span> Tạo đơn hàng
      </button>
    </div>

    <!-- Active tabs list -->
    <div v-if="orders.length === 0" class="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center text-gray-400 space-y-3">
      <span class="material-symbols-outlined text-5xl">receipt_long</span>
      <p class="text-sm font-semibold">Chưa có đơn hàng chờ nào được mở. Vui lòng bấm "Tạo đơn hàng" để bắt đầu!</p>
    </div>

    <div v-else>
      <div class="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
        <button
          v-for="order in orders"
          :key="order.id"
          @click="activeOrderId = order.id"
          :class="activeOrderId === order.id 
            ? 'bg-gray-100 border-t border-l border-r border-gray-200 text-[#0D2533]' 
            : 'text-gray-400 hover:text-gray-600'"
          class="px-4 py-2 rounded-t-lg flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer outline-none"
        >
          <span>{{ order.maHoaDon }} - {{ order.tenKhachHang }}</span>
          <span class="bg-[#ef972d] text-white text-[10px] px-1.5 rounded-full" v-if="order.chiTietList.length > 0">
            {{ order.chiTietList.reduce((sum, item) => sum + item.soLuong, 0) }}
          </span>
          <span 
            @click.stop="closeOrderTab(order)"
            class="material-symbols-outlined text-sm cursor-pointer hover:text-red-500 p-0.5 rounded hover:bg-gray-200"
          >close</span>
        </button>
      </div>

      <!-- Main Order detail panel -->
      <div v-if="currentOrder" class="space-y-6">
        
        <!-- Cart / Product list card -->
        <div class="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden mb-6">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 class="text-lg font-bold text-[#0D2533]">Sản phẩm giỏ hàng</h2>
            <div class="flex gap-3">
              <button 
                @click="startScanner"
                class="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span class="material-symbols-outlined text-sm">qr_code_scanner</span> Quét QR sản phẩm
              </button>
              <button 
                @click="openProductModal"
                class="px-4 py-2 bg-[#ef972d] text-white rounded-lg text-sm font-medium hover:bg-[#ef972d]/90 flex items-center gap-2 cursor-pointer transition-all"
              >
                <span class="material-symbols-outlined text-sm">add</span> Thêm sản phẩm
              </button>
            </div>
          </div>

          <!-- Cart Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="bg-gray-50 text-gray-600 text-sm font-semibold border-b border-gray-100">
                <tr>
                  <th class="px-6 py-3 w-16 text-center">STT</th>
                  <th class="px-6 py-3">Sản phẩm</th>
                  <th class="px-6 py-3">Đơn giá</th>
                  <th class="px-6 py-3">Số lượng</th>
                  <th class="px-6 py-3">Thành tiền</th>
                  <th class="px-6 py-3 text-center w-24">Hành động</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 bg-white">
                <tr v-if="currentOrder.chiTietList.length === 0">
                  <td colspan="6" class="px-6 py-10 text-center text-gray-400 font-medium">
                    Giỏ hàng trống! Bấm "Thêm sản phẩm" hoặc "Quét QR" để chọn đồ.
                  </td>
                </tr>
                <tr 
                  v-for="(item, index) in currentOrder.chiTietList" 
                  :key="item.id"
                  class="hover:bg-gray-50/50 transition-colors"
                >
                  <td class="px-6 py-4 text-center text-gray-500 font-medium">
                    {{ index + 1 }}
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                        <img 
                          class="w-full h-full object-cover" 
                          :src="formatImage(item.image)"
                          alt="Variant Image"
                        />
                      </div>
                      <div>
                        <p class="font-semibold text-[#0D2533]">{{ item.tenSanPham }}</p>
                        <p class="text-xs text-gray-500">Màu: {{ item.color }} | Kích cỡ: {{ item.size }}</p>
                        <p class="text-xs text-gray-400 mt-0.5 font-mono">Mã: {{ item.variantCode }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm font-medium text-gray-700">
                    {{ formatCurrency(item.donGia) }}
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center border border-gray-200 rounded-lg w-fit overflow-hidden bg-white shadow-sm" :class="{ 'opacity-60 cursor-not-allowed select-none bg-gray-50': item.isLoading }">
                      <button 
                        @click="changeQuantity(item, -1)"
                        :disabled="item.isLoading"
                        class="px-3 py-1 hover:bg-gray-100 text-gray-600 transition-colors font-bold disabled:pointer-events-none"
                      >-</button>
                      <input 
                        class="w-12 text-center border-none focus:ring-0 text-sm py-1 font-semibold text-gray-800 disabled:bg-gray-50" 
                        type="text" 
                        :value="item.soLuong"
                        :disabled="item.isLoading"
                        @blur="updateQuantityInput(item, $event)"
                        @keyup.enter="$event.target.blur()"
                      />
                      <button 
                        @click="changeQuantity(item, 1)"
                        :disabled="item.isLoading"
                        class="px-3 py-1 hover:bg-gray-100 text-gray-600 transition-colors font-bold disabled:pointer-events-none"
                      >+</button>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-semibold text-[#ef972d]">
                    {{ formatCurrency(item.thanhTien) }}
                  </td>
                  <td class="px-6 py-4 text-center">
                    <button 
                      @click="removeCartItem(item)"
                      :disabled="item.isLoading"
                      class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                      title="Xóa sản phẩm"
                    >
                      <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end">
            <p class="text-lg font-bold text-[#0D2533]">Tạm tính: <span class="text-[#ef972d]">{{ formatCurrency(currentOrder.soTienGoc) }}</span></p>
          </div>
        </div>

        <!-- Details, Customer and Payment checkout grid -->
        <div class="grid grid-cols-12 gap-6 pos-grid">
          
          <!-- Left box: Customer binding -->
          <div class="col-span-12 lg:col-span-5 pos-left-col">
            <div class="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 space-y-6 flex flex-col justify-between h-full">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-bold text-[#0D2533]">Thông tin khách hàng</h2>
                  <div class="flex gap-2 items-center">
                    <button 
                      @click="openCustomerModal"
                      class="text-xs font-semibold text-[#ef972d] hover:underline cursor-pointer bg-transparent border-none"
                    >Chọn khách hàng</button>
                    <span class="text-gray-300 text-xs" v-if="currentOrder.khachHang">|</span>
                    <button 
                      v-if="currentOrder.khachHang"
                      @click="openAddressBookModal"
                      class="text-xs font-semibold text-[#ef972d] hover:underline cursor-pointer bg-transparent border-none"
                    >Sổ địa chỉ</button>
                    <span class="text-gray-300 text-xs" v-if="currentOrder.khachHang">|</span>
                    <button 
                      v-if="currentOrder.khachHang"
                      @click="clearBoundCustomer"
                      class="text-xs font-semibold text-red-500 hover:underline cursor-pointer bg-transparent border-none"
                    >Gỡ khách</button>
                  </div>
                </div>

                <div class="p-4 rounded-xl border border-gray-100 bg-gray-50/40 flex items-center justify-between" v-if="currentOrder.khachHang">
                  <div class="space-y-1">
                    <p class="font-bold text-sm text-[#0D2533]">{{ currentOrder.khachHang.hoTen }}</p>
                    <p class="text-xs text-gray-500">SĐT: {{ currentOrder.khachHang.sdt }}</p>
                    <p class="text-xs text-gray-400 truncate max-w-[200px]" :title="currentOrder.khachHang.email">Email: {{ currentOrder.khachHang.email }}</p>
                  </div>
                  <span class="material-symbols-outlined text-green-500">verified_user</span>
                </div>
                <div class="p-4 rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-400 py-6" v-else>
                  Đơn đang đặt dưới dạng "Khách lẻ" (Mua ẩn danh)
                </div>

                <!-- Shipping Address details (if shipping toggled) -->
                <div class="space-y-4 pt-2 border-t border-gray-100" v-show="currentOrder.loaiHoaDon === 1">
                  <h3 class="text-sm font-bold text-gray-700">Địa chỉ nhận hàng</h3>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-gray-600">Họ và tên người nhận</label>
                    <input 
                      v-model="currentOrder.tenNguoiNhan"
                      class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none" 
                      placeholder="Nhập tên người nhận" 
                      type="text"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-gray-600">Số điện thoại</label>
                    <input 
                      v-model="currentOrder.sdtNguoiNhan"
                      class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none" 
                      placeholder="Số điện thoại nhận hàng" 
                      type="text"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-gray-600">Địa chỉ cụ thể</label>
                    <input 
                      v-model="currentOrder.diaChiGiao"
                      class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none" 
                      placeholder="Số nhà, ngõ ngách, tên đường..." 
                      type="text"
                    />
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <select 
                      v-model="currentOrder.tinhThanhPho"
                      @change="onProvinceChange"
                      class="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-[#ef972d] focus:border-[#ef972d] outline-none cursor-pointer"
                    >
                      <option value="">Tỉnh/Thành</option>
                      <option v-for="p in provinces" :key="p.code" :value="p.name">{{ p.name }}</option>
                    </select>
                    <select 
                      v-model="currentOrder.quanHuyen"
                      @change="onDistrictChange"
                      class="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-[#ef972d] focus:border-[#ef972d] outline-none cursor-pointer"
                      :disabled="districts.length === 0"
                    >
                      <option value="">Quận/Huyện</option>
                      <option v-for="d in districts" :key="d.code" :value="d.name">{{ d.name }}</option>
                    </select>
                    <select 
                      v-model="currentOrder.phuongXa"
                      @change="onWardChange"
                      class="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-[#ef972d] focus:border-[#ef972d] outline-none cursor-pointer"
                      :disabled="wards.length === 0"
                    >
                      <option value="">Phường/Xã</option>
                      <option v-for="w in wards" :key="w.code" :value="w.name">{{ w.name }}</option>
                    </select>
                  </div>
                  
                  <!-- Shipping Fee Calculator (GHN) -->
                  <div class="flex flex-col gap-1.5 mt-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-semibold text-gray-600">Phí vận chuyển</span>
                        <div class="flex items-center gap-0.5 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 shadow-sm">
                          <span class="text-[9px] font-black text-orange-600 tracking-wide select-none">GHN</span>
                          <span class="text-[8px] text-blue-800 font-bold select-none">Express</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="relative w-36">
                          <input 
                            type="text" 
                            :value="formatCurrency(currentOrder.phiVanChuyen)" 
                            class="w-full text-right pr-3 pl-2 py-1.5 bg-gray-100/80 border border-gray-200 rounded-lg text-sm font-semibold outline-none text-gray-700" 
                            readonly 
                          />
                        </div>
                        <button 
                          type="button" 
                          @click="calculateRealGHN" 
                          class="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-sm"
                          title="Tính lại phí vận chuyển"
                        >
                          <span class="material-symbols-outlined text-sm font-semibold">refresh</span>
                        </button>
                      </div>
                    </div>
                    <div class="p-2 bg-blue-50/50 border border-blue-100 rounded-lg text-[10px] text-blue-700 leading-relaxed mt-1 flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[12px]">info</span>
                      <span>Phí vận chuyển lấy theo GHN.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right box: Shipping fee & checkout validation -->
          <div class="col-span-12 lg:col-span-7 pos-right-col">
            <div class="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 space-y-6">
              
              <!-- Header info + Shipping Toggle switch -->
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-bold text-[#0D2533]">Thông tin thanh toán</h2>
                <div class="flex items-center gap-3">
                  <span class="text-sm font-semibold text-gray-600">{{ currentOrder?.loaiHoaDon === 1 ? 'Giao hàng' : 'Tại quầy' }}</span>
                  
                  <button
                    @click="handleDeliveryToggle"
                    :aria-checked="currentOrder.loaiHoaDon === 1 ? 'true' : 'false'"
                    :class="currentOrder.loaiHoaDon === 1 ? 'bg-emerald-500' : 'bg-gray-300'"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer"
                    role="switch"
                  >
                    <span
                      :class="currentOrder.loaiHoaDon === 1 ? 'translate-x-6' : 'translate-x-1'"
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow"
                    ></span>
                  </button>
                </div>
              </div>

              <div class="space-y-4">
                
                <!-- Voucher Input Row -->
                <div class="grid grid-cols-12 gap-3 items-end">
                  <div class="col-span-9">
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Mã phiếu giảm giá</label>
                    <div class="relative flex items-center">
                      <input 
                        v-model="voucherCodeInput"
                        @keyup.enter="applyVoucherCode"
                        class="w-full pl-4 pr-20 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none" 
                        placeholder="Nhập mã (Enter để áp dụng)" 
                        type="text"
                      />
                      <button 
                        type="button"
                        @click="openVoucherSelectionModal"
                        class="absolute right-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-[#ef972d] hover:from-orange-600 hover:to-[#ef972d]/90 text-white rounded-md text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                      >
                        Chọn mã
                      </button>
                    </div>
                  </div>
                  <div class="col-span-3">
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Giá trị</label>
                    <div class="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-center font-bold text-gray-700 min-h-[38px] flex items-center justify-center">
                      {{ currentOrder.voucher ? (currentOrder.voucher.loaiGiam === 0 ? currentOrder.voucher.giaTri + '%' : formatCurrency(currentOrder.voucher.giaTri)) : '0' }}
                    </div>
                  </div>
                </div>

                <!-- Active Voucher State badge -->
                <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm space-y-1 relative" v-if="currentOrder.voucher">
                  <button 
                    @click="removeAppliedVoucher"
                    class="absolute top-3 right-3 text-red-500 hover:text-red-700 font-semibold text-xs cursor-pointer bg-white px-2 py-1 rounded border border-red-200 shadow-sm"
                  >Gỡ bỏ</button>
                  <p class="text-sm font-semibold flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                    <span>Áp dụng thành công phiếu giảm giá <span class="font-bold">{{ currentOrder.voucher.maPhieuGiamGia }} ({{ currentOrder.voucher.loaiGiam === 0 ? currentOrder.voucher.giaTri + '%' : formatCurrency(currentOrder.voucher.giaTri) }})</span></span>
                  </p>
                  <p class="text-sm font-semibold pl-6">Giảm {{ formatCurrency(currentOrder.soTienGiam) }}</p>
                  <p class="text-xs text-emerald-600 pl-6 leading-relaxed mt-2">
                    Hệ thống kiểm tra ưu đãi theo thời gian thực. Nếu phiếu ngừng hoạt động, ưu đãi phù hợp nhất sẽ được tự động cập nhật.
                  </p>
                </div>

                <!-- Warnings/Notifications -->
                <div class="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm" v-if="currentOrder.loaiHoaDon === 1 && !currentOrder.phuongXa">
                  <span class="material-symbols-outlined text-sm">warning</span> Chưa đủ thông tin địa chỉ nhận để tính phí vận chuyển GHN.
                </div>

                <!-- Price breakdown -->
                <div class="space-y-3 pt-4 border-t border-gray-100">
                  <div class="flex justify-between text-sm text-gray-700">
                    <span>Tiền hàng</span>
                    <span class="font-semibold">{{ formatCurrency(currentOrder.soTienGoc) }}</span>
                  </div>
                  <div class="flex justify-between text-sm text-gray-700" v-if="currentOrder.loaiHoaDon === 1">
                    <span>Phí vận chuyển (GHN)</span>
                    <span class="font-semibold">{{ formatCurrency(currentOrder.phiVanChuyen) }}</span>
                  </div>
                  <div class="flex justify-between text-sm text-red-600" v-if="currentOrder.voucher">
                    <span>Giảm giá</span>
                    <span class="font-semibold">- {{ formatCurrency(currentOrder.soTienGiam) }}</span>
                  </div>
                  
                  <div class="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span class="text-base font-bold text-gray-800">Tổng số tiền</span>
                    <span class="text-2xl font-bold text-[#ef972d]">{{ formatCurrency(currentOrder.tongTienThanhToan) }}</span>
                  </div>

                  <!-- Khách thanh toán row -->
                  <div class="flex justify-between items-center cursor-pointer hover:bg-gray-50/50 p-1.5 -mx-1.5 rounded-lg transition-colors" @click="openPaymentModal">
                    <div class="flex items-center gap-1.5 text-sm text-gray-700">
                      <span>Khách thanh toán</span>
                      <button 
                        title="Thanh toán" 
                        class="p-1 bg-[#ef972d]/10 hover:bg-[#ef972d]/20 text-[#ef972d] rounded transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <span class="material-symbols-outlined text-sm">payments</span>
                      </button>
                    </div>
                    <div class="relative w-36">
                      <input 
                        type="text"
                        :value="formatCurrency(currentOrder.khachThanhToan)"
                        class="w-full text-right pr-3 pl-2 py-1 bg-white border border-gray-200 rounded-lg text-sm font-semibold focus:ring-[#ef972d] focus:border-[#ef972d] outline-none cursor-pointer"
                        readonly
                      />
                    </div>
                  </div>

                  <!-- Tiền thiếu / Tiền thừa row -->
                  <div class="flex justify-between text-sm text-gray-700">
                    <span v-if="currentOrder.khachThanhToan >= currentOrder.tongTienThanhToan">Tiền thừa trả khách</span>
                    <span v-else>Tiền thiếu</span>
                    
                    <span class="font-semibold" :class="currentOrder.khachThanhToan >= currentOrder.tongTienThanhToan ? 'text-green-600' : 'text-gray-900'">
                      {{ currentOrder.khachThanhToan >= currentOrder.tongTienThanhToan 
                          ? formatCurrency(currentOrder.khachThanhToan - currentOrder.tongTienThanhToan) 
                          : formatCurrency(currentOrder.tongTienThanhToan - currentOrder.khachThanhToan) }}
                    </span>
                  </div>
                </div>

                <!-- Checkout Button -->
                <button 
                  @click="confirmCheckoutOrder"
                  class="w-full py-4 bg-[#ef972d] text-white rounded-xl font-bold text-lg shadow-lg hover:bg-[#ef972d]/90 transition-all uppercase tracking-wider mt-4 cursor-pointer"
                >Xác nhận thanh toán</button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>

  </div>

  <!-- ==================== SELECT PRODUCTS MODAL ==================== -->
  <div v-if="showProductModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-2xl max-w-4xl w-full overflow-hidden border border-gray-100 shadow-2xl flex flex-col" style="max-height: 80vh;">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 class="text-lg font-bold text-gray-800">Thêm sản phẩm vào giỏ hàng</h3>
        <button @click="showProductModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Filters -->
      <div class="p-6 border-b border-gray-100 bg-gray-50/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
          <input 
            v-model="productSearchQuery"
            class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-[#ef972d] focus:border-[#ef972d] outline-none" 
            placeholder="Tìm theo tên sản phẩm, mã vạch..." 
            type="text"
          />
        </div>
        <div class="relative">
          <select 
            v-model="selectedColorId"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-[#ef972d] focus:border-[#ef972d] outline-none cursor-pointer"
          >
            <option value="">Chọn màu sắc</option>
            <option v-for="c in productColors" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="relative">
          <select 
            v-model="selectedSizeId"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-[#ef972d] focus:border-[#ef972d] outline-none cursor-pointer"
          >
            <option value="">Chọn kích cỡ</option>
            <option v-for="s in productSizes" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
      </div>

      <!-- Variants List -->
      <div class="flex-1 overflow-y-auto p-6 min-h-[300px]">
        <div v-if="isProductLoading" class="flex flex-col items-center justify-center py-20 gap-3">
          <div class="w-8 h-8 border-4 border-[#ef972d] border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm font-semibold text-gray-500">Đang tìm sản phẩm...</span>
        </div>
        <div v-else-if="productVariants.length === 0" class="text-center py-20 text-gray-400 space-y-2">
          <span class="material-symbols-outlined text-4xl">search_off</span>
          <p class="text-sm font-medium">Không tìm thấy sản phẩm nào phù hợp!</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            v-for="variant in productVariants" 
            :key="variant.id"
            class="border border-gray-100 hover:border-gray-200 p-4 rounded-xl flex items-center justify-between gap-4 transition-all hover:shadow-sm bg-gray-50/20"
          >
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 relative">
                <img :src="formatImage(variant.anh)" class="w-full h-full object-cover" alt="Variant Image"/>
                <span
                  v-if="isDiscountActive(variant)"
                  class="absolute top-0 left-0 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-br-lg shadow-sm"
                >
                  -{{ variant.phanTramGiam }}%
                </span>
              </div>
              <div class="space-y-0.5">
                <h4 class="font-bold text-sm text-[#0D2533] line-clamp-1">{{ variant.tenSanPham }}</h4>
                <p class="text-xs text-gray-500">Màu: {{ variant.color }} | Kích cỡ: {{ variant.size }}</p>
                <p class="text-xs font-mono text-gray-400">Mã: {{ variant.variantCode }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">Kho: {{ getAvailableStockForModal(variant) }}</span>
                  <div v-if="isDiscountActive(variant)" class="flex items-center gap-1.5">
                    <span class="text-xs text-gray-400 line-through">
                      {{ formatCurrency(variant.salePrice) }}
                    </span>
                    <span class="text-sm font-bold text-red-500">
                      {{ formatCurrency(Math.round(variant.salePrice * (100 - variant.phanTramGiam) / 100)) }}
                    </span>
                  </div>
                  <span v-else class="text-sm font-bold text-[#ef972d]">
                    {{ formatCurrency(variant.salePrice) }}
                  </span>
                </div>
              </div>
            </div>
            <!-- Qty Picker / Add Button -->
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <!-- Default: Show "Thêm vào giỏ" button -->
              <button
                v-if="qtyPickerVariantId !== variant.id"
                @click="openQtyPicker(variant)"
                :disabled="getAvailableStockForModal(variant) === 0"
                :class="getAvailableStockForModal(variant) === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#ef972d] text-white hover:bg-[#ef972d]/90 cursor-pointer shadow-sm'"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
              >
                {{ getAvailableStockForModal(variant) === 0 ? 'Hết hàng' : 'Thêm vào giỏ' }}
              </button>
              <!-- Expanded: Qty Picker -->
              <div v-else class="flex flex-col items-center gap-1.5">
                <div class="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                  <button
                    @click="qtyPickerValue = Math.max(1, qtyPickerValue - 1)"
                    class="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors text-sm font-bold"
                  >−</button>
                  <input
                    v-model.number="qtyPickerValue"
                    type="number"
                    min="1"
                    :max="getAvailableStockForModal(variant)"
                    @change="qtyPickerValue = Math.max(1, Math.min(qtyPickerValue || 1, getAvailableStockForModal(variant)))"
                    class="w-10 h-7 text-center text-sm font-bold border-0 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    @click="qtyPickerValue = Math.min(getAvailableStockForModal(variant), qtyPickerValue + 1)"
                    class="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors text-sm font-bold"
                  >+</button>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    @click="confirmAddWithQty(variant)"
                    class="px-2.5 py-1 bg-emerald-500 text-white rounded-md text-[11px] font-semibold hover:bg-emerald-600 cursor-pointer transition-colors shadow-sm flex items-center gap-0.5"
                  >
                    <span class="material-symbols-outlined text-[13px]">check</span>
                    Thêm
                  </button>
                  <button
                    @click="closeQtyPicker()"
                    class="px-2 py-1 bg-white border border-gray-200 text-gray-500 rounded-md text-[11px] font-semibold hover:bg-gray-50 cursor-pointer transition-colors"
                  >Hủy</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
        <button 
          @click="showProductModal = false"
          class="px-5 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-semibold text-gray-600 cursor-pointer transition-colors"
        >Đóng lại</button>
      </div>
    </div>
  </div>

  <!-- ==================== SELECT CUSTOMER MODAL ==================== -->
  <div v-if="showCustomerModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-2xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl flex flex-col" style="max-height: 80vh;">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 class="text-lg font-bold text-gray-800">Chọn khách hàng</h3>
        <button @click="showCustomerModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Search query input -->
      <div class="p-6 border-b border-gray-100 bg-gray-50/20">
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
          <input 
            v-model="customerSearchQuery"
            class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-[#ef972d] focus:border-[#ef972d] outline-none" 
            placeholder="Tìm theo tên, số điện thoại..." 
            type="text"
          />
        </div>
      </div>

      <!-- Customers List -->
      <div class="flex-1 overflow-y-auto p-6 min-h-[200px]">
        <div v-if="isCustomerLoading" class="flex flex-col items-center justify-center py-10 gap-2">
          <div class="w-6 h-6 border-3 border-[#ef972d] border-t-transparent rounded-full animate-spin"></div>
          <span class="text-xs text-gray-500 font-semibold">Đang tìm khách hàng...</span>
        </div>
        <div v-else-if="customerList.length === 0" class="text-center py-10 text-gray-400 space-y-1">
          <span class="material-symbols-outlined text-3xl">person_off</span>
          <p class="text-xs font-semibold">Không tìm thấy khách hàng nào phù hợp!</p>
        </div>
        <div v-else class="divide-y divide-gray-100">
          <div 
            v-for="cust in customerList" 
            :key="cust.id"
            @click="selectCustomer(cust)"
            class="py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer px-2 rounded-lg transition-colors"
          >
            <div>
              <p class="font-bold text-sm text-[#0D2533]">{{ cust.hoTen }}</p>
              <p class="text-xs text-gray-500">SĐT: {{ cust.sdt || 'Không có SĐT' }}</p>
            </div>
            <span class="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
        <button 
          @click="showCustomerModal = false"
          class="px-5 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-semibold text-gray-600 cursor-pointer transition-colors"
        >Hủy bỏ</button>
      </div>
    </div>
  </div>

  <!-- ==================== QR SCANNER MODAL ==================== -->
  <div v-if="showQrModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-2xl max-w-sm w-full overflow-hidden border border-gray-100 shadow-2xl flex flex-col">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 class="text-base font-bold text-gray-800">Quét mã QR sản phẩm</h3>
        <button @click="closeQrModal" class="text-gray-400 hover:text-gray-600 cursor-pointer">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="p-6 flex flex-col items-center justify-center bg-gray-950 text-white">
        <div id="qr-reader" class="w-full max-w-[280px] aspect-square rounded-xl overflow-hidden border border-white/20 bg-black"></div>
        <p class="text-xs text-gray-400 mt-4 text-center">Đặt mã QR của biến thể sản phẩm trước camera của bạn để quét mã vạch và thêm vào giỏ.</p>
      </div>

      <div class="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
        <button 
          @click="closeQrModal"
          class="px-5 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-semibold text-gray-600 cursor-pointer transition-colors"
        >Đóng lại</button>
      </div>
    </div>
  </div>

  <!-- ==================== PAYMENT MODAL ==================== -->
  <PaymentModal
    :show="showPaymentModal"
    :totalAmount="currentOrder ? currentOrder.tongTienThanhToan : 0"
    :invoiceCode="currentOrder ? currentOrder.maHoaDon : ''"
    :loading="isLoading"
    @close="showPaymentModal = false"
    @submit="executeCheckout(currentOrder, $event)"
  />

  <!-- ==================== CUSTOMER ADDRESS BOOK MODAL ==================== -->
  <div v-if="showAddressBookModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-100 shadow-2xl flex flex-col">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-[#ef972d] text-2xl">location_on</span>
          <div>
            <h3 class="text-lg font-bold text-gray-800">Sổ địa chỉ khách hàng</h3>
            <p class="text-xs text-gray-500 font-medium" v-if="addressBookCustomer">
              {{ addressBookCustomer.hoTen }} • {{ addressBookCustomer.maKhachHang || 'N/A' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button 
            @click="fetchAddressBookList" 
            class="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 cursor-pointer"
            title="Làm mới"
          >
            <span class="material-symbols-outlined">refresh</span>
          </button>
          <button 
            @click="showAddressBookModal = false" 
            class="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 cursor-pointer"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="flex-1 overflow-y-auto p-6 grid grid-cols-12 gap-6 bg-white">
        <!-- Left Side: Address list -->
        <div class="col-span-12 lg:col-span-7 space-y-4">
          <div class="flex items-center gap-2 border-b border-gray-100 pb-2">
            <span class="material-symbols-outlined text-gray-600">list_alt</span>
            <h4 class="font-bold text-[#0D2533]">Danh sách địa chỉ</h4>
          </div>
          
          <div v-if="addressBookList.length === 0" class="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <span class="material-symbols-outlined text-4xl mb-1">location_off</span>
            <p class="text-sm font-medium">Khách hàng chưa có địa chỉ lưu trữ nào.</p>
          </div>
          
          <div v-else class="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            <div 
              v-for="(addr, idx) in addressBookList" 
              :key="addr.id || idx"
              class="border border-gray-100 rounded-xl p-4 hover:border-[#ef972d]/40 transition-all flex items-start justify-between gap-4 bg-gray-50/20 group relative cursor-pointer"
              @click="selectAddressForDelivery(addr)"
            >
              <div class="flex gap-3">
                <span class="text-sm font-bold text-gray-400 mt-0.5 w-5 text-center">{{ idx + 1 }}</span>
                <div class="space-y-1">
                  <p class="text-sm text-gray-800 font-semibold leading-normal">
                    {{ addr.diaChiCuThe }}, {{ addr.phuongXa }}, {{ addr.quanHuyen }}, {{ addr.tinhThanhPho }}
                  </p>
                  <p class="text-xs text-gray-500 font-medium">
                    Người nhận: <span class="text-gray-700 font-semibold">{{ addr.tenNguoiNhan }}</span> - SĐT: <span class="text-gray-700 font-semibold font-mono">{{ addr.sdtNguoiNhan }}</span>
                  </p>
                </div>
              </div>
              
              <div class="flex flex-col items-end gap-2 flex-shrink-0" @click.stop>
                <!-- Default address badge -->
                <span 
                  v-if="addr.kieuDiaChiLaMacDinh" 
                  class="bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full"
                >
                  Mặc định
                </span>
                <!-- Set default button -->
                <button 
                  v-else 
                  @click="setAddressDefault(addr.id)"
                  class="text-[11px] font-bold text-[#ef972d] hover:underline cursor-pointer bg-transparent border-none outline-none"
                >
                  Đặt mặc định
                </button>
                
                <!-- Choose address button -->
                <button
                  @click="selectAddressForDelivery(addr)"
                  class="mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#ef972d] text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-sm hover:bg-[#ef972d]/90 cursor-pointer"
                >
                  Chọn
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: Add address form -->
        <div class="col-span-12 lg:col-span-5 border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 space-y-4">
          <div class="flex items-center gap-2 border-b border-gray-100 pb-2">
            <span class="material-symbols-outlined text-gray-600">add_location</span>
            <h4 class="font-bold text-[#0D2533]">Thêm nhanh địa chỉ</h4>
          </div>
          
          <div class="space-y-3.5">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-600">Họ tên người nhận *</label>
              <input 
                v-model="newAddressForm.tenNguoiNhan"
                class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none" 
                placeholder="Tên người nhận" 
                type="text"
              />
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-600">Số điện thoại *</label>
              <input 
                v-model="newAddressForm.sdtNguoiNhan"
                class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none" 
                placeholder="Số điện thoại nhận hàng" 
                type="text"
              />
            </div>
            
            <div class="grid grid-cols-1 gap-2.5">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-600">Thành phố/Tỉnh *</label>
                <select 
                  v-model="newAddressForm.tinhThanhPho"
                  @change="onAddressBookProvinceChange"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none cursor-pointer"
                >
                  <option value="">Chọn hoặc nhập tỉnh/thành</option>
                  <option v-for="p in provinces" :key="p.code" :value="p.name">{{ p.name }}</option>
                </select>
              </div>
              
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-600">Quận/Huyện *</label>
                <select 
                  v-model="newAddressForm.quanHuyen"
                  @change="onAddressBookDistrictChange"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none cursor-pointer"
                  :disabled="addressBookDistricts.length === 0"
                >
                  <option value="">Chọn hoặc nhập quận/huyện</option>
                  <option v-for="d in addressBookDistricts" :key="d.code" :value="d.name">{{ d.name }}</option>
                </select>
              </div>
              
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-gray-600">Phường/Xã *</label>
                <select 
                  v-model="newAddressForm.phuongXa"
                  class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none cursor-pointer"
                  :disabled="addressBookWards.length === 0"
                >
                  <option value="">Chọn hoặc nhập phường/xã</option>
                  <option v-for="w in addressBookWards" :key="w.code" :value="w.name">{{ w.name }}</option>
                </select>
              </div>
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-gray-600">Địa chỉ cụ thể *</label>
              <input 
                v-model="newAddressForm.diaChiCuThe"
                class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none" 
                placeholder="Số nhà, tên đường..." 
                type="text"
              />
            </div>
            
            <div class="flex items-center gap-2 pt-1">
              <input 
                id="addressBookDefaultChk"
                v-model="newAddressForm.kieuDiaChiLaMacDinh" 
                type="checkbox"
                class="rounded border-outline-variant text-[#ef972d] focus:ring-[#ef972d] cursor-pointer accent-[#ef972d] h-4 w-4"
              />
              <label for="addressBookDefaultChk" class="text-xs font-semibold text-gray-600 cursor-pointer select-none">
                Đặt làm địa chỉ mặc định
              </label>
            </div>
            
            <button 
              @click="addNewAddress"
              class="w-full py-2.5 bg-[#ef972d] text-white hover:bg-[#ef972d]/90 rounded-lg font-bold text-sm shadow-sm transition-colors cursor-pointer text-center mt-3 uppercase"
            >
              Thêm nhanh
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== VOUCHER SELECTION MODAL ==================== -->
  <div v-if="showVoucherSelectionModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-2xl max-w-lg w-full overflow-hidden border border-gray-100 shadow-2xl flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#ef972d] text-2xl font-bold">local_activity</span>
          <h3 class="font-headline-sm text-lg font-bold text-gray-800">Chọn phiếu giảm giá</h3>
        </div>
        <button 
          @click="showVoucherSelectionModal = false" 
          class="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Search and Customer filter info -->
      <div class="p-6 pb-4 border-b border-gray-100 space-y-3">
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-lg">search</span>
          <input 
            v-model="voucherSearchQuery"
            type="text" 
            placeholder="Tìm kiếm phiếu giảm giá (mã hoặc tên)..." 
            class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-[#ef972d] focus:border-[#ef972d] outline-none"
          />
        </div>
        <div v-if="currentOrder?.khachHang" class="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center gap-2">
          <span class="material-symbols-outlined text-sm font-bold">account_circle</span>
          <span>Đang hiển thị ưu đãi cho khách hàng: <strong>{{ currentOrder.khachHang.hoTen }}</strong> (Hiển thị cả mã cá nhân).</span>
        </div>
        <div v-else class="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 flex items-center gap-2">
          <span class="material-symbols-outlined text-sm font-bold">info</span>
          <span>Đơn đang đặt dưới dạng <strong>Khách lẻ</strong> (Chỉ hiển thị mã toàn cửa hàng).</span>
        </div>
      </div>

      <!-- Vouchers List -->
      <div class="p-6 overflow-y-auto flex-1 space-y-3 bg-gray-50/50">
        <div v-if="filteredVouchersForModal.length === 0" class="text-center py-10 text-gray-400">
          <span class="material-symbols-outlined text-4xl block mb-2">local_activity</span>
          <span class="text-sm font-medium">Không tìm thấy phiếu giảm giá nào phù hợp.</span>
        </div>

        <div 
          v-for="v in filteredVouchersForModal" 
          :key="v.id" 
          class="bg-white rounded-xl border p-4 transition-all flex items-start gap-4 shadow-sm"
          :class="v.isMinAmountMet ? 'border-gray-200 hover:border-[#ef972d]/50' : 'border-gray-200 opacity-75'"
        >
          <!-- Left side ticket icon -->
          <div 
            class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="v.kieuApDung === 0 ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'"
          >
            <span class="material-symbols-outlined text-2xl">confirmation_number</span>
          </div>

          <!-- Middle details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-sm text-[#0D2533] uppercase tracking-wide font-mono">{{ v.maPhieuGiamGia }}</span>
              <span 
                class="px-2 py-0.5 text-[9px] font-bold rounded-full"
                :class="v.kieuApDung === 0 ? 'bg-orange-50 border border-orange-200 text-orange-600' : 'bg-purple-50 border border-purple-200 text-purple-600'"
              >
                {{ v.kieuApDung === 0 ? 'Toàn cửa hàng' : 'Cá nhân' }}
              </span>
            </div>
            <p class="text-xs font-semibold text-gray-700 mt-1">{{ v.tenPhieuGiamGia }}</p>
            
            <!-- Discount value and conditions -->
            <p class="text-xs text-gray-500 mt-1 leading-relaxed">
              Chi tiết: 
              <span class="font-bold text-[#ef972d]">
                Giảm {{ v.loaiGiam === 0 ? v.giaTri + '%' : formatCurrency(v.giaTri) }}
              </span>
              <span v-if="v.loaiGiam === 0 && v.giaGiamToiDa"> (Tối đa {{ formatCurrency(v.giaGiamToiDa) }})</span>
            </p>
            
            <!-- Min amount condition status -->
            <p class="text-[11px] mt-1.5 flex items-center gap-1">
              <span class="font-semibold text-gray-500">Đơn tối thiểu:</span>
              <span class="font-bold text-gray-700">{{ formatCurrency(v.dieuKienGiam) }}</span>
            </p>

            <div class="mt-2.5 pt-2 border-t border-dashed border-gray-100 flex items-center justify-between flex-wrap gap-2 text-[10px]">
              <span class="text-gray-400">
                Hạn dùng: {{ $format.date(v.ngayKetThuc) }}
              </span>
              
              <!-- Indicator status -->
              <span v-if="v.isMinAmountMet" class="text-emerald-600 font-bold flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <span class="material-symbols-outlined text-[10px] font-bold">check</span> Đủ điều kiện
              </span>
              <span v-else class="text-red-500 font-semibold flex items-center gap-0.5 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                <span class="material-symbols-outlined text-[10px] font-bold">close</span> Mua thêm {{ formatCurrency(v.dieuKienGiam - (currentOrder?.chiTietList.reduce((sum, item) => sum + item.donGia * item.soLuong, 0) || 0)) }}
              </span>
            </div>
          </div>

          <!-- Right side action button -->
          <div class="flex-shrink-0 self-center">
            <button 
              type="button"
              @click="selectVoucherForOrder(v)"
              :disabled="!v.isMinAmountMet"
              class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              :class="v.isMinAmountMet 
                ? 'bg-gradient-to-r from-orange-500 to-[#ef972d] hover:from-orange-600 hover:to-[#ef972d]/90 text-white' 
                : 'bg-gray-50 text-gray-400 border border-gray-200'"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== PAYMENT MODAL ==================== -->
  <PaymentModal
    :show="showPaymentModal"
    :totalAmount="currentOrder ? currentOrder.tongTienThanhToan : 0"
    :invoiceCode="currentOrder ? currentOrder.maHoaDon : ''"
    :loading="isLoading"
    @close="showPaymentModal = false"
    @submit="savePaymentDataAndCloseModal"
  />

  <!-- ==================== CHECKOUT CONFIRMATION MODAL ==================== -->
  <div v-if="showCheckoutConfirmModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white text-[#0D2533] rounded-2xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl flex flex-col">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 class="font-bold text-gray-800 text-base">Xác nhận đặt hàng</h3>
        <button 
          @click="showCheckoutConfirmModal = false" 
          :disabled="isLoading"
          class="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-gray-500 block">close</span>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-4">
        <!-- Details Card -->
        <div class="border border-gray-100 rounded-2xl bg-gray-50/50 p-4 space-y-3">
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-500 font-medium">Loại đơn</span>
            <span class="font-bold text-gray-800">{{ currentOrder?.loaiHoaDon === 1 ? 'Giao hàng' : 'Tại quầy' }}</span>
          </div>
          
          <div class="flex justify-between items-center text-sm pt-2 border-t border-dashed border-gray-200">
            <span class="text-gray-500 font-medium">Tiền hàng</span>
            <span class="font-bold text-gray-800">{{ formatCurrency(currentOrder?.soTienGoc) }}</span>
          </div>

          <div class="flex justify-between items-center text-sm pt-2 border-t border-dashed border-gray-200">
            <span class="text-gray-500 font-medium">Giảm giá</span>
            <span class="font-bold text-red-600">- {{ formatCurrency(currentOrder?.soTienGiam) }}</span>
          </div>

          <div v-if="currentOrder?.loaiHoaDon === 1" class="flex justify-between items-center text-sm pt-2 border-t border-dashed border-gray-200">
            <span class="text-gray-500 font-medium">Phí vận chuyển</span>
            <span class="font-bold text-gray-800">+ {{ formatCurrency(currentOrder?.phiVanChuyen) }}</span>
          </div>

          <div class="flex justify-between items-center text-sm pt-2 border-t border-dashed border-gray-200">
            <span class="text-gray-500 font-bold">Tổng phải trả</span>
            <span class="font-black text-red-700 text-base">{{ formatCurrency(currentOrder?.tongTienThanhToan) }}</span>
          </div>

          <div class="flex justify-between items-center text-sm pt-2 border-t border-dashed border-gray-200">
            <span class="text-gray-500 font-medium">Hình thức thanh toán</span>
            <span class="font-bold text-gray-800">{{ getCheckoutPaymentMethodLabel(currentOrder) }}</span>
          </div>

          <div class="flex justify-between items-center text-sm pt-2 border-t border-dashed border-gray-200">
            <span class="text-gray-500 font-medium">Khách thanh toán</span>
            <span class="font-bold text-gray-800">{{ formatCurrency(getKhachThanhToanDisplayVal(currentOrder)) }}</span>
          </div>
        </div>

        <!-- Warning block -->
        <div class="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-start gap-2 leading-relaxed">
          <span class="material-symbols-outlined text-sm font-bold mt-0.5">warning</span>
          <span>Bạn có chắc muốn xác nhận? Sau khi xác nhận, hệ thống sẽ lưu/chốt đơn và cập nhật tồn kho.</span>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
        <button 
          type="button"
          @click="showCheckoutConfirmModal = false"
          :disabled="isLoading"
          class="px-5 py-2 hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          Hủy
        </button>
        
        <button 
          type="button"
          @click="submitFinalCheckout"
          :disabled="isLoading"
          class="bg-[#ef972d] hover:bg-[#ef972d]/90 text-white font-black shadow-md rounded-xl px-5 py-2 text-xs transition-all uppercase tracking-wider flex items-center justify-center gap-2 min-w-[120px] cursor-pointer"
        >
          <span v-if="isLoading" class="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>Xác nhận</span>
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
        >Hủy bỏ</button>
        <button
          type="button"
          @click="handleConfirm"
          class="bg-[#EF972D] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
        >Xác nhận</button>
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
      'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info',
      'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'warning'
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
.html5-qrcode-element {
  display: none !important;
}

.pos-grid {
  display: grid !important;
  grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
}

@media (min-width: 1024px) {
  .pos-left-col {
    grid-column: span 5 / span 5 !important;
  }
  .pos-right-col {
    grid-column: span 7 / span 7 !important;
  }
}

@media (max-width: 1023px) {
  .pos-left-col, .pos-right-col {
    grid-column: span 12 / span 12 !important;
  }
}
</style>
