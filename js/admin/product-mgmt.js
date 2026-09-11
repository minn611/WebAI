/* ==========================================================================
   TEAJOY STORE - PRODUCT & TOPPING MANAGEMENT CONTROLLER
   ========================================================================== */

const ProductMgmt = {
  currentTab: "products",

  async init() {
    await this.syncFromAPI();
    this.renderProductsTable();
    this.renderToppingsTable();
    this.initFilters();
  },

  async syncFromAPI() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resP = await fetch("http://localhost:5000/api/products", { signal: controller.signal });
      const dataP = await resP.json();
      const prodList = dataP.success && (Array.isArray(dataP.products) ? dataP.products : (Array.isArray(dataP.data) ? dataP.data : null));
      if (prodList) {
        prodList.forEach(p => DB.saveProduct(p));
      }

      const resT = await fetch("http://localhost:5000/api/toppings", { signal: controller.signal });
      clearTimeout(timeoutId);
      const dataT = await resT.json();
      const topList = dataT.success && (Array.isArray(dataT.toppings) ? dataT.toppings : (Array.isArray(dataT.data) ? dataT.data : null));
      if (topList) {
        topList.forEach(t => DB.saveTopping(t));
      }
    } catch (err) {}
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
            <button class="action-icon-btn" onclick="ProductMgmt.toggleToppingStock('${t.id}')" title="Đổi trạng thái">${t.inStock ? '⏸️' : '▶️'}</button>
            <button class="action-icon-btn btn-del" onclick="ProductMgmt.deleteTopping('${t.id}')" title="Xóa topping">🗑️</button>
          </div>
        </td>
      </tr>
    `).join("");
  },

  openAddToppingModal() {
    document.getElementById("form-top-id").value = "";
    document.getElementById("form-top-name").value = "";
    document.getElementById("form-top-price").value = "";
    document.getElementById("form-top-status").value = "true";
    Modal.open("topping-form-modal");
  },

  async saveToppingSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("form-top-id").value;
    const name = document.getElementById("form-top-name").value.trim();
    const price = parseInt(document.getElementById("form-top-price").value) || 0;
    const inStock = document.getElementById("form-top-status").value === "true";

    const toppings = DB.getToppings();
    if (id) {
      const idx = toppings.findIndex(t => t.id === id);
      if (idx >= 0) {
        toppings[idx] = { ...toppings[idx], name, price, inStock };
      }
      try {
        await fetch(`http://localhost:5000/api/toppings/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, price, inStock })
        });
      } catch (err) {}
    } else {
      const newTop = {
        id: `top-${toppings.length + 1}`,
        name,
        price,
        inStock
      };
      toppings.push(newTop);
      try {
        await fetch("http://localhost:5000/api/toppings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, price, status: inStock ? 'available' : 'disabled' })
        });
      } catch (err) {}
    }

    DB.saveToppings(toppings);
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
  },

  async deleteTopping(toppingId) {
    if (confirm(`Bạn có chắc muốn xóa topping ${toppingId}?`)) {
      let toppings = DB.getToppings();
      toppings = toppings.filter(t => t.id !== toppingId);
      DB.saveToppings(toppings);
      try {
        await fetch(`http://localhost:5000/api/toppings/${toppingId}`, {
          method: "DELETE"
        });
      } catch (err) {}
      Toast.info("Đã xóa topping.");
      if (typeof AuditLogger !== "undefined") {
        AuditLogger.notifyServer(`XÓA TOPPING: [${toppingId}]`, `Đã xóa topping khỏi hệ thống`, "Quản Lý Cửa Hàng", "ADMIN");
      }
      this.renderToppingsTable();
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

    const productObj = {
      id: editId || sku,
      name,
      category: cat,
      price,
      oldPrice,
      stockQty,
      inStock,
      image,
      description: desc,
      rating: 5.0,
      sold: 10
    };

    DB.saveProduct(productObj);

    // Đồng bộ trực tiếp lên Backend API Server (MySQL Database)
    try {
      if (editId) {
        await fetch(`http://localhost:5000/api/products/${editId}`, {
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
      } else {
        await fetch("http://localhost:5000/api/products", {
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
            stockQty
          })
        });
      }
    } catch (err) {}

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
  },

  async deleteProduct(productId) {
    if (confirm(`Bạn có chắc muốn xóa sản phẩm ${productId} khỏi thực đơn?`)) {
      DB.deleteProduct(productId);
      try {
        await fetch(`http://localhost:5000/api/products/${productId}`, {
          method: "DELETE"
        });
      } catch (err) {}
      Toast.info("Đã xóa sản phẩm.");
      if (typeof AuditLogger !== "undefined") {
        AuditLogger.notifyServer(`XÓA MÓN KHỎI THỰC ĐƠN: [${productId}]`, `Đã xóa sản phẩm khỏi hệ thống`, "Quản Lý Cửa Hàng", "ADMIN");
      }
      this.renderProductsTable();
    }
  },

  async toggleToppingStock(toppingId) {
    const toppings = DB.getToppings();
    const target = toppings.find(t => t.id === toppingId);
    if (target) {
      target.inStock = !target.inStock;
      DB.saveToppings(toppings);
      try {
        await fetch(`http://localhost:5000/api/toppings/${toppingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inStock: target.inStock })
        });
      } catch (err) {}
      Toast.success(`Đã cập nhật trạng thái topping: <b>${target.name}</b>`);
      this.renderToppingsTable();
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  ProductMgmt.init();
});
