/* ==========================================================================
   TEAJOY STORE - CHECKOUT LOGIC & VIETQR PAYMENT
   ========================================================================== */

const Checkout = {
  appliedVoucher: null,
  shippingFee: 15000,
  paymentMethod: "vietqr",

  init() {
    this.renderOrderSummary();
    this.initEventListeners();
    this.fillCurrentUserAddress();

    const urlParams = new URLSearchParams(window.location.search);
    const voucherParam = urlParams.get("voucher");
    if (voucherParam) {
      const vInput = document.getElementById("voucher-input");
      if (vInput) vInput.value = voucherParam;
      this.applyVoucherCode();
    }
  },

  fillCurrentUserAddress() {
    const user = Auth.getCurrentUser();
    if (user) {
      const nameInput = document.getElementById("checkout-name");
      const phoneInput = document.getElementById("checkout-phone");
      const addrInput = document.getElementById("checkout-address");
      if (nameInput && !nameInput.value) nameInput.value = user.fullName || "";
      if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || "";
      if (addrInput && !addrInput.value) addrInput.value = user.address || "";
    }
  },

  renderOrderSummary() {
    const container = document.getElementById("checkout-items-list");
    if (!container) return;

    const cart = Cart.getCart();
    if (cart.length === 0) {
      container.innerHTML = `<p class="text-muted text-center" style="padding: 2rem;">Giỏ hàng của bạn đang trống. <a href="menu.html" class="text-primary font-bold">Quay lại chọn món</a></p>`;
      return;
    }

    container.innerHTML = cart.map(item => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px dashed var(--border-subtle);">
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null; this.src='images/products/hong-tra-mochi-keo-dai.jpg';" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover;">
          <div>
            <h5 style="font-size: 0.9rem; font-weight: 700; margin: 0;">${item.name}</h5>
            <span class="text-xs text-muted">Size: ${item.size} | ${item.sugar} đường | ${item.ice} đá</span>
            ${item.toppings.length ? `<div class="text-xs text-primary">+ ${item.toppings.join(", ")}</div>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-size: 0.9rem;">x${item.quantity}</div>
          <div style="font-weight: 800; color: var(--primary); font-size: 0.95rem;">${Formatters.currency(item.subtotal)}</div>
        </div>
      </div>
    `).join("");

    this.calculateFinalTotals();
  },

  calculateFinalTotals() {
    const itemsTotal = Cart.getItemsTotal();
    let discount = 0;

    if (this.appliedVoucher) {
      if (this.appliedVoucher.discountPercent) {
        discount = (itemsTotal * this.appliedVoucher.discountPercent) / 100;
        if (this.appliedVoucher.maxDiscount && discount > this.appliedVoucher.maxDiscount) {
          discount = this.appliedVoucher.maxDiscount;
        }
      } else if (this.appliedVoucher.discountAmount) {
        discount = this.appliedVoucher.discountAmount;
      }
    }

    // Free ship if itemsTotal >= 200,000
    const ship = itemsTotal >= 200000 ? 0 : this.shippingFee;
    const finalTotal = Math.max(0, itemsTotal + ship - discount);

    const subtotalEl = document.getElementById("checkout-subtotal");
    const shipEl = document.getElementById("checkout-shipping");
    const discountEl = document.getElementById("checkout-discount");
    const totalEl = document.getElementById("checkout-final-total");

    if (subtotalEl) subtotalEl.textContent = Formatters.currency(itemsTotal);
    if (shipEl) shipEl.textContent = ship === 0 ? "Miễn phí" : Formatters.currency(ship);
    if (discountEl) discountEl.textContent = discount > 0 ? `-${Formatters.currency(discount)}` : "0 ₫";
    if (totalEl) totalEl.textContent = Formatters.currency(finalTotal);

    this.updatePaymentDetails(finalTotal);
    return { itemsTotal, ship, discount, finalTotal };
  },

  applyVoucherCode() {
    const input = document.getElementById("voucher-input");
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) {
      this.appliedVoucher = null;
      Toast.warning("Vui lòng nhập mã giảm giá!");
      this.calculateFinalTotals();
      return;
    }

    const vouchers = DB.getVouchers();
    const found = vouchers.find(v => v.code === code);

    if (!found) {
      this.appliedVoucher = null;
      Toast.error("Mã giảm giá không hợp lệ hoặc đã hết hạn!");
      this.calculateFinalTotals();
      return;
    }

    const itemsTotal = Cart.getItemsTotal();
    if (found.minOrder && itemsTotal < found.minOrder) {
      this.appliedVoucher = null;
      Toast.warning(`Mã này chỉ áp dụng cho đơn hàng từ ${Formatters.currency(found.minOrder)} trở lên!`);
      this.calculateFinalTotals();
      return;
    }

    this.appliedVoucher = found;
    Toast.success(`Áp dụng mã <b>${found.code}</b> thành công!`);
    this.calculateFinalTotals();
  },

  selectPaymentMethod(method) {
    this.paymentMethod = method;
    document.querySelectorAll(".payment-method-card").forEach(c => {
      c.classList.toggle("active", c.getAttribute("data-method") === method);
    });

    const qrBox = document.getElementById("vietqr-presentation");
    if (qrBox) {
      qrBox.style.display = method === "vietqr" ? "block" : "none";
    }
  },

  updatePaymentDetails(total) {
    const qrImg = document.getElementById("vietqr-img");
    const qrAmount = document.getElementById("vietqr-amount");
    if (qrAmount) qrAmount.textContent = Formatters.currency(total);
    if (qrImg) {
      // Official VietQR QuickLink format (MBBank 0901234567 - TeaJoy Store)
      qrImg.src = `https://img.vietqr.io/image/mbbank-0901234567-compact2.png?amount=${total}&addInfo=DODO%20THANHTOAN&accountName=TRA%20SUA%20DO%20DO`;
    }
  },

  initEventListeners() {
    document.querySelectorAll(".payment-method-card").forEach(c => {
      c.addEventListener("click", () => {
        const method = c.getAttribute("data-method");
        this.selectPaymentMethod(method);
      });
    });
  },

  submitOrder() {
    const cart = Cart.getCart();
    if (cart.length === 0) {
      Toast.error("Giỏ hàng đang trống!");
      return;
    }

    const name = document.getElementById("checkout-name")?.value.trim();
    const phone = document.getElementById("checkout-phone")?.value.trim();
    const address = document.getElementById("checkout-address")?.value.trim();
    const note = document.getElementById("checkout-note")?.value.trim() || "";

    if (!name || !phone || !address) {
      Toast.warning("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng!");
      return;
    }

    // Phone regex check
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      Toast.warning("Số điện thoại không đúng định dạng!");
      return;
    }

    const { itemsTotal, ship, discount, finalTotal } = this.calculateFinalTotals();
    const orderId = Formatters.generateOrderId();

    const newOrder = {
      id: orderId,
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      note,
      items: cart,
      itemsTotal,
      shippingFee: ship,
      discount,
      voucherCode: this.appliedVoucher ? this.appliedVoucher.code : "",
      totalAmount: finalTotal,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentMethod === "vietqr" ? "paid" : "pending",
      orderStatus: "pending",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19)
    };

    // Try posting to Backend API Server (MySQL Database)
    try {
      fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId,
          orderCode: orderId,
          customerName: name,
          phone: phone,
          customerPhone: phone,
          address: address,
          customerAddress: address,
          notes: note,
          note: note,
          items: cart,
          paymentMethod: this.paymentMethod,
          voucherCode: this.appliedVoucher ? this.appliedVoucher.code : "",
          discountAmount: discount,
          discount: discount,
          shippingFee: ship
        })
      }).catch(err => console.log("Backend offline, order saved in LocalStorage"));
    } catch (e) {}

    DB.saveOrder(newOrder);

    // Give loyalty points if customer
    const user = Auth.getCurrentUser();
    if (user) {
      const earnedPoints = Math.floor(finalTotal / 10000);
      user.points = (user.points || 0) + earnedPoints;
      DB.saveUser(user);
    }

    // Clear Cart
    Cart.clearCart();

    // Show success & redirect to tracking
    Toast.success(`🎉 Đặt hàng thành công! Mã đơn: <b>${orderId}</b>`);
    setTimeout(() => {
      window.location.href = `order-tracking.html?id=${orderId}`;
    }, 1200);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Checkout.init();
});

window.Checkout = Checkout;
