<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'

const router = useRouter()

// ---------------- STATE ----------------
const invoices = ref([])
const isLoading = ref(false)
const fetchError = ref(false)
const isUsingMock = ref(false)

const searchQuery = ref('')
const selectedStatus = ref('all')
const selectedType = ref('all')
const fromDate = ref('')
const toDate = ref('')

const currentPage = ref(0)
const totalPages = ref(1)
const totalElements = ref(0)
const pageSize = ref(10)

const toast = ref({ show: false, message: '', type: 'success' })
const confirmModal = ref({ show: false, title: '', message: '', onConfirm: null })

// ---------------- MOCK FALLBACK ----------------
const defaultMockInvoices = [
    {
        id: 1,
        maHoaDon: 'HD000001',
        loaiHoaDon: 1,
        tenKhachHang: 'Nguyễn Văn An',
        soDienThoai: '0912345678',
        tenNhanVien: 'Trần Tuấn Linh',
        soTienGoc: 980000,
        soTienGiam: 80000,
        phiVanChuyen: 30000,
        tongTienThanhToan: 930000,
        ngayTao: '2026-06-10T09:15:00',
        ngayThanhToan: '2026-06-10T09:25:00',
        trangThai: 4,
        ghiChu: 'Khách nhận tại cửa hàng'
    },
    {
        id: 2,
        maHoaDon: 'HD000002',
        loaiHoaDon: 2,
        tenKhachHang: 'Trần Thị Bích',
        soDienThoai: '0987654321',
        tenNhanVien: 'Nguyễn Thị Hương',
        soTienGoc: 1250000,
        soTienGiam: 150000,
        phiVanChuyen: 25000,
        tongTienThanhToan: 1125000,
        ngayTao: '2026-06-11T14:35:00',
        ngayThanhToan: null,
        trangThai: 1,
        ghiChu: 'Đơn online chờ xác nhận'
    },
    {
        id: 3,
        maHoaDon: 'HD000003',
        loaiHoaDon: 0,
        tenKhachHang: 'Lê Quốc Minh',
        soDienThoai: '0933445566',
        tenNhanVien: 'Phạm Văn Đức',
        soTienGoc: 560000,
        soTienGiam: 0,
        phiVanChuyen: 30000,
        tongTienThanhToan: 590000,
        ngayTao: '2026-06-12T08:20:00',
        ngayThanhToan: null,
        trangThai: 5,
        ghiChu: 'Khách hủy do đổi ý'
    }
]

const getMockDB = () => {
    const db = localStorage.getItem('mock_invoices')
    if (!db) {
        localStorage.setItem('mock_invoices', JSON.stringify(defaultMockInvoices))
        return defaultMockInvoices
    }
    return JSON.parse(db)
}

const setMockDB = (data) => {
    localStorage.setItem('mock_invoices', JSON.stringify(data))
}

// ---------------- HELPERS ----------------
const showToast = (message, type = 'success') => {
    toast.value = { show: true, message, type }
    setTimeout(() => {
        toast.value.show = false
    }, 4000)
}

const triggerConfirm = (message, onConfirm, title = 'Xác nhận hành động') => {
    confirmModal.value = { show: true, title, message, onConfirm }
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

const normalizeInvoice = (item) => ({
    id: item.id,
    maHoaDon: item.maHoaDon || item.ma_hoa_don || item.code || `HD${String(item.id || 0).padStart(6, '0')}`,
    loaiHoaDon: item.loaiHoaDon ?? item.loai_hoa_don ?? item.type ?? 0,
    tenKhachHang: item.tenKhachHang || item.ten_khach_hang || item.customerName || 'Khách lẻ',
    soDienThoai: item.soDienThoai || item.so_dien_thoai || item.phone || '-',
    tenNhanVien: item.tenNhanVien || item.ten_nhan_vien || item.employeeName || '-',
    soTienGoc: item.soTienGoc ?? item.so_tien_goc ?? item.subTotal ?? 0,
    soTienGiam: item.soTienGiam ?? item.so_tien_giam ?? item.discountAmount ?? 0,
    phiVanChuyen: item.phiVanChuyen ?? item.phi_van_chuyen ?? item.shippingFee ?? 0,
    tongTienThanhToan: item.tongTienThanhToan ?? item.tong_tien_thanh_toan ?? item.total ?? 0,
    ngayTao: item.ngayTao || item.ngay_tao || item.createdAt,
    ngayThanhToan: item.ngayThanhToan || item.ngay_thanh_toan || item.paidAt,
    trangThai: item.trangThai ?? item.trang_thai ?? item.status ?? 0,
    ghiChu: item.ghiChu || item.ghi_chu || ''
})

const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: '0', label: 'Tạo mới' },
    { value: '1', label: 'Chờ xác nhận' },
    { value: '2', label: 'Đã xác nhận' },
    { value: '3', label: 'Đang giao' },
    { value: '4', label: 'Hoàn thành' },
    { value: '5', label: 'Đã hủy' },
]

const getStatusBadge = (status) => {
    const s = Number(status)
    if (s === 0) return { text: 'Tạo mới', class: 'bg-blue-50 text-blue-700 border border-blue-100', icon: 'fiber_new' }
    if (s === 1) return { text: 'Chờ xác nhận', class: 'bg-yellow-50 text-yellow-700 border border-yellow-100', icon: 'schedule' }
    if (s === 2) return { text: 'Đã xác nhận', class: 'bg-indigo-50 text-indigo-700 border border-indigo-100', icon: 'task_alt' }
    if (s === 3) return { text: 'Đang giao', class: 'bg-orange-50 text-orange-700 border border-orange-100', icon: 'local_shipping' }
    if (s === 4) return { text: 'Hoàn thành', class: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: 'check_circle' }
    if (s === 5) return { text: 'Đã hủy', class: 'bg-red-50 text-red-700 border border-red-100', icon: 'cancel' }
    return { text: 'Không xác định', class: 'bg-gray-100 text-gray-500 border border-gray-200', icon: 'help' }
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
            icon: 'inventory_2'
        }
    }

    return {
        text: 'Online',
        class: 'bg-sky-50 text-sky-700 border border-sky-100',
        icon: 'language'
    }
}

const visiblePages = computed(() => {
    const pages = []
    const total = totalPages.value
    const current = currentPage.value

    if (total <= 5) {
        for (let i = 0; i < total; i++) pages.push(i)
        return pages
    }

    pages.push(0)
    if (current > 2) pages.push('...')
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i)
    if (current < total - 3) pages.push('...')
    pages.push(total - 1)
    return pages
})

const summary = computed(() => {
    const completed = invoices.value.filter(item => Number(item.trangThai) === 4).length
    const waiting = invoices.value.filter(item => [0, 1, 2, 3].includes(Number(item.trangThai))).length
    const canceled = invoices.value.filter(item => Number(item.trangThai) === 5).length
    return { completed, waiting, canceled }
})

// ---------------- API ----------------
const fetchInvoices = async (page = 0) => {
    isLoading.value = true
    fetchError.value = false
    currentPage.value = page

    try {
        const params = { page, size: pageSize.value }
        if (searchQuery.value.trim()) params.keyword = searchQuery.value.trim()
        if (selectedStatus.value !== 'all') params.trangThai = Number(selectedStatus.value)
        if (selectedType.value !== 'all') params.loaiHoaDon = Number(selectedType.value)
        if (fromDate.value && toDate.value && fromDate.value > toDate.value) {
            showToast('Từ ngày không được lớn hơn đến ngày!', 'error')
            return
        }

        if (fromDate.value) params.tuNgay = `${fromDate.value}T00:00:00`
        if (toDate.value) params.denNgay = `${toDate.value}T23:59:59`

        const res = await api.get('/api/v1/hoa-don', { params })
        const data = res.data

        const content = Array.isArray(data) ? data : (data?.content || [])
        invoices.value = content.map(normalizeInvoice)
        totalPages.value = data?.totalPages || 1
        totalElements.value = data?.totalElements ?? invoices.value.length
        isUsingMock.value = false
    } catch (err) {
        console.warn('Không gọi được API hóa đơn, dùng mock fallback:', err.message)
        const db = getMockDB().map(normalizeInvoice)
        let filtered = [...db]

        const keyword = searchQuery.value.trim().toLowerCase()
        if (keyword) {
            filtered = filtered.filter(item =>
                item.maHoaDon.toLowerCase().includes(keyword) ||
                item.tenKhachHang.toLowerCase().includes(keyword) ||
                item.soDienThoai.toLowerCase().includes(keyword)
            )
        }
        if (selectedStatus.value !== 'all') filtered = filtered.filter(item => Number(item.trangThai) === Number(selectedStatus.value))
        if (selectedType.value !== 'all') filtered = filtered.filter(item => Number(item.loaiHoaDon) === Number(selectedType.value))

        const start = page * pageSize.value
        invoices.value = filtered.slice(start, start + pageSize.value)
        totalElements.value = filtered.length
        totalPages.value = Math.max(1, Math.ceil(filtered.length / pageSize.value))
        isUsingMock.value = true
    } finally {
        isLoading.value = false
    }
}
const exportExcel = async () => {
    try {
        const params = {}

        if (searchQuery.value.trim()) params.keyword = searchQuery.value.trim()
        if (selectedStatus.value !== 'all') params.trangThai = Number(selectedStatus.value)
        if (selectedType.value !== 'all') params.loaiHoaDon = Number(selectedType.value)
        if (fromDate.value) params.tuNgay = `${fromDate.value}T00:00:00`
        if (toDate.value) params.denNgay = `${toDate.value}T23:59:59`

        const res = await api.get('/api/v1/hoa-don/export-excel', {
            params,
            responseType: 'blob'
        })

        const blob = new Blob([res.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })

        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.href = url
        link.download = `danh-sach-hoa-don-${new Date().getTime()}.xlsx`
        document.body.appendChild(link)
        link.click()

        link.remove()
        window.URL.revokeObjectURL(url)

        showToast('Xuất Excel thành công!')
    } catch (err) {
        console.error('Export excel failed:', err)
        showToast('Không thể xuất Excel!', 'error')
    }
}
const updateInvoiceStatus = async (item, nextStatus) => {
    try {
        if (!isUsingMock.value) {
            await api.patch(`/api/v1/hoa-don/${item.id}/trang-thai`, {
                trangThai: nextStatus,
                hanhDong: getStatusBadge(nextStatus).text,
                ghiChu: `Cập nhật trạng thái sang ${getStatusBadge(nextStatus).text}`
            })
        } else {
            const db = getMockDB()
            const idx = db.findIndex(row => row.id === item.id)
            if (idx > -1) {
                db[idx].trangThai = nextStatus
                db[idx].ngaySua = new Date().toISOString()
                if (Number(nextStatus) === 4) db[idx].ngayThanhToan = new Date().toISOString()
                setMockDB(db)
            }
        }

        showToast('Cập nhật trạng thái hóa đơn thành công!')
        await fetchInvoices(currentPage.value)
    } catch (err) {
        console.error('Update invoice status failed:', err)
        showToast('Không thể cập nhật trạng thái hóa đơn!', 'error')
    }
}

const nextStatus = (item) => {
    const s = Number(item.trangThai)
    if (s === 0) return 1
    if (s === 1) return 2
    if (s === 2) return 3
    if (s === 3) return 4
    return null
}

const handleMoveNext = (item) => {
    const next = nextStatus(item)
    if (next === null) return
    triggerConfirm(
        `Bạn có chắc muốn chuyển hóa đơn ${item.maHoaDon} sang trạng thái "${getStatusBadge(next).text}" không?`,
        () => updateInvoiceStatus(item, next),
        'Cập nhật trạng thái hóa đơn'
    )
}

const handleCancel = (item) => {
    triggerConfirm(
        `Bạn có chắc muốn hủy hóa đơn ${item.maHoaDon} không? Hành động này nên được dùng khi đơn chưa hoàn thành.`,
        () => updateInvoiceStatus(item, 5),
        'Hủy hóa đơn'
    )
}

const viewDetail = (item) => {
    router.push(`/invoices/${item.id}`)
}

const viewHistory = (item) => {
    router.push(`/invoices/${item.id}/history`)
}

const resetFilters = () => {
    searchQuery.value = ''
    selectedStatus.value = 'all'
    selectedType.value = 'all'
    fromDate.value = ''
    toDate.value = ''
    fetchInvoices(0)
}

let searchTimeout = null
watch([searchQuery, selectedStatus, selectedType, fromDate, toDate], () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => fetchInvoices(0), 350)
})

onMounted(() => {
    fetchInvoices(0)
})
</script>

<template>
    <div class="max-w-7xl mx-auto space-y-gutter">
        <!-- Header Section -->
        <div class="mb-stack-lg flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
                <h1 class="font-display-lg text-on-surface uppercase text-gray-900 tracking-tight">QUẢN LÝ HÓA ĐƠN</h1>
                <p class="text-sm text-gray-500 mt-1">Theo dõi hóa đơn, trạng thái xử lý</p>
            </div>
            <div v-if="isUsingMock"
                class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-100 text-xs font-semibold">
                <span class="material-symbols-outlined text-[18px]">database_off</span>
                Đang dùng dữ liệu mẫu
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">

            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hoàn thành</p>
                        <p class="text-2xl font-bold text-emerald-700 mt-1">{{ summary.completed }}</p>
                    </div>
                    <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <span class="material-symbols-outlined">check_circle</span>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Đang xử lý</p>
                        <p class="text-2xl font-bold text-orange-700 mt-1">{{ summary.waiting }}</p>
                    </div>
                    <div class="w-11 h-11 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
                        <span class="material-symbols-outlined">pending_actions</span>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Đã hủy</p>
                        <p class="text-2xl font-bold text-red-700 mt-1">{{ summary.canceled }}</p>
                    </div>
                    <div class="w-11 h-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                        <span class="material-symbols-outlined">cancel</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filter Card -->
        <div class="bg-surface-container-lowest rounded-lg shadow-sm border border-gray-100 p-container-padding">
            <div class="mb-gutter">
                <div class="relative w-full">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <span class="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input v-model="searchQuery"
                        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange transition-colors font-body-md text-on-surface placeholder-gray-400 bg-white"
                        placeholder="Tìm theo mã hóa đơn, tên khách hàng hoặc số điện thoại" type="text" />
                </div>
            </div>

            <div class="flex flex-col md:flex-row md:items-center justify-between gap-gutter">
                <div class="flex flex-wrap items-center gap-base flex-1">
                    <select v-model="selectedStatus"
                        class="border border-gray-300 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange font-body-md bg-white text-gray-700 min-w-[160px]">
                        <option v-for="item in statusOptions" :key="item.value" :value="item.value">
                            {{ item.label }}
                        </option>
                    </select>

                    <select v-model="selectedType"
                        class="border border-gray-300 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange font-body-md bg-white text-gray-700 min-w-[140px]">
                        <option value="all">Loại hóa đơn</option>
                        <option value="0">Online</option>
                        <option value="1">Tại quầy</option>
                        <option value="2">Giao hàng</option>
                    </select>

                    <div
                        class="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white min-w-[190px]">
                        <span class="text-sm font-medium text-gray-500 whitespace-nowrap">Từ ngày</span>
                        <input v-model="fromDate" type="date" @change="$event.target.blur()"
                            class="flex-1 outline-none border-0 bg-transparent text-sm text-gray-700 min-w-0" />
                    </div>

                    <div
                        class="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white min-w-[190px]">
                        <span class="text-sm font-medium text-gray-500 whitespace-nowrap">Đến ngày</span>
                        <input v-model="toDate" type="date" @change="$event.target.blur()"
                            class="flex-1 outline-none border-0 bg-transparent text-sm text-gray-700 min-w-0" />
                    </div>
                </div>

                <div class="flex items-center gap-base">
                    <button @click="exportExcel"
                        class="border border-[#EF972D] text-[#EF972D] hover:bg-orange-50 font-headline-md text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap font-medium bg-white cursor-pointer">
                        <span class="material-symbols-outlined text-[18px]">file_download</span>
                        Xuất Excel
                    </button>
                    <button @click="resetFilters"
                        class="bg-[#EF972D] hover:bg-orange-600 text-white font-headline-md text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap font-medium shadow-sm cursor-pointer">
                        <span class="material-symbols-outlined text-[18px]">sync</span>
                        Tải lại
                    </button>
                </div>
            </div>
        </div>

        <!-- Data Table Card -->
        <div class="bg-surface-container-lowest rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div v-if="isLoading" class="p-10 flex flex-col items-center justify-center gap-3 bg-white">
                <div class="w-8 h-8 border-4 border-[#EF972D] border-t-transparent rounded-full animate-spin"></div>
                <span class="text-sm font-semibold text-gray-500">Đang tải dữ liệu...</span>
            </div>

            <div v-else-if="fetchError" class="p-10 text-center space-y-4 bg-white">
                <span class="material-symbols-outlined text-red-500 text-5xl">error</span>
                <p class="text-sm text-gray-500 font-medium">Đã có lỗi xảy ra khi tải dữ liệu từ máy chủ.</p>
                <button @click="fetchInvoices(0)"
                    class="px-4 py-2 bg-[#EF972D] hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    Tải lại
                </button>
            </div>

            <div v-else-if="invoices.length === 0" class="p-10 text-center bg-white">
                <span class="material-symbols-outlined text-gray-400 text-5xl">receipt_long</span>
                <p class="text-sm text-gray-500 font-medium mt-2">Không tìm thấy hóa đơn nào phù hợp.</p>
            </div>

            <div v-else class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-center w-16">
                                STT</th>
                            <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Mã hóa đơn</th>
                            <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Khách hàng</th>
                            <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Loại</th>
                            <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                            <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-right">Tổng
                                tiền</th>
                            <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider">Trạng thái</th>
                            <th class="py-3 px-4 font-label-sm text-gray-500 uppercase tracking-wider text-right w-40">
                                Hành động</th>
                        </tr>
                    </thead>

                    <tbody class="divide-y divide-gray-100 bg-white">
                        <tr v-for="(item, index) in invoices" :key="item.id"
                            class="hover:bg-gray-50/50 transition-colors">
                            <td class="py-4 px-4 font-body-md text-gray-600 text-center">
                                {{ index + 1 + currentPage * pageSize }}
                            </td>

                            <td class="py-4 px-4">
                                <button @click="viewDetail(item)"
                                    class="font-semibold text-gray-900 hover:text-[#EF972D] transition-colors cursor-pointer">
                                    {{ item.maHoaDon }}
                                </button>
                                <p class="text-xs text-gray-400 mt-1">NV: {{ item.tenNhanVien }}</p>
                            </td>

                            <td class="py-4 px-4">
                                <div class="font-body-md text-gray-800 font-medium">{{ item.tenKhachHang }}</div>
                                <div class="text-xs text-gray-400 mt-0.5">{{ item.soDienThoai }}</div>
                            </td>

                            <td class="py-4 px-4">
                                <span :class="getTypeBadge(item.loaiHoaDon).class"
                                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                    <span class="material-symbols-outlined text-[14px]">
                                        {{ getTypeBadge(item.loaiHoaDon).icon }}
                                    </span>
                                    {{ getTypeBadge(item.loaiHoaDon).text }}
                                </span>
                            </td>

                            <td class="py-4 px-4 font-body-md text-gray-600">
                                {{ formatDateTime(item.ngayTao) }}
                            </td>

                            <td class="py-4 px-4 text-right">
                                <div class="font-bold text-[#EF972D]">
                                    {{ formatCurrency(item.tongTienThanhToan) }}
                                </div>
                                <div v-if="item.soTienGiam" class="text-xs text-gray-400">
                                    Giảm {{ formatCurrency(item.soTienGiam) }}
                                </div>
                            </td>

                            <td class="py-4 px-4">
                                <span :class="getStatusBadge(item.trangThai).class"
                                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                    <span class="material-symbols-outlined text-[14px]">
                                        {{ getStatusBadge(item.trangThai).icon }}
                                    </span>
                                    {{ getStatusBadge(item.trangThai).text }}
                                </span>
                            </td>

                            <td class="py-4 px-4 text-right">
                                <div class="flex items-center justify-end gap-3">
                                    <button @click="viewDetail(item)"
                                        class="text-gray-400 hover:text-[#EF972D] transition-colors cursor-pointer"
                                        title="Chi tiết">
                                        <span class="material-symbols-outlined text-[20px]">visibility</span>
                                    </button>

                                    <button v-if="![4, 5].includes(Number(item.trangThai))" @click="handleCancel(item)"
                                        class="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                        title="Hủy hóa đơn">
                                        <span class="material-symbols-outlined text-[20px]">cancel</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1 && invoices.length > 0"
                class="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
                <div class="text-sm text-gray-500 font-body-md">
                    Hiển thị {{ currentPage * pageSize + 1 }}
                    đến {{ Math.min((currentPage + 1) * pageSize, totalElements) }}
                    của {{ totalElements }} kết quả
                </div>

                <div class="flex items-center space-x-1">
                    <button @click="fetchInvoices(currentPage - 1)" :disabled="currentPage === 0"
                        class="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors font-body-md text-sm border border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                        «
                    </button>

                    <button v-for="(page, idx) in visiblePages" :key="idx"
                        @click="page !== '...' && fetchInvoices(page)"
                        :class="page === currentPage ? 'bg-brand-orange text-white' : 'text-gray-600 hover:bg-gray-100 border-transparent'"
                        class="px-3 py-1 rounded-md font-body-md text-sm transition-colors border cursor-pointer"
                        :disabled="page === '...'">
                        {{ page === '...' ? '...' : page + 1 }}
                    </button>

                    <button @click="fetchInvoices(currentPage + 1)" :disabled="currentPage === totalPages - 1"
                        class="px-3 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors font-body-md text-sm border border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                        »
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="confirmModal.show"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div
            class="bg-white text-[#0D2533] rounded-xl max-w-md w-full overflow-hidden border border-gray-100 shadow-2xl">
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
                <button type="button" @click="confirmModal.show = false"
                    class="border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer">
                    Hủy bỏ
                </button>

                <button type="button" @click="handleConfirm"
                    class="bg-[#EF972D] hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors cursor-pointer shadow-sm">
                    Xác nhận
                </button>
            </div>
        </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show"
        class="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0"
        :class="{
            'bg-emerald-50 border-emerald-200 text-emerald-800': toast.type === 'success',
            'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
            'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info'
        }">
        <span class="material-symbols-outlined text-lg">
            {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
        </span>

        <span class="text-sm font-semibold font-body-md">
            {{ toast.message }}
        </span>

        <button @click="toast.show = false" class="ml-4 text-gray-400 hover:text-gray-600 cursor-pointer">
            <span class="material-symbols-outlined text-sm">close</span>
        </button>
    </div>
</template>
