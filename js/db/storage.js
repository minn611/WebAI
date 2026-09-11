/* ==========================================================================
   TEAJOY STORE - LOCAL STORAGE DATABASE ENGINE
   ========================================================================== */

const STORAGE_KEYS = {
  PRODUCTS: "teajoy_products",
  CATEGORIES: "teajoy_categories",
  TOPPINGS: "teajoy_toppings",
  SIZES: "teajoy_sizes",
  ORDERS: "teajoy_orders",
  USERS: "teajoy_users",
  VOUCHERS: "teajoy_vouchers",
  SUPPLIERS: "teajoy_suppliers",
  BANNERS: "teajoy_banners",
  CART: "teajoy_cart",
  CURRENT_USER: "teajoy_current_user",
  THEME: "teajoy_theme",
  VERSION: "teajoy_version"
};

const DODO_VERSION = "dodo_v2026_full_menu_24_drinks";

const DB = {
  hasMojibake(text) {
    if (!text || typeof text !== "string") return false;
    // Chỉ bắt các chuỗi lỗi byte thực sự của UTF-8 (không bao giờ bắt các chữ cái tiếng Việt hợp lệ như Ô, Ê, Â, Ã)
    const mojibakePatterns = ["├á", "S├Я", "β╗", "N├г", "├─", "»a", "Tr ├á", "Ã¡", "Ã ", "Ã£", "Ã¢", "Ã©", "Ã¨", "Ãª", "Ã¬", "Ã³", "Ã²", "Ã´", "Ã¹", "Ãº"];
    return mojibakePatterns.some(pat => text.includes(pat));
  },

  // Initialize and Seed LocalStorage if empty or version updated
  init() {
    const currentVer = localStorage.getItem(STORAGE_KEYS.VERSION);
    const needRefresh = currentVer !== DODO_VERSION;

    if (needRefresh) {
      console.log("⚡ [Data Engine] Cập nhật phiên bản thực đơn Đô Đô mới nhất (24 món & 10 topping)...");
      this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
      this.set(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
      this.set(STORAGE_KEYS.TOPPINGS, INITIAL_TOPPINGS);
      this.set(STORAGE_KEYS.SIZES, INITIAL_SIZES);
      this.set(STORAGE_KEYS.VOUCHERS, INITIAL_VOUCHERS);
      this.set(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
      this.set(STORAGE_KEYS.BANNERS, INITIAL_BANNERS);

      const existingUsers = this.get(STORAGE_KEYS.USERS, []);
      const mergedUsers = [...INITIAL_USERS];
      existingUsers.forEach(u => {
        if (!mergedUsers.some(mu => mu.username.toLowerCase() === u.username.toLowerCase())) {
          mergedUsers.push(u);
        }
      });
      this.set(STORAGE_KEYS.USERS, mergedUsers);
      localStorage.setItem(STORAGE_KEYS.VERSION, DODO_VERSION);
    }

    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      this.set(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TOPPINGS)) {
      this.set(STORAGE_KEYS.TOPPINGS, INITIAL_TOPPINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SIZES)) {
      this.set(STORAGE_KEYS.SIZES, INITIAL_SIZES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      this.set(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.set(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.VOUCHERS)) {
      this.set(STORAGE_KEYS.VOUCHERS, INITIAL_VOUCHERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      this.set(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BANNERS)) {
      this.set(STORAGE_KEYS.BANNERS, INITIAL_BANNERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CART)) {
      this.set(STORAGE_KEYS.CART, []);
    }
    if (localStorage.getItem(STORAGE_KEYS.CURRENT_USER) === null) {
      this.set(STORAGE_KEYS.CURRENT_USER, null);
    }

    localStorage.setItem(STORAGE_KEYS.VERSION, DODO_VERSION);
  },

  get(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key);
      if (data && this.hasMojibake(data)) {
        console.warn(`[Mojibake Guard] Detected corrupted encoding in key "${key}", auto-repairing...`);
        localStorage.removeItem(key);
        this.init();
        const fresh = localStorage.getItem(key);
        return fresh ? JSON.parse(fresh) : defaultValue;
      }
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error("Storage parse error for key:", key, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("teajoy:storage_changed", { detail: { key, value } }));
    } catch (e) {
      console.error("Storage set error for key:", key, e);
    }
  },

  // Products CRUD
  getProducts() { return this.get(STORAGE_KEYS.PRODUCTS, []); },
  getProductById(id) {
    return this.getProducts().find(p => p.id === id);
  },
  saveProduct(product) {
    const list = this.getProducts();
    const index = list.findIndex(p => p.id === product.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...product };
    } else {
      list.unshift(product);
    }
    this.set(STORAGE_KEYS.PRODUCTS, list);
    return product;
  },
  deleteProduct(id) {
    let list = this.getProducts();
    list = list.filter(p => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, list);
  },

  // Orders CRUD
  getOrders() { return this.get(STORAGE_KEYS.ORDERS, []); },
  getOrderById(id) {
    return this.getOrders().find(o => o.id === id);
  },
  saveOrder(order) {
    const list = this.getOrders();
    const index = list.findIndex(o => o.id === order.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...order };
    } else {
      list.unshift(order);
    }
    this.set(STORAGE_KEYS.ORDERS, list);
    return order;
  },
  updateOrderStatus(orderId, newStatus) {
    const list = this.getOrders();
    const order = list.find(o => o.id === orderId);
    if (order) {
      order.orderStatus = newStatus;
      this.set(STORAGE_KEYS.ORDERS, list);
      return order;
    }
    return null;
  },

  // Users CRUD
  getUsers() { return this.get(STORAGE_KEYS.USERS, []); },
  getCurrentUser() { return this.get(STORAGE_KEYS.CURRENT_USER, null); },
  setCurrentUser(user) { this.set(STORAGE_KEYS.CURRENT_USER, user); },
  saveUser(user) {
    const list = this.getUsers();
    const index = list.findIndex(u => u.id === user.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...user };
    } else {
      list.push(user);
    }
    this.set(STORAGE_KEYS.USERS, list);
  },

  // Toppings & Categories
  getToppings() { return this.get(STORAGE_KEYS.TOPPINGS, []); },
  saveToppings(toppings) { this.set(STORAGE_KEYS.TOPPINGS, toppings); },
  saveTopping(topping) {
    const list = this.getToppings();
    const index = list.findIndex(t => t.id === topping.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...topping };
    } else {
      list.push(topping);
    }
    this.saveToppings(list);
  },
  getCategories() { return this.get(STORAGE_KEYS.CATEGORIES, []); },
  getVouchers() { return this.get(STORAGE_KEYS.VOUCHERS, []); },
  getSuppliers() { return this.get(STORAGE_KEYS.SUPPLIERS, []); },

  // Reset to initial demo data
  resetDatabase() {
    localStorage.clear();
    this.init();
    window.location.reload();
  }
};

// Auto initialize on script load
DB.init();

/* ==========================================================================
   REAL-TIME SERVER AUDIT LOGGER
   Gửi thông báo thao tác từ mọi tác nhân về hiển thị trực tiếp trên máy chủ
   ========================================================================== */
const AuditLogger = {
  notifyServer(action, detail = '', customActor = null, customRole = null) {
    try {
      const user = DB.getCurrentUser();
      let actor = customActor || (user ? user.fullName : "Khách Hàng Trực Tuyến");
      let role = customRole || (user ? (user.positionTitle || user.role).toUpperCase() : "KHÁCH HÀNG");

      fetch("http://localhost:5000/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, role, action, detail })
      }).catch(() => {});
    } catch (e) {}
  }
};

window.AuditLogger = AuditLogger;
