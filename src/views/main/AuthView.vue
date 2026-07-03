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
            <a href="#" class="text-body-md text-primary font-medium hover:underline">Quên mật khẩu?</a>
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
  </div>
</template>
