const { pool } = require('../config/db');

const productController = {
  // GET /api/products
  async getAll(req, res) {
    try {
      const [rows] = await pool.query(
        `SELECT id, ma_sku, danh_muc, ten_san_pham, mo_ta, gia_goc, gia_khuyen_mai, 
                hinh_anh_url, so_luong_ton, da_ban, danh_gia_tb, trang_thai 
         FROM SAN_PHAM ORDER BY id ASC`
      );

      const products = rows.map(r => ({
        id: r.ma_sku || `TS-${String(r.id).padStart(2, '0')}`,
        dbId: r.id,
        sku: r.ma_sku,
        category: r.danh_muc,
        name: r.ten_san_pham,
        description: r.mo_ta,
        price: parseFloat(r.gia_goc),
        oldPrice: r.gia_khuyen_mai ? parseFloat(r.gia_khuyen_mai) : null,
        image: r.hinh_anh_url,
        stockQty: r.so_luong_ton,
        soldQty: r.da_ban,
        sold: r.da_ban || 0,
        rating: parseFloat(r.danh_gia_tb),
        inStock: Boolean(r.trang_thai && r.so_luong_ton > 0)
      }));

      return res.json({ 
        success: true, 
        count: products.length, 
        data: products, 
        products: products 
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/products/:id -> Lấy chi tiết 1 sản phẩm theo SKU hoặc DB ID
  async getById(req, res) {
    try {
      const prodId = req.params.id;
      const [rows] = await pool.query(
        `SELECT id, ma_sku, danh_muc, ten_san_pham, mo_ta, gia_goc, gia_khuyen_mai,
                hinh_anh_url, so_luong_ton, da_ban, danh_gia_tb, trang_thai
         FROM SAN_PHAM
         WHERE ma_sku = ? OR id = ?
         LIMIT 1`,
        [prodId, prodId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: `Không tìm thấy sản phẩm "${prodId}"` });
      }

      const r = rows[0];
      const product = {
        id: r.ma_sku || `TS-${String(r.id).padStart(2, '0')}`,
        dbId: r.id,
        sku: r.ma_sku,
        category: r.danh_muc,
        name: r.ten_san_pham,
        description: r.mo_ta,
        price: parseFloat(r.gia_goc),
        oldPrice: r.gia_khuyen_mai ? parseFloat(r.gia_khuyen_mai) : null,
        image: r.hinh_anh_url,
        stockQty: r.so_luong_ton,
        sold: r.da_ban || 0,
        rating: parseFloat(r.danh_gia_tb),
        inStock: Boolean(r.trang_thai && r.so_luong_ton > 0)
      };

      return res.json({ success: true, data: product, product });
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // POST /api/products
  async create(req, res) {
    try {
      const { sku, category, name, description, price, originalPrice, image, stockQty } = req.body;
      if (!name || !price || !category) {
        return res.status(400).json({ success: false, message: 'Tên, giá và danh mục là bắt buộc!' });
      }

      const productSku = sku || `TS-${Date.now().toString().slice(-4)}`;
      const [result] = await pool.query(
        `INSERT INTO SAN_PHAM (ma_sku, danh_muc, ten_san_pham, mo_ta, gia_goc, gia_khuyen_mai, hinh_anh_url, so_luong_ton)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [productSku, category, name, description || '', price, originalPrice || null, image || 'https://images.unsplash.com/photo-1558857563-b37fcdd72460?auto=format&fit=crop&w=600&q=80', stockQty || 100]
      );

      const time = new Date().toLocaleTimeString('vi-VN');
      console.log(`\n========================================================================`);
      console.log(`🧋 [THÔNG BÁO MÁY CHỦ] [${time}]`);
      console.log(`   👤 Tác nhân:  Quản Lý (Admin)`);
      console.log(`   ⚡ Thao tác:  THÊM MÓN ĐỒ UỐNG MỚI: [${productSku}] ${name}`);
      console.log(`   💰 Giá bán:   ${parseFloat(price).toLocaleString('vi-VN')} ₫ | Danh mục: ${category}`);
      console.log(`========================================================================\n`);

      return res.status(201).json({ success: true, id: productSku, dbId: result.insertId, message: 'Thêm sản phẩm mới thành công!' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // PUT /api/products/:id -> Cập nhật sản phẩm
  async update(req, res) {
    try {
      const prodId = req.params.id;
      const { category, name, description, price, originalPrice, oldPrice, image, stockQty, inStock } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({ success: false, message: 'Tên và giá sản phẩm là bắt buộc!' });
      }

      const isAvailable = inStock !== false && inStock !== 'false';
      const promoPrice = originalPrice !== undefined ? originalPrice : (oldPrice || null);

      await pool.query(
        `UPDATE SAN_PHAM 
         SET danh_muc = COALESCE(?, danh_muc),
             ten_san_pham = ?,
             mo_ta = COALESCE(?, mo_ta),
             gia_goc = ?,
             gia_khuyen_mai = ?,
             hinh_anh_url = COALESCE(?, hinh_anh_url),
             so_luong_ton = COALESCE(?, so_luong_ton),
             trang_thai = ?
         WHERE ma_sku = ? OR id = ?`,
        [category, name.trim(), description, price, promoPrice, image, stockQty !== undefined ? stockQty : 50, isAvailable, prodId, prodId]
      );

      const time = new Date().toLocaleTimeString('vi-VN');
      console.log(`\n========================================================================`);
      console.log(`✏️ [THÔNG BÁO MÁY CHỦ] [${time}]`);
      console.log(`   👤 Tác nhân:  Quản Lý (Admin)`);
      console.log(`   ⚡ Thao tác:  CHỈNH SỬA MÓN: [${prodId}] ${name}`);
      console.log(`   💰 Giá mới:   ${parseFloat(price).toLocaleString('vi-VN')} ₫`);
      console.log(`========================================================================\n`);

      return res.json({ success: true, message: `Cập nhật sản phẩm "${name}" thành công!` });
    } catch (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // DELETE /api/products/:id -> Xóa sản phẩm
  async delete(req, res) {
    try {
      const prodId = req.params.id;
      await pool.query('DELETE FROM SAN_PHAM WHERE ma_sku = ? OR id = ?', [prodId, prodId]);

      const time = new Date().toLocaleTimeString('vi-VN');
      console.log(`\n========================================================================`);
      console.log(`🗑️ [THÔNG BÁO MÁY CHỦ] [${time}]`);
      console.log(`   👤 Tác nhân:  Quản Lý (Admin)`);
      console.log(`   ⚡ Thao tác:  XÓA MÓN KHỎI THỰC ĐƠN: Mã ${prodId}`);
      console.log(`========================================================================\n`);

      return res.json({ success: true, message: `Đã xóa sản phẩm ${prodId} thành công!` });
    } catch (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = productController;
