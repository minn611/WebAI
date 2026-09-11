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
