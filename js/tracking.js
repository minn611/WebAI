/* ==========================================================================
   TEAJOY STORE - REAL-TIME ORDER TRACKING LOGIC
   ========================================================================== */

const OrderTracking = {
  activeOrder: null,

  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("id");

    if (orderId) {
      const searchInput = document.getElementById("tracking-search-input");
      if (searchInput) searchInput.value = orderId;
      this.lookupOrder(orderId);
    } else {
      // If user is logged in, try loading their latest order
      const user = typeof Auth !== "undefined" ? Auth.getCurrentUser() : null;
      if (user && (user.phone || user.fullName)) {
        const userOrders = DB.getOrders().filter(o => 
          (user.phone && (o.customerPhone === user.phone || o.phone === user.phone)) || 
          (user.fullName && (o.customerName === user.fullName || o.name === user.fullName))
        );
        if (userOrders.length > 0) {
          this.renderOrderDetails(userOrders[0]);
          return;
        }
      }

      // If no user orders found or guest, show search prompt
      const resultEl = document.getElementById("tracking-result-box");
      if (resultEl) {
        resultEl.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem;">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">📦</div>
            <h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Tra Cứu Đơn Hàng Của Bạn</h4>
            <p class="text-sm text-muted">Vui lòng nhập Mã đơn hàng (ví dụ: TS-8942) hoặc Số điện thoại vào ô tìm kiếm trên để theo dõi tiến độ giao hàng.</p>
          </div>
        `;
      }
    }
  },

  search() {
    const input = document.getElementById("tracking-search-input");
    if (!input) return;
    const query = input.value.trim().toUpperCase();
    if (!query) {
      Toast.warning("Vui lòng nhập Mã đơn hàng hoặc Số điện thoại!");
      return;
    }

    this.lookupOrder(query);
  },

  async lookupOrder(query) {
    let found = null;

    const isPhone = /^[0-9]{9,11}$/.test(query.replace(/\s+/g, ''));

    // 1. Thử tra cứu trực tiếp thời gian thực từ Backend API Server (MySQL)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      let endpoint = `http://localhost:5000/api/orders/${encodeURIComponent(query)}`;
      if (isPhone) {
        endpoint = `http://localhost:5000/api/orders/customer/${encodeURIComponent(query)}`;
      }
      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.success) {
        if (data.order || data.data) {
          found = Array.isArray(data.data) ? data.data[0] : (data.order || data.data);
        } else if (Array.isArray(data.orders) && data.orders.length > 0) {
          found = data.orders[0];
        }
        if (found) {
          DB.saveOrder(found);
        }
      }
    } catch (e) {
      // Backend offline hoặc timeout -> fallback sang LocalStorage
    }

    // 2. Fallback sang LocalStorage nếu không có từ API
    if (!found) {
      const orders = DB.getOrders();
      found = orders.find(o => 
        (o.id && o.id.toUpperCase() === query.toUpperCase()) || 
        (o.orderId && o.orderId.toUpperCase() === query.toUpperCase()) ||
        (o.customerPhone && o.customerPhone.trim() === query.trim()) ||
        (o.phone && o.phone.trim() === query.trim())
      );
    }

    if (!found) {
      const resultEl = document.getElementById("tracking-result-box");
      if (resultEl) {
        resultEl.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem;">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">🔍</div>
            <h4>Không tìm thấy đơn hàng "${query}"</h4>
            <p class="text-sm text-muted">Vui lòng kiểm tra lại mã đơn hàng (ví dụ: TS-8942) hoặc số điện thoại.</p>
          </div>
        `;
      }
      Toast.error("Không tìm thấy thông tin đơn hàng này!");
      return;
    }

    this.renderOrderDetails(found);
  },

  renderOrderDetails(order) {
    this.activeOrder = order;
    const resultEl = document.getElementById("tracking-result-box");
    if (!resultEl) return;

    const stages = [
      { key: "pending", label: "Chờ xác nhận", icon: "📋" },
      { key: "confirmed", label: "Đã duyệt đơn", icon: "✅" },
      { key: "preparing", label: "Đang pha chế", icon: "🧋" },
      { key: "shipping", label: "Đang giao hàng", icon: "🛵" },
      { key: "completed", label: "Giao thành công", icon: "🎉" }
    ];

    const currentStageIndex = stages.findIndex(s => s.key === order.orderStatus);
    const isCancelled = order.orderStatus === "cancelled";

    let progressWidth = "0%";
    if (!isCancelled && currentStageIndex >= 0) {
      progressWidth = `${(currentStageIndex / (stages.length - 1)) * 90}%`;
    }

    resultEl.innerHTML = `
      <div class="card" style="padding: 2rem;">
        <!-- Header status -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span class="text-xs text-muted">MÃ ĐƠN HÀNG</span>
            <h3 style="font-size: 1.4rem; color: var(--primary); font-family: var(--font-heading); margin-top: 2px;">#${order.id}</h3>
            <span class="text-xs text-muted">Đặt lúc: ${Formatters.dateTime(order.createdAt)}</span>
          </div>
          <div style="text-align: right;">
            <div style="margin-bottom: 4px;">${Formatters.orderStatusBadge(order.orderStatus)}</div>
            <span class="text-xs text-muted">Thanh toán: <b>${Formatters.paymentMethodName(order.paymentMethod)}</b> (${order.paymentStatus === 'paid' ? 'Đã TT' : 'Chưa TT'})</span>
          </div>
        </div>

        <!-- Animated Timeline -->
        ${!isCancelled ? `
          <div class="tracking-timeline">
            <div class="tracking-progress-bar" style="width: ${progressWidth};"></div>
            ${stages.map((st, idx) => {
              const isCompleted = idx <= currentStageIndex;
              const isActive = idx === currentStageIndex;
              return `
                <div class="timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
                  <div class="step-icon-wrap">${st.icon}</div>
                  <div class="step-label">${st.label}</div>
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <div style="background-color: var(--status-cancelled-bg); color: var(--status-cancelled); padding: 1.25rem; border-radius: var(--radius-md); margin-block: 1.5rem; text-align: center; font-weight: 700;">
            ⚠️ Đơn hàng này đã bị hủy!
          </div>
        `}

        <!-- Customer & Delivery info -->
        <div class="grid grid-cols-2 gap-4" style="margin-bottom: 1.75rem; background-color: var(--bg-subtle); padding: 1.25rem; border-radius: var(--radius-md);">
          <div>
            <h5 style="font-size: 0.95rem; margin-bottom: 0.4rem;">📍 Thông tin giao hàng</h5>
            <p class="text-sm" style="margin: 0; color: var(--text-main);"><b>${order.customerName}</b> - ${order.customerPhone}</p>
            <p class="text-sm text-muted" style="margin-top: 2px;">${order.customerAddress}</p>
            ${order.note ? `<p class="text-xs" style="color: var(--primary); margin-top: 4px;">Ghi chú: ${order.note}</p>` : ''}
          </div>
          <div>
            <h5 style="font-size: 0.95rem; margin-bottom: 0.4rem;">🛵 Shipper phụ trách</h5>
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--primary-bg); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">🛵</div>
              <div>
                <div class="text-sm font-semibold">Nguyễn Hữu Tài (Đô Đô Express)</div>
                <div class="text-xs text-muted">SĐT: 0909.888.777 | Biển số: 59-P1 988.22</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Ordered Items -->
        <h5 style="margin-bottom: 0.75rem;">Món đã đặt (${(order.items || []).length})</h5>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
          ${(order.items || []).map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.6rem; border-bottom: 1px dashed var(--border-subtle);">
              <div>
                <span class="font-semibold text-sm">${item.name}</span>
                <span class="text-xs text-muted"> (Size ${item.size}, ${item.sugar} đường, ${item.ice} đá)</span>
                ${item.toppings && item.toppings.length ? `<div class="text-xs text-primary">+ ${item.toppings.join(", ")}</div>` : ''}
              </div>
              <div class="text-right">
                <span class="text-xs text-muted">x${item.quantity}</span>
                <span style="font-weight: 700; color: var(--primary); margin-left: 0.75rem;">${Formatters.currency(item.subtotal)}</span>
              </div>
            </div>
          `).join("")}
        </div>

        <!-- Price Summary -->
        <div style="border-top: 1.5px solid var(--border-color); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.4rem; max-width: 320px; margin-left: auto;">
          <div class="flex justify-between text-sm">
            <span class="text-muted">Tiền món:</span>
            <span>${Formatters.currency(order.itemsTotal)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted">Phí giao hàng:</span>
            <span>${Formatters.currency(order.shippingFee)}</span>
          </div>
          ${order.discount > 0 ? `
            <div class="flex justify-between text-sm text-secondary">
              <span>Giảm giá (${order.voucherCode}):</span>
              <span>-${Formatters.currency(order.discount)}</span>
            </div>
          ` : ''}
          <div class="flex justify-between font-bold" style="font-size: 1.15rem; color: var(--primary); margin-top: 0.25rem;">
            <span>Tổng thanh toán:</span>
            <span>${Formatters.currency(order.totalAmount)}</span>
          </div>
        </div>

        <!-- Simulation action controls for demo -->
        <div style="margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="text-xs text-muted">⚡ Thử nghiệm đổi trạng thái:</span>
            <button class="btn btn-sm btn-outline" onclick="OrderTracking.simulateNextStatus('${order.id}')">Tiến 1 bước ⏩</button>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            ${order.orderStatus === 'pending' ? `
              <button class="btn btn-sm btn-danger" onclick="OrderTracking.cancelOrder('${order.id}')">Hủy đơn hàng</button>
            ` : ''}
            <button class="btn btn-sm btn-primary" onclick="OrderTracking.reorder('${order.id}')">Đặt lại đơn này 🧋</button>
          </div>
        </div>

      </div>
    `;
  },

  simulateNextStatus(orderId) {
    const order = DB.getOrderById(orderId);
    if (!order) return;

    const stages = ["pending", "confirmed", "preparing", "shipping", "completed"];
    const currIdx = stages.indexOf(order.orderStatus);
    if (currIdx < stages.length - 1) {
      const nextStatus = stages[currIdx + 1];
      DB.updateOrderStatus(orderId, nextStatus);
      Toast.success(`Đã chuyển trạng thái đơn sang: <b>${nextStatus.toUpperCase()}</b>`);
      this.lookupOrder(orderId);
    } else {
      Toast.info("Đơn hàng đã hoàn thành trọn vẹn!");
    }
  },

  cancelOrder(orderId) {
    if (confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) {
      DB.updateOrderStatus(orderId, "cancelled");
      Toast.warning("Đã hủy đơn hàng!");
      this.lookupOrder(orderId);
    }
  },

  reorder(orderId) {
    const order = DB.getOrderById(orderId);
    if (!order) return;
    order.items.forEach(item => {
      Cart.addItem(item);
    });
    Toast.success("Đã thêm các món vào giỏ hàng!");
    Cart.openDrawer();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  OrderTracking.init();
});

window.OrderTracking = OrderTracking;
