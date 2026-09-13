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
    } else {
      // Fallback: check sessionStorage for voucher persisted from cart page
      const pendingVoucher = sessionStorage.getItem('dodo_pending_voucher');
      if (pendingVoucher) {
        try {
          const parsed = JSON.parse(pendingVoucher);
          this.appliedVoucher = parsed;
          const vInput = document.getElementById("voucher-input");
          if (vInput) vInput.value = parsed.code || '';
          // Show discount immediately without re-validating (already validated on cart page)
          this.calculateFinalTotals();
        } catch (e) {
          console.warn('Invalid pending voucher in sessionStorage');
        }
      }
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

  async applyVoucherCode() {
    const input = document.getElementById("voucher-input");
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) {
      this.appliedVoucher = null;
      Toast.warning("Vui lòng nhập mã giảm giá!");
      this.calculateFinalTotals();
      return;
    }

    const itemsTotal = Cart.getItemsTotal();

    try {
      const response = await fetch("http://localhost:5000/api/vouchers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, totalAmount: itemsTotal })
      });
      const data = await response.json();

      if (data.success && data.voucher) {
        this.appliedVoucher = {
          code: data.voucher.code,
          discountAmount: data.voucher.discountAmount,
          description: data.voucher.description
        };
        Toast.success(data.message || `Áp dụng mã <b>${data.voucher.code}</b> thành công!`);
        this.calculateFinalTotals();
        return;
      } else if (data.message) {
        this.appliedVoucher = null;
        Toast.error(data.message);
        this.calculateFinalTotals();
        return;
      }
    } catch (err) {
      console.warn("Backend voucher API offline, falling back to local DB...");
    }

    // Local DB Fallback
    const vouchers = DB.getVouchers();
    const found = vouchers.find(v => v.code === code);

    if (!found) {
      this.appliedVoucher = null;
      Toast.error("Mã giảm giá không hợp lệ hoặc đã hết hạn!");
      this.calculateFinalTotals();
      return;
    }

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

  sessionOrderId: null,

  copyTransferMemo() {
    const memo = `DODO ${this.sessionOrderId || "THANHTOAN"}`;
    navigator.clipboard.writeText(memo).then(() => {
      Toast.success(`Đã sao chép nội dung: <b>${memo}</b>`);
    }).catch(() => {
      Toast.info(`Nội dung chuyển: ${memo}`);
    });
  },

  viewOriginalQRModal() {
    const modalHtml = `
      <div style="text-align: center; padding: 1rem 0.5rem;">
        <div style="font-weight: 700; font-size: 1.15rem; color: #00529C; margin-bottom: 0.25rem;">Thẻ Chuyển Khoản VietinBank Chính Thức</div>
        <p class="text-xs text-muted" style="margin-bottom: 1rem;">Quét trực tiếp qua App ngân hàng hoặc lưu ảnh về máy</p>
        <div style="max-width: 320px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 82, 156, 0.25); border: 2px solid #00529C;">
          <img src="images/vietinbank-qr.png" alt="Thẻ QR VietinBank NGO MANH HIEU" style="width: 100%; height: auto; display: block;">
        </div>
        <div style="margin-top: 1.25rem; font-size: 0.85rem; background: #F0F6FF; border-radius: 8px; padding: 10px; text-align: left; max-width: 320px; margin-inline: auto;">
          <div>🏦 <b>VietinBank</b> - CN TIEN SON - HOI SO</div>
          <div>👤 Chủ TK: <b>NGO MANH HIEU</b></div>
          <div>💳 STK / Alias: <b>0868870869</b></div>
        </div>
        <button class="btn btn-primary" style="margin-top: 1.25rem; width: 100%; max-width: 320px;" onclick="Modal.close('custom-qr-modal')">Đã Hiểu & Đóng</button>
      </div>
    `;

    let modalEl = document.getElementById("custom-qr-modal");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "custom-qr-modal";
      modalEl.className = "modal-overlay";
      modalEl.innerHTML = `<div class="modal-card" style="max-width: 400px; padding: 1.5rem;"><div id="custom-qr-modal-body"></div></div>`;
      document.body.appendChild(modalEl);
    }
    document.getElementById("custom-qr-modal-body").innerHTML = modalHtml;
    Modal.open("custom-qr-modal");
  },

  async notifyTransferCompleted(isAutoFromSubmit = false) {
    const { finalTotal } = this.calculateFinalTotals();
    const name = document.getElementById("checkout-name")?.value.trim() || "Khách Hàng Trực Tuyến";
    const phone = document.getElementById("checkout-phone")?.value.trim() || "";
    const note = document.getElementById("checkout-note")?.value.trim() || "";
    const orderCode = this.sessionOrderId || "TS-" + Math.floor(1000 + Math.random() * 9000);

    const payload = {
      orderId: orderCode,
      customerName: name,
      customerPhone: phone,
      amount: finalTotal,
      bankName: "VietinBank (CN Tiên Sơn)",
      accountNumber: "0868870869",
      accountName: "NGO MANH HIEU",
      note: `DODO ${orderCode} - ${name} (${phone})`
    };

    // 1. Broadcast sự kiện realtime đa kênh qua LocalStorage & BroadcastChannel
    try {
      localStorage.setItem("dodo_latest_transfer_notification", JSON.stringify({ ...payload, timestamp: Date.now() }));
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("dodo_notifications");
        bc.postMessage({ type: "TRANSFER_NOTIFICATION", data: payload });
        bc.close();
      }
    } catch (e) {}

    // 2. Gửi API máy chủ Backend
    try {
      await fetch("http://localhost:5000/api/notifications/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.log("Backend offline, transfer notification broadcasted locally");
    }

    if (!isAutoFromSubmit) {
      Toast.success(`🔔 Đã gửi thông báo chuyển khoản thành công tới Quản lý & Nhân viên quán! Mã đơn: <b>${orderCode}</b>`);
    }
  },

  updatePaymentDetails(total) {
    if (!this.sessionOrderId) {
      this.sessionOrderId = Formatters.generateOrderId();
    }

    const memoDisplay = document.getElementById("vietqr-memo-display");
    if (memoDisplay) memoDisplay.textContent = `DODO ${this.sessionOrderId}`;

    const qrImg = document.getElementById("vietqr-img");
    const qrAmount = document.getElementById("vietqr-amount");
    if (qrAmount) qrAmount.textContent = Formatters.currency(total);
    if (qrImg) {
      // Chuẩn VietQR động VietinBank với STK 0868870869 và tên NGO MANH HIEU
      qrImg.src = `https://img.vietqr.io/image/vietinbank-0868870869-compact2.png?amount=${total}&addInfo=DODO%20${this.sessionOrderId}&accountName=NGO%20MANH%20HIEU`;
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
    const orderId = this.sessionOrderId || Formatters.generateOrderId();

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
      paymentStatus: this.paymentMethod === "vietqr" ? "cho_thanh_toan" : "pending",
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

    // Gửi thông báo chuyển khoản nếu chọn phương thức VietQR
    if (this.paymentMethod === "vietqr") {
      this.notifyTransferCompleted(true);
    }

    // Gửi thông báo thao tác lên terminal máy chủ
    if (typeof AuditLogger !== "undefined") {
      AuditLogger.notifyServer(
        `ĐẶT ĐƠN HÀNG TRỰC TUYẾN #${orderId}`,
        `Khách: ${name} (${phone}) | Tổng tiền: ${Formatters.currency(finalTotal)} | PT: ${this.paymentMethod.toUpperCase()} | ${cart.map(i => `${i.name} (x${i.quantity})`).join(', ')}`
      );
    }

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
