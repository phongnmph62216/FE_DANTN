import { defineStore } from 'pinia'
import api from '@/services/api'
import { useAuthStore } from './auth'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    socket: null,
    ringTrigger: 0,
    pendingOrdersCount: 0,
    dismissedVirtualOrderIds: []
  }),
  actions: {
    async fetchNotifications() {
      try {
        // 1. Fetch DB notifications
        const resList = await api.get('/api/v1/thong-bao')
        const dbNotifs = resList.data || []

        // 2. Fetch pending orders (status = 0)
        const resOrders = await api.get('/api/v1/hoa-don?trangThai=0&size=50')
        const pendingOrders = resOrders.data?.content || []
        this.pendingOrdersCount = resOrders.data?.totalElements || 0

        // 3. Map pending orders to virtual notifications (filtering out dismissed ones)
        const virtualNotifs = pendingOrders
          .filter(order => !this.dismissedVirtualOrderIds.includes(order.id))
          .map(order => {
            const formattedMoney = order.tongTien ? Number(order.tongTien).toLocaleString('vi-VN') : '0'
            const loaiDonText = order.loaiDon === 2 ? 'Online' : (order.loaiDon === 1 ? 'Giao hàng' : 'Tại quầy')
            return {
              id: `order-pending-${order.id}`,
              tieuDe: `Đơn hàng chờ xác nhận (${loaiDonText})`,
              noiDung: `Đơn hàng ${order.maHoaDon} (${loaiDonText}) đang chờ xác nhận. Khách hàng: ${order.tenKhachHang || 'Khách lẻ'}. Tổng tiền: ${formattedMoney} đ`,
              idHoaDon: order.id,
              maHoaDon: order.maHoaDon,
              trangThai: 0, // Always highlight as unread / pending
              ngayTao: order.ngayTao,
              isVirtualPendingOrder: true
            }
          })

        // 4. Merge without duplicates (using idHoaDon to prevent double-display for the same order)
        const dbOrderIds = new Set(dbNotifs.filter(n => n.idHoaDon).map(n => Number(n.idHoaDon)))
        
        const merged = [...dbNotifs]
        for (const vNotif of virtualNotifs) {
          if (!dbOrderIds.has(Number(vNotif.idHoaDon))) {
            merged.push(vNotif)
          }
        }

        // Sort by ngayTao descending
        merged.sort((a, b) => new Date(b.ngayTao) - new Date(a.ngayTao))

        this.notifications = merged

        // 5. Update unreadCount
        const resCount = await api.get('/api/v1/thong-bao/chua-doc/count')
        const dbUnreadCount = typeof resCount.data === 'number' ? resCount.data : 0
        const addedVirtualCount = merged.filter(n => n.isVirtualPendingOrder).length
        this.unreadCount = dbUnreadCount + addedVirtualCount
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    },
    async checkPendingOrders() {
      try {
        const response = await api.get('/api/v1/hoa-don?trangThai=0&size=1')
        this.pendingOrdersCount = response.data?.totalElements || 0
        return this.pendingOrdersCount
      } catch (error) {
        console.error('Error checking pending orders:', error)
        return 0
      }
    },
    connectWs() {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn || !authStore.isAdminOrStaff) {
        this.disconnectWs()
        return
      }

      // Check if already connected or connecting
      if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
        return
      }

      const staffId = authStore.user?.id || ''
      const staffName = encodeURIComponent(authStore.user?.hoVaTen || authStore.user?.hoTen || 'Nhân viên')
      const wsBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/^http/, 'ws')
      const wsUrl = `${wsBase}/ws/chat?role=staff&staffId=${staffId}&name=${staffName}`

      try {
        const ws = new WebSocket(wsUrl)
        this.socket = ws

        ws.onopen = () => {
          console.log('WebSocket notification connection established.')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'NOTIFICATION_ALERT') {
              this.ringTrigger += 1
              this.fetchNotifications()
            }
          } catch (e) {
            console.error('Error parsing WS notification message:', e)
          }
        }

        ws.onclose = () => {
          setTimeout(() => {
            if (authStore.isLoggedIn && authStore.isAdminOrStaff) {
              this.connectWs()
            }
          }, 5000)
        }

        ws.onerror = (err) => {
          console.error('WebSocket connection error:', err)
        }
      } catch (err) {
        console.error('Failed to create WebSocket:', err)
      }
    },
    disconnectWs() {
      if (this.socket) {
        this.socket.close()
        this.socket = null
      }
    },
    async markAsRead(id) {
      try {
        if (typeof id === 'string' && id.startsWith('order-pending-')) {
          const orderId = Number(id.replace('order-pending-', ''))
          if (!this.dismissedVirtualOrderIds.includes(orderId)) {
            this.dismissedVirtualOrderIds.push(orderId)
          }
        } else {
          await api.put(`/api/v1/thong-bao/${id}/da-doc`)
        }
        await this.fetchNotifications()
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    },
    async markAllAsRead() {
      try {
        this.notifications.forEach(n => {
          if (n.isVirtualPendingOrder) {
            const orderId = Number(n.id.replace('order-pending-', ''))
            if (!this.dismissedVirtualOrderIds.includes(orderId)) {
              this.dismissedVirtualOrderIds.push(orderId)
            }
          }
        })
        await api.put('/api/v1/thong-bao/da-doc-tat-ca')
        await this.fetchNotifications()
      } catch (error) {
        console.error('Error marking all as read:', error)
      }
    },
    async deleteNotification(id) {
      try {
        if (typeof id === 'string' && id.startsWith('order-pending-')) {
          const orderId = Number(id.replace('order-pending-', ''))
          if (!this.dismissedVirtualOrderIds.includes(orderId)) {
            this.dismissedVirtualOrderIds.push(orderId)
          }
        } else {
          await api.delete(`/api/v1/thong-bao/${id}`)
        }
        await this.fetchNotifications()
      } catch (error) {
        console.error('Error deleting notification:', error)
      }
    },
    async clearAllNotifications() {
      try {
        this.notifications.forEach(n => {
          if (n.isVirtualPendingOrder) {
            const orderId = Number(n.id.replace('order-pending-', ''))
            if (!this.dismissedVirtualOrderIds.includes(orderId)) {
              this.dismissedVirtualOrderIds.push(orderId)
            }
          }
        })
        await api.delete('/api/v1/thong-bao/xoa-tat-ca')
        await this.fetchNotifications()
      } catch (error) {
        console.error('Error clearing all notifications:', error)
      }
    }
  }
})
