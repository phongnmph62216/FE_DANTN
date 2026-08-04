<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import api from '@/services/api'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Nhập thông tin mô tả chi tiết sản phẩm...'
  },
  height: {
    type: Number,
    default: 380
  }
})

const emit = defineEmits(['update:modelValue'])

const editorId = `tinymce-editor-${Math.random().toString(36).substring(2, 9)}`
const isLoading = ref(true)
let editorInstance = null

const formatImage = (url) => {
  if (!url) return ''
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const loadTinyMCECDN = () => {
  return new Promise((resolve, reject) => {
    if (window.tinymce) {
      resolve(window.tinymce)
      return
    }
    const existingScript = document.getElementById('tinymce-cdn-script')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.tinymce))
      existingScript.addEventListener('error', (e) => reject(e))
      return
    }

    const script = document.createElement('script')
    script.id = 'tinymce-cdn-script'
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js'
    script.referrerPolicy = 'origin'
    script.onload = () => resolve(window.tinymce)
    script.onerror = (e) => reject(e)
    document.head.appendChild(script)
  })
}

const initTinyMCE = async () => {
  try {
    const tinymce = await loadTinyMCECDN()
    if (!tinymce) return

    if (tinymce.get(editorId)) {
      tinymce.get(editorId).destroy()
    }

    tinymce.init({
      selector: `#${editorId}`,
      height: props.height,
      menubar: true,
      plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
      ],
      toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | image link table | removeformat code fullscreen',
      content_style: 'body { font-family: Inter, Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #333; padding: 12px; } img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block; }',
      placeholder: props.placeholder,
      branding: false,
      promotion: false,
      images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
        const formData = new FormData()
        const file = blobInfo.blob()
        const filename = blobInfo.filename() || `editor_img_${Date.now()}.png`
        formData.append('file', file, filename)

        api.post('/api/v1/images/upload', formData)
          .then(res => {
            const rawUrl = res.data
            if (rawUrl) {
              const fullUrl = formatImage(rawUrl)
              resolve(fullUrl)
            } else {
              reject('Không nhận được URL ảnh từ máy chủ')
            }
          })
          .catch(err => {
            reject('Tải ảnh lên thất bại: ' + (err.message || 'Lỗi kết nối'))
          })
      }),
      setup: (editor) => {
        editorInstance = editor
        editor.on('init', () => {
          isLoading.value = false
          if (props.modelValue) {
            editor.setContent(props.modelValue)
          }
        })
        editor.on('change keyup undo redo input', () => {
          const content = editor.getContent()
          emit('update:modelValue', content)
        })
      }
    })
  } catch (err) {
    console.error('TinyMCE initialization failed:', err)
    isLoading.value = false
  }
}

watch(() => props.modelValue, (newVal) => {
  if (editorInstance && editorInstance.initialized && newVal !== editorInstance.getContent()) {
    editorInstance.setContent(newVal || '')
  }
})

onMounted(() => {
  initTinyMCE()
})

onBeforeUnmount(() => {
  if (window.tinymce && window.tinymce.get(editorId)) {
    window.tinymce.get(editorId).destroy()
  }
})
</script>

<template>
  <div class="rich-text-editor-container relative border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
    <div v-if="isLoading" class="p-6 text-center text-xs text-gray-400 bg-gray-50 flex items-center justify-center gap-2">
      <span class="w-4 h-4 border-2 border-[#EF972D] border-t-transparent rounded-full animate-spin"></span>
      <span>Đang tải trình soạn thảo văn bản TinyMCE...</span>
    </div>
    <textarea
      :id="editorId"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      class="w-full border-none outline-none p-4 text-sm min-h-[160px]"
      :placeholder="placeholder"
    ></textarea>
  </div>
</template>

<style>
.tox-tinymce {
  border: none !important;
  border-radius: 12px !important;
}
.tox .tox-statusbar {
  border-top: 1px solid #f0f0f0 !important;
}
</style>
