const { pool } = require('../config/db');

// @desc    Lấy danh sách tất cả Vouchers (Admin hoặc Client)
// @route   GET /api/vouchers
exports.getAllVouchers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, ma_voucher, loai_giam, gia_tri_giam, giam_toi_da, don_hang_toi_thieu,
              so_luong_phat_hanh, so_luong_da_dung, ngay_bat_dau, ngay_ket_thuc, mo_ta, trang_thai
       FROM VOUCHERS
       ORDER BY ngay_tao DESC`
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách voucher' });
  }
};

// @desc    Kiểm tra và áp dụng mã Voucher cho đơn hàng
// @route   POST /api/vouchers/apply
exports.applyVoucher = async (req, res) => {
  try {
    const { code, totalAmount } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá!' });
    }

    const [rows] = await pool.query(
      `SELECT * FROM VOUCHERS 
       WHERE ma_voucher = ? AND trang_thai = TRUE
       AND NOW() BETWEEN ngay_bat_dau AND ngay_ket_thuc`,
      [code.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn!' });
    }

    const voucher = rows[0];

    if (voucher.so_luong_da_dung >= voucher.so_luong_phat_hanh) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá này đã hết lượt sử dụng!' });
    }

    const subtotal = parseFloat(totalAmount || 0);
    const minOrder = parseFloat(voucher.don_hang_toi_thieu || 0);

    if (subtotal < minOrder) {
      return res.status(400).json({
        success: false,
        message: `Mã giảm giá áp dụng cho đơn hàng tối thiểu từ ${minOrder.toLocaleString('vi-VN')}đ!`
      });
    }

    // Tính số tiền được giảm
    let discountAmount = 0;
    if (voucher.loai_giam === 'phan_tram') {
      discountAmount = (subtotal * parseFloat(voucher.gia_tri_giam)) / 100;
      if (voucher.giam_toi_da && discountAmount > parseFloat(voucher.giam_toi_da)) {
        discountAmount = parseFloat(voucher.giam_toi_da);
      }
    } else {
      discountAmount = parseFloat(voucher.gia_tri_giam);
    }

    res.json({
      success: true,
      message: `Đã áp dụng mã ${voucher.ma_voucher} thành công!`,
      voucher: {
        id: voucher.id,
        code: voucher.ma_voucher,
        discountType: voucher.loai_giam,
        discountValue: voucher.gia_tri_giam,
        discountAmount: discountAmount,
        description: voucher.mo_ta
      }
    });
  } catch (error) {
    console.error('Error applying voucher:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xác thực voucher' });
  }
};

// @desc    Tạo mã Voucher mới (Admin)
// @route   POST /api/vouchers
exports.createVoucher = async (req, res) => {
  try {
    const {
      ma_voucher, loai_giam, gia_tri_giam, giam_toi_da,
      don_hang_toi_thieu, so_luong_phat_hanh, ngay_bat_dau, ngay_ket_thuc, mo_ta
    } = req.body;

    if (!ma_voucher || !loai_giam || !gia_tri_giam) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin mã giảm giá!' });
    }

    const [result] = await pool.query(
      `INSERT INTO VOUCHERS 
       (ma_voucher, loai_giam, gia_tri_giam, giam_toi_da, don_hang_toi_thieu, so_luong_phat_hanh, ngay_bat_dau, ngay_ket_thuc, mo_ta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ma_voucher.trim().toUpperCase(),
        loai_giam,
        gia_tri_giam,
        giam_toi_da || null,
        don_hang_toi_thieu || 0,
        so_luong_phat_hanh || 1000,
        ngay_bat_dau || new Date(),
        ngay_ket_thuc || new Date(Date.now() + 365*24*60*60*1000),
        mo_ta || ''
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo voucher mới thành công!',
      voucherId: result.insertId
    });
  } catch (error) {
    console.error('Error creating voucher:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Mã voucher này đã tồn tại!' });
    }
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo voucher' });
  }
};
