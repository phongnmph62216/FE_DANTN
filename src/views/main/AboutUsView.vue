<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-[#FFFBF7] text-gray-800 pb-20">
    <!-- About Us Hero Banner -->
    <div class="relative bg-[#0D2533] text-white py-20 px-4 md:px-10 overflow-hidden shadow-xl">
      <div class="absolute inset-0 bg-cover bg-center opacity-25" style="background-image: url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80')"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-[#0D2533] via-[#0D2533]/80 to-transparent"></div>

      <div class="max-w-4xl mx-auto relative z-10 text-center space-y-4">
        <span class="inline-block px-4 py-1 bg-[#EF972D] text-white text-xs font-extrabold uppercase tracking-widest rounded-full shadow-md">
          VỀ CHÚNG TÔI • BEE STYLISH
        </span>
        <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight uppercase leading-tight">
          ĐỒNG HÀNH CÙNG PHONG CÁCH <br/><span class="text-[#EF972D]">THỜI TRANG NAM MÙA HÈ</span>
        </h1>
        <p class="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Bee Stylish ra đời với sứ mệnh mang đến cho nam giới Việt Nam những giải pháp trang phục mùa hè tối giản, thoáng mát, hiện đại và tràn đầy tự tin.
        </p>
      </div>
    </div>

    <!-- Story Section -->
    <div class="max-w-5xl mx-auto px-4 md:px-6 pt-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div class="space-y-4">
          <span class="text-[#EF972D] font-bold text-xs uppercase tracking-widest">CÂU CHUYỆN THƯƠNG HIỆU</span>
          <h2 class="text-2xl md:text-3xl font-extrabold text-gray-900 uppercase leading-snug">
            SỰ TỐI GIẢN TẠO NÊN ĐẲNG CẤP VÀ THOẢI MÁI
          </h2>
          <p class="text-gray-600 text-sm leading-relaxed">
            Mùa hè tại Việt Nam luôn đòi hỏi những trang phục vừa lịch sự, vừa mang lại sự thoáng mát tối đa. Bee Stylish tập trung nghiên cứu chất liệu vải như <strong>Cotton Compact 100%</strong>, <strong>Thun Cá Sấu 4 chiều</strong> và <strong>Vải Đũi Lụa tự nhiên</strong> để mang đến cảm giác dễ chịu nhất suốt cả ngày dài.
          </p>
          <p class="text-gray-600 text-sm leading-relaxed">
            Mỗi thiết kế áo Polo, áo Phông, áo Sơ mi đũi nam đều được cắt may chuẩn form người Việt, giữ được sự chỉn chu khi đi làm, đi chơi hay du lịch biển.
          </p>
          <div class="pt-2">
            <RouterLink to="/all-products" class="inline-flex items-center gap-2 px-6 py-3 bg-[#EF972D] hover:bg-[#d87f1d] text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md">
              KHÁM PHÁ BỘ SƯU TẬP
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </RouterLink>
          </div>
        </div>

        <div class="relative">
          <div class="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <img 
              src="https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=800&q=80" 
              alt="Bee Stylish Men Fashion" 
              class="w-full h-80 md:h-96 object-cover"
            />
          </div>
          <div class="absolute -bottom-6 -left-6 bg-[#0D2533] text-white p-5 rounded-2xl shadow-xl border border-gray-700 hidden sm:block">
            <span class="text-3xl font-extrabold text-[#EF972D] block">100%</span>
            <span class="text-xs text-gray-300 font-medium">Chất liệu thoáng mát chuẩn hè</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Core Values Section -->
    <div class="max-w-5xl mx-auto px-4 md:px-6 pt-20">
      <div class="text-center space-y-2 mb-12">
        <span class="text-[#EF972D] font-bold text-xs uppercase tracking-widest">GIÁ TRỊ CỐT LÕI</span>
        <h2 class="text-2xl md:text-3xl font-extrabold text-gray-900 uppercase">TẠI SAO CHỌN BEE STYLISH?</h2>
        <div class="w-16 h-1 bg-[#EF972D] mx-auto rounded-full"></div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm hover:shadow-md transition-shadow text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center mx-auto text-2xl font-bold">
            <span class="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <h3 class="font-bold text-sm text-gray-900 uppercase">Chất Liệu Cao Cấp</h3>
          <p class="text-xs text-gray-500 leading-relaxed">Vải thấm hút mồ hôi, co giãn 4 chiều, không xù lông hay phai màu sau nhiều lần giặt.</p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm hover:shadow-md transition-shadow text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center mx-auto text-2xl font-bold">
            <span class="material-symbols-outlined text-2xl">accessibility_new</span>
          </div>
          <h3 class="font-bold text-sm text-gray-900 uppercase">Chuẩn Form Nam Việt</h3>
          <p class="text-xs text-gray-500 leading-relaxed">Form dáng tôn vai, gọn dáng, mang lại sự lịch lãm và thoải mái trong mọi vận động.</p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm hover:shadow-md transition-shadow text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center mx-auto text-2xl font-bold">
            <span class="material-symbols-outlined text-2xl">local_offer</span>
          </div>
          <h3 class="font-bold text-sm text-gray-900 uppercase">Giá Thành Hợp Lý</h3>
          <p class="text-xs text-gray-500 leading-relaxed">Giá gốc từ nhà xưởng đến tay khách hàng, đi kèm nhiều ưu đãi combo hấp dẫn.</p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm hover:shadow-md transition-shadow text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-[#EF972D]/15 text-[#EF972D] flex items-center justify-center mx-auto text-2xl font-bold">
            <span class="material-symbols-outlined text-2xl">published_with_changes</span>
          </div>
          <h3 class="font-bold text-sm text-gray-900 uppercase">Đổi Trả 30 Ngày</h3>
          <p class="text-xs text-gray-500 leading-relaxed">Đổi hàng tận nơi nhanh chóng nếu không vừa size hoặc không hài lòng chất lượng.</p>
        </div>
      </div>
    </div>

    <!-- Summer Fabrics Banner -->
    <div class="max-w-5xl mx-auto px-4 md:px-6 pt-16">
      <div class="bg-[#0D2533] text-white rounded-3xl p-8 shadow-xl border border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div class="space-y-1">
          <span class="text-3xl font-extrabold text-[#EF972D]">Cotton 100%</span>
          <p class="text-xs text-gray-300">Siêu thoáng khí, không tích nhiệt</p>
        </div>
        <div class="space-y-1 md:border-x border-gray-700">
          <span class="text-3xl font-extrabold text-[#EF972D]">Co Giãn 4D</span>
          <p class="text-xs text-gray-300">Vận động thể thao thoải mái</p>
        </div>
        <div class="space-y-1">
          <span class="text-3xl font-extrabold text-[#EF972D]">Anti-UV 50+</span>
          <p class="text-xs text-gray-300">Bảo vệ da dưới ánh nắng hè</p>
        </div>
      </div>
    </div>
  </div>
</template>
