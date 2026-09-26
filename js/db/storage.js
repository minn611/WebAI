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
  REVIEWS: "teajoy_reviews",
  THEME: "teajoy_theme",
  VERSION: "teajoy_version"
};

const DODO_VERSION = "dodo_v2026_full_menu_24_drinks_reviews_v1";

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
      console.log("⚡ [Data Engine] Cập nhật phiên bản thực đơn & đánh giá Đô Đô mới nhất...");
      this.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
      this.set(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
      this.set(STORAGE_KEYS.TOPPINGS, INITIAL_TOPPINGS);
      this.set(STORAGE_KEYS.SIZES, INITIAL_SIZES);
      this.set(STORAGE_KEYS.VOUCHERS, INITIAL_VOUCHERS);
      this.set(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
      this.set(STORAGE_KEYS.BANNERS, INITIAL_BANNERS);
      this.set(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);

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
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent !== "undefined") {
        window.dispatchEvent(new CustomEvent("teajoy:storage_changed", { detail: { key, value } }));
      }
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
  saveOrders(orders) {
    this.set(STORAGE_KEYS.ORDERS, Array.isArray(orders) ? orders : []);
    return orders;
  },
  deleteOrder(id) {
    let list = this.getOrders();
    const sid = String(id || '').trim();
    list = list.filter(o => String(o.id || '') !== sid && String(o.orderId || '') !== sid && String(o.dbId || '') !== sid);
    this.set(STORAGE_KEYS.ORDERS, list);
    return list;
  },
  updateOrderStatus(orderId, newStatus) {
    const list = this.getOrders();
    const order = list.find(o => o.id === orderId || o.orderId === orderId);
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

  // Reviews & Management
  getReviews() { return this.get(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS); },
  saveReviews(reviews) { this.set(STORAGE_KEYS.REVIEWS, reviews); },
  saveReview(rev) {
    const list = this.getReviews();
    const newRev = {
      id: rev.id || (Date.now()),
      productId: rev.productId || 'TS-01',
      productName: rev.productName || 'Sản phẩm Đô Đô',
      productImage: rev.productImage || 'images/products/hong-tra-mochi-keo-dai.jpg',
      customerName: rev.customerName || 'Khách Hàng',
      customerPhone: rev.customerPhone || '',
      customerTier: rev.customerTier || 'VIP Đồng',
      rating: rev.rating || 5,
      comment: rev.comment || '',
      adminReply: rev.adminReply || '',
      visible: rev.visible !== undefined ? rev.visible : true,
      createdAt: rev.createdAt || new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    list.unshift(newRev);
    this.saveReviews(list);
    return newRev;
  },
  replyReview(id, replyText) {
    const list = this.getReviews();
    const target = list.find(r => String(r.id) === String(id));
    if (target) {
      target.adminReply = replyText;
      this.saveReviews(list);
      return true;
    }
    return false;
  },
  toggleReview(id) {
    const list = this.getReviews();
    const target = list.find(r => String(r.id) === String(id));
    if (target) {
      target.visible = !target.visible;
      this.saveReviews(list);
      return target.visible;
    }
    return false;
  },
  deleteReview(id) {
    let list = this.getReviews();
    list = list.filter(r => String(r.id) !== String(id));
    this.saveReviews(list);
  },

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

      const apiBase = (typeof APIConfig !== 'undefined' && typeof APIConfig.getBaseUrl === 'function')
        ? APIConfig.getBaseUrl()
        : (window.API_BASE || (window.location.origin.includes(':5000') ? '/api' : 'http://localhost:5000/api'));

      fetch(`${apiBase}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, role, action, detail })
      }).catch(() => {});
    } catch (e) {}
  }
};

if (typeof window !== "undefined") {
  window.DB = DB;
  window.STORAGE_KEYS = STORAGE_KEYS;
  window.DODO_VERSION = DODO_VERSION;
}
if (typeof global !== "undefined") {
  global.DB = DB;
  global.STORAGE_KEYS = STORAGE_KEYS;
  global.DODO_VERSION = DODO_VERSION;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DB, STORAGE_KEYS, DODO_VERSION };
}

window.AuditLogger = AuditLogger;
