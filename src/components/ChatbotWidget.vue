<script setup>
import { ref, onMounted, nextTick } from 'vue'
import api from '@/services/api'

// UI state
const isOpen = ref(false)
const isTyping = ref(false)
const inputMessage = ref('')
const isConnectingStaff = ref(false)
const chatLogsRef = ref(null)

// Product cache for inline card rendering
const productsList = ref([])

// Conversation history for Gemini (stateless on backend)
// Format matching the DTO: { role: 'user'|'model', parts: [{ text: '...' }] }
const geminiHistory = ref([])

// Renderable chat logs
const chatLogs = ref([
  {
    sender: 'bot',
    text: 'Chào bạn! 👋 Em là Trợ lý AI của Bee Stylish. Em có thể hỗ trợ gì cho anh/chị hôm nay ạ? (Ví dụ: Tìm áo Polo, Xem khuyến mãi, Địa chỉ cửa hàng...)',
    time: formatTime(new Date())
  }
])

// Suggestions list
const suggestions = [
  { label: '👕 Áo Polo', query: 'Tìm áo Polo nam' },
  { label: '🎁 Khuyến mãi', query: 'Có khuyến mãi gì không?' },
  { label: '📍 Địa chỉ shop', query: 'Địa chỉ cửa hàng ở đâu?' },
  { label: '📦 Tra cứu đơn hàng', query: 'Làm sao để tra cứu đơn hàng?' }
]

function formatTime(date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// Fetch products on mount to populate the local cache for inline product card matching
const fetchProductsCache = async () => {
  try {
    const res = await api.get('/api/v1/san-pham', { params: { trangThai: 1, size: 50 } })
    if (res.data && res.data.content) {
      productsList.value = res.data.content.map(item => ({
        id: item.id,
        name: sanitizeVietnamese(item.tenSanPham || ''),
        image: formatImage(item.hinhAnh),
        price: item.giaThapNhatSauGiam ?? item.giaThapNhat ?? 0
      }))
    }
  } catch (err) {
    console.error('Failed to pre-fetch product list for chatbot cache:', err)
  }
}

// Helpers copied from AllProductsView for text/image formatting
function sanitizeVietnamese(text) {
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
  return cleaned
}

function formatImage(url) {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

function formatCurrency(val) {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ'
}

// Parse markdown content safely without using v-html (XSS Protection)
// Parses bold **text** and markdown links [name](url)
const parseMarkdown = (text) => {
  if (!text) return []
  
  const parts = []
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match
  
  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index
    
    // Parse bold for text leading up to the link
    if (matchIndex > lastIndex) {
      parts.push(...parseBold(text.substring(lastIndex, matchIndex)))
    }
    
    const linkText = match[1]
    const linkUrl = match[2]
    
    // Check if the URL is a product detail link
    const productMatch = linkUrl.match(/\/product\/(\d+)/)
    if (productMatch) {
      const productId = parseInt(productMatch[1], 10)
      const foundProduct = productsList.value.find(p => p.id === productId)
      parts.push({
        type: 'product',
        productId,
        text: linkText,
        url: linkUrl,
        product: foundProduct // cache object if found
      })
    } else {
      parts.push({
        type: 'link',
        text: linkText,
        url: linkUrl
      })
    }
    
    lastIndex = regex.lastIndex
  }
  
  // Parse remaining text for bold tags
  if (lastIndex < text.length) {
    parts.push(...parseBold(text.substring(lastIndex)))
  }
  
  return parts
}

const parseBold = (text) => {
  const boldRegex = /\*\*([^*]+)\*\*/g
  const subparts = []
  let lastIdx = 0
  let bMatch
  
  while ((bMatch = boldRegex.exec(text)) !== null) {
    const matchIdx = bMatch.index
    if (matchIdx > lastIdx) {
      subparts.push({
        type: 'text',
        content: text.substring(lastIdx, matchIdx)
      })
    }
    subparts.push({
      type: 'bold',
      content: bMatch[1]
    })
    lastIdx = boldRegex.lastIndex
  }
  
  if (lastIdx < text.length) {
    subparts.push({
      type: 'text',
      content: text.substring(lastIdx)
    })
  }
  
  return subparts
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatLogsRef.value) {
    chatLogsRef.value.scrollTop = chatLogsRef.value.scrollHeight
  }
}

// Send message action
const sendMessage = async (messageText) => {
  const query = messageText || inputMessage.value.trim()
  if (!query) return

  // Reset input if sent via input field
  if (!messageText) {
    inputMessage.value = ''
  }

  // Push to user logs
  chatLogs.value.push({
    sender: 'user',
    text: query,
    time: formatTime(new Date())
  })
  scrollToBottom()

  isTyping.value = true

  try {
    // Send message to Backend endpoint
    const response = await api.post('/api/v1/chatbot/chat', {
      message: query,
      history: geminiHistory.value
    })

    // Store in Gemini conversation history state
    // Store user query
    geminiHistory.value.push({
      role: 'user',
      parts: [{ text: query }]
    })

    // Store model response
    const botResponseText = response.data
    geminiHistory.value.push({
      role: 'model',
      parts: [{ text: botResponseText }]
    })

    // Push to displayed logs
    chatLogs.value.push({
      sender: 'bot',
      text: botResponseText,
      time: formatTime(new Date())
    })
  } catch (err) {
    console.error('Chatbot API error:', err)
    let errMsg = 'Dạ, hệ thống đang gặp gián đoạn kết nối. Quý khách vui lòng thử lại sau ạ!'
    if (err.response && err.response.status === 429) {
      errMsg = 'Quý khách đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau ít phút!'
    }
    chatLogs.value.push({
      sender: 'bot',
      text: errMsg,
      time: formatTime(new Date())
    })
  } finally {
    isTyping.value = false
    scrollToBottom()
  }
}

const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    scrollToBottom()
  }
}

// Reset chat to initial state
const resetChat = () => {
  geminiHistory.value = []
  isConnectingStaff.value = false
  isTyping.value = false
  inputMessage.value = ''
  chatLogs.value = [
    {
      sender: 'bot',
      text: 'Chào bạn! 👋 Em là Trợ lý AI của Bee Stylish. Em có thể hỗ trợ gì cho anh/chị hôm nay ạ? (Ví dụ: Tìm áo Polo, Xem khuyến mãi, Địa chỉ cửa hàng...)',
      time: formatTime(new Date())
    }
  ]
}

// Simulated real-time human staff support handler
const connectToStaff = () => {
  if (isConnectingStaff.value) return
  isConnectingStaff.value = true
  
  chatLogs.value.push({
    sender: 'system',
    text: 'Đang tìm kiếm nhân viên hỗ trợ trực tuyến... Vui lòng giữ kết nối.'
  })
  scrollToBottom()

  // Mock connecting delay
  setTimeout(() => {
    chatLogs.value.push({
      sender: 'system',
      text: 'Đã gửi yêu cầu đến nhân viên hỗ trợ. Hệ thống chat AI tạm thời ngắt kết nối. Nhân viên sẽ liên hệ lại trực tiếp qua thông tin cá nhân của Quý Khách trong giây lát!'
    })
    scrollToBottom()
  }, 2500)
}

onMounted(() => {
  fetchProductsCache()
})
</script>

<template>
  <div class="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 font-sans">
    <!-- Floating Trigger Button -->
    <button
      @click="toggleChat"
      class="w-14 h-14 bg-gradient-to-tr from-[#f97316] to-[#ff7d1a] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer focus:outline-none relative group"
    >
      <span v-if="!isOpen" class="material-symbols-outlined text-[28px] animate-pulse">forum</span>
      <span v-else class="material-symbols-outlined text-[28px]">close</span>
      
      <!-- Pulse Glowing Dot when closed -->
      <span v-if="!isOpen" class="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
    </button>

    <!-- Chat Window Box -->
    <div
      v-show="isOpen"
      class="absolute bottom-16 right-0 w-[350px] sm:w-[400px] h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col border border-outline-variant/30 overflow-hidden transform origin-bottom-right transition-all duration-300"
    >
      <!-- Chat Header -->
      <div class="bg-gradient-to-r from-[#f97316] to-[#ea580c] p-4 text-white flex justify-between items-center shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/20">
            <span class="material-symbols-outlined text-white text-[24px]">smart_toy</span>
          </div>
          <div>
            <h3 class="font-bold text-sm tracking-wide">BeeBot - Trợ lý AI</h3>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="w-2.5 h-2.5 bg-green-400 rounded-full inline-block animate-ping"></span>
              <span class="text-[11px] text-green-100 font-medium">Trực tuyến</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button @click="resetChat" title="Làm mới chat" class="text-white/60 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10">
            <span class="material-symbols-outlined text-[20px]">refresh</span>
          </button>
          <button @click="isOpen = false" class="text-white/80 hover:text-white transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-[22px]">keyboard_arrow_down</span>
          </button>
        </div>
      </div>

      <!-- Main Logs Area -->
      <div
        ref="chatLogsRef"
        class="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-50/50 scroll-smooth no-scrollbar"
      >
        <div
          v-for="(log, idx) in chatLogs"
          :key="idx"
          class="flex flex-col"
          :class="log.sender === 'user' ? 'items-end' : log.sender === 'system' ? 'items-center' : 'items-start'"
        >
          <!-- System Alert Message -->
          <div v-if="log.sender === 'system'" class="my-2 px-4 py-2 bg-amber-50 border border-amber-200/50 rounded-lg text-center max-w-[90%]">
            <p class="text-[11px] text-amber-700 font-medium leading-relaxed">{{ log.text }}</p>
          </div>

          <!-- Normal Message Bubbles -->
          <div v-else class="max-w-[85%] flex flex-col">
            <!-- Bubble Sender Name -->
            <span class="text-[10px] text-outline mb-1 px-1" :class="log.sender === 'user' ? 'text-right' : ''">
              {{ log.sender === 'user' ? 'Bạn' : 'BeeBot' }} • {{ log.time }}
            </span>
            
            <!-- Message Content -->
            <div
              class="px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-line break-words"
              :class="log.sender === 'user'
                ? 'bg-[#f97316] text-white rounded-tr-none'
                : 'bg-white text-on-surface border border-outline-variant/30 rounded-tl-none'"
            >
              <!-- Safe Markdown Rendering (Non-v-html) -->
              <span class="inline">
                <template v-for="(part, pIdx) in parseMarkdown(log.text)" :key="pIdx">
                  <!-- Text Part -->
                  <span v-if="part.type === 'text'" class="inline">{{ part.content }}</span>
                  
                  <!-- Bold Part -->
                  <strong v-else-if="part.type === 'bold'" class="font-bold text-inherit inline">{{ part.content }}</strong>
                  
                  <!-- Standard Link Part -->
                  <a
                    v-else-if="part.type === 'link'"
                    :href="part.url"
                    target="_blank"
                    class="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-0.5"
                  >
                    {{ part.text }}<span class="material-symbols-outlined text-[12px] inline">open_in_new</span>
                  </a>
                  
                  <!-- Premium Custom Product Card -->
                  <div
                    v-else-if="part.type === 'product'"
                    class="mt-2.5 p-2 bg-gray-50 border border-outline-variant/40 rounded-xl flex gap-2.5 items-center hover:bg-gray-100/70 transition-colors shadow-sm"
                  >
                    <!-- Product Thumbnail -->
                    <img
                      :src="part.product?.image || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'"
                      alt="Thumbnail"
                      class="w-14 h-14 object-cover rounded-lg border border-outline-variant/20 shrink-0 bg-white"
                    />
                    
                    <!-- Product Metadata -->
                    <div class="flex-grow min-w-0 flex flex-col">
                      <h4 class="text-xs font-bold text-on-surface truncate uppercase">{{ part.product?.name || part.text }}</h4>
                      <p v-if="part.product" class="text-[11px] text-[#f97316] font-extrabold mt-0.5">
                        {{ formatCurrency(part.product.price) }}
                      </p>
                      <RouterLink
                        :to="'/product/' + part.productId"
                        class="text-[10px] text-[#f97316] font-bold mt-1.5 self-start flex items-center gap-0.5 hover:underline"
                      >
                        Xem chi tiết <span class="material-symbols-outlined text-[10px]">arrow_forward</span>
                      </RouterLink>
                    </div>
                  </div>
                </template>
              </span>
            </div>
          </div>
        </div>

        <!-- Bouncing Typing Loader -->
        <div v-if="isTyping" class="flex flex-col items-start max-w-[85%]">
          <span class="text-[10px] text-outline mb-1 px-1">BeeBot đang soạn...</span>
          <div class="bg-white border border-outline-variant/30 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex gap-1 items-center h-9">
            <span class="w-1.5 h-1.5 bg-[#f97316] rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-1.5 h-1.5 bg-[#f97316] rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-1.5 h-1.5 bg-[#f97316] rounded-full animate-bounce" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>

      <!-- Suggestions Carousel (only shown if not in Staff mode) -->
      <div v-if="!isConnectingStaff && chatLogs.length < 5" class="px-4 py-2 bg-gray-50 border-t border-outline-variant/10 flex gap-2 overflow-x-auto shrink-0 no-scrollbar select-none">
        <button
          v-for="(sug, sIdx) in suggestions"
          :key="sIdx"
          @click="sendMessage(sug.query)"
          class="shrink-0 px-3 py-1 bg-white hover:bg-orange-50 border border-outline-variant/40 hover:border-[#f97316]/50 rounded-full text-xs font-medium text-on-surface-variant hover:text-[#f97316] transition-all cursor-pointer shadow-sm"
        >
          {{ sug.label }}
        </button>
      </div>

      <!-- Action Button Area -->
      <div class="px-4 pt-2 pb-0 shrink-0">
        <!-- Connecting alert / disabled input block -->
        <button
          v-if="!isConnectingStaff"
          @click="connectToStaff"
          class="w-full py-2 bg-gray-100 hover:bg-orange-50 border border-outline-variant/40 hover:border-[#f97316]/30 text-on-surface-variant hover:text-[#f97316] text-[11px] font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">support_agent</span>
          Gặp nhân viên hỗ trợ
        </button>
        <div
          v-else
          class="w-full py-2 bg-orange-50/70 border border-[#f97316]/20 text-[#f97316] text-[11px] font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
        >
          <span class="w-2.5 h-2.5 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin"></span>
          Đang kết nối với nhân viên...
        </div>
      </div>

      <!-- Chat Input Footer -->
      <div class="p-4 bg-white border-t border-outline-variant/30 flex items-center gap-3 shrink-0">
        <div class="flex-grow relative flex items-center bg-gray-50 border border-outline-variant rounded-full focus-within:border-[#f97316] focus-within:bg-white transition-colors overflow-hidden">
          <span class="material-symbols-outlined text-outline/60 pl-3">lightbulb</span>
          <input
            v-model="inputMessage"
            @keyup.enter="sendMessage()"
            :disabled="isConnectingStaff || isTyping"
            type="text"
            placeholder="Nhập tin nhắn..."
            class="w-full bg-transparent border-0 outline-none px-3 py-2 text-sm focus:ring-0 placeholder:text-outline/50 disabled:cursor-not-allowed text-on-surface"
          />
        </div>
        <button
          @click="sendMessage()"
          :disabled="isConnectingStaff || isTyping || !inputMessage.trim()"
          class="w-10 h-10 bg-gradient-to-tr from-[#f97316] to-[#ff7d1a] hover:from-[#ea580c] hover:to-[#f97316] text-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
        >
          <span class="material-symbols-outlined text-[20px]">send</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scroller styles */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
