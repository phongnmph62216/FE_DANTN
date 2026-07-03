<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const authStore = useAuthStore()

// State
const sessions = ref([])
const selectedSession = ref(null)
const messages = ref([])
const newMessage = ref('')
const messagesRef = ref(null)
const activeTab = ref(0) // 0: Chờ nhận, 1: Đang hoạt động, 2: Đã đóng
const isLoading = ref(false)
const staffSocket = ref(null)

const tabLabels = [
  { value: 0, label: 'Chờ nhận', icon: 'hourglass_top' },
  { value: 1, label: 'Đang hoạt động', icon: 'chat_bubble' },
  { value: 2, label: 'Đã đóng', icon: 'check_circle' }
]

const filteredSessions = computed(() => {
  return sessions.value.filter(s => s.trangThai === activeTab.value)
})

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const statusLabel = (status) => {
  if (status === 0) return 'Chờ nhận'
  if (status === 1) return 'Đang hoạt động'
  return 'Đã đóng'
}

const statusColor = (status) => {
  if (status === 0) return 'bg-amber-100 text-amber-700'
  if (status === 1) return 'bg-green-100 text-green-700'
  return 'bg-gray-200 text-gray-500'
}

// Fetch sessions
const fetchSessions = async () => {
  try {
    const res = await api.get('/api/v1/chat/sessions')
    sessions.value = res.data?.data || []
  } catch (e) {
    console.error('Error fetching sessions:', e)
  }
}

// Fetch messages for a session
const fetchMessages = async (sessionCode) => {
  try {
    const res = await api.get(`/api/v1/chat/sessions/${sessionCode}/messages`)
    messages.value = res.data?.data || []
    scrollToBottom()
  } catch (e) {
    console.error('Error fetching messages:', e)
  }
}

const selectSession = async (session) => {
  selectedSession.value = session
  await fetchMessages(session.sessionCode)
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// Accept session
const acceptSession = async () => {
  if (!selectedSession.value || !authStore.user?.id) return
  isLoading.value = true
  try {
    await api.post(`/api/v1/chat/sessions/${selectedSession.value.sessionCode}/accept?staffId=${authStore.user.id}`)
    await fetchSessions()
    // Re-select the session to get updated data
    const updated = sessions.value.find(s => s.sessionCode === selectedSession.value.sessionCode)
    if (updated) {
      selectedSession.value = updated
      await fetchMessages(updated.sessionCode)
    }
  } catch (e) {
    console.error('Error accepting session:', e)
  } finally {
    isLoading.value = false
  }
}

// Close session
const closeSession = async () => {
  if (!selectedSession.value) return
  isLoading.value = true
  try {
    await api.post(`/api/v1/chat/sessions/${selectedSession.value.sessionCode}/close`)
    await fetchSessions()
    const updated = sessions.value.find(s => s.sessionCode === selectedSession.value.sessionCode)
    if (updated) {
      selectedSession.value = updated
      await fetchMessages(updated.sessionCode)
    }
  } catch (e) {
    console.error('Error closing session:', e)
  } finally {
    isLoading.value = false
  }
}

// Send message via WebSocket
const sendMessage = () => {
  const msg = newMessage.value.trim()
  if (!msg || !staffSocket.value || staffSocket.value.readyState !== WebSocket.OPEN || !selectedSession.value) return

  staffSocket.value.send(JSON.stringify({
    type: 'CHAT',
    sessionCode: selectedSession.value.sessionCode,
    content: msg
  }))

  // Optimistic add
  messages.value.push({
    senderType: 'STAFF',
    senderName: authStore.user?.hoVaTen || authStore.user?.hoTen || 'Nhân viên',
    noiDung: msg,
    ngayTao: new Date().toISOString()
  })
  newMessage.value = ''
  scrollToBottom()
}

// Connect WebSocket as staff
const connectStaffWs = () => {
  const staffId = authStore.user?.id || ''
  const staffName = encodeURIComponent(authStore.user?.hoVaTen || authStore.user?.hoTen || 'Nhân viên')
  const wsBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/^http/, 'ws')
  const wsUrl = `${wsBase}/ws/chat?role=staff&staffId=${staffId}&name=${staffName}`

  const ws = new WebSocket(wsUrl)
  staffSocket.value = ws

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'CHAT') {
        // If this message is for the currently selected session, add it
        if (selectedSession.value && data.sessionCode === selectedSession.value.sessionCode) {
          // Don't duplicate our own messages
          if (data.senderType !== 'STAFF') {
            messages.value.push({
              senderType: data.senderType,
              senderName: data.senderName,
              noiDung: data.content,
              ngayTao: new Date().toISOString()
            })
            scrollToBottom()
          }
        }
        // Refresh sessions list to update last message time
        fetchSessions()
      } else if (data.type === 'CUSTOMER_STATUS' || data.type === 'SESSION_ACCEPTED' || data.type === 'SESSION_CLOSED') {
        fetchSessions()
        if (selectedSession.value && (data.sessionCode === selectedSession.value.sessionCode)) {
          fetchMessages(selectedSession.value.sessionCode)
        }
      } else if (data.type === 'SYSTEM' && selectedSession.value && data.sessionCode === selectedSession.value?.sessionCode) {
        messages.value.push({
          senderType: 'SYSTEM',
          senderName: 'Hệ thống',
          noiDung: data.content,
          ngayTao: new Date().toISOString()
        })
        scrollToBottom()
      }
    } catch (e) { /* ignore */ }
  }

  ws.onclose = () => {
    // Reconnect after a delay
    setTimeout(() => {
      if (!staffSocket.value || staffSocket.value.readyState === WebSocket.CLOSED) {
        connectStaffWs()
      }
    }, 3000)
  }
}

onMounted(async () => {
  await fetchSessions()
  connectStaffWs()
})

onUnmounted(() => {
  if (staffSocket.value) staffSocket.value.close()
})
</script>

<template>
  <div class="p-6 h-full flex flex-col">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <span class="material-symbols-outlined text-[#f97316] text-[28px]">chat</span>
        Quản lý Chat hỗ trợ
      </h1>
      <p class="text-sm text-gray-500 mt-1">Tiếp nhận và phản hồi tin nhắn từ khách hàng theo thời gian thực</p>
    </div>

    <!-- Main Content -->
    <div class="flex-grow flex gap-6 min-h-0">
      <!-- Left Panel: Session List -->
      <div class="w-[360px] shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        <!-- Tabs: Khách hàng / Nội bộ -->
        <div class="flex border-b border-gray-200">
          <button class="flex-1 py-3 text-sm font-bold text-[#f97316] border-b-2 border-[#f97316] bg-orange-50/50">
            <span class="material-symbols-outlined text-[16px] align-middle mr-1">person</span>Khách hàng
          </button>
          <button class="flex-1 py-3 text-sm font-medium text-gray-400 cursor-not-allowed" disabled title="Phát triển sau">
            <span class="material-symbols-outlined text-[16px] align-middle mr-1">groups</span>Nội bộ
          </button>
        </div>

        <!-- Status Sub-tabs -->
        <div class="flex border-b border-gray-100 bg-gray-50">
          <button
            v-for="tab in tabLabels" :key="tab.value"
            @click="activeTab = tab.value"
            class="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors relative"
            :class="activeTab === tab.value ? 'text-[#f97316]' : 'text-gray-400 hover:text-gray-600'"
          >
            {{ tab.label }}
            <span v-if="sessions.filter(s => s.trangThai === tab.value).length > 0"
              class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              :class="activeTab === tab.value ? 'bg-[#f97316] text-white' : 'bg-gray-200 text-gray-500'"
            >{{ sessions.filter(s => s.trangThai === tab.value).length }}</span>
            <div v-if="activeTab === tab.value" class="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#f97316] rounded-full"></div>
          </button>
        </div>

        <!-- Sessions List -->
        <div class="flex-grow overflow-y-auto">
          <div v-if="filteredSessions.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 p-6">
            <span class="material-symbols-outlined text-[48px] mb-2">chat_bubble_outline</span>
            <p class="text-sm">Không có phiên chat nào</p>
          </div>
          <div
            v-for="session in filteredSessions" :key="session.id"
            @click="selectSession(session)"
            class="flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50 transition-colors hover:bg-orange-50/40"
            :class="selectedSession?.id === session.id ? 'bg-orange-50 border-l-[3px] border-l-[#f97316]' : ''"
          >
            <!-- Avatar -->
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              :class="session.trangThai === 0 ? 'bg-amber-400' : session.trangThai === 1 ? 'bg-green-500' : 'bg-gray-400'">
              {{ (session.visitorName || 'K')[0].toUpperCase() }}
            </div>
            <!-- Info -->
            <div class="flex-grow min-w-0">
              <div class="flex justify-between items-center">
                <h4 class="text-sm font-semibold text-gray-800 truncate">{{ session.visitorName || 'Khách vãng lai' }}</h4>
                <span class="text-[10px] text-gray-400 shrink-0">{{ formatTime(session.ngayCapNhatCuoi) }}</span>
              </div>
              <div class="flex justify-between items-center mt-0.5">
                <span :class="statusColor(session.trangThai)" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ statusLabel(session.trangThai) }}</span>
                <span v-if="session.nhanVien" class="text-[10px] text-gray-400 truncate max-w-[120px]">{{ session.nhanVien.hoVaTen }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Chat Thread -->
      <div class="flex-grow bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        <!-- No session selected -->
        <div v-if="!selectedSession" class="flex-grow flex flex-col items-center justify-center text-gray-400 p-6">
          <span class="material-symbols-outlined text-[64px] mb-3 text-gray-300">forum</span>
          <h3 class="text-lg font-semibold text-gray-500">Chọn một phiên chat</h3>
          <p class="text-sm mt-1">Chọn phiên chat từ danh sách bên trái để bắt đầu</p>
        </div>

        <template v-else>
          <!-- Chat Header -->
          <div class="flex justify-between items-center px-5 py-3.5 border-b border-gray-200 bg-gray-50/50 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                :class="selectedSession.trangThai === 0 ? 'bg-amber-400' : selectedSession.trangThai === 1 ? 'bg-green-500' : 'bg-gray-400'">
                {{ (selectedSession.visitorName || 'K')[0].toUpperCase() }}
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-800">{{ selectedSession.visitorName || 'Khách vãng lai' }}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span :class="statusColor(selectedSession.trangThai)" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ statusLabel(selectedSession.trangThai) }}</span>
                  <span class="text-[10px] text-gray-400">{{ messages.length }} tin nhắn</span>
                  <span v-if="selectedSession.khachHang" class="text-[10px] text-gray-400">• {{ selectedSession.khachHang.sdt }}</span>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button v-if="selectedSession.trangThai === 0" @click="acceptSession" :disabled="isLoading"
                class="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>Tiếp nhận
              </button>
              <button v-if="selectedSession.trangThai === 1" @click="closeSession" :disabled="isLoading"
                class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">close</span>Đóng phiên
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div ref="messagesRef" class="flex-grow overflow-y-auto p-5 space-y-3 bg-gray-50/30">
            <div v-for="(msg, idx) in messages" :key="idx" class="flex flex-col"
              :class="msg.senderType === 'STAFF' ? 'items-end' : msg.senderType === 'SYSTEM' ? 'items-center' : 'items-start'">

              <!-- System -->
              <div v-if="msg.senderType === 'SYSTEM'" class="my-1 px-3 py-1.5 bg-amber-50 border border-amber-200/50 rounded-lg text-center max-w-[80%]">
                <p class="text-[11px] text-amber-700 font-medium">{{ msg.noiDung }}</p>
              </div>

              <!-- Customer / Staff bubble -->
              <div v-else class="max-w-[70%]">
                <span class="text-[10px] text-gray-400 mb-0.5 px-1 block" :class="msg.senderType === 'STAFF' ? 'text-right' : ''">
                  {{ msg.senderName || (msg.senderType === 'STAFF' ? 'Nhân viên' : 'Khách hàng') }} • {{ formatTime(msg.ngayTao) }}
                </span>
                <div class="px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line break-words shadow-sm"
                  :class="msg.senderType === 'STAFF'
                    ? 'bg-[#f97316] text-white rounded-tr-none'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'">
                  {{ msg.noiDung }}
                </div>
              </div>
            </div>
          </div>

          <!-- Accept prompt for waiting sessions -->
          <div v-if="selectedSession.trangThai === 0" class="p-5 border-t border-gray-200 bg-amber-50/50 text-center">
            <p class="text-sm text-amber-700 font-medium mb-3">Khách hàng đang chờ được hỗ trợ</p>
            <button @click="acceptSession" :disabled="isLoading"
              class="px-8 py-3 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm flex items-center gap-2 mx-auto cursor-pointer shadow-md hover:shadow-lg">
              <span class="material-symbols-outlined">check_circle</span>Tiếp nhận hỗ trợ khách hàng này
            </button>
          </div>

          <!-- Input for active sessions -->
          <div v-else-if="selectedSession.trangThai === 1" class="p-4 border-t border-gray-200 bg-white flex items-center gap-3 shrink-0">
            <div class="flex-grow flex items-center bg-gray-50 border border-gray-200 rounded-full focus-within:border-[#f97316] focus-within:bg-white transition-colors overflow-hidden">
              <input v-model="newMessage" @keyup.enter="sendMessage" type="text" placeholder="Nhập tin nhắn phản hồi..."
                class="w-full bg-transparent border-0 outline-none px-4 py-2.5 text-sm focus:ring-0 placeholder:text-gray-400 text-gray-800"/>
            </div>
            <button @click="sendMessage" :disabled="!newMessage.trim()"
              class="w-10 h-10 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0">
              <span class="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>

          <!-- Closed session notice -->
          <div v-else class="p-4 border-t border-gray-200 bg-gray-50 text-center">
            <p class="text-sm text-gray-400">Phiên chat này đã được đóng</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
