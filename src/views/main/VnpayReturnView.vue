<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '@/services/api'
import { formatCurrency } from '@/utils/format'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const cartStore = useCartStore()

const isLoading = ref(true)
const paymentResult = ref(null)
const isSuccess = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  try {
    // Lấy tất cả query params từ URL (VNPAY redirect về đây)
    const queryString = window.location.search
    
    // Gọi API backend để verify kết quả
    const response = await api.get('/api/v1/vnpay/return' + queryString)
    paymentResult.value = response.data
    isSuccess.value = paymentResult.value.isSuccess === 'true'

    // Xóa giỏ hàng nếu thanh toán thành công
    if (isSuccess.value) {
      cartStore.clearCart()
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    errorMessage.value = 'Không thể xác minh kết quả thanh toán. Vui lòng liên hệ hỗ trợ.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <main class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-section-gap">
    <!-- Loading -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div class="w-16 h-16 border-4 border-t-[#ef972d] border-slate-200 rounded-full animate-spin"></div>
      <p class="text-on-surface-variant font-semibold">Đang xác minh kết quả thanh toán...</p>
    </div>

    <!-- Error -->
    <div v-else-if="errorMessage" class="bg-surface-container-lowest p-8 md:p-12 rounded shadow-sm border border-outline-variant/30 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
      <span class="material-symbols-outlined text-[72px] text-red-500" style="font-variation-settings: 'FILL' 1;">error</span>
      <h2 class="text-headline-lg font-headline-lg text-red-500 font-bold">LỖI XÁC MINH!</h2>
      <p class="text-body-lg text-on-surface">{{ errorMessage }}</p>
      <RouterLink to="/" class="bg-[#ef972d] hover:bg-[#d88523] text-white font-label-sm uppercase px-8 py-3 rounded transition-colors text-center tracking-wider">
        VỀ TRANG CHỦ
      </RouterLink>
    </div>

    <!-- Success -->
    <div v-else-if="isSuccess" class="bg-surface-container-lowest p-8 md:p-12 rounded shadow-sm border border-outline-variant/30 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
      <span class="material-symbols-outlined text-[72px] text-green-500" style="font-variation-settings: 'FILL' 1;">check_circle</span>
      <h2 class="text-headline-lg font-headline-lg text-[#ef972d] font-bold">THANH TOÁN THÀNH CÔNG!</h2>
      <p class="text-body-lg text-on-surface">
        Cảm ơn bạn đã tin tưởng mua sắm tại Bee Stylish.<br/>
        Mã đơn hàng: <span class="font-bold text-on-surface text-lg underline">{{ paymentResult?.txnRef }}</span>
      </p>
      
      <div class="w-full text-left bg-surface-container-low p-6 rounded border border-outline-variant/30 flex flex-col gap-3 text-sm">
        <h3 class="font-bold text-on-surface border-b border-outline-variant/30 pb-2 mb-1">THÔNG TIN GIAO DỊCH</h3>
        <div>Mã giao dịch VNPAY: <span class="font-semibold text-on-surface font-mono">{{ paymentResult?.transactionNo }}</span></div>
        <div>Mã đơn hàng: <span class="font-semibold text-on-surface">{{ paymentResult?.txnRef }}</span></div>
        <div>Nội dung: <span class="font-semibold text-on-surface">{{ paymentResult?.orderInfo }}</span></div>
        <div>Số tiền: <span class="font-semibold text-[#ef972d] font-bold text-base">{{ formatCurrency(paymentResult?.amount || 0) }}</span></div>
        <div>Phương thức: <span class="font-semibold text-on-surface">Thanh toán online (VNPAY)</span></div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
        <RouterLink to="/" class="bg-[#ef972d] hover:bg-[#d88523] text-white font-label-sm uppercase px-8 py-3 rounded transition-colors text-center tracking-wider">
          TIẾP TỤC MUA SẮM
        </RouterLink>
      </div>
    </div>

    <!-- Failed -->
    <div v-else class="bg-surface-container-lowest p-8 md:p-12 rounded shadow-sm border border-outline-variant/30 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
      <span class="material-symbols-outlined text-[72px] text-red-500" style="font-variation-settings: 'FILL' 1;">cancel</span>
      <h2 class="text-headline-lg font-headline-lg text-red-500 font-bold">THANH TOÁN THẤT BẠI!</h2>
      <p class="text-body-lg text-on-surface">
        Giao dịch không thành công hoặc bị hủy. Đơn hàng của bạn đã được hủy bỏ và sản phẩm đã hoàn trả lại kho.
      </p>
      <p class="text-body-md text-on-surface-variant">
        Mã lỗi: <span class="font-bold font-mono">{{ paymentResult?.responseCode }}</span>. Vui lòng đặt hàng lại hoặc chọn phương thức thanh toán khác.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
        <RouterLink to="/checkout" class="bg-slate-700 hover:bg-slate-800 text-white font-label-sm uppercase px-8 py-3 rounded transition-colors text-center tracking-wider">
          THỬ LẠI
        </RouterLink>
        <RouterLink to="/" class="bg-[#ef972d] hover:bg-[#d88523] text-white font-label-sm uppercase px-8 py-3 rounded transition-colors text-center tracking-wider">
          VỀ TRANG CHỦ
        </RouterLink>
      </div>
    </div>
  </main>
</template>
