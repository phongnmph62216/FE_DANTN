<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/services/api'

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
const voucherError = ref('')
const voucherSuccess = ref('')
const orderNumber = ref('')

// Payment steps: 'checkout', 'success'
const checkoutStep = ref('checkout')
const isSubmitted = computed(() => checkoutStep.value === 'success')
const isProcessingPayment = ref(false)
const paymentError = ref('')

// Location Mock Data
const cities = ['HÃ  Ná»™i', 'Há»“ ChÃ­ Minh', 'ÄÃ  Náºµng', 'Háº£i PhÃ²ng', 'Cáº§n ThÆ¡']
const districts = {
  'HÃ  Ná»™i': ['Cáº§u Giáº¥y', 'HoÃ n Kiáº¿m', 'Äá»‘ng Äa', 'Hai BÃ  TrÆ°ng'],
  'Há»“ ChÃ­ Minh': ['Quáº­n 1', 'Quáº­n 3', 'Quáº­n 7', 'ThÃ nh phá»‘ Thá»§ Äá»©c'],
  'ÄÃ  Náºµng': ['Háº£i ChÃ¢u', 'Thanh KhÃª', 'SÆ¡n TrÃ ', 'LiÃªn Chiá»ƒu'],
}
const wards = {
  'Cáº§u Giáº¥y': ['Dá»‹ch Vá»ng', 'NghÄ©a TÃ¢n', 'YÃªn HÃ²a', 'Mai Dá»‹ch'],
  'Quáº­n 1': ['Báº¿n NghÃ©', 'Báº¿n ThÃ nh', 'Äa Kao', 'TÃ¢n Äá»‹nh'],
  'Háº£i ChÃ¢u': ['Tháº¡ch Thang', 'Háº£i ChÃ¢u I', 'Háº£i ChÃ¢u II', 'HÃ²a Thuáº­n ÄÃ´ng'],
}

const availableDistricts = computed(() => {
  return districts[selectedCity.value] || []
})

const availableWards = computed(() => {
  return wards[selectedDistrict.value] || []
})

// Financial calculations
const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const shippingFee = computed(() => {
  return subtotal.value >= 399000 ? 0 : 30000
})

const totalPayment = computed(() => Math.max(0, subtotal.value + shippingFee.value - discountAmount.value))

const formatCurrency = (val) => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' Ä‘'
}

// Apply Voucher
const applyVoucher = () => {
  voucherError.value = ''
  voucherSuccess.value = ''
  
  if (!voucherCode.value) {
    voucherError.value = 'Vui lÃ²ng nháº­p mÃ£ giáº£m giÃ¡'
    return
  }

  const code = voucherCode.value.toUpperCase().trim()
  if (code === 'BEE200') {
    discountAmount.value = 50000
    voucherSuccess.value = 'Ãp dá»¥ng mÃ£ BEE200 thÃ nh cÃ´ng! Giáº£m 50.000Ä‘'
  } else if (code === 'BEE50') {
    discountAmount.value = 20000
    voucherSuccess.value = 'Ãp dá»¥ng mÃ£ BEE50 thÃ nh cÃ´ng! Giáº£m 20.000Ä‘'
  } else {
    voucherError.value = 'MÃ£ giáº£m giÃ¡ khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n'
    discountAmount.value = 0
  }
}

// Handle Order Submission
const submitOrder = async (e) => {
  e.preventDefault()
  paymentError.value = ''
  
  // Basic validation check
  if (!fullName.value || !email.value || !phone.value || !selectedCity.value || !selectedDistrict.value || !address.value) {
    alert('Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ cÃ¡c thÃ´ng tin báº¯t buá»™c (*)')
    return
  }

  if (cartItems.value.length === 0) {
    alert('Giá» hÃ ng cá»§a báº¡n Ä‘ang trá»‘ng!')
    return
  }

  // Generate random order ID
  orderNumber.value = 'BST-' + Math.floor(100000 + Math.random() * 900000)

  if (paymentMethod.value === 'VNPAY') {
    // Gá»i API backend táº¡o URL thanh toÃ¡n VNPAY â†’ redirect sang VNPAY sandbox tháº­t
    isProcessingPayment.value = true
    try {
      const response = await api.post('/api/v1/vnpay/create-payment', {
        amount: totalPayment.value,
        orderInfo: 'Thanh toan don hang ' + orderNumber.value,
        orderId: orderNumber.value
      })
      const paymentUrl = response.data.paymentUrl
      // Redirect trÃ¬nh duyá»‡t sang cá»•ng VNPAY sandbox tháº­t
      window.location.href = paymentUrl
    } catch (error) {
      console.error('VNPAY error:', error)
      isProcessingPayment.value = false
      paymentError.value = 'KhÃ´ng thá»ƒ táº¡o giao dá»‹ch thanh toÃ¡n. Vui lÃ²ng thá»­ láº¡i.'
    }
  } else {
    // COD - thanh toÃ¡n khi nháº­n hÃ ng
    checkoutStep.value = 'success'
    localStorage.removeItem('bee_cart')
  }
}

onMounted(() => {
  loadCart()
})
</script>

<template>
  <main class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-section-gap">
    <!-- Stepper -->
    <div class="flex justify-center items-center mb-10 gap-4 overflow-x-auto whitespace-nowrap pb-4">
      <RouterLink to="/cart" class="flex items-center gap-2 text-on-surface hover:text-[#ef972d] transition-colors">
        <span class="material-symbols-outlined">shopping_bag</span>
        <span class="font-title-md uppercase tracking-wide text-sm">GIá»Ž HÃ€NG</span>
      </RouterLink>
      <div class="w-8 md:w-16 border-t-2 border-dashed border-outline-variant"></div>
      <div class="flex items-center gap-2" :class="isSubmitted ? 'text-on-surface' : 'text-[#ef972d]'">
        <span class="material-symbols-outlined">inventory_2</span>
        <span class="font-title-md uppercase tracking-wide text-sm" :class="!isSubmitted && 'font-bold'">Äáº¶T HÃ€NG</span>
      </div>
      <div class="w-8 md:w-16 border-t-2 border-dashed border-outline-variant"></div>
      <div class="flex items-center gap-2" :class="isSubmitted ? 'text-[#ef972d]' : 'text-on-surface-variant/60'">
        <span class="material-symbols-outlined" :class="isSubmitted && 'fill'">task_alt</span>
        <span class="font-title-md uppercase tracking-wide text-sm" :class="isSubmitted && 'font-bold'">HOÃ€N THÃ€NH ÄÆ N HÃ€NG</span>
      </div>
    </div>

    <!-- Success View -->
    <div v-if="checkoutStep === 'success'" class="bg-surface-container-lowest p-8 md:p-12 rounded shadow-sm border border-outline-variant/30 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
      <span class="material-symbols-outlined text-[72px] text-green-500" style="font-variation-settings: 'FILL' 1;">check_circle</span>
      <h2 class="text-headline-lg font-headline-lg text-[#ef972d] font-bold">Äáº¶T HÃ€NG THÃ€NH CÃ”NG!</h2>
      <p class="text-body-lg text-on-surface">
        Cáº£m Æ¡n <span class="font-bold text-[#ef972d]">{{ fullName }}</span> Ä‘Ã£ tin tÆ°á»Ÿng mua sáº¯m táº¡i Bee Stylish.<br/>
        MÃ£ Ä‘Æ¡n hÃ ng cá»§a báº¡n lÃ : <span class="font-bold text-on-surface text-lg underline">{{ orderNumber }}</span>
      </p>
      
      <div class="w-full text-left bg-surface-container-low p-6 rounded border border-outline-variant/30 flex flex-col gap-3 text-sm">
        <h3 class="font-bold text-on-surface border-b border-outline-variant/30 pb-2 mb-1">THÃ”NG TIN GIAO HÃ€NG</h3>
        <div>Há» vÃ  tÃªn: <span class="font-semibold text-on-surface">{{ fullName }}</span></div>
        <div>Sá»‘ Ä‘iá»‡n thoáº¡i: <span class="font-semibold text-on-surface">{{ phone }}</span></div>
        <div>Äá»‹a chá»‰: <span class="font-semibold text-on-surface">{{ address }}, {{ selectedWard || '' }} {{ selectedDistrict }}, {{ selectedCity }}</span></div>
        <div>PhÆ°Æ¡ng thá»©c: <span class="font-semibold text-on-surface">{{ paymentMethod === 'COD' ? 'Thanh toÃ¡n khi nháº­n hÃ ng (COD)' : 'Thanh toÃ¡n online (VNPAY)' }}</span></div>
        <div>Tá»•ng thanh toÃ¡n: <span class="font-semibold text-[#ef972d] font-bold text-base">{{ formatCurrency(totalPayment) }}</span></div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
        <RouterLink to="/" class="bg-[#ef972d] hover:bg-[#d88523] text-white font-label-sm uppercase px-8 py-3 rounded transition-colors text-center tracking-wider">
          TIáº¾P Tá»¤C MUA Sáº®M
        </RouterLink>
      </div>
    </div>

    <!-- VNPAY Payment Processing Overlay -->
    <div v-else-if="isProcessingPayment" class="bg-surface-container-lowest p-8 md:p-12 rounded shadow-sm border border-outline-variant/30 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
      <div class="w-16 h-16 border-4 border-t-[#ef972d] border-slate-200 rounded-full animate-spin"></div>
      <h2 class="text-headline-lg font-headline-lg text-on-surface font-bold">Äang chuyá»ƒn Ä‘áº¿n cá»•ng thanh toÃ¡n...</h2>
      <p class="text-body-lg text-on-surface-variant">
        Vui lÃ²ng Ä‘á»£i, báº¡n sáº½ Ä‘Æ°á»£c chuyá»ƒn Ä‘áº¿n trang thanh toÃ¡n VNPAY.
      </p>
    </div>

    <!-- Payment Error -->
    <div v-else-if="paymentError" class="bg-surface-container-lowest p-8 md:p-12 rounded shadow-sm border border-outline-variant/30 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
      <span class="material-symbols-outlined text-[72px] text-red-500" style="font-variation-settings: 'FILL' 1;">error</span>
      <h2 class="text-headline-lg font-headline-lg text-red-500 font-bold">Lá»–I THANH TOÃN!</h2>
      <p class="text-body-lg text-on-surface">{{ paymentError }}</p>
      <button @click="paymentError = ''" class="bg-[#ef972d] hover:bg-[#d88523] text-white font-label-sm uppercase px-8 py-3 rounded transition-colors text-center tracking-wider">
        THá»¬ Láº I
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
              Äá»ŠA CHá»ˆ GIAO HÃ€NG
            </h2>
          </div>

          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">Há»Œ TÃŠN <span class="text-error">*</span></label>
                <input required v-model="fullName" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Nháº­p há» tÃªn cá»§a báº¡n" type="text"/>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">EMAIL <span class="text-error">*</span></label>
                <input required v-model="email" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Nháº­p email cá»§a báº¡n" type="email"/>
              </div>
            </div>

            <div class="flex flex-col gap-1 w-full md:w-1/2 md:pr-2">
              <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">SÄT <span class="text-error">*</span></label>
              <input required v-model="phone" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Nháº­p sá»‘ Ä‘iá»‡n thoáº¡i" type="tel"/>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">Tá»ˆNH / THÃ€NH PHá» <span class="text-error">*</span></label>
                <select required v-model="selectedCity" @change="selectedDistrict = ''; selectedWard = ''" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-on-surface-variant">
                  <option value="">Chá»n tá»‰nh / thÃ nh phá»‘</option>
                  <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">QUáº¬N / HUYá»†N <span class="text-error">*</span></label>
                <select required v-model="selectedDistrict" @change="selectedWard = ''" :disabled="!selectedCity" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-on-surface-variant disabled:opacity-50">
                  <option value="">Chá»n quáº­n huyá»‡n</option>
                  <option v-for="d in availableDistricts" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">PHÆ¯á»œNG / XÃƒ</label>
                <select v-model="selectedWard" :disabled="!selectedDistrict" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-on-surface-variant disabled:opacity-50">
                  <option value="">Chá»n phÆ°á»ng xÃ£</option>
                  <option v-for="w in availableWards" :key="w" :value="w">{{ w }}</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">Äá»ŠA CHá»ˆ <span class="text-error">*</span></label>
              <input required v-model="address" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" placeholder="Nháº­p Ä‘á»‹a chá»‰ cá»§a báº¡n" type="text"/>
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">GHI CHÃš</label>
              <textarea v-model="notes" class="border border-outline-variant rounded p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none" placeholder="Nháº­p ghi chÃº cá»§a báº¡n" rows="3"></textarea>
            </div>
          </div>
        </div>

        <!-- Payment Method Card -->
        <div class="bg-surface-container-lowest p-6 rounded shadow-sm border border-outline-variant/30">
          <div class="mb-4 pb-4 border-b border-outline-variant/30">
            <h2 class="flex items-center gap-2 font-title-md text-on-surface font-bold">
              <span class="material-symbols-outlined text-[#ef972d]">payments</span>
              PHÆ¯Æ NG THá»¨C THANH TOÃN
            </h2>
          </div>
          <div class="flex flex-col gap-4">
            <label class="flex items-center gap-3 cursor-pointer group">
              <input v-model="paymentMethod" value="COD" class="text-[#ef972d] focus:ring-[#ef972d] border-outline-variant h-4 w-4" name="payment_method" type="radio"/>
              <span class="text-body-md text-on-surface group-hover:text-[#ef972d] transition-colors">Thanh toÃ¡n khi nháº­n hÃ ng (COD)</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer group">
              <input v-model="paymentMethod" value="VNPAY" class="text-[#ef972d] focus:ring-[#ef972d] border-outline-variant h-4 w-4" name="payment_method" type="radio"/>
              <span class="text-body-md text-on-surface group-hover:text-[#ef972d] transition-colors">Tháº» ATM/Visa/Master/JCB/QR Pay qua VNPAY-QR</span>
            </label>
          </div>
        </div>

        <!-- Cart Summary -->
        <div class="bg-surface-container-lowest p-6 rounded shadow-sm border border-outline-variant/30 mb-8 lg:mb-0">
          <div class="mb-4 pb-4 border-b border-outline-variant/30">
            <h2 class="font-title-md text-on-surface uppercase font-bold">
              GIá»Ž HÃ€NG <span class="text-[#ef972d] font-normal text-sm lowercase">({{ cartItems.length }}) sáº£n pháº©m</span>
            </h2>
          </div>
          <div class="w-full overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr class="border-b border-outline-variant/30 text-on-surface-variant font-label-sm font-bold">
                  <th class="py-3 px-2 w-[40%]">TÃªn HÃ ng</th>
                  <th class="py-3 px-2">GiÃ¡</th>
                  <th class="py-3 px-2 text-center">Sá»‘ LÆ°á»£ng</th>
                  <th class="py-3 px-2 text-right">Tá»•ng Tiá»n</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in cartItems" :key="item.variantId" class="border-b border-outline-variant/10">
                  <td class="py-4 px-2">
                    <div class="flex items-start gap-4">
                      <div class="w-20 h-24 bg-surface-container-high rounded overflow-hidden flex-shrink-0">
                        <img class="w-full h-full object-cover" :src="item.image" alt="Polo shirt in checkout"/>
                      </div>
                      <div class="flex flex-col justify-center h-full gap-1">
                        <span class="font-body-md text-on-surface font-semibold uppercase">{{ item.productName }}</span>
                        <span class="text-xs text-outline">MÃ£ SP: {{ item.productCode }}</span>
                        <span class="text-sm text-on-surface-variant mt-2">KÃ­ch thÆ°á»›c: <strong>Size {{ item.size }}</strong></span>
                        <span class="text-sm text-on-surface-variant">MÃ u Sáº¯c: <strong>{{ item.color }}</strong></span>
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
          <h2 class="font-title-md text-on-surface uppercase mb-6 border-b border-outline-variant/30 pb-4 font-bold">ÄÆ N HÃ€NG</h2>
          <div class="flex flex-col gap-4">
            <!-- Voucher -->
            <div class="flex flex-col gap-2">
              <label class="font-label-sm text-on-surface-variant uppercase text-xs font-bold">MÃƒ PHIáº¾U GIáº¢M GIÃ</label>
              <div class="flex w-full">
                <input v-model="voucherCode" class="flex-grow border border-outline-variant rounded-l p-3 bg-transparent text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors border-r-0" placeholder="Nháº­p BEE200 hoáº·c BEE50" type="text"/>
                <button type="button" @click="applyVoucher" class="bg-[#ef972d] hover:bg-[#d88523] text-white font-label-sm uppercase px-4 py-3 rounded-r transition-colors focus:outline-none font-bold">ÃP Dá»¤NG</button>
              </div>
              <p v-if="voucherError" class="text-error text-xs mt-1 font-semibold">{{ voucherError }}</p>
              <p v-if="voucherSuccess" class="text-green-600 text-xs mt-1 font-semibold">{{ voucherSuccess }}</p>
            </div>

            <div class="border-t-4 border-dotted border-outline-variant/50 my-2"></div>

            <!-- Price Breakdown -->
            <div class="flex flex-col gap-3 font-body-md text-on-surface-variant">
              <div class="flex justify-between">
                <span>Táº¡m tÃ­nh</span>
                <span class="font-semibold text-on-surface">{{ formatCurrency(subtotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span>PhÃ­ váº­n chuyá»ƒn</span>
                <span class="font-semibold text-on-surface">{{ formatCurrency(shippingFee) }}</span>
              </div>
              <div class="flex justify-between">
                <span>MÃ£ giáº£m giÃ¡</span>
                <span class="font-semibold text-on-surface">-{{ formatCurrency(discountAmount) }}</span>
              </div>
            </div>

            <div class="border-t border-dashed border-outline-variant/50 my-2"></div>

            <!-- Total -->
            <div class="flex justify-between items-end mb-4">
              <span class="font-body-md text-on-surface-variant">Tá»•ng thanh toÃ¡n</span>
              <span class="font-headline-lg font-bold text-[#ef972d]">{{ formatCurrency(totalPayment) }}</span>
            </div>

            <div class="border-t border-dashed border-outline-variant/50 mb-4"></div>

            <!-- Trust Badge -->
            <div class="bg-surface-container-low p-4 rounded text-sm text-center mb-6 text-on-surface-variant leading-relaxed">
              <p>An tÃ¢m mua sáº¯m hÃ ng chÃ­nh hÃ£ng táº¡i <span class="text-[#ef972d] font-semibold">BeeStylish.vn</span></p>
              <p>ÄÆ°á»£c kiá»ƒm tra hÃ ng trÆ°á»›c khi thanh toÃ¡n &amp; hÃ i lÃ²ng</p>
              <p>ÄÆ°á»£c Ä‘á»•i hÃ ng trong 15 ngÃ y theo chÃ­nh sÃ¡ch (*)</p>
            </div>

            <!-- Checkout Button -->
            <button type="submit" class="w-full bg-[#ef972d] hover:bg-[#d88523] text-white font-title-md py-4 rounded transition-colors uppercase tracking-wider mb-2 shadow-sm focus:outline-none font-bold">
              Äáº¶T HÃ€NG
            </button>
            
            <p class="text-xs text-[#ef972d] text-center italic flex items-center justify-center gap-1 font-bold">
              <span class="material-symbols-outlined text-[14px]">info</span>
              Náº¿u Ä‘Æ¡n hÃ ng khÃ´ng cÃ³ thay Ä‘á»•i, Bee Stylish sáº½ khÃ´ng gá»i xÃ¡c nháº­n!
            </p>
          </div>
        </div>
      </div>
    </form>
  </main>
</template>

<style scoped>
/* Scoped styles */
</style>
