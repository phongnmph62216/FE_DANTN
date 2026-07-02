<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../../services/api'

const products = ref([])
const isLoading = ref(false)

const formatCurrency = (val) => {
  if (val === undefined || val === null) return '0 đ'
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ'
}

const sanitizeVietnamese = (text) => {
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
  cleaned = cleaned.replace(/Đ\? Ruby/g, 'Đỏ Ruby')
  cleaned = cleaned.replace(/Tr\?ng/g, 'Trắng')
  cleaned = cleaned.replace(/S\?a/g, 'Sữa')
  cleaned = cleaned.replace(/c\?p/g, 'cấp')
  cleaned = cleaned.replace(/hi\?u/g, 'hiệu')
  cleaned = cleaned.replace(/Ki\?u/g, 'Kiểu')
  cleaned = cleaned.replace(/Huy\?n/g, 'Huyền')
  return cleaned
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const fetchProducts = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/api/v1/san-pham', {
      params: {
        trangThai: 1,
        size: 10
      }
    })
    if (res.data && res.data.content) {
      products.value = res.data.content.map(item => ({
        id: item.id,
        code: item.maSanPham || '',
        name: sanitizeVietnamese(item.tenSanPham || ''),
        image: formatImage(item.hinhAnh),
        priceMin: item.giaThapNhat ?? 0,
        priceMax: item.giaCaoNhat ?? 0,
        discountedMin: item.giaThapNhatSauGiam ?? item.giaThapNhat ?? 0,
        discountedMax: item.giaCaoNhatSauGiam ?? item.giaCaoNhat ?? 0,
        maxDiscountPercent: item.maxPhanTramGiam ?? 0
      }))
    }
  } catch (err) {
    console.error('Failed to fetch products on homepage:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <main class="w-full max-w-[1920px] mx-auto pb-20 md:pb-0">
    <!-- 2. Hero Banner -->
    <section class="w-full relative bg-surface-variant flex items-center justify-center min-h-[500px] md:min-h-[700px] overflow-hidden">
      <div class="absolute inset-0 bg-cover bg-center bg-no-repeat w-full h-full object-cover" data-alt="A highly detailed lifestyle fashion photograph of a stylish model wearing modern, elegant summer clothing. The setting is bright and sunny, featuring minimal architectural elements and a light, airy atmosphere. The lighting is natural and high-key, creating soft shadows. The overall aesthetic is editorial, luxurious, and minimalistic, utilizing a warm color palette with pristine whites and subtle orange accents to align with a modern fashion brand." style="background-image: url('src/assets/z8001396845916_ac1c8132a0ae442829904a53f4ec4834.jpg')"></div>
      <!-- Dark/Light Overlay for readability depending on image -->
      <div class="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent md:bg-gradient-to-r md:from-background/90 md:to-transparent/20"></div>
      <div class="relative z-10 w-full max-w-container-max px-margin-mobile md:px-margin-desktop flex flex-col md:w-1/2 md:mr-auto gap-6 mt-32 md:mt-0">
        <div class="inline-flex items-center gap-2 bg-primary-container/20 text-primary-container px-3 py-1 rounded-full w-fit">
          <span class="material-symbols-outlined text-[16px]">wb_sunny</span>
          <span class="text-label-sm font-label-sm uppercase tracking-wider font-bold">Bộ Sưu Tập Mới</span>
        </div>
        <h1 class="text-display-xl font-display-xl text-on-background uppercase tracking-tight">SUNSTOP UV <br/> PROTECTION</h1>
        <p class="text-body-lg font-body-lg text-on-surface-variant max-w-md">Bảo vệ toàn diện, tự tin tỏa sáng dưới nắng hè. Trải nghiệm chất liệu công nghệ mới mát lạnh và chống nắng hiệu quả.</p>
        <div class="flex flex-col sm:flex-row gap-4 mt-4">
          <button class="bg-primary-container text-on-primary text-label-sm font-label-sm uppercase tracking-widest px-8 py-4 rounded-none hover:bg-primary transition-colors flex items-center justify-center gap-2">
            MUA NGAY
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <button class="border border-on-background text-on-background text-label-sm font-label-sm uppercase tracking-widest px-8 py-4 rounded-none hover:bg-on-background hover:text-surface transition-colors flex items-center justify-center">
            XEM CHI TIẾT
          </button>
        </div>
      </div>
    </section>

    <!-- 3. Promo Banner -->
    <section class="w-full bg-primary-container py-4 md:py-6 px-margin-mobile md:px-margin-desktop text-center">
      <div class="max-w-container-max mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
        <span class="text-on-primary text-title-md font-title-md uppercase tracking-wider font-bold">GIẢM NGAY 200K</span>
        <span class="hidden md:inline-block text-on-primary/50 text-xl">|</span>
        <span class="text-on-primary text-body-md font-body-md">Cho đơn hàng từ 1.000.000đ. Nhập mã: <strong class="bg-on-primary text-primary-container px-2 py-1 rounded mx-1 uppercase">BEE200</strong></span>
      </div>
    </section>

    <!-- 4. Categories Section -->
    <section class="py-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <h2 class="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-center mb-12 uppercase tracking-wide">HÔM NAY MUA GÌ?</h2>
      <div class="flex overflow-x-auto no-scrollbar pb-6 gap-6 md:gap-8 justify-start md:justify-center snap-x">
        <!-- Category Item 1 -->
        <a class="flex flex-col items-center gap-4 min-w-[100px] snap-center group" href="#">
          <div class="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary-container transition-colors p-1">
            <div class="w-full h-full rounded-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" data-alt="A close-up studio shot of a trendy women's t-shirt folded neatly. High-key lighting, bright white background, editorial fashion style. The fabric texture is crisp and clear, creating a premium feel." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDuj2avGetkExVWy0bFE3d3gOFGPraqouB9RMwtqNsb50CBTpcEoLuZZgKfR4tpMa_Y4R5iviCSVWhpJslbarM8RETzggwZ1t8rbcO9KdYzwr29pUznmT3Lza1nDYGCtS4im-nCzBNXNpJSz9hdd1niC7utlooP8DfeBuSIRdL7wXdWgaQR6CiPZ1ZbxrQ04h9wN8j1TLylM3H7GNEQcEOD_om5e-Dwf3ukGxb4JW4yEhJ7b8uvY59eXLhGjJ8MwkzRaV4apoI5pHs')"></div>
          </div>
          <span class="text-label-sm font-label-sm uppercase tracking-wider text-center group-hover:text-primary-container transition-colors">Áo Thun Nữ</span>
        </a>
        <!-- Category Item 2 -->
        <a class="flex flex-col items-center gap-4 min-w-[100px] snap-center group" href="#">
          <div class="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary-container transition-colors p-1">
            <div class="w-full h-full rounded-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" data-alt="A stylish flat lay of a men's polo shirt, elegantly arranged. High contrast lighting, clean white background, minimalist presentation. The focus is on the sophisticated cut and quality material." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAm0zIVq7VIVdXE6Mq6HeKYRGUKrwPW0kUZez4kUaQPXQ3yoBAJ3p29pFyIuqwp0HNTlj6YPEsWUEk1Xcrq6L-xzB9mXrXaWsSdtiWgLii3bbt_xV8hPeqGfRcTY2PC3bT80bpkY6DHUl3QWlWatSMcLVvMeAtrOS8jBjXRFgazIlG9p9FbLTPppTDzTIyhFTUiBIgAXsjr7jzhtlUahMO0RSOGa1nP-IrZwQwXLkt3Z2E2_iELNp3AqYeml8GpSQvCAFe94wjCZ2U')"></div>
          </div>
          <span class="text-label-sm font-label-sm uppercase tracking-wider text-center group-hover:text-primary-container transition-colors">Áo Polo Nam</span>
        </a>
        <!-- Category Item 3 -->
        <a class="flex flex-col items-center gap-4 min-w-[100px] snap-center group" href="#">
          <div class="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary-container transition-colors p-1">
            <div class="w-full h-full rounded-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" data-alt="An elegant presentation of women's sun protection outerwear. Shot in a bright, modern studio setting with soft natural light filtering through. The garment is draped beautifully to highlight its functional yet stylish design." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCarTSRbX2o-s6e8UxaMHazBrXmtUdg8KOgN3d_gDKZzZTyY3c3XLZ0tjJgMlKGTAuCo5fX-YaC8lapddGOhZ6LHQZSP1loFRc_w5PqWNAD1Fo6JsWDpFozWbkJVgbLrEncqpDB4v4zr_yzPASYlWbqOhnzXTMm6R51Z8tDiwb66uRW-fyYRU5NgXclGmPA23PG1f3_DaIaaPFeo5RWamaTORQbCCXrERStRerg2M1ufxi-DdI-PH4PP9VKpLWP5HgomPNk2ACFFt8')"></div>
          </div>
          <span class="text-label-sm font-label-sm uppercase tracking-wider text-center group-hover:text-primary-container transition-colors">Áo Chống Nắng</span>
        </a>
        <!-- Category Item 4 -->
        <a class="flex flex-col items-center gap-4 min-w-[100px] snap-center group" href="#">
          <div class="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary-container transition-colors p-1">
            <div class="w-full h-full rounded-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" data-alt="A clean, minimalist photo of a stylish pair of shorts. Soft studio lighting against a pristine white backdrop. The composition is simple, emphasizing the sharp lines and summer-ready aesthetic." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDPP0owJ7qF1qksrL64DVLMpNKneXNljuHymJ7xr-vy8EDqvNnNGtLuKh6idmja3FyFoP2bMBa6Vdo0HvCAG3TYVFveglM_GVN-4PvaRRVlRN1G86ZxkOyYk5PDmApR5vqGF9tjpK3fFv07DpUSDEuIK_2LcIsy1YAMlHSPU8H2dctMPGvpoR50Tu2QJu9r57mS3WUHve9k9rBKiTBV7svyNYhNrmsy50lw93JW-yBmvkqJIJuQ_y5z7q9yAspsRWVWzQ2KHFT73RA')"></div>
          </div>
          <span class="text-label-sm font-label-sm uppercase tracking-wider text-center group-hover:text-primary-container transition-colors">Quần Short</span>
        </a>
        <!-- Category Item 5 -->
        <a class="flex flex-col items-center gap-4 min-w-[100px] snap-center group" href="#">
          <div class="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary-container transition-colors p-1">
            <div class="w-full h-full rounded-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" data-alt="A dynamic, high-quality image of fashionable activewear for women. The lighting is crisp and energetic, set in a modern gym or clean studio. The focus is on the sleek fabric and active lifestyle aesthetic." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAZVjZKJwhjCN2FwVUvdel5oJ1G4mj0o-fx7s3a5x-mul6Fk402xrtM65LE9gI5Jeqf9O9PVhXWHK6UgqRFzTAtY_I61lsC1SxHcysyIhBTpacBQIfRt2jqvSG5wdez__x-fzHvub--nF9XxgoHR8IkMKJTFvyan4WIAiF3Kpi-M9KoJT1ZdzfvFEDG4oprsUuF3vbBF291i1EA39Q608MDz2Wqo4z1DANAIkQn8gFPGmTiuCYv86EgcmM8o4v639tJhuaksl5c31k')"></div>
          </div>
          <span class="text-label-sm font-label-sm uppercase tracking-wider text-center group-hover:text-primary-container transition-colors">Đồ Thể Thao</span>
        </a>
        <!-- Category Item 6 -->
        <RouterLink to="/all-products" class="flex flex-col items-center gap-4 min-w-[100px] snap-center group">
          <div class="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary-container transition-colors p-1">
            <div class="w-full h-full rounded-full bg-surface-variant flex items-center justify-center group-hover:bg-primary-container/10 transition-colors">
              <span class="text-label-sm font-label-sm uppercase tracking-wider text-center group-hover:text-primary-container transition-colors">Xem<br/>Tất Cả</span>
            </div>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- 5. Featured Products -->
    <section class="py-section-gap px-margin-mobile md:px-margin-desktop bg-surface max-w-container-max mx-auto">
      <div class="flex justify-between items-end mb-10">
        <h2 class="text-headline-lg-mobile md:text-headline-lg font-headline-lg uppercase tracking-wide">FLASH SALE</h2>
        <div class="hidden md:flex gap-2">
          <button class="w-10 h-10 border border-outline-variant flex items-center justify-center hover:bg-surface-variant transition-colors"><span class="material-symbols-outlined">chevron_left</span></button>
          <button class="w-10 h-10 border border-outline-variant flex items-center justify-center hover:bg-surface-variant transition-colors"><span class="material-symbols-outlined">chevron_right</span></button>
        </div>
      </div>
      <!-- Product Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-gutter">
        <RouterLink v-for="p in products" :key="p.id" :to="`/product/${p.id}`" class="flex flex-col group cursor-pointer">
          <div class="relative aspect-[3/4] bg-surface-variant overflow-hidden mb-4">
            <img class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" :src="p.image" :alt="p.name"/>
            <!-- Badges -->
            <div v-if="p.maxDiscountPercent > 0" class="absolute top-2 left-2 flex flex-col gap-1">
              <span class="bg-primary-container text-on-primary text-[10px] md:text-xs font-bold uppercase px-2 py-1 leading-none shadow-sm">
                GIẢM {{ p.maxDiscountPercent }}%
              </span>
            </div>
            <div class="absolute top-2 right-2">
              <button class="w-8 h-8 bg-surface rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary-container shadow-sm transition-colors">
                <span class="material-symbols-outlined text-[18px]">favorite</span>
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="text-body-md font-body-md text-on-background line-clamp-2 leading-tight">{{ p.name }}</h3>
            <!-- Price Display -->
            <div class="flex items-end gap-2 mt-1 flex-wrap">
              <template v-if="p.maxDiscountPercent > 0">
                <span class="text-title-md font-title-md text-primary-container font-bold">
                  {{ formatCurrency(p.discountedMin) }}
                </span>
                <span class="text-body-sm text-on-surface-variant line-through text-[14px]">
                  {{ formatCurrency(p.priceMin) }}
                </span>
                <span class="text-[12px] font-bold text-primary-container bg-primary-container/10 px-1 rounded">
                  -{{ p.maxDiscountPercent }}%
                </span>
              </template>
              <template v-else>
                <span class="text-title-md font-title-md text-primary-container font-bold">
                  {{ formatCurrency(p.priceMin) }}
                </span>
              </template>
            </div>
          </div>
        </RouterLink>
      </div>
      <!-- View All Button -->
      <div class="flex justify-center mt-12">
        <RouterLink to="/all-products" class="bg-primary-container text-on-primary text-label-sm font-label-sm uppercase tracking-widest px-8 md:px-12 py-4 rounded-none hover:bg-primary transition-colors flex items-center justify-center w-full md:w-auto text-center">
          XEM TẤT CẢ SẢN PHẨM
        </RouterLink>
      </div>
    </section>

    <!-- 6. Brand Quote -->
    <section class="w-full bg-primary-container text-on-primary py-16 md:py-24 px-margin-mobile md:px-margin-desktop my-section-gap">
      <div class="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
        <span class="material-symbols-outlined text-[48px] opacity-80">format_quote</span>
        <h2 class="text-headline-lg-mobile md:text-headline-lg font-headline-lg leading-snug">
          "Thời trang không chỉ là những gì bạn mặc, nó là ngôn ngữ không lời thể hiện bạn là ai. Bee Stylish đồng hành cùng bạn kiến tạo phong cách riêng, tối giản nhưng không bao giờ nhạt nhòa."
        </h2>
        <div class="w-16 h-1 bg-on-primary/50 mt-4"></div>
        <span class="text-label-sm font-label-sm uppercase tracking-widest mt-2">Đội ngũ Bee Stylish</span>
      </div>
    </section>
  </main>
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
