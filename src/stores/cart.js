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
        const maxStock = existing.stock || 999
        existing.quantity = Math.min(maxStock, currentQty + quantityToAdd)
      } else {
        this.items.push({
          variantId: vId,
          id: newItem.id || vId,
          name: newItem.name || newItem.tenSanPham || 'Sản phẩm',
          price: newItem.price || newItem.giaBan || 199000,
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
    }
  }
})
