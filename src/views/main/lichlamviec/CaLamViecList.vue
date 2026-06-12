<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <div class="flex flex-col gap-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-[#0D2533] font-headline-md">
          Quản lý lịch làm việc/Ca làm việc
        </h1>
        
      </div>
    </div>

    <div
      class="bg-white p-6 rounded-2xl border border-surface-container shadow-sm space-y-6"
    >
      <div
        class="bg-white p-6 rounded-2xl border border-surface-container shadow-sm space-y-6"
      >
        <!-- Tìm kiếm -->
        <div class="relative w-full">
            
          <span
            class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl"
          >
            search
          </span>

          <input
            v-model="searchQuery"
            type="text"
            placeholder="Tìm kiếm mã ca hoặc tên ca..."
class="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] text-base transition-all font-body-md"          />
        </div>

        <!-- Bộ lọc -->
        <div
          class="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-gray-100"
        >
          <div class="flex flex-wrap items-center gap-6">
            <div class="h-8 w-px bg-gray-200"></div>
            <!-- Trạng thái -->
            <div class="flex items-center gap-6">
              <label>
                <input type="radio" value="" v-model="selectedStatus" />
                Tất cả
              </label>

              <label>
                <input type="radio" value="1" v-model="selectedStatus" />
                Hoạt động
              </label>

              <label>
                <input type="radio" value="0" v-model="selectedStatus" />
                Ngừng hoạt động
              </label>
            </div>
          </div>

          <!-- Reset -->
          <button
            @click="resetFilters"
            class="px-4 py-2.5 text-[#EF972D] hover:bg-[#EF972D]/10 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1 font-body-md cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">
              restart_alt
            </span>
            Đặt lại bộ lọc
          </button>
          
          <button
            @click="themCaLamViec"
            class="bg-orange-500 text-white px-5 py-2 rounded-lg"
          >
            Thêm ca làm việc
          </button>
        
        </div>
      </div>
    </div>

    <div
      class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <!-- Header -->
      <div class="flex justify-between items-center p-6 border-b">
        <h3 class="text-2xl font-bold text-gray-800">Ca làm việc</h3>
      </div>

      <div class="overflow-x-auto">
        <table
          class="w-full text-left border-collapse , min-w-full table-fixed"
        >
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr class="text-xs uppercase tracking-wider text-gray-500">
              <th class="px-6 py-4 text-center">STT</th>
              <th class="px-6 py-4 text-center">Mã ca</th>
              <th class="px-6 py-4 text-center">Tên ca</th>
              <th class="px-6 py-4 text-center">Giờ bắt đầu</th>
              <th class="px-6 py-4 text-center">Giờ kết thúc</th>
              <th class="px-6 py-4 text-center">Trạng thái</th>
              <th class="px-6 py-4 text-center">Hành động</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="(item, index) in filteredCaLamViecs"
              :key="item.id"
              class="hover:bg-gray-50"
            >
              <td class="px-5 py-3 text-sm text-gray-500 text-center">
                {{ index + 1 }}
              </td>

              <td
                class="px-4 py-2 text-sm font-semibold text-orange-300 text-center"
              >
                {{ item.maCa }}
              </td>

              <td class="px-4 py-2 text-sm font-semibold text-center">
                {{ item.tenCa }}
              </td>

              <td class="px-4 py-2 text-sm font-semibold text-center">
                {{ item.gioBatDau }}
              </td>

              <td class="px-4 py-2 text-sm font-semibold text-center">
                {{ item.gioKetThuc }}
              </td>

              <td class="px-6 py-4 text-center">
                <span
                  :class="
                    item.trangThai === 1
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  "
                  class="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase whitespace-nowrap"
                >
                  {{ item.trangThai === 1 ? "Hoạt động" : "Ngừng hoạt động" }}
                </span>
              </td>
              <td>
                <div class="flex items-center justify-center gap-2">
                  <label
                    class="relative inline-flex items-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      class="sr-only peer"
                      :checked="item.trangThai === 1"
                      @change="doiTrangThai(item.id)"
                    />
                    <div
                      class="relative w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-5"
                    ></div>
                  </label>
                  <button @click="goToEdit(item.id)">
                    <span class="material-symbols-outlined"> visibility </span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

<ThemCaLamViec
  v-model="showModal"
  :form-data="currentCa"
  :is-edit="isEdit"
  @save="saveCaLam"
/>

    <div
      v-if="showStatusMessage"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
    >
      <div
        class="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl text-center"
      >
        <p
          :class="[
            'mb-4 text-lg font-semibold',
            statusSuccess ? 'text-green-600' : 'text-red-600',
          ]"
        >
          {{ statusMessage }}
        </p>
        <button
          type="button"
          @click="closeStatusMessage"
          class="px-4 py-2 rounded-lg bg-orange-500 text-white"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import CaLamViecApi from "@/services/CaLamViecApi";
import ThemCaLamViec from "@/views/main/lichlamviec/ThemCaLamViec.vue";


const router = useRouter();

const caLamViecs = ref([]);

const showStatusMessage = ref(false);
const statusMessage = ref("");
const statusSuccess = ref(true);

const searchQuery = ref("");
const selectedStatus = ref("");

const loadData = async () => {
  try {
    const response = await CaLamViecApi.getAll();

    caLamViecs.value = response.data.sort((a, b) => b.id - a.id);
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  loadData();
});

const themCaLamViec = () => {
  isEdit.value = false;

  currentCa.value = {
    tenCa: "",
    gioBatDau: "",
    gioKetThuc: "",
    trangThai: 1
  };

  showModal.value = true;
};

const goToEdit = (id) => {
  const ca = caLamViecs.value.find(
    (item) => item.id === id
  );

  currentCa.value = { ...ca };

  isEdit.value = true;

  showModal.value = true;
};

const doiTrangThai = async (id) => {
  try {
    await CaLamViecApi.doiTrangThai(id);

    await loadData();

    statusMessage.value = "Chuyển trạng thái thành công";

    statusSuccess.value = true;

    showStatusMessage.value = true;
  } catch (error) {
    console.error(error);

    statusMessage.value = "Chuyển trạng thái thất bại";

    statusSuccess.value = false;

    showStatusMessage.value = true;
  }
};

const closeStatusMessage = () => {
  showStatusMessage.value = false;
};

const resetFilters = () => {
  searchQuery.value = "";
  selectedStatus.value = "";
};

const filteredCaLamViecs = computed(() => {
  return caLamViecs.value.filter((item) => {
    const keyword = searchQuery.value.trim().toLowerCase();

    const matchKeyword =
      keyword === "" ||
      item.maCa?.toLowerCase().includes(keyword) ||
      item.tenCa?.toLowerCase().includes(keyword);

    const matchStatus =
      selectedStatus.value === "" ||
      String(item.trangThai) === selectedStatus.value;

    return matchKeyword && matchStatus;
  });
});

const showModal = ref(false);

const isEdit = ref(false);

const currentCa = ref({
  tenCa: "",
  gioBatDau: "",
  gioKetThuc: "",
  trangThai: 1
});

const saveCaLam = async (form) => {
  try {
    if (isEdit.value) {
      await CaLamViecApi.update(
        currentCa.value.id,
        form
      );
    } else {
      await CaLamViecApi.create(form);
    }

    showModal.value = false;

    await loadData();

    statusMessage.value = isEdit.value
      ? "Cập nhật thành công"
      : "Thêm mới thành công";

    statusSuccess.value = true;

    showStatusMessage.value = true;
  } catch (error) {
    console.error(error);

    statusMessage.value = "Thao tác thất bại";

    statusSuccess.value = false;

    showStatusMessage.value = true;
  }
};


</script>
