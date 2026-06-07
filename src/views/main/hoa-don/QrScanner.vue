<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center gap-4">
      <button
        type="button"
        @click="goBack"
        class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
      >
        <span class="material-symbols-outlined">arrow_back</span>
      </button>

      <div>
        <h1 class="text-2xl font-bold text-[#0D2533]">
          Quét mã QR hóa đơn
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          Dùng camera máy tính để quét mã QR hóa đơn
        </p>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      class="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-4"
    >
      {{ successMessage }}
    </div>

    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div id="qr-reader" class="w-full max-w-xl mx-auto"></div>

      <div class="flex justify-center gap-3 mt-6">
        <button
          type="button"
          @click="startScanner"
          :disabled="isScanning"
          class="px-5 py-2.5 bg-[#0D2533] text-white rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          Bắt đầu quét
        </button>

        <button
          type="button"
          @click="stopScanner"
          :disabled="!isScanning"
          class="px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          Dừng quét
        </button>
      </div>

      <p class="text-center text-xs text-gray-500 mt-4">
        Nếu không mở được camera, hãy chạy bằng http://localhost:5173 và cấp quyền camera cho trình duyệt.
      </p>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../../../services/api'

const router = useRouter()

const errorMessage = ref('')
const successMessage = ref('')
const isScanning = ref(false)

let html5QrCode = null
let isProcessing = false

onMounted(() => {
  startScanner()
})

onBeforeUnmount(() => {
  stopScanner()
})

function goBack() {
  router.push('/hoa-don')
}
async function startScanner() {
  errorMessage.value = ''
  successMessage.value = ''

  if (isScanning.value) {
    return
  }

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('qr-reader')
    }

    const cameras = await Html5Qrcode.getCameras()

    if (!cameras || cameras.length === 0) {
      errorMessage.value = 'Không tìm thấy camera trên thiết bị.'
      return
    }

    const backCamera = cameras.find((camera) => {
      return camera.label.toLowerCase().includes('back')
    })

    const cameraId = backCamera ? backCamera.id : cameras[0].id

    await html5QrCode.start(
      cameraId,
      {
        qrbox: (viewfinderWidth, viewfinderHeight) => {
  const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
  const size = Math.floor(minEdge * 0.85)

  return {
    width: size,
    height: size,
  }
},
      },
      async (decodedText) => {
        await handleQrResult(decodedText)
      },
      () => {}
    )

    isScanning.value = true
    errorMessage.value = ''
  } catch (error) {
    console.error('Lỗi mở camera:', error)

    isScanning.value = false

    if (error?.name === 'NotFoundError') {
      errorMessage.value = 'Không tìm thấy camera trên thiết bị.'
      return
    }

    if (error?.name === 'NotAllowedError') {
      errorMessage.value = 'Bạn chưa cấp quyền camera cho trình duyệt.'
      return
    }

    errorMessage.value = 'Không mở được camera. Hãy cấp quyền camera và chạy bằng localhost hoặc HTTPS.'
  }
}
async function handleQrResult(decodedText) {
  if (isProcessing) {
    return
  }

  isProcessing = true
  errorMessage.value = ''
  successMessage.value = `Đã quét được mã: ${decodedText}`

  try {
    await stopScanner()

    const maHoaDon = decodedText.trim()
    const res = await api.get(`/hoa-don/ma/${encodeURIComponent(maHoaDon)}`)

    router.push(`/hoa-don/${res.data.id}`)
  } catch (error) {
    console.error('Không tìm thấy hóa đơn:', error)
    errorMessage.value = `Không tìm thấy hóa đơn với mã: ${decodedText}`
    isProcessing = false
  }
}

async function stopScanner() {
  try {
    if (html5QrCode && isScanning.value) {
      await html5QrCode.stop()
    }
  } catch (error) {
    console.error('Lỗi dừng camera:', error)
  } finally {
    isScanning.value = false
  }
}
</script>