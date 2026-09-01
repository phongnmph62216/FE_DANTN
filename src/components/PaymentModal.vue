<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { formatCurrency, formatInputNumber, parseInputNumber } from '@/utils/format'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  invoiceCode: {
    type: String,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

// Input States
const tienMat = ref(0)
const tienChuyenKhoan = ref(0)
const ghiChu = ref('')
const selectedTab = ref('TIEN_MAT') // 'TIEN_MAT' or 'CHUYEN_KHOAN'

// DOM Elements
const cashInputRef = ref(null)
const transferInputRef = ref(null)

// Calculations
const tongDaNhap = computed(() => {
  return Number(tienMat.value || 0) + Number(tienChuyenKhoan.value || 0)
})

const tienThieu = computed(() => {
  return Math.max(0, props.totalAmount - tongDaNhap.value)
})

const tienThua = computed(() => {
  return Math.max(0, tongDaNhap.value - props.totalAmount)
})

const isSubmitDisabled = computed(() => {
  return tienThieu.value > 0 || props.loading
})

// Cash input change handler with balancing logic
const handleCashChange = (val) => {
  const numeric = Math.max(0, Number(val || 0))
  tienMat.value = numeric
  if (numeric >= props.totalAmount) {
    tienChuyenKhoan.value = 0
  } else {
    tienChuyenKhoan.value = props.totalAmount - numeric
  }
}

// Transfer input change handler with balancing logic
const handleTransferChange = (val) => {
  const numeric = Math.max(0, Number(val || 0))
  tienChuyenKhoan.value = numeric
  if (numeric >= props.totalAmount) {
    tienMat.value = 0
  } else {
    tienMat.value = props.totalAmount - numeric
  }
}

// Suggestion helper
const getQuickCashSuggestions = computed(() => {
  const total = props.totalAmount
  if (!total) return [10000, 20000, 50000, 100000, 200000, 500000]
  const suggestions = new Set()
  suggestions.add(total)
  
  const steps = [10000, 20000, 50000, 100000, 200000, 500000]
  for (const step of steps) {
    if (step >= total) {
      suggestions.add(step)
    }
    const rem = total % step
    if (rem > 0) {
      const rounded = total - rem + step
      if (rounded >= total) suggestions.add(rounded)
    }
  }
  return Array.from(suggestions).sort((a, b) => a - b).slice(0, 6)
})

// VietQR URL helper
const getVietQrImageUrl = computed(() => {
  const amount = Math.max(0, props.totalAmount - tienMat.value)
  return `https://img.vietqr.io/image/vietinbank-109876543210-compact2.png?amount=${amount}&addInfo=${props.invoiceCode}&accountName=CONG%20TY%20BEE%20STYLISH`
})

// Tab Switch Handler
const selectTab = (tab) => {
  selectedTab.value = tab
  if (tab === 'TIEN_MAT') {
    tienMat.value = props.totalAmount
    tienChuyenKhoan.value = 0
    nextTick(() => {
      cashInputRef.value?.focus()
      cashInputRef.value?.select()
    })
  } else {
    tienChuyenKhoan.value = props.totalAmount
    tienMat.value = 0
    nextTick(() => {
      transferInputRef.value?.focus()
      transferInputRef.value?.select()
    })
  }
}

// Reset states on show/hide
watch(() => props.show, (newVal) => {
  if (newVal) {
    tienMat.value = props.totalAmount
    tienChuyenKhoan.value = 0
    ghiChu.value = ''
    selectedTab.value = 'TIEN_MAT'
    nextTick(() => {
      cashInputRef.value?.focus()
      cashInputRef.value?.select()
    })
  }
})

// Submit
const handleSubmit = () => {
  if (isSubmitDisabled.value) return
  emit('submit', {
    tienMat: Number(tienMat.value || 0),
    tienChuyenKhoan: Number(tienChuyenKhoan.value || 0),
    ghiChu: ghiChu.value.trim()
  })
}

// Initial setup
onMounted(() => {
  if (props.show) {
    tienMat.value = props.totalAmount
    nextTick(() => {
      cashInputRef.value?.focus()
    })
  }
})
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transition-all border border-gray-100 flex flex-col text-[#0D2533]">
      
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-bold text-gray-800 text-lg">Thanh toán hóa đơn</h3>
        <button 
          @click="$emit('close')" 
          :disabled="loading"
          class="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-gray-500 block">close</span>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-5 flex-grow overflow-y-auto max-h-[75vh]">
        
        <!-- Total amount box -->
        <div class="flex justify-between items-center p-4 bg-gradient-to-br from-[#EF972D]/5 to-[#0D2533]/5 border border-[#EF972D]/10 rounded-2xl">
          <div class="space-y-1">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã hóa đơn: {{ invoiceCode }}</p>
            <span class="text-sm font-bold text-gray-700">Tổng tiền thanh toán</span>
          </div>
          <span class="text-2xl font-black text-[#EF972D]">{{ formatCurrency(totalAmount) }}</span>
        </div>

        <!-- Payment Mode Tabs -->
        <div class="grid grid-cols-2 gap-3">
          <button 
            type="button"
            @click="selectTab('TIEN_MAT')"
            :class="selectedTab === 'TIEN_MAT' ? 'border-[#EF972D] bg-[#EF972D]/5 text-[#EF972D] ring-2 ring-[#EF972D]/20' : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'"
            class="px-5 py-3 border.5 rounded-xl font-bold text-center cursor-pointer transition-all flex items-center justify-center gap-2 outline-none shadow-sm text-sm"
          >
            <span class="material-symbols-outlined text-lg">payments</span>
            Tiền mặt
          </button>
          
          <button 
            type="button"
            @click="selectTab('CHUYEN_KHOAN')"
            :class="selectedTab === 'CHUYEN_KHOAN' ? 'border-[#EF972D] bg-[#EF972D]/5 text-[#EF972D] ring-2 ring-[#EF972D]/20' : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'"
            class="px-5 py-3 border.5 rounded-xl font-bold text-center cursor-pointer transition-all flex items-center justify-center gap-2 outline-none shadow-sm text-sm"
          >
            <span class="material-symbols-outlined text-lg">account_balance</span>
            Chuyển khoản
          </button>
        </div>

        <!-- Payment Inputs Section (both visible for split payments, highlighting active one) -->
        <div class="space-y-4 border border-gray-100 p-4 rounded-2xl bg-gray-50/30">
          <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Chi tiết phương thức thanh toán</h4>
          
          <!-- Cash Input row -->
          <div class="space-y-1.5">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold" :class="selectedTab === 'TIEN_MAT' ? 'text-[#EF972D]' : 'text-gray-500'">Tiền mặt nhận</label>
              <span class="text-[10px] text-gray-400 font-semibold" v-show="selectedTab !== 'TIEN_MAT'">Nhấp tab Tiền mặt để thanh toán nhanh</span>
            </div>
            <div class="relative">
              <input 
                type="text"
                ref="cashInputRef"
                :value="formatInputNumber(tienMat)"
                @input="handleCashChange(parseInputNumber($event.target.value))"
                :class="selectedTab === 'TIEN_MAT' ? 'border-[#EF972D] ring-2 ring-[#EF972D]/10 bg-white' : 'border-gray-200 bg-gray-50/50'"
                class="w-full px-4 py-2.5 rounded-xl text-base font-bold text-gray-800 outline-none border transition-all"
                placeholder="Nhập tiền mặt"
              />
              <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">đ</span>
            </div>
          </div>

          <!-- Suggested Cash shortcuts (visible only when Cash tab is active) -->
          <div v-show="selectedTab === 'TIEN_MAT'" class="flex flex-wrap gap-1.5 pt-1">
            <button 
              v-for="amount in getQuickCashSuggestions" 
              :key="amount"
              type="button"
              @click="handleCashChange(amount)"
              class="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              {{ formatCurrency(amount) }}
            </button>
            <button 
              type="button"
              @click="handleCashChange(0)"
              class="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Xóa
            </button>
          </div>

          <!-- Transfer Input row -->
          <div class="space-y-1.5 pt-2 border-t border-gray-100">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold" :class="selectedTab === 'CHUYEN_KHOAN' ? 'text-[#EF972D]' : 'text-gray-500'">Chuyển khoản nhận</label>
              <span class="text-[10px] text-gray-400 font-semibold" v-show="selectedTab !== 'CHUYEN_KHOAN'">Nhấp tab Chuyển khoản để hiện QR code</span>
            </div>
            <div class="relative">
              <input 
                type="text"
                ref="transferInputRef"
                :value="formatInputNumber(tienChuyenKhoan)"
                @input="handleTransferChange(parseInputNumber($event.target.value))"
                :class="selectedTab === 'CHUYEN_KHOAN' ? 'border-[#EF972D] ring-2 ring-[#EF972D]/10 bg-white' : 'border-gray-200 bg-gray-50/50'"
                class="w-full px-4 py-2.5 rounded-xl text-base font-bold text-gray-800 outline-none border transition-all"
                placeholder="Nhập tiền chuyển khoản"
              />
              <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">đ</span>
            </div>
          </div>
        </div>

        <!-- Bank Transfer Details / VietQR Section (shown only under Chuyển khoản tab) -->
        <div v-show="selectedTab === 'CHUYEN_KHOAN'" class="flex flex-col items-center justify-center p-5 border border-[#EF972D]/10 rounded-2xl bg-gray-50/50 space-y-4 transition-all">
          <div class="w-44 h-44 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm flex items-center justify-center relative p-1">
            <img 
              :src="getVietQrImageUrl" 
              class="w-full h-full object-contain"
              alt="QR chuyển khoản"
            />
          </div>
          
          <div class="w-full text-xs space-y-2 max-w-sm border-t border-gray-100 pt-3">
            <div class="flex justify-between text-gray-500">
              <span>Ngân hàng:</span>
              <span class="font-bold text-gray-800">VietinBank</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>Số tài khoản:</span>
              <span class="font-black text-gray-800 tracking-wider">109876543210</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>Chủ tài khoản:</span>
              <span class="font-bold text-gray-800">CONG TY BEE STYLISH</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>Nội dung chuyển:</span>
              <span class="font-mono font-black text-[#EF972D] bg-[#EF972D]/5 px-2 py-0.5 rounded select-all">{{ invoiceCode }}</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>Số tiền QR:</span>
              <span class="font-bold text-[#EF972D]">{{ formatCurrency(Math.max(0, totalAmount - tienMat)) }}</span>
            </div>
          </div>
        </div>

        <!-- Cash Details/Calculations Row (Change / Due amount details) -->
        <div class="space-y-2.5 pt-2">
          <!-- Total inputted -->
          <div class="flex justify-between text-xs font-semibold text-gray-500">
            <span>Tổng tiền đã nhập:</span>
            <span>{{ formatCurrency(tongDaNhap) }}</span>
          </div>

          <!-- Success change state -->
          <div v-if="tienThua > 0" class="flex justify-between items-center p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
            <span class="text-xs font-bold text-emerald-800">Tiền thừa trả khách:</span>
            <span class="text-lg font-black text-emerald-700">{{ formatCurrency(tienThua) }}</span>
          </div>
          
          <!-- Incomplete due state -->
          <div v-if="tienThieu > 0" class="flex justify-between items-center p-3.5 bg-red-50 border border-red-100 rounded-xl">
            <span class="text-xs font-bold text-red-800">Còn thiếu:</span>
            <span class="text-lg font-black text-red-700">{{ formatCurrency(tienThieu) }}</span>
          </div>
        </div>

        <!-- Ghi chú / Notes -->
        <div class="space-y-1">
          <label class="text-xs font-bold text-gray-500">Ghi chú thanh toán</label>
          <textarea 
            v-model="ghiChu"
            rows="2"
            class="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-[#EF972D] focus:border-[#EF972D] outline-none bg-white resize-none"
            placeholder="Nhập ghi chú (nếu có)..."
          ></textarea>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
        <button 
          type="button"
          @click="$emit('close')"
          :disabled="loading"
          class="px-5 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          Hủy bỏ
        </button>
        
        <button 
          type="button"
          @click="handleSubmit"
          :disabled="isSubmitDisabled"
          :class="isSubmitDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-[#EF972D] to-[#ef972d]/85 hover:opacity-95 text-white font-black shadow-md shadow-[#EF972D]/20 cursor-pointer'"
          class="px-6 py-2.5 rounded-xl text-xs transition-all uppercase tracking-wider flex items-center justify-center gap-2 min-w-[150px]"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>Xác nhận</span>
        </button>
      </div>

    </div>
  </div>
</template>
