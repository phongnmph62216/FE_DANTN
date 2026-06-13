<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api from '../../services/api'

const route = useRoute()
const router = useRouter()

const invoiceId = computed(() => route.params.id)

const invoice = ref(null)
const invoiceDetails = ref([])
const histories = ref([])

const isLoading = ref(false)
const isUpdating = ref(false)
const isUsingMock = ref(false)

const toast = ref({ show: false, message: '', type: 'success' })
const confirmModal = ref({ show: false, title: '', message: '', onConfirm: null })

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

const triggerConfirm = (message, onConfirm, title = 'Xác nhận hành động') => {
  confirmModal.value = {
    show: true,
    title,
    message,
    onConfirm
  }
}

const handleConfirm = async () => {
  const cb = confirmModal.value.onConfirm
  confirmModal.value.show = false
  if (cb) await cb()
}

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(amount)
    .replace(/\s?₫/, ' đ')
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  try {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')

    return `${day}/${month}/${year} ${hour}:${minute}`
  } catch (e) {
    return dateString
  }
}

const formatImage = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150'
  if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return `${apiBase.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const getStatusBadge = (status) => {
  const s = Number(status)

  if (s === 0) {
    return {
      text: 'Tạo mới',
      class: 'bg-blue-50 text-blue-700 border border-blue-100',
      icon: 'fiber_new'
    }
  }

  if (s === 1) {
    return {
      text: 'Chờ xác nhận',
      class: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
      icon: 'schedule'
    }
  }

  if (s === 2) {
    return {
      text: 'Đã xác nhận',
      class: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      icon: 'task_alt'
    }
  }

  if (s === 3) {
    return {
      text: 'Đang giao',
      class: 'bg-orange-50 text-orange-700 border border-orange-100',
      icon: 'local_shipping'
    }
  }

  if (s === 4) {
    return {
      text: 'Hoàn thành',
      class: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      icon: 'check_circle'
    }
  }

  if (s === 5) {
    return {
      text: 'Đã hủy',
      class: 'bg-red-50 text-red-700 border border-red-100',
      icon: 'cancel'
    }
  }

  return {
    text: 'Không xác định',
    class: 'bg-gray-100 text-gray-500 border border-gray-200',
    icon: 'help'
  }
}

const getTypeBadge = (type) => {
  const t = Number(type)

  if (t === 1) {
    return {
      text: 'Tại quầy',
      class: 'bg-orange-50 text-[#EF972D] border border-orange-100',
      icon: 'storefront'
    }
  }

  if (t === 2) {
    return {
      text: 'Giao hàng',
      class: 'bg-purple-50 text-purple-700 border border-purple-100',
      icon: 'local_shipping'
    }
  }

  return {
    text: 'Online',
    class: 'bg-sky-50 text-sky-700 border border-sky-100',
    icon: 'language'
  }
}

const normalizeInvoice = (item) => {
  if (!item) return null

  return {
    id: item.id,
    maHoaDon: item.maHoaDon || item.ma_hoa_don || item.code || `HD${String(item.id || 0).padStart(6, '0')}`,
    loaiHoaDon: item.loaiHoaDon ?? item.loai_hoa_don ?? item.type ?? 0,
    tenKhachHang: item.tenKhachHang || item.ten_khach_hang || item.customerName || 'Khách lẻ',
    soDienThoai: item.soDienThoai || item.so_dien_thoai || item.phone || '-',
    emailKhachHang: item.emailKhachHang || item.email_khach_hang || item.email || '-',
    diaChi: item.diaChi || item.dia_chi || item.address || '-',
    tenNhanVien: item.tenNhanVien || item.ten_nhan_vien || item.employeeName || '-',
    maNhanVien: item.maNhanVien || item.ma_nhan_vien || '-',
    maPhieuGiamGia: item.maPhieuGiamGia || item.ma_phieu_giam_gia || '-',
    tenPhieuGiamGia: item.tenPhieuGiamGia || item.ten_phieu_giam_gia || '-',
    soTienGoc: item.soTienGoc ?? item.so_tien_goc ?? item.subTotal ?? 0,
    soTienGiam: item.soTienGiam ?? item.so_tien_giam ?? item.discountAmount ?? 0,
    phiVanChuyen: item.phiVanChuyen ?? item.phi_van_chuyen ?? item.shippingFee ?? 0,
    tongTienThanhToan: item.tongTienThanhToan ?? item.tong_tien_thanh_toan ?? item.total ?? 0,
    ngayTao: item.ngayTao || item.ngay_tao || item.createdAt,
    ngayThanhToan: item.ngayThanhToan || item.ngay_thanh_toan || item.paidAt,
    ngayNhanHang: item.ngayNhanHang || item.ngay_nhan_hang || null,
    trangThai: item.trangThai ?? item.trang_thai ?? item.status ?? 0,
    ghiChu: item.ghiChu || item.ghi_chu || ''
  }
}

const normalizeDetail = (item, index = 0) => {
  const soLuong = Number(item.soLuong ?? item.so_luong ?? item.quantity ?? 1)
  const donGia = Number(item.donGia ?? item.don_gia ?? item.price ?? item.giaBan ?? 0)
  const thanhTien = Number(item.thanhTien ?? item.thanh_tien ?? item.total ?? donGia * soLuong)

  return {
    id: item.id || index + 1,
    idChiTietSanPham: item.idChiTietSanPham || item.id_chi_tiet_san_pham || item.variantId,
    maChiTietSanPham: item.maChiTietSanPham || item.ma_chi_tiet_san_pham || item.sku || '-',
    maSanPham: item.maSanPham || item.ma_san_pham || '-',
    tenSanPham: item.tenSanPham || item.ten_san_pham || item.productName || 'Sản phẩm',
    tenMauSac: item.tenMauSac || item.ten_mau_sac || item.color || '-',
    tenKichThuoc: item.tenKichThuoc || item.ten_kich_thuoc || item.size || '-',
    hinhAnh: item.hinhAnh || item.hinh_anh || item.image || '',
    donGia,
    soLuong,
    thanhTien,
    trangThai: item.trangThai ?? item.trang_thai ?? 1
  }
}

const normalizeHistory = (item, index = 0) => {
  return {
    id: item.id || index + 1,
    trangThai: item.trangThai ?? item.trang_thai ?? item.status ?? 0,
    thoiGian: item.thoiGian || item.thoi_gian || item.ngayTao || item.ngay_tao || item.createdAt,
    ghiChu: item.ghiChu || item.ghi_chu || item.note || '',
    hanhDong: item.hanhDong || item.hanh_dong || item.action || getStatusBadge(item.trangThai ?? item.status ?? 0).text,
    nguoiThucHien: item.nguoiThucHien || item.nguoi_thuc_hien || item.nguoiTao || item.nguoi_tao || 'Hệ thống'
  }
}
const getHistoryStep = (status) => {
  const s = Number(status)

  if (s === 0) return 1 // Tạo mới
  if (s === 1) return 2 // Chờ xác nhận
  if (s === 2) return 3 // Đã xác nhận
  if (s === 3) return 4 // Đang giao
  if (s === 4) return 5 // Hoàn thành
  if (s === 5) return 6 // Đã hủy

  return 99
}

const sortHistoriesByStep = (list) => {
  return [...list].sort((a, b) => {
    const stepA = getHistoryStep(a.trangThai)
    const stepB = getHistoryStep(b.trangThai)

    if (stepA !== stepB) return stepA - stepB

    return new Date(a.thoiGian || 0) - new Date(b.thoiGian || 0)
  })
}
const defaultMockInvoice = {
  id: 1,
  maHoaDon: 'HD000001',
  loaiHoaDon: 1,
  tenKhachHang: 'Nguyễn Văn An',
  soDienThoai: '0912345678',
  email: 'nguyenvanan@example.com',
  diaChi: '351/6A Phan Đình Phùng, phường 3, TP Bảo Lộc',
  tenNhanVien: 'Trần Tuấn Linh',
  maNhanVien: 'NV001',
  maPhieuGiamGia: 'PGG001',
  tenPhieuGiamGia: 'Giảm 80K đơn hàng mới',
  soTienGoc: 980000,
  soTienGiam: 80000,
  phiVanChuyen: 30000,
  tongTienThanhToan: 930000,
  ngayTao: '2026-06-10T09:15:00',
  ngayThanhToan: '2026-06-10T09:25:00',
  ngayNhanHang: null,
  trangThai: 4,
  ghiChu: 'Khách nhận tại cửa hàng'
}

const defaultMockDetails = [
  {
    id: 1,
    maChiTietSanPham: 'CTSP001',
    maSanPham: 'SP001',
    tenSanPham: 'Áo sơ mi linen cao cấp',
    tenMauSac: 'Trắng sữa',
    tenKichThuoc: 'M',
    hinhAnh: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150',
    donGia: 450000,
    soLuong: 1,
    thanhTien: 450000,
    trangThai: 1
  },
  {
    id: 2,
    maChiTietSanPham: 'CTSP002',
    maSanPham: 'SP002',
    tenSanPham: 'Áo polo cổ bẻ',
    tenMauSac: 'Đen huyền',
    tenKichThuoc: 'L',
    hinhAnh: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=150',
    donGia: 265000,
    soLuong: 2,
    thanhTien: 530000,
    trangThai: 1
  }
]

const defaultMockHistories = [
  {
    id: 1,
    trangThai: 0,
    hanhDong: 'Tạo hóa đơn',
    thoiGian: '2026-06-10T09:15:00',
    nguoiThucHien: 'Trần Tuấn Linh',
    ghiChu: 'Hóa đơn được tạo tại quầy'
  },
  {
    id: 2,
    trangThai: 2,
    hanhDong: 'Đã xác nhận',
    thoiGian: '2026-06-10T09:20:00',
    nguoiThucHien: 'Trần Tuấn Linh',
    ghiChu: 'Xác nhận đủ sản phẩm trong kho'
  },
  {
    id: 3,
    trangThai: 4,
    hanhDong: 'Hoàn thành',
    thoiGian: '2026-06-10T09:25:00',
    nguoiThucHien: 'Trần Tuấn Linh',
    ghiChu: 'Khách đã thanh toán và nhận hàng'
  }
]

const subtotalFromDetails = computed(() => {
  return invoiceDetails.value.reduce((sum, item) => sum + Number(item.thanhTien || 0), 0)
})

const nextStatus = (item) => {
  if (!item) return null

  const s = Number(item.trangThai)

  if (s === 0) return 1
  if (s === 1) return 2
  if (s === 2) return 3
  if (s === 3) return 4

  return null
}

const canCancelInvoice = computed(() => {
  if (!invoice.value) return false
  return ![4, 5].includes(Number(invoice.value.trangThai))
})

const fetchInvoice = async () => {
  try {
    const res = await api.get(`/api/v1/hoa-don/${invoiceId.value}`)
    invoice.value = normalizeInvoice(res.data)
  } catch (err) {
    console.warn('Không gọi được API chi tiết hóa đơn, dùng mock fallback:', err.message)
    invoice.value = normalizeInvoice({
      ...defaultMockInvoice,
      id: Number(invoiceId.value || 1)
    })
    isUsingMock.value = true
  }
}

const fetchInvoiceDetails = async () => {
  try {
    const res = await api.get('/api/v1/hoa-don-chi-tiet', {
      params: {
        hoaDonId: invoiceId.value
      }
    })

    const data = res.data
    const content = Array.isArray(data) ? data : (data?.content || [])
    invoiceDetails.value = content.map(normalizeDetail)
  } catch (err) {
    console.warn('Không gọi được API hóa đơn chi tiết, dùng mock fallback:', err.message)
    invoiceDetails.value = defaultMockDetails.map(normalizeDetail)
    isUsingMock.value = true
  }
}

const fetchHistories = async () => {
  try {
    const res = await api.get('/api/v1/lich-su-hoa-don', {
      params: {
        hoaDonId: invoiceId.value
      }
    })

    const data = res.data
    const content = Array.isArray(data) ? data : (data?.content || [])
    histories.value = sortHistoriesByStep(content.map(normalizeHistory)).slice(0, 5)
  } catch (err) {
    histories.value = sortHistoriesByStep(defaultMockHistories.map(normalizeHistory))
    isUsingMock.value = true
  }
}

const loadData = async () => {
  isLoading.value = true

  try {
    await Promise.all([
      fetchInvoice(),
      fetchInvoiceDetails(),
      fetchHistories()
    ])
  } finally {
    isLoading.value = false
  }
}

const updateInvoiceStatus = async (status) => {
  if (!invoice.value) return

  isUpdating.value = true

  try {
    if (!isUsingMock.value) {
      await api.patch(`/api/v1/hoa-don/${invoice.value.id}/trang-thai`, {
        trangThai: status,
        hanhDong: getStatusBadge(status).text,
        ghiChu: `Cập nhật trạng thái sang ${getStatusBadge(status).text}`
      })

      await fetchInvoice()
      await fetchHistories()
    } else {
      invoice.value.trangThai = status

     if (Number(status) === 4) {
  const now = new Date().toISOString()
  invoice.value.ngayThanhToan = now
  invoice.value.ngayNhanHang = now
}

      histories.value.unshift({
        id: Date.now(),
        trangThai: status,
        hanhDong: getStatusBadge(status).text,
        thoiGian: new Date().toISOString(),
        nguoiThucHien: invoice.value.tenNhanVien || 'Hệ thống',
        ghiChu: `Cập nhật trạng thái sang ${getStatusBadge(status).text}`
      })
    }

    showToast('Cập nhật trạng thái hóa đơn thành công!')
  } catch (err) {
    console.error('Update invoice status failed:', err)
    showToast('Không thể cập nhật trạng thái hóa đơn!', 'error')
  } finally {
    isUpdating.value = false
  }
}

const handleMoveNext = () => {
  const status = nextStatus(invoice.value)
  if (status === null) return

  triggerConfirm(
    `Bạn có chắc muốn chuyển hóa đơn ${invoice.value.maHoaDon} sang trạng thái "${getStatusBadge(status).text}" không?`,
    () => updateInvoiceStatus(status),
    'Cập nhật trạng thái hóa đơn'
  )
}

const handleCancelInvoice = () => {
  if (!invoice.value) return

  triggerConfirm(
    `Bạn có chắc muốn hủy hóa đơn ${invoice.value.maHoaDon} không?`,
    () => updateInvoiceStatus(5),
    'Hủy hóa đơn'
  )
}

const escapeHtml = (value) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const printInvoice = () => {
  if (!invoice.value) {
    showToast('Không có dữ liệu hóa đơn để in!', 'error')
    return
  }

  const currentInvoice = invoice.value
  const products = invoiceDetails.value || []

  const productRows = products.map((item, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>
        <div class="product-name">${escapeHtml(item.tenSanPham)}</div>
      </td>
      <td class="center">${escapeHtml(item.tenMauSac)}</td>
      <td class="center">${escapeHtml(item.tenKichThuoc)}</td>
      <td class="right">${formatCurrency(item.donGia)}</td>
      <td class="center">${item.soLuong}</td>
      <td class="right bold">${formatCurrency(item.thanhTien)}</td>
    </tr>
  `).join('')

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hóa đơn ${escapeHtml(currentInvoice.maHoaDon)}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 12px;
      background: #ffffff;
      color: #000000;
      font-family: Arial, "Times New Roman", sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }

    .invoice {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      color: #000000;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }

    .shop-name {
      font-size: 22px;
      font-weight: 800;
      text-transform: uppercase;
      margin: 0 0 4px;
    }

    .shop-info {
      font-size: 10.5px;
      margin: 1px 0;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .invoice-code {
      margin-top: 4px;
      font-size: 13px;
      font-weight: 700;
    }

    .top-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }

    .box {
      border: 1px solid #000000;
      padding: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .box-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 6px;
      border-bottom: 1px solid #000000;
      padding-bottom: 4px;
    }

    .row {
      display: grid;
      grid-template-columns: 90px 1fr;
      gap: 8px;
      padding: 2px 0;
    }

    .label {
      font-weight: 700;
    }

    .value {
      text-align: right;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }

    th,
    td {
      border: 1px solid #000000;
      padding: 5px;
      vertical-align: top;
    }

    th {
      font-size: 10px;
      text-transform: uppercase;
      text-align: center;
      font-weight: 800;
      background: #ffffff;
    }

    td {
      font-size: 10.5px;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .bold {
      font-weight: 800;
    }

    .product-name {
      font-weight: 800;
    }

 

    .bottom {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }

    .summary-row.total {
      border-top: 1px solid #000000;
      margin-top: 4px;
      padding-top: 6px;
      font-size: 14px;
      font-weight: 800;
    }

    .note-line {
      margin-bottom: 5px;
    }

    .footer-note {
      margin-top: 10px;
      text-align: center;
      font-size: 10.5px;
      font-style: italic;
    }

    .print-actions {
      max-width: 760px;
      margin: 12px auto 0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .btn {
      padding: 8px 14px;
      border: 1px solid #000000;
      background: #ffffff;
      color: #000000;
      font-weight: 700;
      cursor: pointer;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm;
      }

      body {
        padding: 0;
      }

      .invoice {
        max-width: none;
        width: 100%;
      }

      .print-actions {
        display: none;
      }

      th,
      td {
        padding: 4px;
      }

      .box {
        padding: 7px;
      }
    }
  </style>
</head>

<body>
  <div class="invoice">
    <div class="header">
      <div>
        <h2 class="shop-name">Bee Stylish</h2>
        <p class="shop-info">Địa chỉ: 351/6A Phan Đình Phùng, phường 3, TP Bảo Lộc</p>
        <p class="shop-info">Hotline: 0987 654 321</p>
        <p class="shop-info">Email: beestylish@gmail.com</p>
      </div>

      <div class="invoice-title">
        <h1>Hóa đơn bán hàng</h1>
        <div class="invoice-code">Mã hóa đơn: ${escapeHtml(currentInvoice.maHoaDon)}</div>
      </div>
    </div>

    <div class="top-info">
      <div class="box">
        <div class="box-title">Thông tin khách hàng</div>

        <div class="row">
          <div class="label">Khách hàng</div>
          <div class="value">${escapeHtml(currentInvoice.tenKhachHang || '-')}</div>
        </div>

        <div class="row">
          <div class="label">SĐT</div>
          <div class="value">${escapeHtml(currentInvoice.soDienThoai || '-')}</div>
        </div>

        <div class="row">
          <div class="label">Email</div>
          <div class="value">${escapeHtml(currentInvoice.emailKhachHang || '-')}</div>
        </div>

        <div class="row">
          <div class="label">Địa chỉ</div>
          <div class="value">${escapeHtml(currentInvoice.diaChi || '-')}</div>
        </div>
      </div>

      <div class="box">
        <div class="box-title">Thông tin hóa đơn</div>

        <div class="row">
          <div class="label">Ngày tạo</div>
          <div class="value">${formatDateTime(currentInvoice.ngayTao)}</div>
        </div>

        <div class="row">
          <div class="label">Thanh toán</div>
          <div class="value">${formatDateTime(currentInvoice.ngayThanhToan)}</div>
        </div>

        <div class="row">
          <div class="label">Nhận hàng</div>
          <div class="value">${formatDateTime(currentInvoice.ngayNhanHang)}</div>
        </div>

        <div class="row">
          <div class="label">Nhân viên</div>
          <div class="value">
            ${escapeHtml(currentInvoice.tenNhanVien || '-')}
            ${currentInvoice.maNhanVien ? `(${escapeHtml(currentInvoice.maNhanVien)})` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="box">
      <div class="box-title">Danh sách sản phẩm</div>

      <table>
        <thead>
          <tr>
            <th style="width: 35px;">STT</th>
            <th>Sản phẩm</th>
            <th style="width: 70px;">Màu</th>
            <th style="width: 55px;">Size</th>
            <th style="width: 95px;">Đơn giá</th>
            <th style="width: 45px;">SL</th>
            <th style="width: 105px;">Thành tiền</th>
          </tr>
        </thead>

        <tbody>
          ${productRows || `
            <tr>
              <td colspan="7" class="center">Không có sản phẩm</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>

    <div class="bottom">
      <div class="box">
        <div class="box-title">Giảm giá & ghi chú</div>

        <div class="note-line">
          <strong>Phiếu giảm giá:</strong>
          ${escapeHtml(currentInvoice.maPhieuGiamGia || '-')}
          ${currentInvoice.tenPhieuGiamGia ? ` - ${escapeHtml(currentInvoice.tenPhieuGiamGia)}` : ''}
        </div>

        <div class="note-line">
          <strong>Ghi chú:</strong>
          ${escapeHtml(currentInvoice.ghiChu || 'Không có ghi chú')}
        </div>
      </div>

      <div class="box">
        <div class="box-title">Thanh toán</div>

        <div class="summary-row">
          <span>Số tiền gốc</span>
          <strong>${formatCurrency(currentInvoice.soTienGoc)}</strong>
        </div>

        <div class="summary-row">
          <span>Giảm giá</span>
          <strong>- ${formatCurrency(currentInvoice.soTienGiam)}</strong>
        </div>

        <div class="summary-row">
          <span>Phí vận chuyển</span>
          <strong>${formatCurrency(currentInvoice.phiVanChuyen)}</strong>
        </div>

        <div class="summary-row total">
          <span>Tổng thanh toán</span>
          <span>${formatCurrency(currentInvoice.tongTienThanhToan)}</span>
        </div>
      </div>
    </div>

    <div class="footer-note">
      Cảm ơn quý khách đã mua hàng tại Bee Stylish!
    </div>
  </div>

  <div class="print-actions">
    <button class="btn" onclick="window.close()">Đóng</button>
    <button class="btn" onclick="window.print()">In hóa đơn</button>
  </div>
</body>
</html>
  `

  const printWindow = window.open('', '_blank', 'width=1000,height=800')

  if (!printWindow) {
    showToast('Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup rồi thử lại.', 'error')
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
  }
}


onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-gutter">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 print:hidden">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <RouterLink to="/invoices" class="hover:text-[#EF972D] transition-colors">
            Quản lý hóa đơn
          </RouterLink>
          <span>/</span>
          <span>Chi tiết hóa đơn</span>
        </div>

        <h1 class="font-display-lg text-on-surface uppercase text-gray-900 tracking-tight">
          CHI TIẾT HÓA ĐƠN
        </h1>

        <p class="text-sm text-gray-500 mt-1">
          Xem thông tin hóa đơn, sản phẩm, thanh toán và trạng thái xử lý
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div
          v-if="isUsingMock"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-100 text-xs font-semibold"
        >
          <span class="material-symbols-outlined text-[18px]">database_off</span>
          Đang dùng dữ liệu mẫu
        </div>

        <button
          type="button"
          @click="router.push(`/invoices/${invoiceId}/history`)"
          class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 bg-white cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">history</span>
          Lịch sử
        </button>

        <button
          type="button"
          @click="printInvoice"
          class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 bg-white cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">print</span>
          In hóa đơn
        </button>

        <button
          type="button"
          @click="router.push('/invoices')"
          class="bg-[#EF972D] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          Quay lại
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="bg-white rounded-xl border border-gray-100 shadow-sm p-12 flex flex-col items-center gap-3">
      <div class="w-8 h-8 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm font-semibold text-gray-500">Đang tải chi tiết hóa đơn...</p>
    </div>

    <template v-else>
      <!-- Invoice Main Card -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-orange-50 text-[#EF972D] flex items-center justify-center">
              <span class="material-symbols-outlined text-[28px]">receipt_long</span>
            </div>

            <div>
              <h2 class="text-xl font-bold text-gray-900">
                {{ invoice?.maHoaDon || '-' }}
              </h2>
              <p class="text-sm text-gray-500 mt-1">
                Ngày tạo: {{ formatDateTime(invoice?.ngayTao) }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="invoice"
              :class="getTypeBadge(invoice.loaiHoaDon).class"
              class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
            >
              <span class="material-symbols-outlined text-[15px]">
                {{ getTypeBadge(invoice.loaiHoaDon).icon }}
              </span>
              {{ getTypeBadge(invoice.loaiHoaDon).text }}
            </span>

            <span
              v-if="invoice"
              :class="getStatusBadge(invoice.trangThai).class"
              class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
            >
              <span class="material-symbols-outlined text-[15px]">
                {{ getStatusBadge(invoice.trangThai).icon }}
              </span>
              {{ getStatusBadge(invoice.trangThai).text }}
            </span>
          </div>
        </div>

        <div class="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Customer -->
          <div class="rounded-xl border border-gray-100 p-5 bg-white">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-[#EF972D]">person</span>
              <h3 class="font-bold text-gray-900">Thông tin khách hàng</h3>
            </div>

            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Tên khách hàng</p>
                <p class="text-sm font-bold text-gray-800 mt-1">{{ invoice?.tenKhachHang || '-' }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Số điện thoại</p>
                <p class="text-sm text-gray-700 mt-1">{{ invoice?.soDienThoai || '-' }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Email</p>
                <p class="text-sm text-gray-700 mt-1">{{ invoice?.emailKhachHang || '-' }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Địa chỉ</p>
                <p class="text-sm text-gray-700 mt-1 leading-relaxed">{{ invoice?.diaChi || '-' }}</p>
              </div>
            </div>
          </div>

          <!-- Employee -->
          <div class="rounded-xl border border-gray-100 p-5 bg-white">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-[#EF972D]">badge</span>
              <h3 class="font-bold text-gray-900">Thông tin nhân viên</h3>
            </div>

            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Nhân viên tạo</p>
                <p class="text-sm font-bold text-gray-800 mt-1">{{ invoice?.tenNhanVien || '-' }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Mã nhân viên</p>
                <p class="text-sm text-gray-700 mt-1">{{ invoice?.maNhanVien || '-' }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Ngày thanh toán</p>
                <p class="text-sm text-gray-700 mt-1">{{ formatDateTime(invoice?.ngayThanhToan) }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Ngày nhận hàng</p>
                <p class="text-sm text-gray-700 mt-1">{{ formatDateTime(invoice?.ngayNhanHang) }}</p>
              </div>
            </div>
          </div>

          <!-- Voucher -->
          <div class="rounded-xl border border-gray-100 p-5 bg-white">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-[#EF972D]">local_offer</span>
              <h3 class="font-bold text-gray-900">Giảm giá & ghi chú</h3>
            </div>

            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Phiếu giảm giá</p>
                <p class="text-sm font-bold text-gray-800 mt-1">
                  {{ invoice?.maPhieuGiamGia || '-' }}
                </p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ invoice?.tenPhieuGiamGia || '-' }}
                </p>
              </div>

              <div>
                <p class="text-xs text-gray-400 uppercase font-semibold">Ghi chú</p>
                <p class="text-sm text-gray-700 mt-1 leading-relaxed">
                  {{ invoice?.ghiChu || 'Không có ghi chú' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div
        v-if="invoice"
        class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 print:hidden"
      >
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <span class="material-symbols-outlined text-[#EF972D]">published_with_changes</span>
          Trạng thái hiện tại:
          <span class="font-bold text-gray-900">{{ getStatusBadge(invoice.trangThai).text }}</span>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            v-if="nextStatus(invoice) !== null"
            type="button"
            @click="handleMoveNext"
            :disabled="isUpdating"
            class="bg-[#EF972D] hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_circle_right</span>
            Chuyển sang {{ getStatusBadge(nextStatus(invoice)).text }}
          </button>

          <button
            v-if="canCancelInvoice"
            type="button"
            @click="handleCancelInvoice"
            :disabled="isUpdating"
            class="border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed text-red-700 px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[18px]">cancel</span>
            Hủy hóa đơn
          </button>
        </div>
      </div>

      <!-- Product Details -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Hóa đơn chi tiết</h2>
            <p class="text-sm text-gray-500 mt-1">Danh sách sản phẩm trong hóa đơn</p>
          </div>

          <div class="text-sm text-gray-500">
            {{ invoiceDetails.length }} sản phẩm
          </div>
        </div>

        <div v-if="invoiceDetails.length === 0" class="p-10 text-center">
          <span class="material-symbols-outlined text-gray-400 text-5xl">inventory_2</span>
          <p class="text-sm text-gray-500 font-medium mt-2">Hóa đơn chưa có sản phẩm.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-center w-16">
                  STT
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">
                  Phân loại
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-right">
                  Đơn giá
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-center">
                  Số lượng
                </th>
                <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-right">
                  Thành tiền
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100 bg-white">
              <tr
                v-for="(item, index) in invoiceDetails"
                :key="item.id"
                class="hover:bg-gray-50/50 transition-colors"
              >
                <td class="py-4 px-4 text-center text-sm text-gray-600">
                  {{ index + 1 }}
                </td>

                <td class="py-4 px-4">
                  <div class="flex items-center gap-3">
                    <img
                      :src="formatImage(item.hinhAnh)"
                      :alt="item.tenSanPham"
                      class="w-12 h-12 rounded-lg object-cover border border-gray-100"
                    />

                    <div>
                      <p class="font-bold text-gray-900">
                        {{ item.tenSanPham }}
                      </p>
                      <p class="text-xs text-gray-400 mt-0.5">
                        {{ item.maSanPham }} / {{ item.maChiTietSanPham }}
                      </p>
                    </div>
                  </div>
                </td>

                <td class="py-4 px-4">
                  <div class="flex flex-wrap gap-2">
                    <span class="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                      {{ item.tenMauSac }}
                    </span>
                    <span class="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                      Size {{ item.tenKichThuoc }}
                    </span>
                  </div>
                </td>

                <td class="py-4 px-4 text-right text-sm text-gray-700 font-medium">
                  {{ formatCurrency(item.donGia) }}
                </td>

                <td class="py-4 px-4 text-center">
                  <span class="inline-flex items-center justify-center min-w-[36px] px-3 py-1 rounded-lg bg-orange-50 text-[#EF972D] font-bold text-sm">
                    {{ item.soLuong }}
                  </span>
                </td>

                <td class="py-4 px-4 text-right font-bold text-gray-900">
                  {{ formatCurrency(item.thanhTien) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payment Summary + Recent History -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <!-- Payment Summary -->
        <div class="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h2 class="text-lg font-bold text-gray-900">Thanh toán</h2>
          </div>

          <div class="p-6 space-y-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Tạm tính theo sản phẩm</span>
              <span class="font-semibold text-gray-800">
                {{ formatCurrency(subtotalFromDetails) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Số tiền gốc</span>
              <span class="font-semibold text-gray-800">
                {{ formatCurrency(invoice?.soTienGoc) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Giảm giá</span>
              <span class="font-semibold text-red-600">
                - {{ formatCurrency(invoice?.soTienGiam) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Phí vận chuyển</span>
              <span class="font-semibold text-gray-800">
                {{ formatCurrency(invoice?.phiVanChuyen) }}
              </span>
            </div>

            <div class="border-t border-dashed border-gray-200 pt-4 flex items-center justify-between">
              <span class="font-bold text-gray-900">Tổng thanh toán</span>
              <span class="text-xl font-bold text-[#EF972D]">
                {{ formatCurrency(invoice?.tongTienThanhToan) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Recent History -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-gray-900">Lịch sử gần đây</h2>
              <p class="text-sm text-gray-500 mt-1">Các thao tác mới nhất của hóa đơn</p>
            </div>

            <button
              type="button"
              @click="router.push(`/invoices/${invoiceId}/history`)"
              class="text-[#EF972D] hover:text-orange-600 text-sm font-semibold flex items-center gap-1 cursor-pointer"
            >
              Xem tất cả
              <span class="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          <div v-if="histories.length === 0" class="p-10 text-center">
            <span class="material-symbols-outlined text-gray-400 text-5xl">history</span>
            <p class="text-sm text-gray-500 font-medium mt-2">Chưa có lịch sử hóa đơn.</p>
          </div>

          <div v-else class="p-6 space-y-4">
           <div
  v-for="(item, index) in histories"
  :key="item.id"
  class="flex gap-3"
>
              <div class="w-9 h-9 rounded-full bg-orange-50 text-[#EF972D] flex items-center justify-center shrink-0 font-bold text-sm">
  {{ index + 1 }}
</div>

              <div class="flex-1">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                  <p class="font-bold text-gray-900 text-sm">
                    {{ item.hanhDong }}
                  </p>
                  <p class="text-xs text-gray-400">
                    {{ formatDateTime(item.thoiGian) }}
                  </p>
                </div>

                <p class="text-sm text-gray-500 mt-1">
                  {{ item.ghiChu || 'Không có ghi chú' }}
                </p>

                <p class="text-xs text-gray-400 mt-1">
                  Người thực hiện: {{ item.nguoiThucHien }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Confirm Modal -->
  <div
    v-if="confirmModal.show"
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden"
  >
    <div class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <span class="material-symbols-outlined text-[#EF972D] text-2xl">help_outline</span>
        <h3 class="font-headline-sm text-base font-bold text-gray-800">
          {{ confirmModal.title }}
        </h3>
      </div>

      <div class="p-6 text-sm font-medium text-gray-600 font-body-md leading-relaxed">
        {{ confirmModal.message }}
      </div>

      <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
        <button
          type="button"
          @click="confirmModal.show = false"
          class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>

        <button
          type="button"
          @click="handleConfirm"
          class="bg-[#EF972D] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm"
        >
          Xác nhận
        </button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div
    v-if="toast.show"
    class="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 print:hidden"
    :class="{
      'bg-emerald-50 border-emerald-200 text-emerald-800': toast.type === 'success',
      'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
      'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info'
    }"
  >
    <span class="material-symbols-outlined text-lg">
      {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
    </span>

    <span class="text-sm font-semibold font-body-md">
      {{ toast.message }}
    </span>

    <button
      @click="toast.show = false"
      class="ml-4 text-gray-400 hover:text-gray-600 cursor-pointer"
    >
      <span class="material-symbols-outlined text-sm">close</span>
    </button>
  </div>
</template>