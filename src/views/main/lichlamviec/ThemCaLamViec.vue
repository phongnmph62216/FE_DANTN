<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
  >
    <div class="w-full max-w-xl bg-white rounded-2xl shadow-xl">

      <div class="flex items-center justify-between p-5 border-b">
        <h2 class="text-xl font-semibold">
          {{ isEdit ? "Cập nhật Ca làm việc" : "Thêm mới Ca làm việc" }}
        </h2>

        <button
          @click="closeModal"
          class="text-gray-400 hover:text-red-500"
        >
          ✕
        </button>
      </div>

      <div class="p-5 space-y-4">

        <div>
          <label class="block mb-2 text-sm font-medium">
            Tên ca
          </label>

          <input
            v-model="localForm.tenCa"
            type="text"
            class="w-full border rounded-lg px-4 py-3"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">

          <div>
            <label class="block mb-2 text-sm font-medium">
              Giờ bắt đầu
            </label>

            <input
              v-model="localForm.gioBatDau"
              type="time"
              class="w-full border rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label class="block mb-2 text-sm font-medium">
              Giờ kết thúc
            </label>

            <input
              v-model="localForm.gioKetThuc"
              type="time"
              class="w-full border rounded-lg px-4 py-3"
            />
          </div>

        </div>

        

      </div>

      <div class="flex justify-end gap-3 p-5 border-t">

        <button
          @click="closeModal"
          class="px-4 py-2 border rounded-lg"
        >
          Hủy bỏ
        </button>

        <button
          @click="submitForm"
          class="px-4 py-2 text-white rounded-lg bg-orange-500"
        >
          {{ isEdit ? "Cập nhật" : "Thêm mới" }}
        </button>

      </div>

    </div>
  </div>
</template>


<script setup>
import { reactive, watch } from "vue";

const props = defineProps({
  modelValue: Boolean,
  formData: Object,
  isEdit: Boolean
});

const emit = defineEmits([
  "update:modelValue",
  "save"
]);

const localForm = reactive({
  tenCa: "",
  gioBatDau: "",
  gioKetThuc: "",
  trangThai: 1,
});

watch(
  () => props.formData,
  (value) => {
    if (value) {
      Object.assign(localForm, {
        tenCa: value.tenCa || "",

        // LocalTime từ backend: 08:00:00 -> 08:00
        gioBatDau: value.gioBatDau
          ? value.gioBatDau.substring(0, 5)
          : "",

        gioKetThuc: value.gioKetThuc
          ? value.gioKetThuc.substring(0, 5)
          : "",

        trangThai:
          value.trangThai !== undefined
            ? value.trangThai
            : 1
      });
    }
  },
  {
    immediate: true
  }
);

const closeModal = () => {
  emit("update:modelValue", false);
};

const submitForm = () => {
  // validate
  if (!localForm.tenCa?.trim()) {
    alert("Tên ca không được để trống");
    return;
  }

  if (!localForm.gioBatDau) {
    alert("Vui lòng chọn giờ bắt đầu");
    return;
  }

  if (!localForm.gioKetThuc) {
    alert("Vui lòng chọn giờ kết thúc");
    return;
  }

  if (localForm.gioBatDau >= localForm.gioKetThuc) {
    alert("Giờ kết thúc phải lớn hơn giờ bắt đầu");
    return;
  }

  emit("save", {
    ...localForm,

    // Chuyển về LocalTime cho Spring Boot
    gioBatDau: `${localForm.gioBatDau}:00`,
    gioKetThuc: `${localForm.gioKetThuc}:00`
  });
};
</script>
