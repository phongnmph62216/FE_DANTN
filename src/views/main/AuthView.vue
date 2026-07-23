<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// State for Login
const loginForm = ref({
  username: '',
  password: '',
  rememberMe: false
})
const showLoginPassword = ref(false)
const loginError = ref('')
const isLoggingIn = ref(false)

// State for Register
const registerForm = ref({
  ho: '',
  ten: '',
  sdt: '',
  gioiTinh: 0, // 0: Nữ, 1: Nam, 2: Khác
  email: '',
  ngaySinh: '',
  matKhau: '',
  xacNhanMatKhau: ''
})
const showRegisterPassword = ref(false)
const showRegisterConfirmPassword = ref(false)
const registerError = ref('')
const registerSuccess = ref('')
const isRegistering = ref(false)

// State for Forgot Password Modal
import api from '@/services/api'
const showForgotPasswordModal = ref(false)
const forgotPasswordStep = ref(1) // 1: Input Email/Phone, 2: Input OTP & New Password
const forgotForm = ref({
  emailOrPhone: '',
  otpCode: '',
  newPassword: '',
  confirmNewPassword: ''
})
const showNewPassword = ref(false)
const forgotError = ref('')
const forgotSuccess = ref('')
const isSendingOtp = ref(false)
const isResettingPassword = ref(false)
const resendCountdown = ref(0)
let countdownInterval = null

const startCountdown = () => {
  resendCountdown.value = 60
  if (countdownInterval) clearInterval(countdownInterval)
  countdownInterval = setInterval(() => {
    if (resendCountdown.value > 0) {
      resendCountdown.value--
    } else {
      clearInterval(countdownInterval)
    }
  }, 1000)
}

const openForgotPasswordModal = () => {
  forgotForm.value = {
    emailOrPhone: loginForm.value.username || '',
    otpCode: '',
    newPassword: '',
    confirmNewPassword: ''
  }
  forgotError.value = ''
  forgotSuccess.value = ''
  forgotPasswordStep.value = 1
  showForgotPasswordModal.value = true
}

const handleSendOtp = async () => {
  forgotError.value = ''
  forgotSuccess.value = ''
  if (!forgotForm.value.emailOrPhone.trim()) {
    forgotError.value = 'Vui lòng nhập Email hoặc Số điện thoại của tài khoản.'
    return
  }

  isSendingOtp.value = true
  try {
    const res = await api.post('/api/v1/auth/forgot-password', {
      emailOrPhone: forgotForm.value.emailOrPhone.trim()
    })
    forgotSuccess.value = res.data?.message || 'Mã OTP đã được gửi đến email của bạn!'
    forgotPasswordStep.value = 2
    startCountdown()
  } catch (err) {
    forgotError.value = err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại thông tin.'
  } finally {
    isSendingOtp.value = false
  }
}

const handleResetPassword = async () => {
  forgotError.value = ''
  forgotSuccess.value = ''

  if (!forgotForm.value.otpCode.trim()) {
    forgotError.value = 'Vui lòng nhập mã xác thực OTP 6 số.'
    return
  }
  if (!forgotForm.value.newPassword || forgotForm.value.newPassword.length < 6) {
    forgotError.value = 'Mật khẩu mới phải có ít nhất 6 ký tự.'
    return
  }
  if (forgotForm.value.newPassword !== forgotForm.value.confirmNewPassword) {
    forgotError.value = 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp.'
    return
  }

  isResettingPassword.value = true
  try {
    const res = await api.post('/api/v1/auth/reset-password', {
      emailOrPhone: forgotForm.value.emailOrPhone.trim(),
      otpCode: forgotForm.value.otpCode.trim(),
      newPassword: forgotForm.value.newPassword
    })

    // Auto fill login form
    loginForm.value.username = forgotForm.value.emailOrPhone.trim()
    loginForm.value.password = forgotForm.value.newPassword
    loginError.value = ''
    
    showForgotPasswordModal.value = false
    alert(res.data?.message || 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.')
  } catch (err) {
    forgotError.value = err.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.'
  } finally {
    isResettingPassword.value = false
  }
}

// Handle Login
const handleLogin = async () => {
  loginError.value = ''
  if (!loginForm.value.username.trim() || !loginForm.value.password.trim()) {
    loginError.value = 'Vui lòng nhập đầy đủ số điện thoại và mật khẩu.'
    return
  }

  isLoggingIn.value = true
  try {
    const user = await authStore.login(loginForm.value.username, loginForm.value.password)
    
    // Redirect based on role
    if (user.role === 'ROLE_QUAN_LY' || user.role === 'ROLE_NHAN_VIEN') {
      router.push('/admin')
    } else {
      router.push('/')
    }
  } catch (error) {
    loginError.value = error.message || 'Đăng nhập thất bại.'
  } finally {
    isLoggingIn.value = false
  }
}

// Handle Register
const handleRegister = async () => {
  registerError.value = ''
  registerSuccess.value = ''

  const { ho, ten, sdt, gioiTinh, email, ngaySinh, matKhau, xacNhanMatKhau } = registerForm.value

  if (!ho.trim() || !ten.trim() || !sdt.trim() || !matKhau.trim()) {
    registerError.value = 'Vui lòng nhập đầy đủ thông tin bắt buộc (*).'
    return
  }

  if (sdt.trim().length < 10) {
    registerError.value = 'Số điện thoại không hợp lệ (tối thiểu 10 chữ số).'
    return
  }

  if (matKhau !== xacNhanMatKhau) {
    registerError.value = 'Mật khẩu xác nhận không khớp.'
    return
  }

  isRegistering.value = true
  try {
    await authStore.register({
      ho: ho.trim(),
      ten: ten.trim(),
      sdt: sdt.trim(),
      gioiTinh,
      email: email.trim() || null,
      ngaySinh: ngaySinh || null,
      matKhau
    })

    registerSuccess.value = 'Đăng ký tài khoản thành công! Bạn có thể dùng số điện thoại này để đăng nhập ngay.'
    
    // Autofill login username
    loginForm.value.username = sdt.trim()

    // Reset register form
    registerForm.value = {
      ho: '',
      ten: '',
      sdt: '',
      gioiTinh: 0,
      email: '',
      ngaySinh: '',
      matKhau: '',
      xacNhanMatKhau: ''
    }
  } catch (error) {
    registerError.value = error.message || 'Đăng ký thất bại.'
  } finally {
    isRegistering.value = false
  }
}
</script>

<template>
  <div class="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-16">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start divide-y md:divide-y-0 md:divide-x divide-outline-variant/30">
      
      <!-- LEFT COLUMN: LOGIN -->
      <div class="flex flex-col gap-6 pb-10 md:pb-0">
        <div>
          <h2 class="text-headline-md font-bold text-on-background uppercase tracking-wide">Đăng nhập</h2>
          <p class="text-body-md text-on-surface-variant mt-2 leading-relaxed">
            Nhập số điện thoại của Quý Khách để đăng nhập tài khoản Bee Stylish.
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
          <div v-if="loginError" class="bg-error-container text-on-error-container p-3 rounded-lg text-sm border border-error/20 flex items-center gap-2">
            <span class="material-symbols-outlined shrink-0 text-[18px]">error</span>
            <span>{{ loginError }}</span>
          </div>

          <!-- SĐT Field -->
          <div class="flex flex-col gap-1">
            <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">SĐT *</label>
            <input 
              v-model="loginForm.username"
              type="text" 
              placeholder="Vui lòng nhập SĐT"
              class="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-4 py-3 outline-none transition-colors text-body-md"
              required
            />
          </div>

          <!-- Password Field -->
          <div class="flex flex-col gap-1">
            <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">Mật khẩu *</label>
            <div class="relative">
              <input 
                v-model="loginForm.password"
                :type="showLoginPassword ? 'text' : 'password'" 
                placeholder="Nhập mật khẩu"
                class="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-md pl-4 pr-12 py-3 outline-none transition-colors text-body-md"
                required
              />
              <button 
                type="button" 
                @click="showLoginPassword = !showLoginPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center"
              >
                <span class="material-symbols-outlined text-[20px]">
                  {{ showLoginPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Remember me & Forgot password -->
          <div class="flex items-center justify-between mt-2">
            <label class="flex items-center gap-2 cursor-pointer select-none text-body-md text-on-surface-variant">
              <input 
                v-model="loginForm.rememberMe"
                type="checkbox" 
                class="rounded border-outline text-primary focus:ring-primary"
              />
              <span>Giữ trạng thái đăng nhập</span>
            </label>
            <button type="button" @click="openForgotPasswordModal" class="text-body-md text-primary font-medium hover:underline cursor-pointer">Quên mật khẩu?</button>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="isLoggingIn"
            class="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold uppercase py-3 rounded-md shadow-sm transition-all duration-300 flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <span v-if="isLoggingIn" class="border-2 border-on-primary border-t-transparent rounded-full w-4 h-4 animate-spin"></span>
            <span>Đăng nhập</span>
          </button>
        </form>
      </div>

      <!-- RIGHT COLUMN: REGISTER -->
      <div class="flex flex-col gap-6 pt-10 md:pt-0 md:pl-16">
        <div>
          <h2 class="text-headline-md font-bold text-on-background uppercase tracking-wide">Đăng ký</h2>
          <p class="text-body-md text-on-surface-variant mt-2 leading-relaxed">
            Tạo tài khoản và khám phá tất cả các lợi ích dành riêng cho người dùng đã đăng ký của Bee Stylish.
          </p>
        </div>

        <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
          <div v-if="registerError" class="bg-error-container text-on-error-container p-3 rounded-lg text-sm border border-error/20 flex items-center gap-2">
            <span class="material-symbols-outlined shrink-0 text-[18px]">error</span>
            <span>{{ registerError }}</span>
          </div>

          <div v-if="registerSuccess" class="bg-primary-container text-on-primary-container p-3 rounded-lg text-sm border border-primary/20 flex items-center gap-2">
            <span class="material-symbols-outlined shrink-0 text-[18px]">check_circle</span>
            <span>{{ registerSuccess }}</span>
          </div>

          <!-- Họ & Tên -->
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">Họ *</label>
              <input 
                v-model="registerForm.ho"
                type="text" 
                placeholder="Nhập họ"
                class="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-4 py-3 outline-none transition-colors text-body-md"
                required
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">Tên *</label>
              <input 
                v-model="registerForm.ten"
                type="text" 
                placeholder="Nhập tên"
                class="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-4 py-3 outline-none transition-colors text-body-md"
                required
              />
            </div>
          </div>

          <!-- SĐT Field -->
          <div class="flex flex-col gap-1">
            <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">SĐT *</label>
            <input 
              v-model="registerForm.sdt"
              type="text" 
              placeholder="Vui lòng nhập SĐT"
              class="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-4 py-3 outline-none transition-colors text-body-md"
              required
            />
          </div>

          <!-- Giới tính Field -->
          <div class="flex flex-col gap-1">
            <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">Giới tính *</label>
            <div class="flex items-center gap-6 mt-1">
              <label class="flex items-center gap-2 cursor-pointer select-none text-body-md text-on-surface-variant">
                <input 
                  type="radio" 
                  name="gioiTinh" 
                  :value="0" 
                  v-model="registerForm.gioiTinh"
                  class="text-primary focus:ring-primary border-outline"
                />
                <span>Nữ</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer select-none text-body-md text-on-surface-variant">
                <input 
                  type="radio" 
                  name="gioiTinh" 
                  :value="1" 
                  v-model="registerForm.gioiTinh"
                  class="text-primary focus:ring-primary border-outline"
                />
                <span>Nam</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer select-none text-body-md text-on-surface-variant">
                <input 
                  type="radio" 
                  name="gioiTinh" 
                  :value="2" 
                  v-model="registerForm.gioiTinh"
                  class="text-primary focus:ring-primary border-outline"
                />
                <span>Khác</span>
              </label>
            </div>
          </div>

          <!-- Email Field -->
          <div class="flex flex-col gap-1">
            <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">Email</label>
            <input 
              v-model="registerForm.email"
              type="email" 
              placeholder="Nhập email của bạn"
              class="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-4 py-3 outline-none transition-colors text-body-md"
            />
          </div>

          <!-- Ngày sinh Field -->
          <div class="flex flex-col gap-1">
            <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">Ngày sinh</label>
            <input 
              v-model="registerForm.ngaySinh"
              type="date" 
              class="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-4 py-3 outline-none transition-colors text-body-md"
            />
          </div>

          <!-- Mật khẩu Field -->
          <div class="flex flex-col gap-1">
            <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">Mật khẩu *</label>
            <div class="relative">
              <input 
                v-model="registerForm.matKhau"
                :type="showRegisterPassword ? 'text' : 'password'" 
                placeholder="Nhập mật khẩu"
                class="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-md pl-4 pr-12 py-3 outline-none transition-colors text-body-md"
                required
              />
              <button 
                type="button" 
                @click="showRegisterPassword = !showRegisterPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center"
              >
                <span class="material-symbols-outlined text-[20px]">
                  {{ showRegisterPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Xác nhận mật khẩu Field -->
          <div class="flex flex-col gap-1">
            <label class="text-label-sm font-bold text-on-surface uppercase tracking-wide">Xác nhận mật khẩu *</label>
            <div class="relative">
              <input 
                v-model="registerForm.xacNhanMatKhau"
                :type="showRegisterConfirmPassword ? 'text' : 'password'" 
                placeholder="Nhập lại mật khẩu xác nhận"
                class="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-md pl-4 pr-12 py-3 outline-none transition-colors text-body-md"
                required
              />
              <button 
                type="button" 
                @click="showRegisterConfirmPassword = !showRegisterConfirmPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center"
              >
                <span class="material-symbols-outlined text-[20px]">
                  {{ showRegisterConfirmPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Policy agreement text -->
          <p class="text-body-md text-on-surface-variant leading-relaxed mt-2">
            Bằng cách tạo tài khoản, Quý Khách đã đồng ý với <a href="#" class="text-primary hover:underline">Điều khoản & Điều kiện</a> và <a href="#" class="text-primary hover:underline">Chính sách Bảo mật</a> của chúng tôi.
          </p>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="isRegistering"
            class="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold uppercase py-3 rounded-md shadow-sm transition-all duration-300 flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <span v-if="isRegistering" class="border-2 border-on-primary border-t-transparent rounded-full w-4 h-4 animate-spin"></span>
            <span>Đăng ký</span>
          </button>
        </form>
      </div>

    </div>

    <!-- FORGOT PASSWORD MODAL -->
    <div v-if="showForgotPasswordModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col transition-all">
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[24px]">lock_reset</span>
            <h3 class="font-bold text-lg">Đặt lại mật khẩu</h3>
          </div>
          <button @click="showForgotPasswordModal = false" class="text-white/80 hover:text-white transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <!-- Step Indicators -->
          <div class="flex items-center justify-center gap-4 mb-6">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                :class="forgotPasswordStep === 1 ? 'bg-[#f97316] text-white' : 'bg-green-500 text-white'">1</span>
              <span class="text-xs font-semibold" :class="forgotPasswordStep === 1 ? 'text-gray-800' : 'text-gray-500'">Gửi OTP</span>
            </div>
            <div class="w-12 h-0.5" :class="forgotPasswordStep === 2 ? 'bg-[#f97316]' : 'bg-gray-200'"></div>
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                :class="forgotPasswordStep === 2 ? 'bg-[#f97316] text-white' : 'bg-gray-200 text-gray-500'">2</span>
              <span class="text-xs font-semibold" :class="forgotPasswordStep === 2 ? 'text-gray-800' : 'text-gray-400'">Đổi mật khẩu</span>
            </div>
          </div>

          <!-- Alert Banners -->
          <div v-if="forgotError" class="mb-4 bg-red-50 text-red-700 p-3 rounded-xl text-xs border border-red-200 flex items-center gap-2">
            <span class="material-symbols-outlined shrink-0 text-[18px]">error</span>
            <span>{{ forgotError }}</span>
          </div>

          <div v-if="forgotSuccess" class="mb-4 bg-green-50 text-green-700 p-3 rounded-xl text-xs border border-green-200 flex items-center gap-2">
            <span class="material-symbols-outlined shrink-0 text-[18px]">check_circle</span>
            <span>{{ forgotSuccess }}</span>
          </div>

          <!-- STEP 1: REQUEST OTP -->
          <form v-if="forgotPasswordStep === 1" @submit.prevent="handleSendOtp" class="space-y-4">
            <p class="text-xs text-gray-600 leading-relaxed">
              Nhập **Email** hoặc **Số điện thoại** tài khoản của bạn. Chúng tôi sẽ gửi mã xác thực OTP 6 số đến email liên kết để xác minh.
            </p>

            <div class="space-y-1 text-left">
              <label class="text-xs font-bold text-gray-700">Email hoặc SĐT tài khoản *</label>
              <div class="relative">
                <input 
                  v-model="forgotForm.emailOrPhone"
                  type="text" 
                  placeholder="Ví dụ: 0912345678 hoặc email@example.com"
                  class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#f97316] outline-none transition-colors"
                />
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button 
                type="button" 
                @click="showForgotPasswordModal = false"
                class="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                :disabled="isSendingOtp || !forgotForm.emailOrPhone.trim()"
                class="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span v-if="isSendingOtp" class="border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5 animate-spin"></span>
                <span>Gửi mã OTP</span>
              </button>
            </div>
          </form>

          <!-- STEP 2: VERIFY OTP & RESET PASSWORD -->
          <form v-else @submit.prevent="handleResetPassword" class="space-y-3 text-left">
            <!-- OTP Input -->
            <div class="space-y-1">
              <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-gray-700">Mã OTP (6 chữ số) *</label>
                <button 
                  type="button"
                  @click="handleSendOtp"
                  :disabled="resendCountdown > 0 || isSendingOtp"
                  class="text-[11px] text-[#f97316] font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  {{ resendCountdown > 0 ? `Gửi lại OTP (${resendCountdown}s)` : 'Gửi lại mã OTP' }}
                </button>
              </div>
              <input 
                v-model="forgotForm.otpCode"
                type="text" 
                maxlength="6"
                placeholder="123456"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-center tracking-[8px] focus:bg-white focus:border-[#f97316] outline-none transition-colors uppercase"
              />
            </div>

            <!-- New Password Input -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-700">Mật khẩu mới *</label>
              <input 
                v-model="forgotForm.newPassword"
                type="password" 
                placeholder="Tối thiểu 6 ký tự"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#f97316] outline-none transition-colors"
              />
            </div>

            <!-- Confirm New Password Input -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-700">Xác nhận mật khẩu mới *</label>
              <input 
                v-model="forgotForm.confirmNewPassword"
                type="password" 
                placeholder="Nhập lại mật khẩu mới"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#f97316] outline-none transition-colors"
              />
            </div>

            <div class="flex gap-3 pt-3">
              <button 
                type="button" 
                @click="forgotPasswordStep = 1"
                class="py-2.5 px-4 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button 
                type="submit" 
                :disabled="isResettingPassword"
                class="flex-1 py-2.5 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span v-if="isResettingPassword" class="border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5 animate-spin"></span>
                <span>Xác nhận Đặt lại mật khẩu</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
