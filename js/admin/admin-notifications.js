/* ==========================================================================
   TEAJOY STORE - ADMIN & STAFF REAL-TIME NOTIFICATION & SOUND SYSTEM
   Thông báo chuyển khoản VietQR và đơn hàng mới kèm âm thanh Ting Ting
   ========================================================================== */

const AdminNotifications = {
  notifications: [],
  unreadCount: 0,
  pollInterval: null,
  broadcastChannel: null,
  audioCtx: null,

  init() {
    this.injectNotificationBellUI();
    this.initAudioContext();
    this.initRealtimeListeners();
    this.fetchNotifications();

    // Polling định kỳ mỗi 4 giây từ API máy chủ Backend
    this.pollInterval = setInterval(() => {
      this.fetchNotifications(true);
    }, 4000);
  },

  // 1. Web Audio API: Phát âm thanh chuông ngân "Ting Ting!" rõ ràng, êm tai
  initAudioContext() {
    // Khởi tạo AudioContext khi người dùng có tương tác đầu tiên
    const initCtx = () => {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      document.removeEventListener("click", initCtx);
      document.removeEventListener("keydown", initCtx);
    };
    document.addEventListener("click", initCtx, { once: true });
    document.addEventListener("keydown", initCtx, { once: true });
  },

  playPaymentChime() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }

      if (!this.audioCtx) return;
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Nốt 1: E6 (1318.5 Hz) ngân trong trẻo
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1318.5, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Nốt 2: B6 (1975.5 Hz) cao vút vang lên sau 0.12s ("Ting... Ting!")
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1975.5, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.5, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.95);
    } catch (err) {
      console.warn("Không thể phát âm thanh:", err);
    }
  },

  // 2. Tích hợp Quả Chuông 🔔 & Dropdown Danh Sách Thông Báo trên Topbar
  injectNotificationBellUI() {
    const topbar = document.querySelector(".admin-topbar");
    if (!topbar) return;

    let container = document.getElementById("admin-notif-container");
    if (container) return;

    container = document.createElement("div");
    container.id = "admin-notif-container";
    container.style.cssText = "position: relative; display: inline-block; margin-right: 0.5rem;";

    container.innerHTML = `
      <button id="admin-notif-bell-btn" class="action-btn" style="position: relative; font-size: 1.15rem; background: rgba(255, 255, 255, 0.85); border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s;" title="Thông báo chuyển khoản & đơn hàng">
        <span>🔔</span>
        <span id="admin-notif-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #EF4444; color: #fff; font-size: 0.68rem; font-weight: 800; border-radius: 10px; padding: 2px 6px; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5); animation: pulseBadge 1.8s infinite;">0</span>
      </button>

      <!-- Dropdown Menu -->
      <div id="admin-notif-dropdown" style="display: none; position: absolute; right: 0; top: 48px; width: 360px; background: #fff; border-radius: var(--radius-lg); box-shadow: 0 12px 36px rgba(0,0,0,0.18); border: 1px solid var(--border-color); z-index: 1000; overflow: hidden; animation: fadeInDown 0.2s ease;">
        <div style="padding: 12px 16px; background: linear-gradient(135deg, #00529C, #003B70); color: #fff; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
            <span>🔔</span> Thông Báo Chuyển Khoản & Đơn Mới
          </div>
          <button style="background: none; border: none; color: #E0E7FF; font-size: 0.75rem; cursor: pointer; text-decoration: underline;" onclick="AdminNotifications.markAllAsRead()">Đánh dấu đã đọc</button>
        </div>

        <div id="admin-notif-list" style="max-height: 380px; overflow-y: auto; padding: 6px 0;">
          <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            Chưa có thông báo chuyển khoản mới nào.
          </div>
        </div>

        <div style="padding: 8px 16px; background: #F8FAFC; border-top: 1px solid var(--border-subtle); text-align: center;">
          <a href="orders.html" style="font-size: 0.8rem; font-weight: 600; color: var(--primary);">Xem tất cả đơn hàng tại Quầy ➔</a>
        </div>
      </div>
    `;

    // Chèn trước thông tin người dùng trong topbar
    const userSection = topbar.querySelector(".action-btn[style*='primary-bg']")?.parentElement || topbar.lastElementChild;
    topbar.insertBefore(container, userSection);

    // Toggle Dropdown
    const bellBtn = document.getElementById("admin-notif-bell-btn");
    const dropdown = document.getElementById("admin-notif-dropdown");
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === "block";
      dropdown.style.display = isOpen ? "none" : "block";
    });

    document.addEventListener("click", (e) => {
      if (!container.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });

    // Thêm keyframe pulse nếu chưa có
    if (!document.getElementById("notif-pulse-style")) {
      const style = document.createElement("style");
      style.id = "notif-pulse-style";
      style.textContent = `
        @keyframes pulseBadge {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
  },

  // 3. Lắng nghe sự kiện Realtime qua LocalStorage và BroadcastChannel
  initRealtimeListeners() {
    // Cross-tab qua Storage Event
    window.addEventListener("storage", (e) => {
      if (e.key === "dodo_latest_transfer_notification" && e.newValue) {
        try {
          const notif = JSON.parse(e.newValue);
          this.handleNewIncomingNotification(notif);
        } catch (err) {}
      }
    });

    // Cross-tab qua BroadcastChannel
    if (typeof BroadcastChannel !== "undefined") {
      this.broadcastChannel = new BroadcastChannel("dodo_notifications");
      this.broadcastChannel.onmessage = (e) => {
        if (e.data && e.data.type === "TRANSFER_NOTIFICATION") {
          this.handleNewIncomingNotification(e.data.data);
        }
      };
    }
  },

  // 4. Lấy thông báo từ Server Backend
  async fetchNotifications(isPoll = false) {
    try {
      const res = await fetch("http://localhost:5000/api/notifications");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const prevCount = this.notifications.length;
        const newNotifications = data.data;

        // Nếu phát hiện thông báo mới so với lần trước
        if (isPoll && newNotifications.length > prevCount && prevCount > 0) {
          const newest = newNotifications[0];
          this.handleNewIncomingNotification(newest);
        }

        this.notifications = newNotifications;
        this.unreadCount = data.unreadCount || this.notifications.filter(n => n.status === "unread").length;
        this.renderDropdown();
      }
    } catch (e) {
      // Backend offline: sử dụng thông báo lưu tạm trong localStorage
      const cached = localStorage.getItem("dodo_latest_transfer_notification");
      if (cached && this.notifications.length === 0) {
        try {
          const parsed = JSON.parse(cached);
          this.notifications = [parsed];
          this.unreadCount = 1;
          this.renderDropdown();
        } catch (err) {}
      }
    }
  },

  // 5. Xử lý khi có thông báo chuyển khoản mới tới
  handleNewIncomingNotification(notif) {
    // Phát âm thanh chuông Ting Ting
    this.playPaymentChime();

    // Cập nhật số đếm
    this.unreadCount++;
    this.updateBadge();

    // Hiển thị Banner Popup nổi bật ở góc phải màn hình
    this.showFloatingAlert(notif);

    // Nếu đang ở màn hình Quản lý đơn hàng (orders.html), tự động reload dữ liệu ngay lập tức
    if (typeof OrderMgmt !== "undefined" && typeof OrderMgmt.syncOrdersFromAPI === "function") {
      OrderMgmt.syncOrdersFromAPI().then(() => {
        OrderMgmt.renderOrdersTable();
        OrderMgmt.updateStatusCounts();
      });
    }
  },

  // 6. Hiển thị Popup cảnh báo nổi bật góc trên màn hình
  showFloatingAlert(notif) {
    const formattedAmount = (notif.amount || 0).toLocaleString("vi-VN") + " ₫";
    
    const banner = document.createElement("div");
    banner.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      width: 380px;
      max-width: 90vw;
      background: #FFFFFF;
      border-left: 6px solid #00529C;
      border-radius: var(--radius-lg);
      box-shadow: 0 16px 40px rgba(0, 82, 156, 0.28);
      padding: 16px 18px;
      z-index: 99999;
      animation: fadeInDown 0.35s ease;
      font-family: inherit;
    `;

    banner.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.4rem;">🔔</span>
          <div>
            <div style="font-weight: 800; color: #00529C; font-size: 0.95rem;">ĐÃ NHẬN CHUYỂN KHOẢN VIETQR!</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">VietinBank (0868870869 - NGO MANH HIEU)</div>
          </div>
        </div>
        <button style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94A3B8; line-height: 1;" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>

      <div style="background: #F0F6FF; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; font-size: 0.85rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748B;">Số tiền:</span>
          <b style="color: var(--primary); font-size: 1.05rem;">${formattedAmount}</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748B;">Khách hàng:</span>
          <b>${notif.customerName || "Khách Vãng Lai"} ${notif.customerPhone ? `(${notif.customerPhone})` : ""}</b>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #64748B;">Mã đơn:</span>
          <b style="color: #00529C;">#${notif.orderId}</b>
        </div>
      </div>

      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn btn-sm btn-outline" style="font-size: 0.78rem;" onclick="this.closest('div[style*=\\'position: fixed\\']').remove()">Bỏ qua</button>
        <button class="btn btn-sm btn-primary" style="font-size: 0.78rem; background: #00529C; border-color: #00529C;" onclick="AdminNotifications.viewOrderDetails('${notif.orderId}'); this.closest('div[style*=\\'position: fixed\\']').remove();">
          🔍 Xem & Duyệt Đơn Này
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    // Tự biến mất sau 12 giây
    setTimeout(() => {
      if (banner.parentElement) {
        banner.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        banner.style.opacity = "0";
        banner.style.transform = "translateY(-10px)";
        setTimeout(() => banner.remove(), 400);
      }
    }, 12000);
  },

  // 7. Cập nhật giao diện Quả chuông và Dropdown
  updateBadge() {
    const badge = document.getElementById("admin-notif-badge");
    if (!badge) return;
    if (this.unreadCount > 0) {
      badge.textContent = this.unreadCount > 99 ? "99+" : this.unreadCount;
      badge.style.display = "block";
    } else {
      badge.style.display = "none";
    }
  },

  renderDropdown() {
    this.updateBadge();
    const list = document.getElementById("admin-notif-list");
    if (!list) return;

    if (!this.notifications || this.notifications.length === 0) {
      list.innerHTML = `
        <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          <div style="font-size: 2rem; margin-bottom: 0.4rem;">☕</div>
          Chưa có thông báo chuyển khoản nào gần đây.
        </div>
      `;
      return;
    }

    list.innerHTML = this.notifications.map(n => {
      const isUnread = n.status === "unread";
      const timeStr = n.createdAt ? new Date(n.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
      const amtStr = (n.amount || 0).toLocaleString("vi-VN") + " ₫";

      return `
        <div style="padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); background: ${isUnread ? "#F0F6FF" : "#fff"}; cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='#E0E7FF'" onmouseout="this.style.background='${isUnread ? "#F0F6FF" : "#fff"}'" onclick="AdminNotifications.viewOrderDetails('${n.orderId}', '${n.id}')">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px;">
            <div style="font-weight: 700; font-size: 0.88rem; color: #00529C; display: flex; align-items: center; gap: 4px;">
              <span>💰</span> ${amtStr}
            </div>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${timeStr}</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-main); margin-bottom: 2px;">
            <b>${n.customerName || "Khách Hàng"}</b> ${n.customerPhone ? `(${n.customerPhone})` : ""}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
            <span>Mã: <b style="color: var(--primary);">#${n.orderId}</b></span>
            <span style="color: #059669; font-weight: 600;">VietinBank 0868870869</span>
          </div>
        </div>
      `;
    }).join("");
  },

  async markAllAsRead() {
    this.unreadCount = 0;
    this.notifications.forEach(n => n.status = "read");
    this.updateBadge();
    this.renderDropdown();

    try {
      this.notifications.forEach(n => {
        fetch(`http://localhost:5000/api/notifications/${n.id}/read`, { method: "PUT" }).catch(() => {});
      });
    } catch (e) {}
  },

  viewOrderDetails(orderId, notifId = null) {
    if (notifId) {
      const found = this.notifications.find(n => n.id === notifId);
      if (found) found.status = "read";
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.updateBadge();
      this.renderDropdown();
      fetch(`http://localhost:5000/api/notifications/${notifId}/read`, { method: "PUT" }).catch(() => {});
    }

    // Nếu đang ở orders.html: mở chi tiết đơn hàng luôn
    if (typeof OrderMgmt !== "undefined" && typeof OrderMgmt.openOrderDetail === "function") {
      OrderMgmt.openOrderDetail(orderId);
      const dropdown = document.getElementById("admin-notif-dropdown");
      if (dropdown) dropdown.style.display = "none";
    } else {
      // Chuyển hướng tới trang Quản lý đơn hàng với tham số ID
      window.location.href = `orders.html?id=${orderId}`;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  AdminNotifications.init();
});

window.AdminNotifications = AdminNotifications;
