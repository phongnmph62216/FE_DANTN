<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()

// Active tab ('profile', 'password', 'addresses')
const activeTab = ref('profile')

// Loading & Toast
const isLoading = ref(false)
const isSubmitting = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

// User Profile Form
const profileForm = ref({
  id: null,
  maKhachHang: '',
  hoTen: '',
  sdt: '',
  email: '',
  gioiTinh: 1, // 1: Nam, 0: Nữ
  ngaySinh: ''
})

// Change Password Form
const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

// Address Book
const diaChiList = ref([])

// Address Modal Form
const addressModal = ref({
  show: false,
  isSubmitting: false,
  form: {
    tenNguoiNhan: '',
    sdtNguoiNhan: '',
    selectedProvince: '',
    selectedDistrict: '',
    selectedWard: '',
    diaChiCuThe: '',
    kieuDiaChiLaMacDinh: false
  }
})

// Open API Location Data
const provinces = ref([])
const districts = ref([])
const wards = ref([])

// Fetch Open API Provinces
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

// Load Customer Data from API
const loadCustomerData = async () => {
  if (!authStore.user || !authStore.user.id) {
    showToast('Vui lòng đăng nhập để xem thông tin cá nhân.', 'error')
    setTimeout(() => router.push('/auth'), 1500)
    return
  }

  isLoading.value = true
  try {
    const res = await api.get(`/api/v1/khach-hang/${authStore.user.id}`)
    if (res.data) {
      const data = res.data
      profileForm.value = {
        id: data.id,
        maKhachHang: data.maKhachHang || '',
        hoTen: data.hoTen || authStore.user.hoTen || '',
        sdt: data.sdt || authStore.user.sdt || '',
        email: data.email || authStore.user.email || '',
        gioiTinh: data.gioiTinh !== undefined && data.gioiTinh !== null ? data.gioiTinh : 1,
        ngaySinh: data.ngaySinh || ''
      }
      diaChiList.value = data.danhSachDiaChi || []
    }
  } catch (err) {
    console.error('Failed to load customer profile:', err)
    // Fallback using authStore user data
    profileForm.value.hoTen = authStore.user.hoTen || ''
    profileForm.value.sdt = authStore.user.sdt || ''
    profileForm.value.email = authStore.user.email || ''
  } finally {
    isLoading.value = false
  }
}

// Save Profile Info
const saveProfile = async () => {
  if (!profileForm.value.hoTen || !profileForm.value.sdt || !profileForm.value.email) {
    showToast('Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Email!', 'error')
    return
  }

  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
  if (!phoneRegex.test(profileForm.value.sdt)) {
    showToast('Số điện thoại không hợp lệ (VD: 0901234567)!', 'error')
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(profileForm.value.email)) {
    showToast('Email không đúng định dạng!', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      maKhachHang: profileForm.value.maKhachHang,
      hoTen: profileForm.value.hoTen,
      sdt: profileForm.value.sdt,
      email: profileForm.value.email,
      gioiTinh: Number(profileForm.value.gioiTinh),
      ngaySinh: profileForm.value.ngaySinh || null,
      trangThai: 1
    }

    await api.put(`/api/v1/khach-hang/${profileForm.value.id}`, payload)

    // Update authStore user state so top header updates
    if (authStore.user) {
      authStore.user.hoTen = profileForm.value.hoTen
      authStore.user.sdt = profileForm.value.sdt
      authStore.user.email = profileForm.value.email
      localStorage.setItem('auth_user', JSON.stringify(authStore.user))
    }

    showToast('Cập nhật thông tin hồ sơ thành công!', 'success')
  } catch (err) {
    console.error('Failed to update profile:', err)
    const msg = err.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại!'
    showToast(msg, 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Change Password
const changePassword = async () => {
  if (!passwordForm.value.newPassword) {
    showToast('Vui lòng nhập mật khẩu mới!', 'error')
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error')
    return
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    showToast('Xác nhận mật khẩu không trùng khớp!', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      maKhachHang: profileForm.value.maKhachHang,
      hoTen: profileForm.value.hoTen,
      sdt: profileForm.value.sdt,
      email: profileForm.value.email,
      gioiTinh: Number(profileForm.value.gioiTinh),
      ngaySinh: profileForm.value.ngaySinh || null,
      trangThai: 1,
      matKhau: passwordForm.value.newPassword
    }

    await api.put(`/api/v1/khach-hang/${profileForm.value.id}`, payload)
    showToast('Đổi mật khẩu thành công! Vui lòng nhớ mật khẩu mới.', 'success')
    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
  } catch (err) {
    console.error('Failed to change password:', err)
    const msg = err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại!'
    showToast(msg, 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Open Add Address Modal
const openAddAddressModal = () => {
  districts.value = []
  wards.value = []
  addressModal.value = {
    show: true,
    isSubmitting: false,
    form: {
      tenNguoiNhan: profileForm.value.hoTen || '',
      sdtNguoiNhan: profileForm.value.sdt || '',
      selectedProvince: '',
      selectedDistrict: '',
      selectedWard: '',
      diaChiCuThe: '',
      kieuDiaChiLaMacDinh: diaChiList.value.length === 0
    }
  }
}

// Save New Address
const saveNewAddress = async () => {
  const f = addressModal.value.form
  if (!f.tenNguoiNhan || !f.sdtNguoiNhan || !f.selectedProvince || !f.selectedDistrict || !f.selectedWard || !f.diaChiCuThe) {
    showToast('Vui lòng điền đầy đủ các thông tin địa chỉ!', 'error')
    return
  }

  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/
  if (!phoneRegex.test(f.sdtNguoiNhan)) {
    showToast('Số điện thoại người nhận không hợp lệ!', 'error')
    return
  }

  addressModal.value.isSubmitting = true
  try {
    const payload = {
      tenNguoiNhan: f.tenNguoiNhan,
      sdtNguoiNhan: f.sdtNguoiNhan,
      diaChiCuThe: f.diaChiCuThe,
      tinhThanhPho: f.selectedProvince,
      quanHuyen: f.selectedDistrict,
      phuongXa: f.selectedWard,
      kieuDiaChiLaMacDinh: f.kieuDiaChiLaMacDinh
    }

    await api.post(`/api/v1/khach-hang/${profileForm.value.id}/dia-chi`, payload)
    showToast('Thêm địa chỉ giao hàng mới thành công!', 'success')
    addressModal.value.show = false
    await loadCustomerData()
  } catch (err) {
    console.error('Failed to add address:', err)
    const msg = err.response?.data?.message || 'Thêm địa chỉ thất bại!'
    showToast(msg, 'error')
  } finally {
    addressModal.value.isSubmitting = false
  }
}

// Set Default Address
const setDefaultAddress = async (diaChiId) => {
  try {
    await api.patch(`/api/v1/khach-hang/${profileForm.value.id}/dia-chi/${diaChiId}/mac-dinh`)
    showToast('Cập nhật địa chỉ mặc định thành công!', 'success')
    await loadCustomerData()
  } catch (err) {
    console.error('Failed to set default address:', err)
    showToast('Cập nhật địa chỉ mặc định thất bại!', 'error')
  }
}

onMounted(() => {
  fetchProvinces()
  loadCustomerData()
})
</script>

<template>
  <div class="min-h-screen bg-[#FAF9F6] text-gray-800 py-10 px-4 sm:px-6 lg:px-8">
    <!-- Toast Notification -->
    <Transition
      enter-active-class="transform transition-all duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="toast.show" 
        class="fixed top-24 right-4 md:right-8 z-[9999] px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all duration-300 border-2"
        :class="toast.type === 'error' ? 'bg-red-600 border-red-500 shadow-red-500/20' : 'bg-emerald-600 border-emerald-500 shadow-emerald-500/20'"
      >
        <span class="material-symbols-outlined text-xl">
          {{ toast.type === 'error' ? 'error' : 'check_circle' }}
        </span>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

    <div class="max-w-5xl mx-auto space-y-6">
      <!-- 1. Hero Header Banner (Brand Navy #0D2533 & Orange #EF972D) -->
      <div class="bg-[#0D2533] text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden border border-gray-800">
        <!-- Subtle background glowing circle -->
        <div class="absolute -top-12 -right-12 w-48 h-48 bg-[#EF972D]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-center gap-4 relative z-10">
          <div class="relative shrink-0">
            <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#EF972D] to-[#d87f1d] text-white flex items-center justify-center font-black text-2xl md:text-3xl shadow-lg uppercase border-2 border-white/20">
              {{ profileForm.hoTen ? profileForm.hoTen.charAt(0) : 'U' }}
            </div>
            <div class="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm border border-white" title="Tài khoản đã xác thực">
              <span class="material-symbols-outlined text-xs block">verified</span>
            </div>
          </div>

          <div class="space-y-1">
            <span class="inline-block px-3 py-0.5 bg-[#EF972D]/20 text-[#EF972D] text-[10px] font-extrabold uppercase tracking-widest rounded-full border border-[#EF972D]/30">
              TÀI KHOẢN KHÁCH HÀNG
            </span>
            <h1 class="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
              HỒ SƠ CÁ NHÂN
            </h1>
            <p class="text-xs md:text-sm text-gray-300 font-medium">
              Xin chào, <strong class="text-[#EF972D] font-extrabold">{{ profileForm.hoTen || 'Quý khách' }}</strong> • Member Bee Stylish
            </p>
          </div>
        </div>

        <button 
          @click="router.push('/my-orders')" 
          class="relative z-10 inline-flex items-center gap-2 px-5 py-3 bg-[#EF972D] hover:bg-[#d87f1d] active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-xl cursor-pointer"
        >
          <span class="material-symbols-outlined text-base">receipt_long</span>
          Xem đơn hàng của tôi
        </button>
      </div>

      <!-- 2. Main Grid Layout -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <!-- Sidebar Tabs -->
        <div class="md:col-span-1 bg-white border border-gray-150 rounded-3xl p-3 shadow-sm flex flex-col gap-1.5 h-fit">
          <button 
            @click="activeTab = 'profile'"
            class="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all text-left cursor-pointer"
            :class="activeTab === 'profile' ? 'bg-[#EF972D] text-white shadow-md shadow-[#EF972D]/20' : 'text-gray-700 hover:bg-gray-100 hover:text-[#EF972D]'"
          >
            <span class="material-symbols-outlined text-lg">person</span>
            Thông tin cá nhân
          </button>

          <button 
            @click="activeTab = 'password'"
            class="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all text-left cursor-pointer"
            :class="activeTab === 'password' ? 'bg-[#EF972D] text-white shadow-md shadow-[#EF972D]/20' : 'text-gray-700 hover:bg-gray-100 hover:text-[#EF972D]'"
          >
            <span class="material-symbols-outlined text-lg">lock_reset</span>
            Đổi mật khẩu
          </button>

          <button 
            @click="activeTab = 'addresses'"
            class="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all text-left cursor-pointer"
            :class="activeTab === 'addresses' ? 'bg-[#EF972D] text-white shadow-md shadow-[#EF972D]/20' : 'text-gray-700 hover:bg-gray-100 hover:text-[#EF972D]'"
          >
            <span class="material-symbols-outlined text-lg">location_on</span>
            Sổ địa chỉ giao hàng
          </button>
        </div>

        <!-- Right Content Panel -->
        <div class="md:col-span-3 bg-white border border-gray-150 rounded-3xl p-6 md:p-8 shadow-sm">
          <!-- Loading State -->
          <div v-if="isLoading" class="py-16 text-center text-gray-400">
            <span class="material-symbols-outlined animate-spin text-4xl text-[#EF972D] mb-3">progress_activity</span>
            <p class="text-xs font-bold uppercase tracking-wider text-gray-600">Đang tải dữ liệu hồ sơ cá nhân...</p>
          </div>

          <template v-else>
            <!-- TAB 1: THÔNG TIN CÁ NHÂN -->
            <div v-if="activeTab === 'profile'" class="space-y-6">
              <div class="border-b border-gray-150 pb-4 flex justify-between items-center">
                <h2 class="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#EF972D] text-xl">person</span>
                  CHI TIẾT THÔNG TIN TÀI KHOẢN
                </h2>
              </div>

              <form @submit.prevent="saveProfile" class="space-y-5 max-w-xl">
                <div>
                  <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1.5">
                    Họ và tên <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input 
                      type="text" 
                      v-model="profileForm.hoTen" 
                      placeholder="Nhập họ và tên của bạn"
                      required
                      class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] focus:ring-2 focus:ring-[#EF972D]/20 rounded-2xl text-sm font-semibold text-gray-900 transition-all outline-none"
                    />
                    <span class="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg">badge</span>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1.5">
                      Số điện thoại <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <input 
                        type="text" 
                        v-model="profileForm.sdt" 
                        placeholder="VD: 0901234567"
                        required
                        class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] focus:ring-2 focus:ring-[#EF972D]/20 rounded-2xl text-sm font-semibold text-gray-900 transition-all outline-none"
                      />
                      <span class="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg">call</span>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1.5">
                      Email <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <input 
                        type="email" 
                        v-model="profileForm.email" 
                        placeholder="VD: email@example.com"
                        required
                        class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] focus:ring-2 focus:ring-[#EF972D]/20 rounded-2xl text-sm font-semibold text-gray-900 transition-all outline-none"
                      />
                      <span class="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg">mail</span>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1.5">Giới tính</label>
                    <div class="flex items-center gap-3 py-1">
                      <label 
                        class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border cursor-pointer transition-all text-xs font-bold"
                        :class="profileForm.gioiTinh === 1 ? 'border-[#EF972D] bg-[#EF972D]/10 text-[#EF972D]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'"
                      >
                        <input type="radio" v-model="profileForm.gioiTinh" :value="1" class="hidden"/>
                        <span class="material-symbols-outlined text-sm">male</span>
                        <span>Nam</span>
                      </label>
                      <label 
                        class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border cursor-pointer transition-all text-xs font-bold"
                        :class="profileForm.gioiTinh === 0 ? 'border-[#EF972D] bg-[#EF972D]/10 text-[#EF972D]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'"
                      >
                        <input type="radio" v-model="profileForm.gioiTinh" :value="0" class="hidden"/>
                        <span class="material-symbols-outlined text-sm">female</span>
                        <span>Nữ</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1.5">Ngày sinh</label>
                    <div class="relative">
                      <input 
                        type="date" 
                        v-model="profileForm.ngaySinh" 
                        class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] focus:ring-2 focus:ring-[#EF972D]/20 rounded-2xl text-sm font-semibold text-gray-900 transition-all outline-none"
                      />
                      <span class="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg">calendar_today</span>
                    </div>
                  </div>
                </div>

                <div class="pt-4">
                  <button 
                    type="submit" 
                    :disabled="isSubmitting"
                    class="px-8 py-3.5 bg-[#EF972D] hover:bg-[#d87f1d] active:scale-95 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span v-if="isSubmitting" class="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span v-else class="material-symbols-outlined text-base">save</span>
                    LƯU THAY ĐỔI
                  </button>
                </div>
              </form>
            </div>

            <!-- TAB 2: ĐỔI MẬT KHẨU -->
            <div v-else-if="activeTab === 'password'" class="space-y-6">
              <div class="border-b border-gray-150 pb-4">
                <h2 class="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#EF972D] text-xl">lock_reset</span>
                  THAY ĐỔI MẬT KHẨU TÀI KHOẢN
                </h2>
                <p class="text-xs text-gray-500 mt-1">Vui lòng nhập mật khẩu tối thiểu 6 ký tự để đảm bảo an toàn tài khoản.</p>
              </div>

              <form @submit.prevent="changePassword" class="space-y-4 max-w-md">
                <div>
                  <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1.5">
                    Mật khẩu mới <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input 
                      type="password" 
                      v-model="passwordForm.newPassword" 
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      required
                      class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] focus:ring-2 focus:ring-[#EF972D]/20 rounded-2xl text-sm font-semibold text-gray-900 transition-all outline-none"
                    />
                    <span class="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg">key</span>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1.5">
                    Xác nhận mật khẩu mới <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input 
                      type="password" 
                      v-model="passwordForm.confirmPassword" 
                      placeholder="Nhập lại mật khẩu mới"
                      required
                      class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] focus:ring-2 focus:ring-[#EF972D]/20 rounded-2xl text-sm font-semibold text-gray-900 transition-all outline-none"
                    />
                    <span class="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg">lock</span>
                  </div>
                </div>

                <div class="pt-4">
                  <button 
                    type="submit" 
                    :disabled="isSubmitting"
                    class="px-8 py-3.5 bg-[#EF972D] hover:bg-[#d87f1d] active:scale-95 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span v-if="isSubmitting" class="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span v-else class="material-symbols-outlined text-base">check_circle</span>
                    CẬP NHẬT MẬT KHẨU
                  </button>
                </div>
              </form>
            </div>

            <!-- TAB 3: SỔ ĐỊA CHỈ -->
            <div v-else-if="activeTab === 'addresses'" class="space-y-6">
              <div class="border-b border-gray-150 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 class="text-base md:text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <span class="material-symbols-outlined text-[#EF972D] text-xl">location_on</span>
                    SỔ ĐỊA CHỈ GIAO HÀNG
                  </h2>
                  <p class="text-xs text-gray-500 mt-1">Quản lý các địa chỉ giao hàng để thanh toán mua sắm tiện lợi hơn.</p>
                </div>
                <button 
                  @click="openAddAddressModal" 
                  class="px-5 py-3 bg-[#EF972D] hover:bg-[#d87f1d] active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-1.5 cursor-pointer w-fit"
                >
                  <span class="material-symbols-outlined text-base">add_location_alt</span>
                  THÊM ĐỊA CHỈ MỚI
                </button>
              </div>

              <!-- Address List -->
              <div v-if="diaChiList.length === 0" class="py-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50 space-y-3">
                <div class="w-14 h-14 rounded-full bg-[#EF972D]/10 text-[#EF972D] flex items-center justify-center mx-auto">
                  <span class="material-symbols-outlined text-3xl">pin_drop</span>
                </div>
                <div class="space-y-1">
                  <h4 class="text-xs font-bold uppercase text-gray-800">CHƯA CÓ ĐỊA CHỈ GIAO HÀNG</h4>
                  <p class="text-xs text-gray-500">Bạn chưa lưu địa chỉ nhận hàng nào trong sổ địa chỉ.</p>
                </div>
                <button @click="openAddAddressModal" class="inline-block px-5 py-2.5 bg-[#EF972D] hover:bg-[#d87f1d] text-white text-xs font-extrabold uppercase rounded-xl shadow-md transition-all cursor-pointer">
                  + Thêm địa chỉ ngay
                </button>
              </div>

              <div v-else class="grid grid-cols-1 gap-4">
                <div 
                  v-for="addr in diaChiList" 
                  :key="addr.id" 
                  class="p-5 border-2 rounded-3xl transition-all relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white"
                  :class="addr.kieuDiaChiLaMacDinh ? 'border-[#EF972D] bg-[#EF972D]/5 shadow-md' : 'border-gray-200 hover:border-[#EF972D]/50'"
                >
                  <div class="space-y-1.5">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-extrabold text-gray-900 text-sm flex items-center gap-1">
                        <span class="material-symbols-outlined text-gray-400 text-base">person</span>
                        {{ addr.tenNguoiNhan }}
                      </span>
                      <span class="text-xs text-gray-500 font-semibold flex items-center gap-1">
                        <span class="material-symbols-outlined text-gray-400 text-base">call</span>
                        {{ addr.sdtNguoiNhan }}
                      </span>
                      <span v-if="addr.kieuDiaChiLaMacDinh" class="bg-[#EF972D] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-sm">
                        MẶC ĐỊNH
                      </span>
                    </div>
                    <p class="text-xs text-gray-600 leading-relaxed flex items-start gap-1">
                      <span class="material-symbols-outlined text-gray-400 text-base shrink-0 mt-0.5">location_on</span>
                      <span>{{ addr.diaChiCuThe }}, {{ addr.phuongXa }}, {{ addr.quanHuyen }}, {{ addr.tinhThanhPho }}</span>
                    </p>
                  </div>

                  <div class="flex items-center gap-2 self-end sm:self-center">
                    <button 
                      v-if="!addr.kieuDiaChiLaMacDinh" 
                      @click="setDefaultAddress(addr.id)"
                      class="px-4 py-2 border-2 border-[#EF972D] text-[#EF972D] hover:bg-[#EF972D] hover:text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Đặt làm mặc định
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- MODAL THÊM ĐỊA CHỈ MỚI -->
    <div v-if="addressModal.show" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div class="bg-white border border-gray-200 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center border-b border-gray-150 pb-4">
          <h3 class="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
            <span class="material-symbols-outlined text-[#EF972D]">add_location</span>
            THÊM ĐỊA CHỈ GIAO HÀNG MỚI
          </h3>
          <button @click="addressModal.show = false" class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form @submit.prevent="saveNewAddress" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1">Tên người nhận <span class="text-red-500">*</span></label>
              <input 
                type="text" 
                v-model="addressModal.form.tenNguoiNhan" 
                placeholder="Nhập tên người nhận"
                required
                class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] rounded-xl text-sm font-semibold outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1">SĐT người nhận <span class="text-red-500">*</span></label>
              <input 
                type="text" 
                v-model="addressModal.form.sdtNguoiNhan" 
                placeholder="VD: 0901234567"
                required
                class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] rounded-xl text-sm font-semibold outline-none"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1">Tỉnh / Thành <span class="text-red-500">*</span></label>
              <select 
                v-model="addressModal.form.selectedProvince" 
                @change="onProvinceChange"
                required
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] rounded-xl text-sm font-semibold outline-none"
              >
                <option value="">-- Chọn Tỉnh --</option>
                <option v-for="p in provinces" :key="p.code" :value="p.name">{{ p.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1">Quận / Huyện <span class="text-red-500">*</span></label>
              <select 
                v-model="addressModal.form.selectedDistrict" 
                @change="onDistrictChange"
                :disabled="!addressModal.form.selectedProvince"
                required
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] rounded-xl text-sm font-semibold outline-none disabled:opacity-50"
              >
                <option value="">-- Chọn Huyện --</option>
                <option v-for="d in districts" :key="d.code" :value="d.name">{{ d.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1">Phường / Xã <span class="text-red-500">*</span></label>
              <select 
                v-model="addressModal.form.selectedWard" 
                :disabled="!addressModal.form.selectedDistrict"
                required
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] rounded-xl text-sm font-semibold outline-none disabled:opacity-50"
              >
                <option value="">-- Chọn Xã --</option>
                <option v-for="w in wards" :key="w.code" :value="w.name">{{ w.name }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-extrabold uppercase text-gray-700 mb-1">Địa chỉ cụ thể <span class="text-red-500">*</span></label>
            <input 
              type="text" 
              v-model="addressModal.form.diaChiCuThe" 
              placeholder="VD: Số 12, Ngõ 45 Đường Nguyễn Trãi"
              required
              class="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#EF972D] rounded-xl text-sm font-semibold outline-none"
            />
          </div>

          <div class="pt-1">
            <label class="inline-flex items-center gap-2 cursor-pointer text-xs font-extrabold text-gray-700">
              <input type="checkbox" v-model="addressModal.form.kieuDiaChiLaMacDinh" class="accent-[#EF972D] w-4 h-4 rounded"/>
              <span>Đặt làm địa chỉ giao hàng mặc định</span>
            </label>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-gray-150">
            <button 
              type="button" 
              @click="addressModal.show = false" 
              class="px-5 py-2.5 border border-gray-200 text-gray-600 font-bold text-xs uppercase rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              HỦY BỎ
            </button>
            <button 
              type="submit" 
              :disabled="addressModal.isSubmitting"
              class="px-6 py-2.5 bg-[#EF972D] hover:bg-[#d87f1d] text-white font-extrabold text-xs uppercase rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span v-if="addressModal.isSubmitting" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              <span>LƯU ĐỊA CHỈ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
