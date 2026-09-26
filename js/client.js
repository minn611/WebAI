/* ==========================================================================
   TEAJOY STORE - CLIENT APPLICATION LOGIC & CUSTOMIZER
   ========================================================================== */

const ClientApp = {
  activeCustomizerProduct: null,
  customizerState: {
    size: "M",
    sugar: "100%",
    ice: "100%",
    toppings: [],
    quantity: 1
  },

  init() {
    this.initCustomizerModal();
    this.initLuckyWheel();
    this.initLiveChat();
  },

  // Render a standard product card HTML
  renderProductCard(product) {
    const defaultImg = "images/products/hong-tra-mochi-keo-dai.jpg";
    const categoryLabels = {
      "mochi": "🍡 Mochi Kéo Dài",
      "tiramisu": "🍫 Tiramisu & Cookies",
      "tra-sua": "🧋 Trà Sữa Đô Đô",
      "tra-trai-cay": "🍊 Trà Hoa Quả",
      "da-xay": "🍧 Đá Xay",
      "ca-phe": "☕ Cà Phê"
    };
    const categoryDisplay = categoryLabels[product.category] || product.category;

    return `
      <div class="product-card" data-product-id="${product.id}">
        ${product.oldPrice ? `<span class="badge badge-discount">-${Math.round((1 - product.price / product.oldPrice) * 100)}%</span>` : ""}
        ${product.isBestseller ? `<span class="badge badge-warning badge-tag">🔥 Hot</span>` : (product.isNew ? `<span class="badge badge-secondary badge-tag">✨ Mới</span>` : "")}
        <div class="card-img-wrap" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor: pointer;" title="Xem chi tiết ly ${product.name}">
          <img src="${product.image || defaultImg}" alt="${product.name}" loading="lazy" onerror="this.onerror=null; this.src='${defaultImg}';">
          <div class="quick-view-overlay" style="position: absolute; inset: 0; background: rgba(230,0,35,0.3); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.25s ease;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
            <span class="btn btn-primary btn-sm" style="box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-weight: 700;">👁️ Xem Chi Tiết Ly</span>
          </div>
        </div>
        <div class="card-body">
          <span class="card-category" style="color: var(--primary); font-weight: 700; font-size: 0.78rem;">${categoryDisplay}</span>
          <h3 class="card-title">
            <a href="product-detail.html?id=${product.id}" style="color: inherit; text-decoration: none;" title="Xem chi tiết ${product.name}">
              ${product.name}
            </a>
          </h3>
          <div class="card-rating">
            <span>⭐ ${product.rating || 5.0}</span>
            <span style="color: var(--text-subtle);">(${product.sold || 0} đã bán)</span>
          </div>
          <div class="card-footer" style="gap: 0.5rem; flex-wrap: wrap; justify-content: space-between; align-items: center; padding-top: 0.85rem;">
            <div class="price-wrap">
              <span class="current-price" style="font-size: 1.2rem;">${Formatters.currency(product.price)}</span>
              ${product.oldPrice ? `<span class="oldPrice" style="font-size: 0.75rem; text-decoration: line-through; color: var(--text-subtle);">${Formatters.currency(product.oldPrice)}</span>` : ""}
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <a href="product-detail.html?id=${product.id}" class="btn-card-detail" title="Xem công thức & tùy chỉnh">
                Chi Tiết ➔
              </a>
              <button class="btn-customize-quick" onclick="ClientApp.openCustomizer('${product.id}')" title="Chọn Size & Topping nhanh">
                🛒 Chọn Món
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // Visual Milk Tea Builder & Customizer Modal
  // --------------------------------------------------------------------------
  openCustomizer(productId, editingItemKey = null) {
    const product = DB.getProductById(productId);
    if (!product) return;

    this.activeCustomizerProduct = product;
    this.editingItemKey = editingItemKey;
    this.customizerState = {
      size: "M",
      sugar: "100%",
      ice: "100%",
      toppings: [],
      quantity: 1
    };

    if (editingItemKey) {
      const cart = Cart.getCart();
      const existing = cart.find(i => i.itemKey === editingItemKey);
      if (existing) {
        this.customizerState = {
          size: existing.size || "M",
          sugar: existing.sugar || "100%",
          ice: existing.ice || "100%",
          toppings: Array.isArray(existing.toppings) ? [...existing.toppings] : [],
          quantity: existing.quantity || 1
        };
      }
    }

    const modal = document.getElementById("product-customizer-modal");
    if (!modal) return;

    // Fill Product Info
    document.getElementById("cust-product-name").textContent = product.name;
    document.getElementById("cust-product-desc").textContent = product.description;
    document.getElementById("cust-product-base-price").textContent = Formatters.currency(product.price);
    
    // Render Topping Checkboxes
    const toppings = DB.getToppings();
    const toppingListEl = document.getElementById("cust-toppings-list");
    if (toppingListEl) {
      toppingListEl.innerHTML = toppings.map(top => {
        const isChecked = this.customizerState.toppings.includes(top.name);
        return `
        <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s;" class="topping-option-label ${isChecked ? 'checked' : ''}" id="cust-top-label-${top.id}">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <input type="checkbox" value="${top.name}" data-price="${top.price}" ${isChecked ? 'checked' : ''} onchange="ClientApp.toggleTopping('${top.name}', ${top.price}, this.checked, 'cust-top-label-${top.id}')">
            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-main);">${top.name}</span>
          </div>
          <span style="font-size: 0.85rem; font-weight: 800; color: var(--primary); background: rgba(230,0,35,0.08); padding: 2px 8px; border-radius: 20px;">+${Formatters.currency(top.price)}</span>
        </label>
      `;}).join("");
    }

    // Reset controls
    document.querySelectorAll(".cust-size-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-size") === this.customizerState.size);
    });
    document.querySelectorAll(".cust-sugar-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-sugar") === this.customizerState.sugar);
    });
    document.querySelectorAll(".cust-ice-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-ice") === this.customizerState.ice);
    });

    const qtyInput = document.getElementById("cust-qty-input");
    if (qtyInput) qtyInput.value = this.customizerState.quantity;

    this.updateCustomizerVisual();
    this.calculateCustomizerPrice();

    Modal.open("product-customizer-modal");
  },

  selectSize(size, extraPrice) {
    this.customizerState.size = size;
    document.querySelectorAll(".cust-size-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-size") === size);
    });
    this.updateCustomizerVisual();
    this.calculateCustomizerPrice();
  },

  selectSugar(sugar) {
    this.customizerState.sugar = sugar;
    document.querySelectorAll(".cust-sugar-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-sugar") === sugar);
    });
    this.updateCustomizerVisual();
  },

  selectIce(ice) {
    this.customizerState.ice = ice;
    document.querySelectorAll(".cust-ice-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-ice") === ice);
    });
    this.updateCustomizerVisual();
  },

  toggleTopping(toppingName, price, isChecked, labelId) {
    if (isChecked) {
      if (!this.customizerState.toppings.includes(toppingName)) {
        this.customizerState.toppings.push(toppingName);
      }
    } else {
      this.customizerState.toppings = this.customizerState.toppings.filter(t => t !== toppingName);
    }
    if (labelId) {
      const el = document.getElementById(labelId);
      if (el) el.classList.toggle("checked", isChecked);
    }
    this.updateCustomizerVisual();
    this.calculateCustomizerPrice();
  },

  updateQuantity(delta) {
    const maxQty = (this.activeCustomizerProduct && typeof this.activeCustomizerProduct.stockQty === "number") ? this.activeCustomizerProduct.stockQty : 99;
    let q = this.customizerState.quantity + delta;
    if (q < 1) q = 1;
    if (q > maxQty && maxQty > 0) {
      q = maxQty;
      Toast.warning(`Sản phẩm này chỉ còn ${maxQty} ly trong kho!`);
    }
    this.customizerState.quantity = q;
    const qtyInput = document.getElementById("cust-qty-input");
    if (qtyInput) qtyInput.value = q;
    this.calculateCustomizerPrice();
  },

  calculateCustomizerPrice() {
    if (!this.activeCustomizerProduct) return 0;
    
    let basePrice = this.activeCustomizerProduct.price;
    
    // Size extra
    const sizes = DB.get(STORAGE_KEYS.SIZES, INITIAL_SIZES);
    const sizeObj = sizes.find(s => s.id === this.customizerState.size);
    let sizePrice = 0;
    if (sizeObj && typeof sizeObj.extraPrice === "number") {
      sizePrice = sizeObj.extraPrice;
    } else if (this.customizerState.size === "L") {
      sizePrice = 10000;
    }

    // Toppings total
    const toppings = DB.getToppings();
    let toppingsPrice = 0;
    this.customizerState.toppings.forEach(topName => {
      const found = toppings.find(t => t.name === topName);
      if (found) toppingsPrice += found.price;
    });

    const unitPrice = basePrice + sizePrice + toppingsPrice;
    const totalPrice = unitPrice * this.customizerState.quantity;

    const unitPriceEl = document.getElementById("cust-unit-price");
    const totalPriceEl = document.getElementById("cust-total-price");
    if (unitPriceEl) unitPriceEl.textContent = Formatters.currency(unitPrice);
    if (totalPriceEl) totalPriceEl.textContent = Formatters.currency(totalPrice);

    return { unitPrice, totalPrice };
  },

  // Update SVG/CSS Visual Tea Cup dynamically based on user selections
  updateCustomizerVisual() {
    const iceLayer = document.getElementById("visual-ice-layer");
    const toppingsLayer = document.getElementById("visual-toppings-layer");
    const liquidLayer = document.getElementById("visual-liquid-layer");

    if (liquidLayer && this.activeCustomizerProduct) {
      // Change liquid color based on category
      const cat = this.activeCustomizerProduct.category;
      if (cat === "tra-trai-cay") {
        liquidLayer.style.background = "linear-gradient(180deg, #F4A261 0%, #E76F51 100%)";
      } else if (this.activeCustomizerProduct.id.includes("TS-03")) {
        liquidLayer.style.background = "linear-gradient(180deg, #74C69D 0%, #40916C 100%)"; // Matcha
      } else if (this.activeCustomizerProduct.id.includes("TS-04")) {
        liquidLayer.style.background = "linear-gradient(180deg, #BDB2FF 0%, #7D6B90 100%)"; // Taro
      } else {
        liquidLayer.style.background = "linear-gradient(180deg, #D4A373 0%, #B08968 100%)"; // Milk tea
      }
    }

    // Ice Level Visual
    if (iceLayer) {
      const icePct = parseInt(this.customizerState.ice);
      if (icePct === 0) {
        iceLayer.style.opacity = "0";
      } else {
        iceLayer.style.opacity = (icePct / 100).toString();
      }
    }

    // Toppings Dots Visual
    if (toppingsLayer) {
      toppingsLayer.innerHTML = "";
      this.customizerState.toppings.forEach(topName => {
        if (topName.includes("Trân Châu")) {
          for (let i = 0; i < 6; i++) {
            const dot = document.createElement("div");
            dot.className = "pearl-dot";
            if (topName.includes("Hoàng Kim")) {
              dot.style.background = "radial-gradient(circle at 30% 30%, #E9C46A, #B08968)";
            }
            toppingsLayer.appendChild(dot);
          }
        } else if (topName.includes("Pudding") || topName.includes("Phô Mai")) {
          const cube = document.createElement("div");
          cube.className = "pudding-cube";
          toppingsLayer.appendChild(cube);
        }
      });
    }
  },

  addToCartFromCustomizer() {
    if (!this.activeCustomizerProduct) return;
    if (this.activeCustomizerProduct.inStock === false || this.activeCustomizerProduct.stockQty === 0) {
      Toast.error("Sản phẩm này tạm thời hết hàng!");
      return;
    }
    const { unitPrice } = this.calculateCustomizerPrice();

    if (this.editingItemKey) {
      Cart.removeItem(this.editingItemKey);
      this.editingItemKey = null;
    }

    Cart.addItem({
      productId: this.activeCustomizerProduct.id,
      name: this.activeCustomizerProduct.name,
      image: this.activeCustomizerProduct.image,
      size: this.customizerState.size,
      sugar: this.customizerState.sugar,
      ice: this.customizerState.ice,
      toppings: [...this.customizerState.toppings],
      quantity: this.customizerState.quantity,
      unitPrice
    });

    Modal.close("product-customizer-modal");
    if (typeof renderFullCartPage === "function") {
      renderFullCartPage();
    }
  },

  // --------------------------------------------------------------------------
  // Lucky Spin Wheel Minigame
  // --------------------------------------------------------------------------
  openLuckyWheel() {
    const section = document.getElementById("lucky-wheel-section") || document.querySelector(".lucky-spin-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.location.href = "index.html#lucky-wheel-section";
    }
  },

  initLuckyWheel() {
    const canvas = document.getElementById("lucky-wheel-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const segments = [
      { label: "Giảm 10%", code: "BANMOI10", color: "#FF758F" },
      { label: "Free Ship", code: "FREESHIP", color: "#FFB703" },
      { label: "Giảm 20k", code: "DODO20", color: "#52B788" },
      { label: "Chúc Bạn May Mắn", code: "", color: "#ADB5BD" },
      { label: "Giảm 15%", code: "LUCKYSPIN", color: "#9C6644" },
      { label: "Free Topping", code: "LUCKYSPIN", color: "#48CAE4" }
    ];

    const numSegments = segments.length;
    const arc = (2 * Math.PI) / numSegments;
    const radius = canvas.width / 2;

    function drawWheel() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < numSegments; i++) {
        const angle = i * arc;
        ctx.beginPath();
        ctx.fillStyle = segments[i].color;
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius, angle, angle + arc);
        ctx.lineTo(radius, radius);
        ctx.fill();

        // Draw Text
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(segments[i].label, radius - 20, 5);
        ctx.restore();
      }
    }

    drawWheel();

    let isSpinning = false;
    window.spinWheel = function() {
      if (isSpinning) return;
      
      const todayStr = new Date().toISOString().split("T")[0];
      const lastSpin = localStorage.getItem("teajoy_last_spin");
      if (lastSpin === todayStr) {
        Toast.warning("Bạn đã sử dụng lượt quay hôm nay rồi! Hãy quay lại vào ngày mai nhé 🍀");
        return;
      }

      isSpinning = true;
      localStorage.setItem("teajoy_last_spin", todayStr);

      const randomDegree = Math.floor(1800 + Math.random() * 1800); // 5+ full turns
      canvas.style.transform = `rotate(${randomDegree}deg)`;

      setTimeout(() => {
        isSpinning = false;
        // Calculate winning segment
        const actualDeg = randomDegree % 360;
        // Pointer is at the top (270 deg)
        const winningIndex = Math.floor(((360 - (actualDeg % 360) + 270) % 360) / (360 / numSegments));
        const prize = segments[winningIndex];

        if (prize.code) {
          Toast.success(`🎉 Chúc mừng! Bạn trúng: <b>${prize.label}</b> (Mã: <b>${prize.code}</b>)`);
        } else {
          Toast.info("Cảm ơn bạn đã tham gia! Chúc bạn may mắn lần sau nhé! 🍀");
        }

        if (typeof AuditLogger !== "undefined") {
          AuditLogger.notifyServer(
            `QUAY VÒNG MAY MẮN`,
            `Kết quả: ${prize.label} ${prize.code ? `(Mã quà tặng: ${prize.code})` : '(Chúc may mắn lần sau)'}`
          );
        }
      }, 4000);
    };
  },

  initCustomizerModal() {
    if (document.getElementById("product-customizer-modal")) return;

    const modalMarkup = `
      <div id="product-customizer-modal" class="modal-backdrop">
        <div class="modal-container" style="max-width: 780px;">
          <div class="modal-header">
            <h4 class="modal-title">Tùy Biến Ly Trà Sữa Của Bạn</h4>
            <button class="modal-close" data-close-modal="product-customizer-modal">✕</button>
          </div>
          <div class="modal-body" style="padding: 1.5rem;">
            <div class="cup-builder-container" style="padding: 1rem; border: none; box-shadow: none;">
              
              <!-- Visual Live Cup Graphic -->
              <div class="cup-visual-wrapper">
                <div class="tea-straw"></div>
                <div class="tea-cup">
                  <div class="cheese-foam-layer" id="visual-cheese-layer"></div>
                  <div class="tea-ice-layer" id="visual-ice-layer">
                    <div class="ice-cube"></div>
                    <div class="ice-cube"></div>
                    <div class="ice-cube"></div>
                  </div>
                  <div class="tea-liquid" id="visual-liquid-layer">
                    <div class="tea-toppings-layer" id="visual-toppings-layer"></div>
                  </div>
                </div>
                <div style="margin-top: 1rem; text-align: center;">
                  <span id="cust-unit-price" style="font-size: 1.25rem; font-weight: 800; color: var(--primary); font-family: var(--font-heading);">0 ₫</span>
                  <div class="text-xs text-muted">Đã gồm tùy chọn</div>
                </div>
              </div>

              <!-- Options Selection -->
              <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div>
                  <h3 id="cust-product-name" style="font-size: 1.35rem; margin-bottom: 0.35rem;">Tên Sản Phẩm</h3>
                  <p id="cust-product-desc" class="text-sm text-muted">Mô tả sản phẩm...</p>
                  <div style="font-size: 0.9rem; font-weight: 700; color: var(--primary); margin-top: 0.4rem;">
                    Giá gốc: <span id="cust-product-base-price">0 ₫</span>
                  </div>
                </div>

                <!-- Size Selection -->
                <div>
                  <label class="form-label" style="margin-bottom: 0.5rem; display: block;">1. Chọn Size Cốc</label>
                  <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-outline cust-size-btn active" data-size="M" onclick="ClientApp.selectSize('M', 0)">Size M — Tiêu Chuẩn</button>
                    <button class="btn btn-sm btn-outline cust-size-btn" data-size="L" onclick="ClientApp.selectSize('L', 10000)">Size L — Lớn (+10k)</button>
                  </div>
                </div>

                <!-- Sugar Selection -->
                <div>
                  <label class="form-label" style="margin-bottom: 0.5rem; display: block;">2. Lượng Đường</label>
                  <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-outline cust-sugar-btn" data-sugar="0%" onclick="ClientApp.selectSugar('0%')">0%</button>
                    <button class="btn btn-sm btn-outline cust-sugar-btn" data-sugar="30%" onclick="ClientApp.selectSugar('30%')">30%</button>
                    <button class="btn btn-sm btn-outline cust-sugar-btn" data-sugar="50%" onclick="ClientApp.selectSugar('50%')">50%</button>
                    <button class="btn btn-sm btn-outline cust-sugar-btn" data-sugar="70%" onclick="ClientApp.selectSugar('70%')">70%</button>
                    <button class="btn btn-sm btn-outline cust-sugar-btn active" data-sugar="100%" onclick="ClientApp.selectSugar('100%')">100% Chuẩn</button>
                  </div>
                </div>

                <!-- Ice Selection -->
                <div>
                  <label class="form-label" style="margin-bottom: 0.5rem; display: block;">3. Lượng Đá</label>
                  <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-outline cust-ice-btn" data-ice="0%" onclick="ClientApp.selectIce('0%')">Không đá</button>
                    <button class="btn btn-sm btn-outline cust-ice-btn" data-ice="30%" onclick="ClientApp.selectIce('30%')">30% đá</button>
                    <button class="btn btn-sm btn-outline cust-ice-btn" data-ice="50%" onclick="ClientApp.selectIce('50%')">50% đá</button>
                    <button class="btn btn-sm btn-outline cust-ice-btn active" data-ice="100%" onclick="ClientApp.selectIce('100%')">100% Đá riêng</button>
                  </div>
                </div>

                <!-- Toppings Selection -->
                <div>
                  <label class="form-label" style="margin-bottom: 0.5rem; display: block;">4. Chọn Thêm Topping</label>
                  <div id="cust-toppings-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; max-height: 180px; overflow-y: auto; padding-right: 4px;">
                    <!-- Injected toppings -->
                  </div>
                </div>

              </div>

            </div>
          </div>
          <div class="modal-footer" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="text-sm font-semibold">Số lượng:</span>
              <div class="qty-counter">
                <button class="qty-btn" onclick="ClientApp.updateQuantity(-1)">-</button>
                <input type="text" id="cust-qty-input" class="qty-input" value="1" readonly>
                <button class="qty-btn" onclick="ClientApp.updateQuantity(1)">+</button>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="text-align: right;">
                <div class="text-xs text-muted">Tổng cộng:</div>
                <div id="cust-total-price" style="font-size: 1.35rem; font-weight: 800; color: var(--primary); font-family: var(--font-heading);">0 ₫</div>
              </div>
              <button class="btn btn-primary btn-lg" onclick="ClientApp.addToCartFromCustomizer()">Thêm Vào Giỏ Hàng 🛒</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalMarkup);
  },

  // ==========================================================================
  // 💬 LIVE CHAT WIDGET - NHẮN TIN TRỰC TUYẾN VỚI CỬA HÀNG (UC 3.2.2.2.3 d)
  // ==========================================================================
  initLiveChat() {
    if (document.getElementById("teajoy-chat-widget")) return;

    const chatHtml = `
      <div id="teajoy-chat-widget" style="position: fixed; bottom: 22px; right: 22px; z-index: 9998; font-family: inherit;">
        <!-- Nút Bong Bóng Chat -->
        <button id="teajoy-chat-bubble" onclick="ClientApp.toggleLiveChat()" style="
          width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--primary, #E60023), #FF4B63);
          border: none; color: white; font-size: 1.55rem; cursor: pointer; box-shadow: 0 8px 24px rgba(230,0,35,0.4);
          display: flex; align-items: center; justify-content: center; position: relative; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        " title="Nhắn tin trò chuyện với Trà Sữa ĐÔ ĐÔ">
          💬
          <span style="position: absolute; top: 1px; right: 1px; width: 13px; height: 13px; background: #10B981; border: 2.5px solid white; border-radius: 50%;"></span>
        </button>

        <!-- Khung Cửa Sổ Trò Chuyện -->
        <div id="teajoy-chat-window" style="
          display: none; position: absolute; bottom: 68px; right: 0; width: 350px; max-width: 90vw; height: 460px; max-height: 80vh;
          background: #ffffff; border-radius: 16px; box-shadow: 0 12px 36px rgba(0,0,0,0.22); border: 1px solid rgba(0,0,0,0.08);
          flex-direction: column; overflow: hidden;
        ">
          <!-- Chat Header -->
          <div style="background: linear-gradient(135deg, var(--primary, #E60023), #FF4B63); color: white; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                🧋
              </div>
              <div>
                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; line-height: 1.2;">Trà Sữa ĐÔ ĐÔ</h4>
                <span style="font-size: 0.72rem; opacity: 0.9; display: flex; align-items: center; gap: 4px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981; display: inline-block;"></span> Trực tuyến tư vấn
                </span>
              </div>
            </div>
            <button onclick="ClientApp.toggleLiveChat()" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 2px 6px;">✕</button>
          </div>

          <!-- Danh sách tin nhắn -->
          <div id="teajoy-chat-messages" style="flex: 1; padding: 12px 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #F9FAFB;">
            <!-- Rendered by JS -->
          </div>

          <!-- Mẫu câu hỏi nhanh (Quick Chips) -->
          <div style="padding: 6px 10px; background: #FFFFFF; border-top: 1px solid #F3F4F6; display: flex; gap: 6px; overflow-x: auto; white-space: nowrap;">
            <button type="button" onclick="ClientApp.sendQuickMessage('Món nào đang bán chạy nhất quán ạ?')" style="font-size: 0.72rem; padding: 4px 8px; border-radius: 12px; border: 1px solid #E5E7EB; background: #F9FAFB; cursor: pointer;">🍡 Món Best-seller</button>
            <button type="button" onclick="ClientApp.sendQuickMessage('Hôm nay có mã giảm giá nào không?')" style="font-size: 0.72rem; padding: 4px 8px; border-radius: 12px; border: 1px solid #E5E7EB; background: #F9FAFB; cursor: pointer;">🎟️ Mã giảm giá</button>
            <button type="button" onclick="ClientApp.sendQuickMessage('Cho mình hỏi cách tra cứu đơn hàng')" style="font-size: 0.72rem; padding: 4px 8px; border-radius: 12px; border: 1px solid #E5E7EB; background: #F9FAFB; cursor: pointer;">🛵 Tra cứu đơn</button>
          </div>

          <!-- Form nhập tin nhắn -->
          <form onsubmit="ClientApp.handleChatSubmit(event)" style="display: flex; padding: 8px 10px; background: #ffffff; border-top: 1px solid #EEEEEE; gap: 6px;">
            <input type="text" id="teajoy-chat-input" placeholder="Nhập câu hỏi tư vấn..." style="flex: 1; border: 1px solid #E5E7EB; border-radius: 20px; padding: 8px 12px; font-size: 0.82rem; outline: none;">
            <button type="submit" style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary, #E60023); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">➤</button>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", chatHtml);
    this.loadChatMessages();
  },

  toggleLiveChat() {
    const win = document.getElementById("teajoy-chat-window");
    if (!win) return;
    const isHidden = win.style.display === "none" || win.style.display === "";
    win.style.display = isHidden ? "flex" : "none";
    if (isHidden) {
      setTimeout(() => {
        const inp = document.getElementById("teajoy-chat-input");
        if (inp) inp.focus();
        const container = document.getElementById("teajoy-chat-messages");
        if (container) container.scrollTop = container.scrollHeight;
      }, 100);
    }
  },

  async loadChatMessages() {
    const container = document.getElementById("teajoy-chat-messages");
    if (!container) return;

    let messages = [
      {
        id: "msg-0",
        sender: "bot",
        senderName: "Trợ Lý Đô Đô 🧋",
        message: "Xin chào quý khách! Trà Sữa ĐÔ ĐÔ hân hạnh phục vụ. Bạn có thể hỏi về các món bán chạy, ưu đãi hôm nay hoặc nhờ hỗ trợ đơn hàng nhé!",
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      }
    ];

    try {
      const apiBase = (typeof APIConfig !== "undefined") ? APIConfig.getBaseUrl() : "http://localhost:5000/api";
      const res = await fetch(`${apiBase}/messages`);
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        messages = json.data;
      }
    } catch (e) {
      // Offline fallback to local array
    }

    container.innerHTML = "";
    messages.forEach(m => this.appendChatMessage(m));
    container.scrollTop = container.scrollHeight;
  },

  appendChatMessage(m) {
    const container = document.getElementById("teajoy-chat-messages");
    if (!container) return;

    const isMe = m.sender === "customer";
    const timeStr = m.createdAt ? (m.createdAt.includes("T") ? new Date(m.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : m.createdAt) : "";

    const msgItem = document.createElement("div");
    msgItem.style.display = "flex";
    msgItem.style.flexDirection = "column";
    msgItem.style.alignItems = isMe ? "flex-end" : "flex-start";
    msgItem.style.maxWidth = "85%";
    msgItem.style.alignSelf = isMe ? "flex-end" : "flex-start";

    msgItem.innerHTML = `
      <span style="font-size: 0.68rem; color: #9CA3AF; margin-bottom: 2px;">${isMe ? "Bạn" : (m.senderName || "Trợ Lý Đô Đô")} ${timeStr ? "• " + timeStr : ""}</span>
      <div style="
        padding: 8px 12px; border-radius: ${isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px"};
        background: ${isMe ? "var(--primary, #E60023)" : "#FFFFFF"};
        color: ${isMe ? "#FFFFFF" : "#1F2937"};
        font-size: 0.82rem; line-height: 1.35;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        border: ${isMe ? "none" : "1px solid #E5E7EB"};
        word-break: break-word;
      ">
        ${m.message}
      </div>
    `;

    container.appendChild(msgItem);
    container.scrollTop = container.scrollHeight;
  },

  sendQuickMessage(text) {
    const inp = document.getElementById("teajoy-chat-input");
    if (inp) {
      inp.value = text;
      this.handleChatSubmit();
    }
  },

  async handleChatSubmit(e) {
    if (e) e.preventDefault();
    const inp = document.getElementById("teajoy-chat-input");
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    inp.value = "";

    const user = (typeof Auth !== "undefined" && Auth.getCurrentUser) ? Auth.getCurrentUser() : null;
    const myMsg = {
      sender: "customer",
      senderName: (user && user.fullName) || "Khách Hàng",
      message: text,
      createdAt: new Date().toISOString()
    };
    this.appendChatMessage(myMsg);

    try {
      const apiBase = (typeof APIConfig !== "undefined") ? APIConfig.getBaseUrl() : "http://localhost:5000/api";
      const res = await fetch(`${apiBase}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(myMsg)
      });
      const json = await res.json();
      if (json.success && json.autoReply) {
        setTimeout(() => {
          this.appendChatMessage(json.autoReply);
        }, 400);
      }
    } catch (err) {
      // Offline smart fallback
      setTimeout(() => {
        let reply = "Dạ Trà Sữa Đô Đô đã nhận được thông tin! Cửa hàng sẽ liên hệ phản hồi ngay ạ.";
        const low = text.toLowerCase();
        if (low.includes("món") || low.includes("menu")) {
          reply = "Quán khuyên bạn nên thử dòng Mochi kéo dài (Trà Sữa Tiramisu Mochi hoặc Hồng Trà Mochi) đang là best-seller số 1 nhé! 🍡";
        } else if (low.includes("voucher") || low.includes("giảm")) {
          reply = "Bạn có thể áp dụng mã 'BANMOI10' để được giảm 10% tại giỏ hàng nha! 🎟️";
        }
        this.appendChatMessage({
          sender: "bot",
          senderName: "Trợ Lý Đô Đô 🧋",
          message: reply,
          createdAt: new Date().toISOString()
        });
      }, 500);
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  ClientApp.init();
});

window.ClientApp = ClientApp;
