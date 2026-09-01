import { defineStore } from 'pinia'

function getCartKey() {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user') || 'null')
    if (user && user.id) {
      return `bee_cart_user_${user.id}`
    }
  } catch (e) {}
  return 'bee_cart_guest'
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
  }),
  getters: {
    totalItems: (state) => state.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
    uniqueCount: (state) => state.items.length,
    totalPrice: (state) => state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
  },
  actions: {
    loadCart() {
      try {
        const key = getCartKey()
        this.items = JSON.parse(localStorage.getItem(key) || '[]')
      } catch (e) {
        this.items = []
      }
    },
    saveCart() {
      const key = getCartKey()
      localStorage.setItem(key, JSON.stringify(this.items))
    },
    addItem(newItem, quantityToAdd = 1) {
      this.loadCart()
      const vId = newItem.variantId || newItem.id || Date.now()
      const existing = this.items.find(item => (item.variantId || item.id) === vId)
      if (existing) {
        const currentQty = existing.quantity || 1
        const maxStock = newItem.stock || existing.stock || 999
        existing.quantity = Math.min(maxStock, currentQty + quantityToAdd)
        if (newItem.price !== undefined) existing.price = newItem.price
        if (newItem.originalPrice !== undefined) existing.originalPrice = newItem.originalPrice
      } else {
        const unitPrice = newItem.price ?? newItem.giaBan ?? 199000
        const origPrice = newItem.originalPrice ?? newItem.giaBanDau ?? newItem.giaGoc ?? unitPrice
        this.items.push({
          variantId: vId,
          id: newItem.id || vId,
          name: newItem.name || newItem.tenSanPham || 'Sản phẩm',
          price: unitPrice,
          originalPrice: origPrice,
          image: newItem.image || newItem.hinhAnhMain || newItem.hinhAnh || '',
          color: newItem.color || newItem.tenMauSac || 'Mặc định',
          size: newItem.size || newItem.tenKichCo || 'Mặc định',
          stock: newItem.stock || 999,
          quantity: quantityToAdd,
          ...newItem
        })
      }
      this.saveCart()
    },
    addToCart(newItem, quantityToAdd = 1) {
      this.addItem(newItem, quantityToAdd)
    },
    updateQuantity(variantId, quantity) {
      const item = this.items.find(i => i.variantId === variantId)
      if (item) {
        item.quantity = quantity
        this.saveCart()
      }
    },
    incrementQuantity(variantId) {
      const item = this.items.find(i => i.variantId === variantId)
      if (item && item.quantity < item.stock) {
        item.quantity++
        this.saveCart()
      }
    },
    decrementQuantity(variantId) {
      const item = this.items.find(i => i.variantId === variantId)
      if (item && item.quantity > 1) {
        item.quantity--
        this.saveCart()
      }
    },
    removeItem(variantId) {
      this.items = this.items.filter(i => i.variantId !== variantId)
      this.saveCart()
    },
    clearCart() {
      this.items = []
      const key = getCartKey()
      localStorage.removeItem(key)
    },
    async validateAndUpdatePrices(apiInstance) {
      this.loadCart()
      if (!this.items || this.items.length === 0) return { priceChanged: false }

      let priceChanged = false
      const updatedItems = [...this.items]

      try {
        for (let i = 0; i < updatedItems.length; i++) {
          const item = updatedItems[i]
          const vId = item.variantId || item.id
          if (!vId) continue

          try {
            const res = await apiInstance.get(`/api/v1/chi-tiet-san-pham/${vId}`)
            if (res && res.data) {
              const d = res.data
              const rawPrice = d.giaBan ?? d.donGia ?? item.originalPrice ?? item.price
              const latestStock = d.soLuongTon ?? d.soLuong ?? item.stock

              const now = new Date()
              let hasDiscount = false
              if (d.trangThaiDotGiamGia === 1 && (d.phanTramGiam ?? 0) > 0 && d.ngayBatDau && d.ngayKetThuc) {
                const start = new Date(d.ngayBatDau)
                const end = new Date(d.ngayKetThuc)
                hasDiscount = now >= start && now <= end
              }

              const latestOriginalPrice = Number(rawPrice)
              const latestPrice = hasDiscount
                ? latestOriginalPrice * (100 - Number(d.phanTramGiam)) / 100
                : latestOriginalPrice

              if (latestPrice !== undefined && Number(item.price) !== Number(latestPrice)) {
                priceChanged = true
                updatedItems[i].price = Number(latestPrice)
                updatedItems[i].originalPrice = Number(latestOriginalPrice)
              } else if (latestOriginalPrice !== undefined && Number(item.originalPrice) !== Number(latestOriginalPrice)) {
                updatedItems[i].originalPrice = Number(latestOriginalPrice)
              }

              if (latestStock !== undefined) {
                updatedItems[i].stock = latestStock
              }
            }
          } catch (err) {
            console.warn(`Could not verify price for variant ${vId}:`, err)
          }
        }

        if (priceChanged) {
          this.items = updatedItems
          this.saveCart()
          return {
            priceChanged: true,
            message: 'Giá của một số sản phẩm trong giỏ hàng đã được tự động cập nhật theo giá mới nhất từ hệ thống!'
          }
        }
      } catch (err) {
        console.error('Error validating cart prices:', err)
      }

      return { priceChanged: false }
    }
  }
})
