<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <div class="bg-white p-8 rounded-2xl border border-surface-container shadow-sm">
      <h1 class="text-3xl font-bold text-[#0D2533] mb-4">Chào mừng đến với Bee Stylish Admin Console</h1>
      <p class="text-gray-600 mb-6">
        Hệ thống quản lý thời trang Bee Stylish. Vui lòng chọn chức năng trên thanh điều hướng bên trái hoặc nhấn vào nút bên dưới để truy cập danh sách sản phẩm.
      </p>
      <RouterLink
        to="/products"
        class="inline-flex items-center gap-2 bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white px-6 py-3 rounded-xl font-semibold shadow-sm hover:opacity-90 transition-all font-body-md"
      >
        <span class="material-symbols-outlined">inventory_2</span> Đi đến quản lý sản phẩm
      </RouterLink>
    </div>
  </div>
</template>
