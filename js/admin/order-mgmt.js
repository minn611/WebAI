/* ==========================================================================
   TEAJOY STORE - ORDER MANAGEMENT & POS RECEIPT PRINT CONTROLLER
   ========================================================================== */

const OrderMgmt = {
  currentStatus: "all",

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("id");

    await this.syncOrdersFromAPI();
    this.renderOrdersTable();
    this.updateStatusCounts();
    this.initSearch();

    if (orderId) {
      setTimeout(() => {
        this.openOrderDetail(orderId);
      }, 200);
    }
  },

  async syncOrdersFromAPI() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch("http://localhost:5000/api/orders", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      const orderList = data.success && (Array.isArray(data.orders) ? data.orders : (Array.isArray(data.data) ? data.data : null));
      if (orderList) {
        orderList.forEach(o => {
          const normalized = {
            id: o.id || o.orderId,
            customerName: o.customerName,
            customerPhone: o.customerPhone || o.phone,
            customerAddress: o.customerAddress || o.address,
            note: o.note || o.notes || "",
            items: o.items || [],
            itemsTotal: parseFloat(o.itemsTotal || 0),
            shippingFee: parseFloat(o.shippingFee || 0),
            discount: parseFloat(o.discount || o.discountAmount || 0),
            voucherCode: o.voucherCode || "",
            totalAmount: parseFloat(o.totalAmount || 0),
            paymentMethod: o.paymentMethod || "cod",
            paymentStatus: o.paymentStatus || "pending",
            orderStatus: o.orderStatus || o.status || "pending",
            createdAt: o.createdAt
          };
          DB.saveOrder(normalized);
        });
      }
    } catch (err) {
      // Offline fallback
    }
  },

  async refresh() {
    await this.syncOrdersFromAPI();
    this.renderOrdersTable();
    this.updateStatusCounts();
    Toast.info("Đã làm mới danh sách đơn hàng từ CSDL.");
  },

  filterStatus(status) {
    this.currentStatus = status;
    document.querySelectorAll("#order-status-tabs .cat-chip").forEach(btn => {
      btn.classList.toggle("active", btn.textContent.toLowerCase().includes(status) || (status === "all" && btn.textContent.includes("Tất cả")));
    });
    this.renderOrdersTable();
  },

  updateStatusCounts() {
    const orders = DB.getOrders();
    const countAll = document.getElementById("count-all");
    const countPending = document.getElementById("count-pending");
    const countConfirmed = document.getElementById("count-confirmed");
    const countPreparing = document.getElementById("count-preparing");
    const countShipping = document.getElementById("count-shipping");
    const countCompleted = document.getElementById("count-completed");
    const countCancelled = document.getElementById("count-cancelled");

    if (countAll) countAll.textContent = orders.length;
    if (countPending) countPending.textContent = orders.filter(o => o.orderStatus === "pending").length;
    if (countConfirmed) countConfirmed.textContent = orders.filter(o => o.orderStatus === "confirmed").length;
    if (countPreparing) countPreparing.textContent = orders.filter(o => o.orderStatus === "preparing").length;
    if (countShipping) countShipping.textContent = orders.filter(o => o.orderStatus === "shipping").length;
    if (countCompleted) countCompleted.textContent = orders.filter(o => o.orderStatus === "completed").length;
    if (countCancelled) countCancelled.textContent = orders.filter(o => o.orderStatus === "cancelled").length;
  },

  initSearch() {
    const searchInput = document.getElementById("admin-order-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => this.renderOrdersTable());
    }
  },

  renderOrdersTable() {
    const tbody = document.getElementById("admin-orders-tbody");
    if (!tbody) return;

    let orders = DB.getOrders();
    const query = document.getElementById("admin-order-search")?.value.trim().toLowerCase();

    if (this.currentStatus !== "all") {
      orders = orders.filter(o => o.orderStatus === this.currentStatus);
    }
    if (query) {
      orders = orders.filter(o => o.id.toLowerCase().includes(query) || o.customerName.toLowerCase().includes(query) || o.customerPhone.includes(query));
    }

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2rem;">Không có đơn hàng nào phù hợp.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td class="font-bold text-primary">#${o.id}</td>
        <td class="text-xs text-muted">${Formatters.dateTime(o.createdAt)}</td>
        <td>
          <div class="font-bold">${o.customerName}</div>
          <span class="text-xs text-muted">${o.customerPhone}</span>
        </td>
        <td>
          <div class="text-xs" style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.customerAddress}">
            ${o.customerAddress}
          </div>
        </td>
        <td class="font-bold" style="color: var(--primary);">${Formatters.currency(o.totalAmount)}</td>
        <td>
          <span class="badge ${o.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}">
            ${o.paymentStatus === 'paid' ? 'Đã TT' : 'Chưa TT'} (${o.paymentMethod.toUpperCase()})
          </span>
        </td>
        <td>${Formatters.orderStatusBadge(o.orderStatus)}</td>
        <td style="text-align: center;">
          <div class="table-actions" style="justify-content: center; gap: 0.35rem;">
            <button class="action-icon-btn btn-view" onclick="OrderMgmt.openOrderDetail('${o.id}')" title="Xem chi tiết & Chuyển trạng thái">👁️</button>
            <button class="action-icon-btn btn-edit" onclick="OrderMgmt.openEditOrderModal('${o.id}')" title="Chỉnh sửa thông tin đơn">✏️</button>
            <button class="action-icon-btn btn-print" onclick="OrderMgmt.printReceipt('${o.id}')" title="In Hóa Đơn 80mm">🖨️</button>
            <button class="action-icon-btn btn-del" onclick="OrderMgmt.deleteOrder('${o.id}')" title="Xóa đơn hàng">🗑️</button>
          </div>
        </td>
      </tr>
    `).join("");
  },

  openOrderDetail(orderId) {
    const order = DB.getOrderById(orderId);
    if (!order) return;

    document.getElementById("detail-modal-title").innerHTML = `Đơn Hàng: <span style="color: var(--primary);">#${order.id}</span>`;

    const bodyEl = document.getElementById("detail-modal-body");
    bodyEl.innerHTML = `
      <!-- Status Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; background-color: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md);">
        <div>
          <span class="text-xs text-muted">Trạng thái hiện tại:</span>
          <div style="margin-top: 2px;">${Formatters.orderStatusBadge(order.orderStatus)}</div>
        </div>
        <div style="text-align: right;">
          <span class="text-xs text-muted">Thời gian đặt:</span>
          <div class="font-semibold text-sm">${Formatters.dateTime(order.createdAt)}</div>
        </div>
      </div>

      <!-- Customer Info -->
      <div style="margin-bottom: 1.25rem;">
        <h5 style="margin-bottom: 0.35rem;">Khách Hàng: <b>${order.customerName}</b> (${order.customerPhone})</h5>
        <p class="text-sm text-muted" style="margin: 0;">📍 Địa chỉ: ${order.customerAddress}</p>
        ${order.note ? `<p class="text-xs" style="color: var(--primary); margin-top: 4px;">📝 Ghi chú: ${order.note}</p>` : ''}
      </div>

      <!-- Items List -->
      <h5 style="margin-bottom: 0.5rem;">Danh Sách Món (${order.items.length})</h5>
      <div style="display: flex; flex-direction: column; gap: 0.65rem; max-height: 200px; overflow-y: auto; margin-bottom: 1.25rem; padding-right: 4px;">
        ${order.items.map(item => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-subtle);">
            <div>
              <span class="font-bold text-sm">${item.name}</span>
              <span class="text-xs text-muted">(Size ${item.size}, ${item.sugar} đường, ${item.ice} đá)</span>
              ${item.toppings.length ? `<div class="text-xs text-primary">+ ${item.toppings.join(", ")}</div>` : ''}
            </div>
            <div style="text-align: right;">
              <span class="text-xs text-muted">x${item.quantity}</span>
              <span class="font-bold text-sm" style="color: var(--primary); margin-left: 0.5rem;">${Formatters.currency(item.subtotal)}</span>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Financials -->
      <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem;">
        <div class="flex justify-between text-sm"><span class="text-muted">Tiền món:</span><span>${Formatters.currency(order.itemsTotal)}</span></div>
        <div class="flex justify-between text-sm"><span class="text-muted">Phí ship:</span><span>${Formatters.currency(order.shippingFee)}</span></div>
        ${order.discount > 0 ? `<div class="flex justify-between text-sm text-secondary"><span>Giảm giá (${order.voucherCode}):</span><span>-${Formatters.currency(order.discount)}</span></div>` : ''}
        <div class="flex justify-between font-bold" style="font-size: 1.15rem; color: var(--primary); margin-top: 0.25rem;">
          <span>Tổng thanh toán:</span>
          <span>${Formatters.currency(order.totalAmount)}</span>
        </div>
      </div>
    `;

    // Render action buttons based on status
    const footerEl = document.getElementById("detail-modal-footer");
    footerEl.innerHTML = `
      <button class="btn btn-outline" onclick="OrderMgmt.printReceipt('${order.id}')">🖨️ In Hóa Đơn</button>
      ${order.orderStatus === 'pending' ? `
        <button class="btn btn-primary" onclick="OrderMgmt.updateStatus('${order.id}', 'confirmed')">✓ Duyệt Đơn Này</button>
        <button class="btn btn-danger" onclick="OrderMgmt.updateStatus('${order.id}', 'cancelled')">✕ Hủy Đơn</button>
      ` : ''}
      ${order.orderStatus === 'confirmed' ? `
        <button class="btn btn-primary" onclick="OrderMgmt.updateStatus('${order.id}', 'preparing')">🧋 Bắt Đầu Pha Chế</button>
      ` : ''}
      ${order.orderStatus === 'preparing' ? `
        <button class="btn btn-primary" onclick="OrderMgmt.updateStatus('${order.id}', 'shipping')">🛵 Giao Cho Shipper</button>
      ` : ''}
      ${order.orderStatus === 'shipping' ? `
        <button class="btn btn-secondary" onclick="OrderMgmt.updateStatus('${order.id}', 'completed')">🎉 Xác Nhận Giao Thành Công</button>
      ` : ''}
    `;

    Modal.open("order-detail-modal");
  },

  async updateStatus(orderId, newStatus) {
    DB.updateOrderStatus(orderId, newStatus);
    try {
      await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      // Offline mode fallback
    }
    Toast.success(`Đã cập nhật đơn #${orderId} sang: <b>${newStatus.toUpperCase()}</b>`);
    this.renderOrdersTable();
    this.updateStatusCounts();
    this.openOrderDetail(orderId);
  },

  // 1-Click Print 80mm POS Receipt
  printReceipt(orderId) {
    const order = DB.getOrderById(orderId);
    if (!order) return;

    const receiptEl = document.getElementById("pos-receipt-print");
    if (!receiptEl) return;

    receiptEl.innerHTML = `
      <div class="receipt-header">
        <div class="receipt-title">TRÀ SỮA ĐÔ ĐÔ</div>
        <div>123 Nguyễn Huệ, Quận 1, TP.HCM</div>
        <div>Hotline: 1900 8888</div>
        <div style="margin-top: 6px; font-weight: bold;">HÓA ĐƠN THANH TOÁN</div>
        <div>Mã đơn: <b>#${order.id}</b></div>
        <div>Ngày: ${Formatters.dateTime(order.createdAt)}</div>
      </div>

      <div style="font-size: 11px; margin-bottom: 6px;">
        <div>Khách: <b>${order.customerName}</b> - ${order.customerPhone}</div>
        <div>Đ/c: ${order.customerAddress}</div>
        ${order.note ? `<div>Ghi chú: ${order.note}</div>` : ''}
      </div>

      <table class="receipt-table">
        <thead>
          <tr style="border-bottom: 1px dashed #000;">
            <th>Tên món</th>
            <th class="qty">SL</th>
            <th class="price">T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td>
                <div><b>${item.name}</b> (Size ${item.size})</div>
                <div style="font-size: 10px;">${item.sugar} đường, ${item.ice} đá</div>
                ${item.toppings.length ? `<div style="font-size: 10px;">+ ${item.toppings.join(", ")}</div>` : ''}
              </td>
              <td class="qty">${item.quantity}</td>
              <td class="price">${Formatters.currency(item.subtotal)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="border-top: 1px dashed #000; padding-top: 6px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Tiền món:</span><span>${Formatters.currency(order.itemsTotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Phí ship:</span><span>${Formatters.currency(order.shippingFee)}</span>
        </div>
        ${order.discount > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Giảm giá:</span><span>-${Formatters.currency(order.discount)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 4px;">
          <span>TỔNG CỘNG:</span><span>${Formatters.currency(order.totalAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span>Hình thức TT:</span><span>${order.paymentMethod.toUpperCase()} (${order.paymentStatus === 'paid' ? 'ĐÃ TT' : 'CHƯA TT'})</span>
        </div>
      </div>

      <div class="receipt-footer">
        <div>Cảm ơn quý khách & Hẹn gặp lại!</div>
        <div>Wifi: TeaJoy_Free / Pass: 88888888</div>
      </div>
    `;

    window.print();
  },

  // --------------------------------------------------------------------------
  // Delete Order
  // --------------------------------------------------------------------------
  async deleteOrder(orderId) {
    if (confirm(`Bạn có chắc muốn xóa đơn hàng #${orderId} khỏi hệ thống?`)) {
      let orders = DB.getOrders();
      orders = orders.filter(o => o.id !== orderId);
      DB.saveOrders(orders);
      
      try {
        await fetch(`http://localhost:5000/api/orders/${orderId}`, { method: "DELETE" });
      } catch (err) {}

      Toast.info(`Đã xóa đơn hàng #${orderId}.`);
      this.renderOrdersTable();
      this.updateStatusCounts();
      Modal.close("order-detail-modal");
    }
  },

  // --------------------------------------------------------------------------
  // Edit Order Modal & Save
  // --------------------------------------------------------------------------
  openEditOrderModal(orderId) {
    const order = DB.getOrderById(orderId);
    if (!order) return;

    document.getElementById("edit-order-id").value = order.id;
    document.getElementById("edit-order-name").value = order.customerName || "";
    document.getElementById("edit-order-phone").value = order.customerPhone || "";
    document.getElementById("edit-order-address").value = order.customerAddress || "";
    document.getElementById("edit-order-status").value = order.orderStatus || "pending";
    document.getElementById("edit-order-payment-status").value = order.paymentStatus || "unpaid";
    document.getElementById("edit-order-note").value = order.note || "";

    Modal.open("order-edit-modal");
  },

  async saveOrderEditSubmit(e) {
    e.preventDefault();
    const orderId = document.getElementById("edit-order-id").value;
    const customerName = document.getElementById("edit-order-name").value.trim();
    const customerPhone = document.getElementById("edit-order-phone").value.trim();
    const customerAddress = document.getElementById("edit-order-address").value.trim();
    const orderStatus = document.getElementById("edit-order-status").value;
    const paymentStatus = document.getElementById("edit-order-payment-status").value;
    const note = document.getElementById("edit-order-note").value.trim();

    let orders = DB.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      orders[idx] = {
        ...orders[idx],
        customerName,
        customerPhone,
        customerAddress,
        orderStatus,
        paymentStatus,
        note
      };
      DB.saveOrders(orders);

      try {
        await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: orderStatus, paymentStatus })
        });
      } catch (err) {}

      Toast.success(`Đã cập nhật thông tin đơn hàng <b>#${orderId}</b> thành công!`);
      Modal.close("order-edit-modal");
      this.renderOrdersTable();
      this.updateStatusCounts();
    }
  },

  // --------------------------------------------------------------------------
  // Create Order POS Modal & Save
  // --------------------------------------------------------------------------
  openCreateOrderModal() {
    const products = DB.getProducts();
    const selectEl = document.getElementById("create-order-product");
    if (selectEl) {
      selectEl.innerHTML = products.map(p => `
        <option value="${p.id}" data-name="${p.name}" data-price="${p.price}">
          ${p.name} - ${Formatters.currency(p.price)}
        </option>
      `).join("");
    }
    document.getElementById("create-order-name").value = "Khách lẻ tại quầy";
    document.getElementById("create-order-phone").value = "0901234567";
    document.getElementById("create-order-address").value = "Uống tại quán / Mang đi";
    document.getElementById("create-order-qty").value = "1";
    document.getElementById("create-order-note").value = "";
    
    Modal.open("order-create-modal");
  },

  async saveCreateOrderSubmit(e) {
    e.preventDefault();
    const customerName = document.getElementById("create-order-name").value.trim();
    const customerPhone = document.getElementById("create-order-phone").value.trim();
    const customerAddress = document.getElementById("create-order-address").value.trim();
    const prodSelect = document.getElementById("create-order-product");
    const productId = prodSelect.value;
    const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
    const productName = selectedOpt.getAttribute("data-name");
    const productPrice = parseInt(selectedOpt.getAttribute("data-price")) || 25000;
    const quantity = parseInt(document.getElementById("create-order-qty").value) || 1;
    const paymentMethod = document.getElementById("create-order-payment-method").value;
    const orderStatus = document.getElementById("create-order-init-status").value;
    const note = document.getElementById("create-order-note").value.trim();

    const orderId = `POS-${Date.now().toString().slice(-6)}`;
    const itemsTotal = productPrice * quantity;
    const totalAmount = itemsTotal;

    const newOrder = {
      id: orderId,
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'paid' : 'unpaid',
      orderStatus,
      itemsTotal,
      shippingFee: 0,
      discount: 0,
      totalAmount,
      note,
      createdAt: new Date().toISOString(),
      items: [
        {
          productId,
          name: productName,
          size: "M",
          sugar: "100%",
          ice: "100%",
          toppings: [],
          quantity,
          unitPrice: productPrice,
          subtotal: itemsTotal
        }
      ]
    };

    let orders = DB.getOrders();
    orders.unshift(newOrder);
    DB.saveOrders(orders);

    try {
      await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder)
      });
    } catch (err) {}

    Toast.success(`🎉 Đã tạo thành công đơn hàng tại quầy: <b>#${orderId}</b>!`);
    Modal.close("order-create-modal");
    this.renderOrdersTable();
    this.updateStatusCounts();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  OrderMgmt.init();
});
