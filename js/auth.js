/* ==========================================================================
   TEAJOY STORE - AUTHENTICATION & ROLE-BASED NAVIGATION
   ========================================================================== */

const Auth = {
  getCurrentUser() {
    return DB.getCurrentUser();
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === "admin";
  },

  isStaff() {
    const user = this.getCurrentUser();
    return user && (user.role === "admin" || user.role === "staff");
  },

  API_BASE: "http://localhost:5000/api",

  async loginAsync(username, password) {
    try {
      const response = await fetch(`${this.API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.success && data.user) {
        DB.setCurrentUser(data.user);
        return { success: true, user: data.user, message: data.message };
      } else {
        return { success: false, message: data.message || "Tên đăng nhập hoặc mật khẩu không chính xác!" };
      }
    } catch (err) {
      // Fallback to local DB if Backend Server is offline
      return this.login(username, password);
    }
  },

  login(username, password) {
    const users = DB.getUsers();
    const user = users.find(u => {
      if (u.username.toLowerCase() !== username.toLowerCase()) return false;
      if (u.password === password) return true;
      // Allow 1, 123, 123456 fallback for demo staff/admin accounts
      if ((u.password === "1" || u.password === "123" || u.password === "123456") && (password === "1" || password === "123" || password === "123456")) {
        return true;
      }
      return false;
    });
    if (!user) {
      return { success: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
    }
    if (user.status === "locked") {
      return { success: false, message: "Tài khoản này đang bị tạm khóa!" };
    }
    DB.setCurrentUser(user);
    return { success: true, user };
  },

  logout() {
    DB.setCurrentUser(null);
    const isInsideAdmin = window.location.pathname.includes("/admin/");
    if (isInsideAdmin) {
      window.location.href = "../index.html";
    } else {
      window.location.reload();
    }
  },

  async registerAsync(userData) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const response = await fetch(`${this.API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.success && data.user) {
        DB.saveUser(data.user);
        DB.setCurrentUser(data.user);
        return { success: true, user: data.user, message: data.message };
      } else if (data.message && data.message.includes("Access denied")) {
        console.warn("MySQL Access Denied on Server, registering locally in LocalStorage...");
        return this.register(userData);
      } else {
        return { success: false, message: data.message || "Đăng ký không thành công!" };
      }
    } catch (err) {
      // Fallback to LocalStorage if Backend API is offline
      return this.register(userData);
    }
  },

  register(userData) {
    const users = DB.getUsers();
    const exists = users.find(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (exists) {
      return { success: false, message: "Tên đăng nhập đã tồn tại trên hệ thống!" };
    }

    const newUser = {
      id: `USR-${Date.now()}`,
      username: userData.username,
      password: userData.password,
      fullName: userData.fullName || "Khách hàng mới",
      role: "customer",
      email: userData.email || "",
      phone: userData.phone || "",
      points: 50,
      tier: "Đồng",
      status: "active",
      createdAt: new Date().toISOString().split("T")[0]
    };

    DB.saveUser(newUser);
    DB.setCurrentUser(newUser);
    return { success: true, user: newUser };
  },

  // Switch role for quick testing/demo
  switchRole(roleOrUser) {
    const users = DB.getUsers();
    let targetUser = null;

    if (roleOrUser === "phache") {
      targetUser = users.find(u => u.username === "phache" || u.position === "pha_che" || (u.fullName || "").toLowerCase().includes("pha chế"));
    } else if (roleOrUser === "thungan") {
      targetUser = users.find(u => u.username === "thungan" || u.position === "thu_ngan" || (u.fullName || "").toLowerCase().includes("thu ngân"));
    } else if (roleOrUser === "admin") {
      targetUser = users.find(u => u.role === "admin");
    } else if (roleOrUser === "staff") {
      targetUser = users.find(u => u.username === "phache" || u.role === "staff");
    } else {
      targetUser = users.find(u => u.role === roleOrUser || u.username === roleOrUser);
    }

    if (targetUser) {
      DB.setCurrentUser(targetUser);
      Toast.success(`Đã chuyển vai trò: <b>${targetUser.fullName}</b> (${(targetUser.positionTitle || targetUser.role).toUpperCase()})`);
      setTimeout(() => {
        if (targetUser.username === "phache" || targetUser.position === "pha_che") {
          window.location.href = window.location.pathname.includes("/admin/") ? "orders.html" : "admin/orders.html";
        } else if (targetUser.role === "admin" || targetUser.role === "staff") {
          if (!window.location.pathname.includes("/admin/")) {
            window.location.href = "admin/index.html";
          } else {
            window.location.reload();
          }
        } else {
          if (window.location.pathname.includes("/admin/")) {
            window.location.href = "../index.html";
          } else {
            window.location.reload();
          }
        }
      }, 500);
    }
  },

  // Open Global Auth Pop-up Modal
  openAuthModal(tab = "login") {
    this.initAuthModal();
    this.switchAuthTab(tab);
    Modal.open("global-auth-modal");
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById("pop-login-form");
    const regForm = document.getElementById("pop-register-form");
    const loginBtn = document.getElementById("pop-tab-login-btn");
    const regBtn = document.getElementById("pop-tab-register-btn");

    if (!loginForm || !regForm) return;

    if (tab === "login") {
      loginForm.style.display = "block";
      regForm.style.display = "none";
      if (loginBtn) {
        loginBtn.style.borderBottom = "2.5px solid var(--primary)";
        loginBtn.style.color = "var(--primary)";
      }
      if (regBtn) {
        regBtn.style.borderBottom = "none";
        regBtn.style.color = "var(--text-muted)";
      }
    } else {
      loginForm.style.display = "none";
      regForm.style.display = "block";
      if (regBtn) {
        regBtn.style.borderBottom = "2.5px solid var(--primary)";
        regBtn.style.color = "var(--primary)";
      }
      if (loginBtn) {
        loginBtn.style.borderBottom = "none";
        loginBtn.style.color = "var(--text-muted)";
      }
    }
  },

  // Submit Login from Popup
  async handlePopupLogin(e) {
    e.preventDefault();
    const u = document.getElementById("pop-login-username")?.value.trim();
    const p = document.getElementById("pop-login-password")?.value;
    if (!u || !p) return;

    const res = await this.loginAsync(u, p);
    if (res.success) {
      Modal.close("global-auth-modal");
      Toast.success(`Chào mừng <b>${res.user.fullName}</b>!`);
      this.updateHeaderAuthUI();
      setTimeout(() => {
        if (res.user.role === "admin" || res.user.role === "staff") {
          const isInsideAdmin = window.location.pathname.includes("/admin/");
          if (!isInsideAdmin) {
            window.location.href = "admin/index.html";
          } else {
            window.location.reload();
          }
        } else {
          const isInsideAdmin = window.location.pathname.includes("/admin/");
          if (isInsideAdmin) {
            window.location.href = "../index.html";
          } else {
            window.location.reload();
          }
        }
      }, 500);
    } else {
      Toast.error(res.message);
    }
  },

  // Submit Register from Popup (Customers)
  async handlePopupRegister(e) {
    e.preventDefault();
    const u = document.getElementById("pop-reg-username")?.value.trim();
    const f = document.getElementById("pop-reg-fullname")?.value.trim();
    const phone = document.getElementById("pop-reg-phone")?.value.trim();
    const p = document.getElementById("pop-reg-password")?.value;

    const res = await this.registerAsync({ username: u, fullName: f, phone, password: p });
    if (res.success) {
      Modal.close("global-auth-modal");
      Toast.success(res.message || "Đăng ký tài khoản Khách Hàng thành công! Tặng bạn 50 điểm thưởng 🎁");
      this.updateHeaderAuthUI();
      setTimeout(() => window.location.reload(), 600);
    } else {
      Toast.error(res.message);
    }
  },

  quickLoginDemo(username, password) {
    const inputU = document.getElementById("pop-login-username");
    const inputP = document.getElementById("pop-login-password");
    if (inputU) inputU.value = username;
    if (inputP) inputP.value = password;

    const res = this.login(username, password);
    if (res.success) {
      Modal.close("global-auth-modal");
      Toast.success(`Đã đăng nhập vai trò: <b>${res.user.fullName}</b> (${res.user.role.toUpperCase()})`);
      this.updateHeaderAuthUI();
      setTimeout(() => {
        if (res.user.role === "admin" || res.user.role === "staff") {
          if (!window.location.pathname.includes("/admin/")) {
            window.location.href = "admin/index.html";
          } else {
            window.location.reload();
          }
        } else {
          if (window.location.pathname.includes("/admin/")) {
            window.location.href = "../index.html";
          } else {
            window.location.reload();
          }
        }
      }, 500);
    }
  },

  // Inject Global Auth Pop-up Modal HTML
  initAuthModal() {
    if (document.getElementById("global-auth-modal")) return;

    const modalMarkup = `
      <div id="global-auth-modal" class="modal-backdrop">
        <div class="modal-container" style="max-width: 440px;">
          <div class="modal-header" style="flex-direction: column; align-items: center; text-align: center; gap: 0.25rem;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
              <div class="site-logo" style="font-size: 1.4rem;">
                <div class="logo-icon"><img src="images/dodo-logo.svg" alt="Trà Sữa ĐÔ ĐÔ"></div>
                <span>ĐÔ</span> ĐÔ
              </div>
              <button class="modal-close" data-close-modal="global-auth-modal">✕</button>
            </div>
            <p class="text-xs text-muted" style="margin-top: 4px;">Tài khoản Khách Hàng đăng ký trực tuyến • Tài khoản Nhân Viên do Cửa Hàng cấp</p>
          </div>

          <!-- Auth Form Tabs -->
          <div style="display: flex; border-bottom: 2px solid var(--border-color); margin-inline: 1.5rem; margin-top: 0.5rem;">
            <button id="pop-tab-login-btn" class="btn btn-ghost font-bold" style="flex: 1; border-radius: 0; border-bottom: 2.5px solid var(--primary); color: var(--primary);" onclick="Auth.switchAuthTab('login')">Đăng Nhập</button>
            <button id="pop-tab-register-btn" class="btn btn-ghost font-bold" style="flex: 1; border-radius: 0; color: var(--text-muted);" onclick="Auth.switchAuthTab('register')">Đăng Ký Khách Hàng</button>
          </div>

          <div class="modal-body" style="padding: 1.25rem 1.5rem 1.5rem;">
            <!-- Login Form -->
            <form id="pop-login-form" onsubmit="Auth.handlePopupLogin(event)">
              <div class="form-group">
                <label class="form-label text-xs">Tên đăng nhập</label>
                <input type="text" id="pop-login-username" class="form-control" placeholder="Tên tài khoản..." required>
              </div>
              <div class="form-group">
                <label class="form-label text-xs">Mật khẩu</label>
                <input type="password" id="pop-login-password" class="form-control" placeholder="Mật khẩu..." required>
              </div>
              <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 0.5rem;">Đăng Nhập ➔</button>
            </form>

            <!-- Register Form (For Customers) -->
            <form id="pop-register-form" style="display: none;" onsubmit="Auth.handlePopupRegister(event)">
              <div class="form-group">
                <label class="form-label text-xs">Tên đăng nhập mới *</label>
                <input type="text" id="pop-reg-username" class="form-control" placeholder="Ví dụ: phucle99" required>
              </div>
              <div class="form-group">
                <label class="form-label text-xs">Họ và tên *</label>
                <input type="text" id="pop-reg-fullname" class="form-control" placeholder="Ví dụ: Lê Hoàng Phúc" required>
              </div>
              <div class="form-group">
                <label class="form-label text-xs">Số điện thoại *</label>
                <input type="tel" id="pop-reg-phone" class="form-control" placeholder="Ví dụ: 0987654321" required>
              </div>
              <div class="form-group">
                <label class="form-label text-xs">Mật khẩu *</label>
                <input type="password" id="pop-reg-password" class="form-control" placeholder="Mật khẩu bảo mật" required>
              </div>
              <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 0.5rem;">Tạo Tài Khoản Khách Hàng</button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalMarkup);
  },

  // Dynamically update site header user button
  updateHeaderAuthUI() {
    const user = this.getCurrentUser();
    const userBtns = document.querySelectorAll(".header-user-action");
    userBtns.forEach(btn => {
      if (user) {
        const isAdmin = user.role === "admin";
        const isStaff = user.role === "staff";

        let adminBtnHtml = "";
        if (isAdmin) {
          adminBtnHtml = `
            <a href="admin/index.html" class="btn btn-sm btn-primary" style="display: flex; align-items: center; gap: 0.35rem;" title="Quay lại trang quản lý">
              <span>⚙️</span> Trang Quản Lý
            </a>
          `;
        } else if (isStaff) {
          const isBarista = user.username === "phache" || user.position === "pha_che" || (user.fullName || "").toLowerCase().includes("pha chế");
          if (isBarista) {
            adminBtnHtml = `
              <a href="admin/orders.html" class="btn btn-sm btn-primary" style="display: flex; align-items: center; gap: 0.35rem;" title="Vào màn hình pha chế đơn hàng">
                <span>🧋</span> Trang Pha Chế
              </a>
            `;
          } else {
            adminBtnHtml = `
              <a href="admin/orders.html" class="btn btn-sm btn-primary" style="display: flex; align-items: center; gap: 0.35rem;" title="Vào xử lý đơn hàng POS">
                <span>💼</span> Xử Lý Đơn Hàng
              </a>
            `;
          }
        }

        btn.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${adminBtnHtml}
            <a href="profile.html" class="btn btn-sm btn-outline" style="display: flex; align-items: center; gap: 0.35rem;" title="Xem trang cá nhân">
              <span>👤</span>
              <span class="font-bold">${user.fullName.split(" ").slice(-1)[0]}</span>
            </a>
            <button class="btn btn-sm btn-outline" style="border-color: var(--primary); color: var(--primary);" onclick="Auth.logout()" title="Đăng xuất khỏi tài khoản">
              <span>🚪</span> Đăng Xuất
            </button>
          </div>
        `;
      } else {
        btn.innerHTML = `
          <button class="btn btn-sm btn-primary" onclick="Auth.openAuthModal('login')">
            <span>🔑</span> Đăng Nhập
          </button>
        `;
      }
    });
  },

  // Dynamically update admin topbar and sidebar with role permissions
  updateAdminAuthUI() {
    const isInsideAdmin = window.location.pathname.includes("/admin/");
    if (!isInsideAdmin) return;

    const user = this.getCurrentUser();
    const isManager = user && user.role === "admin";
    const isBarista = user && (user.username === "phache" || user.position === "pha_che" || (user.fullName || "").toLowerCase().includes("pha chế"));
    const nameDisplay = user ? user.fullName : "Nguyễn Văn Quản Lý";
    const roleDisplay = user ? (isManager ? "QUẢN LÝ" : (isBarista ? "PHA CHẾ" : "THU NGÂN")) : "QUẢN LÝ";

    // 1. Update Topbar
    const adminNameEl = document.getElementById("admin-user-name");
    const adminRoleEl = document.getElementById("admin-user-role");
    if (adminNameEl) adminNameEl.textContent = nameDisplay;
    if (adminRoleEl) adminRoleEl.textContent = roleDisplay;

    const topbar = document.querySelector(".admin-topbar");
    if (topbar && !topbar.querySelector(".admin-topbar-actions")) {
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "admin-topbar-actions";
      actionsDiv.style.cssText = "display: flex; align-items: center; gap: 0.75rem; margin-left: auto;";

      let viewStoreBtn = "";
      if (isManager) {
        viewStoreBtn = `<a href="../index.html" class="btn btn-sm btn-outline" style="display: flex; align-items: center; gap: 0.35rem;"><span>🛍️</span> Xem Cửa Hàng</a>`;
      }

      actionsDiv.innerHTML = `
        ${viewStoreBtn}
        <button class="btn btn-sm" style="background: #FFF0F2; color: var(--primary); border: 1px solid var(--border-color); font-weight: 600; display: flex; align-items: center; gap: 0.35rem;" onclick="Auth.logout()" title="Đăng xuất khỏi tài khoản">
          <span>🚪</span> Đăng Xuất
        </button>
      `;
      topbar.appendChild(actionsDiv);
    }

    // 2. Update Sidebar Footer
    const sidebarFooter = document.querySelector(".admin-sidebar-footer");
    if (sidebarFooter) {
      sidebarFooter.style.display = "flex";
      sidebarFooter.style.flexDirection = "column";
      sidebarFooter.style.gap = "0.5rem";

      let viewStoreLink = "";
      if (isManager) {
        viewStoreLink = `<a href="../index.html" class="btn btn-outline btn-sm" style="width: 100%; text-align: center;">🛍️ Xem Cửa Hàng</a>`;
      }

      sidebarFooter.innerHTML = `
        ${viewStoreLink}
        <button class="btn btn-sm admin-logout-btn" style="width: 100%; background: #FFF0F2; color: var(--primary); border: 1px solid var(--border-color); font-weight: 600; text-align: center;" onclick="Auth.logout()">🚪 Đăng Xuất Tài Khoản</button>
      `;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Auth.initAuthModal();
  Auth.updateHeaderAuthUI();
  Auth.updateAdminAuthUI();
});

window.Auth = Auth;
