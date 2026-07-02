<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ChatbotWidget from '@/components/ChatbotWidget.vue'

const router = useRouter()
const authStore = useAuthStore()
const showAccountMenu = ref(false)
const showMobileMenu = ref(false)

const toggleAccountMenu = (event) => {
  event.stopPropagation()
  showAccountMenu.value = !showAccountMenu.value
  showMobileMenu.value = false
}

const toggleMobileMenu = (event) => {
  event.stopPropagation()
  showMobileMenu.value = !showMobileMenu.value
  showAccountMenu.value = false
}

const closeAllMenus = () => {
  showAccountMenu.value = false
  showMobileMenu.value = false
}

const handleLogout = () => {
  authStore.logout()
  closeAllMenus()
  router.push('/')
}

onMounted(() => {
  document.addEventListener('click', closeAllMenus)
})

onUnmounted(() => {
  document.removeEventListener('click', closeAllMenus)
})
</script>

<template>
  <div class="bg-background text-on-background font-body-md antialiased overflow-x-hidden pt-[140px] md:pt-[180px] min-h-screen flex flex-col justify-between">
    <div>
      <!-- 1. Header & Navigation -->
      <!-- Top Promo Banner -->
      <div class="fixed top-0 left-0 w-full z-[60] bg-primary-container text-on-primary font-label-sm text-center py-2 px-margin-mobile md:px-margin-desktop">
        MUA 2 ÁO POLO CHỈ 139K/ÁO
      </div>
      <!-- Main Header -->
      <header class="fixed top-[36px] w-full z-50 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto left-1/2 -translate-x-1/2">
        <!-- Logo -->
        <RouterLink class="shrink-0 flex items-center" to="/">
          <img
            alt="Bee Stylish Logo"
            class="h-14 md:h-20 object-contain"
            src="/logoteam.png"
          />
        </RouterLink>
        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-6 lg:gap-8 mx-auto">
          <RouterLink to="/" class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" exact-active-class="text-primary !border-primary">TRANG CHỦ</RouterLink>
          <RouterLink to="/all-products" class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" exact-active-class="text-primary !border-primary">SẢN PHẨM</RouterLink>
          <a class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" href="#">ƯU ĐÃI</a>
          <a class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" href="#">MỚI VỀ</a>
          <RouterLink to="/tra-cuu" class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" exact-active-class="text-primary !border-primary">TRA CỨU</RouterLink>
          <a class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors duration-300 border-b-2 border-transparent pb-1" href="#">VỀ CHÚNG TÔI</a>
        </nav>
        <!-- Search & Actions -->
        <div class="flex items-center gap-4 shrink-0">
          <!-- Desktop Search Bar -->
          <div class="hidden lg:flex items-center bg-surface-container rounded-full overflow-hidden border border-outline-variant focus-within:border-primary transition-colors">
            <input class="bg-transparent border-none outline-none px-4 py-2 text-label-sm font-body-md w-48 placeholder:text-on-surface-variant focus:ring-0" placeholder="Tìm kiếm sản phẩm..." type="text"/>
            <button class="bg-primary-container text-on-primary p-2 flex items-center justify-center hover:bg-primary transition-colors">
              <span class="material-symbols-outlined text-[20px]">search</span>
            </button>
          </div>
          <button class="text-on-surface hover:text-primary transition-colors duration-300 lg:hidden">
            <span class="material-symbols-outlined">search</span>
          </button>
          <!-- User Account Menu -->
          <div class="relative hidden md:block">
            <button 
              @click.stop="toggleAccountMenu"
              class="text-on-surface hover:text-primary transition-colors duration-300 flex items-center justify-center cursor-pointer" 
              title="Tài khoản"
            >
              <span class="material-symbols-outlined">person</span>
            </button>
            
            <!-- Dropdown Menu -->
            <div 
              v-if="showAccountMenu"
              @click.stop
              class="absolute right-0 mt-2 w-72 bg-surface border border-outline-variant/30 rounded-lg shadow-xl py-6 px-5 z-50 text-center transition-all duration-300"
            >
              <template v-if="!authStore.isLoggedIn">
                <h4 class="text-label-sm font-bold text-on-surface uppercase tracking-wider mb-1">CHÀO MỪNG QUÝ KHÁCH ĐẾN VỚI BEE STYLISH</h4>
                <p class="text-[12px] text-on-surface-variant mb-4">Đăng nhập tài khoản của Quý Khách</p>
                <RouterLink 
                  to="/auth" 
                  @click="closeAllMenus"
                  class="block w-full bg-primary hover:bg-primary/95 text-on-primary text-label-sm font-bold uppercase py-2.5 rounded transition-colors mb-5 cursor-pointer"
                >
                  ĐĂNG NHẬP
                </RouterLink>
                <div class="border-t border-outline-variant/30 my-4"></div>
                <h4 class="text-label-sm font-bold text-on-surface uppercase tracking-wider mb-1">ĐĂNG KÝ THÀNH VIÊN</h4>
                <p class="text-[12px] text-on-surface-variant mb-4">Nhận ngay ưu đãi khi mua hàng online</p>
                <RouterLink 
                  to="/auth" 
                  @click="closeAllMenus"
                  class="block w-full border border-primary text-primary hover:bg-primary/5 text-label-sm font-bold uppercase py-2.5 rounded transition-all cursor-pointer"
                >
                  ĐĂNG KÝ
                </RouterLink>
              </template>
              <template v-else>
                <h4 class="text-label-sm font-bold text-on-surface uppercase tracking-wider mb-1">XIN CHÀO</h4>
                <p class="text-body-md font-medium text-primary mb-2">{{ authStore.user?.hoTen }}</p>
                <p class="text-[12px] text-on-surface-variant mb-4">Vai trò: {{ authStore.isCustomer ? 'Khách hàng' : (authStore.isManager ? 'Quản lý' : 'Nhân viên') }}</p>
                <div class="flex flex-col gap-2 mb-4 text-left border-t border-outline-variant/30 pt-3">
                  <RouterLink
                    to="/profile"
                    @click="closeAllMenus"
                    class="flex items-center gap-2 py-1 text-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-[18px]">account_circle</span>
                    Hồ sơ
                  </RouterLink>
                  <RouterLink
                    to="/my-orders"
                    @click="closeAllMenus"
                    class="flex items-center gap-2 py-1 text-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                    Đơn hàng của tôi
                  </RouterLink>
                </div>
                <RouterLink 
                  v-if="authStore.isAdminOrStaff" 
                  to="/admin" 
                  @click="closeAllMenus"
                  class="block w-full bg-secondary text-on-secondary hover:bg-secondary/90 text-label-sm font-bold uppercase py-2.5 rounded transition-colors mb-3 cursor-pointer"
                >
                  HỆ THỐNG QUẢN TRỊ
                </RouterLink>
                <button 
                  @click="handleLogout" 
                  class="block w-full bg-primary hover:bg-primary/95 text-on-primary text-label-sm font-bold uppercase py-2.5 rounded transition-colors cursor-pointer"
                >
                  ĐĂNG XUẤT
                </button>
              </template>
            </div>
          </div>
          <RouterLink class="text-on-surface hover:text-primary transition-colors duration-300 relative group" to="/cart">
            <span class="material-symbols-outlined group-hover:scale-110 transition-transform">shopping_bag</span>
            <span class="absolute -top-1 -right-1 bg-primary-container text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">1</span>
          </RouterLink>
          <button class="text-on-surface hover:text-primary transition-colors duration-300 md:hidden">
            <span class="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      <!-- Mobile Navigation (Bottom Nav - Simplified) -->
      <nav class="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-outline-variant/30 z-50 flex justify-around items-center py-3 px-margin-mobile pb-[max(env(safe-area-inset-bottom),12px)]">
        <RouterLink class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors" to="/">
          <span class="material-symbols-outlined">home</span>
          <span class="text-[10px] uppercase font-bold">Trang chủ</span>
        </RouterLink>
        <a class="flex flex-col items-center gap-1 text-primary" href="#">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">category</span>
          <span class="text-[10px] uppercase font-bold">Danh mục</span>
        </a>
        <a class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors" href="#">
          <span class="material-symbols-outlined">favorite</span>
          <span class="text-[10px] uppercase font-bold">Yêu thích</span>
        </a>
        <!-- User Account Menu on Mobile -->
        <template v-if="!authStore.isLoggedIn">
          <RouterLink class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors" to="/auth">
            <span class="material-symbols-outlined">person</span>
            <span class="text-[10px] uppercase font-bold">Cá nhân</span>
          </RouterLink>
        </template>
        <template v-else>
          <div class="relative flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer select-none" @click.stop="toggleMobileMenu">
            <span class="material-symbols-outlined">person</span>
            <span class="text-[10px] uppercase font-bold truncate max-w-[60px]">{{ authStore.user?.hoTen?.split(' ').pop() || 'Cá nhân' }}</span>
            
            <!-- Mobile Account Dropup -->
            <div 
              v-if="showMobileMenu" 
              @click.stop
              class="fixed bottom-[70px] right-4 bg-surface border border-outline-variant/30 rounded-lg shadow-xl p-4 z-50 w-56 text-center"
            >
              <p class="text-xs text-on-surface-variant mb-2">Xin chào, {{ authStore.user?.hoTen }}</p>
              <div class="flex flex-col gap-2 mb-3 text-left border-t border-b border-outline-variant/30 py-2">
                <RouterLink
                  to="/profile"
                  @click="closeAllMenus"
                  class="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[16px]">account_circle</span>
                  Hồ sơ
                </RouterLink>
                <RouterLink
                  to="/my-orders"
                  @click="closeAllMenus"
                  class="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[16px]">receipt_long</span>
                  Đơn hàng của tôi
                </RouterLink>
              </div>
              <RouterLink 
                v-if="authStore.isAdminOrStaff" 
                to="/admin" 
                @click="closeAllMenus"
                class="block w-full bg-secondary text-on-secondary text-xs font-bold uppercase py-2 rounded mb-2"
              >
                Quản trị
              </RouterLink>
              <button 
                @click="handleLogout" 
                class="block w-full bg-primary text-on-primary text-xs font-bold uppercase py-2 rounded cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </template>
      </nav>

      <!-- Main Content Slot -->
      <slot />
    </div>

    <!-- 7. Footer -->
    <footer class="w-full bg-surface-container dark:bg-inverse-surface text-primary dark:text-primary-fixed text-body-md font-body-md border-t border-outline-variant pt-section-gap pb-10 mt-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mb-12">
        <!-- Col 1: Brand & Contact -->
        <div class="lg:col-span-2 flex flex-col gap-6">
          <RouterLink class="shrink-0 flex items-center mb-2" to="/">
            <img
              alt="Bee Stylish Logo"
              class="h-16 md:h-24 object-contain"
              src="/logoteam.png"
            />
          </RouterLink>
          <p class="text-on-surface-variant max-w-sm">
            Thương hiệu thời trang ứng dụng mang đến trải nghiệm mua sắm đẳng cấp với các sản phẩm tối giản, thanh lịch và chất lượng.
          </p>
          <div class="flex flex-col gap-2 mt-2">
            <div class="flex items-start gap-2 text-on-surface-variant">
              <span class="material-symbols-outlined text-[20px] shrink-0 mt-1">location_on</span>
              <span>123 Tôn Dật Tiên, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh</span>
            </div>
            <div class="flex items-center gap-2 text-on-surface-variant">
              <span class="material-symbols-outlined text-[20px] shrink-0">call</span>
              <span>1900 123 456</span>
            </div>
            <div class="flex items-center gap-2 text-on-surface-variant">
              <span class="material-symbols-outlined text-[20px] shrink-0">mail</span>
              <span>hello@beestylish.com</span>
            </div>
          </div>
        </div>
        <!-- Col 2: Links -->
        <div class="flex flex-col gap-4">
          <h4 class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface font-bold mb-2">VỀ CHÚNG TÔI</h4>
          <a class="text-on-surface-variant hover:text-on-surface opacity-80 hover:opacity-100 hover:translate-x-1 transition-all duration-200" href="#">Câu chuyện thương hiệu</a>
          <a class="text-on-surface-variant hover:text-on-surface opacity-80 hover:opacity-100 hover:translate-x-1 transition-all duration-200" href="#">Hệ thống cửa hàng</a>
          <a class="text-primary font-semibold hover:translate-x-1 transition-transform duration-200" href="#">Tuyển dụng</a>
          <a class="text-on-surface-variant hover:text-on-surface opacity-80 hover:opacity-100 hover:translate-x-1 transition-all duration-200" href="#">Tin tức & Sự kiện</a>
        </div>
        <!-- Col 3: Customer Service -->
        <div class="flex flex-col gap-4">
          <h4 class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface font-bold mb-2">HỖ TRỢ KHÁCH HÀNG</h4>
          <a class="text-on-surface-variant hover:text-on-surface opacity-80 hover:opacity-100 hover:translate-x-1 transition-all duration-200" href="#">Chính sách vận chuyển</a>
          <a class="text-on-surface-variant hover:text-on-surface opacity-80 hover:opacity-100 hover:translate-x-1 transition-all duration-200" href="#">Chính sách đổi trả</a>
          <a class="text-on-surface-variant hover:text-on-surface opacity-80 hover:opacity-100 hover:translate-x-1 transition-all duration-200" href="#">Bảo mật thông tin</a>
          <a class="text-on-surface-variant hover:text-on-surface opacity-80 hover:opacity-100 hover:translate-x-1 transition-all duration-200" href="#">Câu hỏi thường gặp</a>
        </div>
        <!-- Col 4: Newsletter & Social -->
        <div class="flex flex-col gap-6">
          <h4 class="text-label-sm font-label-sm uppercase tracking-widest text-on-surface font-bold">ĐĂNG KÝ NHẬN TIN</h4>
          <p class="text-on-surface-variant text-sm">Nhận thông tin ưu đãi mới nhất từ Bee Stylish.</p>
          <form class="flex border border-outline-variant focus-within:border-primary transition-colors">
            <input class="bg-transparent border-none outline-none px-4 py-3 w-full text-sm focus:ring-0 placeholder:text-on-surface-variant/70" placeholder="Email của bạn..." type="email"/>
            <button class="bg-primary-container text-on-primary px-4 py-3 hover:bg-primary transition-colors" type="submit">
              <span class="material-symbols-outlined">send</span>
            </button>
          </form>
          <div class="flex gap-4 mt-2">
            <!-- Social placeholders -->
            <a class="w-10 h-10 border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:bg-primary-container hover:text-on-primary hover:border-primary-container transition-all" href="#">
              <span class="font-bold text-lg">f</span>
            </a>
            <a class="w-10 h-10 border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:bg-primary-container hover:text-on-primary hover:border-primary-container transition-all" href="#">
              <span class="font-bold text-lg">in</span>
            </a>
            <a class="w-10 h-10 border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:bg-primary-container hover:text-on-primary hover:border-primary-container transition-all" href="#">
              <span class="font-bold text-lg">yt</span>
            </a>
          </div>
        </div>
      </div>
      <!-- Copyright & Payment -->
      <div class="border-t border-outline-variant/50 pt-6 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-sm text-on-surface-variant">© 2024 Bee Stylish. All Rights Reserved.</p>
        <div class="flex gap-2 items-center">
          <div class="h-8 w-12 bg-surface border border-outline-variant/30 flex items-center justify-center rounded text-[10px] font-bold text-on-surface-variant">VISA</div>
          <div class="h-8 w-12 bg-surface border border-outline-variant/30 flex items-center justify-center rounded text-[10px] font-bold text-on-surface-variant">MASTER</div>
          <div class="h-8 w-12 bg-surface border border-outline-variant/30 flex items-center justify-center rounded text-[10px] font-bold text-on-surface-variant">ATM</div>
        </div>
      </div>
    </footer>
    <ChatbotWidget />
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
