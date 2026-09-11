const { pool } = require('../config/db');

// @desc    Lấy tóm tắt chỉ số KPI (Dashboard Summary)
// @route   GET /api/reports/summary
exports.getDashboardSummary = async (req, res) => {
  try {
    // 1. Tổng doanh thu từ các đơn hoàn thành
    const [revRows] = await pool.query(
      `SELECT 
        COALESCE(SUM(tong_thanh_toan), 0) AS tong_doanh_thu,
        COUNT(id) AS tong_don_hang,
        COALESCE(SUM(CASE WHEN trang_thai_don_hang = 'completed' THEN tong_thanh_toan ELSE 0 END), 0) AS doanh_thu_thuc_te,
        COUNT(CASE WHEN trang_thai_don_hang = 'completed' THEN 1 END) AS don_hoan_thanh,
        COUNT(CASE WHEN trang_thai_don_hang = 'cancelled' THEN 1 END) AS don_da_huy,
        COUNT(CASE WHEN trang_thai_don_hang IN ('pending', 'confirmed', 'preparing', 'shipping') THEN 1 END) AS don_dang_xu_ly
       FROM DON_HANG`
    );

    // 2. Số lượng khách hàng
    const [custRows] = await pool.query(`SELECT COUNT(id) AS tong_khach_hang FROM KHACH_HANG`);

    // 3. Số lượng nhân viên
    const [staffRows] = await pool.query(`SELECT COUNT(id) AS tong_nhan_vien FROM NHAN_VIEN WHERE trang_thai_lam_viec = 'dang_lam'`);

    // 4. Số lượng sản phẩm & cảnh báo tồn kho
    const [prodRows] = await pool.query(
      `SELECT 
        COUNT(id) AS tong_san_pham,
        COUNT(CASE WHEN so_luong_ton <= 15 THEN 1 END) AS san_pham_sap_het
       FROM SAN_PHAM`
    );

    res.json({
      success: true,
      data: {
        ...revRows[0],
        tong_khach_hang: custRows[0].tong_khach_hang,
        tong_nhan_vien: staffRows[0].tong_nhan_vien,
        tong_san_pham: prodRows[0].tong_san_pham,
        san_pham_sap_het: prodRows[0].san_pham_sap_het
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê summary:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy dữ liệu báo cáo' });
  }
};

// @desc    Lấy biểu đồ doanh thu theo 7 ngày gần nhất
// @route   GET /api/reports/revenue
exports.getRevenueChart = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        DATE(ngay_dat) AS ngay,
        DAYNAME(ngay_dat) AS thu,
        COALESCE(SUM(CASE WHEN trang_thai_don_hang != 'cancelled' THEN tong_thanh_toan ELSE 0 END), 0) AS doanh_thu,
        COUNT(id) AS so_don
       FROM DON_HANG
       WHERE ngay_dat >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(ngay_dat), DAYNAME(ngay_dat)
       ORDER BY DATE(ngay_dat) ASC`
    );

    // Map tên thứ tiếng Việt
    const thuMap = {
      'Monday': 'Thứ 2',
      'Tuesday': 'Thứ 3',
      'Wednesday': 'Thứ 4',
      'Thursday': 'Thứ 5',
      'Friday': 'Thứ 6',
      'Saturday': 'Thứ 7',
      'Sunday': 'Chủ Nhật'
    };

    const formattedData = rows.map(item => ({
      ngay: item.ngay,
      label: thuMap[item.thu] || item.thu,
      doanh_thu: Number(item.doanh_thu),
      so_don: item.so_don
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Lỗi lấy biểu đồ doanh thu:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thống kê doanh thu' });
  }
};

// @desc    Lấy Top 5 sản phẩm bán chạy nhất
// @route   GET /api/reports/top-products
exports.getTopProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        ct.san_pham_id,
        ct.ten_san_pham,
        sp.hinh_anh_url,
        sp.danh_muc,
        COALESCE(SUM(ct.so_luong), 0) AS da_ban,
        COALESCE(SUM(ct.thanh_tien), 0) AS tong_doanh_thu
       FROM CHI_TIET_DON_HANG ct
       LEFT JOIN SAN_PHAM sp ON ct.san_pham_id = sp.id
       GROUP BY ct.san_pham_id, ct.ten_san_pham, sp.hinh_anh_url, sp.danh_muc
       ORDER BY da_ban DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi lấy top sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy top món' });
  }
};

// @desc    Thống kê doanh thu theo danh mục món
// @route   GET /api/reports/categories
exports.getCategorySales = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        COALESCE(sp.danh_muc, 'Khác') AS danh_muc,
        COALESCE(SUM(ct.so_luong), 0) AS so_luong,
        COALESCE(SUM(ct.thanh_tien), 0) AS tong_tien
       FROM CHI_TIET_DON_HANG ct
       LEFT JOIN SAN_PHAM sp ON ct.san_pham_id = sp.id
       GROUP BY sp.danh_muc`
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi thống kê danh mục:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};
