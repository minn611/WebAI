const { pool } = require('../config/db');

const toppingController = {
  // GET /api/toppings
  async getAll(req, res) {
    try {
      const [rows] = await pool.query(
        `SELECT id, ma_topping, ten_topping, gia_them, trang_thai FROM TOPPING ORDER BY id ASC`
      );

      const toppings = rows.map(r => ({
        id: r.ma_topping || `top-${r.id}`,
        dbId: r.id,
        name: r.ten_topping,
        price: parseFloat(r.gia_them),
        status: r.trang_thai ? 'available' : 'disabled',
        inStock: Boolean(r.trang_thai)
      }));

      return res.json({ 
        success: true, 
        count: toppings.length, 
        data: toppings, 
        toppings: toppings 
      });
    } catch (error) {
      console.error('Error fetching toppings:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // POST /api/toppings
  async create(req, res) {
    try {
      const { name, price, status, inStock } = req.body;
      if (!name || price === undefined) {
        return res.status(400).json({ success: false, message: 'Tên topping và giá tiền là bắt buộc!' });
      }

      const topCode = `top-${Date.now().toString().slice(-4)}`;
      const isAvailable = inStock !== undefined ? (inStock !== false && inStock !== 'false') : (status !== 'disabled');

      const [result] = await pool.query(
        `INSERT INTO TOPPING (ma_topping, ten_topping, gia_them, trang_thai) VALUES (?, ?, ?, ?)`,
        [topCode, name.trim(), price, isAvailable]
      );

      return res.status(201).json({
        success: true,
        id: topCode,
        dbId: result.insertId,
        message: 'Thêm topping mới thành công!'
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // PUT /api/toppings/:id
  async update(req, res) {
    try {
      const topId = String(req.params.id || '').trim();
      const isNum = /^\d+$/.test(topId);
      const numId = isNum ? parseInt(topId, 10) : -1;
      const { name, price, status, inStock } = req.body;
      const isAvailable = inStock !== undefined ? (inStock !== false && inStock !== 'false') : (status !== 'disabled');

      const [result] = await pool.query(
        `UPDATE TOPPING 
         SET ten_topping = COALESCE(?, ten_topping),
             gia_them = COALESCE(?, gia_them),
             trang_thai = ?
         WHERE ma_topping = ? OR id = ?`,
        [name ? name.trim() : null, price !== undefined ? price : null, isAvailable, topId, numId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: `Không tìm thấy topping "${topId}" để cập nhật!` });
      }

      return res.json({ success: true, message: 'Cập nhật topping thành công!' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // DELETE /api/toppings/:id
  async delete(req, res) {
    try {
      const topId = String(req.params.id || '').trim();
      const isNum = /^\d+$/.test(topId);
      const numId = isNum ? parseInt(topId, 10) : -1;

      // Tìm thông tin topping trước khi xóa
      const [topRows] = await pool.query(
        'SELECT id, ma_topping, ten_topping FROM TOPPING WHERE ma_topping = ? OR id = ? LIMIT 1',
        [topId, numId]
      );

      if (topRows.length === 0) {
        return res.status(404).json({ success: false, message: `Không tìm thấy topping "${topId}" để xóa!` });
      }

      const dbId = topRows[0].id;
      const topName = topRows[0].ten_topping;

      await pool.query('DELETE FROM TOPPING WHERE id = ?', [dbId]);

      const time = new Date().toLocaleTimeString('vi-VN');
      console.log(`\n========================================================================`);
      console.log(`🗑️ [THÔNG BÁO MÁY CHỦ] [${time}]`);
      console.log(`   👤 Tác nhân:  Quản Lý (Admin)`);
      console.log(`   ⚡ Thao tác:  XÓA TOPPING: [${topRows[0].ma_topping}] ${topName}`);
      console.log(`========================================================================\n`);

      return res.json({ success: true, message: `Đã xóa topping "${topName}" khỏi cơ sở dữ liệu thành công!` });
    } catch (error) {
      console.error('Error deleting topping:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = toppingController;
