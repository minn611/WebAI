const { pool } = require('../config/db');

// @desc    Lấy danh sách khách hàng (Admin / Thu ngân)
// @route   GET /api/customers
exports.getAllCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT kh.id, kh.tai_khoan_id, kh.ho_ten, kh.dia_chi_mac_dinh, kh.diem_tich_luy,
             kh.hang_thanh_vien, kh.tong_chi_tieu, kh.so_don_da_mua, kh.ngay_tao,
             tk.ten_dang_nhap, tk.so_dien_thoai, tk.email
      FROM KHACH_HANG kh
      JOIN TAI_KHOAN tk ON kh.tai_khoan_id = tk.id
    `;
    let params = [];

    if (search) {
      query += ` WHERE kh.ho_ten LIKE ? OR tk.so_dien_thoai LIKE ? OR tk.ten_dang_nhap LIKE ?`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY kh.diem_tich_luy DESC`;

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách khách hàng' });
  }
};

// @desc    Lấy thông tin profile cá nhân khách hàng
// @route   GET /api/customers/profile/:accountId
exports.getCustomerProfile = async (req, res) => {
  try {
    const { accountId } = req.params;

    const [rows] = await pool.query(
      `SELECT kh.id, kh.ho_ten, kh.dia_chi_mac_dinh, kh.diem_tich_luy,
              kh.hang_thanh_vien, kh.tong_chi_tieu, kh.so_don_da_mua,
              tk.ten_dang_nhap, tk.so_dien_thoai, tk.email
       FROM KHACH_HANG kh
       JOIN TAI_KHOAN tk ON kh.tai_khoan_id = tk.id
       WHERE kh.tai_khoan_id = ? OR kh.id = ?`,
      [accountId, accountId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ khách hàng!' });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy hồ sơ khách hàng' });
  }
};

// @desc    Cập nhật điểm tích lũy & hạng thành viên (Admin / Thu ngân)
// @route   PUT /api/customers/:id/points
exports.updateCustomerPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { addPoints } = req.body;

    const points = parseInt(addPoints || 0, 10);
    if (isNaN(points)) {
      return res.status(400).json({ success: false, message: 'Số điểm không hợp lệ!' });
    }

    const [custRows] = await pool.query(`SELECT * FROM KHACH_HANG WHERE id = ?`, [id]);
    if (custRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Khách hàng không tồn tại!' });
    }

    const currentPoints = custRows[0].diem_tich_luy + points;
    
    // Tính toán hạng thành viên dựa trên tổng điểm
    let tier = 'dong';
    if (currentPoints >= 1000) tier = 'kim_cuong';
    else if (currentPoints >= 500) tier = 'vang';
    else if (currentPoints >= 200) tier = 'bac';

    await pool.query(
      `UPDATE KHACH_HANG SET diem_tich_luy = ?, hang_thanh_vien = ? WHERE id = ?`,
      [currentPoints, tier, id]
    );

    res.json({
      success: true,
      message: `Đã tích thêm ${points} điểm cho khách hàng thành công!`,
      newPoints: currentPoints,
      newTier: tier
    });
  } catch (error) {
    console.error('Error updating customer points:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật điểm tích lũy' });
  }
};

// @desc    Thêm khách hàng mới (Admin)
// @route   POST /api/customers
exports.createCustomer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { fullName, phone, email, points, tier, address } = req.body;

    if (!fullName || !phone) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Vui lòng nhập họ tên và số điện thoại!' });
    }

    const username = phone.trim();
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('123456', 10);

    // Kiểm tra tài khoản đã tồn tại
    const [existing] = await connection.query('SELECT id FROM TAI_KHOAN WHERE so_dien_thoai = ? OR ten_dang_nhap = ?', [phone.trim(), username]);
    let accountId;
    if (existing.length > 0) {
      accountId = existing[0].id;
    } else {
      const [accResult] = await connection.query(
        `INSERT INTO TAI_KHOAN (ten_dang_nhap, mat_khau_hash, so_dien_thoai, email, vai_tro, trang_thai)
         VALUES (?, ?, ?, ?, 'khach_hang', 'hoat_dong')`,
        [username, passwordHash, phone.trim(), email || null]
      );
      accountId = accResult.insertId;
    }

    // Tạo mã khách hàng
    const maKh = 'KH' + Date.now().toString().slice(-4);
    const pts = parseInt(points) || 0;
    let t = (tier || 'dong').toLowerCase();
    if (t.includes('kim')) t = 'kim_cuong';
    else if (t.includes('vang')) t = 'vang';
    else if (t.includes('bac')) t = 'bac';
    else t = 'dong';

    const [custResult] = await connection.query(
      `INSERT INTO KHACH_HANG (tai_khoan_id, ma_khach_hang, ho_ten, dia_chi_mac_dinh, diem_tich_luy, hang_thanh_vien)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [accountId, maKh, fullName.trim(), address || '', pts, t]
    );

    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: `Thêm khách hàng ${fullName} thành công!`,
      customerId: custResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi thêm khách hàng' });
  }
};

// @desc    Chỉnh sửa thông tin khách hàng (Admin)
// @route   PUT /api/customers/:id
exports.updateCustomer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const rawId = req.params.id;
    const id = rawId.replace(/^CUST-/, '');
    const { fullName, phone, email, points, tier } = req.body;

    let t = (tier || 'dong').toLowerCase();
    if (t.includes('kim')) t = 'kim_cuong';
    else if (t.includes('vang')) t = 'vang';
    else if (t.includes('bac')) t = 'bac';
    else t = 'dong';

    const [cust] = await connection.query('SELECT * FROM KHACH_HANG WHERE id = ?', [id]);
    if (cust.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng!' });
    }

    await connection.query(
      `UPDATE KHACH_HANG SET ho_ten = ?, diem_tich_luy = ?, hang_thanh_vien = ? WHERE id = ?`,
      [fullName.trim(), parseInt(points) || 0, t, id]
    );

    if (cust[0].tai_khoan_id) {
      await connection.query(
        `UPDATE TAI_KHOAN SET so_dien_thoai = ?, email = ? WHERE id = ?`,
        [phone.trim(), email ? email.trim() : null, cust[0].tai_khoan_id]
      );
    }

    await connection.commit();
    connection.release();

    res.json({ success: true, message: `Đã cập nhật khách hàng ${fullName} thành công!` });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error updating customer:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi cập nhật khách hàng' });
  }
};

// @desc    Xóa khách hàng (Admin)
// @route   DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const rawId = req.params.id;
    const id = rawId.replace(/^CUST-/, '');

    const [cust] = await connection.query('SELECT tai_khoan_id FROM KHACH_HANG WHERE id = ?', [id]);
    if (cust.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng để xóa!' });
    }

    const accId = cust[0].tai_khoan_id;
    await connection.query('DELETE FROM KHACH_HANG WHERE id = ?', [id]);
    if (accId) {
      await connection.query('DELETE FROM TAI_KHOAN WHERE id = ?', [accId]);
    }

    await connection.commit();
    connection.release();

    res.json({ success: true, message: 'Đã xóa khách hàng thành công khỏi hệ thống!' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error deleting customer:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi xóa khách hàng' });
  }
};

// @desc    Khóa / Mở khóa tài khoản khách hàng
// @route   PUT /api/customers/:id/toggle-lock
exports.toggleLock = async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = rawId.replace(/^CUST-/, '');
    const [cust] = await pool.query(
      `SELECT tk.id, tk.trang_thai, kh.ho_ten 
       FROM KHACH_HANG kh 
       JOIN TAI_KHOAN tk ON kh.tai_khoan_id = tk.id 
       WHERE kh.id = ?`,
      [id]
    );

    if (cust.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản khách hàng!' });
    }

    const newStatus = cust[0].trang_thai === 'tam_khoa' ? 'hoat_dong' : 'tam_khoa';
    await pool.query('UPDATE TAI_KHOAN SET trang_thai = ? WHERE id = ?', [newStatus, cust[0].id]);

    res.json({
      success: true,
      message: `Đã ${newStatus === 'tam_khoa' ? 'khóa' : 'mở khóa'} tài khoản khách hàng ${cust[0].ho_ten} thành công!`,
      status: newStatus
    });
  } catch (error) {
    console.error('Error toggling customer lock:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
