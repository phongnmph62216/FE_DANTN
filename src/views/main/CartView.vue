<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { formatCurrency } from '@/utils/format'

const cartItems = ref([])

const loadCart = () => {
  cartItems.value = JSON.parse(localStorage.getItem('bee_cart') || '[]')
}

const saveCart = () => {
  localStorage.setItem('bee_cart', JSON.stringify(cartItems.value))
}

// Adjust quantity
const increment = (item) => {
  if (item.quantity < item.stock) {
    item.quantity++
    saveCart()
  } else {
    alert(`Số lượng tồn kho tối đa là ${item.stock}!`)
  }
}

const decrement = (item) => {
  if (item.quantity > 1) {
    item.quantity--
    saveCart()
  }
}

const updateQuantity = (item, val) => {
  let num = parseInt(val, 10)
  if (isNaN(num) || num < 1) {
    num = 1
  }
  if (item.stock && num > item.stock) {
    alert(`Số lượng tồn kho tối đa là ${item.stock}!`)
    num = item.stock
  }
  item.quantity = num
  saveCart()
}

// Delete item
const deleteItem = (item) => {
  cartItems.value = cartItems.value.filter(i => i.variantId !== item.variantId)
  saveCart()
}

// Calculations
const totalPrice = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const totalQuantity = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

// Free shipping calculations
const shippingTarget = 399000
const shippingRemains = computed(() => Math.max(0, shippingTarget - totalPrice.value))
const freeShippingQualified = computed(() => totalPrice.value >= shippingTarget)

onMounted(() => {
  loadCart()
})
</script>

<template>
  <main class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-section-gap">
    <!-- Progress Stepper -->
    <div class="flex items-center justify-center mb-12 overflow-x-auto pb-4">
      <div class="flex items-center space-x-4 md:space-x-8 min-w-max">
        <!-- Step 1 (Active) -->
        <div class="flex items-center space-x-2 text-[#EF972D]">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">shopping_bag</span>
          <span class="font-label-sm text-label-sm uppercase tracking-wider">GIỎ HÀNG</span>
        </div>
        <!-- Divider -->
        <div class="w-16 md:w-32 border-t border-dashed border-outline-variant/50"></div>
        <!-- Step 2 -->
        <div class="flex items-center space-x-2 text-outline/60">
          <span class="material-symbols-outlined">payments</span>
          <span class="font-label-sm text-label-sm uppercase tracking-wider">ĐẶT HÀNG</span>
        </div>
        <!-- Divider -->
        <div class="w-16 md:w-32 border-t border-dashed border-outline-variant/50"></div>
        <!-- Step 3 -->
        <div class="flex items-center space-x-2 text-outline/60">
          <span class="material-symbols-outlined">check_circle</span>
          <span class="font-label-sm text-label-sm uppercase tracking-wider">HOÀN THÀNH ĐƠN HÀNG</span>
        </div>
      </div>
    </div>

    <!-- Empty Cart State -->
    <div v-if="cartItems.length === 0" class="bg-surface border border-outline-variant/30 p-12 text-center flex flex-col items-center gap-6 max-w-xl mx-auto">
      <span class="material-symbols-outlined text-[64px] text-outline/40">shopping_cart_off</span>
      <h2 class="text-title-md font-title-md text-on-surface">Giỏ hàng của bạn đang trống</h2>
      <p class="text-on-surface-variant">Hãy quay lại trang chủ và khám phá các sản phẩm thời trang mới nhất của Bee Stylish.</p>
      <RouterLink to="/" class="bg-[#EF972D] text-white py-3 px-8 font-label-sm text-label-sm uppercase tracking-widest hover:bg-[#EF972D]/90 transition-colors">
        TIẾP TỤC MUA SẮM
      </RouterLink>
    </div>

    <!-- Active Cart Layout -->
    <div v-else class="flex flex-col lg:flex-row gap-gutter md:gap-8 lg:gap-12 items-start">
      <!-- Left Column (Cart Items & Alerts) -->
      <div class="w-full lg:w-2/3 flex flex-col gap-6">
        <!-- Shipping Alert -->
        <div class="bg-surface-container-high/50 p-6 flex items-start space-x-4 border border-outline-variant/30">
          <span class="material-symbols-outlined text-[#EF972D] mt-1" style="font-variation-settings: 'FILL' 1;">local_shipping</span>
          <div>
            <p v-if="!freeShippingQualified" class="font-body-md text-body-md text-on-surface">
              Mua thêm <span class="font-bold">{{ formatCurrency(shippingRemains) }}</span> để nhận ngay <span class="font-bold text-[#EF972D]">Ưu đãi miễn phí vận chuyển.</span>
            </p>
            <p v-else class="font-body-md text-body-md text-on-surface">
              Chúc mừng! Bạn đã đủ điều kiện nhận <span class="font-bold text-[#EF972D]">Miễn phí vận chuyển.</span>
            </p>
            <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-1">(Có thể thay đổi nếu áp dụng code ưu đãi)</p>
          </div>
        </div>

        <!-- Trust Alert -->
        <div class="bg-surface p-6 border border-outline-variant/30">
          <p class="font-body-md text-body-md text-on-surface leading-relaxed">
            <span class="font-bold">An tâm mua sắm</span> hàng chính hãng tại <span class="text-[#EF972D]">BeeStylish.vn</span><br/>
            Được kiểm tra hàng trước khi thanh toán &amp; hài lòng<br/>
            Được đổi hàng trong 15 ngày theo chính sách (*)
          </p>
        </div>

        <!-- Cart Table Section -->
        <div class="bg-surface border border-outline-variant/30 p-6">
          <h2 class="font-title-md text-title-md text-on-surface mb-6 uppercase tracking-wider font-bold">
            GIỎ HÀNG <span class="text-on-surface-variant text-base font-normal">({{ totalQuantity }} sản phẩm)</span>
          </h2>

          <!-- Desktop Header Row -->
          <div class="hidden md:grid grid-cols-12 gap-4 border-b border-outline-variant/30 pb-4 mb-6">
            <div class="col-span-5 font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-bold">Tên Hàng</div>
            <div class="col-span-2 font-label-sm text-label-sm uppercase tracking-wider text-on-surface text-center font-bold">Giá</div>
            <div class="col-span-3 font-label-sm text-label-sm uppercase tracking-wider text-on-surface text-center font-bold">Số Lượng</div>
            <div class="col-span-2 font-label-sm text-label-sm uppercase tracking-wider text-on-surface text-right font-bold">Tổng Tiền</div>
          </div>

          <!-- Cart Items -->
          <div v-for="item in cartItems" :key="item.variantId" class="flex flex-col md:grid md:grid-cols-12 gap-4 items-center py-6 border-b border-outline-variant/10 last:border-0 relative">
            <!-- Product Info (Image + Details) -->
            <div class="col-span-12 md:col-span-5 flex items-start gap-4 w-full">
              <img class="w-24 h-32 object-cover bg-surface-variant shrink-0" :src="item.image" alt="Product image in cart"/>
              <div class="flex flex-col gap-1 w-full">
                <h3 class="font-body-lg text-body-lg text-on-surface font-bold uppercase leading-tight">{{ item.productName }}</h3>
                <p class="text-xs text-outline mb-1">Mã sản phẩm: {{ item.productCode }} ({{ item.variantCode }})</p>
                <div class="font-body-md text-body-md text-on-surface-variant text-sm mt-1">
                  Kích thước: <span class="font-bold text-on-surface">{{ item.size }}</span><br/>
                  Màu Sắc: <span class="font-bold text-on-surface">{{ item.color }}</span>
                </div>
              </div>
            </div>

            <!-- Price -->
            <div class="col-span-12 md:col-span-2 flex flex-row md:flex-col justify-between md:justify-center items-center w-full mt-4 md:mt-0">
              <span class="md:hidden font-label-sm text-label-sm uppercase text-on-surface-variant">Giá:</span>
              <div class="text-right md:text-center">
                <div class="font-title-md text-title-md text-[#EF972D] font-bold">{{ formatCurrency(item.price) }}</div>
                <div v-if="item.originalPrice > item.price" class="font-body-md text-body-md text-outline line-through text-xs">{{ formatCurrency(item.originalPrice) }}</div>
              </div>
            </div>

            <!-- Quantity -->
            <div class="col-span-12 md:col-span-3 flex justify-between md:justify-center items-center w-full mt-4 md:mt-0">
              <span class="md:hidden font-label-sm text-label-sm uppercase text-on-surface-variant">Số Lượng:</span>
              <div class="flex items-center border border-outline-variant/50">
                <button @click="decrement(item)" class="px-3 py-1 text-on-surface hover:bg-surface-variant transition-colors focus:outline-none font-bold">-</button>
                <input 
                  class="w-12 text-center border-0 p-1 text-sm bg-transparent focus:ring-0 focus:outline-none font-bold" 
                  type="number" 
                  min="1" 
                  :max="item.stock"
                  :value="item.quantity"
                  @change="updateQuantity(item, $event.target.value)"
                  @blur="updateQuantity(item, $event.target.value)"
                />
                <button @click="increment(item)" class="px-3 py-1 text-on-surface hover:bg-surface-variant transition-colors focus:outline-none font-bold">+</button>
              </div>
            </div>

            <!-- Total -->
            <div class="col-span-12 md:col-span-2 flex justify-between md:justify-end items-center w-full mt-4 md:mt-0">
              <span class="md:hidden font-label-sm text-label-sm uppercase text-on-surface-variant">Tổng Tiền:</span>
              <div class="font-title-md text-title-md text-on-surface font-bold">{{ formatCurrency(item.price * item.quantity) }}</div>
            </div>

            <!-- Delete Button -->
            <button @click="deleteItem(item)" class="absolute bottom-4 right-0 text-outline hover:text-red-600 transition-colors p-2 focus:outline-none" title="Xóa sản phẩm">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right Column (Order Summary - Sticky) -->
      <div class="w-full lg:w-1/3 lg:sticky lg:top-32">
        <div class="bg-surface border border-outline-variant/30 p-6 flex flex-col gap-6">
          <h2 class="font-title-md text-title-md text-on-surface uppercase tracking-wider border-b border-outline-variant/30 pb-4 font-bold">ĐƠN HÀNG</h2>
          <div class="flex justify-between items-center py-2 border-b border-dashed border-outline-variant/50">
            <span class="font-body-md text-body-md text-on-surface">Tổng giá trị đơn hàng</span>
            <span class="font-title-md text-title-md text-[#EF972D] font-bold">{{ formatCurrency(totalPrice) }}</span>
          </div>

          <!-- Payment Channel Limits Info Badges -->
          <div v-if="totalPrice > 20000000" class="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-xs font-semibold leading-relaxed flex items-start gap-2">
            <span class="material-symbols-outlined text-red-600 text-base shrink-0 mt-0.5">error</span>
            <div>
              Tổng đơn hàng vượt <strong>20.000.000đ</strong> (hạn mức thanh toán tối đa mỗi giao dịch). Vui lòng chia nhỏ đơn hàng trước khi thanh toán.
            </div>
          </div>
          <div v-else-if="totalPrice > 5000000" class="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-xs font-semibold leading-relaxed flex items-start gap-2">
            <span class="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">info</span>
            <div>
              Đơn hàng trên <strong>5.000.000đ</strong> chỉ hỗ trợ thanh toán Online (VNPAY) tại bước Đặt hàng để đảm bảo an toàn giao nhận GHN.
            </div>
          </div>

          <RouterLink to="/checkout" class="w-full bg-[#EF972D] text-white py-4 font-label-sm text-label-sm uppercase tracking-widest hover:bg-[#EF972D]/90 transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm font-bold">
            TIẾP TỤC THANH TOÁN
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
          <p class="font-body-md text-body-md text-on-surface-variant text-sm text-center">
            Dùng mã giảm giá của <span class="font-bold text-on-surface">Bee Stylish</span> trong bước tiếp theo
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Scoped styles */
</style>
