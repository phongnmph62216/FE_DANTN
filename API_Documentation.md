# API Documentation for Product Attributes

This document outlines the RESTful API endpoints for managing various product attributes. These APIs follow a standard CRUD (Create, Read, Update, Delete) pattern, and also support pagination, searching, and filtering for collection endpoints.

## General API Structure

*   **Base URL:** `/api/{entity-name}`
*   **Common Fields for Request Body (for POST/PUT):**
    *   `ten{EntityName}` (String): Name (e.g., `tenChatLieu`) - **Required**
    *   `trangThai` (Integer): Status (e.g., 0 for inactive, 1 for active) - **Required**
    *   `ma{EntityName}` (String, optional): Code/Identifier (e.g., `maChatLieu`). If not provided, the backend will auto-generate it (e.g., "TTXX" + random string or sequence).
*   **Common Fields for Response Body (DTOs):**
    *   `id` (Long): Unique identifier
    *   `ma{EntityName}` (String)
    *   `ten{EntityName}` (String)
    *   `trangThai` (Integer)
    *   `ngayTao` (LocalDateTime): Creation timestamp
    *   `ngaySua` (LocalDateTime): Last update timestamp
    *   `nguoiTao` (String): Creator (optional)
    *   `nguoiSua` (String): Last updater (optional)

### Pagination, Search, and Filter for GET All Endpoints

For `GET /api/{entity-name}` endpoints, the following query parameters can be used for pagination, searching, and filtering:

*   **`page`** (Integer, optional): The page number to retrieve (0-indexed). Default is `0`.
*   **`size`** (Integer, optional): The number of items per page. Default is `10`.
*   **`sort`** (String, optional): Sorting criteria in the format `property,(asc|desc)`. Default is `id,asc`.
*   **`keyword`** (String, optional): A keyword to search by `ma{EntityName}` or `ten{EntityName}`. Case-insensitive.
*   **`trangThai`** (Integer, optional): Filter by status (0 for inactive, 1 for active).

**Example:** `/api/chat-lieu?page=0&size=5&sort=tenChatLieu,asc&keyword=cot&trangThai=1`

**Response Structure for Paginated Data:**

When using pagination, the response will be a `Page` object (Spring Data Page), containing a list of DTOs:

```json
{
  "content": [
    // List of {EntityName}DTO objects for the current page
  ],
  "pageable": {
    "sort": {
      "empty": false,
      "sorted": true,
      "unsorted": false
    },
    "offset": 0,
    "pageNumber": 0,
    "pageSize": 10,
    "paged": true,
    "unpaged": false
  },
  "last": false,
  "totalPages": 5,
  "totalElements": 45,
  "size": 10,
  "number": 0,
  "sort": {
    "empty": false,
    "sorted": true,
    "unsorted": false
  },
  "first": true,
  "numberOfElements": 10,
  "empty": false
}
```

---

## 1. Xuất Xứ (Origin)

*   **Entity Name:** `XuatSu`
*   **Base URL:** `/api/xuat-su`

### Endpoints:

*   **GET /api/xuat-su**
    *   **Description:** Get all origins with optional pagination, search by `keyword` (in `maXuatSu` or `tenXuatSu`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=Viet Nam`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<XuatSuDTO>`
*   **GET /api/xuat-su/{id}**
    *   **Description:** Get an origin by ID.
    *   **Response:** `XuatSuDTO`
*   **POST /api/xuat-su**
    *   **Description:** Create a new origin. `maXuatSu` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenXuatSu": "Việt Nam", "trangThai": 1 }` or `{ "maXuatSu": "XS001", "tenXuatSu": "Việt Nam", "trangThai": 1 }`
    *   **Response:** `XuatSuDTO` (created object)
*   **PUT /api/xuat-su/{id}**
    *   **Description:** Update an existing origin.
    *   **Request Body:** `{ "maXuatSu": "XS001", "tenXuatSu": "Việt Nam (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `XuatSuDTO` (updated object)
*   **PATCH /api/xuat-su/{id}/status**
    *   **Description:** Toggle the `trangThai` of an origin (1 -> 0, 0 -> 1).
    *   **Response:** `XuatSuDTO` (updated object)

---

## 2. Chất Liệu (Material)

*   **Entity Name:** `ChatLieu`
*   **Base URL:** `/api/chat-lieu`

### Endpoints:

*   **GET /api/chat-lieu**
    *   **Description:** Get all materials with optional pagination, search by `keyword` (in `maChatLieu` or `tenChatLieu`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=cotton`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<ChatLieuDTO>`
*   **GET /api/chat-lieu/{id}**
    *   **Description:** Get a material by ID.
    *   **Response:** `ChatLieuDTO`
*   **POST /api/chat-lieu**
    *   **Description:** Create a new material. `maChatLieu` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenChatLieu": "Cotton", "trangThai": 1 }` or `{ "maChatLieu": "CL001", "tenChatLieu": "Cotton", "trangThai": 1 }`
    *   **Response:** `ChatLieuDTO` (created object)
*   **PUT /api/chat-lieu/{id}**
    *   **Description:** Update an existing material.
    *   **Request Body:** `{ "maChatLieu": "CL001", "tenChatLieu": "Cotton (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `ChatLieuDTO` (updated object)
*   **PATCH /api/chat-lieu/{id}/status**
    *   **Description:** Toggle the `trangThai` of a material (1 -> 0, 0 -> 1).
    *   **Response:** `ChatLieuDTO` (updated object)

---

## 3. Loại Sản Phẩm (Product Type)

*   **Entity Name:** `LoaiSanPham`
*   **Base URL:** `/api/loai-san-pham`

### Endpoints:

*   **GET /api/loai-san-pham**
    *   **Description:** Get all product types with optional pagination, search by `keyword` (in `maLoaiSanPham` or `tenLoaiSanPham`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=ao thun`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<LoaiSanPhamDTO>`
*   **GET /api/loai-san-pham/{id}**
    *   **Description:** Get a product type by ID.
    *   **Response:** `LoaiSanPhamDTO`
*   **POST /api/loai-san-pham**
    *   **Description:** Create a new product type. `maLoaiSanPham` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenLoaiSanPham": "Áo thun", "trangThai": 1 }` or `{ "maLoaiSanPham": "LSP001", "tenLoaiSanPham": "Áo thun", "trangThai": 1 }`
    *   **Response:** `LoaiSanPhamDTO` (created object)
*   **PUT /api/loai-san-pham/{id}**
    *   **Description:** Update an existing product type.
    *   **Request Body:** `{ "maLoaiSanPham": "LSP001", "tenLoaiSanPham": "Áo thun (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `LoaiSanPhamDTO` (updated object)
*   **PATCH /api/loai-san-pham/{id}/status**
    *   **Description:** Toggle the `trangThai` of a product type (1 -> 0, 0 -> 1).
    *   **Response:** `LoaiSanPhamDTO` (updated object)

---

## 4. Thương Hiệu (Brand)

*   **Entity Name:** `ThuongHieu`
*   **Base URL:** `/api/thuong-hieu`

### Endpoints:

*   **GET /api/thuong-hieu**
    *   **Description:** Get all brands with optional pagination, search by `keyword` (in `maThuongHieu` or `tenThuongHieu`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=nike`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<ThuongHieuDTO>`
*   **GET /api/thuong-hieu/{id}**
    *   **Description:** Get a brand by ID.
    *   **Response:** `ThuongHieuDTO`
*   **POST /api/thuong-hieu**
    *   **Description:** Create a new brand. `maThuongHieu` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenThuongHieu": "Nike", "trangThai": 1 }` or `{ "maThuongHieu": "TH001", "tenThuongHieu": "Nike", "trangThai": 1 }`
    *   **Response:** `ThuongHieuDTO` (created object)
*   **PUT /api/thuong-hieu/{id}**
    *   **Description:** Update an existing brand.
    *   **Request Body:** `{ "maThuongHieu": "TH001", "tenThuongHieu": "Nike (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `ThuongHieuDTO` (updated object)
*   **PATCH /api/thuong-hieu/{id}/status**
    *   **Description:** Toggle the `trangThai` of a brand (1 -> 0, 0 -> 1).
    *   **Response:** `ThuongHieuDTO` (updated object)

---

## 5. Tay Áo (Sleeve Type)

*   **Entity Name:** `TayAo`
*   **Base URL:** `/api/tay-ao`

### Endpoints:

*   **GET /api/tay-ao**
    *   **Description:** Get all sleeve types with optional pagination, search by `keyword` (in `maTayAo` or `tenTayAo`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=ngan`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<TayAoDTO>`
*   **GET /api/tay-ao/{id}**
    *   **Description:** Get a sleeve type by ID.
    *   **Response:** `TayAoDTO`
*   **POST /api/tay-ao**
    *   **Description:** Create a new sleeve type. `maTayAo` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenTayAo": "Tay ngắn", "trangThai": 1 }` or `{ "maTayAo": "TA001", "tenTayAo": "Tay ngắn", "trangThai": 1 }`
    *   **Response:** `TayAoDTO` (created object)
*   **PUT /api/tay-ao/{id}**
    *   **Description:** Update an existing sleeve type.
    *   **Request Body:** `{ "maTayAo": "TA001", "tenTayAo": "Tay ngắn (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `TayAoDTO` (updated object)
*   **PATCH /api/tay-ao/{id}/status**
    *   **Description:** Toggle the `trangThai` of a sleeve type (1 -> 0, 0 -> 1).
    *   **Response:** `TayAoDTO` (updated object)

---

## 6. Vai Áo (Shoulder Type / Fabric Type)

*   **Entity Name:** `VaiAo`
*   **Base URL:** `/api/vai-ao`

### Endpoints:

*   **GET /api/vai-ao**
    *   **Description:** Get all "vai ao" types with optional pagination, search by `keyword` (in `maVaiAo` or `tenVaiAo`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=xuoi`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<VaiAoDTO>`
*   **GET /api/vai-ao/{id}**
    *   **Description:** Get a "vai ao" type by ID.
    *   **Response:** `VaiAoDTO`
*   **POST /api/vai-ao**
    *   **Description:** Create a new "vai ao" type. `maVaiAo` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenVaiAo": "Vai xuôi", "trangThai": 1 }` or `{ "maVaiAo": "VA001", "tenVaiAo": "Vai xuôi", "trangThai": 1 }`
    *   **Response:** `VaiAoDTO` (created object)
*   **PUT /api/vai-ao/{id}**
    *   **Description:** Update an existing "vai ao" type.
    *   **Request Body:** `{ "maVaiAo": "VA001", "tenVaiAo": "Vai xuôi (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `VaiAoDTO` (updated object)
*   **PATCH /api/vai-ao/{id}/status**
    *   **Description:** Toggle the `trangThai` of a "vai ao" type (1 -> 0, 0 -> 1).
    *   **Response:** `VaiAoDTO` (updated object)

---

## 7. Kiểu Dáng (Style)

*   **Entity Name:** `KieuDang`
*   **Base URL:** `/api/kieu-dang`

### Endpoints:

*   **GET /api/kieu-dang**
    *   **Description:** Get all styles with optional pagination, search by `keyword` (in `maKieuDang` or `tenKieuDang`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=slim`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<KieuDangDTO>`
*   **GET /api/kieu-dang/{id}**
    *   **Description:** Get a style by ID.
    *   **Response:** `KieuDangDTO`
*   **POST /api/kieu-dang**
    *   **Description:** Create a new style. `maKieuDang` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenKieuDang": "Slim fit", "trangThai": 1 }` or `{ "maKieuDang": "KD001", "tenKieuDang": "Slim fit", "trangThai": 1 }`
    *   **Response:** `KieuDangDTO` (created object)
*   **PUT /api/kieu-dang/{id}**
    *   **Description:** Update an existing style.
    *   **Request Body:** `{ "maKieuDang": "KD001", "tenKieuDang": "Slim fit (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `KieuDangDTO` (updated object)
*   **PATCH /api/kieu-dang/{id}/status**
    *   **Description:** Toggle the `trangThai` of a style (1 -> 0, 0 -> 1).
    *   **Response:** `KieuDangDTO` (updated object)

---

## 8. Cổ Áo (Collar Type)

*   **Entity Name:** `CoAo`
*   **Base URL:** `/api/co-ao`

### Endpoints:

*   **GET /api/co-ao**
    *   **Description:** Get all collar types with optional pagination, search by `keyword` (in `maCoAo` or `tenCoAo`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=tron`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<CoAoDTO>`
*   **GET /api/co-ao/{id}**
    *   **Description:** Get a collar type by ID.
    *   **Response:** `CoAoDTO`
*   **POST /api/co-ao**
    *   **Description:** Create a new collar type. `maCoAo` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenCoAo": "Cổ tròn", "trangThai": 1 }` or `{ "maCoAo": "CA001", "tenCoAo": "Cổ tròn", "trangThai": 1 }`
    *   **Response:** `CoAoDTO` (created object)
*   **PUT /api/co-ao/{id}**
    *   **Description:** Update an existing collar type.
    *   **Request Body:** `{ "maCoAo": "CA001", "tenCoAo": "Cổ tròn (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `CoAoDTO` (updated object)
*   **PATCH /api/co-ao/{id}/status**
    *   **Description:** Toggle the `trangThai` of a collar type (1 -> 0, 0 -> 1).
    *   **Response:** `CoAoDTO` (updated object)

---

## 9. Màu Sắc (Color)

*   **Entity Name:** `MauSac`
*   **Base URL:** `/api/mau-sac`

### Endpoints:

*   **GET /api/mau-sac**
    *   **Description:** Get all colors with optional pagination, search by `keyword` (in `maMauSac` or `tenMauSac`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=do`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<MauSacDTO>`
*   **GET /api/mau-sac/{id}**
    *   **Description:** Get a color by ID.
    *   **Response:** `MauSacDTO`
*   **POST /api/mau-sac**
    *   **Description:** Create a new color. `maMauSac` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenMauSac": "Đỏ", "trangThai": 1 }` or `{ "maMauSac": "MS001", "tenMauSac": "Đỏ", "trangThai": 1 }`
    *   **Response:** `MauSacDTO` (created object)
*   **PUT /api/mau-sac/{id}**
    *   **Description:** Update an existing color.
    *   **Request Body:** `{ "maMauSac": "MS001", "tenMauSac": "Đỏ (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `MauSacDTO` (updated object)
*   **PATCH /api/mau-sac/{id}/status**
    *   **Description:** Toggle the `trangThai` of a color (1 -> 0, 0 -> 1).
    *   **Response:** `MauSacDTO` (updated object)

---

## 10. Kích Thước (Size)

*   **Entity Name:** `KichThuoc`
*   **Base URL:** `/api/kich-thuoc`

### Endpoints:

*   **GET /api/kich-thuoc**
    *   **Description:** Get all sizes with optional pagination, search by `keyword` (in `maKichThuoc` or `tenKichThuoc`), and filter by `trangThai`.
    *   **Query Parameters:** `page`, `size`, `sort`, `keyword` (e.g., `keyword=s`), `trangThai` (e.g., `trangThai=1`)
    *   **Response:** `Page<KichThuocDTO>`
*   **GET /api/kich-thuoc/{id}**
    *   **Description:** Get a size by ID.
    *   **Response:** `KichThuocDTO`
*   **POST /api/kich-thuoc**
    *   **Description:** Create a new size. `maKichThuoc` can be auto-generated if not provided.
    *   **Request Body:** `{ "tenKichThuoc": "S", "trangThai": 1 }` or `{ "maKichThuoc": "KT001", "tenKichThuoc": "S", "trangThai": 1 }`
    *   **Response:** `KichThuocDTO` (created object)
*   **PUT /api/kich-thuoc/{id}**
    *   **Description:** Update an existing size.
    *   **Request Body:** `{ "maKichThuoc": "KT001", "tenKichThuoc": "S (Cập nhật)", "trangThai": 1 }`
    *   **Response:** `KichThuocDTO` (updated object)
*   **PATCH /api/kich-thuoc/{id}/status**
    *   **Description:** Toggle the `trangThai` of a size (1 -> 0, 0 -> 1).
    *   **Response:** `KichThuocDTO` (updated object)
