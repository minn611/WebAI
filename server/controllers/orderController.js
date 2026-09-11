const { pool } = require('../config/db');

const orderController = {
  // POST /api/orders -> Create Order into DON_HANG, CHI_TIET_DON_HANG, THANH_TOAN
  async create(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { 
        orderId, 
        orderCode: customOrderCode, 
        customerName, 
        phone, 
        customerPhone, 
        address, 
        customerAddress, 
        notes, 
        note, 
        items, 
        paymentMethod, 
        voucherCode, 
        discountAmount, 
        discount, 
        shippingFee 
      } = req.body;

      const clientPhone = (phone || customerPhone || '').trim();
      const clientAddress = (address || customerAddress || '').trim();
      const clientName = (customerName || '').trim();
      const clientNotes = (notes || note || '').trim();
      const clientDiscount = discountAmount !== undefined ? parseFloat(discountAmount) : (parseFloat(discount) || 0);

      if (!clientName || !clientPhone || !clientAddress || !items || items.length === 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin nhận hàng và danh sách món!' });
      }

      // Ưu tiên dùng mã đơn do client sinh (e.g. TS-4892) để đồng bộ tuyệt đối với LocalStorage
      const finalOrderCode = orderId || customOrderCode || `TS-${Math.floor(1000 + Math.random() * 9000)}`;

      // Calculate totals
      let itemsTotal = 0;
      items.forEach(item => {
        const uPrice = parseFloat(item.unitPrice || item.price || 0);
        const qty = parseInt(item.quantity || 1);
        itemsTotal += (uPrice * qty);
      });

      const finalShipping = shippingFee !== undefined ? parseFloat(shippingFee) : 15000;
      const totalAmount = Math.max(0, itemsTotal + finalShipping - clientDiscount);

      // 1. Insert into DON_HANG
      const [orderResult] = await connection.query(
        `INSERT INTO DON_HANG (ma_don_hang, ten_nguoi_nhan, sdt_nguoi_nhan, dia_chi_giao_hang, ghi_chu, tong_tien_mon, phi_van_chuyen, so_tien_giam_gia, tong_thanh_toan, trang_thai_don_hang, ngay_dat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [finalOrderCode, clientName, clientPhone, clientAddress, clientNotes, itemsTotal, finalShipping, clientDiscount, totalAmount]
      );

      const dbOrderId = orderResult.insertId;

      // 2. Insert into CHI_TIET_DON_HANG for each item
      for (const item of items) {
        const uPrice = parseFloat(item.unitPrice || item.price || 0);
        const qty = parseInt(item.quantity || 1);
        const itemTotal = item.subtotal || (uPrice * qty);
        const toppingsJson = item.toppings ? JSON.stringify(item.toppings.map(t => typeof t === 'string' ? { name: t } : t)) : '[]';

        // Get product ID or default to 1
        const [pRows] = await connection.query('SELECT id FROM SAN_PHAM WHERE ma_sku = ? LIMIT 1', [item.productId || 'TS-01']);
        const productId = pRows.length > 0 ? pRows[0].id : 1;

        await connection.query(
          `INSERT INTO CHI_TIET_DON_HANG (don_hang_id, san_pham_id, ten_san_pham, kich_thuoc, muc_duong, muc_da, danh_sach_topping, don_gia, so_luong, thanh_tien)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [dbOrderId, productId, item.name, item.size || 'M', item.sugar || '100%', item.ice || '100%', toppingsJson, uPrice, qty, itemTotal]
        );
      }

      // 3. Insert into THANH_TOAN
      const payMethodMap = { 'vietqr': 'vietqr', 'cod': 'cod' };
      const method = payMethodMap[paymentMethod] || 'cod';
      const initialStatus = method === 'vietqr' ? 'cho_thanh_toan' : 'cho_thanh_toan';

      await connection.query(
        `INSERT INTO THANH_TOAN (don_hang_id, phuong_thuc, so_tien, trang_thai, ngay_tao)
         VALUES (?, ?, ?, ?, NOW())`,
        [dbOrderId, method, totalAmount, initialStatus]
      );

      await connection.commit();
      connection.release();

      const time = new Date().toLocaleTimeString('vi-VN');
      console.log(`\n========================================================================`);
      console.log(`🔔 [THÔNG BÁO MÁY CHỦ] [${time}]`);
      console.log(`   👤 Tác nhân:  Khách Hàng: ${clientName} (SĐT: ${clientPhone})`);
      console.log(`   ⚡ Thao tác:  ĐẶT ĐƠN HÀNG MỚI #${finalOrderCode}`);
      console.log(`   💰 Tổng tiền: ${parseFloat(totalAmount).toLocaleString('vi-VN')} ₫ | Phương thức: ${method.toUpperCase()}`);
      console.log(`   📍 Địa chỉ:   ${clientAddress}`);
      console.log(`   🧋 Danh sách: ${items.map(i => `${i.name} (${i.size || 'M'}, x${i.quantity || 1})`).join(', ')}`);
      console.log(`========================================================================\n`);

      return res.status(201).json({
        success: true,
        orderId: finalOrderCode,
        id: finalOrderCode,
        dbId: dbOrderId,
        totalAmount,
        message: 'Tạo đơn hàng thành công!'
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error creating order:', error);
      return res.status(500).json({ success: false, message: 'Lỗi khi tạo đơn hàng: ' + error.message });
    }
  },

  // GET /api/orders -> Get all orders (Tối ưu: Chỉ dùng 2 truy vấn SQL gom nhóm thay vì 1+N vòng lặp)
  async getAll(req, res) {
    try {
      const [orders] = await pool.query(
        `SELECT dh.*, tt.phuong_thuc, tt.trang_thai as trang_thai_tt
         FROM DON_HANG dh
         LEFT JOIN THANH_TOAN tt ON dh.id = tt.don_hang_id
         ORDER BY dh.ngay_dat DESC`
      );

      if (orders.length === 0) {
        return res.json({ success: true, count: 0, data: [], orders: [] });
      }

      const orderIds = orders.map(o => o.id);
      const [allItems] = await pool.query(
        `SELECT * FROM CHI_TIET_DON_HANG WHERE don_hang_id IN (?) ORDER BY id ASC`,
        [orderIds]
      );

      // Nhóm chi tiết món theo don_hang_id
      const itemsByOrderId = new Map();
      for (const it of allItems) {
        if (!itemsByOrderId.has(it.don_hang_id)) {
          itemsByOrderId.set(it.don_hang_id, []);
        }

        let toppingsList = [];
        try {
          if (typeof it.danh_sach_topping === 'string') {
            const parsed = JSON.parse(it.danh_sach_topping);
            toppingsList = Array.isArray(parsed) ? parsed.map(t => typeof t === 'object' && t.name ? t.name : t) : [];
          } else if (Array.isArray(it.danh_sach_topping)) {
            toppingsList = it.danh_sach_topping.map(t => typeof t === 'object' && t.name ? t.name : t);
          }
        } catch (e) {
          toppingsList = [];
        }

        itemsByOrderId.get(it.don_hang_id).push({
          name: it.ten_san_pham,
          size: it.kich_thuoc,
          sugar: it.muc_duong,
          ice: it.muc_da,
          toppings: toppingsList,
          unitPrice: parseFloat(it.don_gia),
          quantity: it.so_luong,
          subtotal: parseFloat(it.thanh_tien),
          totalPrice: parseFloat(it.thanh_tien)
        });
      }

      const formattedOrders = orders.map(dh => ({
        id: dh.ma_don_hang,
        orderId: dh.ma_don_hang,
        dbId: dh.id,
        customerName: dh.ten_nguoi_nhan,
        phone: dh.sdt_nguoi_nhan,
        customerPhone: dh.sdt_nguoi_nhan,
        address: dh.dia_chi_giao_hang,
        customerAddress: dh.dia_chi_giao_hang,
        note: dh.ghi_chu,
        notes: dh.ghi_chu,
        itemsTotal: parseFloat(dh.tong_tien_mon || 0),
        shippingFee: parseFloat(dh.phi_van_chuyen || 0),
        discount: parseFloat(dh.so_tien_giam_gia || 0),
        discountAmount: parseFloat(dh.so_tien_giam_gia || 0),
        totalAmount: parseFloat(dh.tong_thanh_toan || 0),
        status: dh.trang_thai_don_hang,
        orderStatus: dh.trang_thai_don_hang,
        paymentMethod: dh.phuong_thuc || 'cod',
        paymentStatus: (dh.trang_thai_tt === 'da_thanh_toan' || dh.trang_thai_tt === 'thanh_cong') ? 'paid' : 'pending',
        createdAt: dh.ngay_dat,
        items: itemsByOrderId.get(dh.id) || []
      }));

      return res.json({ 
        success: true, 
        count: formattedOrders.length, 
        data: formattedOrders,
        orders: formattedOrders
      });

    } catch (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/orders/:id -> Tra cứu 1 đơn hàng theo mã đơn, dbId hoặc số điện thoại
  async getById(req, res) {
    try {
      const searchKey = req.params.id.trim();

      const [orders] = await pool.query(
        `SELECT dh.*, tt.phuong_thuc, tt.trang_thai as trang_thai_tt
         FROM DON_HANG dh
         LEFT JOIN THANH_TOAN tt ON dh.id = tt.don_hang_id
         WHERE dh.ma_don_hang = ? OR dh.id = ? OR dh.sdt_nguoi_nhan = ?
         ORDER BY dh.ngay_dat DESC LIMIT 1`,
        [searchKey, searchKey, searchKey]
      );

      if (orders.length === 0) {
        return res.status(404).json({ success: false, message: `Không tìm thấy đơn hàng "${searchKey}"` });
      }

      const dh = orders[0];
      const [items] = await pool.query(
        `SELECT * FROM CHI_TIET_DON_HANG WHERE don_hang_id = ? ORDER BY id ASC`,
        [dh.id]
      );

      const formattedItems = items.map(it => {
        let toppingsList = [];
        try {
          if (typeof it.danh_sach_topping === 'string') {
            const parsed = JSON.parse(it.danh_sach_topping);
            toppingsList = Array.isArray(parsed) ? parsed.map(t => typeof t === 'object' && t.name ? t.name : t) : [];
          } else if (Array.isArray(it.danh_sach_topping)) {
            toppingsList = it.danh_sach_topping.map(t => typeof t === 'object' && t.name ? t.name : t);
          }
        } catch (e) {
          toppingsList = [];
        }

        return {
          name: it.ten_san_pham,
          size: it.kich_thuoc,
          sugar: it.muc_duong,
          ice: it.muc_da,
          toppings: toppingsList,
          unitPrice: parseFloat(it.don_gia),
          quantity: it.so_luong,
          subtotal: parseFloat(it.thanh_tien),
          totalPrice: parseFloat(it.thanh_tien)
        };
      });

      const formattedOrder = {
        id: dh.ma_don_hang,
        orderId: dh.ma_don_hang,
        dbId: dh.id,
        customerName: dh.ten_nguoi_nhan,
        phone: dh.sdt_nguoi_nhan,
        customerPhone: dh.sdt_nguoi_nhan,
        address: dh.dia_chi_giao_hang,
        customerAddress: dh.dia_chi_giao_hang,
        note: dh.ghi_chu,
        notes: dh.ghi_chu,
        itemsTotal: parseFloat(dh.tong_tien_mon || 0),
        shippingFee: parseFloat(dh.phi_van_chuyen || 0),
        discount: parseFloat(dh.so_tien_giam_gia || 0),
        discountAmount: parseFloat(dh.so_tien_giam_gia || 0),
        totalAmount: parseFloat(dh.tong_thanh_toan || 0),
        status: dh.trang_thai_don_hang,
        orderStatus: dh.trang_thai_don_hang,
        paymentMethod: dh.phuong_thuc || 'cod',
        paymentStatus: (dh.trang_thai_tt === 'da_thanh_toan' || dh.trang_thai_tt === 'thanh_cong') ? 'paid' : 'pending',
        createdAt: dh.ngay_dat,
        items: formattedItems
      };

      return res.json({
        success: true,
        order: formattedOrder,
        data: formattedOrder
      });

    } catch (error) {
      console.error('Error fetching order by ID:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // PUT /api/orders/:id/status -> Update status
  async updateStatus(req, res) {
    try {
      const orderId = req.params.id;
      const { status } = req.body;

      if (!status) return res.status(400).json({ success: false, message: 'Trạng thái là bắt buộc!' });

      await pool.query(
        `UPDATE DON_HANG SET trang_thai_don_hang = ? WHERE ma_don_hang = ? OR id = ?`,
        [status, orderId, orderId]
      );

      const time = new Date().toLocaleTimeString('vi-VN');
      console.log(`\n========================================================================`);
      console.log(`🔔 [THÔNG BÁO MÁY CHỦ] [${time}]`);
      console.log(`   👤 Tác nhân:  Nhân Viên Quản Lý / Pha Chế / Thu Ngân`);
      console.log(`   ⚡ Thao tác:  CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG #${orderId}`);
      console.log(`   📊 Trạng thái: [${status.toUpperCase()}]`);
      console.log(`========================================================================\n`);

      return res.json({ success: true, message: `Cập nhật trạng thái đơn hàng sang ${status} thành công!` });

    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // DELETE /api/orders/:id -> Xóa đơn hàng khỏi MySQL
  async delete(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const orderId = req.params.id;

      // Tìm DB id từ mã đơn hoặc id số
      const [orderRows] = await connection.query(
        'SELECT id FROM DON_HANG WHERE ma_don_hang = ? OR id = ?',
        [orderId, orderId]
      );

      if (orderRows.length === 0) {
        connection.release();
        return res.status(404).json({ success: false, message: `Không tìm thấy đơn hàng "${orderId}"` });
      }

      const dbId = orderRows[0].id;

      // Xóa theo cascade (THANH_TOAN và CHI_TIET_DON_HANG đã có ON DELETE CASCADE)
      await connection.query('DELETE FROM DON_HANG WHERE id = ?', [dbId]);

      await connection.commit();
      connection.release();

      const time = new Date().toLocaleTimeString('vi-VN');
      console.log(`\n========================================================================`);
      console.log(`🔔 [THÔNG BÁO MÁY CHỦ] [${time}]`);
      console.log(`   👤 Tác nhân:  Quản Lý (Admin)`);
      console.log(`   ⚡ Thao tác:  XÓA ĐƠN HÀNG KHỎI HỆ THỐNG`);
      console.log(`   🗑️ Đơn hàng:  #${orderId} (DB ID: ${dbId})`);
      console.log(`========================================================================\n`);

      return res.json({ success: true, message: `Đã xóa đơn hàng ${orderId} thành công!` });
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error deleting order:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/orders/customer/:phone -> Lấy toàn bộ đơn hàng theo SĐT
  async getByPhone(req, res) {
    try {
      const phone = req.params.phone.trim();

      const [orders] = await pool.query(
        `SELECT dh.*, tt.phuong_thuc, tt.trang_thai as trang_thai_tt
         FROM DON_HANG dh
         LEFT JOIN THANH_TOAN tt ON dh.id = tt.don_hang_id
         WHERE dh.sdt_nguoi_nhan = ?
         ORDER BY dh.ngay_dat DESC
         LIMIT 20`,
        [phone]
      );

      if (orders.length === 0) {
        return res.status(404).json({ success: false, message: `Chưa có đơn hàng nào cho số điện thoại ${phone}` });
      }

      const formattedOrders = orders.map(dh => ({
        id: dh.ma_don_hang,
        orderId: dh.ma_don_hang,
        dbId: dh.id,
        customerName: dh.ten_nguoi_nhan,
        phone: dh.sdt_nguoi_nhan,
        customerPhone: dh.sdt_nguoi_nhan,
        address: dh.dia_chi_giao_hang,
        customerAddress: dh.dia_chi_giao_hang,
        note: dh.ghi_chu,
        itemsTotal: parseFloat(dh.tong_tien_mon || 0),
        shippingFee: parseFloat(dh.phi_van_chuyen || 0),
        discount: parseFloat(dh.so_tien_giam_gia || 0),
        totalAmount: parseFloat(dh.tong_thanh_toan || 0),
        status: dh.trang_thai_don_hang,
        orderStatus: dh.trang_thai_don_hang,
        paymentMethod: dh.phuong_thuc || 'cod',
        paymentStatus: (dh.trang_thai_tt === 'da_thanh_toan' || dh.trang_thai_tt === 'thanh_cong') ? 'paid' : 'pending',
        createdAt: dh.ngay_dat
      }));

      return res.json({ success: true, count: formattedOrders.length, orders: formattedOrders, data: formattedOrders });
    } catch (error) {
      console.error('Error fetching orders by phone:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = orderController;
