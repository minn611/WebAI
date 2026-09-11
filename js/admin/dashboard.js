/* ==========================================================================
   TEAJOY STORE - ADMIN DASHBOARD CONTROLLER
   ========================================================================== */

const AdminDashboard = {
  async init() {
    this.checkAuth();
    await this.syncFromAPI();
    this.renderKPIs();
    this.initCharts();
    this.renderRecentOrders();
    this.updateCurrentDate();
  },

  async syncFromAPI() {
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
    } catch (err) {}
  },

  checkAuth() {
    const user = Auth.getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      if (user && user.role === "customer") {
        Toast.warning("Tài khoản của bạn không có quyền truy cập trang Quản Trị!");
        setTimeout(() => { window.location.href = "../index.html"; }, 1000);
        return false;
      }
    }
    const adminNameEl = document.getElementById("admin-user-name");
    const adminRoleEl = document.getElementById("admin-user-role");
    if (adminNameEl) adminNameEl.textContent = user ? user.fullName : "Nguyễn Văn Quản Lý (Admin)";
    if (adminRoleEl) adminRoleEl.textContent = user ? user.role.toUpperCase() : "ADMIN";
    return true;
  },

  updateCurrentDate() {
    const el = document.getElementById("current-date-display");
    if (el) {
      const now = new Date();
      el.textContent = `Hôm nay: ${now.toLocaleDateString("vi-VN", { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })}`;
    }
  },

  renderKPIs() {
    const orders = DB.getOrders();
    const products = DB.getProducts();
    const users = DB.getUsers();

    // Calculate revenue
    const revenue = orders.filter(o => o.orderStatus !== "cancelled").reduce((sum, o) => sum + o.totalAmount, 0);

    const revEl = document.getElementById("kpi-revenue");
    const ordEl = document.getElementById("kpi-orders");
    const cusEl = document.getElementById("kpi-customers");
    const proEl = document.getElementById("kpi-products");

    if (revEl) revEl.textContent = Formatters.currency(revenue);
    if (ordEl) ordEl.textContent = orders.length;
    if (cusEl) cusEl.textContent = users.filter(u => u.role === "customer").length;
    if (proEl) proEl.textContent = products.length;
  },

  initCharts() {
    // 1. Revenue Line Chart
    const revCtx = document.getElementById("revenue-chart");
    if (revCtx) {
      new Chart(revCtx, {
        type: 'line',
        data: {
          labels: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"],
          datasets: [{
            label: "Doanh thu (VNĐ)",
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: "#9B0024",
            backgroundColor: "rgba(155, 0, 36, 0.15)",
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointBackgroundColor: "#9B0024",
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return (value / 1000) + "k";
                }
              }
            }
          }
        }
      });
    }

    // 2. Category Doughnut Chart
    const catCtx = document.getElementById("category-chart");
    if (catCtx) {
      new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: ["Trà Sữa", "Trà Trái Cây", "Cà Phê", "Đá Xay", "Combo"],
          datasets: [{
            data: [40, 30, 15, 10, 5],
            backgroundColor: ["#9B0024", "#C41535", "#1F523A", "#FFB703", "#745C86"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  },

  renderRecentOrders() {
    const tbody = document.getElementById("recent-orders-tbody");
    if (!tbody) return;

    const orders = DB.getOrders().slice(0, 5);
    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Chưa có đơn hàng nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td class="font-bold text-primary">#${o.id}</td>
        <td>
          <div class="font-semibold">${o.customerName}</div>
          <div class="text-xs text-muted">${o.customerPhone}</div>
        </td>
        <td>${o.items.length} món</td>
        <td class="font-bold" style="color: var(--primary);">${Formatters.currency(o.totalAmount)}</td>
        <td><span class="badge badge-info">${o.paymentMethod.toUpperCase()}</span></td>
        <td>${Formatters.orderStatusBadge(o.orderStatus)}</td>
        <td>
          <a href="orders.html?id=${o.id}" class="btn btn-outline btn-sm">Chi Tiết ➔</a>
        </td>
      </tr>
    `).join("");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  AdminDashboard.init();
});
