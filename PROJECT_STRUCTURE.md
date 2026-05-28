# Hướng dẫn Cấu trúc Dự án

Tài liệu này giải thích cấu trúc cấp doanh nghiệp được thêm vào ứng dụng Vue 3 + Vite để tích hợp backend Spring Boot.

## Các thư mục và tệp được tạo

- src/layouts/

- AuthLayout.vue: Bố cục bao bọc cho các view liên quan đến xác thực.

- DashboardLayout.vue: Bố cục bao bọc cho các view chính của ứng dụng, với các vị trí dành cho Sidebar và Header trong tương lai.

- src/services/

- api.js: Phiên bản Axios trung tâm và các vị trí dành cho bộ chặn xử lý lỗi JWT và lỗi toàn cục.

- src/utils/

- Các hàm tiện ích, định dạng và trợ giúp được chia sẻ không thuộc về các component.

- src/views/auth/

- Các trang liên quan đến xác thực (đăng nhập, đặt lại mật khẩu, v.v.) sẽ nằm ở đây.

- src/views/main/

- Các view nghiệp vụ chính và các trang tính năng sẽ nằm ở đây.

- src/components/

- BaseButton.vue: Component giao diện người dùng cơ bản có thể tái sử dụng với kiểu dáng thương hiệu màu cam.

## Nơi thêm mã của bạn

- Các thành phần giao diện người dùng mới: src/components/
- Khung bố cục: src/layouts/
- Các máy khách API và các hàm hỗ trợ yêu cầu: src/services/
- Các hàm hỗ trợ và hằng số xuyên suốt: src/utils/
- Luồng xác thực và màn hình giới thiệu: src/views/auth/
- Các trang và mô-đun ứng dụng chính: src/views/main/

## Định tuyến và bố cục

- Các tuyến đường nên khai báo bố cục mong muốn thông qua meta tuyến đường (ví dụ: layout: 'AuthLayout').

- App.vue chọn bố cục một cách động và hiển thị tuyến đường hiện tại bên trong đó.

## Ghi chú tích hợp phía máy chủ

- Cập nhật VITE_API_BASE_URL trong các tệp môi trường của bạn để trỏ đến máy chủ Spring Boot.

- Thêm xử lý JWT bên trong các bộ chặn Axios khi bạn triển khai xác thực.