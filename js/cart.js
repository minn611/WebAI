/* ==========================================================================
   TEAJOY STORE - CART STATE & SLIDE-OVER DRAWER
   ========================================================================== */

const Cart = {
  getCart() {
    return DB.get(STORAGE_KEYS.CART, []);
  },

  setCart(cart) {
    DB.set(STORAGE_KEYS.CART, cart);
    this.updateBadges();
    this.renderDrawer();
  },

  addItem(item) {
    const cart = this.getCart();
    // Unique key considering custom configuration
    const toppingKeys = (item.toppings || []).sort().join(",");
    const itemKey = `${item.productId}_${item.size}_${item.sugar}_${item.ice}_${toppingKeys}`;

    const existingIndex = cart.findIndex(i => i.itemKey === itemKey);

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += (item.quantity || 1);
      cart[existingIndex].subtotal = cart[existingIndex].unitPrice * cart[existingIndex].quantity;
    } else {
      const newItem = {
        itemKey,
        productId: item.productId,
        name: item.name,
        image: item.image,
        size: item.size || "M",
        sugar: item.sugar || "100%",
        ice: item.ice || "100%",
        toppings: item.toppings || [],
        unitPrice: item.unitPrice,
        quantity: item.quantity || 1,
        subtotal: item.unitPrice * (item.quantity || 1)
      };
      cart.push(newItem);
    }

    this.setCart(cart);
    Toast.success(`Đã thêm <b>${item.name}</b> vào giỏ hàng!`);
  },

  updateQuantity(itemKey, delta) {
    let cart = this.getCart();
    const item = cart.find(i => i.itemKey === itemKey);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.itemKey !== itemKey);
      } else {
        item.subtotal = item.unitPrice * item.quantity;
      }
      this.setCart(cart);
    }
  },

  removeItem(itemKey) {
    let cart = this.getCart();
    cart = cart.filter(i => i.itemKey !== itemKey);
    this.setCart(cart);
    Toast.info("Đã xóa sản phẩm khỏi giỏ hàng.");
  },

  clearCart() {
    this.setCart([]);
  },

  getItemsTotal() {
    return this.getCart().reduce((sum, item) => sum + item.subtotal, 0);
  },

  getItemCount() {
    return this.getCart().reduce((sum, item) => sum + item.quantity, 0);
  },

  updateBadges() {
    const count = this.getItemCount();
    const badges = document.querySelectorAll(".cart-count-badge");
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? "flex" : "none";
    });
  },

  // Open / Close Drawer
  openDrawer() {
    this.renderDrawer();
    const backdrop = document.getElementById("cart-drawer-backdrop");
    const drawer = document.getElementById("cart-drawer");
    if (backdrop && drawer) {
      backdrop.classList.add("active");
      drawer.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  closeDrawer() {
    const backdrop = document.getElementById("cart-drawer-backdrop");
    const drawer = document.getElementById("cart-drawer");
    if (backdrop && drawer) {
      backdrop.classList.remove("active");
      drawer.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  renderDrawer() {
    const drawerContainer = document.getElementById("cart-drawer-container");
    if (!drawerContainer) return;

    const cart = this.getCart();
    const total = this.getItemsTotal();

    if (cart.length === 0) {
      drawerContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">🧋</div>
          <h4 style="margin-bottom: 0.5rem;">Giỏ hàng của bạn đang trống</h4>
          <p class="text-sm text-muted" style="margin-bottom: 1.5rem;">Hãy khám phá menu và thưởng thức món trà sữa ngon tuyệt nhé!</p>
          <a href="menu.html" class="btn btn-primary btn-sm" onclick="Cart.closeDrawer()">Xem Thực Đơn Ngay</a>
        </div>
      `;
      const footerBtn = document.getElementById("drawer-checkout-btn");
      if (footerBtn) footerBtn.style.display = "none";
      return;
    }

    const footerBtn = document.getElementById("drawer-checkout-btn");
    if (footerBtn) footerBtn.style.display = "block";

    const itemsHtml = cart.map(item => `
      <div style="display: flex; gap: 0.85rem; padding-bottom: 1rem; border-bottom: 1px dashed var(--border-subtle);">
        <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null; this.src='images/products/hong-tra-mochi-keo-dai.jpg';" style="width: 65px; height: 65px; border-radius: var(--radius-md); object-fit: cover;">
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <h5 style="font-size: 0.925rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</h5>
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              <button onclick="Cart.closeDrawer(); ClientApp.openCustomizer('${item.productId}')" class="btn btn-outline btn-sm" style="padding: 0.15rem 0.45rem; font-size: 0.72rem; border-radius: var(--radius-full);" title="Đổi size / đường / đá / topping">✏️ Sửa</button>
              <button onclick="Cart.removeItem('${item.itemKey}')" style="color: var(--status-cancelled); font-size: 0.85rem; font-weight: bold; background: none; border: none; cursor: pointer; padding: 0 4px;" title="Xóa món">✕</button>
            </div>
          </div>
          <div style="font-size: 0.775rem; color: var(--text-muted); margin-block: 2px;">
            Size: <b>${item.size}</b> | ${item.sugar} đường | ${item.ice} đá
          </div>
          ${item.toppings && item.toppings.length > 0 ? `
            <div style="font-size: 0.725rem; color: var(--primary); margin-bottom: 4px;">
              + ${item.toppings.join(", ")}
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem;">
            <span style="font-weight: 800; color: var(--primary); font-size: 0.9rem;">${Formatters.currency(item.unitPrice)}</span>
            <div class="qty-counter" style="scale: 0.85; transform-origin: right;">
              <button class="qty-btn" onclick="Cart.updateQuantity('${item.itemKey}', -1)">-</button>
              <input type="text" class="qty-input" value="${item.quantity}" readonly>
              <button class="qty-btn" onclick="Cart.updateQuantity('${item.itemKey}', 1)">+</button>
            </div>
          </div>
        </div>
      </div>
    `).join("");

    drawerContainer.innerHTML = itemsHtml;

    const drawerSubtotal = document.getElementById("drawer-subtotal-price");
    if (drawerSubtotal) {
      drawerSubtotal.textContent = Formatters.currency(total);
    }
  },

  initDrawerUI() {
    if (document.getElementById("cart-drawer")) return;

    const drawerMarkup = `
      <div id="cart-drawer-backdrop" class="drawer-backdrop" onclick="Cart.closeDrawer()"></div>
      <div id="cart-drawer" class="cart-drawer">
        <div class="drawer-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.3rem;">🛍️</span>
            <h4 style="margin: 0;">Giỏ Hàng Của Bạn</h4>
          </div>
          <button class="action-btn" onclick="Cart.closeDrawer()">✕</button>
        </div>
        <div class="drawer-body" id="cart-drawer-container">
          <!-- Cart items injected here -->
        </div>
        <div class="drawer-footer">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <span style="font-weight: 600; color: var(--text-muted);">Tạm tính:</span>
            <span id="drawer-subtotal-price" style="font-size: 1.25rem; font-weight: 800; color: var(--primary); font-family: var(--font-heading);">0 ₫</span>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <a href="cart.html" class="btn btn-outline" style="flex: 1; text-align: center;">Xem Chi Tiết</a>
            <a href="checkout.html" id="drawer-checkout-btn" class="btn btn-primary" style="flex: 1.2; text-align: center;">Thanh Toán ➔</a>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", drawerMarkup);
    this.updateBadges();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Cart.initDrawerUI();
});

window.Cart = Cart;
