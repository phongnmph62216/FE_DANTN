<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <div class="flex flex-col gap-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-[#0D2533] font-headline-md">
          Quản Lý Tài Khoản/Quản Lý Nhân Viên
        </h1>
        <div class="flex items-center gap-3">
          <button
            @click="themNhanVien"
            class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer"
          >
            <span class="material-symbols-outlined">add</span> Thêm nhân viên
            mới
          </button>
        </div>
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
            placeholder="Tìm kiếm mã nhân viên, tên nhân viên, SĐT, Email..."
            class="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] text-base transition-all font-body-md"
          />
        </div>

        <!-- Bộ lọc -->
        <div
          class="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-gray-100"
        >
          <div class="flex flex-wrap items-center gap-6">
            <!-- Chức vụ -->
            <select
              v-model="selectedRole"
              class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#EF972D]/20 focus:border-[#EF972D] min-w-[180px] cursor-pointer font-body-md"
            >
              <option value="">Tất cả chức vụ</option>
              <option value="QUẢN LÝ">Quản lý</option>
              <option value="NHÂN VIÊN">Nhân viên</option>
            </select>

            <div class="h-8 w-px bg-gray-200"></div>

            <!-- Trạng thái -->
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="" v-model="selectedStatus" />
                <span>Tất cả</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="1" v-model="selectedStatus" />
                <span>Đang làm việc</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="0" v-model="selectedStatus" />
                <span>Nghỉ việc</span>
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
            @click="handleExportExcel"
            class="flex items-center gap-2 text-green-600 font-semibold hover:text-green-700 transition"
          >
            <span class="material-symbols-outlined"> file_save </span>
            Xuất Excel
          </button>
        </div>
      </div>
    </div>

    <div
      class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <!-- Header -->
      <div class="flex justify-between items-center p-6 border-b">
        <h3 class="text-2xl font-bold text-gray-800">nhân viên</h3>
      </div>

      <div class="overflow-x-auto">
        <table
          class="w-full text-left border-collapse , min-w-full table-fixed"
        >
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr class="text-xs uppercase tracking-wider text-gray-500">
              <th class="px-6 py-4">STT</th>
              <th class="px-6 py-4">Ảnh</th>
              <th class="px-6 py-4">Mã NV</th>
              <th class="px-6 py-4">Họ và tên</th>
              <th class="px-6 py-4">CCCD</th>
              <th class="px-6 py-4">SĐT</th>
              <th class="px-6 py-4">Email</th>
              <th class="px-6 py-4">Địa Chỉ</th>
              <th class="px-6 py-4">Chức vụ</th>
              <th class="px-6 py-4 text-center">Trạng thái</th>
              <th class="px-6 py-4 text-center">Hành động</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="(item, index) in filteredNhanViens"
              :key="item.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <!-- STT -->
              <td class="px-5 py-3 text-sm text-gray-500">
                {{ index + 1 }}
              </td>

              <td class="px-5 py-3">
                <img
                  :src="`http://localhost:8080/uploads/${item.anhDaiDien}`"
                  alt="Ảnh nhân viên"
                  class="w-12 h-12 object-cover rounded-full border"
                />
              </td>

              <!-- Mã NV -->
              <td class="px-4 py-2 text-sm font-semibold text-orange-300">
                {{ item.maNhanVien }}
              </td>

              <!-- Họ tên -->
              <td class="px-5 py-3">
                <div class="max-w-[180px] break-words whitespace-normal">
                  <span class="font-medium text-gray-600">
                    {{ item.hoVaTen }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-2 text-sm text-gray-500">
                {{ item.cccd }}
              </td>

              <!-- SĐT -->
              <td class="px-4 py-2 text-sm text-gray-500">
                {{ item.soDienThoai }}
              </td>

              <!-- Email -->

              <td class="px-4 py-2 text-sm text-gray-500">
                <div class="max-w-[180px] break-all">
                  {{ item.email }}
                </div>
              </td>

              <td class="px-4 py-2 text-sm text-gray-500">
                <div class="max-w-[220px] break-words">
                  {{ item.diaChi }}
                </div>
              </td>
              <td class="px-4 py-2 text-sm text-gray-500">
                {{ item.vaiTro }}
              </td>

              <!-- Trạng thái -->
              <td class="px-6 py-4 text-center">
                <span
                  :class="
                    item.trangThai === 1
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  "
                  class="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase whitespace-nowrap"
                >
                  {{ item.trangThai === 1 ? "Đang làm" : "Nghỉ việc" }}
                </span>
              </td>

              <!-- Hành động -->
              <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                  <!-- Switch -->
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

                  <!-- Chi tiết -->
                  <button
                    @click="goToEdit(item.id)"
                    class="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span class="material-symbols-outlined text-xl">
                      visibility
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

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
import NhanVienApi from "@/services/NhanVienApi";
import { useRouter } from "vue-router";
import { exportNhanVienExcel } from "@/services/NhanVienApi";
const router = useRouter();

const goToEdit = (id) => {
  router.push(`/sua-nhan-vien/${id}`);
};

const themNhanVien = () => {
  router.push("/them-nhan-vien");
};

const nhanViens = ref([]);
const showStatusMessage = ref(false);
const statusMessage = ref("");
const statusSuccess = ref(true);

const loadData = async () => {
  const response = await NhanVienApi.getAll();

  nhanViens.value = response.data.sort((a, b) => b.id - a.id);
};

const doiTrangThai = async (id) => {
  try {
    await NhanVienApi.doiTrangThai(id);

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

onMounted(() => {
  loadData();
});

const searchQuery = ref("");
const selectedStatus = ref("");
const selectedRole = ref("");

const resetFilters = () => {
  searchQuery.value = "";
  selectedStatus.value = "";
  selectedRole.value = "";
};

const filteredNhanViens = computed(() => {
  return nhanViens.value.filter((item) => {
    const keyword = searchQuery.value.trim().toLowerCase();

    const matchKeyword =
      keyword === "" ||
      item.maNhanVien?.toLowerCase().includes(keyword) ||
      item.hoVaTen?.toLowerCase().includes(keyword) ||
      item.soDienThoai?.includes(keyword) ||
      item.email?.toLowerCase().includes(keyword);

    const matchStatus =
      selectedStatus.value === "" ||
      String(item.trangThai) === selectedStatus.value;

    const matchRole =
      selectedRole.value === "" || item.vaiTro === selectedRole.value;

    return matchKeyword && matchStatus && matchRole;
  });
});

const handleExportExcel = async () => {
  try {
    const response = await exportNhanVienExcel();

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.setAttribute("download", "DanhSachNhanVien.xlsx");

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);

    alert("Xuất Excel thất bại");
  }
};
</script>
