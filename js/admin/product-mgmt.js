/* ==========================================================================
   TEAJOY STORE - PRODUCT & TOPPING MANAGEMENT CONTROLLER
   ========================================================================== */

const ProductMgmt = {
  currentTab: "products",

  getApiBase() {
    if (typeof window !== "undefined" && window.location && window.location.origin) {
      if (window.location.origin.includes("5000")) {
        return "/api";
      }
    }
    return "http://localhost:5000/api";
  },

  async init() {
    await this.syncFromAPI();
    this.renderProductsTable();
    this.renderToppingsTable();
    this.initFilters();
  },

  async syncFromAPI() {
    try {
      const api = this.getApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const resP = await fetch(`${api}/products`, { signal: controller.signal });
      const dataP = await resP.json();
      const prodList = dataP.success && (Array.isArray(dataP.products) ? dataP.products : (Array.isArray(dataP.data) ? dataP.data : null));
      if (prodList && prodList.length > 0) {
        DB.set(STORAGE_KEYS.PRODUCTS, prodList);
      }

      const resT = await fetch(`${api}/toppings`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const dataT = await resT.json();
      const topList = dataT.success && (Array.isArray(dataT.toppings) ? dataT.toppings : (Array.isArray(dataT.data) ? dataT.data : null));
      if (topList && topList.length > 0) {
        const normalized = topList.map(t => ({
          ...t,
          inStock: t.inStock !== undefined ? t.inStock : (t.status !== 'disabled')
        }));
        DB.saveToppings(normalized);
      }
    } catch (err) {
      console.warn("API Sync notice:", err.message);
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    const prodContent = document.getElementById("products-tab-content");
    const topContent = document.getElementById("toppings-tab-content");
    const prodBtn = document.getElementById("tab-prod-btn");
    const topBtn = document.getElementById("tab-top-btn");

    if (tab === "products") {
      prodContent.style.display = "block";
      topContent.style.display = "none";
      prodBtn.style.borderBottom = "2.5px solid var(--primary)";
      prodBtn.style.color = "var(--primary)";
      topBtn.style.borderBottom = "none";
      topBtn.style.color = "var(--text-muted)";
    } else {
      prodContent.style.display = "none";
      topContent.style.display = "block";
      topBtn.style.borderBottom = "2.5px solid var(--primary)";
      topBtn.style.color = "var(--primary)";
      prodBtn.style.borderBottom = "none";
      prodBtn.style.color = "var(--text-muted)";
    }
  },

  initFilters() {
    const searchInput = document.getElementById("admin-prod-search");
    const catSelect = document.getElementById("admin-prod-cat-filter");

    if (searchInput) {
      searchInput.addEventListener("input", () => this.renderProductsTable());
    }
    if (catSelect) {
      catSelect.addEventListener("change", () => this.renderProductsTable());
    }
  },

  renderProductsTable() {
    const tbody = document.getElementById("admin-products-tbody");
    if (!tbody) return;

    let products = DB.getProducts();
    const query = document.getElementById("admin-prod-search")?.value.trim().toLowerCase();
    const cat = document.getElementById("admin-prod-cat-filter")?.value;

    if (cat && cat !== "all") {
      products = products.filter(p => p.category === cat);
    }
    if (query) {
      products = products.filter(p => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
    }

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Không tìm thấy sản phẩm nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const imgSrc = p.image ? (p.image.startsWith('http') || p.image.startsWith('../') ? p.image : `../${p.image}`) : '../images/products/hong-tra-mochi-keo-dai.jpg';
      return `
      <tr>
        <td>
          <img src="${imgSrc}" alt="${p.name}" onerror="this.onerror=null; this.src='../images/products/hong-tra-mochi-keo-dai.jpg';" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover;">
        </td>
        <td>
          <div class="font-bold">${p.name}</div>
          <span class="text-xs text-muted">Mã: ${p.id}</span>
        </td>
        <td><span class="badge badge-secondary">${p.category}</span></td>
        <td>
          <div class="font-bold" style="color: var(--primary);">${Formatters.currency(p.price)}</div>
          ${p.oldPrice ? `<div class="text-xs text-muted" style="text-decoration: line-through;">${Formatters.currency(p.oldPrice)}</div>` : ''}
        </td>
        <td><b>${p.stockQty || 0}</b> ly</td>
        <td>
          <span class="badge ${p.inStock ? 'badge-success' : 'badge-danger'}">
            ${p.inStock ? 'Còn Hàng' : 'Hết Hàng'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-icon-btn" onclick="ProductMgmt.openEditModal('${p.id}')" title="Chỉnh sửa">✏️</button>
            <button class="action-icon-btn btn-del" onclick="ProductMgmt.deleteProduct('${p.id}')" title="Xóa món">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  },

  renderToppingsTable() {
    const tbody = document.getElementById("admin-toppings-tbody");
    if (!tbody) return;

    const toppings = DB.getToppings();
    tbody.innerHTML = toppings.map(t => `
      <tr>
        <td class="font-bold text-primary">${t.id}</td>
        <td class="font-semibold">${t.name}</td>
        <td class="font-bold">${Formatters.currency(t.price)}</td>
        <td>
          <span class="badge ${t.inStock ? 'badge-success' : 'badge-danger'}">
            ${t.inStock ? 'Đang Phục Vụ' : 'Tạm Hết'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-icon-btn" onclick="ProductMgmt.openEditToppingModal('${t.id}')" title="Chỉnh sửa topping">✏️</button>
            <button class="action-icon-btn" onclick="ProductMgmt.toggleToppingStock('${t.id}')" title="Đổi trạng thái">${t.inStock ? '⏸️' : '▶️'}</button>
            <button class="action-icon-btn btn-del" onclick="ProductMgmt.deleteTopping('${t.id}')" title="Xóa topping">🗑️</button>
          </div>
        </td>
      </tr>
    `).join("");
  },

  openAddToppingModal() {
    document.getElementById("topping-modal-title").textContent = "Thêm Topping Mới";
    document.getElementById("form-top-id").value = "";
    document.getElementById("form-top-name").value = "";
    document.getElementById("form-top-price").value = "";
    document.getElementById("form-top-status").value = "true";
    Modal.open("topping-form-modal");
  },

  openEditToppingModal(toppingId) {
    const t = DB.getToppings().find(item => item.id === toppingId);
    if (!t) return;
    document.getElementById("topping-modal-title").textContent = "Chỉnh Sửa Topping";
    document.getElementById("form-top-id").value = t.id;
    document.getElementById("form-top-name").value = t.name;
    document.getElementById("form-top-price").value = t.price;
    document.getElementById("form-top-status").value = t.inStock ? "true" : "false";
    Modal.open("topping-form-modal");
  },

  async saveToppingSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("form-top-id").value;
    const name = document.getElementById("form-top-name").value.trim();
    const price = parseInt(document.getElementById("form-top-price").value) || 0;
    const inStock = document.getElementById("form-top-status").value === "true";
    const api = this.getApiBase();

    try {
      if (id) {
        const res = await fetch(`${api}/toppings/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, price, inStock, status: inStock ? 'available' : 'disabled' })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          Toast.error(data.message || "Không thể cập nhật topping vào cơ sở dữ liệu!");
          return;
        }
      } else {
        const res = await fetch(`${api}/toppings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, price, status: inStock ? 'available' : 'disabled', inStock })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          Toast.error(data.message || "Không thể thêm topping vào cơ sở dữ liệu!");
          return;
        }
      }

      await this.syncFromAPI();
      Toast.success(`Đã lưu topping <b>${name}</b> thành công!`);
      if (typeof AuditLogger !== "undefined") {
        AuditLogger.notifyServer(
          id ? `CẬP NHẬT TOPPING: [${id}] ${name}` : `THÊM TOPPING MỚI: ${name}`,
          `Giá thêm: ${Formatters.currency(price)} | Phục vụ: ${inStock ? 'Còn hàng' : 'Tạm hết'}`,
          "Quản Lý Cửa Hàng",
          "ADMIN"
        );
      }
      Modal.close("topping-form-modal");
      this.renderToppingsTable();
    } catch (err) {
      console.error("Lỗi khi lưu topping:", err);
      Toast.error("Lỗi kết nối máy chủ khi lưu topping!");
    }
  },

  openAddModal() {
    document.getElementById("product-modal-title").textContent = "Thêm Sản Phẩm Mới";
    document.getElementById("form-prod-id").value = "";
    document.getElementById("form-prod-sku").value = `TS-0${DB.getProducts().length + 1}`;
    document.getElementById("form-prod-name").value = "";
    document.getElementById("form-prod-price").value = "";
    document.getElementById("form-prod-old-price").value = "";
    document.getElementById("form-prod-stock").value = "100";
    document.getElementById("form-prod-image").value = "https://images.unsplash.com/photo-1558857563-b37fcdd72460?auto=format&fit=crop&w=600&q=80";
    document.getElementById("form-prod-desc").value = "";
    Modal.open("product-form-modal");
  },

  openEditModal(productId) {
    const p = DB.getProductById(productId);
    if (!p) return;

    document.getElementById("product-modal-title").textContent = "Chỉnh Sửa Sản Phẩm";
    document.getElementById("form-prod-id").value = p.id;
    document.getElementById("form-prod-sku").value = p.id;
    document.getElementById("form-prod-name").value = p.name;
    document.getElementById("form-prod-cat").value = p.category;
    document.getElementById("form-prod-price").value = p.price;
    document.getElementById("form-prod-old-price").value = p.oldPrice || "";
    document.getElementById("form-prod-stock").value = p.stockQty || 50;
    document.getElementById("form-prod-status").value = p.inStock ? "true" : "false";
    document.getElementById("form-prod-image").value = p.image || "";
    document.getElementById("form-prod-desc").value = p.description || "";

    Modal.open("product-form-modal");
  },

  async saveProductSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById("form-prod-id").value;
    const sku = document.getElementById("form-prod-sku").value.trim().toUpperCase();
    const name = document.getElementById("form-prod-name").value.trim();
    const cat = document.getElementById("form-prod-cat").value;
    const price = parseInt(document.getElementById("form-prod-price").value) || 0;
    const oldPrice = parseInt(document.getElementById("form-prod-old-price").value) || 0;
    const stockQty = parseInt(document.getElementById("form-prod-stock").value) || 0;
    const inStock = document.getElementById("form-prod-status").value === "true";
    const image = document.getElementById("form-prod-image").value.trim() || "https://images.unsplash.com/photo-1558857563-b37fcdd72460?auto=format&fit=crop&w=600&q=80";
    const desc = document.getElementById("form-prod-desc").value.trim();
    const api = this.getApiBase();

    try {
      if (editId) {
        const res = await fetch(`${api}/products/${encodeURIComponent(editId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            category: cat,
            price,
            oldPrice,
            stockQty,
            inStock,
            image,
            description: desc
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          Toast.error(data.message || "Không thể cập nhật sản phẩm vào cơ sở dữ liệu!");
          return;
        }
      } else {
        const res = await fetch(`${api}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku,
            category: cat,
            name,
            description: desc,
            price,
            originalPrice: oldPrice || null,
            image,
            stockQty,
            inStock
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          Toast.error(data.message || "Không thể thêm sản phẩm vào cơ sở dữ liệu!");
          return;
        }
      }

      await this.syncFromAPI();
      Toast.success(`Đã lưu sản phẩm <b>${name}</b> thành công!`);
      if (typeof AuditLogger !== "undefined") {
        AuditLogger.notifyServer(
          editId ? `CHỈNH SỬA MÓN: [${editId}] ${name}` : `THÊM MÓN MỚI: [${sku}] ${name}`,
          `Giá bán: ${Formatters.currency(price)} | Danh mục: ${cat} | Tồn kho: ${stockQty}`,
          "Quản Lý Cửa Hàng",
          "ADMIN"
        );
      }
      Modal.close("product-form-modal");
      this.renderProductsTable();
    } catch (err) {
      console.error("Lỗi khi lưu sản phẩm:", err);
      Toast.error("Lỗi kết nối máy chủ khi lưu sản phẩm!");
    }
  },

  async deleteProduct(productId) {
    if (!productId) return;
    const p = DB.getProductById(productId);
    const prodName = p ? p.name : productId;

    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${prodName}" (${productId}) khỏi cơ sở dữ liệu?`)) {
      return;
    }

    try {
      const api = this.getApiBase();
      const res = await fetch(`${api}/products/${encodeURIComponent(productId)}`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        Toast.error(data.message || "Không thể xóa sản phẩm khỏi cơ sở dữ liệu!");
        return;
      }

      // Xóa thành công từ database -> cập nhật UI & localStorage
      DB.deleteProduct(productId);
      Toast.success(`Đã xóa sản phẩm <b>${prodName}</b> khỏi cơ sở dữ liệu!`);
      if (typeof AuditLogger !== "undefined") {
        AuditLogger.notifyServer(`XÓA MÓN KHỎI THỰC ĐƠN: [${productId}] ${prodName}`, `Đã xóa vĩnh viễn khỏi cơ sở dữ liệu`, "Quản Lý Cửa Hàng", "ADMIN");
      }
      this.renderProductsTable();
    } catch (err) {
      console.error("Lỗi khi xóa sản phẩm:", err);
      Toast.error("Không thể kết nối máy chủ để xóa sản phẩm!");
    }
  },

  async toggleToppingStock(toppingId) {
    const toppings = DB.getToppings();
    const target = toppings.find(t => t.id === toppingId);
    if (target) {
      const nextState = !target.inStock;
      try {
        const api = this.getApiBase();
        const res = await fetch(`${api}/toppings/${encodeURIComponent(toppingId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inStock: nextState })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          Toast.error(data.message || "Không thể cập nhật trạng thái topping trong DB!");
          return;
        }

        target.inStock = nextState;
        DB.saveToppings(toppings);
        Toast.success(`Đã cập nhật trạng thái topping: <b>${target.name}</b> (${nextState ? 'Đang Phục Vụ' : 'Tạm Hết'})`);
        this.renderToppingsTable();
      } catch (err) {
        console.error("Lỗi cập nhật trạng thái topping:", err);
        Toast.error("Lỗi kết nối máy chủ khi cập nhật trạng thái topping!");
      }
    }
  },

  async deleteTopping(toppingId) {
    if (!toppingId) return;
    const toppings = DB.getToppings();
    const target = toppings.find(t => t.id === toppingId);
    const name = target ? target.name : toppingId;

    if (!confirm(`Bạn có chắc muốn xóa topping "${name}" khỏi cơ sở dữ liệu?`)) {
      return;
    }

    try {
      const api = this.getApiBase();
      const res = await fetch(`${api}/toppings/${encodeURIComponent(toppingId)}`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        Toast.error(data.message || "Không thể xóa topping khỏi cơ sở dữ liệu!");
        return;
      }

      // Xóa thành công từ database -> cập nhật UI & localStorage
      const updated = toppings.filter(t => t.id !== toppingId);
      DB.saveToppings(updated);

      Toast.success(`Đã xóa topping <b>${name}</b> khỏi cơ sở dữ liệu!`);
      if (typeof AuditLogger !== "undefined") {
        AuditLogger.notifyServer(`XÓA TOPPING: [${toppingId}] ${name}`, `Đã xóa vĩnh viễn khỏi cơ sở dữ liệu`, "Quản Lý Cửa Hàng", "ADMIN");
      }
      this.renderToppingsTable();
    } catch (err) {
      console.error("Lỗi khi xóa topping:", err);
      Toast.error("Không thể kết nối máy chủ để xóa topping!");
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  ProductMgmt.init();
});
