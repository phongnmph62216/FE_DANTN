<script setup>
import { ref } from 'vue'

// Dropdown options state (Tải Excel, Quét QR)
const optionsOpen = ref(false)

// Filter states
const searchQuery = ref('')
const selectedBrand = ref('')
const selectedMaterial = ref('')
const selectedStatus = ref('all')

// Reset filters function
const resetFilters = () => {
  searchQuery.value = ''
  selectedBrand.value = ''
  selectedMaterial.value = ''
  selectedStatus.value = 'all'
}

// Filter results mock action
const filterResults = () => {
  alert(`Đang lọc với: 
- Tìm kiếm: ${searchQuery.value || 'Trống'}
- Thương hiệu: ${selectedBrand.value || 'Tất cả'}
- Chất liệu: ${selectedMaterial.value || 'Tất cả'}
- Trạng thái: ${selectedStatus.value}`)
}

// Product Mock Data
const products = ref([
  {
    id: 1,
    code: 'SP001',
    name: 'Áo sơ mi Cuban Linen',
    brand: 'Bee Stylish',
    material: 'Linen cao cấp',
    stock: 450,
    price: '850.000₫',
    isActive: true,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6OSi-p_zG0nKErBTW3RblluI5QiXSfPaHqc0Q15Y8kmEJUMJzMkUIH_rxkXqv6j4q8cUpscRzQHICzaMcAxcUeyhl7-4FaNV_zvQgsgtNpC2TsTOJs-NDeymSXeWm0YSAZ6MiSImQs2QCE4fK8wZPGFHwi3yn_NspC1sn6BmaDjxpsP8YduhDY6_rtPmP6CwqoMqOa_M_2VTXWU4Ad7PCOuG5h0Hjg6uEVz5kBsv2L-k49PlqGhhVRb31uHx5khP1TglvipbnKkw'
  },
  {
    id: 2,
    code: 'SP002',
    name: 'Áo Polo năng động',
    brand: 'Nike Sport',
    material: 'Cotton 4 chiều',
    stock: 320,
    price: '420.000₫',
    isActive: true,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXu57TCxGlrCpl6s7wTkpKq6jqCHcxLmC0zl0i6ve_bOAk3f4F6UiNyPQOJwe9CY3Cjw-ophCADbxHB2SQaMiC76T-bDNBgiGNnlop7loB0AD08XKjJdpj5Pomt5DTdchX7pBHUtC0MuccE3ebzPJJfaDHjiuMbx6dO1khCrB9LPtFgjobEsXQdoVKn9cCBMZLapiFRNjKYjX7o1N1DGVgloW02s1YKmfFNbwdrBjQhXlMZAdGz61SCimBneNh35Jbm3ZroeI2Hsvrk'
  }
])

const handleToggle = (product) => {
  console.log(`Thay đổi trạng thái sản phẩm ${product.code}: ${product.isActive}`)
}

const addProduct = () => {
  alert('Chức năng thêm sản phẩm mới')
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <div class="flex flex-col gap-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-[#0D2533] font-headline-md">Danh sách sản phẩm</h1>
        <div class="flex items-center gap-3">
          <button
            @click="addProduct"
            class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer"
          >
            <span class="material-symbols-outlined">add</span> Thêm sản phẩm mới
          </button>
          
          <!-- More Actions Dropdown -->
          <div class="relative">
            <button
              @click="optionsOpen = !optionsOpen"
              class="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center cursor-pointer"
            >
              <span class="material-symbols-outlined">more_horiz</span>
            </button>
            <div
              v-show="optionsOpen"
              @click="optionsOpen = false"
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1"
            >
              <a class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" href="#">
                <span class="material-symbols-outlined text-sm">download</span> Tải Excel
              </a>
              <a class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2" href="#">
                <span class="material-symbols-outlined text-sm">qr_code_scanner</span> Quét QR
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters & Search Card -->
      <div class="bg-white p-6 rounded-2xl border border-surface-container shadow-sm space-y-6">
        <!-- Prominent Search Bar -->
        <div class="relative w-full">
          <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
          <input
            v-model="searchQuery"
            class="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] text-base transition-all font-body-md"
            placeholder="Nhập mã hoặc tên sản phẩm..."
            type="text"
          />
        </div>

        <!-- Filter Controls Row -->
        <div class="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-gray-100">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-4">
              <select
                v-model="selectedBrand"
                class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] min-w-[180px] cursor-pointer font-body-md"
              >
                <option value="">Tất cả thương hiệu</option>
                <option value="1">Bee Stylish</option>
                <option value="2">Nike Sport</option>
              </select>

              <select
                v-model="selectedMaterial"
                class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] min-w-[180px] cursor-pointer font-body-md"
              >
                <option value="">Tất cả chất liệu</option>
                <option value="1">Linen</option>
                <option value="2">Cotton</option>
              </select>
            </div>

            <div class="h-8 w-px bg-gray-200 mx-2"></div>

            <!-- Radio Group -->
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                  <input
                    class="peer sr-only"
                    name="status"
                    type="radio"
                    value="all"
                    v-model="selectedStatus"
                  />
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#EF972D] transition-colors"></div>
                  <div class="absolute w-2.5 h-2.5 rounded-full bg-[#EF972D] scale-0 peer-checked:scale-100 transition-transform"></div>
                </div>
                <span
                  :class="selectedStatus === 'all' ? 'text-[#0D2533] font-semibold' : 'text-gray-600'"
                  class="text-sm font-medium transition-colors font-body-md"
                >Tất cả</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                  <input
                    class="peer sr-only"
                    name="status"
                    type="radio"
                    value="active"
                    v-model="selectedStatus"
                  />
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#EF972D] transition-colors"></div>
                  <div class="absolute w-2.5 h-2.5 rounded-full bg-[#EF972D] scale-0 peer-checked:scale-100 transition-transform"></div>
                </div>
                <span
                  :class="selectedStatus === 'active' ? 'text-[#0D2533] font-semibold' : 'text-gray-600'"
                  class="text-sm font-medium transition-colors font-body-md"
                >Kinh doanh</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                  <input
                    class="peer sr-only"
                    name="status"
                    type="radio"
                    value="inactive"
                    v-model="selectedStatus"
                  />
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#EF972D] transition-colors"></div>
                  <div class="absolute w-2.5 h-2.5 rounded-full bg-[#EF972D] scale-0 peer-checked:scale-100 transition-transform"></div>
                </div>
                <span
                  :class="selectedStatus === 'inactive' ? 'text-[#0D2533] font-semibold' : 'text-gray-600'"
                  class="text-sm font-medium transition-colors font-body-md"
                >Ngừng kinh doanh</span>
              </label>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <button
              @click="filterResults"
              class="px-6 py-2.5 bg-[#0D2533] text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-colors shadow-sm font-body-md cursor-pointer"
            >
              Lọc kết quả
            </button>
            <button
              @click="resetFilters"
              class="px-4 py-2.5 text-[#EF972D] hover:bg-[#EF972D]/10 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1 font-body-md cursor-pointer"
            >
              <span class="material-symbols-outlined text-[18px]">restart_alt</span> Đặt lại bộ lọc
            </button>
          </div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="bg-white rounded-xl border border-surface-container shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr class="text-on-surface-variant font-label-sm text-xs uppercase tracking-wider">
                <th class="px-6 py-4">STT</th>
                <th class="px-6 py-4">Mã SP</th>
                <th class="px-6 py-4">Tên sản phẩm</th>
                <th class="px-6 py-4">Thương hiệu</th>
                <th class="px-6 py-4">Chất liệu</th>
                <th class="px-6 py-4">Tồn kho</th>
                <th class="px-6 py-4 text-right">Khoảng giá</th>
                <th class="px-6 py-4">Trạng thái</th>
                <th class="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(product, idx) in products"
                :key="product.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 text-sm text-gray-500">{{ idx + 1 }}</td>
                <td class="px-6 py-4 text-sm font-semibold text-[#EF972D]">{{ product.code }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <img class="w-10 h-10 rounded-md object-cover" :src="product.image" :alt="product.name" />
                    <span class="text-sm font-medium text-on-surface">{{ product.name }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ product.brand }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ product.material }}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{{ product.stock }}</td>
                <td class="px-6 py-4 text-sm text-right font-medium text-on-surface">{{ product.price }}</td>
                <td class="px-6 py-4">
                  <span
                    :class="product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                    class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase"
                  >
                    {{ product.isActive ? 'Đang bán' : 'Ngừng bán' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center gap-2">
                    <!-- Toggle Switch -->
                    <label class="relative inline-flex items-center cursor-pointer group mr-1">
                      <input
                        type="checkbox"
                        class="sr-only peer"
                        v-model="product.isActive"
                        @change="handleToggle(product)"
                      />
                      <div class="relative w-10 h-5 bg-gray-300 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                    
                    <button class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                      <span class="material-symbols-outlined text-xl">edit_note</span>
                    </button>
                    
                    <button class="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                      <span class="material-symbols-outlined text-xl">visibility</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Hiển thị 1-10 của 128 sản phẩm</span>
          <div class="flex gap-1">
            <button class="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button class="w-10 h-10 bg-[#EF972D] text-white rounded-lg font-bold cursor-pointer">1</button>
            <button class="w-10 h-10 hover:bg-gray-100 rounded-lg cursor-pointer">2</button>
            <button class="w-10 h-10 hover:bg-gray-100 rounded-lg cursor-pointer">3</button>
            <button class="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
