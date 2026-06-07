import Swal from 'sweetalert2'

export function confirmAction({
  title = 'Xác nhận thao tác?',
  text = 'Bạn có chắc chắn muốn thực hiện thao tác này không?',
  confirmButtonText = 'Xác nhận',
  cancelButtonText = 'Hủy',
  icon = 'question',
} = {}) {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-2xl',
      title: 'text-[#0D2533] font-bold',
      htmlContainer: 'text-gray-600',
      confirmButton:
        'px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFB74D] to-[#EF972D] text-white font-semibold mx-2 shadow-sm hover:opacity-90',
      cancelButton:
        'px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold mx-2 hover:bg-gray-200',
    },
  })
}

export function showToast({
  title = 'Thao tác thành công!',
  icon = 'success',
} = {}) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
    background: '#ffffff',
    color: '#0D2533',
    customClass: {
      popup: 'rounded-xl shadow-lg',
      timerProgressBar: 'bg-[#EF972D]',
    },
  })
}

export function showErrorToast(title = 'Có lỗi xảy ra!') {
  showToast({
    title,
    icon: 'error',
  })
}