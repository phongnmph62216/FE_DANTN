<template>
  <div class="flex flex-col gap-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[#0D2533] font-headline-md">
        Quản Lý Tài Khoản/Quản Lý Nhân Viên
      </h1>
    </div>
  </div>
  <div class="flex justify-between items-center mb-6">
    <h3 class="text-2xl font-bold text-[#0D2533] font-headline-md">
      Thêm nhân viên
    </h3>

    <div class="flex gap-3">
      <button
        @click="$router.back()"
        class="px-4 py-2 bg-white border rounded-xl"
      >
        Quay lại
      </button>

      <button
        type="button"
        @click="handleSaveClick"
        class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer"
      >
        Lưu
      </button>
    </div>
  </div>

  <div class="bg-white rounded-2xl shadow-sm p-8">
    <div class="grid grid-cols-12 gap-8">
      <!-- Cột trái -->
      <div class="col-span-12 lg:col-span-3">
        <div class="flex flex-col items-center">
          <label for="avatar" class="cursor-pointer">
            <div
              class="w-40 h-40 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center"
            >
              <img
                v-if="previewImage"
                :src="previewImage"
                class="w-full h-full object-cover"
              />

              <template v-else>
                <span
                  class="material-symbols-outlined text-[90px] text-gray-300"
                >
                  account_circle
                </span>
              </template>
            </div>
          </label>

          <input
            id="avatar"
            type="file"
            accept="image/*"
            class="hidden"
            @change="chonAnh"
          />

          <input
            ref="fileInput"
            id="avatar"
            type="file"
            accept="image/*"
            class="hidden"
            @change="chonAnh"
          />

          <button
            type="button"
            @click="moChonAnh"
            class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer"
          >
            Chọn ảnh
          </button>

          <p class="text-xs text-gray-400 mt-2">Max 10MB</p>
        </div>
      </div>

      <!-- Cột phải -->
      <div class="col-span-12 lg:col-span-9 space-y-5">
        <!-- CCCD -->
        <div>
          <label class="block mb-2 font-medium"> Số CCCD/CMND * </label>

          <div class="relative">
            <input
              v-model="form.cccd"
              class="w-full border rounded-lg px-4 py-3"
              placeholder="Nhập số CCCD"
            />

            <button
              type="button"
              @click="moScanner"
              class="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <span class="material-symbols-outlined text-green-600">
                qr_code_scanner
              </span>
            </button>
          </div>
          <p v-if="errors.cccd" class="mt-2 text-sm text-red-600">
            {{ errors.cccd }}
          </p>
        </div>

        <!-- Hàng 1 -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-2 font-medium"> Họ và tên * </label>

            <input
              v-model="form.hoVaTen"
              class="w-full border rounded-lg px-4 py-3"
              placeholder="Nhập họ tên đầy đủ"
            />
            <p v-if="errors.hoVaTen" class="mt-2 text-sm text-red-600">
              {{ errors.hoVaTen }}
            </p>
          </div>

          <div>
            <label class="block mb-2 font-medium"> Ngày sinh </label>

            <input
              v-model="form.ngaySinh"
              type="date"
              class="w-full border rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label class="block mb-2 font-medium"> Giới tính * </label>

            <div class="flex items-center gap-6 mt-3">
              <label class="flex items-center gap-2">
                <input type="radio" :value="1" v-model="form.gioiTinh" />
                Nam
              </label>

              <label class="flex items-center gap-2">
                <input type="radio" :value="0" v-model="form.gioiTinh" />
                Nữ
              </label>
            </div>
          </div>
        </div>

        <!-- Hàng 2 -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-2 font-medium"> Số điện thoại * </label>

            <input
              v-model="form.soDienThoai"
              class="w-full border rounded-lg px-4 py-3"
              placeholder="VD: 0987..."
            />
            <p v-if="errors.soDienThoai" class="mt-2 text-sm text-red-600">
              {{ errors.soDienThoai }}
            </p>
          </div>

          <div>
            <label class="block mb-2 font-medium"> Email * </label>

            <input
              v-model="form.email"
              type="email"
              class="w-full border rounded-lg px-4 py-3"
              placeholder="example@email.com"
            />
            <p v-if="errors.email" class="mt-2 text-sm text-red-600">
              {{ errors.email }}
            </p>
          </div>

          <div>
            <label class="block mb-2 font-medium"> Chức vụ * </label>

            <select
              v-model="form.vaiTro"
              class="w-full border rounded-lg px-4 py-3"
            >
              <option value="">Chọn chức vụ</option>
              <option value="QUẢN LÝ">Quản lý</option>

              <option value="NHÂN VIÊN">Nhân viên</option>
            </select>
          </div>
        </div>

        <!-- Địa chỉ -->
        <div class="border rounded-xl p-5 bg-gray-50">
          <h3 class="font-semibold text-gray-700 mb-5">📍 ĐỊA CHỈ LIÊN HỆ</h3>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block mb-2"> Tỉnh/Thành phố </label>

              <select
                v-model="tinhThanh"
                @change="loadPhuongXa"
                class="w-full border rounded-lg px-4 py-3"
              >
                <option value="">Chọn Tỉnh/TP</option>

                <option
                  v-for="tinh in dsTinhThanh"
                  :key="tinh.id"
                  :value="tinh.province"
                >
                  {{ tinh.province }}
                </option>
              </select>
            </div>

            <div>
              <label class="block mb-2"> Phường/Xã </label>

              <select
                v-model="phuongXa"
                class="w-full border rounded-lg px-4 py-3"
              >
                <option value="">Chọn Phường/Xã</option>

                <option
                  v-for="px in dsPhuongXa"
                  :key="px.name"
                  :value="px.name"
                >
                  {{ px.name }}
                </option>
              </select>
            </div>

            <div class="col-span-2">
              <label class="block mb-2"> Địa chỉ chi tiết </label>

              <textarea
                v-model="diaChiChiTiet"
                rows="3"
                class="w-full border rounded-lg px-4 py-3"
                placeholder="Số nhà, tên đường..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="showScanner"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div class="bg-white p-4 rounded-xl w-[500px]">
          <h3 class="font-bold mb-3">Quét CCCD</h3>

          <div id="reader"></div>

          <button
            @click="dongScanner"
            class="mt-3 px-4 py-2 bg-red-500 text-white rounded"
          >
            Đóng
          </button>
        </div>
      </div>

      <div
        v-if="showConfirmSave"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      >
        <div class="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl">
          <h3 class="text-xl font-semibold mb-4">
            Bạn có muốn lưu nhân viên này?
          </h3>
          <p class="text-sm text-gray-600 mb-6">
            Bạn chắc chắc muốn lưu, nhấn Có để tiếp tục.
          </p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="showConfirmSave = false"
              class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              @click="submitSave"
              class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer"
            >
              Có
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showSuccess"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      >
        <div
          class="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl text-center"
        >
          <p
            :class="[
              'mb-4 text-lg font-semibold',
              isSaveSuccess ? 'text-green-600' : 'text-red-600',
            ]"
          >
            {{ successMessage }}
          </p>
          <div class="flex justify-center items-center">
            <button
              class="bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-all font-body-md cursor-pointer"
              type="button"
              @click="closeSuccess"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Html5Qrcode } from "html5-qrcode";
import { reactive, ref, onMounted, nextTick } from "vue";
import axios from "axios";
const showScanner = ref(false);

let html5QrCode = null;

const moScanner = async () => {
  try {
    showScanner.value = true;

    await nextTick();

    html5QrCode = new Html5Qrcode("reader");

    const cameras = await Html5Qrcode.getCameras();

    console.log("Danh sách camera:", cameras);

    if (!cameras.length) {
      alert("Không tìm thấy camera");
      return;
    }

    await html5QrCode.start(
      {
        deviceId: { exact: cameras[0].id },
      },
      {
        fps: 10,

        qrbox: {
          width: 350,
          height: 350,
        },

        videoConstraints: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      (decodedText) => {
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        // bỏ qua
      },
    );
  } catch (error) {
    console.error("Lỗi camera:", error);
  }
};

const onScanSuccess = async (decodedText) => {
  console.log(decodedText);

  try {
    const data = decodedText.split("|");

    form.cccd = data[0] || "";
    form.hoVaTen = data[2] || "";
    if (data[3]) {
      const ns = data[3];

      form.ngaySinh = `${ns.substring(4, 8)}-${ns.substring(2, 4)}-${ns.substring(0, 2)}`;
    }

    if (data[4] === "Nam") {
      form.gioiTinh = 1;
    } else {
      form.gioiTinh = 0;
    }

    dongScanner();
  } catch (e) {
    console.error(e);
  }
};

const dongScanner = async () => {
  showScanner.value = false;

  if (html5QrCode) {
    try {
      await html5QrCode.stop();
      await html5QrCode.clear();
    } catch (e) {
      console.error(e);
    }

    html5QrCode = null;
  }
};

const form = reactive({
  anhDaiDien: "",
  maNhanVien: "",
  hoVaTen: "",
  ngaySinh: "",
  cccd: "",
  gioiTinh: 1,
  soDienThoai: "",
  email: "",
  diaChi: "",
  vaiTro: "",
  matKhau: "",
  ngayVaoLam: "",
  trangThai: 1,
});

const errors = reactive({
  cccd: "",
  hoVaTen: "",

  soDienThoai: "",
  email: "",
});

const showConfirmSave = ref(false);
const showSuccess = ref(false);
const successMessage = ref("");
const isSaveSuccess = ref(false);

const tinhThanh = ref("");
const phuongXa = ref("");
const diaChiChiTiet = ref("");
const dsTinhThanh = ref([]);
const dsPhuongXa = ref([]);

const previewImage = ref(null);

const chonAnh = (event) => {
  const file = event.target.files[0];

  if (!file) return;

  form.anhDaiDien = file;

  previewImage.value = URL.createObjectURL(file);
};

import NhanVienApi from "@/services/NhanVienApi";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(async () => {
  const res = await axios.get("https://vietnamlabs.com/api/vietnamprovince");

  dsTinhThanh.value = res.data.data;
});

const validateForm = () => {
  errors.cccd = "";
  errors.hoVaTen = "";

  errors.soDienThoai = "";
  errors.email = "";

  if (!form.cccd) {
    errors.cccd = "CCCD không được để trống";
  } else if (!/^\d{12}$/.test(form.cccd)) {
    errors.cccd = "CCCD phải gồm đúng 12 chữ số";
  }

  if (!form.hoVaTen) {
    errors.hoVaTen = "Họ và tên không được để trống";
  } else if (form.hoVaTen.length < 2 || form.hoVaTen.length > 100) {
    errors.hoVaTen = "Họ và tên phải từ 2 đến 100 ký tự";
  } else if (!/^[\p{L}\s]+$/u.test(form.hoVaTen)) {
    errors.hoVaTen = "Họ và tên chỉ được chứa chữ cái và khoảng trắng";
  }

  if (!form.soDienThoai) {
    errors.soDienThoai = "Số điện thoại không được để trống";
  } else if (!/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(form.soDienThoai)) {
    errors.soDienThoai = "Số điện thoại không hợp lệ";
  }

  if (!form.email) {
    errors.email = "Email không được để trống";
  } else if (form.email.length > 100) {
    errors.email = "Email tối đa 100 ký tự";
  } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
    errors.email = "Email không đúng định dạng";
  }

  return Object.values(errors).every((value) => !value);
};

const handleSaveClick = () => {
  if (!validateForm()) {
    return;
  }
  showConfirmSave.value = true;
};

const submitSave = async () => {
  showConfirmSave.value = false;
  await luuNhanVien();
};

const closeSuccess = () => {
  showSuccess.value = false;
  if (isSaveSuccess.value) {
    router.push("/nhan-vien");
  }
};

const loadPhuongXa = async () => {
  const tinh = dsTinhThanh.value.find((x) => x.province === tinhThanh.value);

  dsPhuongXa.value = tinh?.wards || [];
};

const uploadAnh = async (file) => {
  const formData = new FormData();

  formData.append("file", file);

  const res = await axios.post("http://localhost:8080/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

const luuNhanVien = async () => {
  try {
    let tenFileAnh = "";

    if (form.anhDaiDien) {
      tenFileAnh = await uploadAnh(form.anhDaiDien);
    }

    const tenTinh = tinhThanh.value;

    const data = {
      anhDaiDien: tenFileAnh,

      maNhanVien: form.maNhanVien,
      hoVaTen: form.hoVaTen,
      cccd: form.cccd,
      gioiTinh: form.gioiTinh,
      soDienThoai: form.soDienThoai,
      email: form.email,
      matKhau: form.matKhau,
      ngaySinh: form.ngaySinh,
      ngayVaoLam: form.ngayVaoLam,
      diaChi: diaChiChiTiet.value + " ," + phuongXa.value + ", " + tenTinh,

      vaiTro: form.vaiTro,
      trangThai: 1,
    };

    await NhanVienApi.create(data);

    successMessage.value = "Thêm nhân viên thành công";
    isSaveSuccess.value = true;
    showSuccess.value = true;
  } catch (error) {
    console.error(error);

    successMessage.value =
      error.response?.data?.message || "Thêm nhân viên thất bại";

    isSaveSuccess.value = false;

    showSuccess.value = true;
  }
};

const fileInput = ref(null);

const moChonAnh = () => {
  fileInput.value.click();
};
</script>
