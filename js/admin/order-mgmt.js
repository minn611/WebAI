/* ==========================================================================
   TEAJOY STORE - ORDER MANAGEMENT & POS RECEIPT PRINT CONTROLLER
   Hệ thống Quản Lý Đơn Hàng Dành Cho Quản Lý & Nhân Viên Pha Chế
   ========================================================================== */

const OrderMgmt = {
  currentStatus: "all",

  getApiBase() {
    if (typeof APIConfig !== 'undefined' && typeof APIConfig.getBaseUrl === 'function') {
      return APIConfig.getBaseUrl();
    }
    return window.API_BASE || (window.location.origin.includes(':5000') ? '/api' : 'http://localhost:5000/api');
  },

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("id");

    await this.syncOrdersFromAPI();
    this.renderOrdersTable();
    this.updateStatusCounts();
    this.initSearch();
    this.initRealtimeSync();

    if (orderId) {
      setTimeout(() => {
        this.openOrderDetail(orderId);
      }, 50);
    }
    if (urlParams.get("action") === "pos") {
      setTimeout(() => {
        this.openCreateOrderModal();
      }, 200);
    }

    // Tự động kiểm tra và nhận hoá đơn mới từ khách hàng mỗi 4 giây
    if (!this.pollInterval) {
      this.pollInterval = setInterval(async () => {
        const hasChange = await this.syncOrdersFromAPI();
        if (hasChange) {
          this.renderOrdersTable();
          this.updateStatusCounts();
        }
      }, 4000);
    }
  },

  initRealtimeSync() {
    // 1. Lắng nghe BroadcastChannel từ khách hàng đặt hàng hoặc cập nhật trạng thái
    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.broadcastChannel = new BroadcastChannel("trasua_dodo_orders");
        this.broadcastChannel.onmessage = async (e) => {
          if (!e.data) return;
          if (e.data.type === "NEW_ORDER") {
            console.log("[OrderMgmt] Nhận hoá đơn mới từ khách hàng:", e.data.orderId);
            if (typeof AdminNotifications !== "undefined" && typeof AdminNotifications.playNotificationSound === "function") {
              AdminNotifications.playNotificationSound();
            }
            Toast.success(`🔔 Khách hàng vừa đặt hoá đơn mới: <b>#${e.data.orderId}</b>!`);
            await this.syncOrdersFromAPI();
            this.renderOrdersTable();
            this.updateStatusCounts();
          } else if (e.data.type === "ORDER_STATUS_UPDATED" || e.data.type === "ORDER_DELETED") {
            await this.syncOrdersFromAPI();
            this.renderOrdersTable();
            this.updateStatusCounts();
          }
        };
      } catch (err) {}
    }

    // 2. Lắng nghe storage event liên tab trình duyệt
    window.addEventListener("storage", async (e) => {
      if (e.key === "dodo_latest_order_event" && e.newValue) {
        try {
          const evt = JSON.parse(e.newValue);
          if (evt.type === "NEW_ORDER") {
            if (typeof AdminNotifications !== "undefined" && typeof AdminNotifications.playNotificationSound === "function") {
              AdminNotifications.playNotificationSound();
            }
            Toast.success(`🔔 Hoá đơn mới từ khách: <b>#${evt.orderId}</b>!`);
            await this.syncOrdersFromAPI();
            this.renderOrdersTable();
            this.updateStatusCounts();
          }
        } catch (err) {}
      } else if (e.key === "dodo_order_status_changed" || e.key === "teajoy_orders") {
        this.renderOrdersTable();
        this.updateStatusCounts();
      }
    });
  },

  async syncOrdersFromAPI() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${this.getApiBase()}/orders`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      const orderList = data.success && (Array.isArray(data.orders) ? data.orders : (Array.isArray(data.data) ? data.data : null));
      if (orderList && Array.isArray(orderList)) {
        const normalizedList = orderList.map(o => {
          const itemsNormalized = Array.isArray(o.items) ? o.items.map(it => ({
            name: it.name || it.ten_san_pham || "Trà Sữa",
            size: it.size || it.kich_thuoc || "M",
            sugar: it.sugar || it.muc_duong || "100%",
            ice: it.ice || it.muc_da || "100%",
            toppings: Array.isArray(it.toppings) ? it.toppings : (typeof it.toppings === "string" ? [it.toppings] : []),
            quantity: parseInt(it.quantity || it.so_luong || 1),
            unitPrice: parseFloat(it.unitPrice || it.don_gia || 0),
            subtotal: parseFloat(it.subtotal || it.thanh_tien || 0)
          })) : [];

          return {
            id: o.id || o.orderId || `TS-${o.dbId}`,
            orderId: o.id || o.orderId,
            dbId: o.dbId || o.id,
            customerName: o.customerName || o.ten_nguoi_nhan || "Khách Hàng",
            customerPhone: o.customerPhone || o.phone || o.sdt_nguoi_nhan || "",
            customerAddress: o.customerAddress || o.address || o.dia_chi_giao_hang || "Tại quán / Chưa có",
            note: o.note || o.notes || o.ghi_chu || "",
            items: itemsNormalized,
            itemsTotal: parseFloat(o.itemsTotal || 0),
            shippingFee: parseFloat(o.shippingFee || 0),
            discount: parseFloat(o.discount || o.discountAmount || 0),
            voucherCode: o.voucherCode || "",
            totalAmount: parseFloat(o.totalAmount || 0),
            paymentMethod: o.paymentMethod || "cod",
            paymentStatus: o.paymentStatus || "pending",
            orderStatus: o.orderStatus || o.status || o.trang_thai_don_hang || "pending",
            createdAt: o.createdAt || new Date().toISOString()
          };
        });
        if (normalizedList.length > 0) {
          const currentCount = DB.getOrders().length;
          DB.saveOrders(normalizedList);
          return currentCount !== normalizedList.length;
        }
      }
      return false;
    } catch (err) {
      console.warn("Backend offline or unreachable, using local database cache.");
      return false;
    }
  },

  async refresh() {
    await this.syncOrdersFromAPI();
    this.renderOrdersTable();
    this.updateStatusCounts();
    Toast.info("Đã làm mới danh sách đơn hàng từ CSDL MySQL.");
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
      orders = orders.filter(o => 
        (o.id && o.id.toLowerCase().includes(query)) || 
        (o.customerName && o.customerName.toLowerCase().includes(query)) || 
        (o.customerPhone && o.customerPhone.includes(query))
      );
    }

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding: 2.5rem;">Không có đơn hàng nào phù hợp với bộ lọc hiện tại.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const itemsList = Array.isArray(o.items) ? o.items : [];
      
      // Tóm tắt món pha chế cho nhân viên quầy / pha chế
      const itemsSummaryHtml = itemsList.length > 0 
        ? itemsList.map(it => {
            const toppingsArr = Array.isArray(it.toppings) ? it.toppings : [];
            const topStr = toppingsArr.length > 0 ? ` (+${toppingsArr.join(", ")})` : "";
            return `<div style="font-size: 0.8rem; margin-bottom: 2px;">
              <b>${it.name}</b> <span class="text-muted">(Size ${it.size}, ${it.sugar} đg, ${it.ice} đá)</span> x${it.quantity}
              ${topStr ? `<div style="color: var(--primary); font-size: 0.72rem;">${topStr}</div>` : ""}
            </div>`;
          }).join("")
        : `<span class="text-muted text-xs">Chưa có chi tiết</span>`;

      // Nút đổi nhanh trạng thái pha chế ngay trên hàng
      let quickActionBtn = "";
      if (o.orderStatus === "pending") {
        quickActionBtn = `<button class="btn btn-sm" style="background: #E0E7FF; color: #1E40AF; padding: 2px 6px; font-size: 0.72rem; font-weight: 700; border: none; border-radius: 4px;" onclick="OrderMgmt.updateStatus('${o.id}', 'preparing')" title="Duyệt & Bắt đầu pha chế ngay">🧋 Pha Ngay</button>`;
      } else if (o.orderStatus === "confirmed") {
        quickActionBtn = `<button class="btn btn-sm" style="background: #FEF3C7; color: #92400E; padding: 2px 6px; font-size: 0.72rem; font-weight: 700; border: none; border-radius: 4px;" onclick="OrderMgmt.updateStatus('${o.id}', 'preparing')" title="Bắt đầu pha chế">🧋 Bắt Đầu Pha</button>`;
      } else if (o.orderStatus === "preparing") {
        quickActionBtn = `<button class="btn btn-sm" style="background: #D1FAE5; color: #065F46; padding: 2px 6px; font-size: 0.72rem; font-weight: 700; border: none; border-radius: 4px;" onclick="OrderMgmt.updateStatus('${o.id}', 'shipping')" title="Đã pha xong, giao cho shipper">🛵 Pha Xong</button>`;
      } else if (o.orderStatus === "shipping") {
        quickActionBtn = `<button class="btn btn-sm" style="background: #E0F2FE; color: #0369A1; padding: 2px 6px; font-size: 0.72rem; font-weight: 700; border: none; border-radius: 4px;" onclick="OrderMgmt.updateStatus('${o.id}', 'completed')" title="Xác nhận giao thành công">🎉 Hoàn Tất</button>`;
      }

      return `
        <tr>
          <td class="font-bold text-primary">
            <a href="javascript:void(0)" onclick="OrderMgmt.openOrderDetail('${o.id}')" style="color: var(--primary); text-decoration: underline; cursor: pointer; font-weight: 700;" title="Nhấp để xem chi tiết hoá đơn">#${o.id}</a>
          </td>
          <td class="text-xs text-muted">${Formatters.dateTime(o.createdAt)}</td>
          <td>
            <div class="font-bold">${o.customerName}</div>
            <span class="text-xs text-muted">${o.customerPhone}</span>
          </td>
          <td style="max-width: 260px;">
            ${itemsSummaryHtml}
            ${o.note ? `<div style="font-size: 0.72rem; color: #B91C1C; margin-top: 2px;">📝 ${o.note}</div>` : ""}
          </td>
          <td>
            <div class="text-xs" style="max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.customerAddress}">
              ${o.customerAddress}
            </div>
          </td>
          <td class="font-bold" style="color: var(--primary);">${Formatters.currency(o.totalAmount)}</td>
          <td>
            <span class="badge ${o.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}" style="cursor: pointer;" onclick="OrderMgmt.confirmPayment('${o.id}')" title="Nhấp để đổi trạng thái thanh toán">
              ${o.paymentStatus === 'paid' ? 'Đã TT' : 'Chưa TT'} (${(o.paymentMethod || 'cod').toUpperCase()})
            </span>
          </td>
          <td>
            ${Formatters.orderStatusBadge(o.orderStatus)}
            <div style="margin-top: 4px;">${quickActionBtn}</div>
          </td>
          <td style="text-align: center;">
            <div class="table-actions" style="justify-content: center; gap: 0.35rem;">
              <button class="action-icon-btn btn-view" onclick="OrderMgmt.openOrderDetail('${o.id}')" title="Xem chi tiết đơn & Thao tác">👁️</button>
              <a href="../order-tracking.html?id=${encodeURIComponent(o.id)}" target="_blank" class="action-icon-btn" title="🔗 Mở liên kết hoá đơn khách hàng (Tra cứu online)" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">🔗</a>
              <button class="action-icon-btn btn-edit" onclick="OrderMgmt.openEditOrderModal('${o.id}')" title="Chỉnh sửa thông tin đơn">✏️</button>
              <button class="action-icon-btn btn-print" onclick="OrderMgmt.printReceipt('${o.id}')" title="In Hóa Đơn 80mm">🖨️</button>
              <button class="action-icon-btn btn-del" onclick="OrderMgmt.deleteOrder('${o.id}')" title="Xóa đơn hàng">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  },

  copyInvoiceLink(orderId) {
    const cleanId = String(orderId || '').replace(/^#/, '');
    const url = `${window.location.origin}/order-tracking.html?id=${encodeURIComponent(cleanId)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        Toast.success(`📋 Đã sao chép liên kết hoá đơn <b>#${cleanId}</b>!`);
      }).catch(() => {
        prompt("Sao chép liên kết hoá đơn gửi cho khách:", url);
      });
    } else {
      prompt("Sao chép liên kết hoá đơn gửi cho khách:", url);
    }
  },

  openOrderDetail(orderId) {
    const order = DB.getOrderById(orderId);
    if (!order) return;

    document.getElementById("detail-modal-title").innerHTML = `Chi Tiết Đơn Hàng: <span style="color: var(--primary);">#${order.id}</span>`;

    const items = Array.isArray(order.items) ? order.items : [];

    const bodyEl = document.getElementById("detail-modal-body");
    bodyEl.innerHTML = `
      <!-- Link Tra Cứu Hoá Đơn Khách Hàng -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 8px; padding: 10px 14px; margin-bottom: 1.25rem; flex-wrap: wrap;">
        <div style="font-size: 0.85rem; color: #1E40AF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: calc(100% - 190px);">
          🔗 <b>Liên kết hoá đơn khách:</b> 
          <a href="../order-tracking.html?id=${encodeURIComponent(order.id)}" target="_blank" style="color: #2563EB; text-decoration: underline; font-weight: 600;" title="Mở trang tra cứu đơn hàng của khách">
            order-tracking.html?id=${order.id}
          </a>
        </div>
        <div style="display: flex; gap: 0.35rem; flex-shrink: 0;">
          <button type="button" class="btn btn-sm btn-outline" onclick="OrderMgmt.copyInvoiceLink('${order.id}')" style="padding: 3px 8px; font-size: 0.75rem;" title="Sao chép liên kết hoá đơn gửi khách">📋 Sao chép</button>
          <a href="../order-tracking.html?id=${encodeURIComponent(order.id)}" target="_blank" class="btn btn-sm btn-primary" style="padding: 3px 8px; font-size: 0.75rem; text-decoration: none;">Mở link ➔</a>
        </div>
      </div>

      <!-- Status Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; background-color: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md);">
        <div>
          <span class="text-xs text-muted">Trạng thái đơn:</span>
          <div style="margin-top: 2px;">${Formatters.orderStatusBadge(order.orderStatus)}</div>
        </div>
        <div>
          <span class="text-xs text-muted">Thanh toán:</span>
          <div style="margin-top: 2px;">
            <span class="badge ${order.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}">
              ${order.paymentStatus === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'} (${(order.paymentMethod || 'COD').toUpperCase()})
            </span>
          </div>
        </div>
        <div style="text-align: right;">
          <span class="text-xs text-muted">Thời gian đặt:</span>
          <div class="font-semibold text-sm">${Formatters.dateTime(order.createdAt)}</div>
        </div>
      </div>

      <!-- Customer Info -->
      <div style="margin-bottom: 1.25rem; background: #F8FAFC; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-subtle);">
        <h5 style="margin-bottom: 0.35rem; font-size: 0.95rem;">👤 Khách Hàng: <b>${order.customerName}</b> - ${order.customerPhone}</h5>
        <p class="text-sm text-muted" style="margin: 0;">📍 Địa chỉ giao hàng: <b>${order.customerAddress}</b></p>
        ${order.note ? `<p class="text-xs" style="color: #B91C1C; font-weight: 600; margin-top: 4px;">📝 Ghi chú từ khách: ${order.note}</p>` : ''}
      </div>

      <!-- Items List -->
      <h5 style="margin-bottom: 0.5rem;">🧋 Món Cần Pha Chế (${items.length})</h5>
      <div style="display: flex; flex-direction: column; gap: 0.65rem; max-height: 220px; overflow-y: auto; margin-bottom: 1.25rem; padding-right: 4px;">
        ${items.map(item => {
          const toppingsArr = Array.isArray(item.toppings) ? item.toppings : [];
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-subtle);">
              <div>
                <span class="font-bold text-sm">${item.name}</span>
                <span class="text-xs text-muted">(Size ${item.size || 'M'}, ${item.sugar || '100%'} đường, ${item.ice || '100%'} đá)</span>
                ${toppingsArr.length ? `<div class="text-xs text-primary font-semibold">+ ${toppingsArr.join(", ")}</div>` : ''}
              </div>
              <div style="text-align: right;">
                <span class="text-xs text-muted">x${item.quantity || 1}</span>
                <span class="font-bold text-sm" style="color: var(--primary); margin-left: 0.5rem;">${Formatters.currency(item.subtotal || 0)}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <!-- Financials -->
      <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; max-width: 320px; margin-left: auto;">
        <div class="flex justify-between text-sm"><span class="text-muted">Tiền món:</span><span>${Formatters.currency(order.itemsTotal || 0)}</span></div>
        <div class="flex justify-between text-sm"><span class="text-muted">Phí ship:</span><span>${Formatters.currency(order.shippingFee || 0)}</span></div>
        ${order.discount > 0 ? `<div class="flex justify-between text-sm text-secondary"><span>Giảm giá (${order.voucherCode}):</span><span>-${Formatters.currency(order.discount)}</span></div>` : ''}
        <div class="flex justify-between font-bold" style="font-size: 1.15rem; color: var(--primary); margin-top: 0.25rem;">
          <span>Tổng thanh toán:</span>
          <span>${Formatters.currency(order.totalAmount || 0)}</span>
        </div>
      </div>
    `;

    // Render action buttons based on status
    const footerEl = document.getElementById("detail-modal-footer");
    footerEl.innerHTML = `
      <a href="../order-tracking.html?id=${encodeURIComponent(order.id)}" target="_blank" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 0.35rem; text-decoration: none;">🔗 Link Khách Hàng</a>
      <button class="btn btn-outline" onclick="OrderMgmt.printReceipt('${order.id}')">🖨️ In Hóa Đơn (POS)</button>
      ${order.paymentStatus !== 'paid' ? `
        <button class="btn" style="background: #10B981; color: #fff; font-weight: 600;" onclick="OrderMgmt.confirmPayment('${order.id}')">💰 Đã Nhận Tiền</button>
      ` : ''}
      ${order.orderStatus === 'pending' ? `
        <button class="btn btn-primary" onclick="OrderMgmt.updateStatus('${order.id}', 'confirmed')">✓ Duyệt Hoá Đơn</button>
        <button class="btn" style="background: #00529C; color: #fff; font-weight: 600;" onclick="OrderMgmt.updateStatus('${order.id}', 'preparing')">🧋 Duyệt & Pha Chế Ngay</button>
        <button class="btn btn-danger" onclick="OrderMgmt.updateStatus('${order.id}', 'cancelled')">✕ Hủy Hoá Đơn</button>
      ` : ''}
      ${order.orderStatus === 'confirmed' ? `
        <button class="btn btn-primary" style="background: #00529C; border-color: #00529C;" onclick="OrderMgmt.updateStatus('${order.id}', 'preparing')">🧋 Bắt Đầu Pha Chế</button>
        <button class="btn btn-danger" onclick="OrderMgmt.updateStatus('${order.id}', 'cancelled')">✕ Hủy Hoá Đơn</button>
      ` : ''}
      ${order.orderStatus === 'preparing' ? `
        <button class="btn btn-primary" onclick="OrderMgmt.updateStatus('${order.id}', 'shipping')">🛵 Pha Xong (Giao Cho Shipper)</button>
      ` : ''}
      ${order.orderStatus === 'shipping' ? `
        <button class="btn btn-secondary" onclick="OrderMgmt.updateStatus('${order.id}', 'completed')">🎉 Xác Nhận Giao Thành Công</button>
      ` : ''}
      <button class="btn btn-danger" onclick="OrderMgmt.deleteOrder('${order.id}')" style="margin-left: auto;" title="Xóa vĩnh viễn hóa đơn khỏi hệ thống">🗑️ Xóa Hoá Đơn</button>
    `;

    Modal.open("order-detail-modal");
  },

  async updateStatus(orderId, newStatus) {
    DB.updateOrderStatus(orderId, newStatus);
    try {
      await fetch(`${this.getApiBase()}/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.warn("Backend offline, status saved locally");
    }

    // Bắn thông báo realtime sang trang Khách hàng (order-tracking.html)
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("trasua_dodo_orders");
        bc.postMessage({ type: "ORDER_STATUS_UPDATED", orderId, status: newStatus });
        bc.close();
      }
      localStorage.setItem("dodo_order_status_changed", JSON.stringify({
        orderId,
        status: newStatus,
        timestamp: Date.now()
      }));
    } catch (e) {}

    Toast.success(`Đã cập nhật hoá đơn <b>#${orderId}</b> sang: <b>${newStatus.toUpperCase()}</b>`);
    if (typeof AuditLogger !== "undefined") {
      AuditLogger.notifyServer(
        `CẬP NHẬT TRẠNG THÁI HÓA ĐƠN #${orderId}`,
        `Trạng thái mới: [${newStatus.toUpperCase()}]`
      );
    }
    this.renderOrdersTable();
    this.updateStatusCounts();
    const detailModal = document.getElementById("order-detail-modal");
    if (detailModal && detailModal.classList.contains("active")) {
      this.openOrderDetail(orderId);
    }
  },

  async confirmPayment(orderId) {
    const order = DB.getOrderById(orderId);
    if (!order) return;

    const newPaymentStatus = order.paymentStatus === "paid" ? "pending" : "paid";
    order.paymentStatus = newPaymentStatus;
    DB.saveOrder(order);

    try {
      await fetch(`${this.getApiBase()}/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newPaymentStatus })
      });
    } catch (err) {}

    // Bắn thông báo cập nhật thanh toán liên kết sang khách hàng
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("trasua_dodo_orders");
        bc.postMessage({ type: "PAYMENT_STATUS_UPDATED", orderId, paymentStatus: newPaymentStatus });
        bc.close();
      }
      localStorage.setItem("dodo_order_status_changed", JSON.stringify({
        orderId,
        paymentStatus: newPaymentStatus,
        timestamp: Date.now()
      }));
    } catch (e) {}

    Toast.success(`Đã cập nhật trạng thái thanh toán đơn #${orderId}: <b>${newPaymentStatus.toUpperCase()}</b>`);
    this.renderOrdersTable();
    this.updateStatusCounts();
    const detailModal = document.getElementById("order-detail-modal");
    if (detailModal && detailModal.classList.contains("active")) {
      this.openOrderDetail(orderId);
    }
  },

  async deleteOrder(orderId) {
    if (!orderId) return;
    
    const executeDelete = async () => {
      try {
        const res = await fetch(`${this.getApiBase()}/orders/${encodeURIComponent(orderId)}`, {
          method: "DELETE"
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && !data.success) {
          console.warn("Backend delete notice:", data.message);
        }
      } catch (e) {
        console.warn("Lỗi kết nối server khi xóa đơn:", e);
      }

      // Xóa trong bộ nhớ client
      DB.deleteOrder(orderId);

      // Bắn thông báo BroadcastChannel
      try {
        const ch = new BroadcastChannel('trasua_dodo_orders');
        ch.postMessage({ type: 'ORDER_DELETED', orderId });
        ch.close();
      } catch (e) {}

      // Ghi audit log
      if (typeof AuditLogger !== "undefined") {
        AuditLogger.notifyServer(
          `XÓA ĐƠN HÀNG #${orderId}`,
          `Đã xóa vĩnh viễn đơn hàng #${orderId} khỏi hệ thống.`
        );
      }

      Toast.success(`🗑️ Đã xóa vĩnh viễn đơn hàng <b>#${orderId}</b> thành công!`);

      // Đóng modal chi tiết nếu đang mở
      const detailModal = document.getElementById("order-detail-modal");
      if (detailModal && detailModal.classList.contains("active")) {
        Modal.close("order-detail-modal");
      }

      // Đồng bộ và tải lại bảng
      await this.syncOrdersFromAPI();
      this.renderOrdersTable();
      this.updateStatusCounts();
    };

    if (typeof Modal !== "undefined" && typeof Modal.confirm === "function") {
      Modal.confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng <b>#${orderId}</b> không?<br><span style="color: #DC2626; font-size: 0.8rem;">Lưu ý: Hành động này sẽ xóa đơn khỏi cơ sở dữ liệu và không thể khôi phục!</span>`,
        executeDelete,
        "Xác Nhận Xóa Đơn Hàng"
      );
    } else {
      if (confirm(`Bạn có chắc muốn xóa đơn hàng #${orderId} không?`)) {
        executeDelete();
      }
    }
  },

  // 1-Click Print 80mm POS Receipt
  printReceipt(orderId) {
    const order = DB.getOrderById(orderId);
    if (!order) return;

    const receiptEl = document.getElementById("pos-receipt-print");
    if (!receiptEl) return;

    const items = Array.isArray(order.items) ? order.items : [];

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
          ${items.map(item => {
            const toppingsArr = Array.isArray(item.toppings) ? item.toppings : [];
            return `
              <tr>
                <td>
                  <div><b>${item.name}</b> (Size ${item.size || 'M'})</div>
                  <div style="font-size: 10px;">${item.sugar || '100%'} đường, ${item.ice || '100%'} đá</div>
                  ${toppingsArr.length ? `<div style="font-size: 10px;">+ ${toppingsArr.join(", ")}</div>` : ''}
                </td>
                <td class="qty">${item.quantity || 1}</td>
                <td class="price">${Formatters.currency(item.subtotal || 0)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <div style="border-top: 1px dashed #000; padding-top: 6px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Tiền món:</span>
          <span>${Formatters.currency(order.itemsTotal || 0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Phí ship:</span>
          <span>${Formatters.currency(order.shippingFee || 0)}</span>
        </div>
        ${order.discount > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Giảm giá:</span>
            <span>-${Formatters.currency(order.discount)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 4px;">
          <span>TỔNG CỘNG:</span>
          <span>${Formatters.currency(order.totalAmount || 0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
          <span>Phương thức:</span>
          <span>${(order.paymentMethod || 'COD').toUpperCase()} (${order.paymentStatus === 'paid' ? 'ĐÃ TT' : 'CHƯA TT'})</span>
        </div>
      </div>

      <div class="receipt-footer">
        <div>Cảm ơn quý khách đã ủng hộ Trà Sữa Đô Đô!</div>
        <div>Hẹn gặp lại quý khách!</div>
      </div>
    `;

    setTimeout(() => {
      window.print();
    }, 150);
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

    if (!Formatters.isValidPhone(customerPhone)) {
      Toast.warning("Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).");
      const phoneInput = document.getElementById("edit-order-phone");
      if (phoneInput) {
        phoneInput.focus();
        phoneInput.style.borderColor = "#EF4444";
      }
      return;
    }

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
        await fetch(`${this.getApiBase()}/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerName, customerPhone, customerAddress, orderStatus, paymentStatus, note })
        });
      } catch (err) {}

      Toast.success(`Đã cập nhật thông tin hoá đơn <b>#${orderId}</b> thành công!`);
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
    document.getElementById("create-order-phone").value = "";
    document.getElementById("create-order-address").value = "Uống tại quán / Mang đi";
    document.getElementById("create-order-qty").value = "1";
    document.getElementById("create-order-note").value = "";
    
    Modal.open("order-create-modal");
  },

  async saveCreateOrderSubmit(e) {
    e.preventDefault();
    const customerName = document.getElementById("create-order-name").value.trim();
    const customerPhone = document.getElementById("create-order-phone").value.trim() || "0868870869";
    const customerAddress = document.getElementById("create-order-address").value.trim();

    if (customerPhone && !Formatters.isValidPhone(customerPhone)) {
      Toast.warning("Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).");
      const phoneInput = document.getElementById("create-order-phone");
      if (phoneInput) {
        phoneInput.focus();
        phoneInput.style.borderColor = "#EF4444";
      }
      return;
    }
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
      orderId,
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'paid' : 'pending',
      orderStatus,
      itemsTotal,
      shippingFee: 0,
      discount: 0,
      totalAmount,
      note,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
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
      await fetch(`${this.getApiBase()}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          orderCode: orderId,
          customerName,
          phone: customerPhone,
          customerPhone,
          address: customerAddress,
          customerAddress,
          notes: note,
          note,
          paymentMethod,
          items: newOrder.items
        })
      });
    } catch (err) {}

    Toast.success(`🎉 Đã tạo thành công hoá đơn tại quầy: <b>#${orderId}</b>!`);
    if (typeof AuditLogger !== "undefined") {
      AuditLogger.notifyServer(
        `TẠO HÓA ĐƠN TẠI QUẦY POS #${orderId}`,
        `1x ${productName} (x${quantity}) | Khách: ${customerName} | Tổng: ${Formatters.currency(totalAmount)} | PT: ${paymentMethod.toUpperCase()}`
      );
    }
    Modal.close("order-create-modal");
    this.renderOrdersTable();
    this.updateStatusCounts();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  OrderMgmt.init();
});

window.OrderMgmt = OrderMgmt;
